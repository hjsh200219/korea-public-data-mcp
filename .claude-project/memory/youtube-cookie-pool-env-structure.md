---
name: youtube-cookie-pool-env-structure
description: YOUTUBE_COOKIES_POOL은 JSON 배열 문자열, round-robin + 5분 recovery
type: project
created: 2026-05-03
---

`YOUTUBE_COOKIES_POOL` 환경변수: Netscape 쿠키 문자열의 JSON 배열(`string[]`).
`YoutubeCookiePool`이 round-robin으로 순환, 실패한 쿠키는 5분 cooldown 후 복구.
단일 `YOUTUBE_COOKIES` 환경변수는 폴백으로 유지 (미설정 시 자동 래핑).

우선순위: `YOUTUBE_COOKIES_FROM_BROWSER` > `YOUTUBE_COOKIES_POOL` > `YOUTUBE_COOKIES`

구현: `src/youtube-cookie-pool.ts` — `YoutubeCookiePool`, `youtubeCookiePool` 싱글톤.
만료 파싱: Netscape 5번째 필드(Unix timestamp), 7일 이내 `expires_soon` 경고.
Railway 32KB 제한: 쿠키 2개 JSON ~12-20KB → 32KB 이내 가능.

**Why:** 단일 쿠키 만료 = 전체 자막 서비스 중단(SPOF). 풀로 만료 기반 SPOF 완화.

**How to apply:** `YOUTUBE_COOKIES_POOL` 삭제 시 기존 `YOUTUBE_COOKIES` 단일 쿠키로 자동 폴백. 기존 배포 호환 유지.
