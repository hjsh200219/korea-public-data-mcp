---
name: youtube-cookies-railway-refresh-runbook
description: Railway YOUTUBE_COOKIES 갱신 전체 절차 (추출 → 필터 → 주입 → 재배포)
type: reference
created: 2026-05-03
---

Railway 배포에서 YouTube 자막 봇 차단 우회용 쿠키가 만료됐을 때 전체 갱신 절차:

```bash
# 1. Chrome에서 쿠키 추출
yt-dlp --cookies-from-browser chrome \
  --cookies /tmp/yt-cookies-full.txt \
  --skip-download -o /tmp/dummy \
  -- https://www.youtube.com/watch?v=CPw2Un-_GKw

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
- 자막 추출이 지속 실패(봇 차단)할 때 위 절차 실행
- Chrome 로그인 상태 유지 필수 (쿠키가 유효해야 함)
- 로컬 stdio 모드에서는 `YOUTUBE_COOKIES_FROM_BROWSER=chrome` 환경변수로 자동 추출 가능 (Railway 불필요)
- 매주 월요일 09:00 KST에 만료 체크 루틴 자동 실행 (trig_013jaxkLuRLDkpk71g49tJxB) → 만료 14일 이내 시 inter349@gmail.com 알림
