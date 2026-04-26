## Session Digest

YouTube 자막 봇 차단 우회를 한 단계 강화한 세션. `YOUTUBE_COOKIES_FROM_BROWSER` 환경변수를 추가해 로컬 stdio(Claude Desktop)에서는 yt-dlp가 Chrome 등 브라우저 쿠키 저장소를 직접 읽도록 분기하고, Railway/클라우드용은 기존 `YOUTUBE_COOKIES` 텍스트 주입 경로를 유지. 클라우드 쪽은 macOS 호스트 cron(06:30 KST)이 Chrome 쿠키를 추출·필터링해 Railway env로 매일 푸시하는 자동화까지 함께 구축. 99850ff 커밋 푸시 + Railway 배포 SUCCESS, 테스트 671/671 통과.

## Progress

- [x] `YOUTUBE_COOKIES_FROM_BROWSER` 분기 + 우선순위 로직 추가 (src/youtube-api.ts)
- [x] 신규 테스트 4건 추가 (src/youtube-api.test.ts) — vitest 671/671 GREEN
- [x] AGENTS.md env 테이블에 3행 추가 (FROM_BROWSER 우선순위 명시)
- [x] tsc / eslint / build clean
- [x] 커밋 99850ff push 완료, Railway 배포 SUCCESS
- [x] 외부 cron 스크립트 작성: `scripts/sync-youtube-cookies.sh` (Chrome 쿠키 추출 → 도메인 필터링 → `railway variables --set-from-stdin --skip-deploys`)
- [x] crontab 등록: `30 6 * * * /Users/edb_development/workspace/scripts/sync-youtube-cookies.sh`
- [x] 메모리 갱신: `reference_scheduled_triggers.md`에 신규 cron 반영
- [ ] Claude Desktop MCP config에 `YOUTUBE_COOKIES_FROM_BROWSER=chrome` 적용 후 동작 검증
- [ ] cron 첫 발화(내일 06:30 KST) 후 `/tmp/sync-youtube-cookies.log` 확인
- [ ] AGENTS.md Source Map의 `youtube-api.ts` 라인 수 갱신 (PR 후 증가)

## Next Steps

1. Claude Desktop의 `claude_desktop_config.json` `public-data-local` 항목에 `YOUTUBE_COOKIES_FROM_BROWSER=chrome` 추가 → Cmd+Q 재시작 → 한국 영상 자막 추출로 회귀 테스트
2. 내일 06:30 KST 이후 `/tmp/sync-youtube-cookies.log` 확인하고 Railway env가 갱신됐는지 `railway variables` 로 확인
3. AGENTS.md Source Map의 `src/youtube-api.ts` 라인 수 최신화 (PR로 라인 수 변동)
4. (선택) 필터 도메인에 `consent.youtube.com` 등 추가 검토 — 현재 4개 도메인만 추출 중

## Blockers

- 없음

## Watch Out

- Railway 쿠키 페이로드는 4개 도메인만 필터링 (`youtube.com`, `.youtube.com`, `google.com`, `.google.com`). 인증 흐름이 `consent.youtube.com` 등을 요구하면 필터 확장 필요
- yt-dlp 쿠키는 약 2주 단위로 만료 → 일 1회 cron 갱신은 보수적이지만 필수
- `YOUTUBE_COOKIES_FROM_BROWSER`는 컨테이너에서 동작 불가(브라우저 부재) → Railway에서는 자동으로 `YOUTUBE_COOKIES` 경로로 폴백
- 두 변수 모두 설정될 경우 `YOUTUBE_COOKIES_FROM_BROWSER`가 우선, `YOUTUBE_COOKIES`는 무시됨
- Mac이 06:30에 슬립 상태면 cron 미발화 → 캐치업이 필요할 수 있음 (caffeinate 또는 launchd 대안 검토 가능)

## Files Touched

- `src/youtube-api.ts` — `YOUTUBE_COOKIES_FROM_BROWSER` 분기 및 우선순위 로직
- `src/youtube-api.test.ts` — 신규 테스트 4건
- `AGENTS.md` — env 테이블 3행 추가
- 커밋: `99850ff feat(youtube): YOUTUBE_COOKIES_FROM_BROWSER로 봇 차단 우회 강화`

외부(Git 미관리):
- `/Users/edb_development/workspace/scripts/sync-youtube-cookies.sh` — 일 1회 Chrome 쿠키 → Railway env 동기화 스크립트
- `crontab` — `30 6 * * * /Users/edb_development/workspace/scripts/sync-youtube-cookies.sh` 추가
- `~/.claude/projects/-Users-edb-development-workspace/memory/reference_scheduled_triggers.md` — 신규 cron 등록 반영
