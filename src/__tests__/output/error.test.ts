import { handleError, ActionableError } from '../../output/error';
import { TossApiError } from '../../client/errors';

describe('handleError', () => {
  let errSpy: jest.SpyInstance;
  let exitSpy: jest.SpyInstance;

  beforeEach(() => {
    errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    exitSpy = jest.spyOn(process, 'exit').mockImplementation(((): never => {
      throw new Error('__exit__');
    }) as never);
  });
  afterEach(() => {
    errSpy.mockRestore();
    exitSpy.mockRestore();
  });

  const output = () => errSpy.mock.calls.map((c) => c.join(' ')).join('\n');

  it('prints TossApiError with code, requestId, data and a suggestion', () => {
    const err = new TossApiError({
      code: 'invalid-token',
      message: 'bad',
      status: 401,
      requestId: 'r1',
      data: { field: 'x' },
    });
    expect(() => handleError(err)).toThrow('__exit__');
    const out = output();
    expect(out).toContain('[invalid-token]');
    expect(out).toContain('bad');
    expect(out).toContain('r1');
    expect(out).toContain('field');
    expect(out).toContain('toss-cli config init');
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('suggests account commands for account errors', () => {
    const err = new TossApiError({ code: 'account-header-required', message: 'need account', status: 400 });
    expect(() => handleError(err)).toThrow('__exit__');
    expect(output()).toContain('toss-cli account list');
  });

  it('prints ActionableError with suggested command', () => {
    expect(() => handleError(new ActionableError('nope', 'toss-cli config init'))).toThrow('__exit__');
    const out = output();
    expect(out).toContain('nope');
    expect(out).toContain('toss-cli config init');
  });

  it('prints generic Error messages', () => {
    expect(() => handleError(new Error('boom'))).toThrow('__exit__');
    expect(output()).toContain('boom');
  });

  it('handles unknown error values', () => {
    expect(() => handleError('weird')).toThrow('__exit__');
    expect(output()).toContain('Unknown error');
  });
});
