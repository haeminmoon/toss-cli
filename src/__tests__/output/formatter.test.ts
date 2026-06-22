import { output, getOutputFormat } from '../../output/formatter';

describe('getOutputFormat', () => {
  it('returns json only when explicitly json', () => {
    expect(getOutputFormat({ output: 'json' })).toBe('json');
    expect(getOutputFormat({ output: 'table' })).toBe('table');
    expect(getOutputFormat({})).toBe('table');
  });
});

describe('output', () => {
  let logSpy: jest.SpyInstance;
  let tableSpy: jest.SpyInstance;
  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    tableSpy = jest.spyOn(console, 'table').mockImplementation(() => {});
  });
  afterEach(() => {
    logSpy.mockRestore();
    tableSpy.mockRestore();
  });

  it('prints pretty JSON in json mode', () => {
    output({ a: 1 }, 'json');
    expect(logSpy).toHaveBeenCalledWith(JSON.stringify({ a: 1 }, null, 2));
  });

  it('prints "No data" for empty arrays', () => {
    output([], 'table');
    expect(logSpy).toHaveBeenCalledWith('No data');
  });

  it('uses console.table for arrays of objects', () => {
    output([{ a: 1 }, { a: 2 }], 'table');
    expect(tableSpy).toHaveBeenCalled();
  });

  it('prints key/value list for single objects', () => {
    output({ symbol: '005930', price: '70000' }, 'table');
    const joined = logSpy.mock.calls.map((c) => c[0]).join('\n');
    expect(joined).toContain('symbol');
    expect(joined).toContain('005930');
  });

  it('stringifies nested object values in table mode', () => {
    output({ nested: { x: 1 } }, 'table');
    const joined = logSpy.mock.calls.map((c) => c[0]).join('\n');
    expect(joined).toContain('{"x":1}');
  });

  it('prints primitives directly', () => {
    output('hello', 'table');
    expect(logSpy).toHaveBeenCalledWith('hello');
  });
});
