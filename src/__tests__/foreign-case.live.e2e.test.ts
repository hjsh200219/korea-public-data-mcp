/**
 * 실 API e2e 테스트 — CourtListener + OpenLegalData
 *
 * 기본은 skip. 활성화하려면:
 *   RUN_LIVE_TESTS=1 npx vitest run src/__tests__/foreign-case.live.e2e.test.ts
 *
 * CourtListener는 토큰 권장 (시간당 5,000건):
 *   COURTLISTENER_API_TOKEN=<token>
 * OpenLegalData는 익명 접근 가능.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { searchUSCases, getUSCaseDetail } from "../courtlistener-api.js";
import { searchDECases, getDECaseDetail } from "../openlegaldata-api.js";
import { resetThrottleState } from "../http-client.js";

const LIVE = process.env.RUN_LIVE_TESTS === "1";
const desc = LIVE ? describe : describe.skip;

beforeEach(() => {
  resetThrottleState();
});

desc("CourtListener live", () => {
  const token = process.env.COURTLISTENER_API_TOKEN;

  it("searchUSCases('Miranda') → 결과가 1건 이상", async () => {
    const result = await searchUSCases({ query: "Miranda", pageSize: 3 }, token);
    expect(result.count).toBeGreaterThan(0);
    expect(result.results.length).toBeGreaterThan(0);
    const first = result.results[0];
    expect(first.cluster_id).toBeTypeOf("number");
    expect(first.caseName).toBeTypeOf("string");
    expect(first.court_id).toBeTypeOf("string");
  }, 30000);

  it("searchUSCases({court:'scotus'}) → 결과 모두 scotus", async () => {
    const result = await searchUSCases(
      { query: "freedom", court: "scotus", pageSize: 5 },
      token,
    );
    expect(result.results.length).toBeGreaterThan(0);
    for (const item of result.results) {
      expect(item.court_id).toBe("scotus");
    }
  }, 30000);

  it.skipIf(!process.env.COURTLISTENER_API_TOKEN)(
    "getUSCaseDetail(opinion_id) → 본문 또는 메타 반환 [requires token]",
    async () => {
      // 동적으로 검색에서 ID 확보 후 상세 조회
      const search = await searchUSCases(
        { query: "Miranda", pageSize: 1 },
        token,
      );
      const opinionId = search.results[0]?.opinions?.[0]?.id;
      if (opinionId === undefined) {
        throw new Error("검색 결과에 opinion id 없음 — fixture 갱신 필요");
      }

      const detail = await getUSCaseDetail(String(opinionId), token);
      expect(detail.id).toBe(opinionId);
      const body = detail.plain_text || detail.html_lawbox || detail.html;
      expect(body).toBeTruthy();
      expect(body!.length).toBeGreaterThan(100);
    },
    30000,
  );
});

desc("OpenLegalData live", () => {
  it("searchDECases('Grundgesetz') → 결과가 1건 이상", async () => {
    const result = await searchDECases({ query: "Grundgesetz", pageSize: 3 });
    expect(result.count).toBeGreaterThan(0);
    expect(result.results.length).toBeGreaterThan(0);
    const first = result.results[0];
    expect(first.id).toBeTypeOf("number");
    expect(first.file_number).toBeTypeOf("string");
    expect(first.court).toBeDefined();
    expect(first.court.name).toBeTypeOf("string");
  }, 30000);

  it("getDECaseDetail(case_id) → 메타 반환", async () => {
    const search = await searchDECases({ query: "Grundgesetz", pageSize: 1 });
    const caseId = search.results[0]?.id;
    if (caseId === undefined) {
      throw new Error("검색 결과에 case id 없음");
    }

    const detail = await getDECaseDetail(String(caseId));
    expect(detail.id).toBe(caseId);
    expect(detail.file_number).toBeTypeOf("string");
    expect(detail.court).toBeDefined();
  }, 30000);
});
