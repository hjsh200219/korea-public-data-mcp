---
name: mcp-sdk-outputschema-requires-structuredcontent
description: MCP SDK에서 outputSchema 설정 시 콜백이 structuredContent를 반드시 반환해야 함
type: project
created: 2026-05-03
---

@modelcontextprotocol/sdk에서 `server.registerTool()`에 `outputSchema`를 설정하면
콜백의 반환값에 `structuredContent` 필드가 없을 경우 SDK가 런타임 에러를 발생시킨다.

해결: 콜백 래퍼에서 자동으로 `structuredContent` 주입:
```ts
return {
  ...result,
  structuredContent: { content: result.content },
};
```

이 패턴은 `_shared.ts`의 `registerSkillTool()`에 캡슐화되어 있다.

**Why:** `outputSchema` 없이 작성된 기존 스킬을 마이그레이션할 때 이 규칙을 모르면
런타임에서만 터지는 버그가 발생한다. (E2E 테스트에서 발견됨)

**How to apply:** 새 스킬 작성 시 항상 `registerSkillTool()`을 사용하면 자동 처리됨.
직접 `server.registerTool()`을 쓸 경우 반드시 `structuredContent` 반환 추가.
