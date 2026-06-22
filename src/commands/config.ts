import { Command } from 'commander';
import * as readline from 'readline';
import {
  CliConfig,
  saveConfig,
  getEffectiveConfig,
  getConfigPath,
  clearStoredCredentials,
} from '../config/store';
import { clearCachedToken } from '../auth/token-store';
import { output, getOutputFormat } from '../output/formatter';
import { handleError } from '../output/error';
import { maskSecret } from '../utils/helpers';
import { parsePositiveInt } from '../utils/validate';
import { createClient } from './_helpers';

function prompt(question: string, hidden = false): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

    if (hidden) {
      process.stdout.write(question);
      const stdin = process.stdin;
      const wasRaw = stdin.isRaw;
      if (stdin.isTTY) stdin.setRawMode(true);

      let input = '';
      const onData = (char: Buffer) => {
        const c = char.toString();
        const code = c.charCodeAt(0);
        if (c === '\n' || c === '\r') {
          stdin.removeListener('data', onData);
          if (stdin.isTTY) stdin.setRawMode(wasRaw ?? false);
          process.stdout.write('\n');
          rl.close();
          resolve(input);
        } else if (code === 3) {
          // Ctrl-C
          process.exit(0);
        } else if (code === 127 || code === 8) {
          // Backspace / Delete
          if (input.length > 0) {
            input = input.slice(0, -1);
            process.stdout.write('\b \b');
          }
        } else {
          input += c;
          process.stdout.write('*');
        }
      };
      stdin.on('data', onData);
    } else {
      rl.question(question, (answer) => {
        rl.close();
        resolve(answer.trim());
      });
    }
  });
}

/** Fetch the account list and offer to save the first account as the default. */
async function autoSelectAccount(): Promise<void> {
  try {
    const client = createClient();
    const accounts = await client.getAccounts();
    if (accounts.length === 0) {
      console.log('No accounts found for these credentials.');
      return;
    }
    console.log('\nAccounts:');
    for (const a of accounts) {
      console.log(`  accountSeq=${a.accountSeq}  ${a.accountNo}  (${a.accountType})`);
    }
    const first = accounts[0];
    saveConfig({ accountSeq: first.accountSeq });
    console.log(`\nDefault account set to accountSeq=${first.accountSeq}.`);
  } catch (err) {
    console.log(
      `\nCould not auto-select account: ${err instanceof Error ? err.message : String(err)}`,
    );
    console.log('Set it later with: toss-cli config set --account <accountSeq>');
  }
}

export function registerConfigCommands(program: Command): void {
  const configCmd = program.command('config').description('Manage CLI configuration');

  configCmd
    .command('init')
    .description('Interactive setup wizard (client credentials + default account)')
    .action(async () => {
      try {
        console.log('Toss Securities CLI Setup\n');
        console.log('Get your client_id / client_secret from Toss Securities WTS:');
        console.log('  Settings > Open API\n');

        const clientId = await prompt('Client ID (client_id): ');
        if (!clientId) {
          console.error('Client ID is required.');
          process.exit(1);
        }
        const clientSecret = await prompt('Client Secret (client_secret): ', true);
        if (!clientSecret) {
          console.error('Client Secret is required.');
          process.exit(1);
        }

        saveConfig({ clientId, clientSecret });
        console.log(`\nConfiguration saved to ${getConfigPath()}`);

        await autoSelectAccount();
      } catch (err) {
        handleError(err);
      }
    });

  configCmd
    .command('set')
    .description('Set configuration values')
    .option('--client-id <id>', 'OAuth2 client_id')
    .option('--client-secret <secret>', 'OAuth2 client_secret')
    .option('--account <accountSeq>', 'Default account sequence')
    .option('--base-url <url>', 'API base URL override')
    .action((options) => {
      try {
        const updates: Partial<CliConfig> = {};
        if (options.clientId) updates.clientId = options.clientId;
        if (options.clientSecret) updates.clientSecret = options.clientSecret;
        if (options.account) updates.accountSeq = parsePositiveInt(options.account, 'account');
        if (options.baseUrl) updates.baseUrl = options.baseUrl;

        if (Object.keys(updates).length === 0) {
          console.log(
            'No values to set. Use --client-id, --client-secret, --account, or --base-url',
          );
          return;
        }
        saveConfig(updates);
        console.log('Configuration updated.');
      } catch (err) {
        handleError(err);
      }
    });

  configCmd
    .command('get <key>')
    .description('Get a configuration value (clientId, clientSecret, accountSeq, baseUrl)')
    .action((key: string) => {
      try {
        const config = getEffectiveConfig();
        const value = (config as unknown as Record<string, unknown>)[key];
        if (value === undefined) {
          console.log(
            `Key "${key}" not found. Available: clientId, clientSecret, accountSeq, baseUrl`,
          );
        } else if (key === 'clientSecret' || key === 'clientId') {
          console.log(maskSecret(value as string));
        } else {
          console.log(String(value));
        }
      } catch (err) {
        handleError(err);
      }
    });

  configCmd
    .command('list')
    .description('Show all configuration')
    .option('-o, --output <format>', 'Output format (table/json)', 'table')
    .action((options) => {
      try {
        const config = getEffectiveConfig();
        const display = {
          clientId: maskSecret(config.clientId),
          clientSecret: maskSecret(config.clientSecret),
          accountSeq: config.accountSeq ?? '(not set)',
          baseUrl: config.baseUrl,
        };
        output(display, getOutputFormat(options));
      } catch (err) {
        handleError(err);
      }
    });

  configCmd
    .command('path')
    .description('Print the config file path')
    .action(() => {
      console.log(getConfigPath());
    });

  configCmd
    .command('logout')
    .description('Remove stored credentials and the cached access token')
    .option('--keep-credentials', 'Only clear the cached token; keep client_id/secret')
    .action((options) => {
      try {
        clearCachedToken();
        if (options.keepCredentials) {
          console.log('Cleared the cached access token.');
          return;
        }
        const { removedKeys } = clearStoredCredentials();
        console.log('Logged out.');
        console.log('  - cleared cached access token');
        if (removedKeys.length > 0) {
          console.log(`  - removed from config: ${removedKeys.join(', ')}`);
        } else {
          console.log('  - no stored credentials found (were you using environment variables?)');
        }
      } catch (err) {
        handleError(err);
      }
    });
}
