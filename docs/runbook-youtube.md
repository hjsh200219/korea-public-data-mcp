# YouTube 자막 추출 Runbook

## 4단계 SOP

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
| `RATE_LIMITED` | yt-dlp가 HTTP 429 반환 (단기 호출 폭주) | 쿠키 풀 확장 또는 호출 빈도 조절 |
| `PO_TOKEN_REQUIRED` | YouTube 봇 차단 정책(PO Token) — 영상에 자막은 있으나 yt-dlp 우회 불가 | 영상 단위 이슈, 즉시 조치 불필요 / 반복되면 yt-dlp 업데이트 검토 |
| `COOKIE_EXPIRED` | 로그인/세션 만료 (yt-dlp가 sign in / cookie 메시지 반환) | `npm run refresh:cookies` |
| `BOT_DETECTED` | DRM/봇 감지 등 사유 미상 차단 | 일시적이면 무시, 반복 시 쿠키 갱신 |
| `REGION_BLOCKED` | 영상이 특정 지역에서만 시청 가능 | 영상 단위 이슈, 조치 불필요 |
| `NO_SUBTITLES` | 영상에 자막이 실제로 없음 | 영상 단위 이슈, 조치 불필요 |

위 6개 코드(NO_SUBTITLES 제외)는 모두 서킷 브레이커 INFRA_ERRORS에 포함되어 연속 7회 시 60초간 차단.
