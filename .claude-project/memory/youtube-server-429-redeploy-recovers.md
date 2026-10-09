---
name: youtube-server-429-redeploy-recovers
description: 서버 자막 RATE_LIMITED 는 로컬 재현 불가 — 오래 재배포 안 한 컨테이너는 재배포만으로 복구된 사례 2번(09-20·10-09)
type: project
created: 2026-10-09
---

2026-10-09 운영 `get_transcript` 가 한·영 영상 모두 `RATE_LIMITED`(429). 같은 영상·같은 인자로 로컬 맥은 정상. 직전 성공 배포는 09-28 이었다(LaunchAgent `SYNC_SKIP_REDEPLOY=1` 이라 쿠키 env 는 매일 갱신돼도 컨테이너는 그대로).
429 캐스케이드 수정(`1cbb608`) push → Railway 자동 재배포 뒤 두 영상 모두 1순위 `android_vr` 에서 바로 성공(로그에 `yt-dlp 시도 실패` 0줄) — 즉 이번 복구는 코드 경로가 아니라 **재배포(새 컨테이너·최신 쿠키 env, 출구 IP 바뀜 여부 미확인)** 덕이다. 09-20 도 쿠키 재추출+배포로 복구됐다.

**Why:** 429 는 서버 출구 상태라 로컬 A/B 로는 판별이 안 된다. 브레이커가 열리면 다음 호출은 `BOT_DETECTED` 로 보여 원인을 둘로 오인하기 쉽다.
**How to apply:** 서버 자막이 429 로 막히면 ① `/health/youtube` 의 `circuitBreaker`·마지막 배포일 확인 ② 오래됐으면 `railway redeploy`(배포 허락 필요) ③ 재배포 뒤에도 막히면 Railway 로그 `yt-dlp 시도 실패` 의 클라이언트별 원문으로 다음 수를 정한다.
