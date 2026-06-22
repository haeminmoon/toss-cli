---
name: toss-cli
description: Query Toss Securities (토스증권) KR/US stock market data, inspect an account and holdings, and place/modify/cancel orders via the toss-cli CLI or toss-mcp MCP server.
---

# toss-cli

CLI & MCP server for the Toss Securities Open API (KRX + US stocks).

## When to use

- Look up Korean (6-digit code, e.g. `005930`) or US (ticker, e.g. `AAPL`) stock prices, orderbooks, trades, candles, price limits.
- Read stock master data, buy warnings/VI, KRW↔USD exchange rate, market hours.
- Inspect your Toss account: holdings, buying power, sellable quantity, commissions.
- Place, modify, cancel, or list orders (LIMIT/MARKET, KR/US).

## Setup

Needs OAuth2 credentials from Toss Securities WTS (Settings → Open API):

```bash
toss-cli config init        # interactive — stores ~/.toss-cli/config.json (0600), auto-selects account
# or via env: TOSS_CLIENT_ID, TOSS_CLIENT_SECRET, TOSS_ACCOUNT_SEQ
```

## Cheatsheet

```bash
# Market data
toss-cli market price 005930,AAPL -o json
toss-cli market orderbook 005930
toss-cli market candles 005930 -i 1d -n 100

# Account
toss-cli account list
toss-cli account holdings
toss-cli account buying-power -c KRW

# Orders (LIVE — real money)
toss-cli order create 005930 --side BUY --type LIMIT --quantity 10 --price 70000
toss-cli order list --status OPEN
toss-cli order cancel <orderId>
```

Every command takes `-o json|table`. Account/order commands take `-a <accountSeq>`.

## References

- `references/market-data.md` — market, stock, and info commands.
- `references/account.md` — account, holdings, buying power.
- `references/trading.md` — order rules and examples.

## Notes

- Order commands act on a **live** brokerage account. Confirm symbol/side/quantity/price.
- KR symbols are 6 digits; US symbols are tickers. `--amount` is US MARKET only.
- Orders ≥ 100M KRW need `--confirm-high-value`.
