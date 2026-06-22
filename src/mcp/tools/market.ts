import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { createClient, mcpJson, withErrorHandling, defineTool } from '../helpers';
import { CANDLE_INTERVALS } from '../../config/constants';
import { parseSymbols, validateSymbol, parseEnum } from '../../utils/validate';

export function registerMarketTools(server: McpServer): void {
  defineTool<{ symbols: string }>(
    server,
    'get_prices',
    {
      description:
        'Get current price for one or more stock symbols (KR 6-digit e.g. 005930, US ticker e.g. AAPL). Up to 200 symbols.',
      inputSchema: { symbols: z.string().describe('Comma-separated symbols, e.g. "005930,AAPL"') },
    },
    ({ symbols }) =>
      withErrorHandling(async () => {
        const c = createClient();
        if ('error' in c) return c.error;
        return mcpJson(await c.client.getPrices(parseSymbols(symbols)));
      }),
  );

  defineTool<{ symbol: string }>(
    server,
    'get_orderbook',
    {
      description: 'Get bid/ask orderbook for a symbol.',
      inputSchema: { symbol: z.string().describe('Stock symbol (e.g. 005930, AAPL)') },
    },
    ({ symbol }) =>
      withErrorHandling(async () => {
        const c = createClient();
        if ('error' in c) return c.error;
        return mcpJson(await c.client.getOrderbook(validateSymbol(symbol)));
      }),
  );

  defineTool<{ symbol: string; count?: number }>(
    server,
    'get_trades',
    {
      description: "Get recent trades (today's executions) for a symbol.",
      inputSchema: {
        symbol: z.string().describe('Stock symbol'),
        count: z.number().min(1).max(50).optional().describe('Number of trades (max 50)'),
      },
    },
    ({ symbol, count }) =>
      withErrorHandling(async () => {
        const c = createClient();
        if ('error' in c) return c.error;
        return mcpJson(await c.client.getTrades(validateSymbol(symbol), count));
      }),
  );

  defineTool<{ symbol: string }>(
    server,
    'get_price_limits',
    {
      description: 'Get the daily upper/lower price limits for a symbol (null for US).',
      inputSchema: { symbol: z.string().describe('Stock symbol') },
    },
    ({ symbol }) =>
      withErrorHandling(async () => {
        const c = createClient();
        if ('error' in c) return c.error;
        return mcpJson(await c.client.getPriceLimits(validateSymbol(symbol)));
      }),
  );

  defineTool<{ symbol: string; interval: string; count?: number; before?: string; adjusted?: boolean }>(
    server,
    'get_candles',
    {
      description: 'Get OHLCV candles (1m or 1d, up to 200) for a symbol.',
      inputSchema: {
        symbol: z.string().describe('Stock symbol'),
        interval: z.string().describe(`Candle interval (${CANDLE_INTERVALS.join(', ')})`),
        count: z.number().min(1).max(200).optional().describe('Number of candles (max 200)'),
        before: z.string().optional().describe('Pagination: ISO 8601 time; only candles before it'),
        adjusted: z.boolean().optional().describe('Apply adjusted prices'),
      },
    },
    ({ symbol, interval, count, before, adjusted }) =>
      withErrorHandling(async () => {
        const c = createClient();
        if ('error' in c) return c.error;
        const iv = parseEnum(interval, CANDLE_INTERVALS, 'interval');
        return mcpJson(
          await c.client.getCandles(validateSymbol(symbol), iv, { count, before, adjusted }),
        );
      }),
  );
}
