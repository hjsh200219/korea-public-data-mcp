import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../finlife-api.js", () => ({
  fetchCompanies: vi.fn(),
  fetchDepositProducts: vi.fn(),
  fetchSavingProducts: vi.fn(),
  fetchAnnuityProducts: vi.fn(),
  fetchMortgageLoanProducts: vi.fn(),
  fetchRentHouseLoanProducts: vi.fn(),
  fetchCreditLoanProducts: vi.fn(),
}));

import {
  fetchCompanies,
  fetchDepositProducts,
  fetchSavingProducts,
  fetchAnnuityProducts,
  fetchMortgageLoanProducts,
  fetchRentHouseLoanProducts,
  fetchCreditLoanProducts,
} from "../../finlife-api.js";
import { createFinancialProductHandler } from "./financial-product.js";

const MOCK_KEY = "test-finlife-key";
const TOP_GRP = "020000" as const;

const depositLikeBase = {
  dcls_month: "202401",
  fin_co_no: "0010001",
  fin_prdt_cd: "P001",
  kor_co_nm: "테스트은행",
  fin_prdt_nm: "정기예금",
  join_way: "인터넷",
  mtrt_int: "만기후 이자율",
  spcl_cnd: "우대조건",
  join_deny: "1",
  join_member: "실명 개인",
  etc_note: "비고",
  max_limit: 10000000,
  dcls_strt_day: "20240101",
  dcls_end_day: null,
  fin_co_subm_day: "20240115",
};

const depositOption = {
  dcls_month: "202401",
  fin_co_no: "0010001",
  fin_prdt_cd: "P001",
  intr_rate_type: "S",
  intr_rate_type_nm: "단리",
  save_trm: "12",
  intr_rate: 3.5,
  intr_rate2: 4.0,
};

describe("financial_product 스킬", () => {
  let handler: ReturnType<typeof createFinancialProductHandler>;

  beforeEach(() => {
    vi.clearAllMocks();
    handler = createFinancialProductHandler(MOCK_KEY);
  });

  it("알수없는action_isError반환", async () => {
    const result = await handler({ action: "nonexistent" } as any);
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("알 수 없는 action");
  });

  it("company_유효한결과_포맷팅반환", async () => {
    vi.mocked(fetchCompanies).mockResolvedValue({
      baseList: [{
        kor_co_nm: "테스트은행",
        fin_co_no: "0010001",
        cal_tel: "1588-0000",
        homp_url: "https://example.com",
      }],
      optionList: [{
        fin_co_no: "0010001",
        area_cd: "11",
        area_nm: "서울",
        exis_yn: "Y",
      }],
      nowPageNo: 1,
      maxPageNo: 1,
      totalCount: 1,
    } as any);

    const result = await handler({ action: "company", top_fin_grp_no: TOP_GRP });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("금융회사");
    expect(result.content[0].text).toContain("테스트은행");
    expect(result.content[0].text).toContain("0010001");
    expect(fetchCompanies).toHaveBeenCalledWith(
      MOCK_KEY,
      expect.objectContaining({ topFinGrpNo: TOP_GRP }),
    );
  });

  it("deposit_유효한결과_포맷팅반환", async () => {
    vi.mocked(fetchDepositProducts).mockResolvedValue({
      baseList: [depositLikeBase],
      optionList: [depositOption],
      nowPageNo: 1,
      maxPageNo: 1,
      totalCount: 1,
    } as any);

    const result = await handler({ action: "deposit", top_fin_grp_no: TOP_GRP });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("정기예금");
    expect(result.content[0].text).toContain("테스트은행");
    expect(result.content[0].text).toContain("12개월");
    expect(result.content[0].text).toContain("단리");
    expect(fetchDepositProducts).toHaveBeenCalledWith(
      MOCK_KEY,
      expect.objectContaining({ topFinGrpNo: TOP_GRP }),
    );
  });

  it("saving_유효한결과_포맷팅반환", async () => {
    vi.mocked(fetchSavingProducts).mockResolvedValue({
      baseList: [{ ...depositLikeBase, fin_prdt_nm: "자유적금" }],
      optionList: [{
        ...depositOption,
        rsrv_type: "F",
        rsrv_type_nm: "자유적립",
      }],
      nowPageNo: 1,
      maxPageNo: 1,
      totalCount: 1,
    } as any);

    const result = await handler({ action: "saving", top_fin_grp_no: TOP_GRP });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("적금");
    expect(result.content[0].text).toContain("자유적금");
    expect(result.content[0].text).toContain("자유적립");
    expect(fetchSavingProducts).toHaveBeenCalledWith(
      MOCK_KEY,
      expect.objectContaining({ topFinGrpNo: TOP_GRP }),
    );
  });

  it("annuity_유효한결과_포맷팅반환", async () => {
    vi.mocked(fetchAnnuityProducts).mockResolvedValue({
      baseList: [{
        ...depositLikeBase,
        fin_prdt_nm: "연금저축상품",
        pnsn_kind: "01",
        pnsn_kind_nm: "개인연금",
        sale_strt_day: "20200101",
        mntn_cnt: 1,
        prdt_type: "T",
        prdt_type_nm: "혼합형",
        avg_prft_rate: 2.5,
        dcls_rate: "1.5",
        guar_rate: "0.5",
        btrm_prft_rate_1: 1.1,
        btrm_prft_rate_2: null,
        btrm_prft_rate_3: null,
        etc: "",
        sale_co: "판매사",
      }],
      optionList: [{
        dcls_month: "202401",
        fin_co_no: "0010001",
        fin_prdt_cd: "P001",
        pnsn_recp_trm: "10",
        pnsn_recp_trm_nm: "10년",
        pnsn_entr_age: "30",
        pnsn_entr_age_nm: "30",
        mon_paym_atm: "1",
        mon_paym_atm_nm: "10만원",
        paym_prd: "20",
        paym_prd_nm: "20년",
        pnsn_strt_age: "55",
        pnsn_strt_age_nm: "55",
        pnsn_recp_amt: 500000,
      }],
      nowPageNo: 1,
      maxPageNo: 1,
      totalCount: 1,
    } as any);

    const result = await handler({ action: "annuity", top_fin_grp_no: TOP_GRP });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("연금저축");
    expect(result.content[0].text).toContain("개인연금");
    expect(result.content[0].text).toContain("500,000");
    expect(fetchAnnuityProducts).toHaveBeenCalledWith(
      MOCK_KEY,
      expect.objectContaining({ topFinGrpNo: TOP_GRP }),
    );
  });

  it("mortgage_loan_유효한결과_포맷팅반환", async () => {
    vi.mocked(fetchMortgageLoanProducts).mockResolvedValue({
      baseList: [{
        ...depositLikeBase,
        fin_prdt_nm: "주담대",
        loan_inci_expn: "인지세",
        erly_rpay_fee: "1%",
        dly_rate: "연 10%",
        loan_lmt: "5억",
      }],
      optionList: [{
        dcls_month: "202401",
        fin_co_no: "0010001",
        fin_prdt_cd: "P001",
        mrtg_type: "A",
        mrtg_type_nm: "아파트",
        rpay_type: "S",
        rpay_type_nm: "분할상환",
        lend_rate_type: "F",
        lend_rate_type_nm: "고정",
        lend_rate_min: 3.1,
        lend_rate_max: 4.2,
        lend_rate_avg: 3.7,
      }],
      nowPageNo: 1,
      maxPageNo: 1,
      totalCount: 1,
    } as any);

    const result = await handler({ action: "mortgage_loan", top_fin_grp_no: TOP_GRP });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("주택담보대출");
    expect(result.content[0].text).toContain("아파트");
    expect(result.content[0].text).toContain("고정");
    expect(fetchMortgageLoanProducts).toHaveBeenCalledWith(
      MOCK_KEY,
      expect.objectContaining({ topFinGrpNo: TOP_GRP }),
    );
  });

  it("rent_house_loan_유효한결과_포맷팅반환", async () => {
    vi.mocked(fetchRentHouseLoanProducts).mockResolvedValue({
      baseList: [{
        ...depositLikeBase,
        fin_prdt_nm: "전세대출",
        loan_inci_expn: "인지세",
        erly_rpay_fee: "0.5%",
        dly_rate: "연 9%",
        loan_lmt: "3억",
      }],
      optionList: [{
        dcls_month: "202401",
        fin_co_no: "0010001",
        fin_prdt_cd: "P001",
        rpay_type: "D",
        rpay_type_nm: "만기일시",
        lend_rate_type: "C",
        lend_rate_type_nm: "변동",
        lend_rate_min: 2.9,
        lend_rate_max: 3.9,
        lend_rate_avg: 3.4,
      }],
      nowPageNo: 1,
      maxPageNo: 1,
      totalCount: 1,
    } as any);

    const result = await handler({ action: "rent_house_loan", top_fin_grp_no: TOP_GRP });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("전세자금대출");
    expect(result.content[0].text).toContain("만기일시");
    expect(result.content[0].text).toContain("변동");
    expect(fetchRentHouseLoanProducts).toHaveBeenCalledWith(
      MOCK_KEY,
      expect.objectContaining({ topFinGrpNo: TOP_GRP }),
    );
  });

  it("credit_loan_유효한결과_포맷팅반환", async () => {
    vi.mocked(fetchCreditLoanProducts).mockResolvedValue({
      baseList: [{
        ...depositLikeBase,
        fin_prdt_nm: "신용대출",
        crdt_prdt_type: "C",
        crdt_prdt_type_nm: "일반신용",
        cb_name: "NICE",
      }],
      optionList: [{
        dcls_month: "202401",
        fin_co_no: "0010001",
        fin_prdt_cd: "P001",
        crdt_prdt_type: "C",
        crdt_lend_rate_type: "1",
        crdt_lend_rate_type_nm: "고정금리형",
        crdt_grad_1: 2.1,
        crdt_grad_4: 3.0,
        crdt_grad_5: null,
        crdt_grad_6: null,
        crdt_grad_10: 5.0,
        crdt_grad_11: null,
        crdt_grad_12: null,
        crdt_grad_13: null,
        crdt_grad_avg: 4.0,
      }],
      nowPageNo: 1,
      maxPageNo: 1,
      totalCount: 1,
    } as any);

    const result = await handler({ action: "credit_loan", top_fin_grp_no: TOP_GRP });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("개인신용대출");
    expect(result.content[0].text).toContain("일반신용");
    expect(result.content[0].text).toContain("NICE");
    expect(fetchCreditLoanProducts).toHaveBeenCalledWith(
      MOCK_KEY,
      expect.objectContaining({ topFinGrpNo: TOP_GRP }),
    );
  });

  it("company_top_fin_grp_no누락_에러", async () => {
    const result = await handler({ action: "company" } as any);
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("top_fin_grp_no");
  });

  it("deposit_top_fin_grp_no누락_에러", async () => {
    const result = await handler({ action: "deposit" } as any);
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("top_fin_grp_no");
  });

  it("saving_top_fin_grp_no누락_에러", async () => {
    const result = await handler({ action: "saving" } as any);
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("top_fin_grp_no");
  });

  it("annuity_top_fin_grp_no누락_에러", async () => {
    const result = await handler({ action: "annuity" } as any);
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("top_fin_grp_no");
  });

  it("mortgage_loan_top_fin_grp_no누락_에러", async () => {
    const result = await handler({ action: "mortgage_loan" } as any);
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("top_fin_grp_no");
  });

  it("rent_house_loan_top_fin_grp_no누락_에러", async () => {
    const result = await handler({ action: "rent_house_loan" } as any);
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("top_fin_grp_no");
  });

  it("credit_loan_top_fin_grp_no누락_에러", async () => {
    const result = await handler({ action: "credit_loan" } as any);
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("top_fin_grp_no");
  });

  it("company_baseList빈값_빈결과메시지", async () => {
    vi.mocked(fetchCompanies).mockResolvedValue({
      baseList: [],
      optionList: [],
      nowPageNo: 1,
      maxPageNo: 1,
      totalCount: 0,
    } as any);

    const result = await handler({ action: "company", top_fin_grp_no: TOP_GRP });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("금융회사 검색 결과가 없습니다");
    expect(result.content[0].text).toContain("top_fin_grp_no");
  });

  it("deposit_baseList빈값_빈결과메시지", async () => {
    vi.mocked(fetchDepositProducts).mockResolvedValue({
      baseList: [],
      optionList: [],
      nowPageNo: 1,
      maxPageNo: 1,
      totalCount: 0,
    } as any);

    const result = await handler({ action: "deposit", top_fin_grp_no: TOP_GRP });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("정기예금 검색 결과가 없습니다");
  });

  it("saving_baseList빈값_빈결과메시지", async () => {
    vi.mocked(fetchSavingProducts).mockResolvedValue({
      baseList: [],
      optionList: [],
      nowPageNo: 1,
      maxPageNo: 1,
      totalCount: 0,
    } as any);

    const result = await handler({ action: "saving", top_fin_grp_no: TOP_GRP });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("적금 검색 결과가 없습니다");
  });

  it("annuity_baseList빈값_빈결과메시지", async () => {
    vi.mocked(fetchAnnuityProducts).mockResolvedValue({
      baseList: [],
      optionList: [],
      nowPageNo: 1,
      maxPageNo: 1,
      totalCount: 0,
    } as any);

    const result = await handler({ action: "annuity", top_fin_grp_no: TOP_GRP });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("연금저축 검색 결과가 없습니다");
  });

  it("mortgage_loan_baseList빈값_빈결과메시지", async () => {
    vi.mocked(fetchMortgageLoanProducts).mockResolvedValue({
      baseList: [],
      optionList: [],
      nowPageNo: 1,
      maxPageNo: 1,
      totalCount: 0,
    } as any);

    const result = await handler({ action: "mortgage_loan", top_fin_grp_no: TOP_GRP });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("주택담보대출 검색 결과가 없습니다");
  });

  it("rent_house_loan_baseList빈값_빈결과메시지", async () => {
    vi.mocked(fetchRentHouseLoanProducts).mockResolvedValue({
      baseList: [],
      optionList: [],
      nowPageNo: 1,
      maxPageNo: 1,
      totalCount: 0,
    } as any);

    const result = await handler({ action: "rent_house_loan", top_fin_grp_no: TOP_GRP });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("전세자금대출 검색 결과가 없습니다");
  });

  it("credit_loan_baseList빈값_빈결과메시지", async () => {
    vi.mocked(fetchCreditLoanProducts).mockResolvedValue({
      baseList: [],
      optionList: [],
      nowPageNo: 1,
      maxPageNo: 1,
      totalCount: 0,
    } as any);

    const result = await handler({ action: "credit_loan", top_fin_grp_no: TOP_GRP });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("개인신용대출 검색 결과가 없습니다");
  });

  it("deposit_API예외_errorResponse반환", async () => {
    vi.mocked(fetchDepositProducts).mockRejectedValue(new Error("FINLIFE timeout"));

    const result = await handler({ action: "deposit", top_fin_grp_no: TOP_GRP });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("정기예금 조회");
    expect(result.content[0].text).toContain("FINLIFE timeout");
  });
});
