---
name: yt-dlp-auto-subtitle-flag-plural
description: yt-dlp 자동자막 플래그는 --write-auto-subs(복수형), 단수형은 존재하지 않음
type: feedback
created: 2026-05-04
---

yt-dlp에서 자동자막을 다운로드하는 올바른 플래그는 `--write-auto-subs`(복수형)입니다.
단수형 `--write-auto-sub`은 존재하지 않으며, 사용 시 자동자막이 전혀 다운로드되지 않습니다.

**Why:** `--write-auto-sub`(단수)는 무시되어 자동자막 파일이 생성되지 않아 한국어 자동자막이 있는 영상에서도 "자막 없음" 오류 발생. `--list-subs`로 확인 시 ko 자막이 존재함에도 추출 실패.

**How to apply:** src/youtube-api.ts tryYtDlpClient()의 ytdlpArgs 배열에 `"--write-auto-subs"` 사용. 기존 코드에서 `--write-auto-sub` 발견 시 즉시 복수형으로 수정.
