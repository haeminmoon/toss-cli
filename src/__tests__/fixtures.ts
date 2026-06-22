/** Build a mock fetch returning a JSON (or text) body with status/headers. */
export function createMockFetch(
  body: unknown,
  init: { status?: number; ok?: boolean; raw?: string } = {},
): jest.Mock {
  const status = init.status ?? 200;
  const ok = init.ok ?? (status >= 200 && status < 300);
  const text = init.raw ?? (typeof body === 'string' ? body : JSON.stringify(body));
  return jest.fn().mockResolvedValue({
    ok,
    status,
    text: () => Promise.resolve(text),
    json: () => Promise.resolve(body),
    headers: new Map(),
  });
}

export const MOCK_PRICES = [
  { symbol: '005930', timestamp: '2026-06-22T13:00:00.000+09:00', lastPrice: '70000', currency: 'KRW' },
];

export const MOCK_ACCOUNTS = [{ accountNo: '16501024910', accountSeq: 1, accountType: 'BROKERAGE' }];

export const MOCK_ORDER_RESPONSE = { orderId: 'ord-123', clientOrderId: null };

export const MOCK_HOLDINGS = {
  totalPurchaseAmount: { krw: '0', usd: null },
  marketValue: { amount: { krw: '0', usd: null }, amountAfterCost: { krw: '0', usd: null } },
  profitLoss: {
    amount: { krw: '0', usd: null },
    amountAfterCost: { krw: '0', usd: null },
    rate: '0',
    rateAfterCost: '0',
  },
  dailyProfitLoss: { amount: { krw: '0', usd: null }, rate: '0' },
  items: [],
};
