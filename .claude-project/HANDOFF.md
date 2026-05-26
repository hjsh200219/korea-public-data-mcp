---
created: 2026-05-26T19:30:00+09:00
project: k-public-data-mcp
summary: 국회 Open API 24 dataset 통합 — assembly 스킬 신설, contract test 24/24 GREEN, master push
---

## Session Digest
국회 Open API (open.assembly.go.kr) 24개 dataset을 단일 스킬 도구 `assembly`로 통합. 의안/법률안/회의록/표결/일정/의원 6개 카테고리, 24 action을 `action` enum으로 노출. 실 API contract test 24/24 GREEN, 전체 993/1022 (29 skipped — contract gating). Commit `e7ab21e` master push 완료.

## Progress
- [x] 24 action assembly 스킬 신설 (`src/tools/skills/assembly.ts`)
- [x] `assembly-api.ts` + `assembly-types.ts` 도메인 레이어 (generic fetchAssembly + 24 wrappers + 15 row types)
- [x] Real-API contract test (24/24 GREEN with ASSEMBLY_API_KEY)
- [x] 단위 테스트 74/74 GREEN
- [x] Architect APPROVED (2 iterations — vote_by_bill schema fix + AssemblyEnvelope knip)
- [x] 7 gates green (typecheck/lint/knip/verify-docs/harness-meta/build/test)
- [x] `src/config.ts` ASSEMBLY_API_KEY 환경변수 + warn
- [x] `src/tools/skills/index.ts` registerAssembly 조건 등록 (17→18 skills)
- [x] `verify-docs.ts` EXPECTED counts (skills 17→18, apis 14→15, types 14→15)
- [x] `ARCHITECTURE.md` / `docs/source-map.md` / `docs/env.md` 동기화 (148 actions)
- [x] AGENTS.md: 17→18 + contract test convention 추가
- [x] Memory 5건 신규 저장
- [x] Commit `e7ab21e` push 완료

## Next Steps
1. **Railway 환경변수 추가** — `ASSEMBLY_API_KEY=1b173892dd7a48b5a926b347fe3565de` 등록 후 production 재배포, MCP stdio E2E 검증
2. **v3 dataset 발굴** — 277 dataset 중 ~150 미해결 (회의록 detail, 상임위 분석/검토보고서, NABO/NARS 발간물, 청문회 회의록). [[assembly-api-dataset-id-discovery]] 패턴 따라 Playwright 자동화 스크립트 작성
3. **REST/OpenAPI surface** — `src/routes/assembly-routes.ts` + `src/openapi/assembly-paths.ts` 추가 (verify-docs routeDomainFiles 11→12, openapiPathModules 11→12)
4. **harvest:assembly-catalog 스크립트** — `selectInfsOpenApiListPaging.do` + Playwright batch 자동화 (rate-limit safety + dry-run)
5. **Smithery 마켓플레이스 + awesome-mcp-servers PR 상태 확인** (이전 세션 미완)
6. **HIRA 동물병원 Q0/Q1 매핑** — 이전 세션 누적

## Blockers
없음.

## Watch Out
- **bill_search/bill_search_extended에 AGE 필수** — 스킬에서 `defaultAge: 22` 자동 적용. 다른 대수 조회 시 명시. [[assembly-api-required-params]]
- **Contract test는 ASSEMBLY_API_KEY 없으면 skip** — CI baseline (993 passed)이 실 API 검증 의미 아님. Railway secrets 등록 시 활성화.
- **vote_by_bill (ncocpgfiaoituanbr) schema** — vote count 필드 (MEMBER_TCNT/YES_TCNT/NO_TCNT/BLANK_TCNT). BillSearchRow 재사용 금지 — 별도 `VoteByBillRow` 사용.
- **Velog/티스토리 dataset 라벨 신뢰 금지** — `nwbpacrgavhjryiph` velog="결산" but 실제="법률안 처리현황(위원회별)". 항상 live row schema로 검증. [[community-catalog-verify-via-live-api]]
- **verify-docs EXPECTED 카운트** — 파일 추가/제거 시 `npm run verify-docs`로 동기화 필수.
- **HIRA 지역 매핑 자동 생성 파일** (`src/hira-region-codes.ts`) 직접 수정 금지 — `scripts/harvest-hira-region-codes.ts` 재실행.

## Files Touched
- src/assembly-types.ts (신규, 15 row 타입)
- src/assembly-api.ts (신규, generic + 24 wrappers)
- src/tools/skills/assembly.ts (신규, 24 action 디스패처)
- src/assembly-api.test.ts (신규, 24 unit)
- src/tools/skills/assembly.test.ts (신규, 50 skill test)
- src/assembly-api.contract.test.ts (신규, 24 real API)
- src/config.ts (assemblyApiKey 필드)
- src/tools/skills/index.ts (registerAssembly 등록)
- scripts/verify-docs.ts (EXPECTED 갱신)
- ARCHITECTURE.md, docs/env.md, docs/source-map.md, AGENTS.md
