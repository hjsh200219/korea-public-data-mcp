---
created: 2026-05-30T08:18:51+09:00
project: korea-public-data-mcp
summary: YouTube 쿠키 동기화 인증쿠키 누락 장애 진단 및 수정 (프로필 미지정 → Profile 4 지정 + 가드 추가)
---

## Session Digest
YouTube `get_transcript`가 "쿠키 만료/로그인 필요"로 지속 실패. 사용자는 `sync-youtube-cookies` cron이 성공(8줄 846B 업로드)했다고 보고했으나 여전히 실패.

근본 원인: `scripts/sync-youtube-cookies.sh`가 `yt-dlp --cookies-from-browser chrome`를 프로필 미지정으로 호출 → yt-dlp가 `Default` 프로필을 읽는데 이 맥엔 Default가 없음(로그인 세션 = `Profile 4`) → 로그아웃 방문자 쿠키 8개(PREF/YSC/VISITOR_INFO1_LIVE 등)만 추출, 인증 쿠키(SID/SAPISID/LOGIN_INFO/`__Secure-1PSID`) 전부 누락. `video_info`는 `YOUTUBE_API_KEY`로 동작해 정상, transcript만 막힘.

수정: 프로필 명시(`chrome:Profile 4`) + `findMissingAuthCookies` 가드(인증쿠키 누락 시 업로드 중단). 재동기화(24줄 3078B) + redeploy 후 `get_transcript` 1270 세그먼트 정상 추출 검증.

## Progress
- [x] 장애 진단: 프로필 미지정 → 로그아웃 쿠키 추출 (Railway env/크롬 프로필 DB로 확정)
- [x] `refresh-youtube-cookies.ts`: `BROWSER:PROFILE` 형식 파싱(브라우저명만 검증) + `findMissingAuthCookies` 가드 추가
- [x] `refresh-youtube-cookies.test.ts`: 가드 테스트 5건 추가 (총 16 통과)
- [x] `sync-youtube-cookies.sh`(repo 밖, workspace/scripts): `--browser "chrome:Profile 4"` 적용
- [x] 검증 전체 통과: typecheck/lint/test(1026)/build
- [x] 코드 커밋·푸시: `996b3af` → origin/master
- [x] 재동기화 + redeploy + transcript 실측 검증
- [x] AGENTS.md 컨벤션 + runbook 메모리 갱신

## Next Steps
1. (선택) 프로필명 하드코딩(`Profile 4`) 대신 로그인 프로필 자동 탐지 로직 검토 — 크롬 프로필 변경 시 재발 방지
2. 매주 만료 체크 루틴(trig_013jaxkLuRLDkpk71g49tJxB)이 새 프로필 경로로 정상 동작하는지 다음 주기에 확인

## Blockers
- 없음

## Watch Out
- `sync-youtube-cookies.sh`는 `/Users/edb_development/workspace/scripts/`에 있고 **git 미추적** — 이 repo 커밋에 포함 안 됨, 로컬 디스크에만 존재. 백업/이관 시 별도 관리.
- env 주입 후 redeploy 필수 (`youtube-cookie-pool.ts` 싱글톤이 시작 시 1회 env 읽음, `--skip-deploys`는 미반영)
- `findMissingAuthCookies` 필수 쿠키 목록: LOGIN_INFO/SAPISID/`__Secure-1PSID`

## Files Touched
- scripts/refresh-youtube-cookies.ts (프로필 파싱 + 가드)
- scripts/refresh-youtube-cookies.test.ts (가드 테스트 5건)
- AGENTS.md (YouTube cookie 프로필 컨벤션)
- .claude-project/memory/youtube-cookies-railway-refresh-runbook.md (프로필 요구사항 갱신)
- (repo 밖) /Users/edb_development/workspace/scripts/sync-youtube-cookies.sh
