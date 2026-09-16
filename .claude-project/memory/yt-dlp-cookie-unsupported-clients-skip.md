---
name: yt-dlp-cookie-unsupported-clients-skip
description: yt-dlp는 쿠키 미지원 player_client에 --cookies가 붙으면 그 클라이언트 시도를 통째로 스킵한다 (android_vr/android/ios)
type: reference
created: 2026-09-16
---

`--cookies` 또는 `--cookies-from-browser`가 쿠키를 지원하지 않는 `player_client`와 함께 오면
yt-dlp는 그 클라이언트로 **시도조차 하지 않고** 다음 경고만 남기고 넘어간다.

```
Skipping client "android_vr" since it does not support cookies
```

쿠키 미지원 클라이언트: `android_vr`, `android`, `ios`
(`src/youtube-api.ts`의 `COOKIE_UNSUPPORTED_CLIENTS`).

**Why:** 서버가 캐스케이드의 모든 클라이언트에 일괄로 쿠키를 넘기고 있어, 1순위 `android_vr`가
프로덕션에서 **한 번도 실행되지 않았다**. 캐스케이드는 실제로 2순위부터 시작하고 있었고,
로그에는 실패가 아니라 스킵 경고만 남아 장기간 드러나지 않았다. 수정 커밋 584f29d.

**How to apply:**
- 쿠키 인자는 클라이언트별로 조건부 전달 — `COOKIE_UNSUPPORTED_CLIENTS.has(playerClient)`면 빼고 호출
- 캐스케이드에 클라이언트를 추가할 때 쿠키 지원 여부를 먼저 확인하고 이 Set을 갱신
- 자막 실패 진단 시 stderr의 `Skipping client` 경고를 먼저 확인 — 이 줄이 보이면 그 순위는 무효
- 관련: [[youtube-yt-dlp-client-selection]], [[yt-dlp-stderr-429-false-positive]]
