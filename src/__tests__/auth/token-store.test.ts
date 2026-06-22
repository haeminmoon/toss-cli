let mockHome = '';
jest.mock('os', () => {
  const actual = jest.requireActual('os');
  return { ...actual, homedir: () => mockHome };
});

const issueTokenMock = jest.fn();
jest.mock('../../auth/token', () => ({
  issueToken: (...args: unknown[]) => issueTokenMock(...args),
}));

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as tokenStore from '../../auth/token-store';

describe('token-store getAccessToken', () => {
  beforeEach(() => {
    mockHome = fs.mkdtempSync(path.join(os.tmpdir(), 'toss-tok-'));
    issueTokenMock.mockReset();
  });
  afterEach(() => {
    fs.rmSync(mockHome, { recursive: true, force: true });
  });

  const opts = { clientId: 'cid', clientSecret: 'sec', baseUrl: 'https://api.test' };

  it('issues and caches a token, reusing it on the next call', async () => {
    issueTokenMock.mockResolvedValue({ access_token: 'T1', token_type: 'Bearer', expires_in: 86399 });
    const t1 = await tokenStore.getAccessToken(opts);
    const t2 = await tokenStore.getAccessToken(opts);
    expect(t1).toBe('T1');
    expect(t2).toBe('T1');
    expect(issueTokenMock).toHaveBeenCalledTimes(1);
    const mode = fs.statSync(tokenStore.getTokenPath()).mode & 0o777;
    expect(mode).toBe(0o600);
  });

  it('re-issues when the cached token belongs to a different client', async () => {
    issueTokenMock.mockResolvedValue({ access_token: 'T1', token_type: 'Bearer', expires_in: 86399 });
    await tokenStore.getAccessToken(opts);
    issueTokenMock.mockResolvedValue({ access_token: 'T2', token_type: 'Bearer', expires_in: 86399 });
    const t = await tokenStore.getAccessToken({ ...opts, clientId: 'other' });
    expect(t).toBe('T2');
    expect(issueTokenMock).toHaveBeenCalledTimes(2);
  });

  it('re-issues when the cached token is near expiry', async () => {
    issueTokenMock.mockResolvedValue({ access_token: 'T1', token_type: 'Bearer', expires_in: 1 });
    await tokenStore.getAccessToken(opts);
    issueTokenMock.mockResolvedValue({ access_token: 'T2', token_type: 'Bearer', expires_in: 86399 });
    const t = await tokenStore.getAccessToken(opts);
    expect(t).toBe('T2');
    expect(issueTokenMock).toHaveBeenCalledTimes(2);
  });

  it('forceRefresh bypasses the cache', async () => {
    issueTokenMock.mockResolvedValue({ access_token: 'T1', token_type: 'Bearer', expires_in: 86399 });
    await tokenStore.getAccessToken(opts);
    issueTokenMock.mockResolvedValue({ access_token: 'T2', token_type: 'Bearer', expires_in: 86399 });
    const t = await tokenStore.getAccessToken({ ...opts, forceRefresh: true });
    expect(t).toBe('T2');
  });

  it('coalesces concurrent issuance into a single token request', async () => {
    issueTokenMock.mockImplementation(
      () =>
        new Promise((res) =>
          setImmediate(() => res({ access_token: 'T1', token_type: 'Bearer', expires_in: 86399 })),
        ),
    );
    const [a, b] = await Promise.all([
      tokenStore.getAccessToken(opts),
      tokenStore.getAccessToken(opts),
    ]);
    expect(a).toBe('T1');
    expect(b).toBe('T1');
    expect(issueTokenMock).toHaveBeenCalledTimes(1);
  });

  it('tightens permissions to 0600 when rewriting a pre-existing loose token file', async () => {
    issueTokenMock.mockResolvedValue({ access_token: 'T1', token_type: 'Bearer', expires_in: 86399 });
    fs.mkdirSync(path.dirname(tokenStore.getTokenPath()), { recursive: true });
    fs.writeFileSync(tokenStore.getTokenPath(), '{}', { mode: 0o644 });
    fs.chmodSync(tokenStore.getTokenPath(), 0o644);
    await tokenStore.getAccessToken({ ...opts, forceRefresh: true });
    expect(fs.statSync(tokenStore.getTokenPath()).mode & 0o777).toBe(0o600);
  });

  it('clearCachedToken removes the cache so the next call re-issues', async () => {
    issueTokenMock.mockResolvedValue({ access_token: 'T1', token_type: 'Bearer', expires_in: 86399 });
    await tokenStore.getAccessToken(opts);
    tokenStore.clearCachedToken();
    issueTokenMock.mockResolvedValue({ access_token: 'T2', token_type: 'Bearer', expires_in: 86399 });
    const t = await tokenStore.getAccessToken(opts);
    expect(t).toBe('T2');
    expect(issueTokenMock).toHaveBeenCalledTimes(2);
  });
});
