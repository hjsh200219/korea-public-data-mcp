---
name: railway-stale-session-diagnosis
description: claude.ai에서 MCP 툴이 통째로 사라졌을 때 진단 — railway logs --json timestamp 필터로 "Starting Container" 직후 stale sid 404 패턴 확인
type: reference
created: 2026-06-12
---

## 증상

claude.ai 대화에서 MCP 커넥터 툴이 갑자기 전부 사라짐 (ToolSearch에 안 잡힘). Railway는 정상 배포 완료로 보임.

## 진단 절차

1. 재배포(컨테이너 재시작) 시각 확인:

```bash
railway logs --json | python3 -c "import sys,json
for l in sys.stdin:
    e=json.loads(l)
    if 'Starting Container' in e.get('message',''): print(e['timestamp'])"
```

2. 재시작 직후 구간에서 stale `mcp-session-id` 요청 → `← POST /mcp 404` 패턴 탐색 (timestamp 필터로 해당 시간대만).

3. 판정: "Starting Container" 직후 기존 sid로 tools/list 404가 보이면 stale 세션 장애. `handleStatelessMcpRequest` 폴백(95a6e32 이후)이 배포에 포함됐는지 확인.

**Why:** 2026-06-12 12:26 재배포 → 12:29 claude.ai/code 세션 툴 소실 장애의 실제 진단 경로.

**How to apply:** "K-Data MCP 안 된다" 신고 시 서버 down으로 단정하기 전에 이 패턴부터 확인. 참고: [[mcp-stale-session-stateless-fallback]]
