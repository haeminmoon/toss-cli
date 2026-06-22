import {
  DEFAULT_BASE_URL,
  MAX_CANDLES_PER_REQUEST,
  REQUEST_TIMEOUT_MS,
  type CandleInterval,
  type Currency,
} from '../config/constants';
import { buildQuery, sleep } from '../utils/helpers';
import { getAccessToken } from '../auth/token-store';
import { TossApiError } from './errors';
import type {
  Account,
  BuyingPowerResponse,
  Candle,
  CandlePageResponse,
  CandleParams,
  Commission,
  ExchangeRateResponse,
  HoldingsOverview,
  KrMarketCalendarResponse,
  Order,
  OrderCreateRequest,
  OrderListParams,
  OrderModifyRequest,
  OrderOperationResponse,
  OrderResponse,
  OrderbookResponse,
  PaginatedOrderResponse,
  PriceLimitResponse,
  PriceResponse,
  SellableQuantityResponse,
  StockInfo,
  StockWarning,
  Trade,
  UsMarketCalendarResponse,
} from './types';

export interface TossClientOptions {
  clientId?: string;
  clientSecret?: string;
  /** Default account for account/asset/order calls. */
  accountSeq?: number;
  baseUrl?: string;
  /**
   * Optional override that returns a bearer access token. Receives a
   * `forceRefresh` flag the client sets when retrying after a 401, so the
   * provider can bypass its own cache. Defaults to the file-cached OAuth2 token
   * store. Injectable for testing.
   */
  tokenProvider?: (forceRefresh?: boolean) => Promise<string>;
}

interface RequestOptions {
  query?: Record<string, unknown>;
  body?: unknown;
  accountSeq?: number;
}

/**
 * Delay between paginated candle requests, in ms. The API rate-limits at
 * ~5 req/s per group, so a small pause keeps multi-page fetches well under it.
 */
const CANDLE_PAGE_DELAY_MS = 200;

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  let timedOut = false;
  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err) {
    if (timedOut) {
      throw new TossApiError({
        code: 'timeout',
        message: `Request timed out after ${REQUEST_TIMEOUT_MS}ms`,
        status: 0,
      });
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Toss Securities Open API client.
 *
 * All endpoints require an OAuth2 bearer token; account / asset / order
 * endpoints additionally require the `X-Tossinvest-Account` header. The
 * success envelope (`{ result: ... }`) is unwrapped automatically; non-2xx
 * responses are thrown as {@link TossApiError}.
 */
export class TossClient {
  private readonly baseUrl: string;
  private readonly clientId?: string;
  private readonly clientSecret?: string;
  private readonly accountSeq?: number;
  private readonly tokenProvider: (forceRefresh?: boolean) => Promise<string>;

  constructor(opts: TossClientOptions = {}) {
    this.baseUrl = (opts.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, '');
    this.clientId = opts.clientId;
    this.clientSecret = opts.clientSecret;
    this.accountSeq = opts.accountSeq;

    if (opts.tokenProvider) {
      this.tokenProvider = opts.tokenProvider;
    } else {
      this.tokenProvider = async (forceRefresh?: boolean) => {
        if (!this.clientId || !this.clientSecret) {
          throw new TossApiError({
            code: 'missing-credentials',
            message:
              'Client credentials are not configured. Run: toss-cli config init',
            status: 0,
          });
        }
        return getAccessToken({
          clientId: this.clientId,
          clientSecret: this.clientSecret,
          baseUrl: this.baseUrl,
          forceRefresh,
        });
      };
    }
  }

  // ─── Core request ─────────────────────────────────────────────────────

  private async request<T>(
    method: 'GET' | 'POST',
    path: string,
    opts: RequestOptions = {},
    retriedOnAuth = false,
  ): Promise<T> {
    const url = this.baseUrl + path + buildQuery(opts.query ?? {});
    // On the retry-after-401 pass, force a fresh token through the provider.
    const token = await this.tokenProvider(retriedOnAuth);

    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    };
    if (opts.accountSeq !== undefined) {
      headers['X-Tossinvest-Account'] = String(opts.accountSeq);
    }

    const init: RequestInit = { method, headers };
    if (opts.body !== undefined) {
      headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(opts.body);
    }

    const res = await fetchWithTimeout(url, init);
    const text = await res.text();

    if (!res.ok) {
      const err = parseErrorResponse(res.status, text);
      // A cached token may have been invalidated (e.g. by a re-issue elsewhere).
      // Retry once, forcing the provider to fetch a fresh token.
      if (
        !retriedOnAuth &&
        res.status === 401 &&
        (err.code === 'expired-token' || err.code === 'invalid-token')
      ) {
        return this.request<T>(method, path, opts, true);
      }
      throw err;
    }

    if (!text) return undefined as T;
    let json: { result?: T };
    try {
      json = JSON.parse(text) as { result?: T };
    } catch {
      throw new TossApiError({
        code: 'invalid-response',
        message: 'Server returned a non-JSON 2xx response',
        status: res.status,
      });
    }
    return (json.result ?? (json as unknown)) as T;
  }

  private get<T>(path: string, opts: RequestOptions = {}): Promise<T> {
    return this.request<T>('GET', path, opts);
  }

  private post<T>(path: string, opts: RequestOptions = {}): Promise<T> {
    return this.request<T>('POST', path, opts);
  }

  private requireAccount(override?: number): number {
    const seq = override ?? this.accountSeq;
    if (seq === undefined) {
      throw new TossApiError({
        code: 'account-header-required',
        message:
          'No account configured. Set one with: toss-cli config set --account <accountSeq> (see: toss-cli account list)',
        status: 0,
      });
    }
    return seq;
  }

  // ─── Market Data ──────────────────────────────────────────────────────

  getOrderbook(symbol: string): Promise<OrderbookResponse> {
    return this.get('/api/v1/orderbook', { query: { symbol } });
  }

  getPrices(symbols: string[]): Promise<PriceResponse[]> {
    return this.get('/api/v1/prices', { query: { symbols: symbols.join(',') } });
  }

  getTrades(symbol: string, count?: number): Promise<Trade[]> {
    return this.get('/api/v1/trades', { query: { symbol, count } });
  }

  getPriceLimits(symbol: string): Promise<PriceLimitResponse> {
    return this.get('/api/v1/price-limits', { query: { symbol } });
  }

  getCandles(
    symbol: string,
    interval: CandleInterval,
    params: CandleParams = {},
  ): Promise<CandlePageResponse> {
    return this.get('/api/v1/candles', {
      query: {
        symbol,
        interval,
        count: params.count,
        before: params.before,
        adjusted: params.adjusted,
      },
    });
  }

  /**
   * Fetch up to `totalCount` candles, auto-paginating past the per-request cap
   * of {@link MAX_CANDLES_PER_REQUEST}. Each page requests the remaining count
   * (capped to the per-request max) and walks backwards via the returned
   * `nextBefore` cursor until enough candles are collected or the cursor is
   * `null` (history exhausted). The cursor is inclusive of its own timestamp,
   * so results are deduped by timestamp and returned sorted ascending by time,
   * never exceeding `totalCount`. Requests are throttled to stay under the
   * ~5 req/s rate limit.
   */
  async getMultipleCandles(
    symbol: string,
    interval: CandleInterval,
    totalCount: number,
    params: Omit<CandleParams, 'count'> = {},
  ): Promise<CandlePageResponse> {
    const byTime = new Map<string, Candle>();
    let before = params.before;
    let lastNextBefore: string | null = null;
    let firstPage = true;

    while (byTime.size < totalCount) {
      if (!firstPage) await sleep(CANDLE_PAGE_DELAY_MS);
      firstPage = false;

      const remaining = totalCount - byTime.size;
      const page = await this.getCandles(symbol, interval, {
        count: Math.min(remaining, MAX_CANDLES_PER_REQUEST),
        before,
        adjusted: params.adjusted,
      });

      for (const candle of page.candles) byTime.set(candle.timestamp, candle);
      lastNextBefore = page.nextBefore;

      // Stop when history is exhausted or a page returns nothing new.
      if (!page.nextBefore || page.candles.length === 0) break;
      before = page.nextBefore;
    }

    const candles = Array.from(byTime.values())
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
      .slice(-totalCount);

    return { candles, nextBefore: byTime.size > totalCount ? null : lastNextBefore };
  }

  // ─── Stock Info ───────────────────────────────────────────────────────

  getStocks(symbols: string[]): Promise<StockInfo[]> {
    return this.get('/api/v1/stocks', { query: { symbols: symbols.join(',') } });
  }

  getStockWarnings(symbol: string): Promise<StockWarning[]> {
    return this.get(`/api/v1/stocks/${encodeURIComponent(symbol)}/warnings`);
  }

  // ─── Market Info ──────────────────────────────────────────────────────

  getExchangeRate(
    baseCurrency: Currency,
    quoteCurrency: Currency,
    dateTime?: string,
  ): Promise<ExchangeRateResponse> {
    return this.get('/api/v1/exchange-rate', {
      query: { baseCurrency, quoteCurrency, dateTime },
    });
  }

  getMarketCalendarKR(date?: string): Promise<KrMarketCalendarResponse> {
    return this.get('/api/v1/market-calendar/KR', { query: { date } });
  }

  getMarketCalendarUS(date?: string): Promise<UsMarketCalendarResponse> {
    return this.get('/api/v1/market-calendar/US', { query: { date } });
  }

  // ─── Account & Asset ──────────────────────────────────────────────────

  getAccounts(): Promise<Account[]> {
    return this.get('/api/v1/accounts');
  }

  getHoldings(accountSeq?: number, symbol?: string): Promise<HoldingsOverview> {
    return this.get('/api/v1/holdings', {
      accountSeq: this.requireAccount(accountSeq),
      query: { symbol },
    });
  }

  // ─── Order Info ───────────────────────────────────────────────────────

  getBuyingPower(currency: Currency, accountSeq?: number): Promise<BuyingPowerResponse> {
    return this.get('/api/v1/buying-power', {
      accountSeq: this.requireAccount(accountSeq),
      query: { currency },
    });
  }

  getSellableQuantity(
    symbol: string,
    accountSeq?: number,
  ): Promise<SellableQuantityResponse> {
    return this.get('/api/v1/sellable-quantity', {
      accountSeq: this.requireAccount(accountSeq),
      query: { symbol },
    });
  }

  getCommissions(accountSeq?: number): Promise<Commission[]> {
    return this.get('/api/v1/commissions', {
      accountSeq: this.requireAccount(accountSeq),
    });
  }

  // ─── Orders ───────────────────────────────────────────────────────────

  getOrders(params: OrderListParams, accountSeq?: number): Promise<PaginatedOrderResponse> {
    return this.get('/api/v1/orders', {
      accountSeq: this.requireAccount(accountSeq),
      query: {
        status: params.status,
        symbol: params.symbol,
        from: params.from,
        to: params.to,
        cursor: params.cursor,
        limit: params.limit,
      },
    });
  }

  getOrder(orderId: string, accountSeq?: number): Promise<Order> {
    return this.get(`/api/v1/orders/${encodeURIComponent(orderId)}`, {
      accountSeq: this.requireAccount(accountSeq),
    });
  }

  createOrder(body: OrderCreateRequest, accountSeq?: number): Promise<OrderResponse> {
    return this.post('/api/v1/orders', {
      accountSeq: this.requireAccount(accountSeq),
      body,
    });
  }

  modifyOrder(
    orderId: string,
    body: OrderModifyRequest,
    accountSeq?: number,
  ): Promise<OrderOperationResponse> {
    return this.post(`/api/v1/orders/${encodeURIComponent(orderId)}/modify`, {
      accountSeq: this.requireAccount(accountSeq),
      body,
    });
  }

  cancelOrder(orderId: string, accountSeq?: number): Promise<OrderOperationResponse> {
    return this.post(`/api/v1/orders/${encodeURIComponent(orderId)}/cancel`, {
      accountSeq: this.requireAccount(accountSeq),
      body: {},
    });
  }

  // ─── Helpers ──────────────────────────────────────────────────────────

  getBaseUrl(): string {
    return this.baseUrl;
  }
}

function parseErrorResponse(status: number, text: string): TossApiError {
  try {
    const json = JSON.parse(text) as {
      error?: { code?: string; message?: string; requestId?: string; data?: unknown };
    };
    if (json.error) {
      return new TossApiError({
        code: json.error.code ?? 'unknown',
        message: json.error.message ?? '',
        status,
        requestId: json.error.requestId,
        data: json.error.data,
      });
    }
  } catch {
    /* not JSON */
  }
  return new TossApiError({
    code: 'http-error',
    message: text ? text.slice(0, 500) : `HTTP ${status}`,
    status,
  });
}
