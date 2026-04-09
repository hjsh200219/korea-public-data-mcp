/**
 * K Public Data MCP 서버 - 스킬 도구 등록
 * 다수 세부 action을 12개 의도 기반 스킬 도구 + MCP Prompts로 등록합니다.
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
