import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../law-api.js", () => ({
  searchLaws: vi.fn(),
  getLawDetail: vi.fn(),
  searchAdminRules: vi.fn(),
  getAdminRuleDetail: vi.fn(),
  searchOrdinances: vi.fn(),
  getOrdinanceDetail: vi.fn(),
  searchTreaties: vi.fn(),
  getTreatyDetail: vi.fn(),
  searchLegalTerms: vi.fn(),
  getLegalTermDetail: vi.fn(),
  searchEnglishLaws: vi.fn(),
  getEnglishLawDetail: vi.fn(),
  searchAttachedForms: vi.fn(),
  searchLawAbbreviations: vi.fn(),
  getLawArticleSub: vi.fn(),
  searchAILegalTerms: vi.fn(),
  searchLinkedOrdinances: vi.fn(),
}));

import {
  searchLaws,
  getLawDetail,
  searchAdminRules,
  getAdminRuleDetail,
  searchOrdinances,
  getOrdinanceDetail,
  searchTreaties,
  getTreatyDetail,
  searchLegalTerms,
  getLegalTermDetail,
  searchEnglishLaws,
  getEnglishLawDetail,
  searchAttachedForms,
  searchLawAbbreviations,
  getLawArticleSub,
  searchAILegalTerms,
  searchLinkedOrdinances,
} from "../../law-api.js";
import { createLegalResearchHandler } from "./legal-research.js";

const MOCK_OC = "test-oc";

describe("legal_research 스킬", () => {
  let handler: ReturnType<typeof createLegalResearchHandler>;

  beforeEach(() => {
    vi.clearAllMocks();
    handler = createLegalResearchHandler(MOCK_OC);
  });

  // -- action 라우팅 --

  it("알수없는action_isError반환", async () => {
    const result = await handler({ action: "nonexistent" } as any);
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("알 수 없는 action");
  });

  // -- search_laws --

  it("search_laws_유효한검색_결과반환", async () => {
    vi.mocked(searchLaws).mockResolvedValue({
      items: [{ id: 1, lawName: "민법", lawId: "001", lawType: "법률", promulgationDate: "20200101", promulgationNumber: "17000", amendmentType: "일부개정", departmentName: "법무부", enforcementDate: "20200601", currentHistoryCode: "현행", lawAbbreviation: "", detailLink: "" }],
      totalCount: 1,
      currentPage: 1,
    });

    const result = await handler({ action: "search_laws", query: "민법" });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("법령 검색");
    expect(result.content[0].text).toContain("민법");
    expect(searchLaws).toHaveBeenCalledWith(MOCK_OC, expect.objectContaining({ query: "민법" }));
  });

  it("search_laws_빈결과_안내메시지", async () => {
    vi.mocked(searchLaws).mockResolvedValue({
      items: [],
      totalCount: 0,
      currentPage: 1,
    });

    const result = await handler({ action: "search_laws", query: "없는법" });
    expect(result.content[0].text).toContain("결과가 없습니다");
  });

  it("search_laws_query누락_에러", async () => {
    const result = await handler({ action: "search_laws" } as any);
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("query");
  });

  // -- get_law_detail --

  it("get_law_detail_유효한결과_포맷팅반환", async () => {
    vi.mocked(getLawDetail).mockResolvedValue({
      lawId: "001",
      lawName: "민법",
      lawType: "법률",
      departmentName: "법무부",
      enforcementDate: "20200601",
      promulgationDate: "20200101",
      promulgationNumber: "17000",
      amendmentType: "일부개정",
      articles: [{ articleNumber: "1", articleTitle: "제1조", articleContent: "이 법은 민법이라 한다." }],
    });

    const result = await handler({ action: "get_law_detail", law_id: 1 });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("민법");
    expect(getLawDetail).toHaveBeenCalledWith(MOCK_OC, 1);
  });

  it("get_law_detail_law_id누락_에러", async () => {
    const result = await handler({ action: "get_law_detail" } as any);
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("law_id");
  });

  // -- search_admin_rules --

  it("search_admin_rules_유효한결과_포맷팅반환", async () => {
    vi.mocked(searchAdminRules).mockResolvedValue({
      items: [{ id: 100, ruleName: "테스트행정규칙", ruleType: "훈령", issuanceDate: "20210101", issuanceNumber: "1", departmentName: "국세청", currentHistoryType: "현행", amendmentType: "제정", ruleId: "R001", enforcementDate: "20210101", detailLink: "" }],
      totalCount: 1,
      currentPage: 1,
    });

    const result = await handler({ action: "search_admin_rules", query: "행정규칙" });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("테스트행정규칙");
    expect(searchAdminRules).toHaveBeenCalledWith(MOCK_OC, expect.objectContaining({ query: "행정규칙" }));
  });

  // -- get_admin_rule_detail --

  it("get_admin_rule_detail_유효한결과_포맷팅반환", async () => {
    vi.mocked(getAdminRuleDetail).mockResolvedValue({
      id: 100,
      ruleName: "테스트행정규칙",
      ruleType: "훈령",
      issuanceDate: "20210101",
      issuanceNumber: "1",
      departmentName: "국세청",
      amendmentType: "제정",
      content: "",
    });

    const result = await handler({ action: "get_admin_rule_detail", admrul_id: 100 });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("테스트행정규칙");
    expect(getAdminRuleDetail).toHaveBeenCalledWith(MOCK_OC, 100);
  });

  // -- search_ordinances --

  it("search_ordinances_유효한결과_포맷팅반환", async () => {
    vi.mocked(searchOrdinances).mockResolvedValue({
      items: [{ id: 200, ordinanceName: "서울시조례", ordinanceId: "O001", promulgationDate: "20210301", promulgationNumber: "5000", amendmentType: "일부개정", localGovName: "서울특별시", ordinanceType: "조례", enforcementDate: "20210401", detailLink: "" }],
      totalCount: 1,
      currentPage: 1,
    });

    const result = await handler({ action: "search_ordinances", query: "서울시" });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("서울시조례");
    expect(searchOrdinances).toHaveBeenCalledWith(MOCK_OC, expect.objectContaining({ query: "서울시" }));
  });

  // -- get_ordinance_detail --

  it("get_ordinance_detail_유효한결과_포맷팅반환", async () => {
    vi.mocked(getOrdinanceDetail).mockResolvedValue({
      ordinanceId: "ORD001",
      ordinanceName: "서울시테스트조례",
      localGovName: "서울특별시",
      promulgationDate: "20210301",
      enforcementDate: "20210401",
      articles: [],
    });

    const result = await handler({ action: "get_ordinance_detail", ordin_id: 200 });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("ORD001");
    expect(getOrdinanceDetail).toHaveBeenCalledWith(MOCK_OC, 200);
  });

  // -- search_treaties --

  it("search_treaties_유효한결과_포맷팅반환", async () => {
    vi.mocked(searchTreaties).mockResolvedValue({
      items: [{ id: 300, treatyName: "한미FTA", treatyType: "다자", effectiveDate: "20120315", signDate: "20110630", treatyNumber: "2100", detailLink: "" }],
      totalCount: 1,
      currentPage: 1,
    });

    const result = await handler({ action: "search_treaties", query: "FTA" });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("한미FTA");
    expect(searchTreaties).toHaveBeenCalledWith(MOCK_OC, expect.objectContaining({ query: "FTA" }));
  });

  // -- get_treaty_detail --

  it("get_treaty_detail_유효한결과_포맷팅반환", async () => {
    vi.mocked(getTreatyDetail).mockResolvedValue({
      id: 300,
      treatyNameKo: "한미FTA",
      treatyNameEn: "KORUS FTA",
      effectiveDate: "20120315",
      signDate: "20110630",
      treatyNumber: "2100",
      counterpartyCountry: "미국",
      treatyField: "경제",
      content: "",
    });

    const result = await handler({ action: "get_treaty_detail", treaty_id: 300 });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("2100");
    expect(getTreatyDetail).toHaveBeenCalledWith(MOCK_OC, 300);
  });

  // -- search_legal_terms --

  it("search_legal_terms_유효한결과_포맷팅반환", async () => {
    vi.mocked(searchLegalTerms).mockResolvedValue({
      items: [{ id: "T001", termName: "선의취득", detailLink: "" }],
      totalCount: 1,
      currentPage: 1,
    });

    const result = await handler({ action: "search_legal_terms", query: "선의취득" });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("선의취득");
    expect(searchLegalTerms).toHaveBeenCalledWith(MOCK_OC, expect.objectContaining({ query: "선의취득" }));
  });

  // -- get_legal_term_detail --

  it("get_legal_term_detail_term_id누락_에러", async () => {
    const result = await handler({ action: "get_legal_term_detail" } as any);
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("term_id");
  });

  it("get_legal_term_detail_유효한결과_포맷팅반환", async () => {
    vi.mocked(getLegalTermDetail).mockResolvedValue({
      id: "T001",
      termName: "선의취득",
      termNameHanja: "善意取得",
      definition: "물건의 점유를 취득한 자가 선의이면...",
      source: "민법",
    });

    const result = await handler({ action: "get_legal_term_detail", term_id: "T001" });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("선의취득");
    expect(getLegalTermDetail).toHaveBeenCalledWith(MOCK_OC, "T001");
  });

  // -- search_english_laws --

  it("search_english_laws_유효한결과_포맷팅반환", async () => {
    vi.mocked(searchEnglishLaws).mockResolvedValue({
      items: [{ id: 400, lawNameKo: "민법", lawNameEn: "Civil Act", lawId: "E001", promulgationDate: "20200101", promulgationNumber: "17000", amendmentType: "일부개정", departmentName: "법무부", lawType: "법률", enforcementDate: "20200601", currentHistoryCode: "현행", detailLink: "" }],
      totalCount: 1,
      currentPage: 1,
    });

    const result = await handler({ action: "search_english_laws", query: "Civil Act" });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("Civil Act");
    expect(searchEnglishLaws).toHaveBeenCalledWith(MOCK_OC, expect.objectContaining({ query: "Civil Act" }));
  });

  // -- get_english_law_detail --

  it("get_english_law_detail_유효한결과_포맷팅반환", async () => {
    vi.mocked(getEnglishLawDetail).mockResolvedValue({
      lawId: "E001",
      lawNameEn: "Civil Act",
      promulgationDate: "20200101",
      promulgationNumber: "17000",
      articles: [],
    });

    const result = await handler({ action: "get_english_law_detail", law_id: 400 });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("E001");
    expect(getEnglishLawDetail).toHaveBeenCalledWith(MOCK_OC, 400);
  });

  // -- search_attached_forms --

  it("search_attached_forms_유효한결과_포맷팅반환", async () => {
    vi.mocked(searchAttachedForms).mockResolvedValue({
      items: [{ id: 500, relatedLawId: 1, formName: "별표1", relatedLawName: "민법", formNumber: "1", formType: "별표", departmentName: "법무부", promulgationDate: "20200101", amendmentType: "일부개정", lawType: "법률", fileLink: "", detailLink: "" }],
      totalCount: 1,
      currentPage: 1,
    });

    const result = await handler({ action: "search_attached_forms", query: "별표" });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("별표1");
    expect(searchAttachedForms).toHaveBeenCalledWith(MOCK_OC, expect.objectContaining({ query: "별표" }));
  });

  // -- search_law_abbreviations --

  it("search_law_abbreviations_query없이호출_가능", async () => {
    vi.mocked(searchLawAbbreviations).mockResolvedValue({
      items: [{ id: 600, currentHistoryCode: "현행", lawName: "민법", abbreviation: "민", lawId: "L001", promulgationDate: "20200101", promulgationNumber: "17000", amendmentType: "일부개정", registrationDate: "20200101", departmentCode: "D01", departmentName: "법무부", lawType: "법률", enforcementDate: "20200601", selfOtherLaw: "자법", detailLink: "" }],
      totalCount: 1,
      currentPage: 1,
    });

    const result = await handler({ action: "search_law_abbreviations" });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("민법");
    expect(searchLawAbbreviations).toHaveBeenCalledWith(MOCK_OC, expect.any(Object));
  });

  // -- get_law_article_sub --

  it("get_law_article_sub_law_id_article누락_에러", async () => {
    const result = await handler({ action: "get_law_article_sub" } as any);
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("law_id");
  });

  it("get_law_article_sub_article누락_에러", async () => {
    const result = await handler({ action: "get_law_article_sub", law_id: 1 } as any);
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("article");
  });

  it("get_law_article_sub_유효한결과_포맷팅반환", async () => {
    vi.mocked(getLawArticleSub).mockResolvedValue({
      lawKey: "K001",
      lawId: "001",
      promulgationDate: "20200101",
      promulgationNumber: "17000",
      language: "ko",
      lawNameKo: "민법",
      lawNameHanja: "",
      lawTypeCode: "01",
      lawTypeName: "법률",
      departmentName: "법무부",
      enforcementDate: "20200601",
      articleNumber: "1",
      articleContent: "이 법은 민법이라 한다.",
      paragraphNumber: "",
      paragraphContent: "",
      clauseNumber: "",
      clauseContent: "",
      subclauseNumber: "",
      subclauseContent: "",
    });

    const result = await handler({ action: "get_law_article_sub", law_id: 1, article: "1" });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("민법");
    expect(getLawArticleSub).toHaveBeenCalledWith(MOCK_OC, expect.objectContaining({ lawId: 1, jo: "1" }));
  });

  // -- search_ai_legal_terms --

  it("search_ai_legal_terms_유효한결과_포맷팅반환", async () => {
    vi.mocked(searchAILegalTerms).mockResolvedValue({
      items: [{ termName: "선의", homonymExists: "Y", remarks: "", termRelationLink: "", articleRelationLink: "" }],
      totalCount: 1,
      currentPage: 1,
    });

    const result = await handler({ action: "search_ai_legal_terms", query: "선의" });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("선의");
    expect(searchAILegalTerms).toHaveBeenCalledWith(MOCK_OC, expect.objectContaining({ query: "선의" }));
  });

  // -- search_linked_ordinances --

  it("search_linked_ordinances_유효한결과_포맷팅반환", async () => {
    vi.mocked(searchLinkedOrdinances).mockResolvedValue({
      items: [{ id: 700, ordinanceName: "연계조례", ordinanceId: "LO001", promulgationDate: "20210601", promulgationNumber: "100", amendmentType: "제정", ordinanceType: "조례", enforcementDate: "20210701" }],
      totalCount: 1,
      currentPage: 1,
    });

    const result = await handler({ action: "search_linked_ordinances", query: "연계" });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("연계조례");
    expect(searchLinkedOrdinances).toHaveBeenCalledWith(MOCK_OC, expect.objectContaining({ query: "연계" }));
  });

  // -- API 에러 처리 --

  it("API예외_errorResponse반환", async () => {
    vi.mocked(searchLaws).mockRejectedValue(new Error("Network timeout"));

    const result = await handler({ action: "search_laws", query: "민법" });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Network timeout");
  });
});
