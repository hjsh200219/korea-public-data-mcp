/**
 * E2E: 해외 판례 REST 라우트 (/api/courtlistener/*, /api/openlegaldata/*)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import express from "express";
import { createApiRouter } from "../api-routes.js";
import type { ServerConfig } from "../config.js";
import { resetThrottleState } from "../http-client.js";

const BASE_CONFIG: ServerConfig = {
  lawApiOc: "test-oc",
  courtlistenerApiToken: "test-cl",
  foreignCaseEnabled: true,
};

function createTestApp(config: ServerConfig = BASE_CONFIG) {
  const app = express();
  app.use(express.json());
  app.use("/api", createApiRouter(config));
  return app;
}

function mockFetchJson(body: unknown, status = 200): void {
  globalThis.fetch = vi.fn().mockImplementation(() =>
    Promise.resolve(
      new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
      }),
    ),
  ) as typeof fetch;
}

async function request(app: express.Express, path: string) {
  const { default: supertest } = await import("supertest");
  return supertest(app).get(path);
}

beforeEach(() => {
  vi.restoreAllMocks();
  resetThrottleState();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("CourtListener 라우트", () => {
  it("GET /api/courtlistener/search?q=test → 200 + 결과", async () => {
    mockFetchJson({ count: 1, results: [{ cluster_id: 1, caseName: "T" }] });
    const app = createTestApp();
    const res = await request(app, "/api/courtlistener/search?q=test");
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(1);
  });

  it("GET /api/courtlistener/search (q 누락) → 500 (검색어 안내 메시지)", async () => {
    const app = createTestApp();
    const res = await request(app, "/api/courtlistener/search");
    expect(res.status).toBe(500);
    expect(res.body.error).toContain("검색어");
  });

  it("GET /api/courtlistener/opinions/:id → 200", async () => {
    mockFetchJson({ id: 12345, plain_text: "x" });
    const app = createTestApp();
    const res = await request(app, "/api/courtlistener/opinions/12345");
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(12345);
  });

  it("토큰 미설정 시 라우트 미등록 (404)", async () => {
    const app = createTestApp({ lawApiOc: "x" });
    const res = await request(app, "/api/courtlistener/search?q=test");
    expect(res.status).toBe(404);
  });
});

describe("OpenLegalData 라우트", () => {
  it("GET /api/openlegaldata/search?q=test → 200 + 결과", async () => {
    mockFetchJson({
      count: 1,
      results: [{ id: 1, file_number: "X", court: { id: 1, name: "BGH", slug: "bgh" }, date: "2020-01-01", type: "Urteil", slug: "x" }],
    });
    const app = createTestApp();
    const res = await request(app, "/api/openlegaldata/search?q=test");
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(1);
  });

  it("GET /api/openlegaldata/search (q 누락) → 500", async () => {
    const app = createTestApp();
    const res = await request(app, "/api/openlegaldata/search");
    expect(res.status).toBe(500);
    expect(res.body.error).toContain("검색어");
  });

  it("GET /api/openlegaldata/cases/:id → 200", async () => {
    mockFetchJson({ id: 67890, file_number: "X", court: { id: 1, name: "BGH", slug: "bgh" }, date: "2020-01-01", type: "Urteil", slug: "x" });
    const app = createTestApp();
    const res = await request(app, "/api/openlegaldata/cases/67890");
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(67890);
  });

  it("FOREIGN_CASE_ENABLED 미설정 + 토큰 부재 → 404", async () => {
    const app = createTestApp({ lawApiOc: "x" });
    const res = await request(app, "/api/openlegaldata/search?q=test");
    expect(res.status).toBe(404);
  });
});
