/**
 * CourtListener 클라이언트 테스트 — 정규화 도메인 + cursor 페이지네이션
 */
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { createCourtListenerClient } from "./courtlistener-api.js";
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

describe("createCourtListenerClient — 검색", () => {
  it("올바른 검색 URL 호출 (q + type=o)", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ count: 0, results: [] }));
    vi.stubGlobal("fetch", fetchMock);

    const client = createCourtListenerClient();
    await client.searchOpinions({ query: "Miranda" });

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

    const client = createCourtListenerClient({ token: "secret-token" });
    await client.searchOpinions({ query: "Miranda" });

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers["Authorization"]).toBe("Token secret-token");
  });

  it("토큰 부재 시 Authorization 헤더 없음", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ count: 0, results: [] }));
    vi.stubGlobal("fetch", fetchMock);

    const client = createCourtListenerClient();
    await client.searchOpinions({ query: "Miranda" });

    const init = fetchMock.mock.calls[0][1] as RequestInit | undefined;
    const headers = (init?.headers ?? {}) as Record<string, string>;
    expect(headers["Authorization"]).toBeUndefined();
  });

  it("0건 응답 → 빈 items 배열, totalCount=0", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ count: 0, results: [] })),
    );

    const client = createCourtListenerClient();
    const result = await client.searchOpinions({ query: "nothingreally" });
    expect(result.items).toEqual([]);
    expect(result.totalCount).toBe(0);
    expect(result.nextCursor).toBeUndefined();
  });

  it("cursor / pageSize / dateFrom / dateTo / precedentialStatus URL 파라미터 포함", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ count: 0, results: [] }));
    vi.stubGlobal("fetch", fetchMock);

    const client = createCourtListenerClient();
    await client.searchOpinions({
      query: "test",
      cursor: "abc123",
      pageSize: 10,
      dateFrom: "2020-01-01",
      dateTo: "2024-12-31",
      precedentialStatus: "Published",
    });

    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("cursor=abc123");
    expect(url).toContain("page_size=10");
    expect(url).toContain("filed_after=2020-01-01");
    expect(url).toContain("filed_before=2024-12-31");
    expect(url).toContain("precedential_status=Published");
  });

  it("pageSize 100 초과 시 100으로 캡", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ count: 0, results: [] }));
    vi.stubGlobal("fetch", fetchMock);

    const client = createCourtListenerClient();
    await client.searchOpinions({ query: "x", pageSize: 999 });

    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("page_size=100");
  });

  it("jurisdiction=us-scotus → court=scotus 매핑", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ count: 0, results: [] }));
    vi.stubGlobal("fetch", fetchMock);

    const client = createCourtListenerClient();
    await client.searchOpinions({ query: "x", jurisdiction: "us-scotus" });

    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("court=scotus");
  });

  it("jurisdiction=us-federal → court__jurisdiction=F", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ count: 0, results: [] }));
    vi.stubGlobal("fetch", fetchMock);

    const client = createCourtListenerClient();
    await client.searchOpinions({ query: "x", jurisdiction: "us-federal" });

    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("court__jurisdiction=F");
  });

  it("명시적 court 가 jurisdiction 매핑보다 우선", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ count: 0, results: [] }));
    vi.stubGlobal("fetch", fetchMock);

    const client = createCourtListenerClient();
    await client.searchOpinions({
      query: "x",
      court: "ca9",
      jurisdiction: "us-scotus",
    });

    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("court=ca9");
    expect(url).not.toContain("court=scotus");
  });

  it("정규화된 OpinionListItem (camelCase + null fallback)", async () => {
    const sample = {
      count: 110305,
      next: "https://www.courtlistener.com/api/rest/v4/search/?cursor=NEXTTOKEN&q=x",
      results: [
        {
          id: 99,
          cluster_id: 10307218,
          caseName: "Miranda v. Kennedy",
          court: "Court of Appeals for the First Circuit",
          court_id: "ca1",
          dateFiled: "2025-01-03",
          citation: ["384 U.S. 436"],
          snippet: "United States",
          absolute_url: "/opinion/123/",
          citation_count: 7,
          status: "Published",
        },
      ],
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(sample)));

    const client = createCourtListenerClient();
    const result = await client.searchOpinions({ query: "Miranda" });

    expect(result.totalCount).toBe(110305);
    expect(result.nextCursor).toBe("NEXTTOKEN");
    expect(result.items[0]).toEqual({
      id: 99,
      clusterId: 10307218,
      caseName: "Miranda v. Kennedy",
      citation: "384 U.S. 436",
      decisionDate: "2025-01-03",
      court: "Court of Appeals for the First Circuit",
      courtSlug: "ca1",
      jurisdiction: "",
      precedentialStatus: "Published",
      snippet: "United States",
      absoluteUrl: "https://www.courtlistener.com/opinion/123/",
      citationCount: 7,
    });
  });

  it("HTTP 4xx → 한글 에러 throw", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ detail: "Not Found" }, 404)),
    );

    const client = createCourtListenerClient();
    await expect(client.searchOpinions({ query: "x" })).rejects.toThrow(/CourtListener/);
  });

  it("HTTP 429 → 한도 안내 한글 에러", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ detail: "throttled" }, 429)),
    );

    // 429 는 fetchWithRetry 가 재시도(1s+2s+4s 백오프) 후에도 통과되므로 타임아웃 여유 필요.
    const client = createCourtListenerClient();
    await expect(client.searchOpinions({ query: "x" })).rejects.toThrow(/한도/);
  }, 15000);
});

describe("createCourtListenerClient — getOpinion", () => {
  it("/opinions/{id}/ URL 호출", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ id: 12345, plain_text: "body" }));
    vi.stubGlobal("fetch", fetchMock);

    const client = createCourtListenerClient();
    await client.getOpinion(12345);

    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toBe(
      "https://www.courtlistener.com/api/rest/v4/opinions/12345/",
    );
  });

  it("plain_text 우선 사용", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({ id: 1, plain_text: "Hello", html: "<p>Other</p>" }),
      ),
    );

    const client = createCourtListenerClient();
    const d = await client.getOpinion(1);
    expect(d.plainText).toBe("Hello");
  });

  it("HTML fallback chain — plain_text 비었으면 html_with_citations stripped 사용", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({
          id: 1,
          plain_text: "   ",
          html_with_citations: "<p>Hello&nbsp;<b>World</b></p>",
          html: "<p>Other</p>",
        }),
      ),
    );

    const client = createCourtListenerClient();
    const d = await client.getOpinion(1);
    expect(d.plainText).toContain("Hello");
    expect(d.plainText).toContain("World");
    expect(d.plainText).not.toContain("<");
  });

  it("HTML fallback — html_with_citations 비었으면 html → xml_harvard 순", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({
          id: 1,
          plain_text: "",
          html_with_citations: "",
          html: "",
          xml_harvard: "<root>fallback</root>",
        }),
      ),
    );

    const client = createCourtListenerClient();
    const d = await client.getOpinion(1);
    expect(d.plainText).toContain("fallback");
  });

  it("includeCluster=false (기본) → cluster fetch 안 함 (호출 1회)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        id: 1,
        cluster: "https://www.courtlistener.com/api/rest/v4/clusters/777/",
        plain_text: "x",
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const client = createCourtListenerClient();
    await client.getOpinion(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("includeCluster=true + cluster URL 문자열 → 추가 fetch + 메타 결합", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          id: 1,
          cluster: "https://www.courtlistener.com/api/rest/v4/clusters/777/",
          plain_text: "x",
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          id: 777,
          case_name: "Doe v. Roe",
          date_filed: "2020-01-01",
          precedential_status: "Published",
          judges: "J. Smith",
          court_id: "scotus",
          court: "Supreme Court",
          citations: ["1 U.S. 1"],
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const client = createCourtListenerClient();
    const d = await client.getOpinion(1, { includeCluster: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(d.caseName).toBe("Doe v. Roe");
    expect(d.decisionDate).toBe("2020-01-01");
    expect(d.precedentialStatus).toBe("Published");
    expect(d.judges).toBe("J. Smith");
    expect(d.citation).toBe("1 U.S. 1");
    expect(d.courtSlug).toBe("scotus");
    expect(d.court).toBe("Supreme Court");
  });

  it("opinions_cited URL 배열 → 숫자 ID 추출", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({
          id: 1,
          plain_text: "x",
          opinions_cited: [
            "https://www.courtlistener.com/api/rest/v4/opinions/100/",
            "https://www.courtlistener.com/api/rest/v4/opinions/200/",
          ],
        }),
      ),
    );

    const client = createCourtListenerClient();
    const d = await client.getOpinion(1);
    expect(d.citedOpinions).toEqual([100, 200]);
  });
});

describe("createCourtListenerClient — getCluster", () => {
  it("/clusters/{id}/ URL 호출 + 정규화 출력", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        id: 777,
        case_name: "Doe v. Roe",
        case_name_short: "Doe",
        date_filed: "2020-01-01",
        precedential_status: "Published",
        judges: "J. Smith",
        court: "Supreme Court",
        court_id: "scotus",
        citations: [
          { volume: 1, reporter: "U.S.", page: "1" },
          "2 F.2d 3",
        ],
        sub_opinions: [
          { id: 99, type: "010combined", absolute_url: "/opinion/99/" },
        ],
        absolute_url: "/opinion/777/",
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const client = createCourtListenerClient();
    const d = await client.getCluster(777);

    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://www.courtlistener.com/api/rest/v4/clusters/777/",
    );
    expect(d).toEqual({
      id: 777,
      caseName: "Doe v. Roe",
      caseNameShort: "Doe",
      decisionDate: "2020-01-01",
      court: "Supreme Court",
      courtSlug: "scotus",
      citations: ["1 U.S. 1", "2 F.2d 3"],
      precedentialStatus: "Published",
      judges: "J. Smith",
      subOpinions: [
        { id: 99, type: "010combined", absoluteUrl: "/opinion/99/" },
      ],
      absoluteUrl: "https://www.courtlistener.com/opinion/777/",
    });
  });
});

describe("createCourtListenerClient — listCourts", () => {
  it("/courts/ URL 호출, jurisdiction 옵션 전달", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        results: [
          {
            id: "scotus",
            full_name: "Supreme Court of the United States",
            short_name: "SCOTUS",
            jurisdiction: "F",
          },
        ],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const client = createCourtListenerClient();
    const courts = await client.listCourts("F");

    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("/courts/");
    expect(url).toContain("jurisdiction=F");
    expect(url).toContain("page_size=100");
    expect(courts).toEqual([
      {
        id: "scotus",
        fullName: "Supreme Court of the United States",
        shortName: "SCOTUS",
        jurisdiction: "F",
      },
    ]);
  });
});
