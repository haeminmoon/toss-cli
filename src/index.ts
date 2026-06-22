import { Command } from 'commander';
import { registerConfigCommands } from './commands/config';
import { registerMarketCommands } from './commands/market';
import { registerStockCommands } from './commands/stock';
import { registerInfoCommands } from './commands/info';
import { registerAccountCommands } from './commands/account';
import { registerOrderCommands } from './commands/order';

const program = new Command();

program
  .name('toss-cli')
  .description(
    'CLI for the Toss Securities (토스증권) Open API — query KR/US stock data, manage your account, and place orders',
  )
  .version('0.1.1');

program.exitOverride((err) => {
  if (err.code === 'commander.helpDisplayed' || err.code === 'commander.version') {
    process.exit(0);
  }
  process.exit(1);
});

registerConfigCommands(program);
registerMarketCommands(program);
registerStockCommands(program);
registerInfoCommands(program);
registerAccountCommands(program);
registerOrderCommands(program);

program.parseAsync(process.argv).catch(() => {
  // Command actions handle their own errors via handleError(). This catch is
  // only reached when Commander itself fails (e.g. unknown command).
  process.exit(1);
});
