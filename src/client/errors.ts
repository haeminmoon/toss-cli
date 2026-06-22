/**
 * Error thrown when the Toss API returns a non-2xx response.
 *
 * Carries the structured fields from the API error envelope
 * (`{ error: { requestId, code, message, data } }`) plus the OAuth2 error
 * shape (`{ error, error_description }`) so callers can branch on `code`.
 */
export class TossApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly requestId?: string;
  readonly data?: unknown;

  constructor(params: {
    code: string;
    message: string;
    status: number;
    requestId?: string;
    data?: unknown;
  }) {
    super(params.message && params.message.length > 0 ? params.message : params.code);
    this.name = 'TossApiError';
    this.code = params.code;
    this.status = params.status;
    this.requestId = params.requestId;
    this.data = params.data;
    // Restore prototype chain (TS target ES2022 + extending Error).
    Object.setPrototypeOf(this, TossApiError.prototype);
  }
}

export function isTossApiError(err: unknown): err is TossApiError {
  return err instanceof TossApiError || (err as { name?: string })?.name === 'TossApiError';
}
