import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { createClient, mcpJson, withErrorHandling, defineTool } from '../helpers';
import { CURRENCIES, type Currency } from '../../config/constants';
import { parseEnum } from '../../utils/validate';

export function registerInfoTools(server: McpServer): void {
  defineTool<{ baseCurrency: string; quoteCurrency: string; dateTime?: string }>(
    server,
    'get_exchange_rate',
    {
      description: 'Get the KRW <-> USD exchange rate (reference rate, ~1 min refresh).',
      inputSchema: {
        baseCurrency: z.string().describe('Base currency (KRW/USD)'),
        quoteCurrency: z.string().describe('Quote currency (KRW/USD)'),
        dateTime: z.string().optional().describe('ISO 8601 time for a historical rate'),
      },
    },
    ({ baseCurrency, quoteCurrency, dateTime }) =>
      withErrorHandling(async () => {
        const c = createClient();
        if ('error' in c) return c.error;
        const base = parseEnum<Currency>(baseCurrency, CURRENCIES, 'baseCurrency');
        const quote = parseEnum<Currency>(quoteCurrency, CURRENCIES, 'quoteCurrency');
        return mcpJson(await c.client.getExchangeRate(base, quote, dateTime));
      }),
  );

  defineTool<{ market: string; date?: string }>(
    server,
    'get_market_calendar',
    {
      description:
        'Get market operating hours (previous/today/next business day) for KR or US markets. Times are KST.',
      inputSchema: {
        market: z.string().describe('Market country (KR/US)'),
        date: z.string().optional().describe('Reference date YYYY-MM-DD'),
      },
    },
    ({ market, date }) =>
      withErrorHandling(async () => {
        const c = createClient();
        if ('error' in c) return c.error;
        const m = parseEnum(market, ['KR', 'US'] as const, 'market');
        const data =
          m === 'KR'
            ? await c.client.getMarketCalendarKR(date)
            : await c.client.getMarketCalendarUS(date);
        return mcpJson(data);
      }),
  );
}
