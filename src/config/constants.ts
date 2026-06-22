/** Canonical base URL for the Toss Securities Open API. */
export const DEFAULT_BASE_URL = 'https://openapi.tossinvest.com';

/** Config / token cache locations (under the user's home directory). */
export const CONFIG_DIR_NAME = '.toss-cli';
export const CONFIG_FILE_NAME = 'config.json';
export const TOKEN_FILE_NAME = 'token.json';

/** Environment variable names (fallbacks when not present in the config file). */
export const ENV_CLIENT_ID = 'TOSS_CLIENT_ID';
export const ENV_CLIENT_SECRET = 'TOSS_CLIENT_SECRET';
export const ENV_ACCOUNT_SEQ = 'TOSS_ACCOUNT_SEQ';
export const ENV_BASE_URL = 'TOSS_API_BASE_URL';

/**
 * Refresh the cached access token when it is within this many ms of expiry.
 * Toss issues a single valid token per client (re-issuing invalidates the
 * previous one), so we cache aggressively and only re-issue near expiry.
 */
export const TOKEN_REFRESH_MARGIN_MS = 60_000;

/** Default request timeout. */
export const REQUEST_TIMEOUT_MS = 30_000;

/** Candle intervals supported by GET /api/v1/candles. */
export const CANDLE_INTERVALS = ['1m', '1d'] as const;
export type CandleInterval = (typeof CANDLE_INTERVALS)[number];

/**
 * Maximum candles GET /api/v1/candles returns in a single request. The server
 * rejects count > 200 with a 400 (`invalid-request`). To fetch more, paginate
 * with the returned `nextBefore` cursor.
 */
export const MAX_CANDLES_PER_REQUEST = 200;

/** Default candle count when `-n` / `count` is omitted. */
export const DEFAULT_CANDLE_COUNT = 200;

/** Currency codes. */
export const CURRENCIES = ['KRW', 'USD'] as const;
export type Currency = (typeof CURRENCIES)[number];

/** Market country segmentation. */
export const MARKET_COUNTRIES = ['KR', 'US'] as const;
export type MarketCountry = (typeof MARKET_COUNTRIES)[number];

/** Order direction. */
export const ORDER_SIDES = ['BUY', 'SELL'] as const;
export type OrderSide = (typeof ORDER_SIDES)[number];

/** Order price type. */
export const ORDER_TYPES = ['LIMIT', 'MARKET'] as const;
export type OrderTypeKind = (typeof ORDER_TYPES)[number];

/** Time-in-force values accepted on order creation. */
export const TIME_IN_FORCE = ['DAY', 'CLS'] as const;
export type TimeInForce = (typeof TIME_IN_FORCE)[number];

/** Lifecycle filter for GET /api/v1/orders. */
export const ORDER_STATUS_FILTERS = ['OPEN', 'CLOSED'] as const;
export type OrderStatusFilter = (typeof ORDER_STATUS_FILTERS)[number];

/**
 * Symbol charset allowed by the API: ASCII letters, digits, '.' and '-'.
 * KR symbols are 6 digits (e.g. 005930); US symbols are tickers (e.g. AAPL, BRK.B).
 */
export const SYMBOL_PATTERN = /^[A-Za-z0-9.\-]+$/;

/** Max symbols accepted by multi-symbol endpoints (prices, stocks). */
export const MAX_SYMBOLS = 200;
