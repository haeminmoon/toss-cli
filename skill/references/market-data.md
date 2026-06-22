# Market & Info commands

Symbols: KR = 6-digit code (`005930`), US = ticker (`AAPL`, `BRK.B`). All commands support `-o json|table`.

## Market data (`toss-cli market ...`)

| Command | Notes |
| --- | --- |
| `price <symbols>` | Comma-separated, up to 200. Returns `lastPrice`, `currency`, `timestamp`. |
| `orderbook <symbol>` | Bid/ask levels with volume. |
| `trades <symbol> [-n N]` | Recent executions, `N` ≤ 50. |
| `price-limits <symbol>` | Daily upper/lower limit; `null` for US. |
| `candles <symbol> -i <1m\|1d> [-n N] [--paginate] [--before ISO] [--adjusted]` | OHLCV. **Max 200 bars/request** (server 400 at 201); default `N`=200. Use `--paginate` to fetch more — it walks the `nextBefore` cursor 200 at a time, dedupes + sorts ascending, caps to `N`. Without `--paginate`, `N` > 200 errors locally. |

```bash
toss-cli market price 005930,000660,AAPL
toss-cli market candles 005930 -i 1m -n 60
toss-cli market candles 005930 -i 1d -n 200                 # one request, max bars
toss-cli market candles 005930 -i 1d -n 1000 --paginate     # auto-paginate (~5 pages)
toss-cli market candles 005930 -i 1d --before 2026-06-01T00:00:00+09:00
```

To paginate manually (or from the MCP `get_candles` tool): take `nextBefore` from each response and pass it as the next `--before` / `before`; stop when `nextBefore` is `null`.

## Stock info (`toss-cli stock ...`)

| Command | Notes |
| --- | --- |
| `info <symbols>` | Master data: name, market (KOSPI/KOSDAQ/NYSE/...), currency, listing status, shares outstanding. Up to 200 symbols. |
| `warnings <symbol>` | Buy warnings & VI: liquidation, overheated, investment warning/risk, VI, stock warrants. |

## Market info (`toss-cli info ...`)

| Command | Notes |
| --- | --- |
| `exchange-rate [--base USD] [--quote KRW] [--at ISO]` | KRW↔USD reference rate (~1 min refresh). |
| `calendar [--market KR\|US] [--date YYYY-MM-DD]` | Operating hours for previous/today/next business day. Times are KST. |
