---
name: mcp-stale-session-stateless-fallback
description: Railway 재배포 후 MCP stale 세션 소실 — claude.ai 게이트웨이는 404 수신 시 재초기화 없이 포기, handleStatelessMcpRequest()로 대응
type: project
created: 2026-06-12
---

## 장애 시나리오 (2026-06-12 확인)

Railway 재배포 → 인메모리 세션 Map 전체 소실 → claude.ai 게이트웨이가 저장된 옛 `mcp-session-id`로 재요청 → 서버가 404 반환 → **claude.ai 게이트웨이는 재초기화(initialize 재시도) 없이 포기** → 대화 내 커넥터 툴 전체 소실 (ToolSearch에 K-Data 툴이 아예 안 잡힘).

- Claude Code CLI는 404 수신 시 자동 재초기화+재시도 → 무증상.
- claude.ai 웹/클라우드 게이트웨이는 포기 → 재배포마다 사용자 대화에서 툴이 사라짐.

## 해결책: handleStatelessMcpRequest()

파일: `src/mcp-stateless-fallback.ts`

옛 `mcp-session-id`로 들어온 POST 요청을 1회성 stateless transport로 처리:
- `sessionIdGenerator: undefined` → 세션 검증 완전 생략
- initialize 없이 `tools/list`, `tools/call` 직접 처리 가능
- 세션 Map에 등록하지 않음, `res` close 시 transport/server 정리

**핵심 규칙**: MCP stale 세션 요청에 404 거절 금지.

**Why:** claude.ai 게이트웨이의 비회복 동작은 우리가 고칠 수 없으므로 서버가 재배포를 클라이언트에 안 보이게 흡수해야 함.

**How to apply:** remote.ts의 stale 분기에서 `handleStatelessMcpRequest(serverConfig, req, res)` 호출. GET /mcp(SSE)는 stateless 불가 — 400 유지(의도적).

## SDK 근거

`@modelcontextprotocol/sdk` `StreamableHTTPServerTransport` stateless 모드 docstring: "No session validation is performed". `sessionIdGenerator: undefined` 전달 시 세션 ID 생성·검증 전체 비활성화.
