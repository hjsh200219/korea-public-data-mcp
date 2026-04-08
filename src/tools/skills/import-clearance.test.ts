import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../unipass-api.js", () => ({
  getCargoTracking: vi.fn(),
  getContainerInfo: vi.fn(),
  getArrivalReport: vi.fn(),
  verifyImportDeclaration: vi.fn(),
  getInspectionInfo: vi.fn(),
  getTaxPaymentInfo: vi.fn(),
  getImportRequirement: vi.fn(),
  getSingleWindowHistory: vi.fn(),
  getCustomsCheckItems: vi.fn(),
  getPostalCustoms: vi.fn(),
  getAttachmentSubmitStatus: vi.fn(),
  getReimportExportBalance: vi.fn(),
  getPostalClearance: vi.fn(),
  getReexportDutyFreeBalance: vi.fn(),
  getReexportDeadline: vi.fn(),
  getReexportCompletion: vi.fn(),
  getCollateralRelease: vi.fn(),
  getDeclarationCorrection: vi.fn(),
}));

vi.mock("../../mafra-api.js", () => ({
  fetchImportMeatTrace: vi.fn(),
}));

import {
  getCargoTracking,
  getContainerInfo,
  getArrivalReport,
  verifyImportDeclaration,
  getInspectionInfo,
  getTaxPaymentInfo,
  getImportRequirement,
  getSingleWindowHistory,
  getCustomsCheckItems,
  getPostalCustoms,
  getAttachmentSubmitStatus,
  getReimportExportBalance,
  getPostalClearance,
  getReexportDutyFreeBalance,
  getReexportDeadline,
  getReexportCompletion,
  getCollateralRelease,
  getDeclarationCorrection,
} from "../../unipass-api.js";
import { fetchImportMeatTrace } from "../../mafra-api.js";
import { createImportClearanceHandler } from "./import-clearance.js";

const MOCK_KEYS = { "001": "test-key" };

describe("import_clearance 스킬", () => {
  let handler: ReturnType<typeof createImportClearanceHandler>;

  beforeEach(() => {
    vi.clearAllMocks();
    handler = createImportClearanceHandler(MOCK_KEYS, "mafra-key");
  });

  it("알수없는action_isError반환", async () => {
    const result = await handler({ action: "nonexistent" } as any);
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("알 수 없는 action");
  });

  it("track_cargo_유효한결과_포맷팅반환", async () => {
    vi.mocked(getCargoTracking).mockResolvedValue([
      { prgsSttsCd: "01", prgsStts: "입항", cargMtNo: "C1234", csclPrgsDate: "20260401" },
    ] as any);

    const result = await handler({ action: "track_cargo", bl_number: "BL001" });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("화물통관진행");
    expect(result.content[0].text).toContain("BL001");
    expect(getCargoTracking).toHaveBeenCalledWith(MOCK_KEYS, "BL001");
  });

  it("track_cargo_bl_number누락_에러", async () => {
    const result = await handler({ action: "track_cargo" } as any);
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("bl_number");
  });

  it("verify_declaration_유효한결과_포맷팅반환", async () => {
    vi.mocked(verifyImportDeclaration).mockResolvedValue({
      dclrNo: "D001", dclrDt: "20260401", dclrSttsNm: "수리", dclrSttsCd: "02",
      blNo: "BL001", trdnNm: "테스트기업", hsSgn: "0201", wght: "100", gcnt: "1",
    } as any);

    const result = await handler({ action: "verify_declaration", declaration_no: "D001" });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("수입신고 검증");
    expect(result.content[0].text).toContain("D001");
    expect(verifyImportDeclaration).toHaveBeenCalledWith(MOCK_KEYS, "D001");
  });

  it("get_inspection_유효한결과_포맷팅반환", async () => {
    vi.mocked(getInspectionInfo).mockResolvedValue([
      { inqrRsltCd: "01", inqrRsltNm: "합격", inqrDt: "20260401" },
    ] as any);

    const result = await handler({ action: "get_inspection", bl_number: "BL001" });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("검사검역내역");
    expect(getInspectionInfo).toHaveBeenCalledWith(MOCK_KEYS, "BL001");
  });

  it("get_tax_payment_유효한결과_포맷팅반환", async () => {
    vi.mocked(getTaxPaymentInfo).mockResolvedValue([
      { dclrNo: "D001", txpymYn: "Y", txpymDt: "20260401", txpymAmt: "50000" },
    ] as any);

    const result = await handler({ action: "get_tax_payment", declaration_no: "D001" });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("제세 납부여부");
    expect(result.content[0].text).toContain("납부완료");
    expect(getTaxPaymentInfo).toHaveBeenCalledWith(MOCK_KEYS, "D001");
  });

  it("customs_check_hs_code와imex_type필수", async () => {
    const result1 = await handler({ action: "customs_check" } as any);
    expect(result1.isError).toBe(true);
    expect(result1.content[0].text).toContain("hs_code");

    vi.mocked(getCustomsCheckItems).mockResolvedValue([]);
    const result2 = await handler({ action: "customs_check", hs_code: "0201" } as any);
    expect(result2.isError).toBe(true);
    expect(result2.content[0].text).toContain("imex_type");
  });

  it("postal_clearance_유효한결과_포맷팅반환", async () => {
    vi.mocked(getPostalClearance).mockResolvedValue({
      psmtNo: "P001", psmtKcd: "1", sendCntyCdNm: "미국", ttwg: "5.5", psmtPrcsStcd: "통관완료",
    } as any);

    const result = await handler({ action: "postal_clearance", postal_type: "1", postal_no: "P001" });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("우편물통관");
    expect(result.content[0].text).toContain("P001");
    expect(getPostalClearance).toHaveBeenCalledWith(MOCK_KEYS, "1", "P001");
  });

  it("reexport_balance_유효한결과_포맷팅반환", async () => {
    vi.mocked(getReexportDutyFreeBalance).mockResolvedValue([
      { impDclrNo: "I001", lnNo: "01", qtyRsqty: "50", wghtRsqty: "100" },
    ] as any);

    const result = await handler({ action: "reexport_balance", import_decl_no: "I001" });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("재수출면세 이행잔량");
    expect(getReexportDutyFreeBalance).toHaveBeenCalledWith(MOCK_KEYS, "I001");
  });

  it("get_containers_유효한결과_포맷팅반환", async () => {
    vi.mocked(getContainerInfo).mockResolvedValue([
      { cntrNo: "CONT001", cntrSzCd: "40", sealNo: "SEAL001" },
    ] as any);

    const result = await handler({ action: "get_containers", bl_number: "BL001" });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("BL001");
    expect(getContainerInfo).toHaveBeenCalledWith(MOCK_KEYS, "BL001");
  });

  it("get_arrival_report_유효한결과_포맷팅반환", async () => {
    vi.mocked(getArrivalReport).mockResolvedValue([
      { vydfNm: "선박1", etprCstm: "인천", etprDt: "20260401", msrm: "MBL001" },
    ] as any);

    const result = await handler({ action: "get_arrival_report", bl_number: "BL001" });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("입항보고");
    expect(getArrivalReport).toHaveBeenCalledWith(MOCK_KEYS, "BL001");
  });

  it("import_requirement_유효한결과_포맷팅반환", async () => {
    vi.mocked(getImportRequirement).mockResolvedValue({
      reqApreNo: "REQ001", relaFrmlNm: "법령A", apreCond: "조건1", valtPrid: "20261231",
    } as any);

    const result = await handler({
      action: "import_requirement", req_apre_no: "REQ001", imex_tpcd: "1",
    });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("REQ001");
    expect(getImportRequirement).toHaveBeenCalledWith(MOCK_KEYS, "REQ001", "1");
  });

  it("single_window_유효한결과_포맷팅반환", async () => {
    vi.mocked(getSingleWindowHistory).mockResolvedValue([
      { reqRqstNo: "R1", elctDocNm: "서류A", reqRqstPrcsSttsNm: "접수" },
    ] as any);

    const result = await handler({ action: "single_window", request_no: "RQ001" });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("RQ001");
    expect(getSingleWindowHistory).toHaveBeenCalledWith(MOCK_KEYS, "RQ001");
  });

  it("postal_customs_유효한결과_포맷팅반환", async () => {
    vi.mocked(getPostalCustoms).mockResolvedValue([
      { jrsdCstmSgn: "020", jrsdCstmSgnNm: "인천세관" },
    ] as any);

    const result = await handler({ action: "postal_customs", postal_code: "22345" });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("22345");
    expect(getPostalCustoms).toHaveBeenCalledWith(MOCK_KEYS, "22345");
  });

  it("attachment_status_유효한결과_포맷팅반환", async () => {
    vi.mocked(getAttachmentSubmitStatus).mockResolvedValue([
      { dcshSbmtNo: "SUB001", elctDocNm: "증명서", attchSbmtYn: "Y" },
    ] as any);

    const result = await handler({
      action: "attachment_status", doc_type_code: "C001", submit_no: "SUB001",
    });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("SUB001");
    expect(getAttachmentSubmitStatus).toHaveBeenCalledWith(MOCK_KEYS, "C001", "SUB001");
  });

  it("reimport_balance_유효한결과_포맷팅반환", async () => {
    vi.mocked(getReimportExportBalance).mockResolvedValue([
      { stsz: "규격1", rsqty: "10", rsqtyUt: "kg" },
    ] as any);

    const result = await handler({
      action: "reimport_balance", export_decl_no: "E001", line_no: "01",
    });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("E001");
    expect(getReimportExportBalance).toHaveBeenCalledWith(MOCK_KEYS, {
      expDclrNo: "E001", expDclrLnNo: "01",
    });
  });

  it("reexport_deadline_유효한결과_포맷팅반환", async () => {
    vi.mocked(getReexportDeadline).mockResolvedValue({ xtnsDt: "20261231" } as any);

    const result = await handler({
      action: "reexport_deadline", import_decl_no: "I001", line_no: "01",
    });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("I001");
    expect(getReexportDeadline).toHaveBeenCalledWith(MOCK_KEYS, "I001", "01");
  });

  it("reexport_completion_유효한결과_포맷팅반환", async () => {
    vi.mocked(getReexportCompletion).mockResolvedValue({
      reexpFffmnPrcsStcd: "완료", reexpFfmnLastEnfrDt: "20260401", lastReexpFfmnDtyConcRcd: "N",
    } as any);

    const result = await handler({
      action: "reexport_completion", import_decl_no: "I001", line_no: "02",
    });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("I001");
    expect(getReexportCompletion).toHaveBeenCalledWith(MOCK_KEYS, "I001", "02");
  });

  it("collateral_release_유효한결과_포맷팅반환", async () => {
    vi.mocked(getCollateralRelease).mockResolvedValue({
      mgPrcsStcdNm: "승인", mgAprvDt: "20260401", mgRqstDt: "20260330",
    } as any);

    const result = await handler({ action: "collateral_release", import_decl_no: "I001" });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("I001");
    expect(getCollateralRelease).toHaveBeenCalledWith(MOCK_KEYS, "I001");
  });

  it("declaration_correction_유효한결과_포맷팅반환", async () => {
    vi.mocked(getDeclarationCorrection).mockResolvedValue({
      mdfyRqstPrcsStcd: "01", mdfyRqstPrcsStcdNm: "처리중",
    } as any);

    const result = await handler({
      action: "declaration_correction", submit_no: "S001", imex_type: "1", request_count: "2",
    });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("S001");
    expect(getDeclarationCorrection).toHaveBeenCalledWith(MOCK_KEYS, {
      dcshSbmtNo: "S001", imexTpcd: "1", mdfyRqstDgcnt: "2",
    });
  });

  it("search_import_meat_유효한결과_포맷팅반환", async () => {
    vi.mocked(fetchImportMeatTrace).mockResolvedValue({
      records: [{
        distbIdntfcNo: "M001", prdlstNm: "소고기", blNo: "BL001",
        orgplceNation: "호주", importBsshNm: "수입사A", slauHseNm: "도축장B", prcssHseNm: null,
      }],
      totalCount: 1,
    } as any);

    const result = await handler({ action: "search_import_meat", import_date: "20260401" });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("수입축산물 이력");
    expect(result.content[0].text).toContain("M001");
    expect(fetchImportMeatTrace).toHaveBeenCalledWith("mafra-key", expect.objectContaining({ importDate: "20260401" }));
  });

  it("search_import_meat_mafraApiKey없으면_에러", async () => {
    const noMafraHandler = createImportClearanceHandler(MOCK_KEYS, undefined);
    const result = await noMafraHandler({ action: "search_import_meat", import_date: "20260401" });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("MAFRA_API_KEY");
  });

  it("lookup_meat_by_bl_유효한결과_포맷팅반환", async () => {
    vi.mocked(fetchImportMeatTrace).mockResolvedValue({
      records: [{
        distbIdntfcNo: "M002", prdlstNm: "돼지고기", blNo: "BL002",
        orgplceNation: "미국", slauHseNm: "도축장C", slauStartDe: "20260301", slauEndDe: "20260310",
        prcssHseNm: "가공장D", prcssStartDe: "20260311", prcssEndDe: "20260320",
        exportBsshNm: "수출업체E", importBsshNm: "수입업체F", sleAt: "Y",
      }],
      totalCount: 1,
    } as any);

    const result = await handler({ action: "lookup_meat_by_bl", bl_number: "BL002", import_date: "20260401" });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("BL BL002");
    expect(result.content[0].text).toContain("M002");
    expect(fetchImportMeatTrace).toHaveBeenCalledWith("mafra-key", expect.objectContaining({ blNo: "BL002" }));
  });

  it("track_cargo_빈배열_결과없음", async () => {
    vi.mocked(getCargoTracking).mockResolvedValue([] as any);
    const r = await handler({ action: "track_cargo", bl_number: "BL0" });
    expect(r.isError).toBeUndefined();
    expect(r.content[0].text).toContain("없");
  });

  it("get_containers_빈배열_결과없음", async () => {
    vi.mocked(getContainerInfo).mockResolvedValue([] as any);
    const r = await handler({ action: "get_containers", bl_number: "BL0" });
    expect(r.isError).toBeUndefined();
    expect(r.content[0].text).toContain("없");
  });

  it("get_arrival_report_빈배열_결과없음", async () => {
    vi.mocked(getArrivalReport).mockResolvedValue([] as any);
    const r = await handler({ action: "get_arrival_report", bl_number: "BL0" });
    expect(r.isError).toBeUndefined();
    expect(r.content[0].text).toContain("없");
  });

  it("verify_declaration_null_결과없음", async () => {
    vi.mocked(verifyImportDeclaration).mockResolvedValue(null as any);
    const r = await handler({ action: "verify_declaration", declaration_no: "D0" });
    expect(r.isError).toBeUndefined();
    expect(r.content[0].text).toContain("없");
  });

  it("get_inspection_빈배열_결과없음", async () => {
    vi.mocked(getInspectionInfo).mockResolvedValue([] as any);
    const r = await handler({ action: "get_inspection", bl_number: "BL0" });
    expect(r.isError).toBeUndefined();
    expect(r.content[0].text).toContain("없");
  });

  it("get_tax_payment_빈배열_결과없음", async () => {
    vi.mocked(getTaxPaymentInfo).mockResolvedValue([] as any);
    const r = await handler({ action: "get_tax_payment", declaration_no: "D0" });
    expect(r.isError).toBeUndefined();
    expect(r.content[0].text).toContain("없");
  });

  it("import_requirement_null_결과없음", async () => {
    vi.mocked(getImportRequirement).mockResolvedValue(null as any);
    const r = await handler({ action: "import_requirement", req_apre_no: "R0", imex_tpcd: "1" });
    expect(r.isError).toBeUndefined();
    expect(r.content[0].text).toContain("없");
  });

  it("single_window_빈배열_결과없음", async () => {
    vi.mocked(getSingleWindowHistory).mockResolvedValue([] as any);
    const r = await handler({ action: "single_window", request_no: "RQ0" });
    expect(r.isError).toBeUndefined();
    expect(r.content[0].text).toContain("없");
  });

  it("customs_check_빈배열_결과없음", async () => {
    vi.mocked(getCustomsCheckItems).mockResolvedValue([] as any);
    const r = await handler({ action: "customs_check", hs_code: "0201", imex_type: "1" });
    expect(r.isError).toBeUndefined();
    expect(r.content[0].text).toContain("없");
  });

  it("postal_customs_빈배열_결과없음", async () => {
    vi.mocked(getPostalCustoms).mockResolvedValue([] as any);
    const r = await handler({ action: "postal_customs", postal_code: "00000" });
    expect(r.isError).toBeUndefined();
    expect(r.content[0].text).toContain("없");
  });

  it("attachment_status_빈배열_결과없음", async () => {
    vi.mocked(getAttachmentSubmitStatus).mockResolvedValue([] as any);
    const r = await handler({ action: "attachment_status", doc_type_code: "C0", submit_no: "S0" });
    expect(r.isError).toBeUndefined();
    expect(r.content[0].text).toContain("없");
  });

  it("reimport_balance_빈배열_결과없음", async () => {
    vi.mocked(getReimportExportBalance).mockResolvedValue([] as any);
    const r = await handler({ action: "reimport_balance", export_decl_no: "E0", line_no: "01" });
    expect(r.isError).toBeUndefined();
    expect(r.content[0].text).toContain("없");
  });

  it("postal_clearance_null_결과없음", async () => {
    vi.mocked(getPostalClearance).mockResolvedValue(null as any);
    const r = await handler({ action: "postal_clearance", postal_type: "1", postal_no: "P0" });
    expect(r.isError).toBeUndefined();
    expect(r.content[0].text).toContain("없");
  });

  it("reexport_balance_빈배열_결과없음", async () => {
    vi.mocked(getReexportDutyFreeBalance).mockResolvedValue([] as any);
    const r = await handler({ action: "reexport_balance", import_decl_no: "I0" });
    expect(r.isError).toBeUndefined();
    expect(r.content[0].text).toContain("없");
  });

  it("reexport_deadline_null_결과없음", async () => {
    vi.mocked(getReexportDeadline).mockResolvedValue(null as any);
    const r = await handler({ action: "reexport_deadline", import_decl_no: "I0", line_no: "01" });
    expect(r.isError).toBeUndefined();
    expect(r.content[0].text).toContain("없");
  });

  it("reexport_completion_null_결과없음", async () => {
    vi.mocked(getReexportCompletion).mockResolvedValue(null as any);
    const r = await handler({ action: "reexport_completion", import_decl_no: "I0", line_no: "02" });
    expect(r.isError).toBeUndefined();
    expect(r.content[0].text).toContain("없");
  });

  it("collateral_release_null_결과없음", async () => {
    vi.mocked(getCollateralRelease).mockResolvedValue(null as any);
    const r = await handler({ action: "collateral_release", import_decl_no: "I0" });
    expect(r.isError).toBeUndefined();
    expect(r.content[0].text).toContain("없");
  });

  it("declaration_correction_null_결과없음", async () => {
    vi.mocked(getDeclarationCorrection).mockResolvedValue(null as any);
    const r = await handler({ action: "declaration_correction", submit_no: "S0", imex_type: "1", request_count: "2" });
    expect(r.isError).toBeUndefined();
    expect(r.content[0].text).toContain("없");
  });

  it("search_import_meat_빈records_결과없음", async () => {
    vi.mocked(fetchImportMeatTrace).mockResolvedValue({ records: [], totalCount: 0 } as any);
    const r = await handler({ action: "search_import_meat", import_date: "20260401" });
    expect(r.isError).toBeUndefined();
    expect(r.content[0].text).toContain("없");
  });

  it("lookup_meat_by_bl_빈records_결과없음", async () => {
    vi.mocked(fetchImportMeatTrace).mockResolvedValue({ records: [], totalCount: 0 } as any);
    const r = await handler({ action: "lookup_meat_by_bl", bl_number: "BLX", import_date: "20260401" });
    expect(r.isError).toBeUndefined();
    expect(r.content[0].text).toContain("없");
  });

  it("API예외_errorResponse반환", async () => {
    vi.mocked(getCargoTracking).mockRejectedValue(new Error("Network timeout"));

    const result = await handler({ action: "track_cargo", bl_number: "BL001" });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Network timeout");
  });
});
