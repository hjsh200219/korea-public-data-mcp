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
  it("본문 검색 경로 호출 (/cases/search/?text=...) — /cases/?search= 는 검색어를 무시한다", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ count: 0, results: [] }));
    vi.stubGlobal("fetch", fetchMock);

    await searchDECases({ query: "Grundgesetz" });

    const url = new URL(fetchMock.mock.calls[0][0] as string);
    expect(url.origin + url.pathname).toBe(
      "https://de.openlegaldata.io/api/cases/search/",
    );
    expect(url.searchParams.get("text")).toBe("Grundgesetz");
    expect(url.searchParams.has("search")).toBe(false);
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

  it("court / courtLevel / page / pageSize / 날짜 URL 파라미터 포함", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ count: 0, results: [] }));
    vi.stubGlobal("fetch", fetchMock);

    await searchDECases({
      query: "BGB",
      court: "BGH",
      courtLevel: "Bundesgericht",
      page: 2,
      pageSize: 10,
      dateFrom: "2020-01-01",
      dateTo: "2020-12-31",
    });

    const url = new URL(fetchMock.mock.calls[0][0] as string);
    expect(url.searchParams.get("court")).toBe("BGH");
    expect(url.searchParams.get("court_level_of_appeal")).toBe("Bundesgericht");
    expect(url.searchParams.get("page")).toBe("2");
    expect(url.searchParams.get("page_size")).toBe("10");
    // 본문 검색 경로는 date_after/date_before 를 조용히 무시한다 (2026-10-19 실측)
    expect(url.searchParams.get("start_date")).toBe("2020-01-01");
    expect(url.searchParams.get("end_date")).toBe("2020-12-31");
    expect(url.searchParams.has("date_after")).toBe(false);
  });

  it.each([
    ["bgh", "BGH"],
    ["BGH", "BGH"],
    ["bverfg", "BVerfG"],
    ["BVERFG", "BVerfG"],
    ["bpatg", "BPatG"],
    ["OLGK", "OLGK"],
  ])("연방법원 court 코드 대소문자 정규화: %s → %s", async (input, expected) => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ count: 0, results: [] }));
    vi.stubGlobal("fetch", fetchMock);

    await searchDECases({ query: "BGB", court: input });

    const url = new URL(fetchMock.mock.calls[0][0] as string);
    expect(url.searchParams.get("court")).toBe(expected);
  });

  it("본문 검색 응답 파싱 (court 코드, 심급, snippets)", async () => {
    const sample = {
      count: 60,
      next: "https://de.openlegaldata.io/api/cases/search/?court=BGH&page=2&text=Mietminderung",
      previous: null,
      results: [
        {
          id: 142268,
          citing_cases_count: 3,
          court: "BGH",
          slug: "bgh-2018-12-05-viii-zr-6718",
          date: "2018-12-05",
          court_jurisdiction: "Ordentliche Gerichtsbarkeit",
          court_level_of_appeal: "Bundesgericht",
          decision_type: "Urteil",
          snippets: [
            { text: "eine <em>Mietminderung</em> in Höhe", offset: 2866, length: 205 },
          ],
        },
      ],
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(sample)));

    const result = await searchDECases({ query: "Mietminderung", court: "BGH" });
    expect(result.count).toBe(60);
    expect(result.results[0].court).toBe("BGH");
    expect(result.results[0].court_level_of_appeal).toBe("Bundesgericht");
    expect(result.results[0].snippets?.[0].text).toContain("Mietminderung");
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
