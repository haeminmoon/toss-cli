import { Command } from 'commander';
import { createClient } from './_helpers';
import { output, getOutputFormat } from '../output/formatter';
import { handleError } from '../output/error';
import { CURRENCIES, type Currency } from '../config/constants';
import { parseEnum } from '../utils/validate';

export function registerInfoCommands(program: Command): void {
  const info = program.command('info').description('Exchange rate and market operating hours');

  info
    .command('exchange-rate')
    .description('KRW <-> USD exchange rate')
    .option('--base <currency>', 'Base currency (KRW/USD)', 'USD')
    .option('--quote <currency>', 'Quote currency (KRW/USD)', 'KRW')
    .option('--at <iso>', 'Rate at a specific ISO 8601 time')
    .option('-o, --output <format>', 'Output format (table/json)', 'table')
    .action(async (options) => {
      try {
        const base = parseEnum<Currency>(options.base, CURRENCIES, 'base');
        const quote = parseEnum<Currency>(options.quote, CURRENCIES, 'quote');
        const data = await createClient().getExchangeRate(base, quote, options.at);
        output(data, getOutputFormat(options));
      } catch (err) {
        handleError(err);
      }
    });

  info
    .command('calendar')
    .description('Market operating hours (previous / today / next business day)')
    .option('-m, --market <country>', 'Market country (KR/US)', 'KR')
    .option('--date <YYYY-MM-DD>', 'Reference date')
    .option('-o, --output <format>', 'Output format (table/json)', 'json')
    .action(async (options) => {
      try {
        const market = parseEnum<'KR' | 'US'>(options.market, ['KR', 'US'] as const, 'market');
        const client = createClient();
        const data =
          market === 'KR'
            ? await client.getMarketCalendarKR(options.date)
            : await client.getMarketCalendarUS(options.date);
        output(data, getOutputFormat(options));
      } catch (err) {
        handleError(err);
      }
    });
}
