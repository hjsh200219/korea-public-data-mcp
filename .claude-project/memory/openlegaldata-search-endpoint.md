---
name: openlegaldata-search-endpoint
description: OpenLegalData 검색은 /cases/search/?text= — /cases/?search= 는 검색어를 무시한다. court 코드는 대소문자 구분, 날짜는 start_date/end_date
type: reference
created: 2026-10-19
---

- `/api/cases/?search=` 는 검색어를 무시하고 전체(425,130건, 2026-10-19)를 돌려준다. `court` 는 숫자 ID 만 받아 `court=bgh` 는 HTTP 400.
- 본문 검색은 `/api/cases/search/?text=` (Lucene 문법). 응답 항목: `court`(코드 문자열 "BGH")·`court_level_of_appeal`·`decision_type`·`snippets[{text(<em> 강조),offset,length}]`·`slug`. `file_number`·`ecli` 는 없다 → 상세 `/api/cases/{id}/`(court 객체·file_number·ecli·content, 옛 형상)에서 본다.
- `court` 필터는 대소문자 구분: `BVerfG` 103건, `BVERFG`·`bverfg` 0건. 연방법원 코드 BAG·BFH·BGH·BPatG·BSG·BVerfG·BVerwG 는 `openlegaldata-api.ts` 의 `FEDERAL_COURT_CODES` 로 정규화한다.
- 날짜 필터는 `start_date`/`end_date`. `date_after`/`date_before` 는 오류 없이 조용히 무시된다(863건 그대로).
- 검색어 없이 `/cases/search/` 를 부르면 400.

**Why:** 옛 경로로 만든 search_de_cases 가 수개월간 어떤 검색어든 같은 결과를 냈다(a4220a1 에서 수정). 조용히 무시되는 파라미터라 400 도 안 나서 테스트로는 안 잡혔다.
**How to apply:** OpenLegalData 파라미터를 바꿀 때는 무의미 검색어(예: xqzvwplmnk)로 0건이 나오는지, 필터를 넣고 count 가 줄어드는지 라이브로 먼저 잰다. 라이브 테스트: `RUN_LIVE_TESTS=1 npx vitest run src/__tests__/foreign-case.live.e2e.test.ts`.
