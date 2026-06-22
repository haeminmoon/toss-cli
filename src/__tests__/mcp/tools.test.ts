import { registerMarketTools } from '../../mcp/tools/market';
import { registerStockTools } from '../../mcp/tools/stock';
import { registerInfoTools } from '../../mcp/tools/info';
import { registerAccountTools } from '../../mcp/tools/account';
import { registerOrderTools } from '../../mcp/tools/order';

function stubServer() {
  const registerTool = jest.fn();
  return { server: { registerTool } as never, registerTool };
}

describe('MCP tool registration', () => {
  it('registers market tools', () => {
    const { server, registerTool } = stubServer();
    registerMarketTools(server);
    const names = registerTool.mock.calls.map((c) => c[0]);
    expect(names).toEqual(
      expect.arrayContaining(['get_prices', 'get_orderbook', 'get_trades', 'get_price_limits', 'get_candles']),
    );
  });

  it('registers stock tools', () => {
    const { server, registerTool } = stubServer();
    registerStockTools(server);
    expect(registerTool.mock.calls.map((c) => c[0])).toEqual(
      expect.arrayContaining(['get_stocks', 'get_stock_warnings']),
    );
  });

  it('registers info tools', () => {
    const { server, registerTool } = stubServer();
    registerInfoTools(server);
    expect(registerTool.mock.calls.map((c) => c[0])).toEqual(
      expect.arrayContaining(['get_exchange_rate', 'get_market_calendar']),
    );
  });

  it('registers account tools', () => {
    const { server, registerTool } = stubServer();
    registerAccountTools(server);
    expect(registerTool.mock.calls.map((c) => c[0])).toEqual(
      expect.arrayContaining([
        'get_accounts',
        'get_holdings',
        'get_buying_power',
        'get_sellable_quantity',
        'get_commissions',
      ]),
    );
  });

  it('registers order tools', () => {
    const { server, registerTool } = stubServer();
    registerOrderTools(server);
    expect(registerTool.mock.calls.map((c) => c[0])).toEqual(
      expect.arrayContaining(['list_orders', 'get_order', 'create_order', 'modify_order', 'cancel_order']),
    );
  });
});
