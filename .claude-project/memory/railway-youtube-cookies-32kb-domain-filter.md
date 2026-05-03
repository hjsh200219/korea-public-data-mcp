---
name: railway-youtube-cookies-32kb-domain-filter
description: YOUTUBE_COOKIES는 .youtube.com 도메인만 필터링 — Railway 32KB 제한 초과 방지
type: reference
created: 2026-05-03
---

Raw 브라우저 쿠키 전체(~553KB)를 Railway에 설정하면 32,768자 제한으로 에러 발생.
`.youtube.com` 도메인만 필터링 시 ~3KB로 99% 감소.

**Why:** `.google.com` 등 다른 도메인 포함 시 Railway 환경변수 제한 초과. YouTube 자막 추출에는 `.youtube.com` 쿠키만 필요.

**How to apply:**
- `scripts/refresh-youtube-cookies.ts`의 `ALLOWED_DOMAINS = [".youtube.com"]` 유지
- 수동 필터링: `grep "\.youtube\.com" /tmp/yt_raw_cookies.txt > /tmp/yt_filtered.txt`
- `.google.com` 추가 금지 — Railway 제한 초과 재발 원인
