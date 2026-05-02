---
created: 2026-05-03T01:10:00+09:00
project: k-public-data-mcp
summary: Railway YouTube 자막 봇차단 해결 (Chrome 쿠키 주입) + 쿠키 만료 알림 루틴 설정
---

## Session Digest

Railway 서버에서 YouTube 자막 추출이 실패하는 근본 원인을 분석하고 해결했다.
Railway IP가 YouTube에 의해 봇으로 차단되어 있었고, 쿠키 없이 android 클라이언트를 사용하면 자막 파일 자체가 생성되지 않는 구조였다.
로컬 Chrome에서 YouTube/Google 도메인 쿠키를 추출(약 6KB)해 Railway 환경변수 `YOUTUBE_COOKIES`에 주입하고 재배포함으로써 해결했다.
쿠키 만료 모니터링을 위한 Remote 루틴도 설정했다 (매주 월요일 09:00 KST, 만료 14일 이내 시 inter349@gmail.com 알림).

## Progress

- **완료**:
  - Railway YouTube 자막 봇차단 원인 분석
    - Railway 공유 IP → YouTube 봇 차단
    - yt-dlp android 클라이언트 + 쿠키 없음 → 자막 파일 미생성
  - 로컬 Chrome 쿠키 추출 (YouTube + Google 도메인 필터링, ~6KB Netscape cookies.txt 형식)
  - Railway 환경변수 `YOUTUBE_COOKIES` 추가 및 재배포 완료
  - 쿠키 만료 알림 Remote 루틴 설정
    - Trigger ID: `trig_013jaxkLuRLDkpk71g49tJxB`
    - 스케줄: 매주 월요일 09:00 KST
    - 조건: 만료 14일 이내 쿠키 감지 시 inter349@gmail.com 알림

- **이전 세션 인계 항목 (미완료 유지)**:
  - Smithery 마켓플레이스 등록 승인 대기 중 (제출은 완료)

## Next Steps

1. **쿠키 갱신 SOP 숙지** — 만료 알림 수신 시 즉시 Watch Out 절차 수행
2. Smithery 마켓플레이스 등록 승인 확인 후 README/CLAUDE.md 배지/링크 추가
3. `awesome-mcp-servers` GitHub 리포에 PR 제출 (마케팅)
4. MCP Prompts(`src/tools/skills/prompts.ts`) — product_review 워크플로 가이드 프롬프트 추가 고려

## Blockers

- Railway 환경변수 `YOUTUBE_COOKIES`는 수동 갱신 필요 — 만료 시 자막 추출 재차 실패
- Smithery 등록 승인은 외부 의존 (별도 처리 불필요, 대기)

## Watch Out

- **쿠키 갱신 SOP** (만료 알림 수신 시):
  1. 로컬에서 Chrome 쿠키 추출:
     `yt-dlp --cookies-from-browser chrome --cookies /tmp/yt_cookies.txt --skip-download "https://www.youtube.com/watch?v=dQw4w9WgXcQ"`
  2. `/tmp/yt_cookies.txt`에서 `.youtube.com` / `.google.com` 라인만 필터링 (~6KB)
  3. Railway Dashboard → `YOUTUBE_COOKIES` 환경변수 값 교체 → 재배포
- `YOUTUBE_COOKIES_FROM_BROWSER`(로컬 stdio용)와 `YOUTUBE_COOKIES`(서버 배포용)는 별개 변수. Railway에는 `YOUTUBE_COOKIES_FROM_BROWSER` 미설정 확인 필요 (설정 시 우선 적용돼 서버용 쿠키 무시됨, `config.ts` 로직).
- `youtube.md` 파일이 `product_review` 스킬의 채널 소스. 삭제/이동 시 `find_reviews` 동작 불가.
- `searchVideos` 함수 시그니처는 이전 세션에서 옵션 객체 형태로 변경됨. 외부 직접 호출 코드 있다면 확인 필요.

## Files Touched

이번 세션에서 코드 파일 변경은 없었음. 인프라/환경 변경만 수행:
- Railway 환경변수: `YOUTUBE_COOKIES` 추가 (Railway Dashboard에서 관리)
- Remote 루틴: `trig_013jaxkLuRLDkpk71g49tJxB` 생성 (OMC 루틴 레지스트리)
