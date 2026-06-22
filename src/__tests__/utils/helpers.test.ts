import { buildQuery, maskSecret, nowMs } from '../../utils/helpers';

describe('buildQuery', () => {
  it('returns empty string for no params', () => {
    expect(buildQuery({})).toBe('');
    expect(buildQuery({ a: undefined, b: null, c: '' })).toBe('');
  });
  it('encodes and joins defined params', () => {
    expect(buildQuery({ symbols: '005930,AAPL', count: 5 })).toBe('?symbols=005930%2CAAPL&count=5');
  });
  it('includes false and zero values', () => {
    expect(buildQuery({ adjusted: false, n: 0 })).toBe('?adjusted=false&n=0');
  });
});

describe('maskSecret', () => {
  it('returns (not set) for undefined', () => {
    expect(maskSecret(undefined)).toBe('(not set)');
  });
  it('masks short secrets', () => {
    expect(maskSecret('short')).toBe('****');
  });
  it('shows first 8 + last 4 for long secrets', () => {
    expect(maskSecret('tsck_live_o1rfFirBPaKIbbRbGB4N2D')).toBe('tsck_liv...4N2D');
  });
});

describe('nowMs', () => {
  it('returns a number close to Date.now()', () => {
    const n = nowMs();
    expect(typeof n).toBe('number');
    expect(Math.abs(n - Date.now())).toBeLessThan(1000);
  });
});
