# Account & Asset commands

All require an account. Set a default with `toss-cli config set --account <accountSeq>` (find it via `toss-cli account list`), or pass `-a <accountSeq>` per command.

| Command | Notes |
| --- | --- |
| `account list` | Your accounts. Use the `accountSeq` for all account/order commands. Currently only BROKERAGE accounts are returned. |
| `account holdings [-s <symbol>]` | Per-symbol detail (qty, avg price, market value, P/L) + aggregated valuation. Empty when no holdings. |
| `account buying-power -c <KRW\|USD>` | Cash buying power (no margin). |
| `account sellable <symbol>` | Sellable quantity for a symbol. |
| `account commissions` | Commission rates per market (KR/US). |

```bash
toss-cli account list
toss-cli account holdings -o json
toss-cli account buying-power -c KRW
toss-cli account sellable 005930
```

Amounts are returned per currency (`krw` / `usd`); cross-currency sums are not provided. Rates like `profitLoss.rate` are decimal ratios (`0.1516` = 15.16%).
