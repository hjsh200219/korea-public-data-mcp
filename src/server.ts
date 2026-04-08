/**
 * K Public Data MCP 서버 - 스킬 도구 등록
 * 107개 개별 도구 → 10개 의도 기반 스킬 + MCP Prompts
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ServerConfig } from "./config.js";
import { SERVER_VERSION } from "./config.js";
import { registerSkillTools } from "./tools/skills/index.js";

export type { ServerConfig } from "./config.js";

export function createServer(config: ServerConfig): McpServer {
  const server = new McpServer({
    name: "public-data",
    version: SERVER_VERSION,
  });

  registerSkillTools(server, config);

  return server;
}
