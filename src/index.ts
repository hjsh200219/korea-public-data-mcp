#!/usr/bin/env node

/**
 * K Public Data MCP 서버 - stdio 진입점
 * Claude Desktop 등 로컬 MCP 클라이언트용
 */

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.js";
import { loadConfig } from "./config.js";

const serverConfig = loadConfig();
const server = createServer(serverConfig);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("MCP 서버 시작 실패:", error);
  process.exit(1);
});
