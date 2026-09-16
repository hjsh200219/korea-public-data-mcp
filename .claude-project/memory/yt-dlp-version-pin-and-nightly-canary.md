---
name: yt-dlp-version-pin-and-nightly-canary
description: Dockerfile yt-dlp 버전 고정(2026.08.19 — 임베드 경로 하한) + CI nightly canary로 업스트림 변경 감지
type: project
created: 2026-05-03
updated: 2026-09-16
---

`Dockerfile`에서 yt-dlp를 특정 릴리즈로 고정:
```
curl -L https://github.com/yt-dlp/yt-dlp/releases/download/2026.08.19/yt-dlp
```

CI `.github/workflows/ci.yml`의 `nightly-canary` job이 매일 UTC 00:00에 `npm run canary:ytdlp` 실행 (`continue-on-error: true` — 실패해도 main CI 차단 안 함).
`scripts/canary-ytdlp.ts`: yt-dlp 버전 확인 + 프로브 영상 자막 추출 → JSON 결과 + exit 0/1.

**핀 이력**: 2026.03.17 → 2026.06.09 → **2026.08.19** (2026-09-16, 커밋 70f5a58).
마지막 갱신 사유는 canary 실패가 아니라 기능 요구 — `tv_embedded`/`web_embedded` 임베드 자막 경로가
2026.08.19 이상에서만 동작한다(2026.06.09은 자막 0건).

**Why:** yt-dlp `latest`는 배포 시마다 버전이 달라져 비결정적 실패 유발. 버전 고정으로 배포 안정성 보장, canary로 업스트림 정책 변경 조기 감지.

**How to apply:** canary 실패 시 → `Dockerfile`의 핀을 최신 버전으로 업데이트 후 재빌드. 버전 업 전 로컬에서 canary 수동 확인 권장.
버전을 내릴 때는 임베드 경로 자막 추출을 먼저 확인할 것 — 하한이 2026.08.19다.
