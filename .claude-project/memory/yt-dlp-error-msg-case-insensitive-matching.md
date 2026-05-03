---
name: yt-dlp-error-msg-case-insensitive-matching
description: yt-dlp stderr 에러 메시지 매칭은 toLowerCase() 후 수행 필수
type: feedback
created: 2026-05-04
---

yt-dlp execFileAsync 에러 핸들링 시 에러 문자열 대소문자가 버전/플랫폼마다 다를 수 있으므로
조건부 매칭 전에 `toLowerCase()` 적용이 필수입니다.

**Why:** "No Subtitles"(대문자 N,S)가 python fallback까지 내려가 불필요한 프로세스 실행. "subtitles are disabled"(소문자) 패턴도 누락. yt-dlp 버전 업데이트 시 메시지 변경에 취약.

**How to apply:** src/youtube-api.ts tryYtDlpClient()에서 에러 메시지 체크 시:
```typescript
const msgLower = msg.toLowerCase();
if (msgLower.includes("no subtitles") || msgLower.includes("subtitles are disabled")) { ... }
// 파일 없을 때 에러 분류도 동일하게:
const errLower = errMsg.toLowerCase();
if (errLower.includes("po token") || errLower.includes("po_token")) { ... }
```
