---
name: fetch-mock-convention-vi-stubglobal
description: HTTP 목은 vi.stubGlobal("fetch", ...) — nock은 사용하지 않음
type: project
created: 2026-04-28
---

이 레포의 HTTP 목 표준은 vitest의 `vi.stubGlobal`.

```ts
vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
  ok: true,
  status: 200,
  headers: new Headers(),
  json: async () => ({ ... }),
  text: async () => "...",
}));
```

- `nock` 미설치 (package.json 검증) — 추가 금지
- `afterEach`에서 `vi.unstubAllGlobals()` + `vi.restoreAllMocks()` 정리
- HTTP 클라이언트가 fetch 기반이므로 글로벌 stub만으로 충분
- 참조 패턴: `src/dart-api.test.ts`, `src/exim-api.test.ts`, `src/courtlistener-api.test.ts`

**Why:** 새 도메인 추가 시 다른 라이브러리(nock, msw) 도입하면 테스트 패턴이 갈라짐.
**How to apply:** 새 *-api.ts 테스트 작성 시 기존 *.test.ts 파일의 stubGlobal 패턴 그대로 복사. nock 설치 PR은 reject.
