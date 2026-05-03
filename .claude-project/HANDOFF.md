---
created: 2026-05-03T14:20:00+09:00
project: k-public-data-mcp
summary: product_review 유튜브 리뷰 매칭 개선 + 쿠팡 링크 노출 + 워크플로 프롬프트 추가
---

## Session Digest

`product_review` 스킬의 `find_reviews` 매칭 로직을 개선했다. 기존 title exact match 방식을 토큰 분리 + title/description 동시 탐색(`matchesQuery()`)으로 교체해 부분 검색어에도 영상이 매칭되도록 수정. catch fallback 타입도 description 포함으로 통일. 스킬 title/description에 YouTube 관련 키워드를 강화해 LLM이 `youtube.search` 대신 `product_review`를 선택하도록 유도. `prompts.ts`에 `제품리뷰_워크플로` MCP Prompt를 추가해 `full_review` 우선 + 전체 영상 요약 지시 흐름을 표준화. e2e 테스트 prompt count 6→7 업데이트, description 매칭 테스트 케이스(11번) 추가. 빌드 + 테스트 824개 통과. 커밋: `fd73857`.

## Progress

- **완료**:
  - `matchesQuery()` 토큰 분리 + title/description 동시 탐색 — `fd73857`
  - catch fallback 타입 description 포함 수정 — `fd73857`
  - `product_review` 스킬 title/description YouTube 키워드 강화 — `fd73857`
  - `prompts.ts` `제품리뷰_워크플로` MCP Prompt 추가 — `fd73857`
  - e2e prompt count 6→7 업데이트 — `fd73857`
  - TDD: description 매칭 테스트 케이스 추가 (11번) — `fd73857`
  - 빌드 + 테스트 824개 통과, push 완료

- **미완료 (인계)**:
  - Smithery 마켓플레이스 등록 승인 대기 중
  - `awesome-mcp-servers` GitHub 리포 PR 미제출

## Next Steps

1. Smithery 대시보드에서 등록 승인 상태 확인 → 승인 시 README/CLAUDE.md에 배지·링크 추가
2. `awesome-mcp-servers` GitHub 리포 PR 제출
3. `product_review` 실제 호출 시나리오 QA — LLM이 `youtube.search` 대신 `product_review`를 선택하는지 검증
4. `matchesQuery()` 토큰 기반 매칭 임계값(최소 토큰 매칭 수) 조정 필요 시 검토

## Blockers

- Smithery 마켓플레이스 등록: 외부 심사 대기 (액션 불필요, 확인만)
- Railway `YOUTUBE_COOKIES`: 수동 갱신 필요 — 만료 시 자막 추출 재차 실패

## Watch Out

- **`matchesQuery()` 변경**: title exact match 제거됨 — 토큰 단위 매칭으로 전환. 매우 짧은 쿼리(1글자 등) 오탐 가능성 주의.
- **prompts.ts prompt 수**: 현재 7개. e2e count 단순 숫자 비교 방식이므로 prompt 추가/삭제 시 `mcp-server.e2e.test.ts` count 값 동기화 필요.
- **쿠키 갱신 SOP** (만료 알림 수신 시):
  1. `yt-dlp --cookies-from-browser chrome --cookies /tmp/yt_cookies.txt --skip-download "https://www.youtube.com/watch?v=dQw4w9WgXcQ"`
  2. `.youtube.com` / `.google.com` 라인만 필터링 (~6KB)
  3. `railway variables --set YOUTUBE_COOKIES="$(cat /tmp/yt_filtered.txt)"` 후 재배포
- `YOUTUBE_COOKIES_FROM_BROWSER`(로컬 stdio) vs `YOUTUBE_COOKIES`(Railway 배포) — 별개 변수.
- `youtube.md`가 `product_review` 스킬 채널 소스 — 삭제·이동 시 `find_reviews` 동작 불가.
- `youtube.md` `#` 주석 줄은 `parseYoutubeMdChannels()`가 자동 무시 — 채널 ID가 아닌 `#` 줄 추가 시 파싱 영향 없음.
- `registerSkillTool()` 사용 시 `outputSchema` 자동 주입 → `structuredContent`도 함께 반환됨. 직접 `server.registerTool()` 사용 시 수동 처리 필요.
- smithery.yaml title/description 형식: `"English / 한글"` (영문 우선, ` / ` 구분자 고정).
- 수출입은행 도메인: `oapi.koreaexim.go.kr` 고정. `www.*` 잔재 없는지 grep 권장.
- 쿠키 만료 알림 Remote 루틴: `trig_013jaxkLuRLDkpk71g49tJxB` (매주 월요일 09:00 KST)

## Files Touched

- `src/tools/skills/product-review.ts` — `matchesQuery()` 토큰 분리 + title/description 탐색, 스킬 title/description YouTube 키워드 강화
- `src/tools/skills/prompts.ts` — `제품리뷰_워크플로` MCP Prompt 추가 (prompt 수: 6→7)
- `src/tools/skills/product-review.test.ts` — description 매칭 테스트 케이스 11번 추가
- `src/__tests__/mcp-server.e2e.test.ts` — prompt count 6→7 업데이트
