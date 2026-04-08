import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../unipass-api.js", () => ({
  searchCompany: vi.fn(),
  searchBroker: vi.fn(),
  searchAnimalPlantCompany: vi.fn(),
  getForwarderList: vi.fn(),
  getForwarderDetail: vi.fn(),
  getAirlineList: vi.fn(),
  getAirlineDetail: vi.fn(),
  getOverseasSupplier: vi.fn(),
  getBrokerDetail: vi.fn(),
  getShipCompanyList: vi.fn(),
  getShipCompanyDetail: vi.fn(),
}));

import {
  searchCompany,
  searchBroker,
  searchAnimalPlantCompany,
  getForwarderList,
  getForwarderDetail,
  getAirlineList,
  getAirlineDetail,
  getOverseasSupplier,
  getBrokerDetail,
  getShipCompanyList,
  getShipCompanyDetail,
} from "../../unipass-api.js";
import { createTradeEntityHandler } from "./trade-entity.js";

const MOCK_KEYS = { "010": "test-key" };

describe("trade_entity 스킬", () => {
  let handler: ReturnType<typeof createTradeEntityHandler>;

  beforeEach(() => {
    vi.clearAllMocks();
    handler = createTradeEntityHandler(MOCK_KEYS);
  });

  it("알수없는action_isError반환", async () => {
    const result = await handler({ action: "nonexistent" } as any);
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("알 수 없는 action");
  });

  it("search_company_유효한결과_포맷팅반환", async () => {
    vi.mocked(searchCompany).mockResolvedValue([
      { conmNm: "테스트무역", ecm: "ECM001", bsnsNo: "1234567890", bslcBscsAddr: "서울시", useYn: "Y" },
    ] as any);

    const result = await handler({ action: "search_company", query: "테스트" });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("통관업체 검색");
    expect(result.content[0].text).toContain("테스트무역");
    expect(searchCompany).toHaveBeenCalledWith(MOCK_KEYS, "테스트");
  });

  it("search_company_query누락_에러", async () => {
    const result = await handler({ action: "search_company" } as any);
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("query");
  });

  it("search_broker_유효한결과_포맷팅반환", async () => {
    vi.mocked(searchBroker).mockResolvedValue([
      { lcaNm: "김관세사", lcaSgn: "LCA001", cstmNm: "인천세관", cstmSgn: "020" },
    ] as any);

    const result = await handler({ action: "search_broker", query: "김" });
    expect(result.content[0].text).toContain("관세사 검색");
    expect(result.content[0].text).toContain("김관세사");
    expect(searchBroker).toHaveBeenCalledWith(MOCK_KEYS, "김");
  });

  it("search_animal_plant_company_유효한결과_포맷팅반환", async () => {
    vi.mocked(searchAnimalPlantCompany).mockResolvedValue([
      { bsntNm: "축산기업", bsntCd: "ANI001", bsntAddr: "경기도" },
    ] as any);

    const result = await handler({ action: "search_animal_plant_company", company_name: "축산" });
    expect(result.content[0].text).toContain("농림축산검역 업체");
    expect(result.content[0].text).toContain("축산기업");
    expect(searchAnimalPlantCompany).toHaveBeenCalledWith(MOCK_KEYS, "축산");
  });

  it("forwarder_list_유효한결과_포맷팅반환", async () => {
    vi.mocked(getForwarderList).mockResolvedValue([
      { frwrSgn: "FWD001", frwrKoreNm: "한진물류", frwrEnglNm: "Hanjin" },
    ] as any);

    const result = await handler({ action: "forwarder_list", name: "한진" });
    expect(result.content[0].text).toContain("포워더 목록");
    expect(result.content[0].text).toContain("한진물류");
    expect(getForwarderList).toHaveBeenCalledWith(MOCK_KEYS, "한진");
  });

  it("forwarder_detail_유효한결과_포맷팅반환", async () => {
    vi.mocked(getForwarderDetail).mockResolvedValue({
      frwrSgn: "FWD001", koreConmNm: "한진물류", englConmNm: "Hanjin", hdofAddr: "서울시", telNo: "02-1234",
    } as any);

    const result = await handler({ action: "forwarder_detail", forwarder_code: "FWD001" });
    expect(result.content[0].text).toContain("포워더 내역");
    expect(result.content[0].text).toContain("한진물류");
    expect(getForwarderDetail).toHaveBeenCalledWith(MOCK_KEYS, "FWD001");
  });

  it("airline_list_유효한결과_포맷팅반환", async () => {
    vi.mocked(getAirlineList).mockResolvedValue([
      { flcoSgn: "KE", flcoKoreNm: "대한항공", flcoEnglNm: "Korean Air" },
    ] as any);

    const result = await handler({ action: "airline_list", name: "대한" });
    expect(result.content[0].text).toContain("항공사 목록");
    expect(result.content[0].text).toContain("대한항공");
    expect(getAirlineList).toHaveBeenCalledWith(MOCK_KEYS, "대한");
  });

  it("airline_detail_유효한결과_포맷팅반환", async () => {
    vi.mocked(getAirlineDetail).mockResolvedValue({
      flcoEnglSgn: "KE", flcoKoreConm: "대한항공", flcoEnglConm: "Korean Air", cntyNm: "대한민국", telno: "02-5678",
    } as any);

    const result = await handler({ action: "airline_detail", airline_code: "KE" });
    expect(result.content[0].text).toContain("항공사 내역");
    expect(result.content[0].text).toContain("대한항공");
    expect(getAirlineDetail).toHaveBeenCalledWith(MOCK_KEYS, "KE");
  });

  it("overseas_supplier_country_code와company_name필수", async () => {
    const r1 = await handler({ action: "overseas_supplier" } as any);
    expect(r1.isError).toBe(true);
    expect(r1.content[0].text).toContain("country_code");

    const r2 = await handler({ action: "overseas_supplier", country_code: "US" } as any);
    expect(r2.isError).toBe(true);
    expect(r2.content[0].text).toContain("company_name");
  });

  it("broker_detail_유효한결과_포맷팅반환", async () => {
    vi.mocked(getBrokerDetail).mockResolvedValue({
      lcaSgn: "LCA001", lcaConm: "관세법인", jrsdCstmNm: "서울세관", addr: "서울시", telNo: "02-9999", rppnNm: "홍길동",
    } as any);

    const result = await handler({ action: "broker_detail", lca_code: "LCA001" });
    expect(result.content[0].text).toContain("관세사 내역");
    expect(result.content[0].text).toContain("관세법인");
    expect(getBrokerDetail).toHaveBeenCalledWith(MOCK_KEYS, "LCA001");
  });

  it("ship_company_list_유효한결과_포맷팅반환", async () => {
    vi.mocked(getShipCompanyList).mockResolvedValue([
      { shipCoSgn: "MSK", shipCoKoreNm: "머스크", shipCoEnglNm: "Maersk" },
    ] as any);

    const result = await handler({ action: "ship_company_list", name: "머스크" });
    expect(result.content[0].text).toContain("선박회사 목록");
    expect(result.content[0].text).toContain("머스크");
    expect(getShipCompanyList).toHaveBeenCalledWith(MOCK_KEYS, "머스크");
  });

  it("ship_company_detail_유효한결과_포맷팅반환", async () => {
    vi.mocked(getShipCompanyDetail).mockResolvedValue({
      shipAgncNm: "머스크코리아", cntyNm: "덴마크", brno: "9876543210", hdofAddr: "부산시", telno: "051-1234",
    } as any);

    const result = await handler({ action: "ship_company_detail", ship_company_code: "MSK" });
    expect(result.content[0].text).toContain("선박회사 내역");
    expect(result.content[0].text).toContain("머스크코리아");
    expect(getShipCompanyDetail).toHaveBeenCalledWith(MOCK_KEYS, "MSK");
  });

  it("search_company_빈배열_결과없음", async () => {
    vi.mocked(searchCompany).mockResolvedValue([] as any);
    const r = await handler({ action: "search_company", query: "없는업체" });
    expect(r.isError).toBeUndefined();
    expect(r.content[0].text).toContain("없");
  });

  it("search_broker_빈배열_결과없음", async () => {
    vi.mocked(searchBroker).mockResolvedValue([] as any);
    const r = await handler({ action: "search_broker", query: "없음" });
    expect(r.isError).toBeUndefined();
    expect(r.content[0].text).toContain("없");
  });

  it("search_animal_plant_company_빈배열_결과없음", async () => {
    vi.mocked(searchAnimalPlantCompany).mockResolvedValue([] as any);
    const r = await handler({ action: "search_animal_plant_company", company_name: "없음" });
    expect(r.isError).toBeUndefined();
    expect(r.content[0].text).toContain("없");
  });

  it("forwarder_list_빈배열_결과없음", async () => {
    vi.mocked(getForwarderList).mockResolvedValue([] as any);
    const r = await handler({ action: "forwarder_list", name: "없음" });
    expect(r.isError).toBeUndefined();
    expect(r.content[0].text).toContain("없");
  });

  it("forwarder_detail_null_결과없음", async () => {
    vi.mocked(getForwarderDetail).mockResolvedValue(null as any);
    const r = await handler({ action: "forwarder_detail", forwarder_code: "X" });
    expect(r.isError).toBeUndefined();
    expect(r.content[0].text).toContain("없");
  });

  it("airline_list_빈배열_결과없음", async () => {
    vi.mocked(getAirlineList).mockResolvedValue([] as any);
    const r = await handler({ action: "airline_list", name: "없음" });
    expect(r.isError).toBeUndefined();
    expect(r.content[0].text).toContain("없");
  });

  it("airline_detail_null_결과없음", async () => {
    vi.mocked(getAirlineDetail).mockResolvedValue(null as any);
    const r = await handler({ action: "airline_detail", airline_code: "XX" });
    expect(r.isError).toBeUndefined();
    expect(r.content[0].text).toContain("없");
  });

  it("broker_detail_null_결과없음", async () => {
    vi.mocked(getBrokerDetail).mockResolvedValue(null as any);
    const r = await handler({ action: "broker_detail", lca_code: "X" });
    expect(r.isError).toBeUndefined();
    expect(r.content[0].text).toContain("없");
  });

  it("ship_company_list_빈배열_결과없음", async () => {
    vi.mocked(getShipCompanyList).mockResolvedValue([] as any);
    const r = await handler({ action: "ship_company_list", name: "없음" });
    expect(r.isError).toBeUndefined();
    expect(r.content[0].text).toContain("없");
  });

  it("ship_company_detail_null_결과없음", async () => {
    vi.mocked(getShipCompanyDetail).mockResolvedValue(null as any);
    const r = await handler({ action: "ship_company_detail", ship_company_code: "X" });
    expect(r.isError).toBeUndefined();
    expect(r.content[0].text).toContain("없");
  });

  it("overseas_supplier_유효한결과_포맷팅반환", async () => {
    vi.mocked(getOverseasSupplier).mockResolvedValue([
      { ovrsSplrSgn: "S1", splrConm: "US Corp", englCntyNm: "United States" },
    ] as any);
    const r = await handler({ action: "overseas_supplier", country_code: "US", company_name: "Corp" });
    expect(r.isError).toBeUndefined();
    expect(r.content[0].text).toContain("해외공급자");
  });

  it("API예외_errorResponse반환", async () => {
    vi.mocked(searchCompany).mockRejectedValue(new Error("Network timeout"));

    const result = await handler({ action: "search_company", query: "테스트" });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Network timeout");
  });
});
