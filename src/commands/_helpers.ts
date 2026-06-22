import { TossClient } from '../client/api-client';
import { getEffectiveConfig } from '../config/store';
import { ActionableError } from '../output/error';
import { parsePositiveInt } from '../utils/validate';

/**
 * Build a client from the effective config. Requires client credentials, which
 * every endpoint needs (all Toss API calls are authenticated).
 */
export function createClient(): TossClient {
  const config = getEffectiveConfig();
  if (!config.clientId || !config.clientSecret) {
    throw new ActionableError(
      'Client credentials are not configured.',
      'toss-cli config init',
    );
  }
  return new TossClient({
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    accountSeq: config.accountSeq,
    baseUrl: config.baseUrl,
  });
}

/**
 * Resolve the account sequence to use for account/asset/order commands.
 * `--account` overrides the configured default.
 */
export function resolveAccountSeq(optAccount?: string): number {
  if (optAccount !== undefined) {
    return parsePositiveInt(optAccount, 'account');
  }
  const config = getEffectiveConfig();
  if (config.accountSeq === undefined) {
    throw new ActionableError(
      'No account configured for this command.',
      'toss-cli account list   (then: toss-cli config set --account <accountSeq>)',
    );
  }
  return config.accountSeq;
}
