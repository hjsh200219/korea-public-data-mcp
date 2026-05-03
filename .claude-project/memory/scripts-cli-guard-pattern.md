---
name: scripts-cli-guard-pattern
description: scripts/*.ts의 main() 자동 실행 방지 — process.argv[1] 가드 필수
type: feedback
created: 2026-05-03
---

`scripts/` 파일에서 `main()`을 최하단에서 무조건 호출하면, 테스트 파일이 import할 때 자동 실행되어 CI에서 `process.exit(1)` 호출 → `test:coverage` 실패.

```ts
const isMain = process.argv[1]?.endsWith("script-name.ts") ||
  process.argv[1]?.endsWith("script-name.js");
if (isMain) {
  main();
}
```

**Why:** `scripts/refresh-youtube-cookies.ts`가 이 패턴 없이 `main()`을 호출해 CI `test:coverage`에서 unhandled error 발생 (yt-dlp 없는 환경에서 `process.exit(1)`).

**How to apply:** `scripts/` 하위 모든 진입점 파일에 동일 패턴 적용. `export`된 함수는 가드 밖, `main()` 호출만 가드 안.
