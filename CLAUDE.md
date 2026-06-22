# toss-cli

CLI & MCP server for the Toss Securities (토스증권) Open API — KR/US stock market data, account/holdings, and order management.

## Project Overview

- **Name**: `@2oolkit/toss-cli`
- **Language**: TypeScript (CommonJS)
- **CLI**: Commander.js · **MCP**: @modelcontextprotocol/sdk · **Validation**: zod
- **Node**: >= 20 · **Build**: tsup (two entries: `index.ts` → CLI, `mcp.ts` → MCP server)
- No crypto signing — auth is plain OAuth2 bearer tokens over REST.

## Architecture

```
src/
├── index.ts                  # CLI entry (Commander)
├── mcp.ts                    # MCP server entry (stdio)
├── client/
│   ├── api-client.ts         # TossClient — all 20 endpoints, envelope unwrap, error mapping, 401 retry
│   ├── types.ts              # response/request interfaces mirroring the OpenAPI schemas
│   └── errors.ts             # TossApiError (code, status, requestId, data)
├── auth/
│   ├── token.ts              # issueToken() — POST /oauth2/token (form-urlencoded)
│   └── token-store.ts        # getAccessToken() — file-cached, single-token-per-client aware
├── config/
│   ├── store.ts              # ~/.toss-cli/config.json (0600), getEffectiveConfig (file → env)
│   └── constants.ts          # base URL, env var names, enums, symbol pattern
├── commands/                 # CLI command groups: config, market, stock, info, account, order
│   └── _helpers.ts           # createClient(), resolveAccountSeq()
├── output/
│   ├── formatter.ts          # output(data, json|table)
│   └── error.ts              # ActionableError, handleError() with per-code suggestions
├── mcp/
│   ├── helpers.ts            # defineTool(), createClient(), resolveAccountSeq(), mcp{Text,Json,Error}, withErrorHandling
│   └── tools/                # MCP tool groups: market, stock, info, account, order
└── utils/
    ├── validate.ts           # parseIntStrict/parsePositiveInt/parseFloatStrict, validateSymbol, parseSymbols, parseEnum
    ├── order.ts              # buildOrderCreateRequest / buildOrderModifyRequest (pure, validated)
    └── helpers.ts            # buildQuery, maskSecret, nowMs
```

## Toss Open API Reference

- **Base**: `https://openapi.tossinvest.com`
- **Source of truth**: `https://developers.tossinvest.com/llms.txt` → OpenAPI JSON at `https://openapi.tossinvest.com/openapi-docs/latest/openapi.json`
- **Auth**: OAuth2 Client Credentials. `POST /oauth2/token` → `{ access_token, token_type, expires_in }`. Use as `Authorization: Bearer {token}`. Account/asset/order calls also need `X-Tossinvest-Account: {accountSeq}`.
- **Single token per client**: re-issuing invalidates the previous token → tokens are cached in `~/.toss-cli/token.json` and reused until near expiry.
- **Success envelope**: `{ result: ... }` (unwrapped by the client). **Error envelope**: `{ error: { requestId, code, message, data? } }`. OAuth errors use `{ error, error_description }`.
- **Endpoints**: orderbook, prices (multi), trades, price-limits, candles (1m|1d); stocks (multi), stocks/{symbol}/warnings; exchange-rate, market-calendar/KR, market-calendar/US; accounts, holdings; orders (GET list ?status=OPEN|CLOSED, POST create, GET/{id}, POST {id}/modify, POST {id}/cancel); buying-power, sellable-quantity, commissions.
- **Order create** is a oneOf: quantity-based (KR+US, integer quantity, LIMIT needs price) or amount-based (US MARKET only, regular hours).

## Patterns & Conventions

- **Dual interface**: one `TossClient` drives both the CLI (Commander) and MCP (zod) layers.
- **All commands** support `-o, --output <json|table>`; account/order commands support `-a, --account <seq>`.
- **Errors**: `TossApiError` from the client; `handleError()` prints `[code] message`, requestId, data, and a recovery suggestion. `ActionableError` for config problems.
- **MCP registration** uses `defineTool<Args>(server, name, config, handler)` — an explicitly-typed wrapper that passes the real `inputSchema` to the SDK at runtime but **avoids the SDK's deep generic inference** that otherwise triggers TS2589 ("type instantiation is excessively deep"). Keep enum args as `z.string()` and validate with `parseEnum` in the handler; do not use `z.enum(...)` inside tool schemas.
- **Token caching** is in `auth/token-store.ts`; the client takes an injectable `tokenProvider` for testing.

## Commands

```bash
npm run build           # tsup → dist/index.js, dist/mcp.js
npm run dev             # ts-node src/index.ts
npm run lint            # tsc --noEmit
npm test                # jest (unit) — also live-tested against the real API
npm run test:coverage
```

`tsc` may need a larger heap on some machines: `NODE_OPTIONS=--max-old-space-size=8192 npm run lint`.

## Testing notes

- Unit tests mock `global.fetch` and inject `tokenProvider`; fs-touching tests mock `os.homedir` via `jest.mock('os')` (do **not** use `jest.spyOn(os,'homedir')` — non-configurable on Node 24).
- Trading paths are validated with unit tests plus a deliberately **insufficient-funds** live order (guaranteed `422 insufficient-buying-power`, never fills) to exercise the real POST path without risk.

## Bin Entries

- `toss-cli` → `dist/index.js`
- `toss-mcp` → `dist/mcp.js`
