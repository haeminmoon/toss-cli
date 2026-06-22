import { issueToken } from '../../auth/token';
import { createMockFetch } from '../fixtures';

describe('issueToken', () => {
  let originalFetch: typeof global.fetch;
  beforeEach(() => {
    originalFetch = global.fetch;
  });
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('posts form-urlencoded credentials and returns the token', async () => {
    const fetchMock = createMockFetch({ access_token: 'abc', token_type: 'Bearer', expires_in: 86399 });
    global.fetch = fetchMock;
    const token = await issueToken('https://api.test', 'cid', 'csecret');
    expect(token.access_token).toBe('abc');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.test/oauth2/token');
    expect(init.headers['Content-Type']).toBe('application/x-www-form-urlencoded');
    expect(init.body).toContain('grant_type=client_credentials');
    expect(init.body).toContain('client_id=cid');
    expect(init.body).toContain('client_secret=csecret');
  });

  it('throws a TossApiError on the OAuth2 error shape', async () => {
    global.fetch = createMockFetch(
      { error: 'invalid_client', error_description: 'bad creds' },
      { status: 401 },
    );
    await expect(issueToken('https://api.test', 'c', 's')).rejects.toMatchObject({
      name: 'TossApiError',
      code: 'invalid_client',
      message: 'bad creds',
      status: 401,
    });
  });

  it('throws when access_token is missing', async () => {
    global.fetch = createMockFetch({ token_type: 'Bearer', expires_in: 1 });
    await expect(issueToken('https://api.test', 'c', 's')).rejects.toThrow('did not return an access_token');
  });
});
