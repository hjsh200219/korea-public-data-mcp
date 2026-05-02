---
description: K Public Data MCP 프로젝트 규칙 - 한국 공공데이터 MCP 서버 (해외 판례 보조 포함)
globs:
alwaysApply: true
---

> Be concise. No filler. Straight to the point. Use fewer words.

# public-data-mcp

K public data MCP server (법제처 + DART 전자공시 + 공공데이터포털 + 관세청 UNI-PASS + 수출입은행 + 농림축산식품부 + 금융감독원 금융상품 비교공시 + 금융위원회 보험상품 공시 + 조달청 나라장터 + YouTube 자막/메타데이터 + 해외 판례 CourtListener·OpenLegalData + 한국관광공사 KorService2 + 쿠팡 파트너스 상품리뷰).

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
  index.ts            # Stdio entrypoint
  remote.ts           # HTTP entrypoint (Express)
  config.ts           # 환경변수 수집, ServerConfig 로드
  server.ts           # MCP 서버 오케스트레이터 — 스킬 도구 등록
  api-routes.ts       # REST 라우트 오케스트레이터
  openapi.ts          # OpenAPI 스펙 오케스트레이터
  http-client.ts      # 공통 HTTP fetch/retry/throttle
  shared.ts           # truncate, truncateWindow (offset 페이지네이션), errorResponse
  kst-date.ts         # KST 날짜 유틸리티
  logger.ts           # 구조화 로깅
  law-api.ts          # 법제처 API re-export barrel
  law/                # 법제처 API 모듈 분리
    helpers.ts        # XML 파서, HTTP, 변환 유틸
    search.ts         # 검색 (법령/행정규칙/자치법규/조약/영문/약칭 등)
    detail.ts         # 상세 (법령/행정규칙/조약/조항호목)
    case.ts           # 판례/해석례/헌재/위원회/행정심판
    amendment.ts      # 신구법비교/법령체계도/3단비교/변경이력
    index.ts          # barrel re-export
  law-types.ts        # 법제처 TypeScript interfaces
  dart-api.ts         # DART 전자공시 API client
  dart-types.ts       # DART TypeScript interfaces
  data20-api.ts       # 공공데이터포털 API client
  data20-types.ts     # 공공데이터포털 TypeScript interfaces
  unipass-api.ts      # 관세청 UNI-PASS API client
  unipass-types.ts    # 관세청 UNI-PASS TypeScript interfaces
  exim-api.ts         # 수출입은행 API client
  exim-types.ts       # 수출입은행 TypeScript interfaces
  mafra-api.ts        # 농림축산식품부 API client
  mafra-types.ts      # 농림축산식품부 TypeScript interfaces
  finlife-api.ts      # 금융감독원 금융상품 비교공시 API client
  finlife-types.ts    # 금융감독원 금융상품 비교공시 TypeScript interfaces
  insurance-api.ts    # 금융위원회 보험상품 공시 API client
  insurance-types.ts  # 금융위원회 보험상품 공시 TypeScript interfaces
  g2b-api.ts          # 조달청 나라장터 G2B API client
  g2b-types.ts        # 조달청 G2B TypeScript interfaces
  youtube-api.ts      # YouTube Data API v3 + yt-dlp 자막 추출
  youtube-types.ts    # YouTube TypeScript interfaces
  courtlistener-api.ts    # CourtListener REST v4 (미국 판례) — cursor 페이지네이션
  courtlistener-types.ts  # CourtListener 정규화 도메인 타입
  openlegaldata-api.ts    # OpenLegalData (독일 판례) — search/detail
  openlegaldata-types.ts  # OpenLegalData TypeScript interfaces
  tourism-api.ts          # 한국관광공사 KorService2 API client
  tourism-types.ts        # 한국관광공사 KorService2 TypeScript interfaces
  coupang-api.ts          # 쿠팡 파트너스 API client
  coupang-types.ts        # 쿠팡 파트너스 TypeScript interfaces
  routes/             # 도메인별 REST 라우트
  openapi/            # 도메인별 OpenAPI path 생성기
  tools/
    skills/           # ★ 17개 의도 기반 스킬 도구 + MCP Prompts (v6)
      index.ts        # 스킬 오케스트레이터 — 전체 등록
      _shared.ts      # createDispatcher, requireParam, registerSkillTool 공통 유틸
      prompts.ts      # MCP Prompts 워크플로 가이드 (5 prompts)
      legal-research.ts      # 법령 리서치 (17 actions)
      case-research.ts       # 판례/해석례 리서치 (10 actions)
      law-amendment.ts       # 법령 비교/개정 (9 actions)
      import-clearance.ts    # 수입통관 (20 actions, MAFRA 포함)
      export-clearance.ts    # 수출통관 (6 actions)
      shipping-logistics.ts  # 선적/물류 (9 actions)
      tariff-lookup.ts       # 관세/HS코드/환율 (9 actions, EXIM 포함)
      trade-entity.ts        # 무역업체 (11 actions)
      corporate-disclosure.ts # 기업공시 (7 actions, DART + 배당)
      public-data.ts         # 공공데이터포털 (11 actions)
      financial-product.ts   # 금융상품 비교공시 (7 actions)
      insurance.ts           # 보험상품 공시 (9 actions)
      procurement.ts         # 조달청 나라장터 입찰/낙찰 (2 actions)
      youtube.ts             # YouTube 자막/메타데이터/검색/댓글 (5 actions)
      foreign-case-research.ts # 해외 판례 (4 actions, US cursor + DE page 페이지네이션)
      tourism.ts             # 한국관광공사 KorService2 (7 actions)
      product-review.ts      # 제품 리뷰 (3 actions, youtube.md 동적 채널)
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
                 tourism-api.ts, coupang-api.ts)
                |
    Shared (shared.ts, tools/skills/_shared.ts)
    +  Types (law-types.ts, dart-types.ts, data20-types.ts,
             unipass-types.ts, exim-types.ts, mafra-types.ts,
             finlife-types.ts, insurance-types.ts,
             g2b-types.ts, youtube-types.ts,
             courtlistener-types.ts, openlegaldata-types.ts,
             tourism-types.ts, coupang-types.ts)
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
| `COUPANG_ACCESS_KEY` | No | 쿠팡 파트너스 Access Key (없으면 쿠팡 상품 검색 비활성화) |
| `COUPANG_SECRET_KEY` | No | 쿠팡 파트너스 Secret Key |
| `PORT` | No | HTTP server port (default: 3000) |

## Conventions

- Korean comments for domain-specific logic
- MCP 스킬 도구: 17개 의도 기반 도구 (v6), 각 도구는 `action` enum으로 세부 동작 선택 (해외 판례 `foreign_case_research`, 관광 `tourism`, 제품리뷰 `product_review` 포함)
- 스킬 도구 등록: `server.tool()` 직접 호출 대신 `registerSkillTool()` (`tools/skills/_shared.ts`) 래퍼 사용 — `outputSchema`·`ToolAnnotations`·`structuredContent` 공통 적용
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

---

## Behavioral Guidelines

See [docs/dev-guidelines.md](docs/dev-guidelines.md).

## 세션 시작 시 Handoff 강제

세션을 시작할 때 `.claude-project/HANDOFF.md` 파일이 있는지 먼저 확인한다.
- 존재하면 다른 어떤 작업보다 먼저 **반드시 전체를 읽고 인수인계 컨텍스트를 파악한 뒤 시작**한다.
- 파일이 없으면 정상 진행한다.

이 규칙은 이전 세션의 미완료 작업·결정 사항·주의사항을 놓치지 않기 위한 강제 사항이다.

**이 프로젝트의 handoff 위치**: `.claude-project/HANDOFF.md`
