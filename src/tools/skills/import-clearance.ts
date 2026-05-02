/**
 * Skill: import_clearance — 수입통관 전체 프로세스 통합 도구
 * 기존 도구: unipass_track_cargo, unipass_get_containers, unipass_get_arrival_report,
 *   unipass_verify_declaration, unipass_get_inspection, unipass_get_tax_payment,
 *   unipass_import_requirement, unipass_single_window, unipass_customs_check,
 *   unipass_postal_customs, unipass_attachment_status, unipass_reimport_balance,
 *   unipass_postal_clearance, unipass_reexport_balance, unipass_reexport_deadline,
 *   unipass_reexport_completion, unipass_collateral_release, unipass_declaration_correction,
 *   mafra_search_import_meat, mafra_lookup_meat_by_bl
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
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
import { errorResponse, truncate } from "../../shared.js";
import { createDispatcher, requireParam, emptyResultMessage, type SkillResult, registerSkillTool } from "./_shared.js";

const ACTIONS = [
  "track_cargo",
  "get_containers",
  "get_arrival_report",
  "verify_declaration",
  "get_inspection",
  "get_tax_payment",
  "import_requirement",
  "single_window",
  "customs_check",
  "postal_customs",
  "attachment_status",
  "reimport_balance",
  "postal_clearance",
  "reexport_balance",
  "reexport_deadline",
  "reexport_completion",
  "collateral_release",
  "declaration_correction",
  "search_import_meat",
  "lookup_meat_by_bl",
] as const;

type ImportClearanceParams = {
  action: string;
  bl_number?: string;
  declaration_no?: string;
  cargo_no?: string;
  req_apre_no?: string;
  imex_tpcd?: string;
  imex_type?: string;
  request_no?: string;
  hs_code?: string;
  postal_code?: string;
  doc_type_code?: string;
  submit_no?: string;
  export_decl_no?: string;
  import_decl_no?: string;
  line_no?: string;
  postal_type?: string;
  postal_no?: string;
  request_count?: string;
  import_date?: string;
  product_code?: string;
  origin_country?: string;
  sale_status?: "Y" | "N";
  page?: number;
  per_page?: number;
};

function handleTrackCargo(unipassKeys: Record<string, string>) {
  return async (p: ImportClearanceParams): Promise<SkillResult> => {
    const err = requireParam(p as Record<string, unknown>, "bl_number", "track_cargo");
    if (err) return err;
    try {
      const items = await getCargoTracking(unipassKeys, p.bl_number!);
      if (items.length === 0) {
        return { content: [{ type: "text", text: "해당 B/L 번호의 통관 진행정보가 없습니다." }] };
      }
      const lines = items.map((i) =>
        `- [${i.prgsSttsCd}] ${i.prgsStts} | 화물번호: ${i.cargMtNo} | 일자: ${i.csclPrgsDate}`,
      );
      return { content: [{ type: "text", text: `## 화물통관진행 (B/L: ${p.bl_number})\n\n${lines.join("\n")}` }] };
    } catch (error) {
      return errorResponse("화물통관 조회", error);
    }
  };
}

function handleGetContainers(unipassKeys: Record<string, string>) {
  return async (p: ImportClearanceParams): Promise<SkillResult> => {
    const err = requireParam(p as Record<string, unknown>, "bl_number", "get_containers");
    if (err) return err;
    try {
      const items = await getContainerInfo(unipassKeys, p.bl_number!);
      if (items.length === 0) {
        return { content: [{ type: "text", text: "해당 B/L 번호의 컨테이너 정보가 없습니다." }] };
      }
      const lines = items.map((i) =>
        `- 컨테이너: ${i.cntrNo} | 크기: ${i.cntrSzCd} | 봉인: ${i.sealNo}`,
      );
      return { content: [{ type: "text", text: `## 컨테이너내역 (B/L: ${p.bl_number})\n\n${lines.join("\n")}` }] };
    } catch (error) {
      return errorResponse("컨테이너 조회", error);
    }
  };
}

function handleGetArrivalReport(unipassKeys: Record<string, string>) {
  return async (p: ImportClearanceParams): Promise<SkillResult> => {
    const err = requireParam(p as Record<string, unknown>, "bl_number", "get_arrival_report");
    if (err) return err;
    try {
      const items = await getArrivalReport(unipassKeys, p.bl_number!);
      if (items.length === 0) {
        return { content: [{ type: "text", text: "해당 B/L 번호의 입항보고 내역이 없습니다." }] };
      }
      const lines = items.map((i) =>
        `- 선명: ${i.vydfNm} | 세관: ${i.etprCstm} | 입항일: ${i.etprDt} | Master B/L: ${i.msrm}`,
      );
      return { content: [{ type: "text", text: `## 입항보고내역 (B/L: ${p.bl_number})\n\n${lines.join("\n")}` }] };
    } catch (error) {
      return errorResponse("입항보고 조회", error);
    }
  };
}

function handleVerifyDeclaration(unipassKeys: Record<string, string>) {
  return async (p: ImportClearanceParams): Promise<SkillResult> => {
    const err = requireParam(p as Record<string, unknown>, "declaration_no", "verify_declaration");
    if (err) return err;
    try {
      const item = await verifyImportDeclaration(unipassKeys, p.declaration_no!);
      if (!item) {
        return emptyResultMessage("수입신고 검증", { declaration_no: p.declaration_no }, "신고번호 형식(14자리)을 확인해 주세요. 예: 12345-26-012345X");
      }
      const text = [
        `## 수입신고 검증 (${p.declaration_no})`,
        "",
        `- 신고번호: ${item.dclrNo}`,
        `- 신고일자: ${item.dclrDt}`,
        `- 상태: ${item.dclrSttsNm} (${item.dclrSttsCd})`,
        `- B/L: ${item.blNo}`,
        `- 업체명: ${item.trdnNm}`,
        `- HS부호: ${item.hsSgn}`,
        `- 중량: ${item.wght}`,
        `- 건수: ${item.gcnt}`,
      ].join("\n");
      return { content: [{ type: "text", text }] };
    } catch (error) {
      return errorResponse("수입신고 검증", error);
    }
  };
}

function handleGetInspection(unipassKeys: Record<string, string>) {
  return async (p: ImportClearanceParams): Promise<SkillResult> => {
    const err = requireParam(p as Record<string, unknown>, "bl_number", "get_inspection");
    if (err) return err;
    try {
      const items = await getInspectionInfo(unipassKeys, p.bl_number!);
      if (items.length === 0) {
        return { content: [{ type: "text", text: "해당 B/L 번호의 검사검역 정보가 없습니다." }] };
      }
      const lines = items.map((i) =>
        `- [${i.inqrRsltCd}] ${i.inqrRsltNm} | 검사일: ${i.inqrDt}`,
      );
      return { content: [{ type: "text", text: `## 검사검역내역 (B/L: ${p.bl_number})\n\n${lines.join("\n")}` }] };
    } catch (error) {
      return errorResponse("검사검역 조회", error);
    }
  };
}

function handleGetTaxPayment(unipassKeys: Record<string, string>) {
  return async (p: ImportClearanceParams): Promise<SkillResult> => {
    const err = requireParam(p as Record<string, unknown>, "declaration_no", "get_tax_payment");
    if (err) return err;
    try {
      const items = await getTaxPaymentInfo(unipassKeys, p.declaration_no!);
      if (items.length === 0) {
        return { content: [{ type: "text", text: "해당 신고번호의 제세 납부 정보가 없습니다." }] };
      }
      const lines = items.map((i) =>
        `- 신고번호: ${i.dclrNo} | 납부여부: ${i.txpymYn === "Y" ? "납부완료" : "미납"} | 납부일: ${i.txpymDt} | 금액: ${i.txpymAmt}원`,
      );
      return { content: [{ type: "text", text: `## 수입 제세 납부여부 (${p.declaration_no})\n\n${lines.join("\n")}` }] };
    } catch (error) {
      return errorResponse("제세 납부 조회", error);
    }
  };
}

function handleImportRequirement(unipassKeys: Record<string, string>) {
  return async (p: ImportClearanceParams): Promise<SkillResult> => {
    const err1 = requireParam(p as Record<string, unknown>, "req_apre_no", "import_requirement");
    if (err1) return err1;
    const err2 = requireParam(p as Record<string, unknown>, "imex_tpcd", "import_requirement");
    if (err2) return err2;
    try {
      const item = await getImportRequirement(unipassKeys, p.req_apre_no!, p.imex_tpcd!);
      if (!item) {
        return { content: [{ type: "text", text: "결과를 찾을 수 없습니다." }] };
      }
      const text = [
        `## 요건확인내역 (${p.req_apre_no})`,
        "",
        `- 요건승인번호: ${item.reqApreNo}`,
        `- 관련법령명: ${item.relaFrmlNm}`,
        `- 승인조건: ${item.apreCond}`,
        `- 유효기간: ${item.valtPrid}`,
      ].join("\n");
      return { content: [{ type: "text", text }] };
    } catch (error) {
      return errorResponse("요건확인 조회", error);
    }
  };
}

function handleSingleWindow(unipassKeys: Record<string, string>) {
  return async (p: ImportClearanceParams): Promise<SkillResult> => {
    const err = requireParam(p as Record<string, unknown>, "request_no", "single_window");
    if (err) return err;
    try {
      const items = await getSingleWindowHistory(unipassKeys, p.request_no!);
      if (items.length === 0) {
        return { content: [{ type: "text", text: "결과가 없습니다." }] };
      }
      const lines = items.map((i) => `- ${i.reqRqstNo}: ${i.elctDocNm} | ${i.reqRqstPrcsSttsNm}`);
      return { content: [{ type: "text", text: truncate(`## 통관단일창구 (${p.request_no})\n\n${lines.join("\n")}`) }] };
    } catch (error) {
      return errorResponse("단일창구 조회", error);
    }
  };
}

function handleCustomsCheck(unipassKeys: Record<string, string>) {
  return async (p: ImportClearanceParams): Promise<SkillResult> => {
    const err1 = requireParam(p as Record<string, unknown>, "hs_code", "customs_check");
    if (err1) return err1;
    const err2 = requireParam(p as Record<string, unknown>, "imex_type", "customs_check");
    if (err2) return err2;
    try {
      const items = await getCustomsCheckItems(unipassKeys, p.hs_code!, p.imex_type!);
      if (items.length === 0) {
        return { content: [{ type: "text", text: "결과가 없습니다." }] };
      }
      const lines = items.map((i) => `- ${i.hsSgn}: ${i.dcerCfrmLworNm} | 기관: ${i.reqCfrmIstmNm}`);
      return { content: [{ type: "text", text: truncate(`## 세관장확인대상 (${p.hs_code})\n\n${lines.join("\n")}`) }] };
    } catch (error) {
      return errorResponse("세관장확인 조회", error);
    }
  };
}

function handlePostalCustoms(unipassKeys: Record<string, string>) {
  return async (p: ImportClearanceParams): Promise<SkillResult> => {
    const err = requireParam(p as Record<string, unknown>, "postal_code", "postal_customs");
    if (err) return err;
    try {
      const items = await getPostalCustoms(unipassKeys, p.postal_code!);
      if (items.length === 0) {
        return { content: [{ type: "text", text: "결과가 없습니다." }] };
      }
      const lines = items.map((i) => `- ${i.jrsdCstmSgn}: ${i.jrsdCstmSgnNm}`);
      return { content: [{ type: "text", text: `## 관할세관 (우편번호: ${p.postal_code})\n\n${lines.join("\n")}` }] };
    } catch (error) {
      return errorResponse("관할세관 조회", error);
    }
  };
}

function handleAttachmentStatus(unipassKeys: Record<string, string>) {
  return async (p: ImportClearanceParams): Promise<SkillResult> => {
    const err1 = requireParam(p as Record<string, unknown>, "doc_type_code", "attachment_status");
    if (err1) return err1;
    const err2 = requireParam(p as Record<string, unknown>, "submit_no", "attachment_status");
    if (err2) return err2;
    try {
      const items = await getAttachmentSubmitStatus(unipassKeys, p.doc_type_code!, p.submit_no!);
      if (items.length === 0) {
        return { content: [{ type: "text", text: "결과가 없습니다." }] };
      }
      const lines = items.map((i) => `- ${i.dcshSbmtNo}: ${i.elctDocNm} | 제출: ${i.attchSbmtYn}`);
      return { content: [{ type: "text", text: truncate(`## 첨부서류 제출현황 (${p.submit_no})\n\n${lines.join("\n")}`) }] };
    } catch (error) {
      return errorResponse("첨부서류 조회", error);
    }
  };
}

function handleReimportBalance(unipassKeys: Record<string, string>) {
  return async (p: ImportClearanceParams): Promise<SkillResult> => {
    const err1 = requireParam(p as Record<string, unknown>, "export_decl_no", "reimport_balance");
    if (err1) return err1;
    const err2 = requireParam(p as Record<string, unknown>, "line_no", "reimport_balance");
    if (err2) return err2;
    try {
      const items = await getReimportExportBalance(unipassKeys, { expDclrNo: p.export_decl_no!, expDclrLnNo: p.line_no! });
      if (items.length === 0) {
        return { content: [{ type: "text", text: "결과가 없습니다." }] };
      }
      const lines = items.map((i) => `- 규격: ${i.stsz} | 잔량: ${i.rsqty}${i.rsqtyUt}`);
      return { content: [{ type: "text", text: truncate(`## 재수입 수출잔량 (${p.export_decl_no})\n\n${lines.join("\n")}`) }] };
    } catch (error) {
      return errorResponse("재수입 잔량 조회", error);
    }
  };
}

function handlePostalClearance(unipassKeys: Record<string, string>) {
  return async (p: ImportClearanceParams): Promise<SkillResult> => {
    const err1 = requireParam(p as Record<string, unknown>, "postal_type", "postal_clearance");
    if (err1) return err1;
    const err2 = requireParam(p as Record<string, unknown>, "postal_no", "postal_clearance");
    if (err2) return err2;
    try {
      const item = await getPostalClearance(unipassKeys, p.postal_type!, p.postal_no!);
      if (!item) {
        return { content: [{ type: "text", text: "결과를 찾을 수 없습니다." }] };
      }
      const text = [
        `## 우편물통관 (${p.postal_no})`,
        "",
        `- 우편물번호: ${item.psmtNo}`,
        `- 우편물구분: ${item.psmtKcd}`,
        `- 발송국가: ${item.sendCntyCdNm}`,
        `- 총중량: ${item.ttwg}`,
        `- 처리상태: ${item.psmtPrcsStcd}`,
      ].join("\n");
      return { content: [{ type: "text", text }] };
    } catch (error) {
      return errorResponse("우편물통관 조회", error);
    }
  };
}

function handleReexportBalance(unipassKeys: Record<string, string>) {
  return async (p: ImportClearanceParams): Promise<SkillResult> => {
    const err = requireParam(p as Record<string, unknown>, "import_decl_no", "reexport_balance");
    if (err) return err;
    try {
      const items = await getReexportDutyFreeBalance(unipassKeys, p.import_decl_no!);
      if (items.length === 0) {
        return { content: [{ type: "text", text: "결과가 없습니다." }] };
      }
      const lines = items.map((i) => `- ${i.impDclrNo}-${i.lnNo}: 잔량 수량 ${i.qtyRsqty} / 중량 ${i.wghtRsqty}`);
      return { content: [{ type: "text", text: truncate(`## 재수출면세 이행잔량 (${p.import_decl_no})\n\n${lines.join("\n")}`) }] };
    } catch (error) {
      return errorResponse("재수출면세 잔량 조회", error);
    }
  };
}

function handleReexportDeadline(unipassKeys: Record<string, string>) {
  return async (p: ImportClearanceParams): Promise<SkillResult> => {
    const err1 = requireParam(p as Record<string, unknown>, "import_decl_no", "reexport_deadline");
    if (err1) return err1;
    const err2 = requireParam(p as Record<string, unknown>, "line_no", "reexport_deadline");
    if (err2) return err2;
    try {
      const item = await getReexportDeadline(unipassKeys, p.import_decl_no!, p.line_no!);
      if (!item) {
        return { content: [{ type: "text", text: "결과를 찾을 수 없습니다." }] };
      }
      const text = [
        `## 재수출 이행기한 (${p.import_decl_no})`,
        "",
        `- 연장일자: ${item.xtnsDt}`,
      ].join("\n");
      return { content: [{ type: "text", text }] };
    } catch (error) {
      return errorResponse("재수출 기한 조회", error);
    }
  };
}

function handleReexportCompletion(unipassKeys: Record<string, string>) {
  return async (p: ImportClearanceParams): Promise<SkillResult> => {
    const err1 = requireParam(p as Record<string, unknown>, "import_decl_no", "reexport_completion");
    if (err1) return err1;
    const err2 = requireParam(p as Record<string, unknown>, "line_no", "reexport_completion");
    if (err2) return err2;
    try {
      const item = await getReexportCompletion(unipassKeys, p.import_decl_no!, p.line_no!);
      if (!item) {
        return { content: [{ type: "text", text: "결과를 찾을 수 없습니다." }] };
      }
      const text = [
        `## 재수출 이행완료 (${p.import_decl_no})`,
        "",
        `- 처리상태: ${item.reexpFffmnPrcsStcd}`,
        `- 최종이행일: ${item.reexpFfmnLastEnfrDt}`,
        `- 최종이행의무면제기록: ${item.lastReexpFfmnDtyConcRcd}`,
      ].join("\n");
      return { content: [{ type: "text", text }] };
    } catch (error) {
      return errorResponse("재수출 이행완료 조회", error);
    }
  };
}

function handleCollateralRelease(unipassKeys: Record<string, string>) {
  return async (p: ImportClearanceParams): Promise<SkillResult> => {
    const err = requireParam(p as Record<string, unknown>, "import_decl_no", "collateral_release");
    if (err) return err;
    try {
      const item = await getCollateralRelease(unipassKeys, p.import_decl_no!);
      if (!item) {
        return { content: [{ type: "text", text: "결과를 찾을 수 없습니다." }] };
      }
      const text = [
        `## 담보해제 처리현황 (${p.import_decl_no})`,
        "",
        `- 처리상태: ${item.mgPrcsStcdNm}`,
        `- 승인일자: ${item.mgAprvDt}`,
        `- 신청일자: ${item.mgRqstDt}`,
      ].join("\n");
      return { content: [{ type: "text", text }] };
    } catch (error) {
      return errorResponse("담보해제 조회", error);
    }
  };
}

function handleDeclarationCorrection(unipassKeys: Record<string, string>) {
  return async (p: ImportClearanceParams): Promise<SkillResult> => {
    const err1 = requireParam(p as Record<string, unknown>, "submit_no", "declaration_correction");
    if (err1) return err1;
    const err2 = requireParam(p as Record<string, unknown>, "imex_type", "declaration_correction");
    if (err2) return err2;
    const err3 = requireParam(p as Record<string, unknown>, "request_count", "declaration_correction");
    if (err3) return err3;
    try {
      const item = await getDeclarationCorrection(unipassKeys, {
        dcshSbmtNo: p.submit_no!, imexTpcd: p.imex_type!, mdfyRqstDgcnt: p.request_count!,
      });
      if (!item) {
        return { content: [{ type: "text", text: "결과를 찾을 수 없습니다." }] };
      }
      const text = [
        `## 정정신청 처리상태 (${p.submit_no})`,
        "",
        `- 처리상태코드: ${item.mdfyRqstPrcsStcd}`,
        `- 처리상태명: ${item.mdfyRqstPrcsStcdNm}`,
      ].join("\n");
      return { content: [{ type: "text", text }] };
    } catch (error) {
      return errorResponse("정정신청 조회", error);
    }
  };
}

function handleSearchImportMeat(mafraApiKey?: string) {
  return async (p: ImportClearanceParams): Promise<SkillResult> => {
    if (!mafraApiKey) {
      return {
        content: [{ type: "text", text: "MAFRA_API_KEY가 설정되지 않았습니다." }],
        isError: true,
      };
    }
    const err = requireParam(p as Record<string, unknown>, "import_date", "search_import_meat");
    if (err) return err;
    try {
      const page = p.page ?? 1;
      const perPage = p.per_page ?? 100;
      const startIndex = (page - 1) * perPage + 1;
      const endIndex = startIndex + perPage - 1;

      const result = await fetchImportMeatTrace(mafraApiKey, {
        importDate: p.import_date!,
        productCode: p.product_code,
        blNo: undefined,
        originCountry: p.origin_country,
        saleStatus: p.sale_status,
        startIndex,
        endIndex,
      });

      if (result.error) {
        return {
          content: [{ type: "text", text: `수입축산물 이력 조회 오류: ${result.error}` }],
          isError: true,
        };
      }

      if (result.records.length === 0) {
        return {
          content: [{ type: "text", text: `수입일자 ${p.import_date}의 수입축산물 이력 정보가 없습니다.` }],
        };
      }

      const lines = result.records.map((r) =>
        `- **${r.distbIdntfcNo}** ${r.prdlstNm} | BL: ${r.blNo} | 원산지: ${r.orgplceNation}` +
        (r.importBsshNm ? ` | 수입사: ${r.importBsshNm}` : "") +
        (r.slauHseNm ? ` | 도축장: ${r.slauHseNm}` : "") +
        (r.prcssHseNm ? ` | 가공장: ${r.prcssHseNm}` : ""),
      );

      const header = `## 수입축산물 이력 (${p.import_date})\n\n` +
        `총 ${result.totalCount}건 중 ${result.records.length}건 표시 (${page}페이지)\n\n`;

      return {
        content: [{ type: "text", text: truncate(header + lines.join("\n")) }],
      };
    } catch (error) {
      return errorResponse("수입축산물 이력 조회", error);
    }
  };
}

function handleLookupMeatByBl(mafraApiKey?: string) {
  return async (p: ImportClearanceParams): Promise<SkillResult> => {
    if (!mafraApiKey) {
      return {
        content: [{ type: "text", text: "MAFRA_API_KEY가 설정되지 않았습니다." }],
        isError: true,
      };
    }
    const err1 = requireParam(p as Record<string, unknown>, "bl_number", "lookup_meat_by_bl");
    if (err1) return err1;
    const err2 = requireParam(p as Record<string, unknown>, "import_date", "lookup_meat_by_bl");
    if (err2) return err2;
    try {
      const result = await fetchImportMeatTrace(mafraApiKey, {
        importDate: p.import_date!,
        blNo: p.bl_number!,
      });

      if (result.error) {
        return {
          content: [{ type: "text", text: `수입축산물 이력 조회 오류: ${result.error}` }],
          isError: true,
        };
      }

      if (result.records.length === 0) {
        return {
          content: [{ type: "text", text: `BL ${p.bl_number}의 수입축산물 이력 정보가 없습니다.` }],
        };
      }

      const lines = result.records.map((r) => [
        `### ${r.distbIdntfcNo} — ${r.prdlstNm}`,
        `- 원산지: ${r.orgplceNation}`,
        r.slauHseNm ? `- 도축장: ${r.slauHseNm} (${r.slauStartDe}~${r.slauEndDe})` : null,
        r.prcssHseNm ? `- 가공장: ${r.prcssHseNm} (${r.prcssStartDe}~${r.prcssEndDe})` : null,
        r.exportBsshNm ? `- 수출업체: ${r.exportBsshNm}` : null,
        r.importBsshNm ? `- 수입업체: ${r.importBsshNm}` : null,
        `- 판매여부: ${r.sleAt}`,
      ].filter(Boolean).join("\n"));

      const header = `## BL ${p.bl_number} 수입축산물 이력\n\n총 ${result.totalCount}건\n\n`;

      return {
        content: [{ type: "text", text: truncate(header + lines.join("\n\n")) }],
      };
    } catch (error) {
      return errorResponse("수입축산물 BL 이력 조회", error);
    }
  };
}

export function createImportClearanceHandler(
  apiKeys: Record<string, string>,
  mafraApiKey?: string,
) {
  return createDispatcher<ImportClearanceParams>("import_clearance", {
    track_cargo: handleTrackCargo(apiKeys),
    get_containers: handleGetContainers(apiKeys),
    get_arrival_report: handleGetArrivalReport(apiKeys),
    verify_declaration: handleVerifyDeclaration(apiKeys),
    get_inspection: handleGetInspection(apiKeys),
    get_tax_payment: handleGetTaxPayment(apiKeys),
    import_requirement: handleImportRequirement(apiKeys),
    single_window: handleSingleWindow(apiKeys),
    customs_check: handleCustomsCheck(apiKeys),
    postal_customs: handlePostalCustoms(apiKeys),
    attachment_status: handleAttachmentStatus(apiKeys),
    reimport_balance: handleReimportBalance(apiKeys),
    postal_clearance: handlePostalClearance(apiKeys),
    reexport_balance: handleReexportBalance(apiKeys),
    reexport_deadline: handleReexportDeadline(apiKeys),
    reexport_completion: handleReexportCompletion(apiKeys),
    collateral_release: handleCollateralRelease(apiKeys),
    declaration_correction: handleDeclarationCorrection(apiKeys),
    search_import_meat: handleSearchImportMeat(mafraApiKey),
    lookup_meat_by_bl: handleLookupMeatByBl(mafraApiKey),
  });
}

export function registerImportClearance(
  server: McpServer,
  apiKeys: Record<string, string>,
  mafraApiKey?: string,
): void {
  const handler = createImportClearanceHandler(apiKeys, mafraApiKey);

  registerSkillTool(server, {
    name: "import_clearance",
    title: "수입 통관",
    description: "수입 통관 — 화물추적, 수입신고 검증, 검사검역, 제세 납부, 요건확인, 보세구역, 우편물통관, 재수출면세, 수입축산물 이력 등 수입통관 전체를 커버하는 통합 도구",
    inputSchema: {
      action: z.enum(ACTIONS).describe(
        "track_cargo=B/L화물추적 | get_containers=컨테이너정보 | get_arrival_report=입항적하목록 | verify_declaration=수입신고조회 | get_inspection=검사정보 | get_tax_payment=세금납부정보 | import_requirement=수입요건확인 | single_window=싱글윈도우이력 | customs_check=세관검사대상 | postal_customs=우편세관 | attachment_status=첨부서류상태 | reimport_balance=재수입면세잔량 | postal_clearance=우편통관 | reexport_balance=재수출면세잔량 | reexport_deadline=재수출기한 | reexport_completion=재수출이행 | collateral_release=담보해제 | declaration_correction=신고정정 | search_import_meat=수입축산물이력검색 | lookup_meat_by_bl=B/L축산물이력",
      ),
      bl_number: z.string().optional().describe("B/L(선하증권) 번호 (track_cargo, get_containers, get_arrival_report, get_inspection, lookup_meat_by_bl에서 사용)"),
      declaration_no: z.string().optional().describe("수입신고번호 (verify_declaration, get_tax_payment에서 사용)"),
      cargo_no: z.string().optional().describe("화물관리번호"),
      req_apre_no: z.string().optional().describe("요건승인번호 (import_requirement에서 사용)"),
      imex_tpcd: z.string().optional().describe("수출입구분코드 (import_requirement에서 사용, 1=수입, 2=수출)"),
      imex_type: z.string().optional().describe("수출입구분 (customs_check, declaration_correction에서 사용)"),
      request_no: z.string().optional().describe("요청번호 (single_window에서 사용)"),
      hs_code: z.string().optional().describe("HS 부호 (customs_check에서 사용)"),
      postal_code: z.string().optional().describe("우편번호 (postal_customs에서 사용)"),
      doc_type_code: z.string().optional().describe("신고업무상세유형코드 (attachment_status에서 사용)"),
      submit_no: z.string().optional().describe("전자서류제출번호 (attachment_status, declaration_correction에서 사용)"),
      export_decl_no: z.string().optional().describe("수출신고번호 (reimport_balance에서 사용)"),
      import_decl_no: z.string().optional().describe("수입신고번호 (reexport_balance, reexport_deadline, reexport_completion, collateral_release에서 사용)"),
      line_no: z.string().optional().describe("란번호 (reimport_balance, reexport_deadline, reexport_completion에서 사용)"),
      postal_type: z.string().optional().describe("우편물구분코드 (postal_clearance에서 사용)"),
      postal_no: z.string().optional().describe("우편물번호 (postal_clearance에서 사용)"),
      request_count: z.string().optional().describe("정정요청차수 (declaration_correction에서 사용)"),
      import_date: z.string().optional().describe("수입일자 YYYYMMDD (search_import_meat, lookup_meat_by_bl에서 사용)"),
      product_code: z.string().optional().describe("품목코드 (search_import_meat에서 사용)"),
      origin_country: z.string().optional().describe("원산지국가 (search_import_meat에서 사용)"),
      sale_status: z.enum(["Y", "N"]).optional().describe("판매여부 (search_import_meat에서 사용)"),
      page: z.number().optional().describe("페이지 번호 (search_import_meat에서 사용)"),
      per_page: z.number().optional().describe("페이지당 건수 (search_import_meat에서 사용)"),
    },
    callback: async (params) => handler(params as ImportClearanceParams),
  });
}
