import { TossClient } from '../../client/api-client';
import { TossApiError } from '../../client/errors';
import { createMockFetch, MOCK_PRICES, MOCK_ACCOUNTS, MOCK_ORDER_RESPONSE } from '../fixtures';

jest.mock('../../auth/token-store', () => ({
  getAccessToken: jest.fn().mockResolvedValue('mock-token'),
  clearCachedToken: jest.fn(),
}));

const tokenProvider = () => Promise.resolve('test-token');

function makeClient(overrides = {}) {
  return new TossClient({ baseUrl: 'https://api.test', tokenProvider, accountSeq: 1, ...overrides });
}

describe('TossClient', () => {
  let originalFetch: typeof global.fetch;
  beforeEach(() => {
    originalFetch = global.fetch;
  });
  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it('strips trailing slash from baseUrl', () => {
    const c = new TossClient({ baseUrl: 'https://api.test/', tokenProvider });
    expect(c.getBaseUrl()).toBe('https://api.test');
  });

  describe('market data', () => {
    it('getPrices joins symbols and unwraps result', async () => {
      const fetchMock = createMockFetch({ result: MOCK_PRICES });
      global.fetch = fetchMock;
      const data = await makeClient().getPrices(['005930', 'AAPL']);
      expect(data).toEqual(MOCK_PRICES);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe('https://api.test/api/v1/prices?symbols=005930%2CAAPL');
      expect(init.method).toBe('GET');
      expect(init.headers.Authorization).toBe('Bearer test-token');
    });

    it('getOrderbook passes symbol query', async () => {
      const fetchMock = createMockFetch({ result: { asks: [], bids: [] } });
      global.fetch = fetchMock;
      await makeClient().getOrderbook('005930');
      expect(fetchMock.mock.calls[0][0]).toBe('https://api.test/api/v1/orderbook?symbol=005930');
    });

    it('getTrades omits undefined count', async () => {
      const fetchMock = createMockFetch({ result: [] });
      global.fetch = fetchMock;
      await makeClient().getTrades('005930');
      expect(fetchMock.mock.calls[0][0]).toBe('https://api.test/api/v1/trades?symbol=005930');
      await makeClient().getTrades('005930', 5);
      expect(fetchMock.mock.calls[1][0]).toBe('https://api.test/api/v1/trades?symbol=005930&count=5');
    });

    it('getCandles includes interval and optional params', async () => {
      const fetchMock = createMockFetch({ result: { candles: [], nextBefore: null } });
      global.fetch = fetchMock;
      await makeClient().getCandles('005930', '1d', { count: 10, adjusted: true });
      const url = fetchMock.mock.calls[0][0];
      expect(url).toContain('interval=1d');
      expect(url).toContain('count=10');
      expect(url).toContain('adjusted=true');
    });

    describe('getMultipleCandles (auto-pagination)', () => {
      // Build a page of `n` daily candles ending (exclusive) just before `beforeDay`.
      function makePage(beforeDay: number, n: number, nextBefore: string | null) {
        const candles = Array.from({ length: n }, (_, i) => {
          const day = beforeDay - 1 - i; // newest first, descending — like the API
          const ts = `2026-01-${String(day).padStart(2, '0')}T00:00:00.000+09:00`;
          return {
            timestamp: ts,
            openPrice: '1',
            highPrice: '1',
            lowPrice: '1',
            closePrice: '1',
            volume: '1',
            currency: 'KRW',
          };
        });
        return { candles, nextBefore };
      }

      it('does a single request when totalCount fits in one page and caps to count', async () => {
        const page = makePage(20, 200, '2026-01-...cursor');
        const fetchMock = createMockFetch({ result: page });
        global.fetch = fetchMock;
        const data = await makeClient().getMultipleCandles('005930', '1d', 200);
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock.mock.calls[0][0]).toContain('count=200');
        expect(data.candles).toHaveLength(200);
        // ascending by time
        expect(data.candles[0].timestamp < data.candles[199].timestamp).toBe(true);
      });

      it('walks the nextBefore cursor, dedupes the inclusive boundary, sorts ascending, and caps to totalCount', async () => {
        // Page 1: days 19..10 (10 candles), cursor = day 10 timestamp.
        // Page 2: cursor is inclusive, so it re-returns day 10 then 9..1.
        const day10 = '2026-01-10T00:00:00.000+09:00';
        const page1 = makePage(20, 10, day10);
        const page2 = {
          candles: [
            { timestamp: day10, openPrice: '1', highPrice: '1', lowPrice: '1', closePrice: '1', volume: '1', currency: 'KRW' },
            ...makePage(10, 9, null).candles,
          ],
          nextBefore: null,
        };
        const fetchMock = jest
          .fn()
          .mockResolvedValueOnce({ ok: true, status: 200, text: () => Promise.resolve(JSON.stringify({ result: page1 })) })
          .mockResolvedValueOnce({ ok: true, status: 200, text: () => Promise.resolve(JSON.stringify({ result: page2 })) });
        global.fetch = fetchMock as unknown as typeof global.fetch;

        const data = await makeClient().getMultipleCandles('005930', '1d', 15);

        expect(fetchMock).toHaveBeenCalledTimes(2);
        // page 1 requested 200 cap (min(15,200)); page 2 requested remaining (min(5,200))
        expect(fetchMock.mock.calls[0][0]).toContain('count=15');
        expect(fetchMock.mock.calls[1][0]).toContain('before=2026-01-10');
        // 19 unique days available, capped to 15, deduped (day10 appears once), ascending
        expect(data.candles).toHaveLength(15);
        const times = data.candles.map((c) => c.timestamp);
        expect(new Set(times).size).toBe(15);
        expect([...times].sort()).toEqual(times);
        // capped to the 15 most-recent days (5..19) -> oldest kept is day 05
        expect(times[0]).toBe('2026-01-05T00:00:00.000+09:00');
        expect(times[14]).toBe('2026-01-19T00:00:00.000+09:00');
      });

      it('stops early when nextBefore is null (history exhausted) without padding', async () => {
        const page = makePage(20, 50, null);
        const fetchMock = createMockFetch({ result: page });
        global.fetch = fetchMock;
        const data = await makeClient().getMultipleCandles('005930', '1d', 1000);
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(data.candles).toHaveLength(50);
        expect(data.nextBefore).toBeNull();
      });
    });
  });

  describe('stock & market info', () => {
    it('getStocks joins symbols', async () => {
      const fetchMock = createMockFetch({ result: [] });
      global.fetch = fetchMock;
      await makeClient().getStocks(['005930', 'AAPL']);
      expect(fetchMock.mock.calls[0][0]).toBe('https://api.test/api/v1/stocks?symbols=005930%2CAAPL');
    });

    it('getStockWarnings encodes the path symbol', async () => {
      const fetchMock = createMockFetch({ result: [] });
      global.fetch = fetchMock;
      await makeClient().getStockWarnings('005930');
      expect(fetchMock.mock.calls[0][0]).toBe('https://api.test/api/v1/stocks/005930/warnings');
    });

    it('getExchangeRate passes currency params', async () => {
      const fetchMock = createMockFetch({ result: {} });
      global.fetch = fetchMock;
      await makeClient().getExchangeRate('USD', 'KRW');
      const url = fetchMock.mock.calls[0][0];
      expect(url).toContain('baseCurrency=USD');
      expect(url).toContain('quoteCurrency=KRW');
    });

    it('getMarketCalendarKR / US hit the right paths', async () => {
      const fetchMock = createMockFetch({ result: {} });
      global.fetch = fetchMock;
      await makeClient().getMarketCalendarKR();
      await makeClient().getMarketCalendarUS('2026-06-22');
      expect(fetchMock.mock.calls[0][0]).toBe('https://api.test/api/v1/market-calendar/KR');
      expect(fetchMock.mock.calls[1][0]).toBe('https://api.test/api/v1/market-calendar/US?date=2026-06-22');
    });
  });

  describe('order info & detail', () => {
    it('getSellableQuantity sends symbol + account header', async () => {
      const fetchMock = createMockFetch({ result: { sellableQuantity: '0' } });
      global.fetch = fetchMock;
      await makeClient().getSellableQuantity('005930', 1);
      expect(fetchMock.mock.calls[0][0]).toContain('symbol=005930');
      expect(fetchMock.mock.calls[0][1].headers['X-Tossinvest-Account']).toBe('1');
    });

    it('getCommissions hits the commissions path', async () => {
      const fetchMock = createMockFetch({ result: [] });
      global.fetch = fetchMock;
      await makeClient().getCommissions(1);
      expect(fetchMock.mock.calls[0][0]).toBe('https://api.test/api/v1/commissions');
    });

    it('getOrder encodes orderId', async () => {
      const fetchMock = createMockFetch({ result: { orderId: 'x' } });
      global.fetch = fetchMock;
      await makeClient().getOrder('a b', 1);
      expect(fetchMock.mock.calls[0][0]).toBe('https://api.test/api/v1/orders/a%20b');
    });

    it('modifyOrder posts to the modify path', async () => {
      const fetchMock = createMockFetch({ result: { orderId: 'new' } });
      global.fetch = fetchMock;
      await makeClient().modifyOrder('ord1', { orderType: 'LIMIT', price: '100' }, 1);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe('https://api.test/api/v1/orders/ord1/modify');
      expect(JSON.parse(init.body)).toEqual({ orderType: 'LIMIT', price: '100' });
    });
  });

  describe('account context (X-Tossinvest-Account header)', () => {
    it('getHoldings sends account header', async () => {
      const fetchMock = createMockFetch({ result: { items: [] } });
      global.fetch = fetchMock;
      await makeClient().getHoldings(1);
      expect(fetchMock.mock.calls[0][1].headers['X-Tossinvest-Account']).toBe('1');
    });

    it('uses default accountSeq when not overridden', async () => {
      const fetchMock = createMockFetch({ result: { cashBuyingPower: '0', currency: 'KRW' } });
      global.fetch = fetchMock;
      await makeClient({ accountSeq: 7 }).getBuyingPower('KRW');
      expect(fetchMock.mock.calls[0][1].headers['X-Tossinvest-Account']).toBe('7');
    });

    it('throws when no account configured', () => {
      const c = new TossClient({ baseUrl: 'https://api.test', tokenProvider });
      expect(() => c.getHoldings()).toThrow(TossApiError);
    });
  });

  describe('orders', () => {
    it('createOrder posts JSON body with account header', async () => {
      const fetchMock = createMockFetch({ result: MOCK_ORDER_RESPONSE });
      global.fetch = fetchMock;
      const body = { symbol: '005930', side: 'BUY' as const, orderType: 'MARKET' as const, quantity: '1' };
      const data = await makeClient().createOrder(body, 1);
      expect(data).toEqual(MOCK_ORDER_RESPONSE);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe('https://api.test/api/v1/orders');
      expect(init.method).toBe('POST');
      expect(init.headers['Content-Type']).toBe('application/json');
      expect(JSON.parse(init.body)).toEqual(body);
    });

    it('cancelOrder posts empty body and encodes orderId', async () => {
      const fetchMock = createMockFetch({ result: { orderId: 'new' } });
      global.fetch = fetchMock;
      await makeClient().cancelOrder('a/b', 1);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe('https://api.test/api/v1/orders/a%2Fb/cancel');
      expect(JSON.parse(init.body)).toEqual({});
    });

    it('getOrders builds status query', async () => {
      const fetchMock = createMockFetch({ result: { orders: [], nextCursor: null, hasNext: false } });
      global.fetch = fetchMock;
      await makeClient().getOrders({ status: 'OPEN', symbol: '005930' }, 1);
      const url = fetchMock.mock.calls[0][0];
      expect(url).toContain('status=OPEN');
      expect(url).toContain('symbol=005930');
    });
  });

  describe('error handling', () => {
    it('parses the error envelope into TossApiError', async () => {
      global.fetch = createMockFetch(
        { error: { requestId: 'req1', code: 'stock-not-found', message: 'nope', data: { field: 'x' } } },
        { status: 404 },
      );
      const c = makeClient();
      await expect(c.getOrderbook('ZZZ')).rejects.toMatchObject({
        name: 'TossApiError',
        code: 'stock-not-found',
        status: 404,
        requestId: 'req1',
        data: { field: 'x' },
      });
    });

    it('falls back to http-error for non-JSON bodies', async () => {
      global.fetch = createMockFetch(undefined, { status: 500, raw: 'Internal Error' });
      await expect(makeClient().getAccounts()).rejects.toMatchObject({
        code: 'http-error',
        status: 500,
      });
    });

    it('normalizes a non-JSON 2xx body to invalid-response', async () => {
      global.fetch = createMockFetch(undefined, { status: 200, ok: true, raw: '<html>maintenance</html>' });
      await expect(makeClient().getAccounts()).rejects.toMatchObject({
        name: 'TossApiError',
        code: 'invalid-response',
      });
    });

    it('forces a fresh token on the 401 retry (tokenProvider receives forceRefresh=true)', async () => {
      const provider = jest.fn().mockResolvedValue('tok');
      const fetchMock = jest
        .fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          text: () => Promise.resolve(JSON.stringify({ error: { code: 'expired-token', message: 'x' } })),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: () => Promise.resolve(JSON.stringify({ result: MOCK_ACCOUNTS })),
        });
      global.fetch = fetchMock as unknown as typeof global.fetch;
      const client = new TossClient({ baseUrl: 'https://api.test', tokenProvider: provider });
      await client.getAccounts();
      expect(provider).toHaveBeenNthCalledWith(1, false);
      expect(provider).toHaveBeenNthCalledWith(2, true);
    });

    it('translates a request timeout into a TossApiError(timeout)', async () => {
      jest.useFakeTimers();
      global.fetch = jest.fn(
        (_url, init: RequestInit) =>
          new Promise((_resolve, reject) => {
            init.signal?.addEventListener('abort', () => {
              const e = new Error('aborted');
              e.name = 'AbortError';
              reject(e);
            });
          }),
      ) as unknown as typeof global.fetch;
      const promise = makeClient().getAccounts();
      const assertion = expect(promise).rejects.toMatchObject({ name: 'TossApiError', code: 'timeout' });
      await jest.advanceTimersByTimeAsync(31_000);
      await assertion;
      jest.useRealTimers();
    });

    it('retries once on 401 expired-token then succeeds', async () => {
      const fetchMock = jest
        .fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          text: () => Promise.resolve(JSON.stringify({ error: { code: 'expired-token', message: 'x', requestId: 'r' } })),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: () => Promise.resolve(JSON.stringify({ result: MOCK_ACCOUNTS })),
        });
      global.fetch = fetchMock as unknown as typeof global.fetch;
      const data = await makeClient().getAccounts();
      expect(data).toEqual(MOCK_ACCOUNTS);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('does not retry indefinitely on persistent 401', async () => {
      const fetchMock = jest.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: () => Promise.resolve(JSON.stringify({ error: { code: 'invalid-token', message: 'x' } })),
      });
      global.fetch = fetchMock as unknown as typeof global.fetch;
      await expect(makeClient().getAccounts()).rejects.toMatchObject({ code: 'invalid-token' });
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });
});
