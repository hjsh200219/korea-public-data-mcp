import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../law-api.js", () => ({
  searchCases: vi.fn(),
  getCaseDetail: vi.fn(),
  searchConstitutional: vi.fn(),
  getConstitutionalDetail: vi.fn(),
  searchInterpretations: vi.fn(),
  getInterpretationDetail: vi.fn(),
  searchCommitteeDecisions: vi.fn(),
  getCommitteeDecisionDetail: vi.fn(),
  getCommitteeName: vi.fn().mockReturnValue("공정거래위원회"),
  searchAdminAppeals: vi.fn(),
  getAdminAppealDetail: vi.fn(),
}));

import {
  searchCases, getCaseDetail,
  searchConstitutional, getConstitutionalDetail,
  searchInterpretations, getInterpretationDetail,
  searchCommitteeDecisions, getCommitteeDecisionDetail,
  searchAdminAppeals, getAdminAppealDetail,
} from "../../law-api.js";
import { createCaseResearchHandler } from "./case-research.js";

const OC = "test-oc";

describe("case_research 스킬", () => {
  let handler: ReturnType<typeof createCaseResearchHandler>;

  beforeEach(() => {
    vi.clearAllMocks();
    handler = createCaseResearchHandler(OC);
  });

  it("알수없는action_isError반환", async () => {
    const result = await handler({ action: "nonexistent" } as any);
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("알 수 없는 action");
  });

  it("search_cases_유효한결과_포맷팅반환", async () => {
    vi.mocked(searchCases).mockResolvedValue({
      totalCount: 1, currentPage: 1,
      items: [{
        id: 100, caseName: "대법원 2024다12345", caseNumber: "2024다12345",
        courtName: "대법원", decisionDate: "20240501", verdict: "판결",
        caseType: "민사", verdictType: "선고",
      }],
    } as any);

    const result = await handler({ action: "search_cases", query: "임대차" });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("판례 검색 결과");
    expect(result.content[0].text).toContain("대법원 2024다12345");
    expect(searchCases).toHaveBeenCalledWith(OC, expect.objectContaining({ query: "임대차" }));
  });

  it("search_cases_query누락_에러", async () => {
    const result = await handler({ action: "search_cases" } as any);
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("query");
  });

  it("get_case_detail_유효한결과_sections필터링", async () => {
    vi.mocked(getCaseDetail).mockResolvedValue({
      caseName: "대법원 2024다12345", caseNumber: "2024다12345",
      courtName: "대법원", decisionDate: "20240501", verdict: "판결",
      caseType: "민사", verdictType: "선고",
      holdings: "판시사항 내용", summary: "판결요지 내용",
      referenceLaws: "민법 제123조", referenceCases: null, content: "전문 내용",
    } as any);

    const result = await handler({
      action: "get_case_detail", case_id: 100, sections: ["holdings", "summary"],
    });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("판시사항");
    expect(result.content[0].text).toContain("판결요지");
    expect(result.content[0].text).not.toContain("참조조문");
    expect(getCaseDetail).toHaveBeenCalledWith(OC, 100);
  });

  it("get_case_detail_case_id누락_에러", async () => {
    const result = await handler({ action: "get_case_detail" } as any);
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("case_id");
  });

  it("search_constitutional_유효한결과_포맷팅반환", async () => {
    vi.mocked(searchConstitutional).mockResolvedValue({
      totalCount: 1, currentPage: 1,
      items: [{ id: 200, caseName: "2024헌바1", caseNumber: "2024헌바1", conclusionDate: "20240601" }],
    } as any);

    const result = await handler({ action: "search_constitutional", query: "위헌" });
    expect(result.content[0].text).toContain("헌재결정례 검색 결과");
    expect(result.content[0].text).toContain("2024헌바1");
  });

  it("get_constitutional_detail_유효한결과_포맷팅반환", async () => {
    vi.mocked(getConstitutionalDetail).mockResolvedValue({
      caseName: "2024헌바1", caseNumber: "2024헌바1",
      conclusionDate: "20240601", caseType: "헌법소원",
      holdings: "판시사항", decisionSummary: "결정요지",
      fullText: null, referenceLaws: null, referenceCases: null,
    } as any);

    const result = await handler({ action: "get_constitutional_detail", detc_id: 200 });
    expect(result.content[0].text).toContain("결정요지");
  });

  it("search_interpretations_유효한결과_포맷팅반환", async () => {
    vi.mocked(searchInterpretations).mockResolvedValue({
      totalCount: 1, currentPage: 1,
      items: [{
        id: 300, title: "민법 해석례", caseNumber: "22-0001",
        inquiryOrg: "국토부", replyOrg: "법제처", replyDate: "20220301",
      }],
    } as any);

    const result = await handler({ action: "search_interpretations", query: "민법" });
    expect(result.content[0].text).toContain("법령해석례 검색 결과");
    expect(result.content[0].text).toContain("민법 해석례");
  });

  it("get_interpretation_detail_유효한결과_포맷팅반환", async () => {
    vi.mocked(getInterpretationDetail).mockResolvedValue({
      title: "민법 해석례", caseNumber: "22-0001",
      interpretationDate: "20220301", interpretationOrg: "법제처", inquiryOrg: "국토부",
      inquirySummary: "질의요지 내용", reply: "회답 내용", reason: "이유 내용",
    } as any);

    const result = await handler({ action: "get_interpretation_detail", expc_id: 300 });
    expect(result.content[0].text).toContain("질의요지");
    expect(result.content[0].text).toContain("회답");
  });

  it("search_committee_decisions_유효한결과_committee필수", async () => {
    vi.mocked(searchCommitteeDecisions).mockResolvedValue({
      totalCount: 1, currentPage: 1,
      items: [{ id: 400, title: "공정위 결정", caseNumber: "2024-001", decisionDate: "20240101" }],
    } as any);

    const result = await handler({ action: "search_committee_decisions", committee: "ftc" });
    expect(result.content[0].text).toContain("공정거래위원회");
    expect(result.content[0].text).toContain("공정위 결정");

    const errResult = await handler({ action: "search_committee_decisions" } as any);
    expect(errResult.isError).toBe(true);
    expect(errResult.content[0].text).toContain("committee");
  });

  it("get_committee_decision_detail_유효한결과_포맷팅반환", async () => {
    vi.mocked(getCommitteeDecisionDetail).mockResolvedValue({
      title: "공정위 시정명령", agencyName: "공정거래위원회",
      caseNumber: "2024-001", decisionDate: "20240101",
      extras: { 피심인: "A사" },
      summary: "요지 내용", ruling: "시정명령", reason: "이유 내용",
    } as any);

    const result = await handler({
      action: "get_committee_decision_detail", committee: "ftc", decision_id: 400,
    });
    expect(result.content[0].text).toContain("시정명령");
    expect(result.content[0].text).toContain("피심인");
  });

  it("search_admin_appeals_유효한결과_포맷팅반환", async () => {
    vi.mocked(searchAdminAppeals).mockResolvedValue({
      totalCount: 1, currentPage: 1,
      items: [{
        id: 500, caseName: "건축허가취소", caseNumber: "2024-500",
        decisionDate: "20240701", decisionAgency: "중앙행정심판위",
        decisionType: "인용", dispositionAgency: "서울시",
      }],
    } as any);

    const result = await handler({ action: "search_admin_appeals", query: "건축허가" });
    expect(result.content[0].text).toContain("행정심판례 검색 결과");
    expect(result.content[0].text).toContain("건축허가취소");
  });

  it("get_admin_appeal_detail_유효한결과_포맷팅반환", async () => {
    vi.mocked(getAdminAppealDetail).mockResolvedValue({
      caseName: "건축허가취소", caseNumber: "2024-500",
      decisionDate: "20240701", decisionAgency: "중앙행정심판위",
      decisionTypeName: "인용",
      dispositionDate: "20240101", dispositionAgency: "서울시",
      summary: "재결요지 내용", claim: "청구취지 내용",
      ruling: "주문 내용", reason: "이유 내용",
    } as any);

    const result = await handler({ action: "get_admin_appeal_detail", decc_id: 500 });
    expect(result.content[0].text).toContain("재결요지");
    expect(result.content[0].text).toContain("주문");
  });

  it("search_cases_빈items_결과없음", async () => {
    vi.mocked(searchCases).mockResolvedValue({ totalCount: 0, currentPage: 1, items: [] } as any);
    const r = await handler({ action: "search_cases", query: "없음" });
    expect(r.isError).toBeUndefined();
    expect(r.content[0].text).toContain("없");
  });

  it("search_constitutional_빈items_결과없음", async () => {
    vi.mocked(searchConstitutional).mockResolvedValue({ totalCount: 0, currentPage: 1, items: [] } as any);
    const r = await handler({ action: "search_constitutional", query: "없음" });
    expect(r.isError).toBeUndefined();
    expect(r.content[0].text).toContain("없");
  });

  it("search_interpretations_빈items_결과없음", async () => {
    vi.mocked(searchInterpretations).mockResolvedValue({ totalCount: 0, currentPage: 1, items: [] } as any);
    const r = await handler({ action: "search_interpretations", query: "없음" });
    expect(r.isError).toBeUndefined();
    expect(r.content[0].text).toContain("없");
  });

  it("search_committee_decisions_빈items_결과없음", async () => {
    vi.mocked(searchCommitteeDecisions).mockResolvedValue({ totalCount: 0, currentPage: 1, items: [] } as any);
    const r = await handler({ action: "search_committee_decisions", committee: "ftc" });
    expect(r.isError).toBeUndefined();
    expect(r.content[0].text).toContain("없");
  });

  it("search_admin_appeals_빈items_결과없음", async () => {
    vi.mocked(searchAdminAppeals).mockResolvedValue({ totalCount: 0, currentPage: 1, items: [] } as any);
    const r = await handler({ action: "search_admin_appeals", query: "없음" });
    expect(r.isError).toBeUndefined();
    expect(r.content[0].text).toContain("없");
  });

  it("API예외_errorResponse반환", async () => {
    vi.mocked(searchCases).mockRejectedValue(new Error("Network timeout"));

    const result = await handler({ action: "search_cases", query: "테스트" });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Network timeout");
  });
});
