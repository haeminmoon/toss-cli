import { Command } from 'commander';
import { createClient, resolveAccountSeq } from './_helpers';
import { output, getOutputFormat } from '../output/formatter';
import { handleError } from '../output/error';
import { ORDER_STATUS_FILTERS, type OrderStatusFilter } from '../config/constants';
import { parseEnum, parsePositiveInt, validateSymbol } from '../utils/validate';
import { buildOrderCreateRequest, buildOrderModifyRequest } from '../utils/order';

export function registerOrderCommands(program: Command): void {
  const order = program.command('order').description('Place, modify, cancel, and query orders');

  // order create
  order
    .command('create <symbol>')
    .description('Create a buy/sell order (LIMIT/MARKET, KR/US)')
    .requiredOption('-s, --side <side>', 'BUY or SELL')
    .requiredOption('-t, --type <type>', 'LIMIT or MARKET')
    .option('-q, --quantity <qty>', 'Order quantity (whole shares)')
    .option('--amount <amount>', 'Order amount in USD (US MARKET only)')
    .option('-p, --price <price>', 'Limit price (required for LIMIT)')
    .option('--tif <tif>', 'Time in force: DAY or CLS (default DAY)')
    .option('--client-order-id <id>', 'Idempotency key (<=36 chars, [a-zA-Z0-9-_])')
    .option('--confirm-high-value', 'Confirm orders >= 100M KRW')
    .option('-a, --account <accountSeq>', 'Account sequence (overrides config)')
    .option('-o, --output <format>', 'Output format (table/json)', 'table')
    .action(async (symbol: string, options) => {
      try {
        const body = buildOrderCreateRequest({
          symbol,
          side: options.side,
          orderType: options.type,
          quantity: options.quantity,
          amount: options.amount,
          price: options.price,
          tif: options.tif,
          clientOrderId: options.clientOrderId,
          confirmHighValue: options.confirmHighValue,
        });
        const accountSeq = resolveAccountSeq(options.account);
        const data = await createClient().createOrder(body, accountSeq);
        output(data, getOutputFormat(options));
      } catch (err) {
        handleError(err);
      }
    });

  // order modify
  order
    .command('modify <orderId>')
    .description('Modify an order (price/quantity)')
    .requiredOption('-t, --type <type>', 'LIMIT or MARKET')
    .option('-q, --quantity <qty>', 'New quantity (required for KR, forbidden for US)')
    .option('-p, --price <price>', 'New price (required for LIMIT)')
    .option('--confirm-high-value', 'Confirm orders >= 100M KRW')
    .option('-a, --account <accountSeq>', 'Account sequence (overrides config)')
    .option('-o, --output <format>', 'Output format (table/json)', 'table')
    .action(async (orderId: string, options) => {
      try {
        const body = buildOrderModifyRequest({
          orderType: options.type,
          quantity: options.quantity,
          price: options.price,
          confirmHighValue: options.confirmHighValue,
        });
        const accountSeq = resolveAccountSeq(options.account);
        const data = await createClient().modifyOrder(orderId, body, accountSeq);
        output(data, getOutputFormat(options));
      } catch (err) {
        handleError(err);
      }
    });

  // order cancel
  order
    .command('cancel <orderId>')
    .description('Cancel an order')
    .option('-a, --account <accountSeq>', 'Account sequence (overrides config)')
    .option('-o, --output <format>', 'Output format (table/json)', 'table')
    .action(async (orderId: string, options) => {
      try {
        const accountSeq = resolveAccountSeq(options.account);
        const data = await createClient().cancelOrder(orderId, accountSeq);
        output(data, getOutputFormat(options));
      } catch (err) {
        handleError(err);
      }
    });

  // order list
  order
    .command('list')
    .description('List orders (OPEN = pending, CLOSED = finished)')
    .option('--status <status>', 'OPEN or CLOSED', 'OPEN')
    .option('-s, --symbol <symbol>', 'Filter by symbol')
    .option('--from <YYYY-MM-DD>', 'Start date (orderedAt, KST)')
    .option('--to <YYYY-MM-DD>', 'End date (orderedAt, KST)')
    .option('--cursor <cursor>', 'Pagination cursor (CLOSED only)')
    .option('--limit <number>', 'Page size (CLOSED only, default 20, max 100)')
    .option('-a, --account <accountSeq>', 'Account sequence (overrides config)')
    .option('-o, --output <format>', 'Output format (table/json)', 'table')
    .action(async (options) => {
      try {
        const status = parseEnum<OrderStatusFilter>(
          options.status,
          ORDER_STATUS_FILTERS,
          'status',
        );
        const accountSeq = resolveAccountSeq(options.account);
        const data = await createClient().getOrders(
          {
            status,
            symbol: options.symbol ? validateSymbol(options.symbol) : undefined,
            from: options.from,
            to: options.to,
            cursor: options.cursor,
            limit: options.limit ? parsePositiveInt(options.limit, 'limit') : undefined,
          },
          accountSeq,
        );
        if (getOutputFormat(options) === 'json') {
          output(data, 'json');
          return;
        }
        if (data.orders.length === 0) {
          console.log('No orders.');
        } else {
          const rows = data.orders.map((o) => ({
            orderId: o.orderId,
            symbol: o.symbol,
            side: o.side,
            type: o.orderType,
            status: o.status,
            price: o.price ?? '',
            qty: o.quantity,
            filled: o.execution.filledQuantity,
            orderedAt: o.orderedAt,
          }));
          output(rows, 'table');
        }
        if (data.hasNext) console.log(`\n  nextCursor: ${data.nextCursor}`);
      } catch (err) {
        handleError(err);
      }
    });

  // order get
  order
    .command('get <orderId>')
    .description('Order detail (any status)')
    .option('-a, --account <accountSeq>', 'Account sequence (overrides config)')
    .option('-o, --output <format>', 'Output format (table/json)', 'json')
    .action(async (orderId: string, options) => {
      try {
        const accountSeq = resolveAccountSeq(options.account);
        const data = await createClient().getOrder(orderId, accountSeq);
        output(data, getOutputFormat(options));
      } catch (err) {
        handleError(err);
      }
    });
}
