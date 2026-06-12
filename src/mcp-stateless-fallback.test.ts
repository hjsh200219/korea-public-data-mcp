/**
 * stale 세션 ID 요청의 stateless 폴백 처리 테스트
 *
 * 배경(2026-06-12 장애): Railway 재배포로 인메모리 세션이 사라진 뒤 claude.ai
 * 게이트웨이가 기존 mcp-session-id로 tools/list를 보냈고, 404를 받자 재초기화
 * 없이 포기 → 해당 대화에서 K-Data 툴이 통째로 사라짐. stale 세션 요청은
 * 1회성 stateless transport로 응답해야 한다.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import { handleStatelessMcpRequest } from "./mcp-stateless-fallback.js";
import type { ServerConfig } from "./config.js";

const CONFIG: ServerConfig = { lawApiOc: "test-oc" };

/** remote.ts의 stale 세션 분기를 재현한 최소 앱 — 실제 폴백 핸들러를 호출 */
function createStaleFallbackApp() {
  const app = express();
  app.use(express.json());
  app.post("/mcp", (req, res, next) => {
    handleStatelessMcpRequest(CONFIG, req, res).catch(next);
  });
  return app;
}

/** SSE(text/event-stream) 또는 JSON 응답에서 JSON-RPC 메시지 추출 */
function parseRpcResponse(res: { headers: Record<string, string>; text: string; body: unknown }): unknown {
  const contentType = res.headers["content-type"] || "";
  if (contentType.includes("text/event-stream")) {
    const dataLine = res.text
      .split("\n")
      .find((line) => line.startsWith("data: "));
    if (!dataLine) throw new Error(`SSE 응답에 data 라인 없음: ${res.text.slice(0, 200)}`);
    return JSON.parse(dataLine.slice("data: ".length));
  }
  return typeof res.body === "object" && res.body !== null && Object.keys(res.body).length > 0
    ? res.body
    : JSON.parse(res.text);
}

async function post(app: express.Express, body: object) {
  const { default: supertest } = await import("supertest");
  return supertest(app)
    .post("/mcp")
    .set("Accept", "application/json, text/event-stream")
    .set("Content-Type", "application/json")
    .set("mcp-session-id", "stale-session-from-before-restart")
    .send(body);
}

describe("stale 세션 stateless 폴백", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("stale_sessionId_tools/list_200_툴목록반환", async () => {
    const app = createStaleFallbackApp();

    const res = await post(app, { jsonrpc: "2.0", id: 1, method: "tools/list" });

    expect(res.status).toBe(200);
    const rpc = parseRpcResponse(res) as {
      result?: { tools?: Array<{ name: string }> };
      error?: unknown;
    };
    expect(rpc.error).toBeUndefined();
    const toolNames = (rpc.result?.tools ?? []).map((t) => t.name);
    expect(toolNames).toContain("youtube");
  });

  it("stale_sessionId_initialize_200_정상핸드셰이크", async () => {
    const app = createStaleFallbackApp();

    const res = await post(app, {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2025-03-26",
        capabilities: {},
        clientInfo: { name: "test", version: "1.0" },
      },
    });

    expect(res.status).toBe(200);
    const rpc = parseRpcResponse(res) as { result?: { serverInfo?: { name: string } } };
    expect(rpc.result?.serverInfo?.name).toBeTruthy();
  });

  it("stale_sessionId_tools/call_youtube_video_info_정상라우팅", async () => {
    // 외부 API는 도구 내부에서 호출되므로 fetch 모킹 — 폴백 경로로 tools/call이
    // 실제 도구 핸들러까지 도달하는지만 검증
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ items: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const app = createStaleFallbackApp();

    const res = await post(app, {
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: { name: "youtube", arguments: { action: "video_info", url: "jNQXAC9IVRw" } },
    });

    expect(res.status).toBe(200);
    const rpc = parseRpcResponse(res) as { result?: unknown; error?: unknown };
    // 404/세션에러가 아니라 도구 결과(성공 또는 isError 콘텐츠)가 와야 한다
    expect(rpc.error).toBeUndefined();
    expect(rpc.result).toBeDefined();
  });
});
