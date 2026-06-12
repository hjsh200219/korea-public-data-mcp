/**
 * stale 세션 ID 요청의 stateless 폴백 처리
 *
 * 배경(2026-06-12 장애): Railway 재배포로 인메모리 세션 Map이 비워진 직후,
 * claude.ai 게이트웨이가 재배포 이전의 mcp-session-id로 tools/list를 요청했다.
 * 스펙대로 404를 돌려줬지만 claude.ai 게이트웨이는 (Claude Code CLI와 달리)
 * 재초기화 없이 포기 → 그 대화는 K-Data 툴 0개로 시작됐다.
 *
 * 해결: 세션을 못 찾은 요청은 거절하지 않고, 요청 단위 1회성 stateless
 * transport(sessionIdGenerator: undefined — 세션 검증 생략)로 새 서버 인스턴스를
 * 만들어 그대로 응답한다. 재배포가 클라이언트에 보이지 않게 된다.
 */

import type express from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createServer } from "./server.js";
import type { ServerConfig } from "./config.js";

export async function handleStatelessMcpRequest(
  config: ServerConfig,
  req: express.Request,
  res: express.Response,
): Promise<void> {
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });
  const server = createServer(config);

  // 응답 종료 시 1회성 인스턴스 정리 (SSE 스트림 누수 방지)
  res.on("close", () => {
    transport.close().catch(() => {});
    server.close().catch(() => {});
  });

  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
}
