import * as fs from 'fs';
import * as path from 'path';
import { TOKEN_FILE_NAME, TOKEN_REFRESH_MARGIN_MS } from '../config/constants';
import { getConfigDir, ensureConfigDir } from '../config/store';
import { nowMs } from '../utils/helpers';
import { issueToken } from './token';

interface CachedToken {
  clientId: string;
  accessToken: string;
  /** Epoch ms at which the token expires. */
  expiresAt: number;
}

export function getTokenPath(): string {
  return path.join(getConfigDir(), TOKEN_FILE_NAME);
}

function readCachedToken(): CachedToken | null {
  try {
    const raw = fs.readFileSync(getTokenPath(), 'utf-8');
    const parsed = JSON.parse(raw) as CachedToken;
    if (parsed && parsed.accessToken && parsed.clientId && parsed.expiresAt) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

function writeCachedToken(token: CachedToken): void {
  ensureConfigDir();
  const p = getTokenPath();
  // Write to a temp file (created at 0600) then atomically rename, so a
  // pre-existing token.json with looser permissions cannot survive a rewrite
  // and concurrent writers never observe a half-written file.
  const tmp = `${p}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(token, null, 2), { mode: 0o600 });
  fs.renameSync(tmp, p);
  try {
    fs.chmodSync(p, 0o600);
  } catch {
    /* best effort */
  }
}

/** Remove the cached token (e.g. after an `invalid-token` / `expired-token` error). */
export function clearCachedToken(): void {
  try {
    fs.rmSync(getTokenPath(), { force: true });
  } catch {
    /* ignore */
  }
}

/**
 * In-process coalescing of concurrent issuance, keyed by clientId. Toss keeps a
 * single valid token per client and invalidates the previous one on every
 * re-issue, so two concurrent cold-cache callers must NOT both call the token
 * endpoint (the second would invalidate the first, 401-ing it). The MCP server
 * builds a fresh client per tool call and allows concurrent calls, so this is a
 * real path. Any in-flight issuance produces a brand-new token, so even a
 * forceRefresh caller can safely await it.
 */
const inflight = new Map<string, Promise<string>>();

/**
 * Return a valid access token for the given client, issuing a fresh one only
 * when the cache is missing, belongs to a different client, or is near expiry.
 *
 * This caching is important: Toss keeps a single valid token per client and
 * invalidates the previous one whenever a new token is issued, so re-issuing on
 * every call would break concurrent usage and waste the AUTH rate-limit budget.
 */
export async function getAccessToken(opts: {
  clientId: string;
  clientSecret: string;
  baseUrl: string;
  forceRefresh?: boolean;
}): Promise<string> {
  const { clientId, clientSecret, baseUrl, forceRefresh } = opts;

  if (!forceRefresh) {
    const cached = readCachedToken();
    if (
      cached &&
      cached.clientId === clientId &&
      cached.expiresAt - nowMs() > TOKEN_REFRESH_MARGIN_MS
    ) {
      return cached.accessToken;
    }
  }

  // Reuse an in-flight issuance for this client rather than racing a second one.
  const existing = inflight.get(clientId);
  if (existing) return existing;

  const issuance = (async () => {
    const token = await issueToken(baseUrl, clientId, clientSecret);
    const expiresAt = nowMs() + token.expires_in * 1000;
    writeCachedToken({ clientId, accessToken: token.access_token, expiresAt });
    return token.access_token;
  })();

  inflight.set(clientId, issuance);
  try {
    return await issuance;
  } finally {
    inflight.delete(clientId);
  }
}
