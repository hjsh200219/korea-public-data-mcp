/**
 * Skill: trade_entity — 무역 업체 통합 검색/조회
 * 기존 도구: unipass_search_company, unipass_search_broker,
 *   unipass_search_animal_plant_company, unipass_forwarder_list,
 *   unipass_forwarder_detail, unipass_airline_list, unipass_airline_detail,
 *   unipass_overseas_supplier, unipass_broker_detail,
 *   unipass_ship_company_list, unipass_ship_company_detail
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
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
import { errorResponse, truncate } from "../../shared.js";
import { createDispatcher, requireParam, registerSkillTool, type SkillResult } from "./_shared.js";

const ACTIONS = [
  "search_company",
  "search_broker",
  "search_animal_plant_company",
  "forwarder_list",
  "forwarder_detail",
  "airline_list",
  "airline_detail",
  "overseas_supplier",
  "broker_detail",
  "ship_company_list",
  "ship_company_detail",
] as const;

type TradeEntityParams = {
  action: string;
  query?: string;
  company_name?: string;
  name?: string;
  forwarder_code?: string;
  airline_code?: string;
  lca_code?: string;
  country_code?: string;
  ship_company_code?: string;
};

function handleSearchCompany(apiKeys: Record<string, string>) {
  return async (p: TradeEntityParams): Promise<SkillResult> => {
    const err = requireParam(p as Record<string, unknown>, "query", "search_company");
    if (err) return err;
    try {
      const items = await searchCompany(apiKeys, p.query!);
      if (items.length === 0) {
        return { content: [{ type: "text", text: "해당 업체명의 검색 결과가 없습니다." }] };
      }
      const lines = items.map(
        (i) => `- ${i.conmNm} (${i.ecm}) | 사업자번호: ${i.bsnsNo} | ${i.bslcBscsAddr} | 사용여부: ${i.useYn}`,
      );
      return { content: [{ type: "text", text: truncate(`## 통관업체 검색 (${p.query})\n\n${lines.join("\n")}`) }] };
    } catch (error) {
      return errorResponse("통관업체 조회", error);
    }
  };
}

function handleSearchBroker(apiKeys: Record<string, string>) {
  return async (p: TradeEntityParams): Promise<SkillResult> => {
    const err = requireParam(p as Record<string, unknown>, "query", "search_broker");
    if (err) return err;
    try {
      const items = await searchBroker(apiKeys, p.query!);
      if (items.length === 0) {
        return { content: [{ type: "text", text: "해당 관세사의 검색 결과가 없습니다." }] };
      }
      const lines = items.map(
        (i) => `- ${i.lcaNm} (${i.lcaSgn}) | 세관: ${i.cstmNm} (${i.cstmSgn})`,
      );
      return { content: [{ type: "text", text: truncate(`## 관세사 검색 (${p.query})\n\n${lines.join("\n")}`) }] };
    } catch (error) {
      return errorResponse("관세사 조회", error);
    }
  };
}

function handleSearchAnimalPlantCompany(apiKeys: Record<string, string>) {
  return async (p: TradeEntityParams): Promise<SkillResult> => {
    const err = requireParam(p as Record<string, unknown>, "company_name", "search_animal_plant_company");
    if (err) return err;
    try {
      const items = await searchAnimalPlantCompany(apiKeys, p.company_name!);
      if (items.length === 0) {
        return { content: [{ type: "text", text: "해당 업체명의 검색 결과가 없습니다." }] };
      }
      const lines = items.map(
        (i) => `- ${i.bsntNm} (${i.bsntCd}) | ${i.bsntAddr}`,
      );
      return { content: [{ type: "text", text: truncate(`## 농림축산검역 업체 (${p.company_name})\n\n${lines.join("\n")}`) }] };
    } catch (error) {
      return errorResponse("농림축산업체 조회", error);
    }
  };
}

function handleForwarderList(apiKeys: Record<string, string>) {
  return async (p: TradeEntityParams): Promise<SkillResult> => {
    const err = requireParam(p as Record<string, unknown>, "name", "forwarder_list");
    if (err) return err;
    try {
      const items = await getForwarderList(apiKeys, p.name!);
      if (items.length === 0) {
        return { content: [{ type: "text", text: "결과가 없습니다." }] };
      }
      const lines = items.map((i) => `- ${i.frwrSgn}: ${i.frwrKoreNm} (${i.frwrEnglNm})`);
      return { content: [{ type: "text", text: truncate(`## 포워더 목록 (${p.name})\n\n${lines.join("\n")}`) }] };
    } catch (error) {
      return errorResponse("포워더 목록 조회", error);
    }
  };
}

function handleForwarderDetail(apiKeys: Record<string, string>) {
  return async (p: TradeEntityParams): Promise<SkillResult> => {
    const err = requireParam(p as Record<string, unknown>, "forwarder_code", "forwarder_detail");
    if (err) return err;
    try {
      const item = await getForwarderDetail(apiKeys, p.forwarder_code!);
      if (!item) {
        return { content: [{ type: "text", text: "결과를 찾을 수 없습니다." }] };
      }
      const text = [
        `## 포워더 내역 (${p.forwarder_code})`,
        "",
        `- 부호: ${item.frwrSgn}`,
        `- 한글상호: ${item.koreConmNm}`,
        `- 영문상호: ${item.englConmNm}`,
        `- 본점주소: ${item.hdofAddr}`,
        `- 전화번호: ${item.telNo}`,
      ].join("\n");
      return { content: [{ type: "text", text }] };
    } catch (error) {
      return errorResponse("포워더 내역 조회", error);
    }
  };
}

function handleAirlineList(apiKeys: Record<string, string>) {
  return async (p: TradeEntityParams): Promise<SkillResult> => {
    const err = requireParam(p as Record<string, unknown>, "name", "airline_list");
    if (err) return err;
    try {
      const items = await getAirlineList(apiKeys, p.name!);
      if (items.length === 0) {
        return { content: [{ type: "text", text: "결과가 없습니다." }] };
      }
      const lines = items.map((i) => `- ${i.flcoSgn}: ${i.flcoKoreNm} (${i.flcoEnglNm})`);
      return { content: [{ type: "text", text: truncate(`## 항공사 목록 (${p.name})\n\n${lines.join("\n")}`) }] };
    } catch (error) {
      return errorResponse("항공사 목록 조회", error);
    }
  };
}

function handleAirlineDetail(apiKeys: Record<string, string>) {
  return async (p: TradeEntityParams): Promise<SkillResult> => {
    const err = requireParam(p as Record<string, unknown>, "airline_code", "airline_detail");
    if (err) return err;
    try {
      const item = await getAirlineDetail(apiKeys, p.airline_code!);
      if (!item) {
        return { content: [{ type: "text", text: "결과를 찾을 수 없습니다." }] };
      }
      const text = [
        `## 항공사 내역 (${p.airline_code})`,
        "",
        `- 영문부호: ${item.flcoEnglSgn}`,
        `- 한글상호: ${item.flcoKoreConm}`,
        `- 영문상호: ${item.flcoEnglConm}`,
        `- 국가명: ${item.cntyNm}`,
        `- 전화번호: ${item.telno}`,
      ].join("\n");
      return { content: [{ type: "text", text }] };
    } catch (error) {
      return errorResponse("항공사 내역 조회", error);
    }
  };
}

function handleOverseasSupplier(apiKeys: Record<string, string>) {
  return async (p: TradeEntityParams): Promise<SkillResult> => {
    const err1 = requireParam(p as Record<string, unknown>, "country_code", "overseas_supplier");
    if (err1) return err1;
    const err2 = requireParam(p as Record<string, unknown>, "company_name", "overseas_supplier");
    if (err2) return err2;
    try {
      const items = await getOverseasSupplier(apiKeys, p.country_code!, p.company_name!);
      if (items.length === 0) {
        return { content: [{ type: "text", text: "결과가 없습니다." }] };
      }
      const lines = items.map((i) => `- ${i.ovrsSplrSgn}: ${i.splrConm} (${i.englCntyNm})`);
      return { content: [{ type: "text", text: truncate(`## 해외공급자 (${p.country_code}, ${p.company_name})\n\n${lines.join("\n")}`) }] };
    } catch (error) {
      return errorResponse("해외공급자 조회", error);
    }
  };
}

function handleBrokerDetail(apiKeys: Record<string, string>) {
  return async (p: TradeEntityParams): Promise<SkillResult> => {
    const err = requireParam(p as Record<string, unknown>, "lca_code", "broker_detail");
    if (err) return err;
    try {
      const item = await getBrokerDetail(apiKeys, p.lca_code!);
      if (!item) {
        return { content: [{ type: "text", text: "결과를 찾을 수 없습니다." }] };
      }
      const text = [
        `## 관세사 내역 (${p.lca_code})`,
        "",
        `- 관세사부호: ${item.lcaSgn}`,
        `- 상호: ${item.lcaConm}`,
        `- 관할세관: ${item.jrsdCstmNm}`,
        `- 주소: ${item.addr}`,
        `- 전화번호: ${item.telNo}`,
        `- 대표자: ${item.rppnNm}`,
      ].join("\n");
      return { content: [{ type: "text", text }] };
    } catch (error) {
      return errorResponse("관세사 내역 조회", error);
    }
  };
}

function handleShipCompanyList(apiKeys: Record<string, string>) {
  return async (p: TradeEntityParams): Promise<SkillResult> => {
    const err = requireParam(p as Record<string, unknown>, "name", "ship_company_list");
    if (err) return err;
    try {
      const items = await getShipCompanyList(apiKeys, p.name!);
      if (items.length === 0) {
        return { content: [{ type: "text", text: "결과가 없습니다." }] };
      }
      const lines = items.map((i) => `- ${i.shipCoSgn}: ${i.shipCoKoreNm} (${i.shipCoEnglNm})`);
      return { content: [{ type: "text", text: truncate(`## 선박회사 목록 (${p.name})\n\n${lines.join("\n")}`) }] };
    } catch (error) {
      return errorResponse("선박회사 목록 조회", error);
    }
  };
}

function handleShipCompanyDetail(apiKeys: Record<string, string>) {
  return async (p: TradeEntityParams): Promise<SkillResult> => {
    const err = requireParam(p as Record<string, unknown>, "ship_company_code", "ship_company_detail");
    if (err) return err;
    try {
      const item = await getShipCompanyDetail(apiKeys, p.ship_company_code!);
      if (!item) {
        return { content: [{ type: "text", text: "결과를 찾을 수 없습니다." }] };
      }
      const text = [
        `## 선박회사 내역 (${p.ship_company_code})`,
        "",
        `- 대리점명: ${item.shipAgncNm}`,
        `- 국가명: ${item.cntyNm}`,
        `- 사업자번호: ${item.brno}`,
        `- 본점주소: ${item.hdofAddr}`,
        `- 전화번호: ${item.telno}`,
      ].join("\n");
      return { content: [{ type: "text", text }] };
    } catch (error) {
      return errorResponse("선박회사 내역 조회", error);
    }
  };
}

export function createTradeEntityHandler(
  apiKeys: Record<string, string>,
) {
  return createDispatcher<TradeEntityParams>("trade_entity", {
    search_company: handleSearchCompany(apiKeys),
    search_broker: handleSearchBroker(apiKeys),
    search_animal_plant_company: handleSearchAnimalPlantCompany(apiKeys),
    forwarder_list: handleForwarderList(apiKeys),
    forwarder_detail: handleForwarderDetail(apiKeys),
    airline_list: handleAirlineList(apiKeys),
    airline_detail: handleAirlineDetail(apiKeys),
    overseas_supplier: handleOverseasSupplier(apiKeys),
    broker_detail: handleBrokerDetail(apiKeys),
    ship_company_list: handleShipCompanyList(apiKeys),
    ship_company_detail: handleShipCompanyDetail(apiKeys),
  });
}

export function registerTradeEntity(
  server: McpServer,
  apiKeys: Record<string, string>,
): void {
  const handler = createTradeEntityHandler(apiKeys);

  registerSkillTool(server, {
    name: "trade_entity",
    title: "무역 업체 조회",
    description: "무역 업체 — 통관업체, 관세사, 포워더, 항공사, 선박회사, 해외공급자, 농림축산검역 업체 등 무역 관련 업체 검색/조회 통합 도구",
    inputSchema: {
      action: z.enum(ACTIONS).describe(
        "search_company=통관업체검색(query필수) | search_broker=관세사검색(query필수) | search_animal_plant_company=농림축산업체검색(company_name필수) | forwarder_list=포워더목록 | forwarder_detail=포워더내역(forwarder_code필수) | airline_list=항공사목록 | airline_detail=항공사내역(airline_code필수) | overseas_supplier=해외공급자검색(query필수) | broker_detail=관세사내역(lca_code필수) | ship_company_list=선박회사목록 | ship_company_detail=선박회사내역",
      ),
      query: z.string().optional().describe("검색할 업체명/관세사명 (search_company, search_broker)"),
      company_name: z.string().optional().describe("업체명 (search_animal_plant_company, overseas_supplier)"),
      name: z.string().optional().describe("업체명 (forwarder_list, airline_list, ship_company_list)"),
      forwarder_code: z.string().optional().describe("포워더 부호 (forwarder_detail)"),
      airline_code: z.string().optional().describe("항공사 부호 (airline_detail)"),
      lca_code: z.string().optional().describe("관세사 부호 (broker_detail)"),
      country_code: z.string().optional().describe("국가부호 (overseas_supplier)"),
      ship_company_code: z.string().optional().describe("선사 부호 (ship_company_detail)"),
    },
    callback: async (params) => handler(params as TradeEntityParams),
  });
}
