/** Current epoch milliseconds (wrapped for testability). */
export function nowMs(): number {
  return Date.now();
}

/** Resolve after `ms` milliseconds (used to throttle paginated requests). */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Build a URL query string from a record, omitting undefined / null / '' values.
 * Returns '' when there are no parameters, otherwise a string beginning with '?'.
 */
export function buildQuery(params: Record<string, unknown>): string {
  const usp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    usp.append(key, String(value));
  }
  const qs = usp.toString();
  return qs ? `?${qs}` : '';
}

/** Mask a secret for display: first 8 + last 4 chars, e.g. tsck_liv...N2D. */
export function maskSecret(value: string | undefined): string {
  if (!value) return '(not set)';
  if (value.length <= 14) return '****';
  return value.slice(0, 8) + '...' + value.slice(-4);
}
