---
name: youtube-cookies-railway-refresh-runbook
description: Railway YOUTUBE_COOKIES 갱신 전체 절차 (추출 → 필터 → 주입 → 재배포)
type: reference
created: 2026-05-03
---

Railway 배포에서 YouTube 자막 봇 차단 우회용 쿠키가 만료됐을 때 전체 갱신 절차:

> **자동 경로 우선**: 로컬 `scripts/sync-youtube-cookies.sh` (cron/LaunchAgent 08:00 KST) → `npm run refresh:cookies -- --browser "chrome:Profile 4"` → 필터 → Railway 주입(`--skip-deploys`). 수동 갱신은 자동 경로 실패 시에만.

> **⚠️ 프로필 명시 필수**: `--cookies-from-browser chrome` (프로필 미지정) 사용 금지. yt-dlp가 `Default` 프로필을 읽는데, 이 맥엔 `Default`가 없고 로그인 세션은 **`Profile 4`**에 있음 → 미지정 시 로그아웃 방문자 쿠키(PREF/YSC/VISITOR_INFO1_LIVE 등 8개, ~846B)만 추출되고 인증 쿠키(SID/SAPISID/LOGIN_INFO/`__Secure-1PSID`) 전부 누락 → MCP가 "쿠키 만료/로그인 필요" 반환. (2026-05-30 실제 장애) `refresh-youtube-cookies.ts`의 `findMissingAuthCookies` 가드가 인증쿠키 누락 업로드를 차단함.

```bash
# 1. Chrome에서 쿠키 추출 — 로그인된 프로필 명시 (이 맥: Profile 4)
yt-dlp --cookies-from-browser "chrome:Profile 4" \
  --cookies /tmp/yt-cookies-full.txt \
  --skip-download -o /tmp/dummy \
  -- https://www.youtube.com/watch?v=CPw2Un-_GKw
# 로그인 프로필 확인법: ~/Library/Application Support/Google/Chrome/<Profile>/Cookies 에서
#   LOGIN_INFO/SAPISID(host_key like %youtube.com) 보유한 프로필 찾기

# 2. YouTube/Google 도메인만 필터 (32KB 이내로, 약 6KB)
grep -E "^(#|\.youtube\.com|youtube\.com|\.google\.com|google\.com)" \
  /tmp/yt-cookies-full.txt > /tmp/yt-cookies-filtered.txt

# 3. Railway 환경변수 주입 + 재배포
railway variables --set YOUTUBE_COOKIES="$(cat /tmp/yt-cookies-filtered.txt)"
railway redeploy --yes
```

필터 후 결과: ~24KB (Railway 32,768자 한도 이내 충족). 2026-05-03 실측.
전체 파일은 약 3200줄 / 100KB+ 로 한도 초과.

> 주의: Railway CLI는 `railway variables set`(구 문법)이 아닌 `railway variables --set KEY="VALUE"` 사용.

**Why:** Chrome에서 추출한 raw 쿠키는 전체 브라우저 쿠키를 포함하여 Railway 환경변수 32KB 한도를 초과하고, 다른 서비스 세션 쿠키도 포함되어 보안 위험. YouTube/Google 도메인만 grep 필터링 후 주입 필요.

**How to apply:**
- 자막 추출이 지속 실패(봇 차단/"로그인 필요")할 때 위 절차 실행
- Chrome 로그인 상태 유지 필수 + **로그인된 프로필(`Profile 4`) 명시** (프로필명 변경 시 위 확인법으로 재탐색)
- env 주입 후 **redeploy 필수** — `youtube-cookie-pool.ts`가 시작 시 1회 `process.env` 읽는 싱글톤이라 `--skip-deploys` 갱신은 재배포 전까지 미반영
- 추출 후 인증쿠키 검증: 결과에 LOGIN_INFO/SAPISID/`__Secure-1PSID` 포함 확인 (없으면 로그아웃/잘못된 프로필)
- 로컬 stdio 모드에서는 `YOUTUBE_COOKIES_FROM_BROWSER=chrome` 환경변수로 자동 추출 가능 (Railway 불필요)
- 매주 월요일 09:00 KST에 만료 체크 루틴 자동 실행 (trig_013jaxkLuRLDkpk71g49tJxB) → 만료 14일 이내 시 inter349@gmail.com 알림
