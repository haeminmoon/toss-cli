import {
  parseIntStrict,
  parsePositiveInt,
  parseFloatStrict,
  validateSymbol,
  parseSymbols,
  parseEnum,
} from '../../utils/validate';

describe('parseIntStrict', () => {
  it('parses integers from strings and numbers', () => {
    expect(parseIntStrict('42', 'x')).toBe(42);
    expect(parseIntStrict(7, 'x')).toBe(7);
  });
  it('throws on non-integers', () => {
    expect(() => parseIntStrict('abc', 'count')).toThrow('Invalid count');
    expect(() => parseIntStrict(1.5, 'count')).toThrow('Invalid count');
  });
});

describe('parsePositiveInt', () => {
  it('accepts positive integers', () => {
    expect(parsePositiveInt('3', 'n')).toBe(3);
  });
  it('rejects zero and negatives', () => {
    expect(() => parsePositiveInt('0', 'n')).toThrow('must be a positive integer');
    expect(() => parsePositiveInt('-2', 'n')).toThrow('must be a positive integer');
  });
});

describe('parseFloatStrict', () => {
  it('parses floats', () => {
    expect(parseFloatStrict('1.5', 'p')).toBe(1.5);
    expect(parseFloatStrict(2, 'p')).toBe(2);
  });
  it('throws on NaN', () => {
    expect(() => parseFloatStrict('xyz', 'price')).toThrow('Invalid price');
  });
});

describe('validateSymbol', () => {
  it('accepts KR and US symbols', () => {
    expect(validateSymbol('005930')).toBe('005930');
    expect(validateSymbol('AAPL')).toBe('AAPL');
    expect(validateSymbol('BRK.B')).toBe('BRK.B');
    expect(validateSymbol(' aapl ')).toBe('aapl');
  });
  it('rejects empty and invalid charset', () => {
    expect(() => validateSymbol('')).toThrow('required');
    expect(() => validateSymbol('bad symbol!')).toThrow('Invalid symbol');
    expect(() => validateSymbol('한글')).toThrow('Invalid symbol');
  });
});

describe('parseSymbols', () => {
  it('splits and trims comma lists', () => {
    expect(parseSymbols('005930, AAPL ,MSFT')).toEqual(['005930', 'AAPL', 'MSFT']);
  });
  it('accepts arrays', () => {
    expect(parseSymbols(['005930', 'AAPL'])).toEqual(['005930', 'AAPL']);
  });
  it('throws on empty', () => {
    expect(() => parseSymbols('')).toThrow('At least one symbol');
    expect(() => parseSymbols(' , , ')).toThrow('At least one symbol');
  });
  it('throws over 200 symbols', () => {
    const many = Array.from({ length: 201 }, (_, i) => `S${i}`).join(',');
    expect(() => parseSymbols(many)).toThrow('Too many symbols');
  });
  it('validates each symbol', () => {
    expect(() => parseSymbols('005930,bad!')).toThrow('Invalid symbol');
  });
});

describe('parseEnum', () => {
  it('matches case-insensitively and returns canonical', () => {
    expect(parseEnum('buy', ['BUY', 'SELL'] as const, 'side')).toBe('BUY');
    expect(parseEnum('LIMIT', ['LIMIT', 'MARKET'] as const, 'type')).toBe('LIMIT');
  });
  it('throws on invalid', () => {
    expect(() => parseEnum('HOLD', ['BUY', 'SELL'] as const, 'side')).toThrow(
      'Invalid side "HOLD". Allowed: BUY, SELL',
    );
  });
});
