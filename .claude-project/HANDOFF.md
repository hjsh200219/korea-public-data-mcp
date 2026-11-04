---
created: 2026-10-19T10:00:00+09:00
project: k-public-data-mcp
summary: 법제처·미국 판례 표시 결함 5건 수정(00d6f38) — 자치법규 조문번호·공정위 피심정보·CourtListener opinion ID·국세 판례 안내·도구 설명 · CI·Railway 배포·운영 응답 확인 · 이전 인계(독일 판례 검색·YouTube A1b 판정) 유지
---

## Session Digest

2026-11-04: 법제처·미국 판례 표시 결함 5건 수정(00d6f38). 6자리 자치법규 조문번호를 조·가지번호로 풀고, 공정위 피심정보 중첩 요소를 펴고, CourtListener v4 opinion ID 를 `opinions[0].id` 에서 읽고, 국세법령정보시스템 출처 판례에 상세 미제공을 안내하고, 신구법 상세 필수 인자 설명을 `oldnew_id` 로 고쳤다.

이전 세션(10-19): 열린 일 `kpd-de-search-ignores-query`(10-15 실측) 처리. OpenLegalData `/cases/?search=` 는 검색어를 무시해 무엇을 넣어도 425,130건, `court=bgh` 는 400 이었다. 본문 검색 `/cases/search/?text=` 로 바꾸고 court 코드(연방법원 7곳 대소문자 정규화)·`court_level`(스킬)/`court_level_of_appeal`(REST) 심급 필터, 날짜 `start_date`/`end_date` 로 교체. 검색 결과 타입을 상세 타입과 분리.

이전 세션(10-09): 로컬 kpd 의 쿠팡 검색 등록 게이트 수정(4d478c2), YouTube 429 캐스케이드 수정(1cbb608).

## Progress

- [x] `00d6f38` fix(law) — CI 동일 검사 로컬 통과(typecheck·lint·verify-docs·dead-code·verify-harness-meta·test:coverage 1152·build, 로컬 Node 24·CI Node 22) → master push → CI run 41813865217 success → Railway 재기동(10:24:05Z) → 운영 `/api/detail/ordinance/2039645` 조문번호 1~12, `/api/search/cases` 출처 표시, `/api/courtlistener/search` 20건 id=0 없음 확인
- [x] `a4220a1` fix(foreign-case) — 새 테스트는 고치기 전 코드에서 red 8건 확인 후 green
- [x] CI 동일 검사 로컬 통과(typecheck·lint·verify-docs·dead-code·verify-harness-meta·test:coverage 1144·build), RUN_LIVE_TESTS=1 OpenLegalData 라이브 4건 통과
- [x] master push → CI run 39182988126 success → Railway 재기동(00:56:54Z) → 운영 `/api/openlegaldata/search?q=xqzvwplmnk` 0건, `court=bgh` 60건 확인
- [x] (이전) `4d478c2` 쿠팡 검색 등록 게이트 · `1cbb608` YouTube 429 캐스케이드

## Next Steps

- 10-20 전후 런북 A1b 판정 — 09-27 이후 `get_transcript` 81건(ok 32·fail 49)으로 이미 기준(≥20) 초과. 사용자 결정 필요
- 다시 429 가 나면 Railway 로그 `yt-dlp 시도 실패` 원문으로 쿠키 클라이언트도 429 인지 확인

## Watch Out

- 자치법규 조문번호는 XML 파서가 앞 0을 지우므로 `padStart(6)` 뒤에 나눈다. 운영 표본 자치법규 30건(가지조문 160·장 제목 98·이상값 0)과 공정위 상세 4건(`[object Object]` 없음)으로 확인했다
- OpenLegalData 검색 결과엔 사건번호·ECLI 가 없다 — 상세(`get_de_case_detail`)에서만 나온다
- OpenLegalData 는 모르는 파라미터를 조용히 무시한다(`date_after` 등) — 바꿀 땐 count 변화를 라이브로 잴 것(memory `openlegaldata-search-endpoint`)
- REST `/api/openlegaldata/search` 의 외부 파라미터 이름 `date_after`/`date_before` 는 호환상 유지, 내부에서 `start_date`/`end_date` 로 보낸다
- 운영 Railway 는 YouTube 키가 있어 4d478c2 로 동작이 바뀌지 않는다 — 로컬 stdio(kpd) 경로 전용 수정
- kpd.py 는 git 밖(`~/.agents/skills/k-public-data/scripts/`) — 수정 이력은 이 인계서에만 있다
- `SYNC_SKIP_REDEPLOY=1` 이라 쿠키 env 는 매일 갱신돼도 컨테이너는 배포 때까지 옛 상태

## Files Touched

- src/courtlistener-api.ts · src/courtlistener-api.test.ts · src/law-api.test.ts · src/law-types.ts · src/law/case.ts · src/law/detail.ts · src/tools/skills/case-research.ts · src/tools/skills/law-amendment.ts · src/tools/skills/legal-research.ts
- src/openlegaldata-api.ts · src/openlegaldata-types.ts · src/tools/skills/foreign-case-research.ts · src/routes/openlegaldata-routes.ts · src/openapi/openlegaldata-paths.ts · 테스트 4개 · README.md · skills/korea-public-data/SKILL.md · .claude-project/
