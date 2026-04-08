import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../dart-api.js", () => ({
  resolveCorpCode: vi.fn(),
  searchDisclosures: vi.fn(),
  getCompanyInfo: vi.fn(),
  getFinancialStatements: vi.fn(),
  getKeyAccounts: vi.fn(),
  getDisclosureDocument: vi.fn(),
}));

vi.mock("../../data20-api.js", () => ({
  searchStockDividend: vi.fn(),
}));

import {
  resolveCorpCode,
  searchDisclosures,
  getCompanyInfo,
  getFinancialStatements,
  getKeyAccounts,
  getDisclosureDocument,
} from "../../dart-api.js";
import { searchStockDividend } from "../../data20-api.js";
import { createCorporateDisclosureHandler } from "./corporate-disclosure.js";

describe("corporate_disclosure 스킬", () => {
  let handler: ReturnType<typeof createCorporateDisclosureHandler>;

  beforeEach(() => {
    vi.clearAllMocks();
    handler = createCorporateDisclosureHandler("dart-key", "data20-key");
  });

  it("알수없는action_isError반환", async () => {
    const result = await handler({ action: "nonexistent" } as any);
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("알 수 없는 action");
  });

  it("resolve_corp_code_유효한결과_포맷팅반환", async () => {
    vi.mocked(resolveCorpCode).mockResolvedValue([
      { corpCode: "00126380", corpName: "삼성전자", stockCode: "005930", modifyDate: "20240101" },
    ]);

    const result = await handler({ action: "resolve_corp_code", corp_name: "삼성전자" });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("삼성전자");
    expect(result.content[0].text).toContain("00126380");
    expect(resolveCorpCode).toHaveBeenCalledWith("dart-key", "삼성전자");
  });

  it("resolve_corp_code_빈배열_결과없음", async () => {
    vi.mocked(resolveCorpCode).mockResolvedValue([]);
    const r = await handler({ action: "resolve_corp_code", corp_name: "없는회사" });
    expect(r.isError).toBeUndefined();
    expect(r.content[0].text).toContain("검색 결과가 없습니다");
  });

  it("resolve_corp_code_corp_name누락_에러", async () => {
    const result = await handler({ action: "resolve_corp_code" } as any);
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("corp_name");
  });

  it("search_disclosures_유효한결과_포맷팅반환", async () => {
    vi.mocked(searchDisclosures).mockResolvedValue({
      status: "000",
      message: "정상",
      page_no: 1,
      page_count: 20,
      total_count: 1,
      total_page: 1,
      list: [{
        corp_code: "00126380",
        corp_name: "삼성전자",
        stock_code: "005930",
        corp_cls: "Y",
        report_nm: "사업보고서",
        rcept_no: "20240315000001",
        flr_nm: "삼성전자",
        rcept_dt: "20240315",
        rm: "",
      }],
    } as any);

    const result = await handler({ action: "search_disclosures", corp_code: "00126380" });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("공시보고서 검색결과");
    expect(result.content[0].text).toContain("삼성전자");
    expect(searchDisclosures).toHaveBeenCalledWith("dart-key", expect.objectContaining({ corp_code: "00126380" }));
  });

  it("search_disclosures_빈list_결과없음", async () => {
    vi.mocked(searchDisclosures).mockResolvedValue({ status: "000", list: [], total_count: 0, page_no: 1, total_page: 0 } as any);
    const r = await handler({ action: "search_disclosures", corp_code: "00126380" });
    expect(r.isError).toBeUndefined();
    expect(r.content[0].text).toContain("공시보고서가 없습니다");
  });

  it("get_company_info_유효한결과_포맷팅반환", async () => {
    vi.mocked(getCompanyInfo).mockResolvedValue({
      status: "000",
      corp_name: "삼성전자",
      corp_name_eng: "Samsung Electronics",
      stock_name: "삼성전자",
      stock_code: "005930",
      ceo_nm: "한종희",
      corp_cls: "Y",
      jurir_no: "1301110006246",
      bizr_no: "1248100998",
      adres: "경기도 수원시",
      hm_url: "www.samsung.com",
      phn_no: "031-200-1114",
      induty_code: "26410",
      est_dt: "19690113",
      acc_mt: "12",
    } as any);

    const result = await handler({ action: "get_company_info", corp_code: "00126380" });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("삼성전자");
    expect(result.content[0].text).toContain("유가증권");
    expect(getCompanyInfo).toHaveBeenCalledWith("dart-key", "00126380");
  });

  it("get_financial_statements_유효한결과_포맷팅반환", async () => {
    vi.mocked(getFinancialStatements).mockResolvedValue({
      status: "000",
      list: [{
        sj_nm: "재무상태표",
        account_nm: "자산총계",
        account_detail: "-",
        thstrm_amount: "400000000000",
        frmtrm_amount: "380000000000",
        bfefrmtrm_amount: "360000000000",
      }],
    } as any);

    const result = await handler({
      action: "get_financial_statements",
      corp_code: "00126380",
      bsns_year: "2023",
      reprt_code: "11011",
    });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("2023년 재무제표");
    expect(result.content[0].text).toContain("자산총계");
    expect(getFinancialStatements).toHaveBeenCalledWith("dart-key", expect.objectContaining({
      corp_code: "00126380",
      bsns_year: "2023",
      reprt_code: "11011",
    }));
  });

  it("get_financial_statements_빈list_결과없음", async () => {
    vi.mocked(getFinancialStatements).mockResolvedValue({ status: "000", list: [] } as any);
    const r = await handler({
      action: "get_financial_statements",
      corp_code: "00126380",
      bsns_year: "2023",
      reprt_code: "11011",
    });
    expect(r.isError).toBeUndefined();
    expect(r.content[0].text).toContain("재무제표 데이터가 없습니다");
  });

  it("get_document_유효한결과_포맷팅반환", async () => {
    vi.mocked(getDisclosureDocument).mockResolvedValue({
      rcept_no: "20240315000001",
      files: [{ filename: "main.html", content: "본문 내용입니다." }],
      summary: "본문 내용입니다.",
    });

    const result = await handler({ action: "get_document", rcept_no: "20240315000001" });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("공시서류 본문");
    expect(result.content[0].text).toContain("20240315000001");
    expect(getDisclosureDocument).toHaveBeenCalledWith("dart-key", "20240315000001");
  });

  it("get_key_accounts_유효한결과_포맷팅반환", async () => {
    vi.mocked(getKeyAccounts).mockResolvedValue({
      status: "000",
      list: [{
        sj_nm: "손익계산서",
        account_nm: "매출액",
        thstrm_amount: "300000000000",
        frmtrm_amount: "280000000000",
        bfefrmtrm_amount: "260000000000",
      }],
    } as any);

    const result = await handler({
      action: "get_key_accounts",
      corp_code: "00126380",
      bsns_year: "2023",
      reprt_code: "11011",
    });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("2023년 주요계정");
    expect(result.content[0].text).toContain("매출액");
    expect(getKeyAccounts).toHaveBeenCalledWith("dart-key", expect.objectContaining({
      corp_code: "00126380",
      bsns_year: "2023",
      reprt_code: "11011",
    }));
  });

  it("get_key_accounts_빈list_결과없음", async () => {
    vi.mocked(getKeyAccounts).mockResolvedValue({ status: "000", list: [] } as any);
    const r = await handler({
      action: "get_key_accounts",
      corp_code: "00126380",
      bsns_year: "2023",
      reprt_code: "11011",
    });
    expect(r.isError).toBeUndefined();
    expect(r.content[0].text).toContain("주요계정 데이터가 없습니다");
  });

  it("search_stock_dividend_유효한결과_포맷팅반환", async () => {
    vi.mocked(searchStockDividend).mockResolvedValue({
      totalCount: 1,
      pageNo: 1,
      numOfRows: 10,
      items: [{
        stckIssuCmpyNm: "삼성전자",
        dvdnBasDt: "20231231",
        stckDvdnRcdNm: "현금배당",
        stckParPrc: "100",
        stckGenrDvdnAmt: "1444",
        stckGenrCashDvdnRt: "28.88",
        cashDvdnPayDt: "20240418",
      }],
    } as any);

    const result = await handler({ action: "search_stock_dividend", stckIssuCmpyNm: "삼성전자" });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("주식배당정보");
    expect(result.content[0].text).toContain("삼성전자");
    expect(searchStockDividend).toHaveBeenCalledWith("data20-key", expect.objectContaining({ stckIssuCmpyNm: "삼성전자" }));
  });

  it("search_stock_dividend_빈items_결과없음", async () => {
    vi.mocked(searchStockDividend).mockResolvedValue({ totalCount: 0, pageNo: 1, numOfRows: 10, items: [] } as any);
    const r = await handler({ action: "search_stock_dividend", stckIssuCmpyNm: "없음" });
    expect(r.isError).toBeUndefined();
    expect(r.content[0].text).toContain("검색 결과가 없습니다");
  });

  it("DART_action_dartApiKey없음_에러", async () => {
    const noKeyHandler = createCorporateDisclosureHandler(undefined, "data20-key");
    const result = await noKeyHandler({ action: "resolve_corp_code", corp_name: "삼성" });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("DART_API_KEY가 설정되지 않았습니다");
  });

  it("search_stock_dividend_data20ServiceKey없음_에러", async () => {
    const noKeyHandler = createCorporateDisclosureHandler("dart-key", undefined);
    const result = await noKeyHandler({ action: "search_stock_dividend", stckIssuCmpyNm: "삼성" });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("DATA20_SERVICE_KEY가 설정되지 않았습니다");
  });

  it("API예외_errorResponse반환", async () => {
    vi.mocked(resolveCorpCode).mockRejectedValue(new Error("Network timeout"));

    const result = await handler({ action: "resolve_corp_code", corp_name: "삼성" });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Network timeout");
  });
});
