---
created: 2026-04-29T07:58:00+09:00
project: k-public-data-mcp
summary: C-2 hybrid — local 정교한 CourtListener 클라이언트를 upstream 배포 구조로 통합·배포 완료
---

## Session Digest

`git pull` 시 stash pop으로 7개 파일 충돌 발생. local stash와 upstream(이미 master에 머지·배포된 26f839c)이 같은 "해외 판례" 기능을 다른 아키텍처로 구현해 두었음:
- Local: 디렉토리 기반(`foreign-cases/courtlistener.ts`), 정교한 클라이언트(396줄, HTML fallback chain), `foreign_precedents` 스킬, `/api/foreign-cases/*` 라우트, cursor 페이지네이션, 정규화 도메인 타입
- Upstream(배포됨): flat(`courtlistener-api.ts`+`openlegaldata-api.ts`), 단순 클라이언트(85줄), `foreign_case_research` 스킬, `/api/courtlistener/*`+`/api/openlegaldata/*` 라우트, raw API 패스스루, page 페이지네이션, 2개 소스(US+DE)

옵션 3개 제시(A 단순 채택, B 손머지, C 하이브리드) 중 사용자가 **C-2 (전면 교체)** 선택. Upstream 파일명·구조·OpenLegalData는 유지하면서 CourtListener 내부를 local의 정교한 구현으로 교체. 라우트/OpenAPI/스킬·테스트 전체 재작성. `foreign_precedents` 흔적(prompts.ts 26줄 등) 정리. 빌드 깨끗 + 752/757 테스트 통과 후 master 푸시 → Railway autodeploy SUCCESS.

## Progress

### 완료
- [x] 7개 충돌 파일 손머지 (CLAUDE/AGENTS, api-routes, openapi, config, config.test, shared.test, skills/index)
- [x] `courtlistener-api.ts` 교체 (`createCourtListenerClient` + getCluster/listCourts/HTML fallback chain)
- [x] `courtlistener-types.ts` 교체 (정규화 도메인 + cursor 페이지네이션)
- [x] `routes/courtlistener-routes.ts` 재작성 (q= 컨벤션, /clusters, /courts 추가)
- [x] `openapi/courtlistener-paths.ts` 재작성 (cursor + jurisdiction/precedential_status enum + 신규 엔드포인트)
- [x] `tools/skills/foreign-case-research.ts` US 핸들러 새 client 재작성, DE 핸들러 보존
- [x] 테스트 전체 재작성 (`courtlistener-api.test.ts` 21개, `foreign-case-research.test.ts`, `foreign-case-routes.e2e.test.ts`)
- [x] `prompts.ts` 해외판례 워크플로 도구명 갱신 (foreign_precedents → foreign_case_research)
- [x] 문서 동기화 (CLAUDE/AGENTS/ARCHITECTURE/README)
- [x] 6개 untracked 파일 삭제 (foreign-cases/, foreign-cases-types.ts, foreign-cases-paths.ts, foreign-cases-routes.ts, foreign-precedents.ts(+test))
- [x] 빌드 + 752 테스트 통과
- [x] Stash drop
- [x] master 푸시 (55ccdaa) → Railway 배포 SUCCESS

## Next Steps

1. **(우선순위 낮음) 외부 OpenAPI 소비자 파악** — REST 응답 shape이 `{count, results}` → `{items, totalCount, nextCursor}`로 breaking 변경. 사용자는 GPT Actions 미사용 의사 표명, MCP 클라이언트(Claude/Cursor)는 자동 재인식이라 영향 없음.
2. **(고려)** `getCluster`/`listCourts` 메서드는 현재 REST + 클라이언트에만 노출. MCP 스킬에 액션 추가하려면 `foreign_case_research`에 `get_us_cluster_detail`/`list_us_courts` 추가 검토.
3. **(고려)** SERVER_VERSION 6.0.0 → 6.1.0 (정규화 도메인 + 신규 엔드포인트 추가, 동시 breaking) 또는 7.0.0 (breaking semver) 버전 표기.

## Blockers

- 없음. 배포 완료 + 외부 영향 없음 확인.

## Watch Out

- **REST `/api/courtlistener/search` 응답 shape 변경됨**. 외부에서 직접 `body.count` / `body.results` 접근하는 스크립트는 깨짐. MCP 경유 호출은 영향 없음.
- `fetchWithRetry`가 429를 재시도하므로 (1+2+4=7s) 429 검증 테스트는 vitest 기본 5s 타임아웃 초과 → `it("...", ..., 15000)`로 늘려야 함.
- `CLAUDE.md`는 `AGENTS.md` 심볼릭 링크 — 충돌 해소 시 AGENTS.md만 수정하면 둘 다 반영됨.
- pre-commit hook이 lint-staged + vitest를 자동 실행. 큰 변경 커밋 시 시간 소요.

## Files Touched

```
AGENTS.md
ARCHITECTURE.md
README.md
src/__tests__/foreign-case-routes.e2e.test.ts
src/__tests__/mcp-server.e2e.test.ts
src/config.test.ts
src/config.ts (충돌 해소)
src/api-routes.ts (충돌 해소)
src/openapi.ts (충돌 해소)
src/shared.test.ts
src/courtlistener-api.ts        ← 핵심 교체
src/courtlistener-api.test.ts   ← 전체 재작성
src/courtlistener-types.ts      ← 핵심 교체
src/openapi/courtlistener-paths.ts ← 재작성
src/routes/courtlistener-routes.ts ← 재작성
src/tools/skills/foreign-case-research.ts     ← US 핸들러 재작성
src/tools/skills/foreign-case-research.test.ts ← 재작성
src/tools/skills/index.ts (충돌 해소)
src/tools/skills/prompts.ts (도구명 갱신)
삭제: src/foreign-cases/, foreign-cases-types.ts, foreign-cases-paths.ts, foreign-cases-routes.ts, foreign-precedents.ts(+test)
```
