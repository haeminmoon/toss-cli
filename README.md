# toss-cli

[토스증권 Open API](https://developers.tossinvest.com/docs)를 위한 **CLI 겸 MCP 서버**입니다. 국내(KRX)·미국 주식의 시세·호가·캔들·시장정보를 조회하고, 계좌와 보유 주식을 확인하며, 주문 생성·정정·취소까지 터미널이나 AI 에이전트에서 바로 할 수 있습니다.

> ⚠️ **실거래 계좌에 연결됩니다.** 주문 명령은 실제 돈으로 진짜 주문을 넣습니다. 매매 전 [안전](#안전)을 꼭 읽어보세요.

## 기능

- 📈 **시세** — 현재가(다건), 호가, 최근 체결, 상/하한가, OHLCV 캔들
- 🏷️ **종목 정보** — 종목 마스터(종목명·시장·통화·상장상태)와 매수 유의사항/VI
- 🌐 **시장 정보** — KRW↔USD 환율, 국내·미국 장 운영 시간
- 💼 **계좌** — 계좌 목록, 보유 주식, 매수 가능 금액, 판매 가능 수량, 수수료
- 🧾 **주문** — 생성 / 정정 / 취소 / 목록 / 상세 (국내·미국, 지정가·시장가, 수량·금액 기반)
- 🤖 **MCP 서버** — 모든 조회·매매 기능을 Claude, Cursor, Windsurf 등에서 쓸 수 있는 툴로 제공
- 🔐 **OAuth2** — 액세스 토큰 자동 발급·캐싱 (클라이언트당 토큰 1개, 만료 직전까지 재사용)
- 🧰 모든 명령에서 JSON 또는 table 출력 지원

## 설치

```bash
npm install -g @2oolkit/toss-cli
```

설치 없이 바로 실행:

```bash
npx @2oolkit/toss-cli market price 005930
```

Node.js 20 이상이 필요합니다.

## 빠른 시작

1. 토스증권 WTS에서 **설정 → Open API** 메뉴로 들어가 **client_id**와 **client_secret**을 발급받습니다.
2. CLI를 설정합니다:

   ```bash
   toss-cli config init
   ```

   크리덴셜을 `~/.toss-cli/config.json`(권한 `0600`)에 저장하고 계좌를 자동 선택합니다.

3. 바로 조회:

   ```bash
   toss-cli market price 005930,AAPL
   toss-cli account holdings
   toss-cli order list --status OPEN
   ```

## 설정

설정값은 `~/.toss-cli/config.json`을 먼저 읽고, 없으면 환경변수로 폴백합니다:

| 설정 키        | 환경변수              | 설명                                   |
| ------------- | --------------------- | -------------------------------------- |
| `clientId`    | `TOSS_CLIENT_ID`      | OAuth2 client_id                       |
| `clientSecret`| `TOSS_CLIENT_SECRET`  | OAuth2 client_secret                   |
| `accountSeq`  | `TOSS_ACCOUNT_SEQ`    | 계좌/주문 명령의 기본 계좌             |
| `baseUrl`     | `TOSS_API_BASE_URL`   | API base URL 오버라이드(기본: 운영)    |

```bash
toss-cli config set --client-id tsck_live_xxx --client-secret tssk_live_yyy
toss-cli config set --account 1
toss-cli config list      # 시크릿은 마스킹되어 표시됩니다
toss-cli config path
toss-cli config logout    # 저장된 크리덴셜 + 캐시 토큰 삭제
toss-cli config logout --keep-credentials   # 캐시 토큰만 비우기(강제 재인증)
```

> **권장:** 시크릿을 CLI 인자로 넘기는 `config set --client-secret <값>`보다 `config init`(에코 없는 숨김 프롬프트)이나 환경변수를 쓰세요. 인자로 넘긴 시크릿은 셸 히스토리와 프로세스 목록(`ps`)에 노출될 수 있습니다.

OAuth2 액세스 토큰은 `~/.toss-cli/token.json`에 캐시되어 만료 직전까지 재사용됩니다. 토스는 **클라이언트당 유효한 토큰이 1개**(재발급 시 이전 토큰 즉시 무효화)이므로, 이 캐싱이 동시 세션이 서로의 토큰을 무효화하는 것을 막아줍니다.

## 명령어

모든 명령은 `-o, --output <json|table>`(기본 `table`)을 지원합니다. 계좌/주문 명령은 `-a, --account <accountSeq>`로 기본 계좌를 덮어쓸 수 있습니다.

### 시세 (`market`)

```bash
toss-cli market price 005930,AAPL              # 현재가 (최대 200종목)
toss-cli market orderbook 005930               # 호가
toss-cli market trades 005930 -n 20            # 최근 체결 (최대 50)
toss-cli market price-limits 005930            # 상/하한가 (미국은 null)
toss-cli market candles 005930 -i 1d -n 200    # OHLCV (간격 1m 또는 1d, 요청당 최대 200)
toss-cli market candles 005930 -i 1d -n 1000 --paginate   # 200개 초과는 자동 페이지네이션 (nextBefore 커서)
toss-cli market candles 005930 -i 1d --adjusted --before 2026-06-01T00:00:00+09:00
```

> **캔들 개수:** API는 **요청당 최대 200개**를 반환합니다(201개 이상은 서버가 거부). `-n`을 생략하면 200개를 가져옵니다. 200개를 초과해 가져오려면 `--paginate`를 붙이세요 — 응답의 `nextBefore` 커서를 따라 200개씩 페이지를 반복 조회하고(요청 간 ~200ms 대기, 5 req/s 이하), 시간 오름차순으로 중복 제거·정렬한 뒤 `-n`개로 잘라 반환합니다. `--paginate` 없이 `-n`이 200을 넘으면 로컬에서 명확한 에러로 막습니다.

### 종목 정보 (`stock`)

```bash
toss-cli stock info 005930,AAPL                # 종목 마스터
toss-cli stock warnings 005930                 # 매수 유의사항 & VI
```

### 시장 정보 (`info`)

```bash
toss-cli info exchange-rate --base USD --quote KRW
toss-cli info calendar --market KR             # 국내 장 운영 시간
toss-cli info calendar --market US --date 2026-06-22
```

### 계좌 (`account`)

```bash
toss-cli account list                          # 계좌 목록 (accountSeq 확인)
toss-cli account holdings                      # 보유 주식 + 합산 평가
toss-cli account holdings -s 005930            # 종목 필터
toss-cli account buying-power -c KRW           # 매수 가능 금액
toss-cli account sellable 005930               # 판매 가능 수량
toss-cli account commissions                   # 시장별 수수료율
```

### 주문 (`order`)

```bash
# 수량 기반 (국내 & 미국)
toss-cli order create 005930 --side BUY  --type LIMIT  --quantity 10 --price 70000
toss-cli order create 005930 --side SELL --type MARKET --quantity 5

# 금액 기반 (미국 MARKET 전용 — 정규장에서만)
toss-cli order create AAPL --side BUY --type MARKET --amount 100.5

# 선택 옵션: --tif DAY|CLS, --client-order-id <키>, --confirm-high-value
toss-cli order modify <orderId> --type LIMIT --quantity 10 --price 71000
toss-cli order cancel <orderId>
toss-cli order list --status OPEN
toss-cli order list --status CLOSED --limit 50
toss-cli order get <orderId>
```

요청 전송 전에 클라이언트에서 검증하는 규칙:

- `--quantity` / `--amount` 중 **정확히 하나**만.
- `--price`는 `LIMIT`에서 **필수**, `MARKET`에서는 **금지**.
- `--amount`는 `--type MARKET`(미국 전용)을 요구하고 `--price`를 금지합니다.
- 1억원 이상 주문은 `--confirm-high-value`가 필요합니다.

## MCP 서버

`toss-cli`는 모든 기능을 툴로 제공하는 MCP 서버(`toss-mcp`)를 함께 배포합니다.

### Claude Desktop / Cursor / Windsurf (JSON)

MCP 클라이언트 설정에 추가:

```json
{
  "mcpServers": {
    "toss": {
      "command": "npx",
      "args": ["-y", "-p", "@2oolkit/toss-cli", "toss-mcp"],
      "env": {
        "TOSS_CLIENT_ID": "tsck_live_xxx",
        "TOSS_CLIENT_SECRET": "tssk_live_yyy",
        "TOSS_ACCOUNT_SEQ": "1"
      }
    }
  }
}
```

### Codex CLI (TOML)

`~/.codex/config.toml`에 추가:

```toml
[mcp_servers.toss]
command = "npx"
args = ["-y", "-p", "@2oolkit/toss-cli", "toss-mcp"]

[mcp_servers.toss.env]
TOSS_CLIENT_ID = "tsck_live_xxx"
TOSS_CLIENT_SECRET = "tssk_live_yyy"
TOSS_ACCOUNT_SEQ = "1"
```

> **참고:** 패키지에 bin이 2개(`toss-cli`, `toss-mcp`)라, npx로 MCP 서버를 띄울 땐 반드시 `-p`로 패키지를 지정해야 합니다 (`npx -y -p @2oolkit/toss-cli toss-mcp`). `-p` 없이 `npx @2oolkit/toss-cli toss-mcp`로 쓰면 CLI가 실행되며 `unknown command 'toss-mcp'` 에러가 납니다.

이미 `toss-cli config init`을 실행했다면(또는 `~/.toss-cli/config.json`이 있으면) 위의 `env` 블록은 생략 가능합니다 — 서버가 해당 파일에서 크리덴셜을 읽습니다.

**툴 목록:** `get_prices`, `get_orderbook`, `get_trades`, `get_price_limits`, `get_candles`, `get_stocks`, `get_stock_warnings`, `get_exchange_rate`, `get_market_calendar`, `get_accounts`, `get_holdings`, `get_buying_power`, `get_sellable_quantity`, `get_commissions`, `list_orders`, `get_order`, `create_order`, `modify_order`, `cancel_order`.

## 에러 & Rate Limit

에러에는 API의 `code`, 메시지, `requestId`(CS 문의 시 첨부 권장)가 담깁니다. 자주 보는 코드: `invalid-token` / `expired-token`(재인증), `account-header-required`(계좌 설정), `insufficient-buying-power`, `order-hours-closed`, `price-out-of-range`, `confirm-high-value-required`.

API는 클라이언트 × API 그룹 단위로 초당 요청 수(TPS)를 제한합니다. `429`를 받으면 `Retry-After` 헤더만큼 대기 후 백오프하세요. 남은 허용량은 `X-RateLimit-*` 응답 헤더로 확인할 수 있습니다.

## 안전

- 크리덴셜과 캐시 토큰은 `0600` 권한으로 저장되며 `config list` 출력에서 마스킹됩니다.
- `order create` / `modify` / `cancel`(CLI)과 `create_order` / `modify_order` / `cancel_order`(MCP)는 **실거래** 계좌에 작동합니다. 종목·방향·수량·가격을 꼭 재확인하세요.
- `--confirm-high-value` 가드는 1억원 이상 주문에 대한 API 보호 장치를 그대로 반영합니다.
- 더 이상 쓰지 않을 때는 `toss-cli config logout`으로 저장된 크리덴셜과 토큰을 삭제할 수 있습니다.

## 개발

```bash
npm install
npm run build        # tsup → dist/index.js (CLI), dist/mcp.js (MCP)
npm run lint         # tsc --noEmit
npm test             # jest
npm run test:coverage
```

## 라이선스

MIT
