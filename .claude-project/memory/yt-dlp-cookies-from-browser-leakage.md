---
name: yt-dlp-cookies-from-browser-leakage
description: yt-dlp --cookies-from-browser는 모든 사이트 쿠키 추출 — 도메인 필터 필수
type: feedback
created: 2026-04-27
---

`yt-dlp --cookies-from-browser chrome` 으로 cookies.txt를 뽑으면 **타겟 사이트뿐 아니라 브라우저의 전체 쿠키**가 함께 추출된다. 외부 서비스의 환경변수에 raw 업로드 금지.

**Why:** 2026-04-27 세션 실측에서 498 쿠키 / 104KB 추출 결과에 GitLab, Slack, Microsoft, Kakao, Claude.ai, Railway, Vercel, lguplus 등의 세션 쿠키가 포함됐다. Railway 같은 무관한 서비스 env로 통째 업로드하면 다른 서비스 세션이 유출된다.

**How to apply:** YouTube 용도 한정으로 추출했다면 다음 도메인만 grep으로 남기고 나머지 폐기:
```
.youtube.com, www.youtube.com, .google.com, accounts.google.com
```
필터 후 51줄 / 7.5KB 수준이면 정상. Railway 32KB 한계도 동시에 충족. 다른 사이트 인증이 필요한 경우엔 화이트리스트에 도메인 추가하되, 무엇이 노출되는지 매번 검토.

참고 구현: `~/workspace/scripts/sync-youtube-cookies.sh` (filter blocked).
