/**
 * K Public Data MCP 서버 - Remote HTTP 진입점
 * Claude 모바일/웹 앱에서 Remote MCP 커넥터로 연결
 */

import express from "express";
import cors from "cors";
import { randomUUID } from "node:crypto";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createServer } from "./server.js";
import { createApiRouter } from "./api-routes.js";
import { generateOpenApiSpec } from "./openapi.js";
import { loadConfig, SERVER_VERSION } from "./config.js";
import { createLogger } from "./logger.js";

const log = createLogger("remote");
const serverConfig = loadConfig();
const PORT = parseInt(process.env.PORT || "3000", 10);
const startedAt = new Date();

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
  log.info(`→ ${req.method} ${req.path}`, { ua, accept, ct, sid: String(sid) });
  if (req.method === "POST" && req.body && Object.keys(req.body).length > 0) {
    log.info(`  body: ${JSON.stringify(req.body).slice(0, 600)}`);
  }
  res.on("finish", () => {
    log.info(`← ${req.method} ${req.path} ${res.statusCode}`);
  });
  next();
});

// 세션별 transport 관리 (TTL: 30분 미사용 시 자동 정리)
const SESSION_TTL_MS = 30 * 60 * 1000;
const sessions = new Map<string, StreamableHTTPServerTransport>();
const sessionTimers = new Map<string, ReturnType<typeof setTimeout>>();

function touchSession(id: string): void {
  const prev = sessionTimers.get(id);
  if (prev) clearTimeout(prev);
  sessionTimers.set(id, setTimeout(() => {
    const transport = sessions.get(id);
    if (transport) transport.close().catch(() => {});
    sessions.delete(id);
    sessionTimers.delete(id);
  }, SESSION_TTL_MS));
}

function removeSession(id: string): void {
  const timer = sessionTimers.get(id);
  if (timer) clearTimeout(timer);
  sessionTimers.delete(id);
  sessions.delete(id);
}

// Railway 재배포 시 기존 세션 정리 후 종료
function gracefulShutdown(signal: string) {
  log.warn(`${signal} received — closing ${sessions.size} session(s)`);
  for (const [id, transport] of sessions) {
    transport.close().catch(() => {});
    removeSession(id);
  }
  process.exit(0);
}
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Health check
app.get("/health", (_req, res) => {
  const uptimeSec = Math.floor((Date.now() - startedAt.getTime()) / 1000);
  res.json({
    status: "ok",
    server: "public-data",
    version: SERVER_VERSION,
    uptime: uptimeSec,
    sessions: sessions.size,
    startedAt: startedAt.toISOString(),
    memoryMB: Math.round(process.memoryUsage.rss() / 1024 / 1024),
  });
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
    hasCourtlistener: !!serverConfig.courtlistenerApiToken,
    hasOpenLegalData: !!serverConfig.openLegalDataApiToken || !!serverConfig.foreignCaseEnabled,
    hasData20Tourism: !!serverConfig.data20ServiceKey,
  }));
});

/** Express async 라우트에서 거부된 Promise를 next(err)로 넘겨 전역 에러 미들웨어가 로깅·응답하도록 함 */
function asyncRoute(
  fn: (req: express.Request, res: express.Response) => Promise<void>,
) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    Promise.resolve(fn(req, res)).catch(next);
  };
}

// MCP endpoint — POST (클라이언트 → 서버 메시지)
async function handleMcpPost(req: express.Request, res: express.Response): Promise<void> {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;

  if (sessionId && sessions.has(sessionId)) {
    const transport = sessions.get(sessionId)!;
    touchSession(sessionId);
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
      removeSession(transport.sessionId);
    }
  };

  const server = createServer(serverConfig);
  await server.connect(transport);

  await transport.handleRequest(req, res, req.body);

  if (transport.sessionId) {
    sessions.set(transport.sessionId, transport);
    touchSession(transport.sessionId);
  }
}

// MCP endpoint — GET (서버 → 클라이언트 SSE 스트림)
async function handleMcpGet(req: express.Request, res: express.Response): Promise<void> {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;

  if (!sessionId || !sessions.has(sessionId)) {
    res.status(400).json({ error: "Invalid or missing session ID" });
    return;
  }

  touchSession(sessionId);
  const transport = sessions.get(sessionId)!;
  await transport.handleRequest(req, res);
}

// MCP endpoint — DELETE (세션 종료)
async function handleMcpDelete(req: express.Request, res: express.Response): Promise<void> {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;

  if (sessionId && sessions.has(sessionId)) {
    const transport = sessions.get(sessionId)!;
    await transport.close();
    removeSession(sessionId);
  }

  res.status(200).json({ message: "Session closed" });
}

// /mcp 와 / 양쪽 모두 등록
// Claude 모바일 connector는 등록된 URL의 루트(`/`)로 직접 MCP 메시지를 보내는 케이스가 있어
// 양쪽을 모두 받아야 "Failed to generate authorization URL" 같은 디스커버리 실패를 피할 수 있다.
app.post("/mcp", asyncRoute(handleMcpPost));
app.get("/mcp", asyncRoute(handleMcpGet));
app.delete("/mcp", asyncRoute(handleMcpDelete));
app.post("/", asyncRoute(handleMcpPost));
app.get("/", asyncRoute(handleMcpGet));
app.delete("/", asyncRoute(handleMcpDelete));

app.use((err: unknown, req: express.Request, res: express.Response, next: express.NextFunction) => {
  log.error("unhandled HTTP error", {
    path: req.path,
    method: req.method,
    message: err instanceof Error ? err.message : String(err),
  });
  if (res.headersSent) {
    next(err);
    return;
  }
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, "0.0.0.0", () => {
  log.info(`public-data remote server running on port ${PORT}`);
  log.info(`MCP endpoint: http://0.0.0.0:${PORT}/mcp`);
  log.info(`REST API: http://0.0.0.0:${PORT}/api`);
  log.info(`OpenAPI spec: http://0.0.0.0:${PORT}/openapi.json`);
});
