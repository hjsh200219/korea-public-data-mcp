import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../unipass-api.js", () => ({
  getExportPerformance: vi.fn(),
  verifyExportDeclaration: vi.fn(),
  getExportByVehicle: vi.fn(),
  getLoadingInspection: vi.fn(),
  getEcommerceExportLoad: vi.fn(),
  getBondedRelease: vi.fn(),
}));

import {
  getExportPerformance,
  verifyExportDeclaration,
  getExportByVehicle,
  getLoadingInspection,
  getEcommerceExportLoad,
  getBondedRelease,
} from "../../unipass-api.js";
import { createExportClearanceHandler } from "./export-clearance.js";

const MOCK_KEYS = { "002": "test-key" };

describe("export_clearance 스킬", () => {
  let handler: ReturnType<typeof createExportClearanceHandler>;

  beforeEach(() => {
    vi.clearAllMocks();
    handler = createExportClearanceHandler(MOCK_KEYS);
  });

  it("알수없는action_isError반환", async () => {
    const result = await handler({ action: "nonexistent" } as any);
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("알 수 없는 action");
  });

  it("export_performance_유효한결과_포맷팅반환", async () => {
    vi.mocked(getExportPerformance).mockResolvedValue({
      expDclrNo: "EXP-001",
      shpmCmplYn: "Y",
      sanm: "EVER GIVEN",
      shpmWght: "1000",
      csclWght: "950",
    } as any);

    const result = await handler({ action: "export_performance", export_declaration_no: "EXP-001" });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("수출이행내역");
    expect(result.content[0].text).toContain("EXP-001");
    expect(result.content[0].text).toContain("EVER GIVEN");
    expect(getExportPerformance).toHaveBeenCalledWith(MOCK_KEYS, "EXP-001");
  });

  it("export_performance_export_declaration_no필수", async () => {
    const result = await handler({ action: "export_performance" } as any);
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("export_declaration_no");
  });

  it("verify_export_유효한결과_포맷팅반환", async () => {
    vi.mocked(verifyExportDeclaration).mockResolvedValue({
      tCnt: "1",
      vrfcRsltCn: "일치",
    } as any);

    const result = await handler({
      action: "verify_export",
      pubs_no: "PUB-001",
      decl_no: "DCL-001",
      brno: "1234567890",
      country: "KR",
      product: "전자부품",
      weight: "500",
    });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("수출신고필증 검증");
    expect(result.content[0].text).toContain("일치");
    expect(verifyExportDeclaration).toHaveBeenCalledWith(MOCK_KEYS, {
      expDclrCrfnPblsNo: "PUB-001",
      expDclrNo: "DCL-001",
      txprBrno: "1234567890",
      orcyCntyCd: "KR",
      prnm: "전자부품",
      ntwg: "500",
    });
  });

  it("verify_export_pubs_no필수", async () => {
    const result = await handler({ action: "verify_export" } as any);
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("pubs_no");
  });

  it("export_by_vehicle_유효한결과_포맷팅반환", async () => {
    vi.mocked(getExportByVehicle).mockResolvedValue([
      { cbno: "VH-001", expDclrNo: "EXP-002", vhclPrgsStts: "완료" },
    ] as any);

    const result = await handler({ action: "export_by_vehicle", vehicle_no: "VH-001" });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("VH-001");
    expect(result.content[0].text).toContain("EXP-002");
    expect(getExportByVehicle).toHaveBeenCalledWith(MOCK_KEYS, { cbno: "VH-001" });
  });

  it("export_by_vehicle_vehicle_no필수", async () => {
    const result = await handler({ action: "export_by_vehicle" } as any);
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("vehicle_no");
  });

  it("export_by_vehicle_빈배열_결과없음메시지", async () => {
    vi.mocked(getExportByVehicle).mockResolvedValue([] as any);

    const result = await handler({ action: "export_by_vehicle", vehicle_no: "VH-001" });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("해당 차대번호의 수출이행 내역이 없습니다.");
  });

  it("export_performance_null결과_결과없음", async () => {
    vi.mocked(getExportPerformance).mockResolvedValue(null as any);
    const r = await handler({ action: "export_performance", export_declaration_no: "X" });
    expect(r.isError).toBeUndefined();
    expect(r.content[0].text).toContain("이행내역을 찾을 수 없습니다");
  });

  it("verify_export_null결과_결과없음", async () => {
    vi.mocked(verifyExportDeclaration).mockResolvedValue(null as any);
    const r = await handler({ action: "verify_export", pubs_no: "PUB-X" });
    expect(r.isError).toBeUndefined();
    expect(r.content[0].text).toContain("검증 결과를 찾을 수 없습니다");
  });

  it("loading_inspection_null결과_결과없음", async () => {
    vi.mocked(getLoadingInspection).mockResolvedValue(null as any);
    const r = await handler({ action: "loading_inspection", export_declaration_no: "X" });
    expect(r.isError).toBeUndefined();
    expect(r.content[0].text).toContain("적재지 검사정보를 찾을 수 없습니다");
  });

  it("ecommerce_export_load_null결과_결과없음", async () => {
    vi.mocked(getEcommerceExportLoad).mockResolvedValue(null as any);
    const r = await handler({ action: "ecommerce_export_load", ecommerce_decl_no: "EC-X" });
    expect(r.isError).toBeUndefined();
    expect(r.content[0].text).toContain("적재이행 정보를 찾을 수 없습니다");
  });

  it("bonded_release_null결과_결과없음", async () => {
    vi.mocked(getBondedRelease).mockResolvedValue(null as any);
    const r = await handler({ action: "bonded_release", business_no: "0000000000" });
    expect(r.isError).toBeUndefined();
    expect(r.content[0].text).toContain("반출신고 정보를 찾을 수 없습니다");
  });

  it("loading_inspection_유효한결과_포맷팅반환", async () => {
    vi.mocked(getLoadingInspection).mockResolvedValue({
      expInscTrgtYn: "Y",
      expInscCmplYn: "Y",
    } as any);

    const result = await handler({ action: "loading_inspection", export_declaration_no: "EXP-003" });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("적재지 검사정보");
    expect(result.content[0].text).toContain("EXP-003");
    expect(getLoadingInspection).toHaveBeenCalledWith(MOCK_KEYS, "EXP-003");
  });

  it("loading_inspection_export_declaration_no필수", async () => {
    const result = await handler({ action: "loading_inspection" } as any);
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("export_declaration_no");
  });

  it("ecommerce_export_load_유효한결과_포맷팅반환", async () => {
    vi.mocked(getEcommerceExportLoad).mockResolvedValue({
      loadCmplYn: "Y",
    } as any);

    const result = await handler({ action: "ecommerce_export_load", ecommerce_decl_no: "EC-001" });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("전자상거래수출 적재이행");
    expect(result.content[0].text).toContain("EC-001");
    expect(getEcommerceExportLoad).toHaveBeenCalledWith(MOCK_KEYS, "EC-001");
  });

  it("ecommerce_export_load_ecommerce_decl_no필수", async () => {
    const result = await handler({ action: "ecommerce_export_load" } as any);
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("ecommerce_decl_no");
  });

  it("bonded_release_유효한결과_포맷팅반환", async () => {
    vi.mocked(getBondedRelease).mockResolvedValue({
      rlbrDt: "20260401",
      rlbrYn: "Y",
    } as any);

    const result = await handler({ action: "bonded_release", business_no: "9876543210" });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("보세구역 반출신고");
    expect(result.content[0].text).toContain("9876543210");
    expect(getBondedRelease).toHaveBeenCalledWith(MOCK_KEYS, "9876543210");
  });

  it("bonded_release_business_no필수", async () => {
    const result = await handler({ action: "bonded_release" } as any);
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("business_no");
  });

  it("API예외_errorResponse반환", async () => {
    vi.mocked(getExportPerformance).mockRejectedValue(new Error("Network timeout"));

    const result = await handler({ action: "export_performance", export_declaration_no: "EXP-001" });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Network timeout");
  });
});
