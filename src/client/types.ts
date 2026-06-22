import type {
  Currency,
  MarketCountry,
  OrderSide,
  OrderTypeKind,
  TimeInForce,
  CandleInterval,
  OrderStatusFilter,
} from '../config/constants';

// ─── Market Data ──────────────────────────────────────────────────────────

export interface OrderbookEntry {
  price: string;
  volume: string;
}

export interface OrderbookResponse {
  timestamp: string | null;
  currency: Currency;
  asks: OrderbookEntry[];
  bids: OrderbookEntry[];
}

export interface PriceResponse {
  symbol: string;
  timestamp: string | null;
  lastPrice: string;
  currency: Currency;
}

export interface Trade {
  price: string;
  volume: string;
  timestamp: string;
  currency: Currency;
}

export interface PriceLimitResponse {
  timestamp: string;
  upperLimitPrice: string | null;
  lowerLimitPrice: string | null;
  currency: Currency;
}

export interface Candle {
  timestamp: string;
  openPrice: string;
  highPrice: string;
  lowPrice: string;
  closePrice: string;
  volume: string;
  currency: Currency;
}

export interface CandlePageResponse {
  candles: Candle[];
  nextBefore: string | null;
}

// ─── Stock Info ───────────────────────────────────────────────────────────

export interface KrMarketDetail {
  liquidationTrading: boolean;
  nxtSupported: boolean;
  krxTradingSuspended: boolean;
  nxtTradingSuspended: boolean | null;
}

export interface StockInfo {
  symbol: string;
  name: string;
  englishName: string;
  isinCode: string;
  market: string;
  securityType: string;
  isCommonShare: boolean;
  status: string;
  currency: Currency;
  listDate: string | null;
  delistDate: string | null;
  sharesOutstanding: string;
  leverageFactor: string | null;
  koreanMarketDetail: KrMarketDetail | null;
}

export interface StockWarning {
  warningType: string;
  exchange: string | null;
  startDate: string | null;
  endDate: string | null;
}

// ─── Market Info ──────────────────────────────────────────────────────────

export interface ExchangeRateResponse {
  baseCurrency: Currency;
  quoteCurrency: Currency;
  rate: string;
  midRate: string;
  basisPoint: string;
  rateChangeType: 'UP' | 'EQUAL' | 'DOWN';
  validFrom: string;
  validUntil: string;
}

export interface KrMarketDay {
  date: string;
  integrated: unknown | null;
}
export interface KrMarketCalendarResponse {
  today: KrMarketDay;
  previousBusinessDay: KrMarketDay;
  nextBusinessDay: KrMarketDay;
}

export interface UsMarketDay {
  date: string;
  dayMarket: unknown | null;
  preMarket: unknown | null;
  regularMarket: unknown | null;
  afterMarket: unknown | null;
}
export interface UsMarketCalendarResponse {
  today: UsMarketDay;
  previousBusinessDay: UsMarketDay;
  nextBusinessDay: UsMarketDay;
}

// ─── Account & Asset ──────────────────────────────────────────────────────

export interface Account {
  accountNo: string;
  accountSeq: number;
  accountType: string;
}

export interface CurrencyAmount {
  krw: string;
  usd: string | null;
}

export interface HoldingsItem {
  symbol: string;
  name: string;
  marketCountry: MarketCountry;
  currency: Currency;
  quantity: string;
  lastPrice: string;
  averagePurchasePrice: string;
  marketValue: { purchaseAmount: string; amount: string; amountAfterCost: string };
  profitLoss: { amount: string; amountAfterCost: string; rate: string; rateAfterCost: string };
  dailyProfitLoss: { amount: string; rate: string };
  cost: { commission: string; tax: string | null };
}

export interface HoldingsOverview {
  totalPurchaseAmount: CurrencyAmount;
  marketValue: { amount: CurrencyAmount; amountAfterCost: CurrencyAmount };
  profitLoss: {
    amount: CurrencyAmount;
    amountAfterCost: CurrencyAmount;
    rate: string;
    rateAfterCost: string;
  };
  dailyProfitLoss: { amount: CurrencyAmount; rate: string };
  items: HoldingsItem[];
}

// ─── Orders ───────────────────────────────────────────────────────────────

export interface OrderExecution {
  filledQuantity: string;
  averageFilledPrice: string | null;
  filledAmount: string | null;
  commission: string | null;
  tax: string | null;
  filledAt: string | null;
  settlementDate: string | null;
}

export interface Order {
  orderId: string;
  symbol: string;
  side: OrderSide;
  orderType: OrderTypeKind;
  timeInForce: TimeInForce | 'OPG';
  status: string;
  price: string | null;
  quantity: string;
  orderAmount: string | null;
  currency: Currency;
  orderedAt: string;
  canceledAt: string | null;
  execution: OrderExecution;
}

export interface PaginatedOrderResponse {
  orders: Order[];
  nextCursor: string | null;
  hasNext: boolean;
}

export interface OrderResponse {
  orderId: string;
  clientOrderId: string | null;
}

export interface OrderOperationResponse {
  orderId: string;
}

export interface BuyingPowerResponse {
  currency: Currency;
  cashBuyingPower: string;
}

export interface SellableQuantityResponse {
  sellableQuantity: string;
}

export interface Commission {
  marketCountry: MarketCountry;
  commissionRate: string;
  startDate: string | null;
  endDate: string | null;
}

// ─── Request bodies ───────────────────────────────────────────────────────

export interface OrderCreateRequest {
  clientOrderId?: string;
  symbol: string;
  side: OrderSide;
  orderType: OrderTypeKind;
  timeInForce?: TimeInForce;
  /** Quantity-based order (KR + US). Mutually exclusive with `orderAmount`. */
  quantity?: string;
  /** Amount-based order (US MARKET only). Mutually exclusive with `quantity`. */
  orderAmount?: string;
  /** Required for LIMIT orders; forbidden for MARKET. */
  price?: string;
  confirmHighValueOrder?: boolean;
}

export interface OrderModifyRequest {
  orderType: OrderTypeKind;
  /** Required for KR; forbidden for US. */
  quantity?: string;
  /** Required when orderType=LIMIT; forbidden for MARKET. */
  price?: string;
  confirmHighValueOrder?: boolean;
}

export interface OrderListParams {
  status: OrderStatusFilter;
  symbol?: string;
  from?: string;
  to?: string;
  cursor?: string;
  limit?: number;
}

export interface CandleParams {
  count?: number;
  before?: string;
  adjusted?: boolean;
}

export type { CandleInterval };
