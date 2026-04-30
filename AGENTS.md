---
description: K Public Data MCP 프로젝트 규칙 - 한국 공공데이터 MCP 서버 (해외 판례 보조 포함)
globs:
alwaysApply: true
---

> Be concise. No filler. Straight to the point. Use fewer words.

# public-data-mcp

K public data MCP server (법제처 + DART 전자공시 + 공공데이터포털 + 관세청 UNI-PASS + 수출입은행 + 농림축산식품부 + 금융감독원 금융상품 비교공시 + 금융위원회 보험상품 공시 + 조달청 나라장터 + YouTube 자막/메타데이터 + 해외 판례 CourtListener·OpenLegalData + 한국관광공사 KorService2).

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
  remote.ts           # HTTP entrypoint - Express (195 lines)
  config.ts           # 환경변수 수집, ServerConfig 로드 (74 lines)
  server.ts           # MCP 서버 오케스트레이터 — 스킬 도구 등록 (21 lines)
  api-routes.ts       # REST 라우트 오케스트레이터 (47 lines)
  openapi.ts          # OpenAPI 스펙 오케스트레이터 (47 lines)
  http-client.ts      # 공통 HTTP fetch/retry/throttle (128 lines)
  shared.ts           # Shared utilities - truncate, truncateWindow (offset 페이지네이션), errorResponse
  kst-date.ts         # KST 날짜 유틸리티 (41 lines)
  logger.ts           # 구조화 로깅 모듈 (35 lines)
  law-api.ts          # 법제처 API re-export barrel (7 lines)
  law/                # 법제처 API 모듈 분리
    helpers.ts        # XML 파서, HTTP, 변환 유틸 (~190 lines)
    search.ts         # 검색 (법령/행정규칙/자치법규/조약/영문/약칭 등)
    detail.ts         # 상세 (법령/행정규칙/조약/조항호목)
    case.ts           # 판례/해석례/헌재/위원회/행정심판
    amendment.ts      # 신구법비교/법령체계도/3단비교/변경이력
    index.ts          # barrel re-export
  law-types.ts        # 법제처 TypeScript interfaces (598 lines)
  dart-api.ts         # DART 전자공시 API client (375 lines)
  dart-types.ts       # DART TypeScript interfaces (153 lines)
  data20-api.ts       # 공공데이터포털 API client (~396 lines)
  data20-types.ts     # 공공데이터포털 TypeScript interfaces (143 lines)
  unipass-api.ts      # 관세청 UNI-PASS API client (1560 lines)
  unipass-types.ts    # 관세청 UNI-PASS TypeScript interfaces (574 lines)
  exim-api.ts         # 수출입은행 API client (113 lines)
  exim-types.ts       # 수출입은행 TypeScript interfaces (27 lines)
  mafra-api.ts        # 농림축산식품부 API client (104 lines)
  mafra-types.ts      # 농림축산식품부 TypeScript interfaces (38 lines)
  finlife-api.ts      # 금융감독원 금융상품 비교공시 API client (232 lines)
  finlife-types.ts    # 금융감독원 금융상품 비교공시 TypeScript interfaces (318 lines)
  insurance-api.ts    # 금융위원회 보험상품 공시 API client (367 lines)
  insurance-types.ts  # 금융위원회 보험상품 공시 TypeScript interfaces (275 lines)
  g2b-api.ts          # 조달청 나라장터 G2B API client (122 lines)
  g2b-types.ts        # 조달청 G2B TypeScript interfaces (85 lines)
  youtube-api.ts      # YouTube Data API v3 + yt-dlp 자막 추출 (495 lines)
  youtube-types.ts    # YouTube TypeScript interfaces (69 lines)
  courtlistener-api.ts    # CourtListener REST v4 (미국 판례) — search/getOpinion/getCluster/listCourts, cursor 페이지네이션 (~400 lines)
  courtlistener-types.ts  # CourtListener 정규화 도메인 타입 (OpinionListItem/OpinionDetail/ClusterDetail/CourtListItem)
  openlegaldata-api.ts    # OpenLegalData (독일 판례) — search/detail (~75 lines)
  openlegaldata-types.ts  # OpenLegalData TypeScript interfaces (~55 lines)
  tourism-api.ts          # 한국관광공사 KorService2 API client (~340 lines)
  tourism-types.ts        # 한국관광공사 KorService2 TypeScript interfaces (~190 lines)
  routes/             # 도메인별 REST 라우트 (11 domain + helpers)
  openapi/            # 도메인별 OpenAPI path 생성기 (11 path modules + shared)
  tools/
    skills/           # ★ 16개 의도 기반 스킬 도구 + MCP Prompts (v6)
      index.ts        # 스킬 오케스트레이터 — 전체 등록
      _shared.ts      # createDispatcher, requireParam 공통 유틸 (77 lines)
      prompts.ts      # MCP Prompts 워크플로 가이드 (5 prompts, 135 lines)
      legal-research.ts      # 법령 리서치 (17 actions, 663 lines)
      case-research.ts       # 판례/해석례 리서치 (10 actions, 428 lines)
      law-amendment.ts       # 법령 비교/개정 (9 actions, 366 lines)
      import-clearance.ts    # 수입통관 (20 actions, 649 lines, MAFRA 포함)
      export-clearance.ts    # 수출통관 (6 actions, 221 lines)
      shipping-logistics.ts  # 선적/물류 (9 actions, 280 lines)
      tariff-lookup.ts       # 관세/HS코드/환율 (9 actions, 281 lines, EXIM 포함)
      trade-entity.ts        # 무역업체 (11 actions, 324 lines)
      corporate-disclosure.ts # 기업공시 (7 actions, 363 lines, DART + 배당)
      public-data.ts         # 공공데이터포털 (11 actions, ~376 lines)
      financial-product.ts   # 금융상품 비교공시 (7 actions, 438 lines, 금융감독원)
      insurance.ts           # 보험상품 공시 (9 actions, 689 lines, 금융위원회)
      procurement.ts         # 조달청 나라장터 입찰/낙찰 (2 actions, 157 lines)
      youtube.ts             # YouTube 자막/메타데이터/검색/댓글 (5 actions, 223 lines)
      foreign-case-research.ts # 해외 판례 (4 actions, US CourtListener cursor 페이지네이션 + DE OpenLegalData page 페이지네이션)
      tourism.ts             # 한국관광공사 KorService2 (7 actions, 지역·키워드·위치·축제·숙박·상세·코드조회)
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
                 finlife-api.ts, insurance-api.ts,
                 g2b-api.ts, youtube-api.ts,
                 courtlistener-api.ts, openlegaldata-api.ts,
                 tourism-api.ts)
                |
    Shared (shared.ts, tools/skills/_shared.ts)
    +  Types (law-types.ts, dart-types.ts, data20-types.ts,
             unipass-types.ts, exim-types.ts, mafra-types.ts,
             finlife-types.ts, insurance-types.ts,
             g2b-types.ts, youtube-types.ts,
             courtlistener-types.ts, openlegaldata-types.ts,
             tourism-types.ts)
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
| [docs/harness/maturity.md](docs/harness/maturity.md) | 하네스 성숙도 L1–L5 루브릭 |
| [docs/harness/gc-history.md](docs/harness/gc-history.md) | GC 실행 히스토리 |

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
| `YOUTUBE_API_KEY` | No | YouTube Data API v3 key (메타데이터/검색/댓글, 없으면 자막만 사용 가능) |
| `YOUTUBE_COOKIES_FROM_BROWSER` | No | 자막 봇 차단 우회 — 로컬 브라우저 직접 추출 (`chrome` / `firefox` / `safari` / `brave` / `edge` / `chromium`, 선택적 `:프로파일`). 로컬 stdio 권장 |
| `YOUTUBE_COOKIES` | No | 자막 봇 차단 우회 — Netscape `cookies.txt` 내용 텍스트 (Railway 등 서버 배포용). `YOUTUBE_COOKIES_FROM_BROWSER`가 설정되면 무시 |
| `COURTLISTENER_API_TOKEN` | No | CourtListener API 토큰 (미국 판례, 시간당 5,000건). 미설정 시 미국 판례 액션 비활성 |
| `OPENLEGALDATA_API_TOKEN` | No | OpenLegalData 토큰 (독일 판례, 익명 접근 가능). 미설정이어도 `FOREIGN_CASE_ENABLED=true`로 활성화 가능 |
| `FOREIGN_CASE_ENABLED` | No | `true`로 설정하면 토큰 없이도 독일 판례 도구(OpenLegalData) 활성화 |
| `PORT` | No | HTTP server port (default: 3000) |

## Conventions

- Korean comments for domain-specific logic
- MCP 스킬 도구: 16개 의도 기반 도구 (v6), 각 도구는 `action` enum으로 세부 동작 선택 (해외 판례 `foreign_case_research`, 관광 `tourism` 포함)
- MCP Prompts: 6개 워크플로 가이드 (수입통관, 기업분석, 법령리서치, HS코드, 수출통관, 해외판례 비교법)
- REST routes: `kebab-case` (e.g., `/api/search/admin-rules`, `/api/dart/*`, `/api/data20/*`, `/api/unipass/*`, `/api/exim/*`, `/api/mafra/*`, `/api/finlife/*`, `/api/insurance/*`, `/api/courtlistener/*`, `/api/openlegaldata/*`, `/api/tourism/*`)
- Error responses: `isError: true` with Korean messages
- Domain-specific types in `{domain}-types.ts`, API clients in `{domain}-api.ts`
- Content truncated at 8000 chars for MCP responses (큰 본문은 `truncateWindow()`로 offset 기반 페이지네이션)


## TDD 필수

모든 새 기능/로직 변경은 반드시 TDD로 개발한다.
1. Red: 실패하는 테스트 먼저 작성
2. Green: 테스트를 통과하는 최소 코드 작성
3. Refactor: 코드 정리
테스트 없는 코드 변경은 허용하지 않는다.
