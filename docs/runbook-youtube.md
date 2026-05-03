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
