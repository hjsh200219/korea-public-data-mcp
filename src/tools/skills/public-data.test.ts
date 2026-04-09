import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../data20-api.js", () => ({
  searchPharmacy: vi.fn(),
  searchHospital: vi.fn(),
  searchRareMedicine: vi.fn(),
  searchHealthFood: vi.fn(),
  searchBioEquivalence: vi.fn(),
  searchMedicinePatent: vi.fn(),
  verifyBusiness: vi.fn(),
  checkBusinessStatus: vi.fn(),
  searchOnbidPbancCltrDetail: vi.fn(),
  searchOnbidPbancList: vi.fn(),
}));

import {
  searchPharmacy,
  searchHospital,
  searchRareMedicine,
  searchHealthFood,
  searchBioEquivalence,
  searchMedicinePatent,
  verifyBusiness,
  checkBusinessStatus,
  searchOnbidPbancCltrDetail,
  searchOnbidPbancList,
} from "../../data20-api.js";
import { createPublicDataHandler } from "./public-data.js";

const MOCK_KEY = "test-service-key";

describe("public_data 스킬", () => {
  let handler: ReturnType<typeof createPublicDataHandler>;

  beforeEach(() => {
    vi.clearAllMocks();
    handler = createPublicDataHandler(MOCK_KEY);
  });

  it("알수없는action_isError반환", async () => {
    const result = await handler({ action: "nonexistent" } as any);
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("알 수 없는 action");
  });

  it("search_pharmacy_유효한결과_포맷팅반환", async () => {
    vi.mocked(searchPharmacy).mockResolvedValue({
      items: [{ yadmNm: "건강약국", addr: "서울시 강남구", telno: "02-1234", sidoCdNm: "서울", sgguCdNm: "강남구", emdongNm: "역삼동" }],
      totalCount: 1,
      pageNo: 1,
      numOfRows: 10,
    } as any);

    const result = await handler({ action: "search_pharmacy", Q0: "서울" });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("약국 검색결과");
    expect(result.content[0].text).toContain("건강약국");
    expect(searchPharmacy).toHaveBeenCalledWith(MOCK_KEY, expect.objectContaining({ Q0: "서울" }));
  });

  it("search_hospital_유효한결과_포맷팅반환", async () => {
    vi.mocked(searchHospital).mockResolvedValue({
      items: [{ yadmNm: "서울대병원", clCdNm: "상급종합", addr: "서울시 종로구", telno: "02-2072", dgsbjtCdNm: "내과", drTotCnt: 500 }],
      totalCount: 1,
      pageNo: 1,
      numOfRows: 10,
    } as any);

    const result = await handler({ action: "search_hospital", yadmNm: "서울대" });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("병원 검색결과");
    expect(result.content[0].text).toContain("서울대병원");
    expect(result.content[0].text).toContain("의사수");
    expect(searchHospital).toHaveBeenCalledWith(MOCK_KEY, expect.objectContaining({ yadmNm: "서울대" }));
  });

  it("search_animal_hospital_유효한결과_searchHospital호출", async () => {
    vi.mocked(searchHospital).mockResolvedValue({
      items: [{ yadmNm: "해피동물병원", clCdNm: "동물병원", addr: "서울시 마포구", telno: "02-3333" }],
      totalCount: 1,
      pageNo: 1,
      numOfRows: 10,
    } as any);

    const result = await handler({ action: "search_animal_hospital", yadmNm: "해피" });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("동물병원 검색결과");
    expect(result.content[0].text).toContain("해피동물병원");
    expect(searchHospital).toHaveBeenCalledWith(MOCK_KEY, expect.objectContaining({ yadmNm: "해피" }));
  });

  it("search_rare_medicine_유효한결과_포맷팅반환", async () => {
    vi.mocked(searchRareMedicine).mockResolvedValue({
      items: [{ PRODT_NAME: "희귀약품A", GOODS_NAME: "GoodsA", MANUF_NAME: "제약사A", TARGET_DISEASE: "희귀질환", APPOINT_DATE: "20230101" }],
      totalCount: 1,
      pageNo: 1,
      numOfRows: 10,
    } as any);

    const result = await handler({ action: "search_rare_medicine", item_name: "희귀" });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("희귀의약품 검색결과");
    expect(result.content[0].text).toContain("희귀약품A");
    expect(searchRareMedicine).toHaveBeenCalledWith(MOCK_KEY, expect.objectContaining({ item_name: "희귀" }));
  });

  it("search_health_food_유효한결과_포맷팅반환", async () => {
    vi.mocked(searchHealthFood).mockResolvedValue({
      items: [{ PRDUCT: "비타민C", ENTRPS: "건강식품사", MAIN_FNCTN: "면역력", DISTB_PD: "24개월", SRV_USE: "1일 1회" }],
      totalCount: 1,
      pageNo: 1,
      numOfRows: 10,
    } as any);

    const result = await handler({ action: "search_health_food", prdlst_nm: "비타민" });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("건강기능식품 검색결과");
    expect(result.content[0].text).toContain("비타민C");
    expect(searchHealthFood).toHaveBeenCalledWith(MOCK_KEY, expect.objectContaining({ prdlst_nm: "비타민" }));
  });

  it("search_health_food_원격필터무시_제품명재필터_안내문", async () => {
    vi.mocked(searchHealthFood).mockResolvedValue({
      items: [
        { PRDUCT: "오메가3", ENTRPS: "A", MAIN_FNCTN: "x", DISTB_PD: "", SRV_USE: "" },
        { PRDUCT: "프로바이오틱스", ENTRPS: "B", MAIN_FNCTN: "y", DISTB_PD: "", SRV_USE: "" },
      ],
      totalCount: 9999,
      pageNo: 1,
      numOfRows: 10,
    } as any);

    const result = await handler({ action: "search_health_food", prdlst_nm: "비타민" });
    expect(result.content[0].text).toContain("포함된 항목이 없습니다");
    expect(result.content[0].text).toContain("HtfsInfoService03");
  });

  it("search_health_food_원격필터무시_일부일치만표시", async () => {
    vi.mocked(searchHealthFood).mockResolvedValue({
      items: [
        { PRDUCT: "오메가3", ENTRPS: "A", MAIN_FNCTN: "x", DISTB_PD: "", SRV_USE: "" },
        { PRDUCT: "비타민C 1000", ENTRPS: "B", MAIN_FNCTN: "y", DISTB_PD: "", SRV_USE: "" },
      ],
      totalCount: 9999,
      pageNo: 1,
      numOfRows: 10,
    } as any);

    const result = await handler({ action: "search_health_food", prdlst_nm: "비타민" });
    expect(result.content[0].text).toContain("원격 API가 제품명");
    expect(result.content[0].text).toContain("비타민C 1000");
    expect(result.content[0].text).not.toContain("오메가3");
    expect(result.content[0].text).toContain("총 1건");
  });

  it("search_bio_equivalence_유효한결과_포맷팅반환", async () => {
    vi.mocked(searchBioEquivalence).mockResolvedValue({
      items: [{ ITEM_NAME: "제네릭약A", ENTP_NAME: "제약사B", INGR_KOR_NAME: "성분A", INGR_QTY: "100mg", SHAPE_CODE_NAME: "정제", BIOEQ_PRODT_NOTICE_DATE: "20230601" }],
      totalCount: 1,
      pageNo: 1,
      numOfRows: 10,
    } as any);

    const result = await handler({ action: "search_bio_equivalence", item_name: "제네릭" });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("생동성인정품목 검색결과");
    expect(result.content[0].text).toContain("제네릭약A");
    expect(searchBioEquivalence).toHaveBeenCalledWith(MOCK_KEY, expect.objectContaining({ item_name: "제네릭" }));
  });

  it("search_onbid_pbanc_cltr_detail_유효한결과_포맷팅반환", async () => {
    vi.mocked(searchOnbidPbancCltrDetail).mockResolvedValue({
      items: [{ CLTR_NM: "강남 토지", APSL_ASES_AVG_AMT: "500000000" }],
      totalCount: 1,
      pageNo: 1,
      numOfRows: 10,
    } as any);

    const result = await handler({
      action: "search_onbid_pbanc_cltr_detail",
      pbancMngNo: "202406-21411-00",
    });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("온비드 공고물건 상세");
    expect(result.content[0].text).toContain("강남 토지");
    expect(searchOnbidPbancCltrDetail).toHaveBeenCalledWith(
      MOCK_KEY,
      expect.objectContaining({ pbancMngNo: "202406-21411-00" }),
    );
  });

  it("search_onbid_pbanc_cltr_detail_pbancMngNo누락_에러", async () => {
    const result = await handler({ action: "search_onbid_pbanc_cltr_detail" } as any);
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("pbancMngNo");
  });

  it("search_onbid_pbanc_list_유효한결과_포맷팅반환", async () => {
    vi.mocked(searchOnbidPbancList).mockResolvedValue({
      items: [{ PBANC_NM: "공고A" }],
      totalCount: 1,
      pageNo: 1,
      numOfRows: 10,
    } as any);

    const result = await handler({
      action: "search_onbid_pbanc_list",
      pageNo: 1,
      onbid_list_filters_json: JSON.stringify({ foo: "bar" }),
    });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("온비드 공고목록");
    expect(searchOnbidPbancList).toHaveBeenCalledWith(
      MOCK_KEY,
      expect.objectContaining({ query: { foo: "bar" } }),
    );
  });

  it("search_onbid_pbanc_list_filters_JSON아님_isError", async () => {
    const result = await handler({
      action: "search_onbid_pbanc_list",
      onbid_list_filters_json: "[1,2]",
    } as any);
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toMatch(/JSON|객체/);
  });

  it("search_medicine_patent_유효한결과_포맷팅반환", async () => {
    vi.mocked(searchMedicinePatent).mockResolvedValue({
      items: [{ ITEM_NAME: "특허약품A", ITEM_ENG_NAME: "PatentDrugA", ENTP_NAME: "제약사C", INGR_KOR_NAME: "성분B", INGR_ENG_NAME: "IngrB", PATENT_NO: "KR1234567", PATENT_DATE: "20200101", PATENT_EXPIRY_DATE: "20400101", DOSAGE_FORM: "캡슐" }],
      totalCount: 1,
      pageNo: 1,
      numOfRows: 10,
    } as any);

    const result = await handler({ action: "search_medicine_patent", item_name: "특허" });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("의약품 특허정보 검색결과");
    expect(result.content[0].text).toContain("특허약품A");
    expect(result.content[0].text).toContain("KR1234567");
    expect(searchMedicinePatent).toHaveBeenCalledWith(MOCK_KEY, expect.objectContaining({ item_name: "특허" }));
  });

  it("verify_business_유효한결과_포맷팅반환", async () => {
    vi.mocked(verifyBusiness).mockResolvedValue([
      { b_no: "1234567890", valid: "01", valid_msg: "확인" },
    ] as any);

    const result = await handler({ action: "verify_business", b_no: "1234567890", start_dt: "20200101", p_nm: "홍길동" });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("진위확인 결과");
    expect(result.content[0].text).toContain("1234567890");
    expect(verifyBusiness).toHaveBeenCalledWith(MOCK_KEY, [{ b_no: "1234567890", start_dt: "20200101", p_nm: "홍길동", b_nm: undefined }]);
  });

  it("verify_business_b_no누락_에러", async () => {
    const result = await handler({ action: "verify_business", start_dt: "20200101", p_nm: "홍길동" } as any);
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("b_no");
  });

  it("check_business_status_유효한결과_포맷팅반환", async () => {
    vi.mocked(checkBusinessStatus).mockResolvedValue([
      { b_no: "1234567890", b_stt: "계속사업자", b_stt_cd: "01", tax_type: "부가가치세 일반과세자" },
    ] as any);

    const result = await handler({ action: "check_business_status", b_no: "1234567890" });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("상태조회 결과");
    expect(result.content[0].text).toContain("계속사업자");
    expect(result.content[0].text).toContain("부가가치세 일반과세자");
    expect(checkBusinessStatus).toHaveBeenCalledWith(MOCK_KEY, ["1234567890"]);
  });

  it("check_business_status_b_no누락_에러", async () => {
    const result = await handler({ action: "check_business_status" } as any);
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("b_no");
  });

  const emptyItems = { items: [], totalCount: 0, pageNo: 1, numOfRows: 10 };

  it("search_pharmacy_빈결과_결과없음", async () => {
    vi.mocked(searchPharmacy).mockResolvedValue(emptyItems as any);
    const r = await handler({ action: "search_pharmacy", Q0: "없음" });
    expect(r.isError).toBeUndefined();
    expect(r.content[0].text).toContain("없");
  });

  it("search_hospital_빈결과_결과없음", async () => {
    vi.mocked(searchHospital).mockResolvedValue(emptyItems as any);
    const r = await handler({ action: "search_hospital", yadmNm: "없음" });
    expect(r.isError).toBeUndefined();
    expect(r.content[0].text).toContain("없");
  });

  it("search_animal_hospital_빈결과_결과없음", async () => {
    vi.mocked(searchHospital).mockResolvedValue(emptyItems as any);
    const r = await handler({ action: "search_animal_hospital", yadmNm: "없음" });
    expect(r.isError).toBeUndefined();
    expect(r.content[0].text).toContain("없");
  });

  it("search_rare_medicine_빈결과_결과없음", async () => {
    vi.mocked(searchRareMedicine).mockResolvedValue(emptyItems as any);
    const r = await handler({ action: "search_rare_medicine", item_name: "없음" });
    expect(r.isError).toBeUndefined();
    expect(r.content[0].text).toContain("없");
  });

  it("search_health_food_빈결과_결과없음", async () => {
    vi.mocked(searchHealthFood).mockResolvedValue(emptyItems as any);
    const r = await handler({ action: "search_health_food", prdlst_nm: "없음" });
    expect(r.isError).toBeUndefined();
    expect(r.content[0].text).toContain("없");
  });

  it("search_bio_equivalence_빈결과_결과없음", async () => {
    vi.mocked(searchBioEquivalence).mockResolvedValue(emptyItems as any);
    const r = await handler({ action: "search_bio_equivalence", item_name: "없음" });
    expect(r.isError).toBeUndefined();
    expect(r.content[0].text).toContain("없");
  });

  it("search_medicine_patent_빈결과_결과없음", async () => {
    vi.mocked(searchMedicinePatent).mockResolvedValue(emptyItems as any);
    const r = await handler({ action: "search_medicine_patent", item_name: "없음" });
    expect(r.isError).toBeUndefined();
    expect(r.content[0].text).toContain("없");
  });

  it("search_onbid_pbanc_cltr_detail_빈결과_결과없음", async () => {
    vi.mocked(searchOnbidPbancCltrDetail).mockResolvedValue(emptyItems as any);
    const r = await handler({ action: "search_onbid_pbanc_cltr_detail", pbancMngNo: "202406-00000-00" });
    expect(r.isError).toBeUndefined();
    expect(r.content[0].text).toContain("없");
  });

  it("search_onbid_pbanc_list_빈결과_결과없음", async () => {
    vi.mocked(searchOnbidPbancList).mockResolvedValue(emptyItems as any);
    const r = await handler({ action: "search_onbid_pbanc_list" });
    expect(r.isError).toBeUndefined();
    expect(r.content[0].text).toContain("없");
  });

  it("verify_business_빈배열_결과없음", async () => {
    vi.mocked(verifyBusiness).mockResolvedValue([] as any);
    const r = await handler({ action: "verify_business", b_no: "1", start_dt: "20200101", p_nm: "a" });
    expect(r.isError).toBeUndefined();
    expect(r.content[0].text).toContain("결과");
  });

  it("check_business_status_빈배열_결과없음", async () => {
    vi.mocked(checkBusinessStatus).mockResolvedValue([] as any);
    const r = await handler({ action: "check_business_status", b_no: "1234567890" });
    expect(r.isError).toBeUndefined();
    expect(r.content[0].text).toContain("결과");
  });

  it("API예외_errorResponse반환", async () => {
    vi.mocked(searchPharmacy).mockRejectedValue(new Error("Network timeout"));

    const result = await handler({ action: "search_pharmacy" });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Network timeout");
  });
});
