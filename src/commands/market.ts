import { Command } from 'commander';
import { createClient } from './_helpers';
import { output, getOutputFormat } from '../output/formatter';
import { handleError } from '../output/error';
import { CANDLE_INTERVALS, type CandleInterval } from '../config/constants';
import { parsePositiveInt, parseSymbols, validateSymbol, parseEnum } from '../utils/validate';

export function registerMarketCommands(program: Command): void {
  const market = program.command('market').description('Market data (prices, orderbook, trades, candles)');

  market
    .command('price <symbols>')
    .description('Current price for one or more symbols (comma-separated, up to 200)')
    .option('-o, --output <format>', 'Output format (table/json)', 'table')
    .action(async (symbols: string, options) => {
      try {
        const list = parseSymbols(symbols);
        const data = await createClient().getPrices(list);
        output(data, getOutputFormat(options));
      } catch (err) {
        handleError(err);
      }
    });

  market
    .command('orderbook <symbol>')
    .description('Bid/ask orderbook')
    .option('-o, --output <format>', 'Output format (table/json)', 'table')
    .action(async (symbol: string, options) => {
      try {
        const data = await createClient().getOrderbook(validateSymbol(symbol));
        if (getOutputFormat(options) === 'json') {
          output(data, 'json');
          return;
        }
        console.log(`\n  Orderbook: ${symbol} (${data.currency})`);
        if (data.timestamp) console.log(`  ${data.timestamp}\n`);
        console.log('  ── Asks (low → high) ──');
        for (const a of [...data.asks].reverse()) {
          console.log(`  ${a.price.padStart(14)}  ${a.volume.padStart(14)}`);
        }
        console.log('  ─────────────────────────');
        for (const b of data.bids) {
          console.log(`  ${b.price.padStart(14)}  ${b.volume.padStart(14)}`);
        }
        console.log('  ── Bids (high → low) ──\n');
      } catch (err) {
        handleError(err);
      }
    });

  market
    .command('trades <symbol>')
    .description("Recent trades (today's executions)")
    .option('-n, --count <number>', 'Number of trades (max 50)')
    .option('-o, --output <format>', 'Output format (table/json)', 'table')
    .action(async (symbol: string, options) => {
      try {
        const count = options.count ? parsePositiveInt(options.count, 'count') : undefined;
        const data = await createClient().getTrades(validateSymbol(symbol), count);
        output(data, getOutputFormat(options));
      } catch (err) {
        handleError(err);
      }
    });

  market
    .command('price-limits <symbol>')
    .description('Daily upper/lower price limits (null for US)')
    .option('-o, --output <format>', 'Output format (table/json)', 'table')
    .action(async (symbol: string, options) => {
      try {
        const data = await createClient().getPriceLimits(validateSymbol(symbol));
        output(data, getOutputFormat(options));
      } catch (err) {
        handleError(err);
      }
    });

  market
    .command('candles <symbol>')
    .description('OHLCV candles (1m or 1d, up to 200)')
    .option('-i, --interval <interval>', `Candle interval (${CANDLE_INTERVALS.join(', ')})`, '1d')
    .option('-n, --count <number>', 'Number of candles (max 200)')
    .option('--before <iso>', 'Pagination: only candles before this ISO 8601 time')
    .option('--adjusted', 'Apply adjusted prices')
    .option('-o, --output <format>', 'Output format (table/json)', 'table')
    .action(async (symbol: string, options) => {
      try {
        const interval = parseEnum<CandleInterval>(options.interval, CANDLE_INTERVALS, 'interval');
        const count = options.count ? parsePositiveInt(options.count, 'count') : undefined;
        const data = await createClient().getCandles(validateSymbol(symbol), interval, {
          count,
          before: options.before,
          adjusted: options.adjusted ? true : undefined,
        });
        if (getOutputFormat(options) === 'json') {
          output(data, 'json');
          return;
        }
        const rows = data.candles.map((c) => ({
          time: c.timestamp,
          open: c.openPrice,
          high: c.highPrice,
          low: c.lowPrice,
          close: c.closePrice,
          volume: c.volume,
        }));
        output(rows, 'table');
        if (data.nextBefore) console.log(`\n  nextBefore: ${data.nextBefore}`);
      } catch (err) {
        handleError(err);
      }
    });
}
