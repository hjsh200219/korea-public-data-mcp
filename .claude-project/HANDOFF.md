---
created: 2026-04-28T13:58:00+09:00
project: k-public-data-mcp
summary: 해외 판례 (CourtListener+OpenLegalData) 통합 구현·배포·Live 검증 완료
---

## Session Digest

해외 판례 통합 (CourtListener + OpenLegalData) RALPLAN→TDD→배포 완주. Planner/Architect/Critic 2-라운드 합의 후 Red→Green→Refactor로 7 user stories 구현, Live e2e 5/5 통과. Architect 사후 검증 APPROVED, Deslop로 미사용 심볼 제거, 26f839c 푸시 후 Railway 환경변수 3건 세팅·redeploy SUCCESS, 배포 환경 4 endpoints 정상 확인. offset 페이지네이션(`truncateWindow`)도 추가하여 8000자 윈도우 단위 후속 조회 지원.

## Progress

### 완료
- [x] RALPLAN 합의 (Planner→Architect→Critic, 2 iterations: ITERATE→APPROVED)
- [x] CourtListener (미국) API 클라이언트 + types + routes + OpenAPI paths
- [x] OpenLegalData (독일) API 클라이언트 + types + routes + OpenAPI paths
- [x] 통합 스킬 도구 `foreign_case_research` (4 actions, case_research와 분리)
- [x] TDD: Red→Green→Refactor 7 user stories
- [x] Live e2e 5/5 통과 (`RUN_LIVE_TESTS=1`)
- [x] offset 페이지네이션 (`truncateWindow` shared util)
- [x] Architect 사후 검증 APPROVED
- [x] Deslop pass — 미사용 `listUSCourts` / `USCourtListResult` / `USCourtSummary` 제거
- [x] AGENTS.md 동기화
- [x] 커밋 26f839c → master 푸시
- [x] Railway 환경변수 3건 추가 (`COURTLISTENER_API_TOKEN`, `OPENLEGALDATA_API_TOKEN`, `FOREIGN_CASE_ENABLED=true`)
- [x] Railway redeploy SUCCESS
- [x] 배포 환경 4 endpoints 검증 정상

### 미완료 (선택)
- [ ] EU 사법재판소 / 영국 / 일본 판례 추가
- [ ] 헌재요약(Leitsatz/headnote) 자동 추출
- [ ] 응답 캐시 레이어
- [ ] per-source throttle 격리 (v2)
- [ ] 분기별 OpenLegalData 헬스체크 런북
- [ ] `X-RateLimit-Remaining` 헤더 노출
- [ ] MCP Prompt 워크플로 가이드 (해외 판례 시나리오)
- [ ] 한국↔해외 판례 인용 상호참조

## Next Steps

1. MCP Prompt 워크플로 가이드 추가 — 기존 5 prompts 패턴 따라 해외 판례 시나리오 1건 신설 (`src/tools/skills/prompts.ts`).
2. 응답 캐시 레이어 — CourtListener/OpenLegalData 검색 응답 단기 메모리 캐시(쿼리+offset 키, TTL 5–10분)로 rate-limit 부담 완화.
3. per-source throttle 격리 — 현재 공통 throttle을 source별 큐로 분리해 한쪽 장애가 다른쪽 지연 유발하지 않도록.
4. `X-RateLimit-Remaining` 노출 — 클라이언트 백오프 의사결정 지원.
5. 한국↔해외 판례 인용 상호참조 — case_research 결과에서 인용 패턴 추출 후 foreign_case_research로 연결.
6. EU/UK/JP 판례 소스 추가 — 우선순위는 사용자 수요 확인 후 결정.
7. 분기별 OpenLegalData 헬스체크 런북 작성.
8. Leitsatz/headnote 자동 추출 (OpenLegalData 응답 후처리).

## Blockers
없음.

## Watch Out

- **Railway 환경변수**: `FOREIGN_CASE_ENABLED=true` 누락 시 도구가 비활성화되어 404 발생. 신규 deploy/롤백 시 변수 보존 확인 필수.
- **Rate Limits**: CourtListener 인증 시 시간당 5,000건, OpenLegalData 비공식. 캐시 레이어 도입 전까지는 라이브 테스트 시 `RUN_LIVE_TESTS=1` 가드 유지.
- **Live e2e 비결정성**: 외부 API 응답 변동성 — `foreign-case.live.e2e.test.ts`는 RUN_LIVE_TESTS 가드 안에서만 실행되도록 유지. CI 기본 파이프라인 추가 금지.
- **truncateWindow 적용 범위**: 신규 응답 처리 시 8000자 truncation + offset 페이지네이션 일관성 유지. 다른 도메인 도입 시 동일 패턴 사용.
- **Deslop 재발 방지**: foreign_case_research 분리 시 case_research에 leftover 심볼 없는지 다음 세션 시작 시 확인.
- **TDD 필수**: 후속 작업(캐시/스로틀/프롬프트 가이드)도 Red→Green→Refactor 준수.
- **마스터 직접 푸시 + Railway 자동 배포** 컨벤션 유지 (memory 참고).

## Files Touched

이번 세션 주요 파일 (24개, `git diff --stat HEAD~2..HEAD` 기준):

**신규 — 해외 판례 코어**
- src/courtlistener-api.ts
- src/courtlistener-api.test.ts
- src/courtlistener-types.ts
- src/openlegaldata-api.ts
- src/openlegaldata-api.test.ts
- src/openlegaldata-types.ts
- src/routes/courtlistener-routes.ts
- src/routes/openlegaldata-routes.ts
- src/openapi/courtlistener-paths.ts
- src/openapi/openlegaldata-paths.ts

**신규 — 통합 스킬 + 테스트**
- src/tools/skills/foreign-case-research.ts
- src/tools/skills/foreign-case-research.test.ts
- src/__tests__/foreign-case-routes.e2e.test.ts
- src/__tests__/foreign-case.live.e2e.test.ts

**수정 — 통합 지점**
- src/api-routes.ts
- src/openapi.ts
- src/openapi.test.ts (신규)
- src/remote.ts
- src/config.ts
- src/config.test.ts
- src/shared.ts (truncateWindow 추가)
- src/shared.test.ts
- src/tools/skills/case-research.ts (cross-reference)
- src/tools/skills/index.ts (env-gated registration)

**문서/메모리**
- AGENTS.md (CLAUDE.md → AGENTS.md 심볼릭)
- .claude-project/HANDOFF.md (이 파일)
- .claude-project/memory/MEMORY.md
- .claude-project/memory/courtlistener-rest-api-v4-auth.md (신규)
- .claude-project/memory/openlegaldata-de-anonymous-mit.md (신규)
- .claude-project/memory/fetch-mock-convention-vi-stubglobal.md (신규)
- .claude-project/memory/express-5-req-params-string-array.md (신규)
- .claude-project/memory/railway-cli-variables-redeploy-flow.md (신규)
