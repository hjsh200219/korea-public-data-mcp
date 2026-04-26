---
name: claude-desktop-stdio-mcp-path
description: Claude Desktop stdio MCP 등록 시 PATH 환경변수 완전 명시 필요
type: reference
created: 2026-04-26
---

Claude Desktop이 stdio MCP를 spawn할 때 사용자 셸 PATH를 상속하지 않음. 외부 도구(yt-dlp, python3 등)를 호출하는 MCP는 다음 모두 명시 필요:

1. `command`: node 절대경로 (NVM 사용 시 특히 필요)
2. `env.PATH`: 외부 도구 위치 모두 포함

```json
{
  "mcpServers": {
    "public-data-local": {
      "command": "/Users/USERNAME/.nvm/versions/node/vXX.XX.X/bin/node",
      "args": [
        "--use-system-ca",
        "/path/to/dist/index.js"
      ],
      "env": {
        "PATH": "/Users/USERNAME/.nvm/versions/node/vXX.XX.X/bin:/Users/USERNAME/Library/Python/3.9/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin",
        "...": "..."
      }
    }
  }
}
```

**Why:** `command: "node"`만 쓰면 ENOENT, PATH에 yt-dlp 위치 누락하면 `yt-dlp가 설치되어 있지 않습니다` 에러 발생. Claude Desktop의 spawn 환경은 매우 최소한.

**How to apply:** 새 stdio MCP 등록 시 `which node` / `which yt-dlp` 등으로 절대경로 확인 후 config의 `command`와 `env.PATH`에 모두 반영. 설정 파일 위치: `~/Library/Application Support/Claude/claude_desktop_config.json`
