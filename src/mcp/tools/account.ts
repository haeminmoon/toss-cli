import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { createClient, mcpJson, withErrorHandling, resolveAccountSeq, defineTool, accountArg } from '../helpers';
import { CURRENCIES, type Currency } from '../../config/constants';
import { validateSymbol, parseEnum } from '../../utils/validate';

export function registerAccountTools(server: McpServer): void {
  defineTool<Record<string, never>>(
    server,
    'get_accounts',
    { description: 'List your accounts. Use the accountSeq for account/order tools.' },
    () =>
      withErrorHandling(async () => {
        const c = createClient();
        if ('error' in c) return c.error;
        return mcpJson(await c.client.getAccounts());
      }),
  );

  defineTool<{ account?: number; symbol?: string }>(
    server,
    'get_holdings',
    {
      description: 'Get holdings (per-symbol detail + aggregated valuation) for an account.',
      inputSchema: {
        account: accountArg,
        symbol: z.string().optional().describe('Filter by symbol'),
      },
    },
    ({ account, symbol }) =>
      withErrorHandling(async () => {
        const c = createClient();
        if ('error' in c) return c.error;
        const a = resolveAccountSeq(account);
        if ('error' in a) return a.error;
        return mcpJson(
          await c.client.getHoldings(a.accountSeq, symbol ? validateSymbol(symbol) : undefined),
        );
      }),
  );

  defineTool<{ currency: string; account?: number }>(
    server,
    'get_buying_power',
    {
      description: 'Get cash buying power for a currency.',
      inputSchema: {
        currency: z.string().describe('Currency (KRW/USD)'),
        account: accountArg,
      },
    },
    ({ currency, account }) =>
      withErrorHandling(async () => {
        const c = createClient();
        if ('error' in c) return c.error;
        const a = resolveAccountSeq(account);
        if ('error' in a) return a.error;
        const cur = parseEnum<Currency>(currency, CURRENCIES, 'currency');
        return mcpJson(await c.client.getBuyingPower(cur, a.accountSeq));
      }),
  );

  defineTool<{ symbol: string; account?: number }>(
    server,
    'get_sellable_quantity',
    {
      description: 'Get the sellable quantity for a symbol.',
      inputSchema: {
        symbol: z.string().describe('Stock symbol'),
        account: accountArg,
      },
    },
    ({ symbol, account }) =>
      withErrorHandling(async () => {
        const c = createClient();
        if ('error' in c) return c.error;
        const a = resolveAccountSeq(account);
        if ('error' in a) return a.error;
        return mcpJson(await c.client.getSellableQuantity(validateSymbol(symbol), a.accountSeq));
      }),
  );

  defineTool<{ account?: number }>(
    server,
    'get_commissions',
    {
      description: 'Get trading commission rates by market (KR/US).',
      inputSchema: { account: accountArg },
    },
    ({ account }) =>
      withErrorHandling(async () => {
        const c = createClient();
        if ('error' in c) return c.error;
        const a = resolveAccountSeq(account);
        if ('error' in a) return a.error;
        return mcpJson(await c.client.getCommissions(a.accountSeq));
      }),
  );
}
