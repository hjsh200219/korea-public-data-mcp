/**
 * E2E: 세션 라이프사이클 + 헬스체크 통합 테스트
 * Express 앱의 세션 생성/재사용/만료/삭제 및 헬스 엔드포인트 검증
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import express from "express";
import cors from "cors";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createServer } from "../server.js";
import { SERVER_VERSION } from "../config.js";
import type { ServerConfig } from "../config.js";

const CONFIG: ServerConfig = { lawApiOc: "test-oc" };

async function request(app: express.Express, method: "get" | "post" | "delete", path: string, options?: {
  headers?: Record<string, string>;
  body?: object;
}) {
  const { default: supertest } = await import("supertest");
  let req = supertest(app)[method](path);
  if (options?.headers) {
    for (const [k, v] of Object.entries(options.headers)) {
      req = req.set(k, v);
    }
  }
  if (options?.body) {
    req = req.send(options.body);
  }
  return req;
}

function createTestApp() {
  const app = express();
  app.use(cors({ origin: "*", exposedHeaders: ["mcp-session-id"] }));
  app.use(express.json());

  const sessions = new Map<string, StreamableHTTPServerTransport>();

  app.get("/health", (_req, res) => {
    res.json({
      status: "ok",
      server: "public-data",
      version: SERVER_VERSION,
      sessions: sessions.size,
    });
  });

  app.post("/mcp", async (req, res) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;

    if (sessionId && sessions.has(sessionId)) {
      const transport = sessions.get(sessionId)!;
      await transport.handleRequest(req, res, req.body);
      return;
    }

    if (sessionId) {
      res.status(404).json({
        jsonrpc: "2.0", id: null,
        error: { code: -32001, message: "Session not found." },
      });
      return;
    }

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => "test-session-id",
    });
    transport.onclose = () => { sessions.delete("test-session-id"); };

    const server = createServer(CONFIG);
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);

    if (transport.sessionId) {
      sessions.set(transport.sessionId, transport);
    }
  });

  app.delete("/mcp", async (req, res) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    if (sessionId && sessions.has(sessionId)) {
      const transport = sessions.get(sessionId)!;
      await transport.close();
      sessions.delete(sessionId);
    }
    res.status(200).json({ message: "Session closed" });
  });

  return { app, sessions };
}

describe("세션 & 헬스체크 E2E", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("헬스체크", () => {
    it("GET /health_동적정보포함_200", async () => {
      const { app } = createTestApp();
      const res = await request(app, "get", "/health");

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("ok");
      expect(res.body.version).toBe(SERVER_VERSION);
      expect(res.body.sessions).toBe(0);
    });

    it("세션생성후_sessions카운트증가", async () => {
      const { app, sessions } = createTestApp();

      const initRes = await request(app, "post", "/mcp", {
        headers: {
          Accept: "application/json, text/event-stream",
          "Content-Type": "application/json",
        },
        body: {
          jsonrpc: "2.0", id: 1,
          method: "initialize",
          params: {
            protocolVersion: "2025-03-26",
            capabilities: {},
            clientInfo: { name: "test", version: "1.0" },
          },
        },
      });

      expect(initRes.status).toBe(200);
      expect(sessions.size).toBe(1);

      const healthRes = await request(app, "get", "/health");
      expect(healthRes.body.sessions).toBe(1);
    });
  });

  describe("세션 라이프사이클", () => {
    it("initialize_세션ID반환", async () => {
      const { app } = createTestApp();

      const res = await request(app, "post", "/mcp", {
        headers: {
          Accept: "application/json, text/event-stream",
          "Content-Type": "application/json",
        },
        body: {
          jsonrpc: "2.0", id: 1,
          method: "initialize",
          params: {
            protocolVersion: "2025-03-26",
            capabilities: {},
            clientInfo: { name: "test", version: "1.0" },
          },
        },
      });

      expect(res.status).toBe(200);
      expect(res.headers["mcp-session-id"]).toBe("test-session-id");
    });

    it("stale_sessionId_404반환", async () => {
      const { app } = createTestApp();

      const res = await request(app, "post", "/mcp", {
        headers: {
          "mcp-session-id": "nonexistent-session",
          Accept: "application/json, text/event-stream",
          "Content-Type": "application/json",
        },
        body: { jsonrpc: "2.0", id: 1, method: "tools/list" },
      });

      expect(res.status).toBe(404);
      expect(res.body.error.message).toContain("Session not found");
    });

    it("DELETE /mcp_세션삭제_200", async () => {
      const { app, sessions } = createTestApp();

      await request(app, "post", "/mcp", {
        headers: {
          Accept: "application/json, text/event-stream",
          "Content-Type": "application/json",
        },
        body: {
          jsonrpc: "2.0", id: 1,
          method: "initialize",
          params: {
            protocolVersion: "2025-03-26",
            capabilities: {},
            clientInfo: { name: "test", version: "1.0" },
          },
        },
      });

      expect(sessions.size).toBe(1);

      const delRes = await request(app, "delete", "/mcp", {
        headers: { "mcp-session-id": "test-session-id" },
      });
      expect(delRes.status).toBe(200);
      expect(sessions.size).toBe(0);
    });

    it("DELETE_없는세션_200정상반환", async () => {
      const { app } = createTestApp();

      const res = await request(app, "delete", "/mcp", {
        headers: { "mcp-session-id": "nonexistent" },
      });
      expect(res.status).toBe(200);
    });
  });
});
