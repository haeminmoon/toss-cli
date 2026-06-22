import { Command } from 'commander';
import { createClient } from './_helpers';
import { output, getOutputFormat } from '../output/formatter';
import { handleError } from '../output/error';
import { parseSymbols, validateSymbol } from '../utils/validate';

export function registerStockCommands(program: Command): void {
  const stock = program.command('stock').description('Stock master data and warnings');

  stock
    .command('info <symbols>')
    .description('Stock master info for one or more symbols (comma-separated, up to 200)')
    .option('-o, --output <format>', 'Output format (table/json)', 'table')
    .action(async (symbols: string, options) => {
      try {
        const list = parseSymbols(symbols);
        const data = await createClient().getStocks(list);
        if (getOutputFormat(options) === 'json') {
          output(data, 'json');
          return;
        }
        const rows = data.map((s) => ({
          symbol: s.symbol,
          name: s.name,
          market: s.market,
          type: s.securityType,
          status: s.status,
          currency: s.currency,
          listDate: s.listDate ?? '',
        }));
        output(rows, 'table');
      } catch (err) {
        handleError(err);
      }
    });

  stock
    .command('warnings <symbol>')
    .description('Buy warnings & volatility interruption (VI) info')
    .option('-o, --output <format>', 'Output format (table/json)', 'table')
    .action(async (symbol: string, options) => {
      try {
        const data = await createClient().getStockWarnings(validateSymbol(symbol));
        output(data, getOutputFormat(options));
      } catch (err) {
        handleError(err);
      }
    });
}
