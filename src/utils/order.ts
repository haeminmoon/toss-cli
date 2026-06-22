import { ORDER_SIDES, ORDER_TYPES, TIME_IN_FORCE } from '../config/constants';
import type { OrderCreateRequest, OrderModifyRequest } from '../client/types';
import { parseEnum, validateSymbol } from './validate';

const INTEGER_RE = /^\d+$/;
const DECIMAL_RE = /^\d+(\.\d+)?$/;
/** Spec caps quantity / price / orderAmount at 30 characters. */
const MAX_NUM_LEN = 30;

function assertNumeric(value: string, re: RegExp, label: string, kind: 'integer' | 'number'): void {
  if (!re.test(value)) {
    throw new Error(`Invalid ${label} "${value}". Must be a positive ${kind}.`);
  }
  if (value.length > MAX_NUM_LEN) {
    throw new Error(`${label} exceeds ${MAX_NUM_LEN} characters.`);
  }
}

export interface OrderCreateInput {
  symbol: string;
  side: string;
  orderType: string;
  quantity?: string;
  amount?: string;
  price?: string;
  tif?: string;
  clientOrderId?: string;
  confirmHighValue?: boolean;
}

/**
 * Build and validate an OrderCreateRequest from raw CLI/MCP input.
 *
 * Enforces the API's oneOf contract:
 *  - quantity-based (KR + US): integer `quantity`; LIMIT requires `price`,
 *    MARKET forbids it; optional time-in-force.
 *  - amount-based (US MARKET only): decimal `orderAmount`; MARKET only; no price.
 * Exactly one of `quantity` / `amount` must be supplied.
 */
export function buildOrderCreateRequest(input: OrderCreateInput): OrderCreateRequest {
  const symbol = validateSymbol(input.symbol);
  const side = parseEnum(input.side, ORDER_SIDES, 'side');
  const orderType = parseEnum(input.orderType, ORDER_TYPES, 'type');

  const hasQuantity = input.quantity !== undefined && input.quantity !== '';
  const hasAmount = input.amount !== undefined && input.amount !== '';

  if (hasQuantity === hasAmount) {
    throw new Error('Provide exactly one of --quantity or --amount.');
  }

  if (input.clientOrderId !== undefined && !/^[a-zA-Z0-9\-_]{1,36}$/.test(input.clientOrderId)) {
    throw new Error(
      'Invalid --client-order-id. Max 36 chars, only letters, digits, "-" and "_".',
    );
  }

  // ── Amount-based (US MARKET only) ──
  if (hasAmount) {
    if (orderType !== 'MARKET') {
      throw new Error('Amount-based orders (--amount) require --type MARKET (US only).');
    }
    if (input.price !== undefined) {
      throw new Error('--price is not allowed with --amount (MARKET order).');
    }
    if (input.tif !== undefined && input.tif !== '') {
      throw new Error(
        '--tif is not supported with --amount (amount-based US MARKET orders have no time-in-force).',
      );
    }
    assertNumeric(input.amount as string, DECIMAL_RE, '--amount', 'number');
    const req: OrderCreateRequest = {
      symbol,
      side,
      orderType: 'MARKET',
      orderAmount: input.amount as string,
    };
    if (input.clientOrderId) req.clientOrderId = input.clientOrderId;
    if (input.confirmHighValue) req.confirmHighValueOrder = true;
    return req;
  }

  // ── Quantity-based (KR + US) ──
  assertNumeric(input.quantity as string, INTEGER_RE, '--quantity', 'integer');
  const req: OrderCreateRequest = {
    symbol,
    side,
    orderType,
    quantity: input.quantity as string,
  };

  if (orderType === 'LIMIT') {
    if (input.price === undefined || input.price === '') {
      throw new Error('--price is required for LIMIT orders.');
    }
    assertNumeric(input.price, DECIMAL_RE, '--price', 'number');
    req.price = input.price;
  } else if (input.price !== undefined) {
    throw new Error('--price is not allowed for MARKET orders.');
  }

  if (input.tif !== undefined && input.tif !== '') {
    req.timeInForce = parseEnum(input.tif, TIME_IN_FORCE, 'tif');
  }
  if (input.clientOrderId) req.clientOrderId = input.clientOrderId;
  if (input.confirmHighValue) req.confirmHighValueOrder = true;
  return req;
}

export interface OrderModifyInput {
  orderType: string;
  quantity?: string;
  price?: string;
  confirmHighValue?: boolean;
}

/**
 * Build and validate an OrderModifyRequest. LIMIT requires `price`, MARKET
 * forbids it. `quantity` is passed through when provided (required for KR,
 * forbidden for US — the server enforces the market-specific rule).
 */
export function buildOrderModifyRequest(input: OrderModifyInput): OrderModifyRequest {
  const orderType = parseEnum(input.orderType, ORDER_TYPES, 'type');
  const req: OrderModifyRequest = { orderType };

  if (orderType === 'LIMIT') {
    if (input.price === undefined || input.price === '') {
      throw new Error('--price is required when modifying to a LIMIT order.');
    }
    assertNumeric(input.price, DECIMAL_RE, '--price', 'number');
    req.price = input.price;
  } else if (input.price !== undefined) {
    throw new Error('--price is not allowed for MARKET orders.');
  }

  if (input.quantity !== undefined && input.quantity !== '') {
    assertNumeric(input.quantity, INTEGER_RE, '--quantity', 'integer');
    req.quantity = input.quantity;
  }

  if (input.confirmHighValue) req.confirmHighValueOrder = true;
  return req;
}
