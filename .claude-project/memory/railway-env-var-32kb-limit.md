---
name: railway-env-var-32kb-limit
description: Railway 환경변수당 하드 리밋 32,768바이트
type: reference
created: 2026-04-27
---

Railway는 환경변수 값 1개당 **32,768 바이트 (32KB)** 가 하드 리밋이다. CLI 또는 대시보드에서 초과 시 다음 에러로 거부된다:

```
Variable 'YOUTUBE_COOKIES' value exceeds maximum length of 32768
```

**Why:** 2026-04-27 세션에서 raw cookies.txt(104KB)를 `railway variables --set-from-stdin YOUTUBE_COOKIES`로 주입하다 차단됨. Railway CLI v4.35.0 기준.

**How to apply:**
- 대용량 텍스트 페이로드(쿠키 dump, 인증서, 큰 JSON config)를 env에 넣지 말 것
- 32KB 근접하는 값은 사전 필터/압축 검토 (gzip+base64는 ~30% 감소)
- 정말 큰 시크릿은 외부 시크릿 스토어(AWS Secrets Manager, Doppler 등) 또는 빌드 시 파일 마운트 고려
- 분할 가능한 경우 `KEY_PART1`/`KEY_PART2` 등으로 쪼개고 런타임에 합치기
