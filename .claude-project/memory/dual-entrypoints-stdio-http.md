---
name: dual-entrypoints-stdio-http
description: public-data-mcp는 stdio + HTTP 두 진입점이 같은 도구를 공유
type: project
created: 2026-04-26
---

이 프로젝트는 두 진입점을 가짐:

```
src/
├── index.ts    → dist/index.js  (stdio, Claude Desktop 로컬용)
└── remote.ts   → dist/remote.js (HTTP Express, Railway 배포용)
```

`server.ts`와 `tools/skills/`의 도구 구현은 두 진입점이 공유. 추가 개발 없이 같은 코드를 두 방식으로 배포 가능.

스크립트:
- `npm run start:stdio` → stdio 모드 실행
- `npm start` → HTTP 모드 실행 (PORT=3000 기본)
- `npm run dev` / `npm run dev:remote` → tsx 개발 모드

**Why:** YouTube 차단 같은 리전 의존 도구는 사용자 PC IP가 유리하므로 stdio, 다른 도구는 클라우드(Railway HTTP) 사용. 두 모드를 함께 배포해 상황별 선택 가능.

**How to apply:** Claude Desktop에 `public-data-local`(stdio)과 `public-data-cloud`(HTTP) 둘 다 등록 가능. YouTube 도구 차단 시 stdio가 안전망. 코드 변경은 양쪽 모두에 자동 반영됨.
