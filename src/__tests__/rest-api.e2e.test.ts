/**
 * E2E: REST API 라우트 통합 테스트
 * Express 앱 → Zod 검증 → API 클라이언트 → JSON 응답 전체 흐름 검증
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import express from "express";
import { createApiRouter } from "../api-routes.js";
import type { ServerConfig } from "../config.js";

const CONFIG: ServerConfig = {
  lawApiOc: "test-oc",
  dartApiKey: "test-dart",
  data20ServiceKey: "test-data20",
};

let fakeNow = 1_700_000_000_000;

function createTestApp(config: ServerConfig = CONFIG) {
  const app = express();
  app.use(express.json());
  app.use("/api", createApiRouter(config));
  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    res.status(500).json({ error: err.message });
  });
  return app;
}

function mockFetchXml(xml: string): void {
  globalThis.fetch = vi.fn().mockImplementation(() =>
    Promise.resolve(new Response(xml, { status: 200, headers: { "Content-Type": "text/xml" } })),
  ) as typeof fetch;
}

function mockFetchJson(body: object): void {
  const json = JSON.stringify(body);
  globalThis.fetch = vi.fn().mockImplementation(() =>
    Promise.resolve(new Response(json, { status: 200, headers: { "Content-Type": "application/json" } })),
  ) as typeof fetch;
}

async function request(app: express.Express, path: string) {
  const { default: supertest } = await import("supertest");
  return supertest(app).get(path);
}

describe("REST API E2E", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    fakeNow += 5000;
    vi.spyOn(Date, "now").mockImplementation(() => {
      fakeNow += 2000;
      return fakeNow;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("법제처 라우트", () => {
    it("GET /api/search/laws_정상검색_JSON반환", async () => {
      mockFetchXml(
        "<LawSearch><totalCnt>1</totalCnt><law><법령일련번호>1</법령일련번호><법령명한글>민법</법령명한글></law></LawSearch>",
      );

      const app = createTestApp();
      const res = await request(app, "/api/search/laws?query=민법");

      expect(res.status).toBe(200);
      expect(res.body.totalCount).toBe(1);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].lawName).toBe("민법");
    });

    it("GET /api/search/laws_query누락_400", async () => {
      const app = createTestApp();
      const res = await request(app, "/api/search/laws");

      expect(res.status).toBe(400);
      expect(res.body.error).toContain("올바르지 않습니다");
      expect(res.body.details).toBeDefined();
    });

    it("GET /api/search/laws_page_display_기본값적용", async () => {
      mockFetchXml("<LawSearch><totalCnt>0</totalCnt></LawSearch>");

      const app = createTestApp();
      const res = await request(app, "/api/search/laws?query=테스트");

      expect(res.status).toBe(200);
      const url = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
      expect(url).toContain("page=1");
      expect(url).toContain("display=20");
    });
  });

  describe("DART 라우트", () => {
    it("GET /api/dart/disclosures_정상검색_JSON반환", async () => {
      mockFetchJson({ status: "000", list: [{ corp_name: "삼성전자" }], total_count: 1 });

      const app = createTestApp();
      const res = await request(app, "/api/dart/disclosures?corp_name=삼성전자&bgn_de=20240101&end_de=20241231");

      expect(res.status).toBe(200);
    });
  });

  describe("Zod 검증 통합", () => {
    it("잘못된page타입_400반환", async () => {
      const app = createTestApp();
      const res = await request(app, "/api/search/laws?query=민법&page=abc");

      expect(res.status).toBe(400);
      expect(res.body.details).toBeDefined();
    });

    it("빈query문자열_400반환", async () => {
      const app = createTestApp();
      const res = await request(app, "/api/search/laws?query=");

      expect(res.status).toBe(400);
    });
  });

  describe("에러 처리 통합", () => {
    it("외부API실패_500반환", { timeout: 30_000 }, async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new TypeError("fetch failed")) as typeof fetch;

      const app = createTestApp();
      const res = await request(app, "/api/search/laws?query=민법");

      expect(res.status).toBe(500);
    });
  });

  describe("조건부 라우트 등록", () => {
    it("DART키_없으면_dart라우트_미등록_404", async () => {
      const app = createTestApp({ lawApiOc: "oc" });
      const res = await request(app, "/api/dart/disclosures?corp_name=test&bgn_de=20240101&end_de=20241231");

      expect(res.status).toBe(404);
    });
  });
});
