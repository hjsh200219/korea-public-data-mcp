---
created: 2026-05-03T12:50:00+09:00
project: k-public-data-mcp
summary: 수출입은행 도메인 전환(www→oapi), youtube.md 제품 리뷰 채널 5개 추가 + 카테고리 그룹핑, YOUTUBE_COOKIES Railway 갱신 완료
---

## Session Digest

수출입은행 API 엔드포인트가 2026-04-30부로 `www.koreaexim.go.kr` → `oapi.koreaexim.go.kr`로 전환됨에 따라 `src/exim-api.ts` · `src/exim-types.ts` 수정 (`74fc8fc`). `youtube.md`에 제품 리뷰 채널 5개(주연ZUYONI, HGHLab, EatwithBoki, PONYSyndrome, 화장하는청담언니) 추가 (`73cce29`) 후 `#` 주석으로 5개 카테고리 그룹핑 재정렬 (`e5b7918`). `parseYoutubeMdChannels()`가 `#` 줄을 자동 무시함을 확인. YOUTUBE_COOKIES Railway 갱신 완료. 이전 세션 작업(스킬 i18n 병기 `edaa194`)은 이미 반영됨.

## Progress

- **완료**:
  - 수출입은행 API 도메인 전환 `www` → `oapi` — `74fc8fc`
  - `youtube.md` 제품 리뷰 채널 5개 추가 — `73cce29`
  - `youtube.md` `#` 카테고리 그룹핑 주석 추가 (IT/기술리뷰, 뷰티/패션, 음식/먹방, 라이프스타일, 크리에이티브/편집) — `e5b7918`
  - `smithery.yaml` + 17개 스킬 title/description 영문+한글 병기 — `edaa194` (이전 세션)
  - Railway `YOUTUBE_COOKIES` 환경변수 갱신

- **미완료 (인계)**:
  - Smithery 마켓플레이스 등록 승인 대기 중
  - `awesome-mcp-servers` PR 미제출

## Next Steps

1. Smithery 대시보드에서 등록 승인 상태 확인 → 승인 시 README/CLAUDE.md에 배지·링크 추가
2. `awesome-mcp-servers` GitHub 리포 PR 제출
3. `src/tools/skills/prompts.ts` — `product_review` 워크플로 가이드 프롬프트 추가 검토
4. 쿠키 만료 알림 수신 시 Watch Out 절차 즉시 수행

## Blockers

- Smithery 마켓플레이스 등록: 외부 심사 대기 (액션 불필요, 확인만)
- Railway `YOUTUBE_COOKIES`: 수동 갱신 필요 — 만료 시 자막 추출 재차 실패

## Watch Out

- **수출입은행 도메인**: `oapi.koreaexim.go.kr` 고정. `www.*` 하드코딩 잔재 없는지 전체 grep 권장.
- **쿠키 갱신 SOP** (만료 알림 수신 시):
  1. `yt-dlp --cookies-from-browser chrome --cookies /tmp/yt_cookies.txt --skip-download "https://www.youtube.com/watch?v=dQw4w9WgXcQ"`
  2. `.youtube.com` / `.google.com` 라인만 필터링 (~6KB)
  3. `railway variables --set YOUTUBE_COOKIES="$(cat /tmp/yt_filtered.txt)"` 후 재배포
- `YOUTUBE_COOKIES_FROM_BROWSER`(로컬 stdio) vs `YOUTUBE_COOKIES`(Railway 배포) — 별개 변수.
- `youtube.md` `#` 주석 줄은 `parseYoutubeMdChannels()`가 자동 무시 — 채널 ID가 아닌 `#` 줄 추가 시 파싱 영향 없음.
- `youtube.md`가 `product_review` 스킬 채널 소스 — 삭제·이동 시 `find_reviews` 동작 불가.
- `registerSkillTool()` 사용 시 `outputSchema` 자동 주입 → `structuredContent`도 함께 반환됨. 직접 `server.registerTool()` 사용 시 수동 처리 필요.
- smithery.yaml title/description 형식: `"English / 한글"` (영문 우선, ` / ` 구분자 고정).
- 쿠키 만료 알림 Remote 루틴: `trig_013jaxkLuRLDkpk71g49tJxB` (매주 월요일 09:00 KST)

## Files Touched

- `src/exim-api.ts` — 수출입은행 API Base URL `www` → `oapi`
- `src/exim-types.ts` — 도메인 상수 업데이트
- `youtube.md` — 제품 리뷰 채널 5개 추가 + `#` 카테고리 그룹핑 주석 추가 + 순서 재정렬
