import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { createClient, mcpJson, withErrorHandling, resolveAccountSeq, defineTool, accountArg } from '../helpers';
import { ORDER_STATUS_FILTERS, type OrderStatusFilter } from '../../config/constants';
import { validateSymbol, parseEnum } from '../../utils/validate';
import { buildOrderCreateRequest, buildOrderModifyRequest } from '../../utils/order';

export function registerOrderTools(server: McpServer): void {
  defineTool<{
    status: string;
    symbol?: string;
    from?: string;
    to?: string;
    cursor?: string;
    limit?: number;
    account?: number;
  }>(
    server,
    'list_orders',
    {
      description:
        'List orders. status=OPEN returns pending orders; status=CLOSED returns finished orders.',
      inputSchema: {
        status: z.string().describe('OPEN or CLOSED'),
        symbol: z.string().optional().describe('Filter by symbol'),
        from: z.string().optional().describe('Start date YYYY-MM-DD (KST)'),
        to: z.string().optional().describe('End date YYYY-MM-DD (KST)'),
        cursor: z.string().optional().describe('Pagination cursor (CLOSED only)'),
        limit: z.number().min(1).max(100).optional().describe('Page size (CLOSED only)'),
        account: accountArg,
      },
    },
    ({ status, symbol, from, to, cursor, limit, account }) =>
      withErrorHandling(async () => {
        const c = createClient();
        if ('error' in c) return c.error;
        const a = resolveAccountSeq(account);
        if ('error' in a) return a.error;
        const st = parseEnum<OrderStatusFilter>(status, ORDER_STATUS_FILTERS, 'status');
        return mcpJson(
          await c.client.getOrders(
            { status: st, symbol: symbol ? validateSymbol(symbol) : undefined, from, to, cursor, limit },
            a.accountSeq,
          ),
        );
      }),
  );

  defineTool<{ orderId: string; account?: number }>(
    server,
    'get_order',
    {
      description: 'Get order detail by orderId (any status).',
      inputSchema: { orderId: z.string().describe('Order ID'), account: accountArg },
    },
    ({ orderId, account }) =>
      withErrorHandling(async () => {
        const c = createClient();
        if ('error' in c) return c.error;
        const a = resolveAccountSeq(account);
        if ('error' in a) return a.error;
        return mcpJson(await c.client.getOrder(orderId, a.accountSeq));
      }),
  );

  defineTool<{
    symbol: string;
    side: string;
    orderType: string;
    quantity?: string;
    amount?: string;
    price?: string;
    tif?: string;
    clientOrderId?: string;
    confirmHighValue?: boolean;
    account?: number;
  }>(
    server,
    'create_order',
    {
      description:
        'Create a LIVE buy/sell order on a real brokerage account. Quantity-based (KR+US) or amount-based (US MARKET only). LIMIT requires price; MARKET forbids it. Use with care — this places a real order.',
      inputSchema: {
        symbol: z.string().describe('Stock symbol (KR 6-digit, US ticker)'),
        side: z.string().describe('BUY or SELL'),
        orderType: z.string().describe('LIMIT or MARKET'),
        quantity: z.string().optional().describe('Whole-share quantity (mutually exclusive with amount)'),
        amount: z.string().optional().describe('USD amount, US MARKET only (mutually exclusive with quantity)'),
        price: z.string().optional().describe('Limit price (required for LIMIT)'),
        tif: z.string().optional().describe('Time in force: DAY or CLS (default DAY)'),
        clientOrderId: z.string().optional().describe('Idempotency key (<=36 chars)'),
        confirmHighValue: z.boolean().optional().describe('Confirm orders >= 100M KRW'),
        account: accountArg,
      },
    },
    ({ symbol, side, orderType, quantity, amount, price, tif, clientOrderId, confirmHighValue, account }) =>
      withErrorHandling(async () => {
        const c = createClient();
        if ('error' in c) return c.error;
        const a = resolveAccountSeq(account);
        if ('error' in a) return a.error;
        const body = buildOrderCreateRequest({
          symbol,
          side,
          orderType,
          quantity,
          amount,
          price,
          tif,
          clientOrderId,
          confirmHighValue,
        });
        return mcpJson(await c.client.createOrder(body, a.accountSeq));
      }),
  );

  defineTool<{
    orderId: string;
    orderType: string;
    quantity?: string;
    price?: string;
    confirmHighValue?: boolean;
    account?: number;
  }>(
    server,
    'modify_order',
    {
      description:
        'Modify a LIVE order (price/quantity). LIMIT requires price; KR requires quantity, US forbids it.',
      inputSchema: {
        orderId: z.string().describe('Order ID'),
        orderType: z.string().describe('LIMIT or MARKET'),
        quantity: z.string().optional().describe('New quantity (KR required, US forbidden)'),
        price: z.string().optional().describe('New price (required for LIMIT)'),
        confirmHighValue: z.boolean().optional().describe('Confirm orders >= 100M KRW'),
        account: accountArg,
      },
    },
    ({ orderId, orderType, quantity, price, confirmHighValue, account }) =>
      withErrorHandling(async () => {
        const c = createClient();
        if ('error' in c) return c.error;
        const a = resolveAccountSeq(account);
        if ('error' in a) return a.error;
        const body = buildOrderModifyRequest({ orderType, quantity, price, confirmHighValue });
        return mcpJson(await c.client.modifyOrder(orderId, body, a.accountSeq));
      }),
  );

  defineTool<{ orderId: string; account?: number }>(
    server,
    'cancel_order',
    {
      description: 'Cancel a LIVE order by orderId.',
      inputSchema: { orderId: z.string().describe('Order ID'), account: accountArg },
    },
    ({ orderId, account }) =>
      withErrorHandling(async () => {
        const c = createClient();
        if ('error' in c) return c.error;
        const a = resolveAccountSeq(account);
        if ('error' in a) return a.error;
        return mcpJson(await c.client.cancelOrder(orderId, a.accountSeq));
      }),
  );
}
