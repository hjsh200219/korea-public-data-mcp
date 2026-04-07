# Architecture

## System Overview

public-data-mcp is a Model Context Protocol (MCP) server providing Korean public data search through multiple APIs: 법제처 국가법령정보센터, DART 전자공시시스템, 공공데이터포털, 관세청 UNI-PASS, 수출입은행 환율, 농림축산식품부, 금융감독원 금융상품 비교공시. **11개 의도 기반 스킬 도구** + **5개 MCP Prompts 워크플로 가이드**로 114개 API 액션을 제공 (v6.0.0).

## High-Level Diagram

```
┌──────────────────────────────────────────────────────────┐
│                      Consumers                            │
│  Claude Desktop  |  Claude Mobile/Web  |  ChatGPT/HTTP   │
└────────┬─────────────────┬─────────────────┬─────────────┘
         │ stdio           │ Streamable HTTP │ REST
         │                 │                 │
┌────────▼─────┐  ┌───────▼──────────────────▼─────────────┐
│  index.ts    │  │  remote.ts                              │
│  (stdio)     │  │  (Express HTTP server)                  │
│              │  │  - /mcp    (MCP Streamable HTTP)        │
│              │  │  - /api/*  (REST endpoints)             │
│              │  │  - /openapi.json                        │
│              │  │  - /health                              │
└──────┬───────┘  └──┬──────────────┬───────────┬──────────┘
       │             │              │           │
       │         config.ts (환경변수 수집, ServerConfig)
       │             │              │           │
       ▼             ▼              ▼           ▼
┌──────────────┐ ┌──────────┐ ┌──────────┐
│  server.ts   │ │api-routes│ │ openapi  │
│  orchestrate │ │ REST API │ │ spec gen │
└──────┬───────┘ └────┬─────┘ └──────────┘
       │              │
       │  ┌────────────────────────────────────────┐
       │  │  tools/skills/ (11 Skills + 5 Prompts)  │
       │  │  index.ts          — 오케스트레이터      │
       │  │  _shared.ts        — 공통 디스패처       │
       │  │  prompts.ts        — 워크플로 가이드      │
       │  │  legal-research    (17 actions)          │
       │  │  case-research     (10 actions)          │
       │  │  law-amendment     (9 actions)           │
       │  │  import-clearance  (20 actions)          │
       │  │  export-clearance  (6 actions)           │
       │  │  shipping-logistics(9 actions)           │
       │  │  tariff-lookup     (9 actions)           │
       │  │  trade-entity      (11 actions)          │
       │  │  corporate-disclosure(7 actions)         │
       │  │  public-data       (9 actions)           │
       │  │  financial-product (7 actions)           │
       │  └───────────┬────────────────────────────┘
       │              │
       └──────┬───────┘
              ▼
┌─────────────────────────────────────────────┐
│  Data Access Layer                           │
│  law-api.ts    — 법제처 XML API (21 fn)      │
│  dart-api.ts   — DART JSON API (5 fn)       │
│  data20-api.ts — 공공데이터 XML/JSON (8 fn)  │
│  unipass-api.ts — 관세청 UNI-PASS XML (42+)  │
│  exim-api.ts   — 수출입은행 JSON (1 fn)      │
│  mafra-api.ts  — 농림축산식품부 XML (2 fn)    │
│  finlife-api.ts — 금감원 금융상품 JSON (7 fn)│
│  shared.ts     — truncate, errorResponse    │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│  Types Layer                                 │
│  law-types.ts      — 법제처 interfaces       │
│  dart-types.ts     — DART interfaces        │
│  data20-types.ts   — 공공데이터 interfaces    │
│  unipass-types.ts  — UNI-PASS interfaces    │
│  exim-types.ts     — 수출입은행 interfaces    │
│  mafra-types.ts    — 농림축산식품부 interfaces │
│  finlife-types.ts  — 금감원 금융상품 interfaces│
└─────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│  External APIs                               │
│  law.go.kr  |  opendart.fss.or.kr           │
│  apis.data.go.kr  |  api.odcloud.kr         │
│  unipass.customs.go.kr                      │
│  koreaexim.go.kr  |  data.mafra.go.kr       │
│  finlife.fss.or.kr                          │
└─────────────────────────────────────────────┘
```

## Layer Structure

| Layer | File(s) | Lines | Responsibility |
|-------|---------|-------|---------------|
| **Entrypoint** | `index.ts`, `remote.ts`, `config.ts` | 23 + 115 + 67 | Process bootstrap, transport init, env validation |
| **Protocol** | `server.ts`, `tools/skills/` (11 skills + prompts) | 21 + 4,525 (구현만) | MCP 스킬 도구 등록, action 디스패치, zod validation |
| **HTTP Adapter** | `api-routes.ts` + `routes/` (8 files), `openapi.ts` + `openapi/` | 40+960, 42+1381 | REST routes, OpenAPI 3.1 spec |
| **Data Access** | `law-api.ts`, `dart-api.ts`, `data20-api.ts`, `unipass-api.ts`, `exim-api.ts`, `mafra-api.ts`, `finlife-api.ts` | 1546 + 375 + 355 + 1501 + 82 + 103 + 232 | API clients: fetch, parse, rate-limit, retry |
| **Shared** | `shared.ts`, `http-client.ts` | 18 + 125 | Cross-cutting utilities, shared HTTP client |
| **Types** | `law-types.ts`, `dart-types.ts`, `data20-types.ts`, `unipass-types.ts`, `exim-types.ts`, `mafra-types.ts`, `finlife-types.ts` | 598 + 153 + 143 + 568 + 27 + 38 + 318 | TypeScript interfaces per domain |

## Dependency Rules

```
Entrypoint --> Protocol --> Data Access --> Shared / Types
Entrypoint --> HTTP Adapter --> Data Access --> Shared / Types
```

1. All imports flow downward only
2. No circular dependencies
3. Protocol and HTTP Adapter are peers (no cross-imports)
4. Environment variables only in Entrypoint layer
5. Types layer has zero runtime dependencies
6. Domain-specific files (`dart-*`, `data20-*`, `unipass-*`, `exim-*`, `mafra-*`) follow the same layer rules

See [docs/design-docs/layer-rules.md](docs/design-docs/layer-rules.md) for full rules.

## External Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `@modelcontextprotocol/sdk` | ^1.27.1 | MCP protocol (stdio + Streamable HTTP) |
| `express` | ^5.2.1 | HTTP server for remote mode |
| `fast-xml-parser` | ^5.4.1 | XML response parsing (법제처, 공공데이터, UNI-PASS) |
| `jszip` | ^3.10.1 | DART corpCode ZIP parsing |
| `zod` | ^4.3.6 | MCP tool input schema validation |

Dev dependencies: `typescript`, `tsx`, `@types/node`, `@types/express`, `vitest`

## Test Coverage

| Test File | Tests | Coverage |
|-----------|-------|---------|
| `law-api.test.ts` | 41 | 법제처 핵심 10개 API |
| `unipass-api.test.ts` | 65 | UNI-PASS API 전수 |
| `data20-api.test.ts` | 9 | 공공데이터 API |
| `exim-api.test.ts` | 7 | 수출입은행 전수 |
| `mafra-api.test.ts` | 8 | 농림축산식품부 전수 |
| `http-client.test.ts` | 12 | HTTP client 전수 |
| `tools/skills/_shared.test.ts` | 9 | 디스패처/파라미터 검증 |
| `tools/skills/*.test.ts` (11개) | 149 | 10개 스킬 + _shared 도구 action별 테스트 |
| **합계** | **291** | — |

## Key Patterns

### Rate Limiting & Retry
- 법제처: 1 req/sec throttle, 3 retries with exponential backoff (3s, 6s, 12s)
- DART: 200ms interval throttle, 2 retries, daily quota tracking (20,000/day)
- 공공데이터포털: timeout only (retry 미구현)
- UNI-PASS: 30s timeout, no retry
- 수출입은행: 15s timeout, 302 redirect handling
- 농림축산식품부: 30s timeout, no retry
- 금융감독원 금융상품 비교공시: 15s timeout, 2 retries, User-Agent 헤더 필수, `@content2@` 마커 자동 제거

### Session Management (HTTP mode)
- Per-session `StreamableHTTPServerTransport` + `McpServer` instances
- Sessions stored in `Map<string, StreamableHTTPServerTransport>`
- Cleanup on transport close event
- DELETE `/mcp` for explicit teardown

### Content Truncation
- MCP responses truncated at 8000 characters
- Korean message appended when content is cut

## Deployment

| Target | Command | Transport |
|--------|---------|-----------|
| Local dev (stdio) | `npm run dev` | stdio |
| Local dev (HTTP) | `npm run dev:remote` | HTTP |
| Production (Railway) | `npm start` | HTTP (port from `$PORT`) |
| Build | `npm run build` | N/A (TypeScript -> `dist/`) |

## Endpoints (HTTP mode)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | Health check |
| POST | `/mcp` | MCP client -> server messages |
| GET | `/mcp` | MCP server -> client SSE stream |
| DELETE | `/mcp` | Session teardown |
| GET | `/api/search/*` | REST search endpoints (법제처) |
| GET | `/api/detail/*` | REST detail endpoints (법제처) |
| GET | `/api/dart/*` | DART 전자공시 endpoints |
| GET/POST | `/api/data20/*` | 공공데이터포털 endpoints |
| GET | `/api/unipass/*` | 관세청 UNI-PASS endpoints |
| GET | `/api/exim/*` | 수출입은행 환율 endpoints |
| GET | `/api/mafra/*` | 농림축산식품부 endpoints |
| GET | `/api/finlife/*` | 금융감독원 금융상품 비교공시 endpoints |
| GET | `/openapi.json` | OpenAPI 3.1 spec |
