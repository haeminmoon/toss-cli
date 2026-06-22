# Trading commands

> ⚠️ These act on a **live** brokerage account with real money.

## Create (`toss-cli order create <symbol>`)

Required: `--side BUY|SELL`, `--type LIMIT|MARKET`, and exactly one of `--quantity` / `--amount`.

| Flag | Notes |
| --- | --- |
| `-q, --quantity <n>` | Whole shares (integer). KR & US. |
| `--amount <usd>` | Order amount in USD. **US MARKET only**, regular hours only. |
| `-p, --price <px>` | **Required for LIMIT**, forbidden for MARKET. KR must match tick size. |
| `--tif <DAY\|CLS>` | Time in force (default DAY). CLS = at-the-close (US LIMIT only). |
| `--client-order-id <key>` | Idempotency key (≤36 chars, `[a-zA-Z0-9-_]`), valid 10 min. |
| `--confirm-high-value` | Required for orders ≥ 100,000,000 KRW. |

```bash
# KR limit buy
toss-cli order create 005930 --side BUY --type LIMIT --quantity 10 --price 70000
# KR market sell
toss-cli order create 005930 --side SELL --type MARKET --quantity 5
# US amount-based market buy
toss-cli order create AAPL --side BUY --type MARKET --amount 100.5
```

## Modify / Cancel / Query

| Command | Notes |
| --- | --- |
| `order modify <orderId> --type LIMIT --quantity N --price PX` | KR requires quantity; US forbids it. LIMIT requires price. |
| `order cancel <orderId>` | Cannot cancel already-filled orders. |
| `order list --status OPEN\|CLOSED [-s symbol] [--from] [--to] [--limit]` | OPEN = pending; CLOSED = finished (paginated via `--cursor`). |
| `order get <orderId>` | Full detail incl. execution (filled qty, avg price, fees, tax). |

## Common errors

`insufficient-buying-power`, `order-hours-closed`, `price-out-of-range`, `invalid-tick-size`, `confirm-high-value-required`, `already-filled` / `already-canceled` (on modify/cancel), `amount-order-outside-regular-hours` (US amount orders off-hours).
