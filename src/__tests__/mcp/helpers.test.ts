import { getEffectiveConfig } from '../../config/store';
import {
  mcpText,
  mcpJson,
  mcpError,
  createClient,
  resolveAccountSeq,
  withErrorHandling,
  defineTool,
} from '../../mcp/helpers';
import { TossApiError } from '../../client/errors';

jest.mock('../../config/store', () => ({
  getEffectiveConfig: jest.fn(),
}));

const mockedConfig = getEffectiveConfig as jest.Mock;

describe('mcp result helpers', () => {
  it('mcpText wraps text content', () => {
    expect(mcpText('hi')).toEqual({ content: [{ type: 'text', text: 'hi' }] });
  });
  it('mcpJson stringifies', () => {
    expect(mcpJson({ a: 1 })).toEqual({ content: [{ type: 'text', text: '{\n  "a": 1\n}' }] });
  });
  it('mcpError sets isError', () => {
    const r = mcpError('boom') as { isError?: boolean; content: { text: string }[] };
    expect(r.isError).toBe(true);
    expect(r.content[0].text).toBe('ERROR: boom');
  });
});

describe('createClient', () => {
  afterEach(() => jest.clearAllMocks());

  it('returns an error result when credentials are missing', () => {
    mockedConfig.mockReturnValue({ baseUrl: 'https://api.test' });
    const r = createClient();
    expect('error' in r).toBe(true);
  });

  it('returns a client when credentials are present', () => {
    mockedConfig.mockReturnValue({ clientId: 'c', clientSecret: 's', baseUrl: 'https://api.test' });
    const r = createClient();
    expect('client' in r).toBe(true);
  });
});

describe('resolveAccountSeq', () => {
  afterEach(() => jest.clearAllMocks());

  it('prefers the explicit arg', () => {
    mockedConfig.mockReturnValue({ accountSeq: 1 });
    expect(resolveAccountSeq(5)).toEqual({ accountSeq: 5 });
  });
  it('falls back to config', () => {
    mockedConfig.mockReturnValue({ accountSeq: 2 });
    expect(resolveAccountSeq()).toEqual({ accountSeq: 2 });
  });
  it('returns an error result when no account is available', () => {
    mockedConfig.mockReturnValue({});
    const r = resolveAccountSeq();
    expect('error' in r).toBe(true);
  });
});

describe('withErrorHandling', () => {
  it('returns the result on success', async () => {
    const r = await withErrorHandling(async () => mcpText('ok'));
    expect(r).toEqual({ content: [{ type: 'text', text: 'ok' }] });
  });
  it('formats TossApiError with its code', async () => {
    const r = (await withErrorHandling(async () => {
      throw new TossApiError({ code: 'order-not-found', message: 'gone', status: 404 });
    })) as { isError?: boolean; content: { text: string }[] };
    expect(r.isError).toBe(true);
    expect(r.content[0].text).toContain('[order-not-found]');
  });
  it('formats generic errors', async () => {
    const r = (await withErrorHandling(async () => {
      throw new Error('plain');
    })) as { content: { text: string }[] };
    expect(r.content[0].text).toContain('plain');
  });
});

describe('defineTool', () => {
  it('registers the tool with the server', () => {
    const registerTool = jest.fn();
    const server = { registerTool } as never;
    const handler = async () => mcpText('x');
    defineTool(server, 'my_tool', { description: 'd' }, handler);
    expect(registerTool).toHaveBeenCalledWith('my_tool', { description: 'd' }, handler);
  });
});
