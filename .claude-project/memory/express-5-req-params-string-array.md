---
name: express-5-req-params-string-array
description: Express 5에서 req.params.X는 string | string[] — 항상 String() 캐스트
type: project
created: 2026-04-28
---

Express 5로 올라오면서 `req.params.X` 타입이 `string | string[]`로 바뀜 (배열 라우트 매칭 지원). 기존 string 가정 코드는 TS 컴파일 에러.

```ts
// 잘못된 방식
const id: string = req.params.id; // TS2322

// 올바른 방식
const id = String(req.params.id);
```

쿼리 파라미터(`req.query.X`)도 동일한 패턴 (`string | ParsedQs | (string | ParsedQs)[]`).

**Why:** routes/*.ts에서 새 핸들러 작성 시 같은 함정 반복 방지.
**How to apply:** 새 REST 라우트 추가 시 params/query 직접 사용 금지, 항상 `String()` 또는 안전한 파서를 거치게.
