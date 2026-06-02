# Source Map

## 진입점 & 인프라

```
src/
  index.ts        # Stdio entrypoint
  remote.ts       # HTTP entrypoint (Express)
  config.ts       # 환경변수 수집, ServerConfig 로드
  server.ts       # MCP 서버 오케스트레이터 — 스킬 도구 등록
  api-routes.ts   # REST 라우트 오케스트레이터
  openapi.ts      # OpenAPI 스펙 오케스트레이터
  http-client.ts  # 공통 HTTP fetch/retry/throttle
  shared.ts       # truncate, truncateWindow (offset 페이지네이션), errorResponse
  kst-date.ts     # KST 날짜 유틸리티
  logger.ts       # 구조화 로깅
```

## 도메인 API 클라이언트

패턴: `{domain}-api.ts` (클라이언트) + `{domain}-types.ts` (TypeScript interfaces)

| Domain | 설명 |
|--------|------|
| `law` / `law/` | 법제처 (helpers, search, detail, case, amendment + re-export barrel) |
| `dart` | DART 전자공시 |
| `data20` | 공공데이터포털 |
| `unipass` | 관세청 UNI-PASS |
| `exim` | 수출입은행 환율 |
| `mafra` | 농림축산식품부 |
| `finlife` | 금융감독원 금융상품 비교공시 |
| `insurance` | 금융위원회 보험상품 공시 |
| `g2b` | 조달청 나라장터 G2B |
| `youtube` | YouTube Data API v3 + yt-dlp 자막 추출 |
| `courtlistener` | CourtListener REST v4 (미국 판례, cursor 페이지네이션) |
| `openlegaldata` | OpenLegalData (독일 판례) |
| `tourism` | 한국관광공사 KorService2 |
| `coupang` | 쿠팡 파트너스 |
| `assembly` | 국회 Open API (open.assembly.go.kr) — 의안/법률안/표결/의원 |
| `gov24-ai` | 정부24 plus AI 검색(beta, plus.gov.kr) — 민원 RAG SSE 챗봇 |

## 스킬 도구 (tools/skills/)

★ 19개 의도 기반 스킬 도구 + MCP Prompts (v6)

| 파일 | 설명 |
|------|------|
| `index.ts` | 스킬 오케스트레이터 — 전체 등록 |
| `_shared.ts` | createDispatcher, requireParam, registerSkillTool 공통 유틸 |
| `prompts.ts` | MCP Prompts 워크플로 가이드 (5 prompts) |
| `legal-research.ts` | 법령 리서치 (17 actions) |
| `case-research.ts` | 판례/해석례 리서치 (10 actions) |
| `law-amendment.ts` | 법령 비교/개정 (9 actions) |
| `import-clearance.ts` | 수입통관 (20 actions, MAFRA 포함) |
| `export-clearance.ts` | 수출통관 (6 actions) |
| `shipping-logistics.ts` | 선적/물류 (9 actions) |
| `tariff-lookup.ts` | 관세/HS코드/환율 (9 actions, EXIM 포함) |
| `trade-entity.ts` | 무역업체 (11 actions) |
| `corporate-disclosure.ts` | 기업공시 (7 actions, DART + 배당) |
| `public-data.ts` | 공공데이터포털 (11 actions) |
| `financial-product.ts` | 금융상품 비교공시 (7 actions) |
| `insurance.ts` | 보험상품 공시 (9 actions) |
| `procurement.ts` | 조달청 나라장터 입찰/낙찰 (2 actions) |
| `youtube.ts` | YouTube 자막/메타데이터/검색/댓글 (5 actions) |
| `foreign-case-research.ts` | 해외 판례 (4 actions, US cursor + DE page 페이지네이션) |
| `tourism.ts` | 한국관광공사 KorService2 (7 actions) |
| `product-review.ts` | 제품 리뷰 (3 actions, youtube.md 동적 채널) |
| `assembly.ts` | 국회 Open API (24 actions, 의안/법률안/처리안건/표결/회의록/일정/의원) |
| `gov24-ai.ts` | 정부24 plus AI 검색(beta) — 민원 질의응답 (1 action: ask, SSE 파싱) |

## Layer Rules

```
Entrypoint → Protocol (server.ts → tools/skills/index.ts)
                      + HTTP Adapter (api-routes.ts, openapi.ts)
           → Data Access ({domain}-api.ts × 16)
           → Shared (shared.ts, tools/skills/_shared.ts)
           → Types ({domain}-types.ts × 16)
```

- Dependencies flow downward only
- Environment variables only in entrypoints
- Domain-specific types/API in separate files
- MCP 스킬 도구는 `tools/skills/` 디렉토리에 구현

See [docs/design-docs/layer-rules.md](design-docs/layer-rules.md) for full rules.
