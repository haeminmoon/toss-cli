let mockHome = '';
jest.mock('os', () => {
  const actual = jest.requireActual('os');
  return { ...actual, homedir: () => mockHome };
});

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as store from '../../config/store';

describe('config store', () => {
  const ENV_KEYS = ['TOSS_CLIENT_ID', 'TOSS_CLIENT_SECRET', 'TOSS_ACCOUNT_SEQ', 'TOSS_API_BASE_URL'];
  let savedEnv: Record<string, string | undefined>;

  beforeEach(() => {
    mockHome = fs.mkdtempSync(path.join(os.tmpdir(), 'toss-cfg-'));
    savedEnv = {};
    for (const k of ENV_KEYS) {
      savedEnv[k] = process.env[k];
      delete process.env[k];
    }
  });
  afterEach(() => {
    for (const k of ENV_KEYS) {
      if (savedEnv[k] === undefined) delete process.env[k];
      else process.env[k] = savedEnv[k];
    }
    fs.rmSync(mockHome, { recursive: true, force: true });
  });

  it('returns empty config when no file exists', () => {
    expect(store.loadConfig()).toEqual({});
  });

  it('saves and merges config with 0600 permissions', () => {
    store.saveConfig({ clientId: 'cid' });
    store.saveConfig({ accountSeq: 3 });
    expect(store.loadConfig()).toEqual({ clientId: 'cid', accountSeq: 3 });
    const mode = fs.statSync(store.getConfigPath()).mode & 0o777;
    expect(mode).toBe(0o600);
  });

  it('tightens permissions to 0600 when rewriting a pre-existing loose config file', () => {
    const p = store.getConfigPath();
    fs.mkdirSync(require('path').dirname(p), { recursive: true });
    fs.writeFileSync(p, '{}', { mode: 0o644 });
    fs.chmodSync(p, 0o644);
    store.saveConfig({ clientId: 'cid' });
    expect(fs.statSync(p).mode & 0o777).toBe(0o600);
  });

  it('getEffectiveConfig falls back to env vars', () => {
    process.env.TOSS_CLIENT_ID = 'env-id';
    process.env.TOSS_CLIENT_SECRET = 'env-secret';
    process.env.TOSS_ACCOUNT_SEQ = '9';
    const eff = store.getEffectiveConfig();
    expect(eff.clientId).toBe('env-id');
    expect(eff.clientSecret).toBe('env-secret');
    expect(eff.accountSeq).toBe(9);
    expect(eff.baseUrl).toBe('https://openapi.tossinvest.com');
  });

  it('config file takes precedence over env', () => {
    process.env.TOSS_CLIENT_ID = 'env-id';
    store.saveConfig({ clientId: 'file-id' });
    expect(store.getEffectiveConfig().clientId).toBe('file-id');
  });

  it('ignores non-integer TOSS_ACCOUNT_SEQ', () => {
    process.env.TOSS_ACCOUNT_SEQ = 'abc';
    expect(store.getEffectiveConfig().accountSeq).toBeUndefined();
  });

  it('honors TOSS_API_BASE_URL override', () => {
    process.env.TOSS_API_BASE_URL = 'https://staging.test';
    expect(store.getEffectiveConfig().baseUrl).toBe('https://staging.test');
  });

  describe('clearStoredCredentials', () => {
    it('removes credentials and deletes the file when nothing else remains', () => {
      store.saveConfig({ clientId: 'cid', clientSecret: 'sec', accountSeq: 1 });
      const { removedKeys } = store.clearStoredCredentials();
      expect(removedKeys.sort()).toEqual(['accountSeq', 'clientId', 'clientSecret']);
      expect(fs.existsSync(store.getConfigPath())).toBe(false);
    });

    it('keeps non-credential keys (e.g. baseUrl) and rewrites at 0600', () => {
      store.saveConfig({ clientId: 'cid', clientSecret: 'sec', baseUrl: 'https://x.test' });
      const { removedKeys } = store.clearStoredCredentials();
      expect(removedKeys.sort()).toEqual(['clientId', 'clientSecret']);
      expect(store.loadConfig()).toEqual({ baseUrl: 'https://x.test' });
      expect(fs.statSync(store.getConfigPath()).mode & 0o777).toBe(0o600);
    });

    it('reports no removed keys when nothing is stored', () => {
      expect(store.clearStoredCredentials().removedKeys).toEqual([]);
    });
  });
});
