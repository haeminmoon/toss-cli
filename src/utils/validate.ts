import { SYMBOL_PATTERN, MAX_SYMBOLS } from '../config/constants';

/** Parse an integer strictly, throwing a descriptive error on failure. */
export function parseIntStrict(value: string | number, name: string): number {
  const n = typeof value === 'number' ? value : parseInt(value, 10);
  if (!Number.isInteger(n)) {
    throw new Error(`Invalid ${name}: "${value}" is not a valid integer`);
  }
  return n;
}

/** Parse a positive integer (> 0), throwing on failure. */
export function parsePositiveInt(value: string | number, name: string): number {
  const n = parseIntStrict(value, name);
  if (n <= 0) {
    throw new Error(`Invalid ${name}: "${value}" must be a positive integer`);
  }
  return n;
}

/**
 * Validate that a per-request count does not exceed `max`, throwing a clear
 * local error (so a too-large single-request count fails fast instead of
 * leaking a raw server 400). To fetch more than `max`, callers should paginate.
 */
export function validateCount(n: number, max: number, name: string): number {
  if (n > max) {
    throw new Error(
      `Invalid ${name}: ${n} exceeds the per-request maximum of ${max}. Use --paginate to fetch more.`,
    );
  }
  return n;
}

/** Parse a float strictly, throwing on failure. */
export function parseFloatStrict(value: string | number, name: string): number {
  const n = typeof value === 'number' ? value : parseFloat(value);
  if (Number.isNaN(n)) {
    throw new Error(`Invalid ${name}: "${value}" is not a valid number`);
  }
  return n;
}

/** Validate a single stock symbol against the API's allowed charset. */
export function validateSymbol(symbol: string): string {
  const trimmed = symbol.trim();
  if (!trimmed) {
    throw new Error('Symbol is required.');
  }
  if (!SYMBOL_PATTERN.test(trimmed)) {
    throw new Error(
      `Invalid symbol "${symbol}". Only ASCII letters, digits, '.' and '-' are allowed (KR: 6 digits e.g. 005930, US: ticker e.g. AAPL).`,
    );
  }
  return trimmed;
}

/**
 * Parse and validate a comma-separated list of symbols, returning a clean array.
 * Accepts either a comma-separated string or an array.
 */
export function parseSymbols(input: string | string[]): string[] {
  const raw = Array.isArray(input) ? input : String(input).split(',');
  const symbols = raw.map((s) => s.trim()).filter((s) => s.length > 0);
  if (symbols.length === 0) {
    throw new Error('At least one symbol is required.');
  }
  if (symbols.length > MAX_SYMBOLS) {
    throw new Error(`Too many symbols (${symbols.length}). Maximum is ${MAX_SYMBOLS}.`);
  }
  for (const s of symbols) validateSymbol(s);
  return symbols;
}

/** Validate that a value is one of an allowed set (case-insensitive), returning the canonical value. */
export function parseEnum<T extends string>(
  value: string,
  allowed: readonly T[],
  name: string,
): T {
  const upper = value.toUpperCase();
  const match = allowed.find((a) => a.toUpperCase() === upper);
  if (!match) {
    throw new Error(`Invalid ${name} "${value}". Allowed: ${allowed.join(', ')}`);
  }
  return match;
}
