/**
 * Skill: export_clearance — 수출 통관 통합 조회
 * 기존 도구: unipass_export_performance, unipass_verify_export_declaration,
 *   unipass_export_by_vehicle, unipass_loading_inspection,
 *   unipass_ecommerce_export_load, unipass_bonded_release
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  getExportPerformance,
  verifyExportDeclaration,
  getExportByVehicle,
  getLoadingInspection,
  getEcommerceExportLoad,
  getBondedRelease,
} from "../../unipass-api.js";
import { errorResponse, truncate } from "../../shared.js";
import { createDispatcher, requireParam, type SkillResult, registerSkillTool } from "./_shared.js";

const ACTIONS = [
  "export_performance",
  "verify_export",
  "export_by_vehicle",
  "loading_inspection",
  "ecommerce_export_load",
  "bonded_release",
] as const;

type ExportClearanceParams = {
  action: string;
  export_declaration_no?: string;
  pubs_no?: string;
  decl_no?: string;
  brno?: string;
  country?: string;
  product?: string;
  weight?: string;
  vehicle_no?: string;
  ecommerce_decl_no?: string;
  business_no?: string;
};

function handleExportPerformance(apiKeys: Record<string, string>) {
  return async (p: ExportClearanceParams): Promise<SkillResult> => {
    const err = requireParam(p as Record<string, unknown>, "export_declaration_no", "export_performance");
    if (err) return err;
    try {
      const item = await getExportPerformance(apiKeys, p.export_declaration_no!);
      if (!item) {
        return { content: [{ type: "text", text: "해당 수출신고번호의 이행내역을 찾을 수 없습니다." }] };
      }
      return {
        content: [{
          type: "text",
          text: truncate(
            `## 수출이행내역 (${p.export_declaration_no})\n\n` +
            `- 수출신고번호: ${item.expDclrNo}\n- 선적완료여부: ${item.shpmCmplYn}\n` +
            `- 선명: ${item.sanm}\n- 선적중량: ${item.shpmWght}\n- 통관중량: ${item.csclWght}`,
          ),
        }],
      };
    } catch (error) {
      return errorResponse("수출이행내역 조회", error);
    }
  };
}

function handleVerifyExport(apiKeys: Record<string, string>) {
  return async (p: ExportClearanceParams): Promise<SkillResult> => {
    const err = requireParam(p as Record<string, unknown>, "pubs_no", "verify_export");
    if (err) return err;
    try {
      const item = await verifyExportDeclaration(apiKeys, {
        expDclrCrfnPblsNo: p.pubs_no!,
        expDclrNo: p.decl_no || "",
        txprBrno: p.brno || "",
        orcyCntyCd: p.country || "",
        prnm: p.product || "",
        ntwg: p.weight || "",
      });
      if (!item) {
        return { content: [{ type: "text", text: "수출신고필증 검증 결과를 찾을 수 없습니다." }] };
      }
      return {
        content: [{
          type: "text",
          text: `## 수출신고필증 검증\n\n- 건수: ${item.tCnt}\n- 검증결과: ${item.vrfcRsltCn}`,
        }],
      };
    } catch (error) {
      return errorResponse("수출신고필증 검증", error);
    }
  };
}

function handleExportByVehicle(apiKeys: Record<string, string>) {
  return async (p: ExportClearanceParams): Promise<SkillResult> => {
    const err = requireParam(p as Record<string, unknown>, "vehicle_no", "export_by_vehicle");
    if (err) return err;
    try {
      const items = await getExportByVehicle(apiKeys, { cbno: p.vehicle_no! });
      if (items.length === 0) {
        return { content: [{ type: "text", text: "해당 차대번호의 수출이행 내역이 없습니다." }] };
      }
      const lines = items.map((i) => `- ${i.cbno}: ${i.expDclrNo} | ${i.vhclPrgsStts}`);
      return {
        content: [{
          type: "text",
          text: truncate(`## 차대번호별 수출이행 (${p.vehicle_no})\n\n${lines.join("\n")}`),
        }],
      };
    } catch (error) {
      return errorResponse("차대번호 수출이행 조회", error);
    }
  };
}

function handleLoadingInspection(apiKeys: Record<string, string>) {
  return async (p: ExportClearanceParams): Promise<SkillResult> => {
    const err = requireParam(p as Record<string, unknown>, "export_declaration_no", "loading_inspection");
    if (err) return err;
    try {
      const item = await getLoadingInspection(apiKeys, p.export_declaration_no!);
      if (!item) {
        return { content: [{ type: "text", text: "적재지 검사정보를 찾을 수 없습니다." }] };
      }
      return {
        content: [{
          type: "text",
          text: `## 적재지 검사정보 (${p.export_declaration_no})\n\n- 검사대상여부: ${item.expInscTrgtYn}\n- 검사완료여부: ${item.expInscCmplYn}`,
        }],
      };
    } catch (error) {
      return errorResponse("적재지 검사 조회", error);
    }
  };
}

function handleEcommerceExportLoad(apiKeys: Record<string, string>) {
  return async (p: ExportClearanceParams): Promise<SkillResult> => {
    const err = requireParam(p as Record<string, unknown>, "ecommerce_decl_no", "ecommerce_export_load");
    if (err) return err;
    try {
      const item = await getEcommerceExportLoad(apiKeys, p.ecommerce_decl_no!);
      if (!item) {
        return { content: [{ type: "text", text: "전자상거래 수출 적재이행 정보를 찾을 수 없습니다." }] };
      }
      return {
        content: [{
          type: "text",
          text: `## 전자상거래수출 적재이행 (${p.ecommerce_decl_no})\n\n- 적재완료여부: ${item.loadCmplYn}`,
        }],
      };
    } catch (error) {
      return errorResponse("전자상거래 적재이행 조회", error);
    }
  };
}

function handleBondedRelease(apiKeys: Record<string, string>) {
  return async (p: ExportClearanceParams): Promise<SkillResult> => {
    const err = requireParam(p as Record<string, unknown>, "business_no", "bonded_release");
    if (err) return err;
    try {
      const item = await getBondedRelease(apiKeys, p.business_no!);
      if (!item) {
        return { content: [{ type: "text", text: "보세구역 반출신고 정보를 찾을 수 없습니다." }] };
      }
      return {
        content: [{
          type: "text",
          text: `## 보세구역 반출신고 (${p.business_no})\n\n- 반출일자: ${item.rlbrDt}\n- 반출여부: ${item.rlbrYn}`,
        }],
      };
    } catch (error) {
      return errorResponse("보세구역 반출신고 조회", error);
    }
  };
}

export function createExportClearanceHandler(
  apiKeys: Record<string, string>,
) {
  return createDispatcher<ExportClearanceParams>("export_clearance", {
    export_performance: handleExportPerformance(apiKeys),
    verify_export: handleVerifyExport(apiKeys),
    export_by_vehicle: handleExportByVehicle(apiKeys),
    loading_inspection: handleLoadingInspection(apiKeys),
    ecommerce_export_load: handleEcommerceExportLoad(apiKeys),
    bonded_release: handleBondedRelease(apiKeys),
  });
}

export function registerExportClearance(
  server: McpServer,
  apiKeys: Record<string, string>,
): void {
  const handler = createExportClearanceHandler(apiKeys);

  registerSkillTool(server, {
    name: "export_clearance",
    title: "수출 통관",
    description: "수출 통관 — 수출이행내역, 수출신고필증 검증, 차대번호별 수출, 적재지 검사, 전자상거래 적재, 반출신고 등 수출통관 도구",
    inputSchema: {
      action: z.enum(ACTIONS).describe(
        "export_performance=수출이행내역(export_declaration_no필수) | verify_export=수출신고필증검증(pubs_no필수) | export_by_vehicle=차대번호수출이행(vehicle_no필수) | loading_inspection=적재지검사(export_declaration_no필수) | ecommerce_export_load=전자상거래적재이행(ecommerce_decl_no필수) | bonded_release=보세구역반출신고(business_no필수)",
      ),
      export_declaration_no: z.string().optional().describe("수출신고번호 (export_performance, loading_inspection)"),
      pubs_no: z.string().optional().describe("수출신고확인서발급번호 (verify_export)"),
      decl_no: z.string().optional().describe("수출신고번호 (verify_export)"),
      brno: z.string().optional().describe("납세자사업자등록번호 (verify_export)"),
      country: z.string().optional().describe("원산지국가코드 (verify_export)"),
      product: z.string().optional().describe("품명 (verify_export)"),
      weight: z.string().optional().describe("순중량 (verify_export)"),
      vehicle_no: z.string().optional().describe("차대번호 (export_by_vehicle)"),
      ecommerce_decl_no: z.string().optional().describe("전자상거래 수출신고번호 (ecommerce_export_load)"),
      business_no: z.string().optional().describe("사업자등록번호 (bonded_release)"),
    },
    callback: async (params) => handler(params as ExportClearanceParams),
  });
}
