import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../unipass-api.js", () => ({
  getBondedAreaStorage: vi.fn(),
  getShedInfo: vi.fn(),
  getBondedTransportVehicle: vi.fn(),
  getPortEntryExit: vi.fn(),
  getUnloadingDeclarations: vi.fn(),
  getSeaDeparturePermit: vi.fn(),
  getAirDeparturePermit: vi.fn(),
  getAirArrivalReport: vi.fn(),
  getBondedTransportInfo: vi.fn(),
}));

import {
  getBondedAreaStorage,
  getShedInfo,
  getBondedTransportVehicle,
  getPortEntryExit,
  getUnloadingDeclarations,
  getSeaDeparturePermit,
  getAirDeparturePermit,
  getAirArrivalReport,
  getBondedTransportInfo,
} from "../../unipass-api.js";
import { createShippingLogisticsHandler } from "./shipping-logistics.js";

const MOCK_KEYS = { "018": "test-key" };

describe("shipping_logistics 스킬", () => {
  let handler: ReturnType<typeof createShippingLogisticsHandler>;

  beforeEach(() => {
    vi.clearAllMocks();
    handler = createShippingLogisticsHandler(MOCK_KEYS);
  });

  it("알수없는action_isError반환", async () => {
    const result = await handler({ action: "nonexistent" } as any);
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("알 수 없는 action");
  });

  it("bonded_area_유효한결과_포맷팅반환", async () => {
    vi.mocked(getBondedAreaStorage).mockResolvedValue([
      { cargMtNo: "C12345", bndAreaNm: "인천보세구역", strgBgnDt: "20260101", strgPridExpnDt: "20260401" },
    ] as any);

    const result = await handler({ action: "bonded_area", cargo_no: "C12345" });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("보세구역 장치기간");
    expect(result.content[0].text).toContain("C12345");
    expect(getBondedAreaStorage).toHaveBeenCalledWith(MOCK_KEYS, "C12345");
  });

  it("bonded_area_cargo_no필수", async () => {
    const result = await handler({ action: "bonded_area" } as any);
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("cargo_no");
  });

  it("bonded_area_빈배열_결과없음메시지", async () => {
    vi.mocked(getBondedAreaStorage).mockResolvedValue([] as any);

    const result = await handler({ action: "bonded_area", cargo_no: "C12345" });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("보세구역 장치기간 결과가 없습니다.");
  });

  it("shed_info_유효한결과_포맷팅반환", async () => {
    vi.mocked(getShedInfo).mockResolvedValue([
      { snarSgn: "S001", snarNm: "인천장치장", snarAddr: "인천시 중구" },
    ] as any);

    const result = await handler({ action: "shed_info" });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("장치장 정보");
    expect(result.content[0].text).toContain("S001");
    expect(getShedInfo).toHaveBeenCalledWith(MOCK_KEYS, { jrsdCstmCd: undefined, snarSgn: undefined });
  });

  it("shed_info_빈배열_결과없음", async () => {
    vi.mocked(getShedInfo).mockResolvedValue([] as any);
    const r = await handler({ action: "shed_info" });
    expect(r.isError).toBeUndefined();
    expect(r.content[0].text).toContain("장치장 정보 결과가 없습니다");
  });

  it("bonded_vehicle_유효한결과_포맷팅반환", async () => {
    vi.mocked(getBondedTransportVehicle).mockResolvedValue([
      { vhclNoSanm: "12가3456", btcoSgn: "BT01", bnbnTrnpEqipTpcdNm: "컨테이너", useYn: "Y" },
    ] as any);

    const result = await handler({ action: "bonded_vehicle", btco_code: "BT01" });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("보세운송차량");
    expect(result.content[0].text).toContain("12가3456");
    expect(getBondedTransportVehicle).toHaveBeenCalledWith(MOCK_KEYS, { btcoSgn: "BT01", vhclNoSanm: undefined });
  });

  it("bonded_vehicle_빈배열_결과없음", async () => {
    vi.mocked(getBondedTransportVehicle).mockResolvedValue([] as any);
    const r = await handler({ action: "bonded_vehicle" });
    expect(r.isError).toBeUndefined();
    expect(r.content[0].text).toContain("보세운송차량 결과가 없습니다");
  });

  it("port_entry_exit_imo_no와io_type필수", async () => {
    const result = await handler({ action: "port_entry_exit" } as any);
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("imo_no");
  });

  it("port_entry_exit_유효한결과_포맷팅반환", async () => {
    vi.mocked(getPortEntryExit).mockResolvedValue([
      { shipFlgtNm: "EVERGREEN", cstmNm: "인천세관", etprDttm: "202601011200" },
    ] as any);

    const result = await handler({ action: "port_entry_exit", imo_no: "IMO001", io_type: "E" });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("IMO001");
    expect(result.content[0].text).toContain("EVERGREEN");
    expect(getPortEntryExit).toHaveBeenCalledWith(MOCK_KEYS, {
      shipCallImoNo: "IMO001",
      seaFlghIoprTpcd: "E",
      cstmSgn: undefined,
    });
  });

  it("port_entry_exit_빈배열_결과없음", async () => {
    vi.mocked(getPortEntryExit).mockResolvedValue([] as any);
    const r = await handler({ action: "port_entry_exit", imo_no: "IMO-X", io_type: "E" });
    expect(r.isError).toBeUndefined();
    expect(r.content[0].text).toContain("입출항보고 결과가 없습니다");
  });

  it("unloading_declarations_entry_date와customs_code필수", async () => {
    const result = await handler({ action: "unloading_declarations" } as any);
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("entry_date");
  });

  it("unloading_declarations_유효한결과_포맷팅반환", async () => {
    vi.mocked(getUnloadingDeclarations).mockResolvedValue([
      { mrn: "MRN001", shipNm: "OCEAN STAR", ulvsUnairPrcsNm: "하선완료" },
    ] as any);

    const result = await handler({
      action: "unloading_declarations",
      entry_date: "20260115",
      customs_code: "020",
    });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("20260115");
    expect(result.content[0].text).toContain("MRN001");
    expect(getUnloadingDeclarations).toHaveBeenCalledWith(MOCK_KEYS, "20260115", "020");
  });

  it("unloading_declarations_빈배열_결과없음", async () => {
    vi.mocked(getUnloadingDeclarations).mockResolvedValue([] as any);
    const r = await handler({ action: "unloading_declarations", entry_date: "20260115", customs_code: "020" });
    expect(r.isError).toBeUndefined();
    expect(r.content[0].text).toContain("하선신고 결과가 없습니다");
  });

  it("sea_departure_유효한결과_포맷팅반환", async () => {
    vi.mocked(getSeaDeparturePermit).mockResolvedValue({
      shipFlgtNm: "EVERGREEN", tkofDttm: "202601011200", arvlCntyPortAirptCd: "USLAX", loadWght: "5000",
    } as any);

    const result = await handler({ action: "sea_departure", submit_no: "SUB001" });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("해상 출항허가");
    expect(result.content[0].text).toContain("EVERGREEN");
    expect(getSeaDeparturePermit).toHaveBeenCalledWith(MOCK_KEYS, { ioprSbmtNo: "SUB001", tkofPermNo: undefined });
  });

  it("sea_departure_null결과_결과없음", async () => {
    vi.mocked(getSeaDeparturePermit).mockResolvedValue(null as any);
    const r = await handler({ action: "sea_departure", submit_no: "SUB-X" });
    expect(r.isError).toBeUndefined();
    expect(r.content[0].text).toContain("해상 출항허가 결과가 없습니다");
  });

  it("air_departure_유효한결과_포맷팅반환", async () => {
    vi.mocked(getAirDeparturePermit).mockResolvedValue({
      shipFlgtNm: "KE001", airRgsrNo: "HL7001", tkofDttm: "202601011400",
    } as any);

    const result = await handler({ action: "air_departure", flight: "KE001" });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("항공 출항허가");
    expect(result.content[0].text).toContain("KE001");
    expect(getAirDeparturePermit).toHaveBeenCalledWith(MOCK_KEYS, { ioprSbmtNo: undefined, shipFlgtNm: "KE001" });
  });

  it("air_departure_null결과_결과없음", async () => {
    vi.mocked(getAirDeparturePermit).mockResolvedValue(null as any);
    const r = await handler({ action: "air_departure", flight: "ZZ999" });
    expect(r.isError).toBeUndefined();
    expect(r.content[0].text).toContain("항공 출항허가 결과가 없습니다");
  });

  it("air_arrival_report_유효한결과_포맷팅반환", async () => {
    vi.mocked(getAirArrivalReport).mockResolvedValue([
      { shipFlgtNm: "OZ301", cstmSgn: "020", etprDttm: "202601011000" },
    ] as any);

    const result = await handler({ action: "air_arrival_report", flight_name: "OZ301" });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("항공 입항보고");
    expect(result.content[0].text).toContain("OZ301");
    expect(getAirArrivalReport).toHaveBeenCalledWith(MOCK_KEYS, { shipFlgtNm: "OZ301", ioprSbmtNo: undefined });
  });

  it("air_arrival_report_빈배열_결과없음", async () => {
    vi.mocked(getAirArrivalReport).mockResolvedValue([] as any);
    const r = await handler({ action: "air_arrival_report", flight_name: "ZZ999" });
    expect(r.isError).toBeUndefined();
    expect(r.content[0].text).toContain("항공 입항보고 결과가 없습니다");
  });

  it("bonded_transport_info_start_date와end_date필수", async () => {
    const result = await handler({ action: "bonded_transport_info" } as any);
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("start_date");
  });

  it("bonded_transport_info_유효한결과_포맷팅반환", async () => {
    vi.mocked(getBondedTransportInfo).mockResolvedValue([
      { alocPrngDclrNo: "ALOC-01", cntrNo: "CONT123", frarSnarSgnNm: "인천", arlcSnarSgnNm: "김포" },
    ] as any);

    const result = await handler({
      action: "bonded_transport_info",
      start_date: "20260101",
      end_date: "20260131",
    });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("20260101");
    expect(result.content[0].text).toContain("ALOC-01");
    expect(getBondedTransportInfo).toHaveBeenCalledWith(MOCK_KEYS, {
      qryStrtDt: "20260101",
      qryEndDt: "20260131",
      btcoSgn: undefined,
    });
  });

  it("bonded_transport_info_빈배열_결과없음", async () => {
    vi.mocked(getBondedTransportInfo).mockResolvedValue([] as any);
    const r = await handler({ action: "bonded_transport_info", start_date: "20260101", end_date: "20260131" });
    expect(r.isError).toBeUndefined();
    expect(r.content[0].text).toContain("보세운송 배차정보 결과가 없습니다");
  });

  it("API예외_errorResponse반환", async () => {
    vi.mocked(getBondedAreaStorage).mockRejectedValue(new Error("Network timeout"));

    const result = await handler({ action: "bonded_area", cargo_no: "C12345" });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Network timeout");
  });
});
