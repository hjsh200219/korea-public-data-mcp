import { describe, it, expect } from "vitest";
import { generateOpenApiSpec } from "./openapi.js";

describe("generateOpenApiSpec — 해외 판례 경로 게이팅", () => {
  it("hasCourtlistener=false → /api/courtlistener/* 경로 부재", () => {
    const spec = generateOpenApiSpec({ baseUrl: "http://localhost" });
    const keys = Object.keys(spec.paths);
    expect(keys.some((k) => k.startsWith("/api/courtlistener"))).toBe(false);
  });

  it("hasCourtlistener=true → 검색/상세 경로 모두 포함", () => {
    const spec = generateOpenApiSpec({
      baseUrl: "http://localhost",
      hasCourtlistener: true,
    });
    const keys = Object.keys(spec.paths);
    expect(keys).toContain("/api/courtlistener/search");
    expect(keys).toContain("/api/courtlistener/opinions/{opinionId}");
  });

  it("hasOpenLegalData=false → /api/openlegaldata/* 경로 부재", () => {
    const spec = generateOpenApiSpec({ baseUrl: "http://localhost" });
    const keys = Object.keys(spec.paths);
    expect(keys.some((k) => k.startsWith("/api/openlegaldata"))).toBe(false);
  });

  it("hasOpenLegalData=true → 검색/상세 경로 모두 포함", () => {
    const spec = generateOpenApiSpec({
      baseUrl: "http://localhost",
      hasOpenLegalData: true,
    });
    const keys = Object.keys(spec.paths);
    expect(keys).toContain("/api/openlegaldata/search");
    expect(keys).toContain("/api/openlegaldata/cases/{caseId}");
  });
});
