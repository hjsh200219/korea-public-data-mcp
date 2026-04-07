/**
 * Korean Public Data MCP 서버 - Remote HTTP 진입점
 * Claude 모바일/웹 앱에서 Remote MCP 커넥터로 연결
 */

import express from "express";
import cors from "cors";
import { randomUUID } from "node:crypto";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createServer } from "./server.js";
import { createApiRouter } from "./api-routes.js";
import { generateOpenApiSpec } from "./openapi.js";
import { loadConfig } from "./config.js";

const serverConfig = loadConfig();
const PORT = parseInt(process.env.PORT || "3000", 10);

const app = express();
// Claude 모바일/웹 connector는 브라우저 컨텍스트에서 동작하므로 CORS 필요.
// 정상 동작 사례(sns-monitor)와 동일하게 origin "*" 와일드카드 사용 — 일부 모바일
// 클라이언트가 Origin 헤더 없이 요청하거나 와일드카드 응답을 기대할 수 있다.
// mcp-session-id 헤더를 노출해야 클라이언트가 세션을 유지할 수 있다.
app.use(cors({
  origin: "*",
  exposedHeaders: ["mcp-session-id"],
  allowedHeaders: ["Content-Type", "mcp-session-id", "Accept", "Authorization"],
}));
app.use(express.json());

// Claude.ai의 OAuth proxy(python-httpx)는 Accept: */* 만 보내서 StreamableHTTPServerTransport가
// "Not Acceptable: Client must accept both application/json and text/event-stream" 으로 406을
// 거절한다. SDK는 req.headers와 req.rawHeaders 양쪽을 참조할 수 있으므로 둘 다 정상화한다.
app.use((req, res, next) => {
  if (req.path === "/mcp" || req.path === "/") {
    const accept = (req.headers.accept || "").toString();
    const ok = accept.includes("application/json") && accept.includes("text/event-stream");
    if (!ok) {
      const normalized = "application/json, text/event-stream";
      req.headers.accept = normalized;
      // rawHeaders는 [name, value, name, value, ...] 형태. case-insensitive로 찾아 교체.
      const raw = req.rawHeaders;
      let replaced = false;
      for (let i = 0; i < raw.length; i += 2) {
        if (raw[i].toLowerCase() === "accept") {
          raw[i + 1] = normalized;
          replaced = true;
        }
      }
      if (!replaced) {
        raw.push("Accept", normalized);
      }
    }
  }
  next();
});

// 요청/응답 로깅 — connector 디버깅용.
app.use((req, res, next) => {
  const ua = (req.headers["user-agent"] || "-").toString().slice(0, 40);
  const accept = req.headers.accept || "-";
  const ct = req.headers["content-type"] || "-";
  const sid = req.headers["mcp-session-id"] || "-";
  console.log(`→ ${req.method} ${req.path} ua="${ua}" accept="${accept}" ct="${ct}" sid="${sid}"`);
  if (req.method === "POST" && req.body && Object.keys(req.body).length > 0) {
    console.log(`  body: ${JSON.stringify(req.body).slice(0, 600)}`);
  }
  res.on("finish", () => {
    console.log(`← ${req.method} ${req.path} ${res.statusCode}`);
  });
  next();
});

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
async function handleMcpPost(req: express.Request, res: express.Response): Promise<void> {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;

  // 기존 세션 재사용
  if (sessionId && sessions.has(sessionId)) {
    const transport = sessions.get(sessionId)!;
    await transport.handleRequest(req, res, req.body);
    return;
  }

  // sessionId가 있는데 sessions에 없으면 stale → 명시적 404로 클라이언트가 재초기화하도록 안내
  // (이걸 새 transport로 처리하면 클라이언트가 보낸 tools/list 같은 메서드가 initialize 없이
  //  들어와서 transport가 400으로 거절하는 잘못된 흐름이 됨)
  if (sessionId) {
    res.status(404).json({
      jsonrpc: "2.0",
      id: null,
      error: { code: -32001, message: "Session not found. Please re-initialize." },
    });
    return;
  }

  // 새 세션 — initialize 메시지 처리
  const transport = new StreamableHTTPServerTransport({
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
}

// MCP endpoint — GET (서버 → 클라이언트 SSE 스트림)
async function handleMcpGet(req: express.Request, res: express.Response): Promise<void> {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;

  if (!sessionId || !sessions.has(sessionId)) {
    res.status(400).json({ error: "Invalid or missing session ID" });
    return;
  }

  const transport = sessions.get(sessionId)!;
  await transport.handleRequest(req, res);
}

// MCP endpoint — DELETE (세션 종료)
async function handleMcpDelete(req: express.Request, res: express.Response): Promise<void> {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;

  if (sessionId && sessions.has(sessionId)) {
    const transport = sessions.get(sessionId)!;
    await transport.close();
    sessions.delete(sessionId);
  }

  res.status(200).json({ message: "Session closed" });
}

// /mcp 와 / 양쪽 모두 등록
// Claude 모바일 connector는 등록된 URL의 루트(`/`)로 직접 MCP 메시지를 보내는 케이스가 있어
// 양쪽을 모두 받아야 "Failed to generate authorization URL" 같은 디스커버리 실패를 피할 수 있다.
app.post("/mcp", handleMcpPost);
app.get("/mcp", handleMcpGet);
app.delete("/mcp", handleMcpDelete);
app.post("/", handleMcpPost);
app.get("/", handleMcpGet);
app.delete("/", handleMcpDelete);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`public-data remote server running on port ${PORT}`);
  console.log(`MCP endpoint: http://0.0.0.0:${PORT}/mcp`);
  console.log(`REST API: http://0.0.0.0:${PORT}/api`);
  console.log(`OpenAPI spec: http://0.0.0.0:${PORT}/openapi.json`);
});
