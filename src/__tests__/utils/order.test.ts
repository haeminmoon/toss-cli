import { buildOrderCreateRequest, buildOrderModifyRequest } from '../../utils/order';

describe('buildOrderCreateRequest', () => {
  it('builds a quantity LIMIT order', () => {
    expect(
      buildOrderCreateRequest({ symbol: '005930', side: 'buy', orderType: 'limit', quantity: '10', price: '70000' }),
    ).toEqual({ symbol: '005930', side: 'BUY', orderType: 'LIMIT', quantity: '10', price: '70000' });
  });

  it('builds a quantity MARKET order (no price)', () => {
    expect(
      buildOrderCreateRequest({ symbol: '005930', side: 'SELL', orderType: 'MARKET', quantity: '5' }),
    ).toEqual({ symbol: '005930', side: 'SELL', orderType: 'MARKET', quantity: '5' });
  });

  it('builds an amount-based US MARKET order', () => {
    expect(
      buildOrderCreateRequest({ symbol: 'AAPL', side: 'BUY', orderType: 'MARKET', amount: '100.5' }),
    ).toEqual({ symbol: 'AAPL', side: 'BUY', orderType: 'MARKET', orderAmount: '100.5' });
  });

  it('includes tif, clientOrderId, confirmHighValue when given', () => {
    const req = buildOrderCreateRequest({
      symbol: '005930',
      side: 'BUY',
      orderType: 'LIMIT',
      quantity: '1',
      price: '70000',
      tif: 'cls',
      clientOrderId: 'my-order_1',
      confirmHighValue: true,
    });
    expect(req.timeInForce).toBe('CLS');
    expect(req.clientOrderId).toBe('my-order_1');
    expect(req.confirmHighValueOrder).toBe(true);
  });

  it('requires exactly one of quantity / amount', () => {
    expect(() => buildOrderCreateRequest({ symbol: 'A', side: 'BUY', orderType: 'MARKET' })).toThrow(
      'exactly one',
    );
    expect(() =>
      buildOrderCreateRequest({ symbol: 'A', side: 'BUY', orderType: 'MARKET', quantity: '1', amount: '10' }),
    ).toThrow('exactly one');
  });

  it('requires price for LIMIT and forbids it for MARKET', () => {
    expect(() =>
      buildOrderCreateRequest({ symbol: '005930', side: 'BUY', orderType: 'LIMIT', quantity: '1' }),
    ).toThrow('--price is required for LIMIT');
    expect(() =>
      buildOrderCreateRequest({ symbol: '005930', side: 'BUY', orderType: 'MARKET', quantity: '1', price: '1' }),
    ).toThrow('not allowed for MARKET');
  });

  it('amount requires MARKET and forbids price', () => {
    expect(() =>
      buildOrderCreateRequest({ symbol: 'AAPL', side: 'BUY', orderType: 'LIMIT', amount: '100' }),
    ).toThrow('require --type MARKET');
    expect(() =>
      buildOrderCreateRequest({ symbol: 'AAPL', side: 'BUY', orderType: 'MARKET', amount: '100', price: '1' }),
    ).toThrow('not allowed with --amount');
  });

  it('validates numeric formats', () => {
    expect(() =>
      buildOrderCreateRequest({ symbol: '005930', side: 'BUY', orderType: 'MARKET', quantity: '1.5' }),
    ).toThrow('positive integer');
    expect(() =>
      buildOrderCreateRequest({ symbol: '005930', side: 'BUY', orderType: 'LIMIT', quantity: '1', price: 'abc' }),
    ).toThrow('Invalid --price');
    expect(() =>
      buildOrderCreateRequest({ symbol: 'AAPL', side: 'BUY', orderType: 'MARKET', amount: 'x' }),
    ).toThrow('Invalid --amount');
  });

  it('rejects --tif on amount-based orders', () => {
    expect(() =>
      buildOrderCreateRequest({ symbol: 'AAPL', side: 'BUY', orderType: 'MARKET', amount: '100', tif: 'CLS' }),
    ).toThrow('--tif is not supported with --amount');
  });

  it('enforces the 30-character cap on quantity / price / amount', () => {
    const long = '1'.repeat(31);
    expect(() =>
      buildOrderCreateRequest({ symbol: '005930', side: 'BUY', orderType: 'MARKET', quantity: long }),
    ).toThrow('exceeds 30 characters');
    expect(() =>
      buildOrderCreateRequest({ symbol: '005930', side: 'BUY', orderType: 'LIMIT', quantity: '1', price: long }),
    ).toThrow('exceeds 30 characters');
    expect(() =>
      buildOrderCreateRequest({ symbol: 'AAPL', side: 'BUY', orderType: 'MARKET', amount: `${long}.5` }),
    ).toThrow('exceeds 30 characters');
  });

  it('validates clientOrderId format', () => {
    expect(() =>
      buildOrderCreateRequest({
        symbol: '005930',
        side: 'BUY',
        orderType: 'MARKET',
        quantity: '1',
        clientOrderId: 'has space',
      }),
    ).toThrow('Invalid --client-order-id');
  });

  it('rejects invalid side / type', () => {
    expect(() =>
      buildOrderCreateRequest({ symbol: '005930', side: 'HOLD', orderType: 'MARKET', quantity: '1' }),
    ).toThrow('Invalid side');
    expect(() =>
      buildOrderCreateRequest({ symbol: '005930', side: 'BUY', orderType: 'STOP', quantity: '1' }),
    ).toThrow('Invalid type');
  });
});

describe('buildOrderModifyRequest', () => {
  it('builds LIMIT modify with price + quantity', () => {
    expect(buildOrderModifyRequest({ orderType: 'LIMIT', quantity: '5', price: '71000' })).toEqual({
      orderType: 'LIMIT',
      price: '71000',
      quantity: '5',
    });
  });

  it('builds MARKET modify (no price)', () => {
    expect(buildOrderModifyRequest({ orderType: 'MARKET', quantity: '5' })).toEqual({
      orderType: 'MARKET',
      quantity: '5',
    });
  });

  it('omits quantity when not provided (US)', () => {
    expect(buildOrderModifyRequest({ orderType: 'LIMIT', price: '100' })).toEqual({
      orderType: 'LIMIT',
      price: '100',
    });
  });

  it('requires price for LIMIT, forbids for MARKET', () => {
    expect(() => buildOrderModifyRequest({ orderType: 'LIMIT' })).toThrow('--price is required');
    expect(() => buildOrderModifyRequest({ orderType: 'MARKET', price: '1' })).toThrow(
      'not allowed for MARKET',
    );
  });

  it('validates quantity is a positive integer', () => {
    expect(() => buildOrderModifyRequest({ orderType: 'MARKET', quantity: '1.5' })).toThrow(
      'positive integer',
    );
  });

  it('passes confirmHighValue', () => {
    expect(buildOrderModifyRequest({ orderType: 'MARKET', confirmHighValue: true }).confirmHighValueOrder).toBe(
      true,
    );
  });
});
