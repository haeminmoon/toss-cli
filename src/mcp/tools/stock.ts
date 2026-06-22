import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { createClient, mcpJson, withErrorHandling, defineTool } from '../helpers';
import { parseSymbols, validateSymbol } from '../../utils/validate';

export function registerStockTools(server: McpServer): void {
  defineTool<{ symbols: string }>(
    server,
    'get_stocks',
    {
      description:
        'Get stock master data (name, market, currency, listing status, shares outstanding) for one or more symbols. Up to 200.',
      inputSchema: { symbols: z.string().describe('Comma-separated symbols, e.g. "005930,AAPL"') },
    },
    ({ symbols }) =>
      withErrorHandling(async () => {
        const c = createClient();
        if ('error' in c) return c.error;
        return mcpJson(await c.client.getStocks(parseSymbols(symbols)));
      }),
  );

  defineTool<{ symbol: string }>(
    server,
    'get_stock_warnings',
    {
      description:
        'Get buy warnings & volatility interruption (VI) info for a symbol (liquidation, overheated, investment warning/risk, VI, stock warrants).',
      inputSchema: { symbol: z.string().describe('Stock symbol') },
    },
    ({ symbol }) =>
      withErrorHandling(async () => {
        const c = createClient();
        if ('error' in c) return c.error;
        return mcpJson(await c.client.getStockWarnings(validateSymbol(symbol)));
      }),
  );
}
