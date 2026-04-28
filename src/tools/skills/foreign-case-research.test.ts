/**
 * foreign_case_research 스킬 도구 테스트 — TDD
 *
 * US: 정규화 도메인 + cursor 페이지네이션 (CourtListener v4)
 * DE: page 페이지네이션 (OpenLegalData) — 변경 없음
 */
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { createForeignCaseResearchHandler } from "./foreign-case-research.js";
import { resetThrottleState } from "../../http-client.js";

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

describe("foreign_case_research dispatcher", () => {
  it("알 수 없는 action에 isError 반환", async () => {
    const handler = createForeignCaseResearchHandler({
      enableUS: true,
      enableDE: true,
    });
    const result = await handler({ action: "nonexistent" });
    expect(result.isError).toBe(true);
  });

  it("search_us_cases — query 누락 시 한글 에러", async () => {
    const handler = createForeignCaseResearchHandler({ enableUS: true });
    const result = await handler({ action: "search_us_cases" });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("query");
  });

  it("get_us_case_detail — opinion_id 누락 시 한글 에러", async () => {
    const handler = createForeignCaseResearchHandler({ enableUS: true });
    const result = await handler({ action: "get_us_case_detail" });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("opinion_id");
  });

  it("get_us_case_detail — opinion_id 비-숫자 시 안내 에러", async () => {
    const handler = createForeignCaseResearchHandler({ enableUS: true });
    const result = await handler({
      action: "get_us_case_detail",
      opinion_id: "abc",
    });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("양의 정수");
  });

  it("get_de_case_detail — de_case_id 누락 시 한글 에러 (case_id 아님)", async () => {
    const handler = createForeignCaseResearchHandler({ enableDE: true });
    const result = await handler({ action: "get_de_case_detail" });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("de_case_id");
  });

  it("US 비활성 상태에서 search_us_cases → 활성화 안내 한글 에러", async () => {
    const handler = createForeignCaseResearchHandler({
      enableUS: false,
      enableDE: true,
    });
    const result = await handler({
      action: "search_us_cases",
      query: "Miranda",
    });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("COURTLISTENER_API_TOKEN");
  });

  it("DE 비활성 상태에서 search_de_cases → 활성화 안내 한글 에러", async () => {
    const handler = createForeignCaseResearchHandler({
      enableUS: true,
      enableDE: false,
    });
    const result = await handler({
      action: "search_de_cases",
      query: "BGB",
    });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toMatch(
      /OPENLEGALDATA_API_TOKEN|FOREIGN_CASE_ENABLED/,
    );
  });
});

describe("search_us_cases — 출력 포맷 (정규화 + cursor)", () => {
  it("[원문: 영어] 마커, [opinion_id] 번호 매김, 한글 라벨, 총 건수 포맷", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({
          count: 110305,
          next: null,
          results: [
            {
              id: 67890,
              cluster_id: 12345,
              caseName: "Miranda v. Arizona",
              court: "Supreme Court of the United States",
              court_id: "scotus",
              dateFiled: "1966-06-13",
              citation: ["384 U.S. 436"],
              status: "Published",
              snippet: "You have the right to remain silent",
              absolute_url: "/opinion/67890/",
            },
          ],
        }),
      ),
    );

    const handler = createForeignCaseResearchHandler({ enableUS: true });
    const result = await handler({
      action: "search_us_cases",
      query: "Miranda",
    });

    const text = result.content[0].text;
    expect(text).toContain("[원문: 영어]");
    expect(text).toContain("미국 판례");
    expect(text).toContain("Miranda v. Arizona");
    expect(text).toContain("[67890]"); // opinion id (not cluster_id)
    expect(text).toContain("scotus");
    expect(text).toContain("Published");
    expect(text).toContain("총 110,305건");
    expect(text).toContain("get_us_case_detail");
    expect(text).toContain('opinion_id="67890"');
    expect(result.isError).toBeFalsy();
  });

  it("nextCursor 있으면 출력에 cursor= 안내 포함", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({
          count: 50,
          next: "https://www.courtlistener.com/api/rest/v4/search/?cursor=NEXT123&q=x",
          results: [
            {
              id: 1,
              cluster_id: 2,
              caseName: "X",
              court: "Court",
              court_id: "ca1",
            },
          ],
        }),
      ),
    );

    const handler = createForeignCaseResearchHandler({ enableUS: true });
    const result = await handler({ action: "search_us_cases", query: "x" });
    expect(result.content[0].text).toContain('cursor="NEXT123"');
  });

  it("0건 응답 한글 안내", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ count: 0, results: [] })),
    );

    const handler = createForeignCaseResearchHandler({ enableUS: true });
    const result = await handler({
      action: "search_us_cases",
      query: "nonexistent",
    });

    expect(result.content[0].text).toContain("미국 판례 검색 결과가 없습니다");
  });
});

describe("get_us_case_detail — 출력 포맷", () => {
  it("[원문: 영어] 마커 + plain_text 본문 8000자 윈도우", async () => {
    const longBody = "x".repeat(20000);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({
          id: 67890,
          plain_text: longBody,
          cluster: { id: 12345, case_name: "Miranda v. Arizona" },
        }),
      ),
    );

    const handler = createForeignCaseResearchHandler({ enableUS: true });
    const result = await handler({
      action: "get_us_case_detail",
      opinion_id: "67890",
    });

    const text = result.content[0].text;
    expect(text).toContain("[원문: 영어]");
    expect(text).toContain("Miranda v. Arizona");
    expect(text.length).toBeLessThan(20000);
    expect(text).toContain("이어서 보기");
    expect(text).toContain("offset=8000");
  });

  it("offset 파라미터로 본문 후속 윈도우 조회", async () => {
    const body = "0123456789".repeat(2000); // 20000자
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({ id: 67890, plain_text: body }),
      ),
    );

    const handler = createForeignCaseResearchHandler({ enableUS: true });
    const result = await handler({
      action: "get_us_case_detail",
      opinion_id: "67890",
      offset: 8000,
    });

    const text = result.content[0].text;
    expect(text).toContain("8,001~16,000자");
    expect(text).toContain("총 20,000자");
    expect(text).toContain("offset=16000");
  });

  it("마지막 윈도우는 hasMore=false → 이어서 보기 안내 없음", async () => {
    const body = "x".repeat(10000);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({ id: 67890, plain_text: body }),
      ),
    );

    const handler = createForeignCaseResearchHandler({ enableUS: true });
    const result = await handler({
      action: "get_us_case_detail",
      opinion_id: "67890",
      offset: 8000,
    });

    const text = result.content[0].text;
    expect(text).toContain("8,001~10,000자");
    expect(text).not.toContain("이어서 보기");
  });

  it("plain_text 비어 있으면 HTML fallback 사용 (stripped)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({
          id: 1,
          plain_text: "",
          html_with_citations: "<p>Fallback&nbsp;Text</p>",
        }),
      ),
    );

    const handler = createForeignCaseResearchHandler({ enableUS: true });
    const result = await handler({
      action: "get_us_case_detail",
      opinion_id: "1",
    });

    expect(result.content[0].text).toContain("Fallback");
    expect(result.content[0].text).not.toContain("<");
  });
});

describe("search_de_cases — 출력 포맷", () => {
  it("[원문: 독일어] 마커 + Aktenzeichen 라벨 + ECLI", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({
          count: 419984,
          results: [
            {
              id: 325566,
              slug: "lg-koln-2029-11-13-84-o-24918",
              court: {
                id: 812,
                name: "Landgericht Köln",
                slug: "lg-koln",
                jurisdiction: "Ordentliche Gerichtsbarkeit",
                level_of_appeal: "Landgericht",
              },
              file_number: "84 O 249/18",
              date: "2029-11-13",
              type: "Urteil",
              ecli: "ECLI:DE:LGK:2029:1113.84O249.18.00",
            },
          ],
        }),
      ),
    );

    const handler = createForeignCaseResearchHandler({ enableDE: true });
    const result = await handler({
      action: "search_de_cases",
      query: "Grundgesetz",
    });

    const text = result.content[0].text;
    expect(text).toContain("[원문: 독일어]");
    expect(text).toContain("독일 판례");
    expect(text).toContain("[325566]");
    expect(text).toContain("Landgericht Köln");
    expect(text).toContain("84 O 249/18");
    expect(text).toContain("ECLI:DE:LGK:2029:1113.84O249.18.00");
    expect(text).toContain("총 419,984건");
    expect(text).toContain("get_de_case_detail");
    expect(result.isError).toBeFalsy();
  });

  it("0건 응답 한글 안내", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ count: 0, results: [] })),
    );

    const handler = createForeignCaseResearchHandler({ enableDE: true });
    const result = await handler({
      action: "search_de_cases",
      query: "nichts",
    });

    expect(result.content[0].text).toContain("독일 판례 검색 결과가 없습니다");
  });
});

describe("get_de_case_detail — 출력 포맷", () => {
  it("[원문: 독일어] 마커 + 본문 truncate", async () => {
    const longBody = "x".repeat(20000);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({
          id: 67890,
          slug: "test",
          court: { id: 1, name: "BGH", slug: "bgh" },
          file_number: "VI ZR 1/20",
          date: "2020-01-01",
          type: "Urteil",
          content: longBody,
        }),
      ),
    );

    const handler = createForeignCaseResearchHandler({ enableDE: true });
    const result = await handler({
      action: "get_de_case_detail",
      de_case_id: "67890",
    });

    const text = result.content[0].text;
    expect(text).toContain("[원문: 독일어]");
    expect(text).toContain("이어서 보기");
    expect(text).toContain("offset=8000");
  });

  it("DE offset 파라미터로 후속 윈도우 조회", async () => {
    const body = "0123456789".repeat(2000);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({
          id: 67890,
          slug: "test",
          court: { id: 1, name: "BGH", slug: "bgh" },
          file_number: "X",
          date: "2020-01-01",
          type: "Urteil",
          content: body,
        }),
      ),
    );

    const handler = createForeignCaseResearchHandler({ enableDE: true });
    const result = await handler({
      action: "get_de_case_detail",
      de_case_id: "67890",
      offset: 8000,
    });

    const text = result.content[0].text;
    expect(text).toContain("8,001~16,000자");
    expect(text).toContain("offset=16000");
  });
});

describe("auth token wiring", () => {
  it("CourtListener 토큰이 fetch 헤더로 전달됨", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ count: 0, results: [] }));
    vi.stubGlobal("fetch", fetchMock);

    const handler = createForeignCaseResearchHandler({
      enableUS: true,
      courtlistenerApiToken: "tok-cl",
    });
    await handler({ action: "search_us_cases", query: "Miranda" });

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers["Authorization"]).toBe("Token tok-cl");
  });

  it("OpenLegalData 토큰이 fetch 헤더로 전달됨", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ count: 0, results: [] }));
    vi.stubGlobal("fetch", fetchMock);

    const handler = createForeignCaseResearchHandler({
      enableDE: true,
      openLegalDataApiToken: "tok-de",
    });
    await handler({ action: "search_de_cases", query: "BGB" });

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers["Authorization"]).toBe("Token tok-de");
  });
});
