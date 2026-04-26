---
name: youtube-yt-dlp-client-selection
description: yt-dlp YouTube 다운로드 시 쿠키 유무에 따른 클라이언트 선택 전략
type: reference
created: 2026-04-26
---

yt-dlp의 YouTube extractor 클라이언트는 쿠키 지원 여부가 다름:

- **쿠키 있음** → `--extractor-args youtube:player_client=web` (쿠키 인증 활용)
- **쿠키 없음** → `--extractor-args youtube:player_client=android` (PO Token 우회)

`android` 클라이언트는 cookies 옵션이 무시되며 `Skipping client "android" since it does not support cookies` 경고가 뜸.

**Why:** android는 PO Token 없이 자막 가져올 수 있지만 쿠키를 못 씀. web은 PO Token 요구되지만 쿠키로 인증하면 통과. 둘의 장점을 조건부로 활용해야 함.

**How to apply:** YOUTUBE_COOKIES 환경변수 존재 여부로 분기. `src/youtube-api.ts`의 `playerClient` 결정 로직 참고.
