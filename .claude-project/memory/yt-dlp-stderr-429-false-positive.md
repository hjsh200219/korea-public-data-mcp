---
name: yt-dlp-stderr-429-false-positive
description: yt-dlp execFileAsync 에러 메시지에 커맨드 전체가 포함 — '429' 문자열 검사는 오탐
type: feedback
created: 2026-05-03
---

`execFileAsync`로 yt-dlp를 호출할 때 에러 객체의 `message`에는 실행된 커맨드 전체가 포함된다.
`--extractor-args "youtube:player_client=android"` 같은 인수 문자열에 특정 숫자/문자가 들어 있으면
`error.message.includes('429')` 같은 단순 문자열 검사가 항상 true를 반환할 수 있다.

**Why:** 2026-05-03 세션에서 android 클라이언트 인수 문자열이 에러 메시지에 포함되어 있어 실제 429 응답과 무관하게 조건이 true로 평가됨. 실제로는 파일 읽기 로직이 먼저 실행돼 정상 처리됐지만, 오탐 조건이 코드에 잠재 위험으로 남음.

**How to apply:**
- yt-dlp 에러 분류는 `error.message`의 문자열 검사보다 exit code(`error.code`) 또는 stderr 스트림 분리로 판단할 것
- `429` 판별은 `stderr.includes('HTTP Error 429')` 처럼 stderr를 별도 수집해 검사
- `execFileAsync` 대신 `spawn`으로 stdout/stderr를 분리해 수집하는 방식이 더 안전
