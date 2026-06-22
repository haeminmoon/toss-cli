import { Command } from 'commander';
import { createClient, resolveAccountSeq } from './_helpers';
import { output, getOutputFormat } from '../output/formatter';
import { handleError } from '../output/error';
import { CURRENCIES, type Currency } from '../config/constants';
import { parseEnum, validateSymbol } from '../utils/validate';

export function registerAccountCommands(program: Command): void {
  const account = program
    .command('account')
    .description('Account, holdings, buying power, sellable quantity, commissions');

  account
    .command('list')
    .description('List your accounts (use accountSeq for other commands)')
    .option('-o, --output <format>', 'Output format (table/json)', 'table')
    .action(async (options) => {
      try {
        const data = await createClient().getAccounts();
        output(data, getOutputFormat(options));
      } catch (err) {
        handleError(err);
      }
    });

  account
    .command('holdings')
    .description('Holdings (per-symbol detail + aggregated valuation)')
    .option('-s, --symbol <symbol>', 'Filter by symbol')
    .option('-a, --account <accountSeq>', 'Account sequence (overrides config)')
    .option('-o, --output <format>', 'Output format (table/json)', 'table')
    .action(async (options) => {
      try {
        const accountSeq = resolveAccountSeq(options.account);
        const symbol = options.symbol ? validateSymbol(options.symbol) : undefined;
        const data = await createClient().getHoldings(accountSeq, symbol);
        if (getOutputFormat(options) === 'json') {
          output(data, 'json');
          return;
        }
        if (data.items.length === 0) {
          console.log('No holdings.');
        } else {
          const rows = data.items.map((h) => ({
            symbol: h.symbol,
            name: h.name,
            qty: h.quantity,
            avgPrice: h.averagePurchasePrice,
            lastPrice: h.lastPrice,
            value: h.marketValue.amount,
            pnl: h.profitLoss.amount,
            pnlRate: h.profitLoss.rate,
            currency: h.currency,
          }));
          output(rows, 'table');
        }
        console.log('\n  Total purchase (KRW):', data.totalPurchaseAmount.krw);
        console.log('  Market value (KRW):  ', data.marketValue.amount.krw);
        console.log('  P/L (KRW):           ', data.profitLoss.amount.krw, `(${data.profitLoss.rate})`);
      } catch (err) {
        handleError(err);
      }
    });

  account
    .command('buying-power')
    .description('Cash buying power for a currency')
    .requiredOption('-c, --currency <currency>', 'Currency (KRW/USD)')
    .option('-a, --account <accountSeq>', 'Account sequence (overrides config)')
    .option('-o, --output <format>', 'Output format (table/json)', 'table')
    .action(async (options) => {
      try {
        const currency = parseEnum<Currency>(options.currency, CURRENCIES, 'currency');
        const accountSeq = resolveAccountSeq(options.account);
        const data = await createClient().getBuyingPower(currency, accountSeq);
        output(data, getOutputFormat(options));
      } catch (err) {
        handleError(err);
      }
    });

  account
    .command('sellable <symbol>')
    .description('Sellable quantity for a symbol')
    .option('-a, --account <accountSeq>', 'Account sequence (overrides config)')
    .option('-o, --output <format>', 'Output format (table/json)', 'table')
    .action(async (symbol: string, options) => {
      try {
        const accountSeq = resolveAccountSeq(options.account);
        const data = await createClient().getSellableQuantity(validateSymbol(symbol), accountSeq);
        output(data, getOutputFormat(options));
      } catch (err) {
        handleError(err);
      }
    });

  account
    .command('commissions')
    .description('Trading commission rates by market (KR/US)')
    .option('-a, --account <accountSeq>', 'Account sequence (overrides config)')
    .option('-o, --output <format>', 'Output format (table/json)', 'table')
    .action(async (options) => {
      try {
        const accountSeq = resolveAccountSeq(options.account);
        const data = await createClient().getCommissions(accountSeq);
        output(data, getOutputFormat(options));
      } catch (err) {
        handleError(err);
      }
    });
}
