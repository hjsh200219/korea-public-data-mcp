---
name: register-skill-tool-wrapper-pattern
description: registerSkillTool() 래퍼로 outputSchema + ToolAnnotations 공통화 — 신규 스킬 등록 표준
type: project
created: 2026-05-03
---

`src/tools/skills/_shared.ts`에 `registerSkillTool<TInput>()` 래퍼 존재.
모든 스킬 도구는 `server.tool()` 직접 호출 대신 이 래퍼를 사용해야 한다.

공통 적용 항목:
- `outputSchema`: content 배열 (`z.array(z.object({type, text}))`)
- `annotations`: `readOnlyHint=true`, `destructiveHint=false`, `idempotentHint=true`, `openWorldHint=true`
- `structuredContent` 자동 주입

시그니처:
```ts
registerSkillTool(server, {
  name,
  title,      // 한글 표시명
  description,
  inputSchema: ZodRawShape,
  callback: async (params) => Promise<SkillResult>,
})
```

**Why:** 17개 스킬 모두 동일한 outputSchema/annotations를 가져야 하므로
중앙화하지 않으면 누락/불일치 위험이 크다.

**How to apply:** 신규 스킬 파일에서 `server.registerTool()` 직접 사용 금지.
`_shared.ts`에서 `registerSkillTool` import 후 사용.
