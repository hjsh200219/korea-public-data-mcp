---
created: 2026-09-16T09:50:00+09:00
project: k-public-data-mcp
summary: YouTube get_transcript 전면 실패 — 원인 3겹(쿠키 무관) 진단 후 임베드 캐스케이드 도입·yt-dlp 핀 2026.08.19로 해결, 커밋 6건 배포·라이브 검증 완료
---

## Session Digest

사용자 보고: K-Data MCP `youtube get_transcript`가 "쿠키가 만료되었거나 로그인 인증이 필요합니다"로 전면 실패. 사용자는 쿠키를 동기화한 상태였다. **쿠키는 처음부터 정상이었다** — Railway env 값과 로컬 Chrome 값이 해시 6종(`SID`/`SAPISID`/`LOGIN_INFO`/`__Secure-1PSID`/`__Secure-1PSIDTS`/`__Secure-3PSID`) 모두 일치했고, 그 항아리로 로컬에서 Watch Later(인증 필요) 조회가 성공했다.

원인은 세 겹이었고 전부 쿠키와 무관했다.

1. **yt-dlp가 쿠키를 받으면 해당 클라이언트 시도를 통째로 스킵** — `Skipping client "android_vr" since it does not support cookies`. 서버가 모든 player_client에 쿠키를 일괄로 넘겨서, 쿠키가 설정된 프로덕션에서 1순위 `android_vr`가 **한 번도 실행된 적이 없었다**.
2. **에러 라벨 오염** — `execFile` 에러 메시지 첫 줄의 명령 에코(`Command failed: yt-dlp ... --cookies /tmp/cookies.txt`)에 우리 인자가 그대로 들어 있어, `includes("cookie")` 매칭 때문에 쿠키를 받는 클라이언트의 **모든** 실패가 `COOKIE_EXPIRED`로 둔갑했다. `tv`의 실제 오류는 `The page needs to be reloaded.`였다. "쿠키를 갱신하라"는 오안내의 정체.
3. **2026-09-16 시점 데이터센터 IP 현실** — `android_vr`=봇 차단, `tv`=page needs to be reloaded(최신 stable·nightly에서도 동일), `web`=PO Token. 실측으로 `tv_embedded`/`web_embedded`만 쿠키를 받으면서 PO Token 없이 자막을 반환함을 확인. 단 이 경로는 yt-dlp **2026.08.19 이상**에서만 동작한다(핀 2026.06.09에서는 자막 0건).

## Progress

- [x] 진단 — 쿠키 정상 확인(해시 대조·Watch Later), 컨테이너 핀 버전을 로컬 venv로 재현해 원문 stderr 확보
- [x] 쿠키 인자 분리 (`584f29d`) — `COOKIE_UNSUPPORTED_CLIENTS = {android_vr, android}`에 쿠키 미전달
- [x] 봇 챌린지 분류 분리 (`7a8eaa6`) — `Sign in to confirm you're not a bot`(아포스트로피 변종 포함) → `BOT_DETECTED`, 스킵 경고는 분류 전 제거, runbook 갱신
- [x] AGENTS.md 함정 기록 (`9635f4f`)
- [x] 클라이언트별 실패 로깅 (`2760206`) — `ytLog.warn`에 videoId·client·reason·detail
- [x] 로그 잘림 수정 (`c61e6e2`) — `summarizeYtDlpOutput()`: 명령 에코 버리고 ERROR/WARNING 줄 우선·뒤쪽 보존
- [x] 명령 에코 제외 분류 (`0573ec2`) — `stripCommandEcho()`
- [x] 임베드 캐스케이드 + 핀 갱신 (`70f5a58`) — `android_vr → tv_embedded → web_embedded → tv → web`, Dockerfile yt-dlp `2026.06.09 → 2026.08.19`, `ios`를 쿠키 미지원 목록에 추가
- [x] 검증 — 전체 1107 passed, tsc 빌드 통과, 새 단언은 뮤테이션으로 red 확인, `verify-docs` exit 0
- [x] 배포·라이브 검증 — 배포 `70f5a58` 후 `get_transcript` 연속 2회 성공(`aircAruvnKk` 286세그먼트 / `jNQXAC9IVRw` 6세그먼트), `/health/youtube` healthy·closed·yt-dlp 2026.08.19, 로그상 `android_vr` 봇차단 후 `tv_embedded`가 받아냄

## Next Steps

1. 임베드 경로 건강도 관찰 — 임베드도 YouTube 변경에 취약하다. `/health/youtube` 실패가 반복되면 **클라이언트별 WARN 로그부터** 확인(`railway logs | grep "yt-dlp 시도 실패"`). 서킷 브레이커 임계값은 연속 3회.
2. 쿠키 동기화 LaunchAgent 정상 복귀 확인 — 2026-09-16 08:00 실행이 `could not find chrome cookies database`(그 시점 Chrome 미기동)로 실패했다. 다음 주기(내일 08:00) 성공 여부 확인.
3. yt-dlp 핀 하한 인지 — 이제 **2026.08.19가 하한**이다. 내리려면 임베드 경로 자막 추출을 먼저 확인할 것.

## Blockers

없음 — 배포·검증 완료.

## Watch Out

- **쿠키 미지원 클라이언트에 쿠키를 넘기지 말 것** — `COOKIE_UNSUPPORTED_CLIENTS`(android_vr/android/ios). 넘기면 그 순위가 조용히 스킵돼 프로덕션에서만 전면 실패로 나타난다.
- **에러 분류는 `stripCommandEcho()` 후 stderr만** — 안 하면 우리가 넘긴 `--cookies` 때문에 쿠키 받는 클라이언트의 모든 실패가 COOKIE_EXPIRED로 둔갑한다.
- **실패 로그의 `detail`은 `summarizeYtDlpOutput()`을 거칠 것** — 명령 에코가 길이 제한을 다 먹으면 정작 필요한 ERROR 줄이 잘린다(실제로 한 번 겪었다).
- **봇 챌린지는 쿠키 갱신으로 안 풀린다** — `BOT_DETECTED`. 데이터센터 IP 문제이므로 다른 클라이언트로 우회해야 한다.
- **쿠키 동기화는 재배포까지 해야 반영된다** — `scripts/sync-youtube-cookies.sh`는 `railway variables --skip-deploys`라 env만 갱신하고 실행 중 컨테이너는 옛 쿠키를 그대로 들고 있다.
- **임베드 경로는 yt-dlp 2026.08.19+ 필요** — 2026.06.09에서는 `tv_embedded`/`web_embedded` 모두 자막 0건.

## Files Touched

- `src/youtube-api.ts` — `COOKIE_UNSUPPORTED_CLIENTS`, `stripCommandEcho`, `summarizeYtDlpOutput`, `BOT_CHALLENGE_RE`, `SKIP_CLIENT_WARNING_RE`, 클라이언트별 `ytLog.warn`, 캐스케이드 5단계
- `src/youtube-api.test.ts` — 캐스케이드 순서·쿠키 인자·에러 분류 회귀 테스트 추가/갱신
- `Dockerfile` — yt-dlp 핀 2026.08.19
- `docs/runbook-youtube.md` — 코드표 대응 수정(쿠키 갱신 후 재배포 명시), 임베드 경로 배경
- `AGENTS.md` — 쿠키 인자 금지·캐스케이드·분류 함정·로깅 규약 4항목
- `.claude-project/memory/` — 신규 2건, 갱신 4건
