import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z, type ZodRawShape } from 'zod';
import { TossClient } from '../client/api-client';
import { getEffectiveConfig } from '../config/store';
import { isTossApiError } from '../client/errors';

/** Shared `account` argument schema: a positive integer accountSeq, optional. */
export const accountArg = z
  .number()
  .int()
  .positive()
  .optional()
  .describe('accountSeq (defaults to TOSS_ACCOUNT_SEQ / config)');

/**
 * Register an MCP tool with an explicitly-typed argument shape.
 *
 * The SDK's `registerTool` infers the handler's argument type from the zod
 * `inputSchema`, and comparing the handler's `CallToolResult` return against
 * the SDK's deep result type makes the TypeScript compiler instantiate
 * excessively deep types (TS2589). Providing the argument type explicitly and
 * casting the registration boundary sidesteps that inference entirely while
 * still passing the real `inputSchema` through to the SDK at runtime (so MCP
 * clients see the correct schema). Arguments are validated at runtime.
 */
export function defineTool<A>(
  server: McpServer,
  name: string,
  config: { title?: string; description: string; inputSchema?: ZodRawShape },
  handler: (args: A) => Promise<CallToolResult>,
): void {
  const register = server.registerTool.bind(server) as unknown as (
    n: string,
    c: unknown,
    h: (args: A) => Promise<CallToolResult>,
  ) => void;
  register(name, config, handler);
}

/**
 * MCP tool result type. We expose the SDK's `CallToolResult` as the handler
 * return type so `registerTool` sees an identity assignment instead of a deep
 * structural comparison (which otherwise explodes into TS2589 "type
 * instantiation is excessively deep"). Result objects are built from a small
 * closed shape and cast once at this boundary.
 */
export type McpToolResult = CallToolResult;

interface TextResult {
  content: { type: 'text'; text: string }[];
  isError?: boolean;
}

function toResult(r: TextResult): CallToolResult {
  return r as unknown as CallToolResult;
}

export function mcpText(text: string): CallToolResult {
  return toResult({ content: [{ type: 'text', text }] });
}

export function mcpJson(data: unknown): CallToolResult {
  return mcpText(JSON.stringify(data, null, 2));
}

export function mcpError(message: string): CallToolResult {
  return toResult({ content: [{ type: 'text', text: `ERROR: ${message}` }], isError: true });
}

/** Build a client, or return an MCP error if credentials are missing. */
export function createClient(): { client: TossClient } | { error: CallToolResult } {
  const config = getEffectiveConfig();
  if (!config.clientId || !config.clientSecret) {
    return {
      error: mcpError(
        'Client credentials not configured. Set TOSS_CLIENT_ID and TOSS_CLIENT_SECRET, or run: toss-cli config init',
      ),
    };
  }
  return {
    client: new TossClient({
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      accountSeq: config.accountSeq,
      baseUrl: config.baseUrl,
    }),
  };
}

/** Resolve the account sequence, preferring the tool arg over config. */
export function resolveAccountSeq(arg?: number): { accountSeq: number } | { error: CallToolResult } {
  if (arg !== undefined) return { accountSeq: arg };
  const config = getEffectiveConfig();
  if (config.accountSeq === undefined) {
    return {
      error: mcpError(
        'No account configured. Pass the "account" argument or set TOSS_ACCOUNT_SEQ (see the get_accounts tool).',
      ),
    };
  }
  return { accountSeq: config.accountSeq };
}

export async function withErrorHandling(
  fn: () => Promise<CallToolResult>,
): Promise<CallToolResult> {
  try {
    return await fn();
  } catch (err) {
    if (isTossApiError(err)) {
      return mcpError(`[${err.code}] ${err.message}`);
    }
    const message = err instanceof Error ? err.message : String(err);
    return mcpError(message.slice(0, 500));
  }
}
