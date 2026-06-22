import { isTossApiError } from '../client/errors';

export class ActionableError extends Error {
  suggestedCommand?: string;

  constructor(message: string, suggestedCommand?: string) {
    super(message);
    this.name = 'ActionableError';
    this.suggestedCommand = suggestedCommand;
    Object.setPrototypeOf(this, ActionableError.prototype);
  }
}

/** Map common API error codes to a recovery suggestion. */
function suggestionForCode(code: string): string | undefined {
  switch (code) {
    case 'missing-credentials':
    case 'invalid-token':
    case 'expired-token':
    case 'edge-blocked':
    case 'login-user-not-found':
      return 'toss-cli config init';
    case 'account-header-required':
    case 'account-not-found':
      return 'toss-cli account list   (then: toss-cli config set --account <accountSeq>)';
    case 'confirm-high-value-required':
      return 'Re-run with --confirm-high-value';
    default:
      return undefined;
  }
}

export function handleError(err: unknown): never {
  if (isTossApiError(err)) {
    console.error(`\nError [${err.code}]: ${err.message}`);
    if (err.data !== undefined && err.data !== null) {
      console.error(`Details: ${JSON.stringify(err.data)}`);
    }
    if (err.requestId) {
      console.error(`Request ID: ${err.requestId}`);
    }
    const suggestion = suggestionForCode(err.code);
    if (suggestion) {
      console.error(`\nTry: ${suggestion}`);
    }
    process.exit(1);
  }

  if (err instanceof ActionableError) {
    console.error(`\nError: ${err.message}`);
    if (err.suggestedCommand) {
      console.error(`\nTry: ${err.suggestedCommand}`);
    }
    process.exit(1);
  }

  if (err instanceof Error) {
    let message = err.message;
    if (message.length > 500) message = message.slice(0, 500) + '...';
    console.error(`\nError: ${message}`);
    process.exit(1);
  }

  console.error('\nUnknown error:', err);
  process.exit(1);
}
