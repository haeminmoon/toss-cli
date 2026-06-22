import { Command } from 'commander';
import { registerConfigCommands } from '../../commands/config';
import { registerMarketCommands } from '../../commands/market';
import { registerStockCommands } from '../../commands/stock';
import { registerInfoCommands } from '../../commands/info';
import { registerAccountCommands } from '../../commands/account';
import { registerOrderCommands } from '../../commands/order';

function subNames(program: Command, group: string): string[] {
  const cmd = program.commands.find((c) => c.name() === group);
  return cmd ? cmd.commands.map((c) => c.name()) : [];
}

describe('CLI command registration', () => {
  let program: Command;
  beforeEach(() => {
    program = new Command();
    registerConfigCommands(program);
    registerMarketCommands(program);
    registerStockCommands(program);
    registerInfoCommands(program);
    registerAccountCommands(program);
    registerOrderCommands(program);
  });

  it('registers all top-level groups', () => {
    expect(program.commands.map((c) => c.name())).toEqual(
      expect.arrayContaining(['config', 'market', 'stock', 'info', 'account', 'order']),
    );
  });

  it('registers config subcommands', () => {
    expect(subNames(program, 'config')).toEqual(
      expect.arrayContaining(['init', 'set', 'get', 'list', 'path', 'logout']),
    );
  });

  it('registers market subcommands', () => {
    expect(subNames(program, 'market')).toEqual(
      expect.arrayContaining(['price', 'orderbook', 'trades', 'price-limits', 'candles']),
    );
  });

  it('registers stock subcommands', () => {
    expect(subNames(program, 'stock')).toEqual(expect.arrayContaining(['info', 'warnings']));
  });

  it('registers info subcommands', () => {
    expect(subNames(program, 'info')).toEqual(expect.arrayContaining(['exchange-rate', 'calendar']));
  });

  it('registers account subcommands', () => {
    expect(subNames(program, 'account')).toEqual(
      expect.arrayContaining(['list', 'holdings', 'buying-power', 'sellable', 'commissions']),
    );
  });

  it('registers order subcommands', () => {
    expect(subNames(program, 'order')).toEqual(
      expect.arrayContaining(['create', 'modify', 'cancel', 'list', 'get']),
    );
  });
});
