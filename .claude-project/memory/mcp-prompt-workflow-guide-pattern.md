---
name: mcp-prompt-workflow-guide-pattern
description: MCP prompts.ts — 복합 조회 워크플로를 server.prompt()로 등록하는 패턴
type: reference
created: 2026-05-03
---

`src/tools/skills/prompts.ts`에 `registerSkillPrompts(server)` 함수로 워크플로 가이드를 MCP prompt로 등록한다.

**제품리뷰_워크플로 패턴 (2026-05-03 추가):**
```ts
server.prompt("제품리뷰_워크플로", "...", { product: z.string() }, async ({ product }) => ({
  messages: [{ role: "user", content: { type: "text", text: [...].join("\n") } }]
}));
```

**워크플로 prompt 작성 원칙:**
1. `full_review` 같은 복합 action을 **먼저** 호출하도록 step 1에 명시
2. 경쟁 스킬(youtube.search) 대신 올바른 스킬 사용을 "주의사항"으로 명시
3. "찾은 영상 전부 요약, 임의로 줄이지 말 것" 등 LLM 축소 행동 방지 지침 포함
4. 실패 fallback 경로 명시 (예: youtube 없으면 coupang_search만 조회)

**등록된 워크플로 목록 (2026-05-03 기준):**
- 수입통관_워크플로
- 기업분석_워크플로
- 법령리서치_워크플로
- HS코드_관세_워크플로
- 수출통관_워크플로
- 제품리뷰_워크플로 ← 신규
- 해외판례_비교법_워크플로

**Why:** MCP prompt는 LLM이 복합 시나리오에서 올바른 스킬 호출 순서를 따르도록 강제하는 가장 확실한 방법이다.
**How to apply:** 2개 이상의 스킬을 순서대로 호출해야 하는 시나리오 → prompts.ts에 워크플로 추가. action 순서, fallback, LLM 주의사항을 번호 목록으로 명시.
