import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../law-api.js", () => ({
  searchOldNewLaw: vi.fn(),
  getOldNewLawDetail: vi.fn(),
  searchLawSystem: vi.fn(),
  getLawSystemDetail: vi.fn(),
  searchThreeWayComp: vi.fn(),
  getThreeWayCompDetail: vi.fn(),
  searchLawChangeHistory: vi.fn(),
  searchAdminRuleOldNew: vi.fn(),
  getAdminRuleOldNewDetail: vi.fn(),
}));

import {
  searchOldNewLaw,
  getOldNewLawDetail,
  searchLawSystem,
  getLawSystemDetail,
  searchThreeWayComp,
  getThreeWayCompDetail,
  searchLawChangeHistory,
  searchAdminRuleOldNew,
  getAdminRuleOldNewDetail,
} from "../../law-api.js";
import { createLawAmendmentHandler } from "./law-amendment.js";

const OC = "test-oc";

describe("law_amendment 스킬", () => {
  let handler: ReturnType<typeof createLawAmendmentHandler>;

  beforeEach(() => {
    vi.clearAllMocks();
    handler = createLawAmendmentHandler(OC);
  });

  it("알수없는action_isError반환", async () => {
    const result = await handler({ action: "nonexistent" } as any);
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("알 수 없는 action");
  });

  it("search_old_new_law_유효한결과_포맷팅반환", async () => {
    vi.mocked(searchOldNewLaw).mockResolvedValue({
      totalCount: 1,
      currentPage: 1,
      items: [{
        id: 100, lawName: "민법", lawType: "법률",
        amendmentType: "일부개정", promulgationDate: "20260101",
        enforcementDate: "20260701", departmentName: "법무부",
      }],
    } as any);

    const result = await handler({ action: "search_old_new_law", query: "민법" });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("민법");
    expect(result.content[0].text).toContain("신구법비교 검색 결과");
    expect(searchOldNewLaw).toHaveBeenCalledWith(OC, { query: "민법", page: 1, display: 20 });
  });

  it("search_old_new_law_빈items_결과없음", async () => {
    vi.mocked(searchOldNewLaw).mockResolvedValue({ totalCount: 0, currentPage: 1, items: [] } as any);
    const r = await handler({ action: "search_old_new_law", query: "없는법" });
    expect(r.isError).toBeUndefined();
    expect(r.content[0].text).toContain("신구법비교 검색 결과가 없습니다");
  });

  it("search_old_new_law_query누락_에러", async () => {
    const result = await handler({ action: "search_old_new_law" } as any);
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("query");
  });

  it("get_old_new_law_detail_유효한결과_포맷팅반환", async () => {
    vi.mocked(getOldNewLawDetail).mockResolvedValue({
      newBasicInfo: { lawName: "민법", enforcementDate: "20260701", promulgationDate: "20260101", amendmentType: "일부개정" },
      oldBasicInfo: { lawName: "민법", enforcementDate: "20250101", promulgationDate: "20240601", amendmentType: "타법개정" },
      oldArticles: "제1조 구조문",
      newArticles: "제1조 신조문",
    } as any);

    const result = await handler({ action: "get_old_new_law_detail", oldnew_id: 100 });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("신구법비교");
    expect(result.content[0].text).toContain("구조문");
    expect(result.content[0].text).toContain("신조문");
    expect(getOldNewLawDetail).toHaveBeenCalledWith(OC, 100);
  });

  it("get_old_new_law_detail_oldnew_id누락_에러", async () => {
    const result = await handler({ action: "get_old_new_law_detail" } as any);
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("oldnew_id");
  });

  it("search_law_system_유효한결과_포맷팅반환", async () => {
    vi.mocked(searchLawSystem).mockResolvedValue({
      totalCount: 1,
      currentPage: 1,
      items: [{
        id: 200, lawName: "상법", lawType: "법률",
        departmentName: "법무부", enforcementDate: "20260101",
      }],
    } as any);

    const result = await handler({ action: "search_law_system", query: "상법" });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("법령 체계도 검색 결과");
    expect(searchLawSystem).toHaveBeenCalledWith(OC, { query: "상법", page: 1, display: 20 });
  });

  it("get_law_system_detail_유효한결과_포맷팅반환", async () => {
    vi.mocked(getLawSystemDetail).mockResolvedValue({
      basicInfo: {
        lawName: "상법", lawId: 200, lawType: "법률",
        enforcementDate: "20260101", promulgationDate: "20250601",
      },
      hierarchy: "상법 > 상법 시행령 > 상법 시행규칙",
    } as any);

    const result = await handler({ action: "get_law_system_detail", law_id: 200 });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("법령 체계도");
    expect(result.content[0].text).toContain("상하위법 체계");
    expect(getLawSystemDetail).toHaveBeenCalledWith(OC, 200);
  });

  it("search_law_system_빈items_결과없음", async () => {
    vi.mocked(searchLawSystem).mockResolvedValue({ totalCount: 0, currentPage: 1, items: [] } as any);
    const r = await handler({ action: "search_law_system", query: "없는법" });
    expect(r.isError).toBeUndefined();
    expect(r.content[0].text).toContain("법령 체계도 검색 결과가 없습니다");
  });

  it("search_three_way_comp_유효한결과_포맷팅반환", async () => {
    vi.mocked(searchThreeWayComp).mockResolvedValue({
      totalCount: 1,
      currentPage: 1,
      items: [{
        id: 300, lawName: "국세기본법", lawType: "법률",
        departmentName: "기획재정부", enforcementDate: "20260101",
      }],
    } as any);

    const result = await handler({ action: "search_three_way_comp", query: "국세기본법" });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("3단비교 검색 결과");
    expect(searchThreeWayComp).toHaveBeenCalledWith(OC, { query: "국세기본법", page: 1, display: 20 });
  });

  it("search_three_way_comp_빈items_결과없음", async () => {
    vi.mocked(searchThreeWayComp).mockResolvedValue({ totalCount: 0, currentPage: 1, items: [] } as any);
    const r = await handler({ action: "search_three_way_comp", query: "없는법" });
    expect(r.isError).toBeUndefined();
    expect(r.content[0].text).toContain("3단비교 검색 결과가 없습니다");
  });

  it("get_three_way_comp_detail_comparison_type전달_위임조문", async () => {
    vi.mocked(getThreeWayCompDetail).mockResolvedValue({
      basicInfo: { lawName: "국세기본법", decreeName: "국세기본법 시행령", ruleName: "국세기본법 시행규칙", comparisonExists: "Y" },
      content: "위임조문 비교 내용",
    } as any);

    const result = await handler({ action: "get_three_way_comp_detail", law_id: 300, comparison_type: "delegation" });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("위임조문");
    expect(getThreeWayCompDetail).toHaveBeenCalledWith(OC, 300, 2);
  });

  it("search_law_change_history_date누락_에러", async () => {
    const result = await handler({ action: "search_law_change_history" } as any);
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("date");
  });

  it("search_law_change_history_유효한결과_포맷팅반환", async () => {
    vi.mocked(searchLawChangeHistory).mockResolvedValue({
      totalCount: 2,
      currentPage: 1,
      items: [{
        id: 400, lawName: "소득세법", lawType: "법률",
        amendmentType: "일부개정", promulgationDate: "20260101",
        enforcementDate: "20260101", departmentName: "기획재정부",
      }],
    } as any);

    const result = await handler({ action: "search_law_change_history", date: "20260101" });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("법령 변경이력");
    expect(result.content[0].text).toContain("20260101");
    expect(searchLawChangeHistory).toHaveBeenCalledWith(OC, { regDt: "20260101", page: 1, display: 20 });
  });

  it("search_law_change_history_빈items_결과없음", async () => {
    vi.mocked(searchLawChangeHistory).mockResolvedValue({ totalCount: 0, currentPage: 1, items: [] } as any);
    const r = await handler({ action: "search_law_change_history", date: "20990101" });
    expect(r.isError).toBeUndefined();
    expect(r.content[0].text).toContain("변경된 법령이 없습니다");
  });

  it("search_admin_rule_old_new_유효한결과_포맷팅반환", async () => {
    vi.mocked(searchAdminRuleOldNew).mockResolvedValue({
      totalCount: 1,
      currentPage: 1,
      items: [{
        id: 500, ruleName: "법인세법 시행규칙 별표", lawType: "행정규칙",
        amendmentType: "일부개정", issuanceDate: "20260101",
        enforcementDate: "20260301", departmentName: "국세청",
      }],
    } as any);

    const result = await handler({ action: "search_admin_rule_old_new", query: "법인세법" });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("행정규칙 신구법비교 검색 결과");
    expect(searchAdminRuleOldNew).toHaveBeenCalledWith(OC, { query: "법인세법", page: 1, display: 20 });
  });

  it("search_admin_rule_old_new_빈items_결과없음", async () => {
    vi.mocked(searchAdminRuleOldNew).mockResolvedValue({ totalCount: 0, currentPage: 1, items: [] } as any);
    const r = await handler({ action: "search_admin_rule_old_new", query: "없는규칙" });
    expect(r.isError).toBeUndefined();
    expect(r.content[0].text).toContain("행정규칙 신구법비교 검색 결과가 없습니다");
  });

  it("get_admin_rule_old_new_detail_유효한결과_포맷팅반환", async () => {
    vi.mocked(getAdminRuleOldNewDetail).mockResolvedValue({
      newBasicInfo: { ruleName: "법인세법 시행규칙", enforcementDate: "20260301", issuanceDate: "20260101" },
      oldBasicInfo: { ruleName: "법인세법 시행규칙", enforcementDate: "20250101", issuanceDate: "20240601" },
      oldArticles: "구 조문 내용",
      newArticles: "신 조문 내용",
    } as any);

    const result = await handler({ action: "get_admin_rule_old_new_detail", oldnew_id: 500 });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("행정규칙 신구법비교");
    expect(result.content[0].text).toContain("구조문");
    expect(result.content[0].text).toContain("신조문");
    expect(getAdminRuleOldNewDetail).toHaveBeenCalledWith(OC, 500);
  });

  it("API예외_errorResponse반환", async () => {
    vi.mocked(searchOldNewLaw).mockRejectedValue(new Error("Network timeout"));

    const result = await handler({ action: "search_old_new_law", query: "민법" });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Network timeout");
  });
});
