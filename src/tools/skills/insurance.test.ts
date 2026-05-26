import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../insurance-api.js", () => ({
  searchMedicalReimbursementInsurance: vi.fn(),
  searchPropertyInsuJoin: vi.fn(),
  searchAutoContract: vi.fn(),
  searchAutoLosCircumstance: vi.fn(),
  searchAutoVictim: vi.fn(),
  searchVariableInsuranceFund: vi.fn(),
  searchLifeInsuJoinStatus: vi.fn(),
  searchIndividualAnnuityInsu: vi.fn(),
  searchRetirementPensionFund: vi.fn(),
}));

import {
  searchMedicalReimbursementInsurance,
  searchPropertyInsuJoin,
  searchAutoContract,
  searchAutoLosCircumstance,
  searchAutoVictim,
  searchVariableInsuranceFund,
  searchLifeInsuJoinStatus,
  searchIndividualAnnuityInsu,
  searchRetirementPensionFund,
} from "../../insurance-api.js";
import { createInsuranceHandler } from "./insurance.js";

describe("insurance 스킬", () => {
  let handler: ReturnType<typeof createInsuranceHandler>;

  beforeEach(() => {
    vi.clearAllMocks();
    handler = createInsuranceHandler("test-key");
  });

  it("알수없는action_isError반환", async () => {
    const result = await handler({ action: "nonexistent" } as any);
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("알 수 없는 action");
  });

  it("medical_reimbursement_유효한결과_포맷팅반환", async () => {
    vi.mocked(searchMedicalReimbursementInsurance).mockResolvedValue({
      totalCount: 1,
      pageNo: 1,
      numOfRows: 10,
      items: [{
        cmpyNm: "테스트생명",
        prdNm: "실손의료비",
        ptrn: "개인",
        mog: "실손",
        age: "30",
        mlInsRt: 10000,
        fmlInsRt: 12000,
        basDt: "20260101",
        ofrInstNm: "금융위원회",
      }],
    } as any);

    const result = await handler({
      action: "medical_reimbursement",
      page_no: 1,
      num_of_rows: 10,
    });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("실손보험정보");
    expect(result.content[0].text).toContain("테스트생명");
    expect(result.content[0].text).toContain("실손의료비");
    expect(searchMedicalReimbursementInsurance).toHaveBeenCalledWith(
      "test-key",
      expect.objectContaining({ pageNo: 1, numOfRows: 10 }),
    );
  });

  it("property_insu_join_유효한결과_포맷팅반환", async () => {
    vi.mocked(searchPropertyInsuJoin).mockResolvedValue({
      totalCount: 1,
      pageNo: 1,
      numOfRows: 10,
      items: [{
        sttsAccmlTrgtYr: "2024",
        mogClsfNm: "화재",
        objcClsfNm: "주택",
        cntrCnt: 100,
        inpm: 5000000,
      }],
    } as any);

    const result = await handler({
      action: "property_insu_join",
      page_no: 1,
      num_of_rows: 10,
    });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("일반손해보험 가입정보");
    expect(result.content[0].text).toContain("2024");
    expect(result.content[0].text).toContain("화재");
    expect(searchPropertyInsuJoin).toHaveBeenCalledWith(
      "test-key",
      expect.objectContaining({ pageNo: 1, numOfRows: 10 }),
    );
  });

  it("auto_contract_유효한결과_포맷팅반환", async () => {
    vi.mocked(searchAutoContract).mockResolvedValue({
      totalCount: 1,
      pageNo: 1,
      numOfRows: 10,
      items: [{
        isuCmpyOfrYm: "202601",
        isuItmsNm: "책임",
        mogClsfNm: "대인",
        atmbPlorNm: "개인",
        kncrNm: "승용차",
        sexNm: "남",
        aggr: "40대",
        joinCnt: 50,
        elpsInpm: 300000,
      }],
    } as any);

    const result = await handler({
      action: "auto_contract",
      page_no: 1,
      num_of_rows: 10,
    });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("자동차보험 계약정보");
    expect(result.content[0].text).toContain("202601");
    expect(result.content[0].text).toContain("승용차");
    expect(searchAutoContract).toHaveBeenCalledWith(
      "test-key",
      expect.objectContaining({ pageNo: 1, numOfRows: 10 }),
    );
  });

  it("auto_los_circumstance_유효한결과_포맷팅반환", async () => {
    vi.mocked(searchAutoLosCircumstance).mockResolvedValue({
      totalCount: 1,
      pageNo: 1,
      numOfRows: 10,
      items: [{
        isuCmpyOfrYm: "202601",
        isuItmsNm: "종합",
        mogClsfNm: "대물",
        kncrNm: "화물",
        losAmt: 1000000,
        injPtlCnt: 2,
        dthTotlCnt: 0,
      }],
    } as any);

    const result = await handler({
      action: "auto_los_circumstance",
      page_no: 1,
      num_of_rows: 10,
    });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("자동차보험 사고현황");
    expect(result.content[0].text).toContain("화물");
    expect(searchAutoLosCircumstance).toHaveBeenCalledWith(
      "test-key",
      expect.objectContaining({ pageNo: 1, numOfRows: 10 }),
    );
  });

  it("auto_victim_유효한결과_포맷팅반환", async () => {
    vi.mocked(searchAutoVictim).mockResolvedValue({
      totalCount: 1,
      pageNo: 1,
      numOfRows: 10,
      items: [{
        atmbAcdnCnlsYm: "202601",
        dthInjClsfNm: "부상",
        impYn: "Y",
        injLvlcntCd: "1",
        impLvlcntCd: "2",
        victimCnt: 3,
      }],
    } as any);

    const result = await handler({
      action: "auto_victim",
      page_no: 1,
      num_of_rows: 10,
    });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("자동차보험 피해자 정보");
    expect(result.content[0].text).toContain("부상");
    expect(searchAutoVictim).toHaveBeenCalledWith(
      "test-key",
      expect.objectContaining({ pageNo: 1, numOfRows: 10 }),
    );
  });

  it("variable_insurance_fund_유효한결과_포맷팅반환", async () => {
    vi.mocked(searchVariableInsuranceFund).mockResolvedValue({
      totalCount: 1,
      pageNo: 1,
      numOfRows: 10,
      items: [{
        cmpyNm: "변액생명",
        fndNm: "성장펀드",
        cmpyCd: "C01",
        fndCd: "F01",
        basDt: "20260101",
        basprc: "1000",
        nPptAmt: "500억",
      }],
    } as any);

    const result = await handler({
      action: "variable_insurance_fund",
      page_no: 1,
      num_of_rows: 10,
    });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("변액보험 펀드정보");
    expect(result.content[0].text).toContain("변액생명");
    expect(result.content[0].text).toContain("성장펀드");
    expect(searchVariableInsuranceFund).toHaveBeenCalledWith(
      "test-key",
      expect.objectContaining({ pageNo: 1, numOfRows: 10 }),
    );
  });

  it("life_insu_join_status_유효한결과_포맷팅반환", async () => {
    vi.mocked(searchLifeInsuJoinStatus).mockResolvedValue({
      totalCount: 1,
      pageNo: 1,
      numOfRows: 10,
      items: [{
        sttsAccmlTrgtYr: "2024",
        isuKindNm: "종신",
        areaNm: "서울",
        sexNm: "여",
        rchnAggr: "50대",
        joinCnt: 1000,
        joinRto: 12.5,
      }],
    } as any);

    const result = await handler({
      action: "life_insu_join_status",
      page_no: 1,
      num_of_rows: 10,
    });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("생명보험 가입현황");
    expect(result.content[0].text).toContain("종신");
    expect(result.content[0].text).toContain("서울");
    expect(searchLifeInsuJoinStatus).toHaveBeenCalledWith(
      "test-key",
      expect.objectContaining({ pageNo: 1, numOfRows: 10 }),
    );
  });

  it("individual_annuity_insu_유효한결과_포맷팅반환", async () => {
    vi.mocked(searchIndividualAnnuityInsu).mockResolvedValue({
      totalCount: 1,
      pageNo: 1,
      numOfRows: 10,
      items: [{
        sttsAccmlTrgtYr: "2024",
        rchnAggr: "40대",
        taxPrqlYn: "Y",
        pymtMthNm: "월납",
        offrTyNm: "설계사",
        yerUnitPymtTerm: "20년",
        joinCnt: 200,
      }],
    } as any);

    const result = await handler({
      action: "individual_annuity_insu",
      page_no: 1,
      num_of_rows: 10,
    });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("개인연금보험 가입정보");
    expect(result.content[0].text).toContain("월납");
    expect(result.content[0].text).toContain("설계사");
    expect(searchIndividualAnnuityInsu).toHaveBeenCalledWith(
      "test-key",
      expect.objectContaining({ pageNo: 1, numOfRows: 10 }),
    );
  });

  it("retirement_pension_fund_유효한결과_포맷팅반환", async () => {
    vi.mocked(searchRetirementPensionFund).mockResolvedValue({
      totalCount: 1,
      pageNo: 1,
      numOfRows: 10,
      items: [{
        cmpyNm: "퇴직운용",
        fndNm: "안정형",
        cmpyCd: "R01",
        fndCd: "RF1",
        basDt: "20260101",
        basprc: "2000",
        nPptAmt: "1조",
        ofrInstNm: "금융위원회",
      }],
    } as any);

    const result = await handler({
      action: "retirement_pension_fund",
      page_no: 1,
      num_of_rows: 10,
    });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("퇴직연금 펀드정보");
    expect(result.content[0].text).toContain("퇴직운용");
    expect(result.content[0].text).toContain("안정형");
    expect(searchRetirementPensionFund).toHaveBeenCalledWith(
      "test-key",
      expect.objectContaining({ pageNo: 1, numOfRows: 10 }),
    );
  });

  it("medical_reimbursement_빈결과_메시지", async () => {
    vi.mocked(searchMedicalReimbursementInsurance).mockResolvedValue({
      totalCount: 0,
      pageNo: 1,
      numOfRows: 10,
      items: [],
    });

    const result = await handler({
      action: "medical_reimbursement",
      cmpy_nm: "없는회사",
    });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("실손보험정보 검색 결과가 없습니다");
    expect(result.content[0].text).toContain("cmpy_nm");
  });

  it("property_insu_join_빈결과_메시지", async () => {
    vi.mocked(searchPropertyInsuJoin).mockResolvedValue({
      totalCount: 0,
      pageNo: 1,
      numOfRows: 10,
      items: [],
    });

    const result = await handler({ action: "property_insu_join" });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("일반손해보험 가입정보 검색 결과가 없습니다");
  });

  it("auto_contract_빈결과_메시지", async () => {
    vi.mocked(searchAutoContract).mockResolvedValue({
      totalCount: 0,
      pageNo: 1,
      numOfRows: 10,
      items: [],
    });

    const result = await handler({ action: "auto_contract" });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("자동차보험 계약정보 검색 결과가 없습니다");
  });

  it("auto_los_circumstance_빈결과_메시지", async () => {
    vi.mocked(searchAutoLosCircumstance).mockResolvedValue({
      totalCount: 0,
      pageNo: 1,
      numOfRows: 10,
      items: [],
    });

    const result = await handler({ action: "auto_los_circumstance" });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("자동차보험 사고현황 검색 결과가 없습니다");
  });

  it("auto_victim_빈결과_메시지", async () => {
    vi.mocked(searchAutoVictim).mockResolvedValue({
      totalCount: 0,
      pageNo: 1,
      numOfRows: 10,
      items: [],
    });

    const result = await handler({ action: "auto_victim" });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("자동차보험 피해자 정보 검색 결과가 없습니다");
  });

  it("variable_insurance_fund_빈결과_메시지", async () => {
    vi.mocked(searchVariableInsuranceFund).mockResolvedValue({
      totalCount: 0,
      pageNo: 1,
      numOfRows: 10,
      items: [],
    });

    const result = await handler({ action: "variable_insurance_fund" });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("변액보험 펀드정보 검색 결과가 없습니다");
  });

  it("life_insu_join_status_빈결과_메시지", async () => {
    vi.mocked(searchLifeInsuJoinStatus).mockResolvedValue({
      totalCount: 0,
      pageNo: 1,
      numOfRows: 10,
      items: [],
    });

    const result = await handler({ action: "life_insu_join_status" });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("생명보험 가입현황 검색 결과가 없습니다");
  });

  it("individual_annuity_insu_빈결과_메시지", async () => {
    vi.mocked(searchIndividualAnnuityInsu).mockResolvedValue({
      totalCount: 0,
      pageNo: 1,
      numOfRows: 10,
      items: [],
    });

    const result = await handler({ action: "individual_annuity_insu" });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("개인연금보험 가입정보 검색 결과가 없습니다");
  });

  it("retirement_pension_fund_빈결과_메시지", async () => {
    vi.mocked(searchRetirementPensionFund).mockResolvedValue({
      totalCount: 0,
      pageNo: 1,
      numOfRows: 10,
      items: [],
    });

    const result = await handler({ action: "retirement_pension_fund" });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("퇴직연금 펀드정보 검색 결과가 없습니다");
  });

  it("API예외_errorResponse반환", async () => {
    vi.mocked(searchMedicalReimbursementInsurance).mockRejectedValue(
      new Error("API rate limit"),
    );

    const result = await handler({ action: "medical_reimbursement" });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("실손보험정보 조회 오류");
    expect(result.content[0].text).toContain("API rate limit");
  });

  it("medical_reimbursement + like_prd_nm: 서버 무시 → 클라이언트 prdNm 필터 폴백", async () => {
    // 서버는 likePrdNm 무시 (실API 검증) — 클라이언트가 prdNm includes(like_prd_nm)로 재필터
    vi.mocked(searchMedicalReimbursementInsurance).mockResolvedValue({
      totalCount: 3,
      pageNo: 1,
      numOfRows: 100,
      items: [
        { cmpyNm: "삼성생명", prdNm: "실손의료비보험" } as never,
        { cmpyNm: "한화생명", prdNm: "암보험" } as never,
        { cmpyNm: "교보생명", prdNm: "실손종합보험" } as never,
      ],
    });

    const result = await handler({ action: "medical_reimbursement", like_prd_nm: "실손" });
    expect(result.isError).toBeUndefined();
    const t = result.content[0].text;
    expect(t).toContain("실손의료비보험");
    expect(t).toContain("실손종합보험");
    expect(t).not.toContain("암보험");
    expect(t).toContain("client-side 필터");
  });
});
