/**
 * OpenLegalData API 클라이언트 테스트 — TDD Red phase
 */
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { searchDECases, getDECaseDetail } from "./openlegaldata-api.js";
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

describe("searchDECases", () => {
  it("올바른 검색 URL 호출 (/cases/?search=...)", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ count: 0, results: [] }));
    vi.stubGlobal("fetch", fetchMock);

    await searchDECases({ query: "Grundgesetz" });

    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("https://de.openlegaldata.io/api/cases/");
    expect(url).toContain("search=Grundgesetz");
  });

  it("토큰 제공 시 Authorization: Token <token> 헤더 포함", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ count: 0, results: [] }));
    vi.stubGlobal("fetch", fetchMock);

    await searchDECases({ query: "test" }, "de-token");

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers["Authorization"]).toBe("Token de-token");
  });

  it("토큰 부재 시 Authorization 헤더 없음 (익명 접근)", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ count: 0, results: [] }));
    vi.stubGlobal("fetch", fetchMock);

    await searchDECases({ query: "test" });

    const init = fetchMock.mock.calls[0][1] as RequestInit | undefined;
    const headers = (init?.headers ?? {}) as Record<string, string>;
    expect(headers["Authorization"]).toBeUndefined();
  });

  it("0건 응답에 빈 results 배열 반환", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ count: 0, results: [] })),
    );

    const result = await searchDECases({ query: "nothingreally" });
    expect(result.count).toBe(0);
    expect(result.results).toEqual([]);
  });

  it("court / page / pageSize URL 파라미터 포함", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ count: 0, results: [] }));
    vi.stubGlobal("fetch", fetchMock);

    await searchDECases({
      query: "BGB",
      court: "bgh",
      page: 2,
      pageSize: 10,
    });

    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("court=bgh");
    expect(url).toContain("page=2");
    expect(url).toContain("page_size=10");
  });

  it("Phase 0 형태의 응답 파싱 (id, file_number, court.name, ecli)", async () => {
    const sample = {
      count: 419984,
      results: [
        {
          id: 325566,
          slug: "lg-koln-2029-11-13-84-o-24918",
          court: {
            id: 812,
            name: "Landgericht Köln",
            slug: "lg-koln",
            city: 446,
            state: 12,
            jurisdiction: "Ordentliche Gerichtsbarkeit",
            level_of_appeal: "Landgericht",
          },
          file_number: "84 O 249/18",
          date: "2029-11-13",
          type: "Urteil",
          ecli: "ECLI:DE:LGK:2029:1113.84O249.18.00",
        },
      ],
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(sample)));

    const result = await searchDECases({ query: "Grundgesetz" });
    expect(result.count).toBe(419984);
    expect(result.results[0].file_number).toBe("84 O 249/18");
    expect(result.results[0].court.name).toBe("Landgericht Köln");
    expect(result.results[0].ecli).toBe(
      "ECLI:DE:LGK:2029:1113.84O249.18.00",
    );
  });

  it("HTTP 4xx 응답에 에러 throw", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ detail: "Not Found" }, 404)),
    );

    await expect(searchDECases({ query: "x" })).rejects.toThrow();
  });
});

describe("getDECaseDetail", () => {
  it("/cases/{id}/ URL 호출", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ id: 67890 }));
    vi.stubGlobal("fetch", fetchMock);

    await getDECaseDetail("67890");

    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toBe("https://de.openlegaldata.io/api/cases/67890/");
  });

  it("토큰 헤더 옵션", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ id: 67890 }));
    vi.stubGlobal("fetch", fetchMock);

    await getDECaseDetail("67890", "tok");

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers["Authorization"]).toBe("Token tok");
  });
});
