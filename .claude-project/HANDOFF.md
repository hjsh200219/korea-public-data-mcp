---
created: 2026-05-02T11:20:00+09:00
project: k-public-data-mcp
summary: YouTube 자막 추출 버그 수정 (429 에러 시 기존 파일 반환)
---

## Session Digest

`tryYtDlpClient` 함수에서 `--sub-lang en,ja,zh-Hans,...` 처럼 다중 언어를 지정할 때, 일부 언어에서 HTTP 429가 발생하면 yt-dlp가 exit code 1로 종료된다. 기존 코드는 이 에러를 즉시 throw하여 이미 성공적으로 다운로드된 앞 언어의 자막 파일을 읽지 못하는 버그가 있었다. 이를 수정하여 에러 발생 시에도 디스크에 쓰인 파일을 먼저 확인하고, 파일이 있으면 반환하도록 변경했다.

## Progress

- **버그 수정 완료** (`src/youtube-api.ts`, `tryYtDlpClient` 함수, lines ~210-255)
  - `execFileAsync` 호출을 try/catch로 감싸 에러를 `ytdlpError`에 저장
  - ENOENT(`yt-dlp` 미설치), "no subtitles"/"Subtitles are disabled" 는 즉시 throw (기존 동작 유지)
  - 429 / PO Token / DRM / 봇 감지 등 나머지 에러: 파일 읽기 먼저 시도, 파일 있으면 반환
  - 파일도 없을 때만 429 에러를 사용자 친화적 메시지로 throw
- **TDD 완료** (`src/youtube-api.test.ts`, line 491)
  - 신규 테스트: `"429 에러 발생해도 이미 쓰인 자막 파일이 있으면 반환"`
  - `execFile` mock → 429 에러 반환, `readFile` mock → `.en.json3` 파일 존재, 나머지 ENOENT
  - 전체 801개 테스트 통과
- **빌드/린트 클린** — `npm run build`, `npm run lint` 모두 성공
- **커밋 및 푸시 완료** — `06bbdb3` → `origin/master`

## Next Steps

- 없음. 이번 세션 목표 완전 달성. 다음 작업은 별도 이슈 기반으로 진행 가능.

## Blockers

- 없음.

## Watch Out

- `tryYtDlpClient`는 `null`을 반환하면 호출자(`getTranscript`)가 다음 player client(`web`, `tv`, `android_vr` 캐스케이드)로 넘어간다. 429 에러이면서 파일도 없는 경우에만 throw하므로, 429를 받았더라도 파일이 존재하면 정상 반환 — 캐스케이드가 불필요하게 돌지 않는다.
- 동일 함수에서 PO Token / DRM / 봇 감지 에러는 `null` 반환(다음 클라이언트 시도)으로 처리된다. 추후 이 분기에 새 에러 메시지가 추가되면 `ytdlpError` null 체크 이후 로직을 함께 검토해야 한다.

## Files Touched

- `/Users/hoshin/workspace/k-public-data-mcp/src/youtube-api.ts` — `tryYtDlpClient` 함수 로직 변경 (lines ~210-257)
- `/Users/hoshin/workspace/k-public-data-mcp/src/youtube-api.test.ts` — 신규 테스트 추가 (line 491-526)
