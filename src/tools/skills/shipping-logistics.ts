/**
 * Skill: shipping_logistics — 물류·운송 통합 도구
 * 기존 도구: unipass 보세구역, 장치장, 보세운송차량, 입출항보고,
 *   하선신고, 해상출항허가, 항공출항허가, 항공입항보고, 보세운송배차
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
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
import { errorResponse, truncate } from "../../shared.js";
import { createDispatcher, requireParam, registerSkillTool, type SkillResult } from "./_shared.js";

const ACTIONS = [
  "bonded_area",
  "shed_info",
  "bonded_vehicle",
  "port_entry_exit",
  "unloading_declarations",
  "sea_departure",
  "air_departure",
  "air_arrival_report",
  "bonded_transport_info",
] as const;

type ShippingParams = {
  action: string;
  cargo_no?: string;
  customs_code?: string;
  shed_code?: string;
  btco_code?: string;
  vehicle_no?: string;
  imo_no?: string;
  io_type?: string;
  entry_date?: string;
  submit_no?: string;
  permit_no?: string;
  flight?: string;
  flight_name?: string;
  start_date?: string;
  end_date?: string;
};

function handleBondedArea(apiKeys: Record<string, string>) {
  return async (p: ShippingParams): Promise<SkillResult> => {
    const err = requireParam(p as Record<string, unknown>, "cargo_no", "bonded_area");
    if (err) return err;
    try {
      const items = await getBondedAreaStorage(apiKeys, p.cargo_no!);
      if (items.length === 0) {
        return { content: [{ type: "text", text: "보세구역 장치기간 결과가 없습니다." }] };
      }
      const lines = items.map(
        (i) => `- 화물번호: ${i.cargMtNo} | 보세구역: ${i.bndAreaNm} | 장치기간: ${i.strgBgnDt} ~ ${i.strgPridExpnDt}`,
      );
      return { content: [{ type: "text", text: truncate(`## 보세구역 장치기간 (${p.cargo_no})\n\n${lines.join("\n")}`) }] };
    } catch (error) {
      return errorResponse("보세구역 장치기간 조회", error);
    }
  };
}

function handleShedInfo(apiKeys: Record<string, string>) {
  return async (p: ShippingParams): Promise<SkillResult> => {
    try {
      const items = await getShedInfo(apiKeys, { jrsdCstmCd: p.customs_code, snarSgn: p.shed_code });
      if (items.length === 0) {
        return { content: [{ type: "text", text: "장치장 정보 결과가 없습니다." }] };
      }
      const lines = items.map(
        (i) => `- ${i.snarSgn}: ${i.snarNm} | ${i.snarAddr}`,
      );
      return { content: [{ type: "text", text: truncate(`## 장치장 정보\n\n${lines.join("\n")}`) }] };
    } catch (error) {
      return errorResponse("장치장 정보 조회", error);
    }
  };
}

function handleBondedVehicle(apiKeys: Record<string, string>) {
  return async (p: ShippingParams): Promise<SkillResult> => {
    try {
      const items = await getBondedTransportVehicle(apiKeys, { btcoSgn: p.btco_code, vhclNoSanm: p.vehicle_no });
      if (items.length === 0) {
        return { content: [{ type: "text", text: "보세운송차량 결과가 없습니다." }] };
      }
      const lines = items.map(
        (i) => `- ${i.vhclNoSanm} (${i.btcoSgn}) | ${i.bnbnTrnpEqipTpcdNm} | 사용: ${i.useYn}`,
      );
      return { content: [{ type: "text", text: truncate(`## 보세운송차량\n\n${lines.join("\n")}`) }] };
    } catch (error) {
      return errorResponse("보세운송차량 조회", error);
    }
  };
}

function handlePortEntryExit(apiKeys: Record<string, string>) {
  return async (p: ShippingParams): Promise<SkillResult> => {
    const err = requireParam(p as Record<string, unknown>, "imo_no", "port_entry_exit")
      ?? requireParam(p as Record<string, unknown>, "io_type", "port_entry_exit");
    if (err) return err;
    try {
      const items = await getPortEntryExit(apiKeys, {
        shipCallImoNo: p.imo_no!,
        seaFlghIoprTpcd: p.io_type!,
        cstmSgn: p.customs_code,
      });
      if (items.length === 0) {
        return { content: [{ type: "text", text: "입출항보고 결과가 없습니다." }] };
      }
      const lines = items.map(
        (i) => `- ${i.shipFlgtNm} | ${i.cstmNm} | 입항: ${i.etprDttm}`,
      );
      return { content: [{ type: "text", text: truncate(`## 입출항보고내역 (IMO: ${p.imo_no})\n\n${lines.join("\n")}`) }] };
    } catch (error) {
      return errorResponse("입출항보고 조회", error);
    }
  };
}

function handleUnloadingDeclarations(apiKeys: Record<string, string>) {
  return async (p: ShippingParams): Promise<SkillResult> => {
    const err = requireParam(p as Record<string, unknown>, "entry_date", "unloading_declarations")
      ?? requireParam(p as Record<string, unknown>, "customs_code", "unloading_declarations");
    if (err) return err;
    try {
      const items = await getUnloadingDeclarations(apiKeys, p.entry_date!, p.customs_code!);
      if (items.length === 0) {
        return { content: [{ type: "text", text: "하선신고 결과가 없습니다." }] };
      }
      const lines = items.map(
        (i) => `- ${i.mrn}: ${i.shipNm} | ${i.ulvsUnairPrcsNm}`,
      );
      return { content: [{ type: "text", text: truncate(`## 하선신고 (${p.entry_date})\n\n${lines.join("\n")}`) }] };
    } catch (error) {
      return errorResponse("하선신고 조회", error);
    }
  };
}

function handleSeaDeparture(apiKeys: Record<string, string>) {
  return async (p: ShippingParams): Promise<SkillResult> => {
    try {
      const item = await getSeaDeparturePermit(apiKeys, { ioprSbmtNo: p.submit_no, tkofPermNo: p.permit_no });
      if (!item) {
        return { content: [{ type: "text", text: "해상 출항허가 결과가 없습니다." }] };
      }
      const text = [
        "## 해상 출항허가",
        "",
        `- 선명: ${item.shipFlgtNm}`,
        `- 출항일시: ${item.tkofDttm}`,
        `- 도착항: ${item.arvlCntyPortAirptCd}`,
        `- 적재중량: ${item.loadWght}`,
      ].join("\n");
      return { content: [{ type: "text", text }] };
    } catch (error) {
      return errorResponse("해상 출항허가 조회", error);
    }
  };
}

function handleAirDeparture(apiKeys: Record<string, string>) {
  return async (p: ShippingParams): Promise<SkillResult> => {
    try {
      const item = await getAirDeparturePermit(apiKeys, { ioprSbmtNo: p.submit_no, shipFlgtNm: p.flight });
      if (!item) {
        return { content: [{ type: "text", text: "항공 출항허가 결과가 없습니다." }] };
      }
      const text = [
        "## 항공 출항허가",
        "",
        `- 편명: ${item.shipFlgtNm}`,
        `- 등록번호: ${item.airRgsrNo}`,
        `- 출항일시: ${item.tkofDttm}`,
      ].join("\n");
      return { content: [{ type: "text", text }] };
    } catch (error) {
      return errorResponse("항공 출항허가 조회", error);
    }
  };
}

function handleAirArrivalReport(apiKeys: Record<string, string>) {
  return async (p: ShippingParams): Promise<SkillResult> => {
    try {
      const items = await getAirArrivalReport(apiKeys, { shipFlgtNm: p.flight_name, ioprSbmtNo: p.submit_no });
      if (items.length === 0) {
        return { content: [{ type: "text", text: "항공 입항보고 결과가 없습니다." }] };
      }
      const lines = items.map(
        (i) => `- ${i.shipFlgtNm} | 세관: ${i.cstmSgn} | 입항: ${i.etprDttm}`,
      );
      return { content: [{ type: "text", text: truncate(`## 항공 입항보고\n\n${lines.join("\n")}`) }] };
    } catch (error) {
      return errorResponse("항공 입항보고 조회", error);
    }
  };
}

function handleBondedTransportInfo(apiKeys: Record<string, string>) {
  return async (p: ShippingParams): Promise<SkillResult> => {
    const err = requireParam(p as Record<string, unknown>, "start_date", "bonded_transport_info")
      ?? requireParam(p as Record<string, unknown>, "end_date", "bonded_transport_info");
    if (err) return err;
    try {
      const items = await getBondedTransportInfo(apiKeys, {
        qryStrtDt: p.start_date!,
        qryEndDt: p.end_date!,
        btcoSgn: p.btco_code,
      });
      if (items.length === 0) {
        return { content: [{ type: "text", text: "보세운송 배차정보 결과가 없습니다." }] };
      }
      const lines = items.map(
        (i) => `- ${i.alocPrngDclrNo}: ${i.cntrNo} | ${i.frarSnarSgnNm} → ${i.arlcSnarSgnNm}`,
      );
      return { content: [{ type: "text", text: truncate(`## 보세운송 배차정보 (${p.start_date}~${p.end_date})\n\n${lines.join("\n")}`) }] };
    } catch (error) {
      return errorResponse("보세운송 배차정보 조회", error);
    }
  };
}

export function createShippingLogisticsHandler(
  apiKeys: Record<string, string>,
) {
  return createDispatcher<ShippingParams>("shipping_logistics", {
    bonded_area: handleBondedArea(apiKeys),
    shed_info: handleShedInfo(apiKeys),
    bonded_vehicle: handleBondedVehicle(apiKeys),
    port_entry_exit: handlePortEntryExit(apiKeys),
    unloading_declarations: handleUnloadingDeclarations(apiKeys),
    sea_departure: handleSeaDeparture(apiKeys),
    air_departure: handleAirDeparture(apiKeys),
    air_arrival_report: handleAirArrivalReport(apiKeys),
    bonded_transport_info: handleBondedTransportInfo(apiKeys),
  });
}

export function registerShippingLogistics(
  server: McpServer,
  apiKeys: Record<string, string>,
): void {
  const handler = createShippingLogisticsHandler(apiKeys);

  registerSkillTool(server, {
    name: "shipping_logistics",
    title: "Shipping & Logistics / 물류·운송",
    description: "Shipping & Logistics — bonded zones, storage yards, bonded transport, port entry/exit reports, discharge declarations, departure permits, air arrival, and vehicle dispatch. / 물류·운송 — 보세구역, 장치장, 보세운송, 입출항보고, 하선신고, 출항허가, 항공입항, 배차정보 등 물류/운송 통합 도구",
    inputSchema: {
      action: z.enum(ACTIONS).describe(
        "bonded_area=보세구역장치기간(cargo_no필수) | shed_info=장치장정보(customs_code필수) | bonded_vehicle=보세운송차량(btco_code필수) | port_entry_exit=입출항보고(imo_no필수) | unloading_declarations=하선신고(cargo_no필수) | sea_departure=해상출항허가(imo_no필수) | air_departure=항공출항허가 | air_arrival_report=항공입항보고 | bonded_transport_info=보세운송배차정보",
      ),
      cargo_no: z.string().optional().describe("화물관리번호 (bonded_area에서 사용)"),
      customs_code: z.string().optional().describe("세관코드 (shed_info, port_entry_exit, unloading_declarations에서 사용)"),
      shed_code: z.string().optional().describe("장치장부호 (shed_info에서 사용)"),
      btco_code: z.string().optional().describe("보세운송업체부호 (bonded_vehicle, bonded_transport_info에서 사용)"),
      vehicle_no: z.string().optional().describe("차량번호 (bonded_vehicle에서 사용)"),
      imo_no: z.string().optional().describe("IMO번호 (port_entry_exit에서 사용)"),
      io_type: z.string().optional().describe("입출항구분 (port_entry_exit에서 사용)"),
      entry_date: z.string().optional().describe("입항일자 YYYYMMDD (unloading_declarations에서 사용)"),
      submit_no: z.string().optional().describe("입출항제출번호 (sea_departure, air_departure, air_arrival_report에서 사용)"),
      permit_no: z.string().optional().describe("출항허가번호 (sea_departure에서 사용)"),
      flight: z.string().optional().describe("항공편명 (air_departure에서 사용)"),
      flight_name: z.string().optional().describe("항공편명 (air_arrival_report에서 사용)"),
      start_date: z.string().optional().describe("조회시작일 YYYYMMDD (bonded_transport_info에서 사용)"),
      end_date: z.string().optional().describe("조회종료일 YYYYMMDD (bonded_transport_info에서 사용)"),
    },
    callback: async (params) => handler(params as ShippingParams),
  });
}
