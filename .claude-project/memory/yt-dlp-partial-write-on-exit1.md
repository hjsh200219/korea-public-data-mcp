---
name: yt-dlp-partial-write-on-exit1
description: yt-dlp exits 1 on multi-lang 429 but may have already written subtitle files — read before throwing
type: reference
created: 2026-05-02
---

When yt-dlp downloads `--sub-lang en,ja,zh-Hans,...` and a later language hits HTTP 429, the process exits with code 1. However the earlier language (e.g. `en`) subtitle file has already been written to disk. Throwing immediately on any non-zero exit loses the already-written data.

**Why:** Reproduced 2026-05-02 in `src/youtube-api.ts` `tryYtDlpClient`. Multi-language subtitle requests are processed sequentially by yt-dlp; partial success before the 429 is common.

**How to apply:**
- After any yt-dlp non-zero exit, attempt to read output files from the temp directory first. Return if files exist; only rethrow if zero files are found.
- ENOENT (binary not installed) and "no subtitles"/"Subtitles are disabled" remain immediate-throw sentinels — no partial output is possible for these.
- Implementation pattern: capture error into `ytdlpError = e` without rethrowing, run the file-read loop, classify `ytdlpError` only at the end when no files were recovered.
- TDD coverage in `src/youtube-api.test.ts`: "429 에러 발생해도 이미 쓰인 자막 파일 반환" (mocks execFileAsync to throw a 429 error while fs.readFile returns valid VTT content).
