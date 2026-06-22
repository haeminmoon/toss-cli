import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerMarketTools } from './mcp/tools/market';
import { registerStockTools } from './mcp/tools/stock';
import { registerInfoTools } from './mcp/tools/info';
import { registerAccountTools } from './mcp/tools/account';
import { registerOrderTools } from './mcp/tools/order';

const server = new McpServer({
  name: 'toss-mcp',
  version: '0.1.1',
});

registerMarketTools(server);
registerStockTools(server);
registerInfoTools(server);
registerAccountTools(server);
registerOrderTools(server);

const transport = new StdioServerTransport();
server.connect(transport).catch((err) => {
  console.error('MCP server error:', err);
  process.exit(1);
});
