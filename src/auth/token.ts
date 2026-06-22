import { REQUEST_TIMEOUT_MS } from '../config/constants';
import { TossApiError } from '../client/errors';

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  let timedOut = false;
  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err) {
    if (timedOut) {
      throw new TossApiError({
        code: 'timeout',
        message: `Token request timed out after ${REQUEST_TIMEOUT_MS}ms`,
        status: 0,
      });
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Issue an OAuth2 access token via the Client Credentials grant.
 *
 * Note: the token endpoint responds with the OAuth2 standard shape, not the
 * BFF `{ error: {...} }` envelope — errors look like
 * `{ error, error_description }`.
 */
export async function issueToken(
  baseUrl: string,
  clientId: string,
  clientSecret: string,
): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
  });

  const res = await fetchWithTimeout(`${baseUrl}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  const text = await res.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = undefined;
  }

  if (!res.ok) {
    const p = (parsed ?? {}) as Record<string, unknown>;
    // OAuth2 error shape first, then fall back to the BFF envelope (e.g. 429).
    const envelope = (p.error as Record<string, unknown>) ?? undefined;
    const code =
      typeof p.error === 'string'
        ? (p.error as string)
        : (envelope?.code as string) ?? 'token-request-failed';
    const message =
      (p.error_description as string) ??
      (envelope?.message as string) ??
      text ??
      'Failed to issue access token';
    throw new TossApiError({
      code,
      message,
      status: res.status,
      requestId: envelope?.requestId as string | undefined,
    });
  }

  const token = parsed as TokenResponse;
  if (!token?.access_token) {
    throw new TossApiError({
      code: 'token-request-failed',
      message: 'Token endpoint did not return an access_token',
      status: res.status,
    });
  }
  return token;
}
