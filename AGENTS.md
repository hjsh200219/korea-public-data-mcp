---
description: Korean Public Data MCP 프로젝트 규칙 - 한국 공공데이터 MCP 서버
globs:
alwaysApply: true
---

# public-data-mcp

Korean public data MCP server (법제처 + DART 전자공시 + 공공데이터포털 + 관세청 UNI-PASS + 수출입은행 + 농림축산식품부 + 금융감독원 금융상품 비교공시).

## Quick Start

```bash
npm run build        # TypeScript -> dist/
npm run start:stdio  # MCP stdio mode (local)
npm start            # HTTP mode (Railway deploy)
npm run dev          # Dev with tsx (stdio)
npm run dev:remote   # Dev with tsx (HTTP)
```

## Source Map

```
src/
  index.ts            # Stdio entrypoint (23 lines)
  remote.ts           # HTTP entrypoint - Express (115 lines)
  config.ts           # 환경변수 수집, ServerConfig 로드 (67 lines)
  server.ts           # MCP 서버 오케스트레이터 — 스킬 도구 등록 (21 lines)
  api-routes.ts       # REST 라우트 오케스트레이터 (40 lines)
  openapi.ts          # OpenAPI 스펙 오케스트레이터 (42 lines)
  http-client.ts      # 공통 HTTP fetch/retry/throttle (125 lines)
  shared.ts           # Shared utilities - truncate, errorResponse (18 lines)
  law-api.ts          # 법제처 API client (1546 lines)
  law-types.ts        # 법제처 TypeScript interfaces (598 lines)
  dart-api.ts         # DART 전자공시 API client (375 lines)
  dart-types.ts       # DART TypeScript interfaces (153 lines)
  data20-api.ts       # 공공데이터포털 API client (355 lines)
  data20-types.ts     # 공공데이터포털 TypeScript interfaces (143 lines)
  unipass-api.ts      # 관세청 UNI-PASS API client (1501 lines)
  unipass-types.ts    # 관세청 UNI-PASS TypeScript interfaces (568 lines)
  exim-api.ts         # 수출입은행 API client (82 lines)
  exim-types.ts       # 수출입은행 TypeScript interfaces (27 lines)
  mafra-api.ts        # 농림축산식품부 API client (103 lines)
  mafra-types.ts      # 농림축산식품부 TypeScript interfaces (38 lines)
  finlife-api.ts      # 금융감독원 금융상품 비교공시 API client (232 lines)
  finlife-types.ts    # 금융감독원 금융상품 비교공시 TypeScript interfaces (318 lines)
  routes/             # 도메인별 REST 라우트 (8 files, 960 lines)
  openapi/            # 도메인별 OpenAPI path 생성기 (8 files, 1381 lines)
  tools/
    skills/           # ★ 11개 의도 기반 스킬 도구 + MCP Prompts (v6)
      index.ts        # 스킬 오케스트레이터 — 전체 등록
      _shared.ts      # createDispatcher, requireParam 공통 유틸
      prompts.ts      # MCP Prompts 워크플로 가이드 (5 prompts)
      legal-research.ts      # 법령 리서치 (17 actions, 663 lines)
      case-research.ts       # 판례/해석례 리서치 (10 actions, 428 lines)
      law-amendment.ts       # 법령 비교/개정 (9 actions, 366 lines)
      import-clearance.ts    # 수입통관 (20 actions, 649 lines, MAFRA 포함)
      export-clearance.ts    # 수출통관 (6 actions, 221 lines)
      shipping-logistics.ts  # 선적/물류 (9 actions, 280 lines)
      tariff-lookup.ts       # 관세/HS코드/환율 (9 actions, 272 lines, EXIM 포함)
      trade-entity.ts        # 무역업체 (11 actions, 324 lines)
      corporate-disclosure.ts # 기업공시 (7 actions, 363 lines, DART + 배당)
      public-data.ts         # 공공데이터포털 (9 actions, 289 lines)
      financial-product.ts   # 금융상품 비교공시 (7 actions, 438 lines, 금융감독원)
    # 기존 개별 도구 파일 (law-tools, dart-tools 등)은 v6에서 삭제됨
```

## Layer Rules

```
Entrypoint (index.ts, remote.ts)
    |
    v
Protocol (server.ts → tools/skills/index.ts)
    +  HTTP Adapter (api-routes.ts, openapi.ts)
    |                          |
    +-----------+--------------+
                |
    Data Access (law-api.ts, dart-api.ts, data20-api.ts,
                 unipass-api.ts, exim-api.ts, mafra-api.ts,
                 finlife-api.ts)
                |
    Shared (shared.ts, tools/skills/_shared.ts)
    +  Types (law-types.ts, dart-types.ts, data20-types.ts,
             unipass-types.ts, exim-types.ts, mafra-types.ts,
             finlife-types.ts)
```

- Dependencies flow downward only
- Environment variables only in entrypoints
- Domain-specific types/API in separate files (`{domain}-api.ts`, `{domain}-types.ts`)
- MCP 스킬 도구는 `tools/skills/` 디렉토리에 구현
- See [docs/design-docs/layer-rules.md](docs/design-docs/layer-rules.md)

## Documentation Map

### Architecture & Design
| Document | What it tells you |
|----------|-------------------|
| [ARCHITECTURE.md](ARCHITECTURE.md) | System diagram, layers, external deps |
| [docs/design-docs/layer-rules.md](docs/design-docs/layer-rules.md) | Import rules and boundaries |
| [docs/design-docs/core-beliefs.md](docs/design-docs/core-beliefs.md) | Foundational principles |

### Quality & Planning
| Document | What it tells you |
|----------|-------------------|
| [docs/QUALITY.md](docs/QUALITY.md) | Quality assessment, per-file grades |
| [docs/PRODUCT_SENSE.md](docs/PRODUCT_SENSE.md) | Users, value prop, API targets |
| [docs/exec-plans/tech-debt-tracker.md](docs/exec-plans/tech-debt-tracker.md) | Tech debt inventory |

## Environment

| Variable | Required | Description |
|----------|----------|-------------|
| `LAW_API_OC` | Yes | law.go.kr API authentication code |
| `DART_API_KEY` | No | DART 전자공시 API key (없으면 DART 도구 비활성화) |
| `DATA20_SERVICE_KEY` | No | 공공데이터포털 service key (없으면 공공데이터 도구 비활성화) |
| `UNIPASS_KEY_API*` | No | 관세청 UNI-PASS API 인증키 (API번호별 개별 키, 없으면 UNI-PASS 도구 비활성화) |
| `MAFRA_API_KEY` | No | 농림축산식품부 API key (없으면 농림축산식품부 도구 비활성화) |
| `EXCHANGE_RATE_API_KEY` | No | 수출입은행 환율 API key (없으면 환율 도구 비활성화) |
| `FINLIFE_API_KEY` | No | 금융감독원 금융상품 비교공시 API key (없으면 금융상품 비교공시 도구 비활성화) |
| `PORT` | No | HTTP server port (default: 3000) |

## Conventions

- Korean comments for domain-specific logic
- MCP 스킬 도구: 11개 의도 기반 도구 (v6), 각 도구는 `action` enum으로 세부 동작 선택
- MCP Prompts: 5개 워크플로 가이드 (수입통관, 기업분석, 법령리서치, HS코드, 수출통관)
- REST routes: `kebab-case` (e.g., `/api/search/admin-rules`, `/api/dart/*`, `/api/data20/*`, `/api/unipass/*`, `/api/exim/*`, `/api/mafra/*`, `/api/finlife/*`)
- Error responses: `isError: true` with Korean messages
- Domain-specific types in `{domain}-types.ts`, API clients in `{domain}-api.ts`
- Content truncated at 8000 chars for MCP responses
