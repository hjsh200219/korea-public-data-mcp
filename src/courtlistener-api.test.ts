/**
 * CourtListener API 클라이언트 테스트 — TDD Red phase
 */
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { searchUSCases, getUSCaseDetail } from "./courtlistener-api.js";
import { resetThrottleState } from "./http-client.js";

function jsonResponse(data: unknown, status = 200): Response {
  const ok = status >= 200 && status < 300;
  return {
    ok,
    status,
    headers: new Headers(),
    json: async () => data,
    text: async () => JSON.stringify(data),
  } as unknown as Response;
}

beforeEach(() => {
  resetThrottleState();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("searchUSCases", () => {
  it("올바른 검색 URL 호출 (q + type=o)", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ count: 0, results: [] }));
    vi.stubGlobal("fetch", fetchMock);

    await searchUSCases({ query: "Miranda" });

    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("https://www.courtlistener.com/api/rest/v4/search/");
    expect(url).toContain("q=Miranda");
    expect(url).toContain("type=o");
  });

  it("토큰 제공 시 Authorization: Token <token> 헤더 포함", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ count: 0, results: [] }));
    vi.stubGlobal("fetch", fetchMock);

    await searchUSCases({ query: "Miranda" }, "secret-token");

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers["Authorization"]).toBe("Token secret-token");
  });

  it("토큰 부재 시 Authorization 헤더 없음", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ count: 0, results: [] }));
    vi.stubGlobal("fetch", fetchMock);

    await searchUSCases({ query: "Miranda" });

    const init = fetchMock.mock.calls[0][1] as RequestInit | undefined;
    const headers = (init?.headers ?? {}) as Record<string, string>;
    expect(headers["Authorization"]).toBeUndefined();
  });

  it("0건 응답에 빈 results 배열 반환", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ count: 0, results: [] })),
    );

    const result = await searchUSCases({ query: "nothingreally" });
    expect(result.count).toBe(0);
    expect(result.results).toEqual([]);
  });

  it("court / dateFiledAfter / dateFiledBefore / page / pageSize URL 파라미터 포함", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ count: 0, results: [] }));
    vi.stubGlobal("fetch", fetchMock);

    await searchUSCases({
      query: "test",
      court: "scotus",
      dateFiledAfter: "2020-01-01",
      dateFiledBefore: "2024-12-31",
      page: 2,
      pageSize: 10,
    });

    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("court=scotus");
    expect(url).toContain("filed_after=2020-01-01");
    expect(url).toContain("filed_before=2024-12-31");
    expect(url).toContain("page=2");
    expect(url).toContain("page_size=10");
  });

  it("Phase 0 형태의 검색 응답 파싱 (cluster_id, caseName, court_id, opinions[])", async () => {
    const sample = {
      count: 110305,
      results: [
        {
          cluster_id: 10307218,
          caseName: "Miranda v. Kennedy",
          court: "Court of Appeals for the First Circuit",
          court_id: "ca1",
          dateFiled: "2025-01-03",
          docketNumber: "22-1652",
          opinions: [
            {
              id: 10773806,
              download_url: "https://example.com/x.pdf",
              snippet: "United States",
            },
          ],
        },
      ],
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(sample)));

    const result = await searchUSCases({ query: "Miranda" });
    expect(result.count).toBe(110305);
    expect(result.results[0].cluster_id).toBe(10307218);
    expect(result.results[0].caseName).toBe("Miranda v. Kennedy");
    expect(result.results[0].court_id).toBe("ca1");
    expect(result.results[0].opinions?.[0].id).toBe(10773806);
  });

  it("HTTP 4xx 응답에 에러 throw", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ detail: "Not Found" }, 404)),
    );

    await expect(searchUSCases({ query: "x" })).rejects.toThrow();
  });

  it("HTTP 429 응답에 한도 안내 에러 throw", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(jsonResponse({ detail: "throttled" }, 429)),
    );

    await expect(searchUSCases({ query: "x" })).rejects.toThrow(/한도/);
  });
});

describe("getUSCaseDetail", () => {
  it("/opinions/{id}/ URL 호출", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ id: 12345 }));
    vi.stubGlobal("fetch", fetchMock);

    await getUSCaseDetail("12345");

    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toBe(
      "https://www.courtlistener.com/api/rest/v4/opinions/12345/",
    );
  });

  it("토큰 헤더 옵션", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ id: 12345 }));
    vi.stubGlobal("fetch", fetchMock);

    await getUSCaseDetail("12345", "tok");

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers["Authorization"]).toBe("Token tok");
  });
});
