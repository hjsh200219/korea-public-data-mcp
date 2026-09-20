# YouTube 자막 추출 Runbook

## 먼저 읽을 것 — 2026-09-20 관측 기록

**서버 자막은 끊겼다가 되살아났습니다. 원인은 확정되지 않았습니다.**

같은 날 시간순 실측:

| 시각(KST) | 사건 |
|---|---|
| ~08:30 | 마지막 성공(`lastSuccess`) |
| 08:47 | `BOT_DETECTED` 연속 3회 · `status=down` |
| 08:53 | 08:21 자 쿠키를 넣고 재배포 → **여전히 차단** |
| 09:49 | 같은 영상이 `RATE_LIMITED` 로 실패. 이때 로컬 맥은 같은 영상·같은 yt-dlp(2026.08.19)·같은 쿠키로 자막 171,557바이트 **정상 추출** |
| 09:56 | 쿠키 재추출 — 23줄 3,055B → **24줄 3,239B 로 바뀜** |
| 10:03 | 배포(새 쿠키 반영) → **정상 복구**. 3개 영상 중 2개 자막 추출 성공 |

### 원인에 대해 말할 수 있는 것과 없는 것

- **말할 수 있는 것**: 09:49 시점에 로컬은 되고 서버는 안 됐다. 08:21 자 쿠키로는 재배포해도
  안 됐고, 09:56 자 새 쿠키 + 배포 뒤에 됐다.
- **말할 수 없는 것**: 그 복구가 **새 쿠키 덕인지**, 그 사이 YouTube 쪽 일시 차단이 **저절로
  풀린 것인지** 가를 데이터가 없다. 두 변화가 같은 창에서 일어났다.
- 따라서 «데이터센터 IP 문제라 쿠키로는 절대 안 풀린다» 는 단정은 **철회합니다**
  (이 문서가 한때 그렇게 적고 있었습니다). 실제로 쿠키 갱신 후 복구됐습니다.

### 증상별 분기

| 보이는 것 | 할 일 |
|---|---|
| 응답에 `[SERVER_TRANSCRIPT_UNAVAILABLE]` | ①`/health/youtube` 로 상태 확인 ②**쿠키를 새로 뽑아 배포**해 본다(2026-09-20 에 이 경로로 복구됨) ③그래도 안 되면 로컬 yt-dlp 로 뽑고, 로컬은 되는지 함께 기록한다 |
| 응답에 `[CONFIG_MISSING]` | 채널 목록 파일이 배포에 없음 — `Dockerfile` 의 `COPY youtube.md ./` 와 `.dockerignore` 의 `!youtube.md` 를 둘 다 확인 |
| `cookiePool[n].warning: expires_soon` | 진짜 쿠키 만료 임박 — 아래 4단계 SOP |
| `COOKIE_EXPIRED` | 진짜 세션 만료 — 아래 4단계 SOP |

> `SERVER_TRANSCRIPT_UNAVAILABLE` 은 «서버에서 못 뽑았다» 는 사실만 말합니다.
> 원인을 IP 로 단정하지 않습니다.

### 실수요 계측 중 (30일)

`/health/youtube` 의 `transcriptCalls30d` 가 자막 계열 호출을 세고 있습니다.
2026-10-20 경 `since` 와 총호출을 보고 판정합니다 — **총호출 ≥ 20건이면** 로컬 수집 구조(A1b)를
만들고, **미만이면** 이 기능을 로컬 전용으로 표시하거나 걷어냅니다. 설계 전문은
`.omc/plans/2026-09-20-youtube-transcript-local-path.md`.

`scripts/sync-youtube-cookies.sh` 는 `SYNC_SKIP_REDEPLOY=1` 로 **재배포만 멈춰** 두었습니다
(LaunchAgent env). env 갱신·인증쿠키 가드·만료 감시는 그대로 돕니다 — 로컬 yt-dlp 가 같은
쿠키를 쓰기 때문입니다.

---

## 4단계 SOP

> 쿠키 만료(`COOKIE_EXPIRED` · `expires_soon`)는 물론, `SERVER_TRANSCRIPT_UNAVAILABLE`
> 이 떴을 때도 먼저 시도해 볼 경로입니다(2026-09-20 에 이 경로로 복구됨).

### 1. 감지
- `/health/youtube` 엔드포인트에서 `cookiePool[n].warning: "expires_soon"` 확인
- 또는 Railway Observability에서 `[YoutubeProbe] YouTube 자막 서비스 연속 3회 실패` 로그 확인

### 2. 실행 (쿠키 갱신)
```bash
npm run refresh:cookies -- --browser chrome
# 출력된 railway 명령어 실행
```

### 3. 검증
- `/health/youtube` 호출하여 `status: "healthy"` + `expiresIn` 갱신 확인

### 4. 장애 시 즉시 대응
```bash
# 서킷 브레이커 비활성화
railway variables set YOUTUBE_CIRCUIT_BREAKER_ENABLED=false

# 쿠키 풀 제거 (단일 쿠키로 폴백)
railway variables unset YOUTUBE_COOKIES_POOL
```

## 환경변수 Kill Switch 목록

| 기능 | 변수 | 비활성값 |
|------|------|---------|
| 서킷 브레이커 | YOUTUBE_CIRCUIT_BREAKER_ENABLED | false |
| 합성 프로브 | YOUTUBE_PROBE_ENABLED | false |
| 쿠키 풀 | YOUTUBE_COOKIES_POOL | 환경변수 삭제 |

## TranscriptError 코드 → 운영 대응

| 코드 | 의미 | 권장 대응 |
|------|------|-----------|
| `RATE_LIMITED` | yt-dlp가 HTTP 429 반환 | 단기 호출 폭주일 수도, 서버 출구에 대한 차단일 수도 있다. 2026-09-20 에는 같은 영상이 아침 `BOT_DETECTED`·오전 `RATE_LIMITED` 였고 쿠키 갱신 뒤 복구됐다. `SERVER_TRANSCRIPT_UNAVAILABLE` 로 분류되며 쿠키 갱신을 먼저 시도한다 |
| `PO_TOKEN_REQUIRED` | YouTube 봇 차단 정책(PO Token) — 영상에 자막은 있으나 yt-dlp 우회 불가 | 영상 단위 이슈, 즉시 조치 불필요 / 반복되면 yt-dlp 업데이트 검토 |
| `COOKIE_EXPIRED` | 로그인/세션 만료 (yt-dlp가 sign in / cookie 메시지 반환, 봇 챌린지 문구는 제외) | `scripts/sync-youtube-cookies.sh`(인증 쿠키가 바뀌면 재배포·헬스 확인까지 자동). 수동으로 `npm run refresh:cookies`만 돌렸다면 **재배포 필수** — env만 갱신하면 실행 중 컨테이너에 반영되지 않는다 |
| `BOT_DETECTED` | 봇 챌린지(`Sign in to confirm you're not a bot`) · DRM · 사유 미상 차단 | 2026-09-20 에 몇 시간 지속됐고 **쿠키 재추출 + 배포로 복구**됐다. 먼저 쿠키를 갱신해 보고, 그래도 안 되면 로컬 결과와 대조해 기록한다. `SERVER_TRANSCRIPT_UNAVAILABLE` 로 분류된다 |
| `REGION_BLOCKED` | 영상이 특정 지역에서만 시청 가능 | 영상 단위 이슈, 조치 불필요 |
| `NO_SUBTITLES` | 영상에 자막이 실제로 없음 | 영상 단위 이슈, 조치 불필요 |

위 6개 코드(NO_SUBTITLES 제외)는 모두 서킷 브레이커 INFRA_ERRORS에 포함되어 연속 7회 시 60초간 차단.

## 클라이언트 캐스케이드 순서 (yt-dlp player_client)

| 환경 | 캐스케이드 |
|------|-----------|
| 쿠키 있음 (production) | `android_vr` → `tv_embedded` → `web_embedded` → `tv` → `web` |
| 쿠키 없음 (local stdio) | `android_vr` → `android` |

`android_vr`는 자막 PO Token 미요구 + 쿠키 없이 동작이라 1순위. 단 "made for kids" 영상은 거부되므로 fallback 유지.

**`android_vr`/`android`/`ios`에는 쿠키 인자를 넘기지 않는다**(`COOKIE_UNSUPPORTED_CLIENTS`).
넘기면 yt-dlp가 `Skipping client "android_vr" since it does not support cookies` 경고와 함께
시도를 통째로 건너뛰어 1순위가 무력화된다. 2026-09-16 장애의 원인이며, 이때 스킵 경고의
"cookies" 문자열이 `COOKIE_EXPIRED`로 오분류돼 "쿠키를 갱신하라"는 오안내까지 나왔다
(쿠키는 정상이었다). 쿠키는 임베드/`tv`/`web` 클라이언트에만 전달된다.

`tv_embedded`/`web_embedded`는 **쿠키를 받으면서 PO Token 없이 자막을 주는 유일한 경로**라
데이터센터 IP에서 마지막 보루다. 2026-09-16 라이브 로그 기준 Railway에서
`android_vr`=봇 차단(`Sign in to confirm you're not a bot`), `tv`=`The page needs to be reloaded.`,
`web`=PO Token으로 전멸했고 임베드 경로만 살아남았다. 단 **yt-dlp 2026.08.19 이상 필요** —
2026.06.09에서는 임베드 두 클라이언트 모두 자막 0건(실측).

### 알려진 한계
- 동일 영상에 대해 여러 언어 자막을 한 호출에 요청(`FALLBACK_LANGS` 8개 + 요청 언어)하면
  연속 timedtext API 호출이 발생하여 **`RATE_LIMITED`(HTTP 429) 빈도 증가** 가능.
  운영 중 PO_TOKEN_REQUIRED/RATE_LIMITED가 잦으면 `FALLBACK_LANGS` 좁히기 또는
  per-언어 분할 호출을 검토 (현재는 미구현 — 후속 PRD).
