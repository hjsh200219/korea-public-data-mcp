/**
 * Korean Public Data MCP 서버 - Remote HTTP 진입점
 * Claude 모바일/웹 앱에서 Remote MCP 커넥터로 연결
 */

import express from "express";
import { randomUUID } from "node:crypto";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createServer } from "./server.js";
import { createApiRouter } from "./api-routes.js";
import { generateOpenApiSpec } from "./openapi.js";
import { loadConfig } from "./config.js";

const serverConfig = loadConfig();
const PORT = parseInt(process.env.PORT || "3000", 10);

const app = express();
app.use(express.json());

// 세션별 transport 관리
const sessions = new Map<string, StreamableHTTPServerTransport>();

// Railway 재배포 시 기존 세션 정리 후 종료
function gracefulShutdown(signal: string) {
  console.log(`${signal} received — closing ${sessions.size} session(s)`);
  for (const [id, transport] of sessions) {
    transport.close().catch(() => {});
    sessions.delete(id);
  }
  process.exit(0);
}
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", server: "public-data", version: "6.0.0" });
});

// REST API (GPT Actions 등 일반 HTTP 클라이언트용)
app.use("/api", createApiRouter(serverConfig));

// OpenAPI 스펙 (GPT Actions 임포트용)
app.get("/openapi.json", (req, res) => {
  const baseUrl = `${req.protocol}://${req.get("host")}`;
  res.json(generateOpenApiSpec({
    baseUrl,
    hasDart: !!serverConfig.dartApiKey,
    hasData20: !!serverConfig.data20ServiceKey,
    hasUnipass: !!(serverConfig.unipassApiKeys && Object.keys(serverConfig.unipassApiKeys).length > 0),
    hasExim: !!serverConfig.eximApiKey,
    hasMafra: !!serverConfig.mafraApiKey,
    hasFinlife: !!serverConfig.finlifeApiKey,
  }));
});

// MCP endpoint — POST (클라이언트 → 서버 메시지)
app.post("/mcp", async (req, res) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;

  let transport: StreamableHTTPServerTransport;

  if (sessionId && sessions.has(sessionId)) {
    transport = sessions.get(sessionId)!;
  } else {
    // 새 세션 또는 재배포 후 stale 세션 → 새로 생성
    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
    });

    transport.onclose = () => {
      if (transport.sessionId) {
        sessions.delete(transport.sessionId);
      }
    };

    const server = createServer(serverConfig);
    await server.connect(transport);

    await transport.handleRequest(req, res, req.body);

    if (transport.sessionId) {
      sessions.set(transport.sessionId, transport);
    }
    return;
  }

  await transport.handleRequest(req, res, req.body);
});

// MCP endpoint — GET (서버 → 클라이언트 SSE 스트림)
app.get("/mcp", async (req, res) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;

  if (!sessionId || !sessions.has(sessionId)) {
    res.status(400).json({ error: "Invalid or missing session ID" });
    return;
  }

  const transport = sessions.get(sessionId)!;
  await transport.handleRequest(req, res);
});

// MCP endpoint — DELETE (세션 종료)
app.delete("/mcp", async (req, res) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;

  if (sessionId && sessions.has(sessionId)) {
    const transport = sessions.get(sessionId)!;
    await transport.close();
    sessions.delete(sessionId);
  }

  res.status(200).json({ message: "Session closed" });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`public-data remote server running on port ${PORT}`);
  console.log(`MCP endpoint: http://0.0.0.0:${PORT}/mcp`);
  console.log(`REST API: http://0.0.0.0:${PORT}/api`);
  console.log(`OpenAPI spec: http://0.0.0.0:${PORT}/openapi.json`);
});
