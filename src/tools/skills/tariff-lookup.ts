/**
 * Skill: tariff_lookup — 관세율·HS코드·환율 통합 조회
 * 기존 도구: unipass_search_hs_code, unipass_get_tariff_rate,
 *   unipass_get_customs_rate, unipass_simple_drawback,
 *   unipass_simple_drawback_company, unipass_export_period_short,
 *   unipass_statistics_code, unipass_hs_navigation, exim_get_exchange_rate
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  searchHsCode,
  getTariffRate,
  getCustomsExchangeRates,
  getSimpleDrawbackRate,
  getSimpleDrawbackCompany,
  getExportPeriodShortTarget,
  getStatisticsCode,
  getHsCodeNavigation,
} from "../../unipass-api.js";
import { getMarketExchangeRates } from "../../exim-api.js";
import { errorResponse, truncate } from "../../shared.js";
import { createDispatcher, requireParam, emptyResultMessage, registerSkillTool, type SkillResult } from "./_shared.js";

const ACTIONS = [
  "search_hs",
  "tariff_rate",
  "customs_rate",
  "simple_drawback",
  "simple_drawback_company",
  "export_period_short",
  "statistics_code",
  "hs_navigation",
  "market_exchange",
] as const;

type TariffParams = {
  action: string;
  hs_code?: string;
  currencies?: string[];
  base_date?: string;
  business_no?: string;
  code_type?: string;
  value_name?: string;
  date?: string;
};

function handleSearchHs(apiKeys: Record<string, string>) {
  return async (p: TariffParams): Promise<SkillResult> => {
    const err = requireParam(p as Record<string, unknown>, "hs_code", "search_hs");
    if (err) return err;
    try {
      const items = await searchHsCode(apiKeys, p.hs_code!);
      if (items.length === 0) {
        return emptyResultMessage("HS코드 검색", { hs_code: p.hs_code }, "HS 부호 자릿수(4~10자리)를 확인하거나, 품목명 키워드로 검색해 보세요.");
      }
      const lines = items.map(
        (i) => `- ${i.hsSgn}: ${i.korePrnm || i.englPrnm} (세율: ${i.txrt}%, 세율유형: ${i.txtpSgn})`,
      );
      return { content: [{ type: "text", text: truncate(`## HS코드 검색 (${p.hs_code})\n\n${lines.join("\n")}`) }] };
    } catch (error) {
      return errorResponse("HS코드 검색", error);
    }
  };
}

function handleTariffRate(apiKeys: Record<string, string>) {
  return async (p: TariffParams): Promise<SkillResult> => {
    const err = requireParam(p as Record<string, unknown>, "hs_code", "tariff_rate");
    if (err) return err;
    try {
      const items = await getTariffRate(apiKeys, p.hs_code!);
      if (items.length === 0) {
        return emptyResultMessage("관세율 조회", { hs_code: p.hs_code }, "10자리 HS 부호를 사용하면 더 정확한 결과를 얻을 수 있습니다.");
      }
      const lines = items.map(
        (i) => `- ${i.trrtTpNm} (${i.trrtTpcd}): ${i.trrt}% (적용: ${i.aplyStrtDt}~${i.aplyEndDt})`,
      );
      return {
        content: [{
          type: "text",
          text: truncate(`## 관세율 조회 (${p.hs_code})\n\n- HS부호: ${items[0].hsSgn}\n\n${lines.join("\n")}`),
        }],
      };
    } catch (error) {
      return errorResponse("관세율 조회", error);
    }
  };
}

function handleCustomsRate(apiKeys: Record<string, string>) {
  return async (p: TariffParams): Promise<SkillResult> => {
    try {
      const result = await getCustomsExchangeRates(apiKeys, p.currencies);
      if (result.rates.length === 0) {
        return {
          content: [{
            type: "text",
            text: "최근 2주 이내 관세 환율 정보를 찾을 수 없습니다. API 키 또는 서비스 상태를 확인해 주세요.",
          }],
        };
      }
      const lines = result.rates.map(
        (i) => `- ${i.currSgn} (${i.mtryUtNm}): ${i.fxrt}원 (적용시작: ${i.aplyBgnDt})`,
      );
      const dateLabel = `${result.queriedDate.slice(0, 4)}-${result.queriedDate.slice(4, 6)}-${result.queriedDate.slice(6, 8)}`;
      const fallbackNote = result.isFallback ? ` (요청일 데이터 없음 → ${dateLabel} 기준 자동 조회)` : "";
      return { content: [{ type: "text", text: `## 관세 환율 (${dateLabel})${fallbackNote}\n\n${lines.join("\n")}` }] };
    } catch (error) {
      return errorResponse("관세환율 조회", error);
    }
  };
}

function handleSimpleDrawback(apiKeys: Record<string, string>) {
  return async (p: TariffParams): Promise<SkillResult> => {
    const err = requireParam(p as Record<string, unknown>, "base_date", "simple_drawback");
    if (err) return err;
    try {
      const items = await getSimpleDrawbackRate(apiKeys, { baseDt: p.base_date!, hsSgn: p.hs_code });
      if (items.length === 0) {
        return { content: [{ type: "text", text: "결과가 없습니다." }] };
      }
      const lines = items.map((i) => `- ${i.hs10}: ${i.prutDrwbWncrAmt}원`);
      return { content: [{ type: "text", text: truncate(`## 간이정액 환급율 (${p.base_date})\n\n${lines.join("\n")}`) }] };
    } catch (error) {
      return errorResponse("간이환급율 조회", error);
    }
  };
}

function handleSimpleDrawbackCompany(apiKeys: Record<string, string>) {
  return async (p: TariffParams): Promise<SkillResult> => {
    const err = requireParam(p as Record<string, unknown>, "business_no", "simple_drawback_company");
    if (err) return err;
    try {
      const item = await getSimpleDrawbackCompany(apiKeys, p.business_no!);
      if (!item) {
        return { content: [{ type: "text", text: "결과를 찾을 수 없습니다." }] };
      }
      const text = [
        `## 간이정액 적용업체 (${p.business_no})`,
        "",
        `- 업체명: ${item.conm}`,
        `- 등록세관: ${item.rgsrCstmNm}`,
        `- 적용승인일: ${item.simlFxamtAplyApreDt}`,
      ].join("\n");
      return { content: [{ type: "text", text }] };
    } catch (error) {
      return errorResponse("간이정액 업체 조회", error);
    }
  };
}

function handleExportPeriodShort(apiKeys: Record<string, string>) {
  return async (p: TariffParams): Promise<SkillResult> => {
    const err = requireParam(p as Record<string, unknown>, "hs_code", "export_period_short");
    if (err) return err;
    try {
      const items = await getExportPeriodShortTarget(apiKeys, p.hs_code!);
      if (items.length === 0) {
        return { content: [{ type: "text", text: "결과가 없습니다." }] };
      }
      const lines = items.map((i) => `- ${i.hsSgn}: ${i.prnm} | 기한: ${i.ffmnTmlmDt}`);
      return { content: [{ type: "text", text: truncate(`## 수출이행기간 단축대상 (${p.hs_code})\n\n${lines.join("\n")}`) }] };
    } catch (error) {
      return errorResponse("수출이행기간 단축 조회", error);
    }
  };
}

function handleStatisticsCode(apiKeys: Record<string, string>) {
  return async (p: TariffParams): Promise<SkillResult> => {
    const err = requireParam(p as Record<string, unknown>, "code_type", "statistics_code");
    if (err) return err;
    try {
      const items = await getStatisticsCode(apiKeys, { statsSgnTp: p.code_type!, cdValtValNm: p.value_name });
      if (items.length === 0) {
        return { content: [{ type: "text", text: "결과가 없습니다." }] };
      }
      const lines = items.map((i) => `- ${i.statsSgn}: ${i.koreAbrt} (${i.englAbrt})`);
      return { content: [{ type: "text", text: truncate(`## 통계부호 (${p.code_type})\n\n${lines.join("\n")}`) }] };
    } catch (error) {
      return errorResponse("통계부호 조회", error);
    }
  };
}

function handleHsNavigation(apiKeys: Record<string, string>) {
  return async (p: TariffParams): Promise<SkillResult> => {
    const err = requireParam(p as Record<string, unknown>, "hs_code", "hs_navigation");
    if (err) return err;
    try {
      const items = await getHsCodeNavigation(apiKeys, p.hs_code!);
      if (items.length === 0) {
        return { content: [{ type: "text", text: "결과가 없습니다." }] };
      }
      const lines = items.map((i) => `- ${i.hs10Sgn}: ${i.prlstNm} (조회순위: ${i.acrsTcntRnk})`);
      return { content: [{ type: "text", text: truncate(`## HS코드 내비게이션 (${p.hs_code})\n\n${lines.join("\n")}`) }] };
    } catch (error) {
      return errorResponse("HS코드 내비게이션 조회", error);
    }
  };
}

function handleMarketExchange(eximApiKey?: string) {
  return async (p: TariffParams): Promise<SkillResult> => {
    if (!eximApiKey) {
      return {
        content: [{ type: "text", text: "EXCHANGE_RATE_API_KEY가 설정되지 않아 시장 환율을 조회할 수 없습니다." }],
        isError: true,
      };
    }
    try {
      const result = await getMarketExchangeRates(eximApiKey, p.date);
      if (result.rates.length === 0) {
        return {
          content: [{
            type: "text",
            text: "최근 7영업일 이내 환율 정보를 찾을 수 없습니다. API 키 또는 서비스 상태를 확인해 주세요.",
          }],
        };
      }
      const lines = result.rates.map(
        (i) =>
          `- **${i.currency}** (${i.currencyName}): 매매기준율 ${i.dealBaseRate.toLocaleString()}원` +
          (i.ttBuy ? ` | 매입 ${i.ttBuy}` : "") +
          (i.ttSell ? ` | 매도 ${i.ttSell}` : ""),
      );
      const dateLabel = `${result.queriedDate.slice(0, 4)}-${result.queriedDate.slice(4, 6)}-${result.queriedDate.slice(6, 8)}`;
      const fallbackNote = result.isFallback ? ` (요청일 비영업일 → ${dateLabel} 기준 자동 조회)` : "";
      const header = `## 시장 환율 (${dateLabel})${fallbackNote}`;
      return { content: [{ type: "text", text: `${header}\n\n${lines.join("\n")}` }] };
    } catch (error) {
      return errorResponse("시장 환율 조회", error);
    }
  };
}

export function createTariffLookupHandler(
  apiKeys: Record<string, string>,
  eximApiKey?: string,
) {
  return createDispatcher<TariffParams>("tariff_lookup", {
    search_hs: handleSearchHs(apiKeys),
    tariff_rate: handleTariffRate(apiKeys),
    customs_rate: handleCustomsRate(apiKeys),
    simple_drawback: handleSimpleDrawback(apiKeys),
    simple_drawback_company: handleSimpleDrawbackCompany(apiKeys),
    export_period_short: handleExportPeriodShort(apiKeys),
    statistics_code: handleStatisticsCode(apiKeys),
    hs_navigation: handleHsNavigation(apiKeys),
    market_exchange: handleMarketExchange(eximApiKey),
  });
}

export function registerTariffLookup(
  server: McpServer,
  apiKeys: Record<string, string>,
  eximApiKey?: string,
): void {
  const handler = createTariffLookupHandler(apiKeys, eximApiKey);

  registerSkillTool(server, {
    name: "tariff_lookup",
    title: "관세율·HS코드·환율 조회",
    description: "관세율·HS코드·환율 통합 조회 — HS코드 검색, 관세율 조회, 관세환율, 시장환율, 간이환급율, 통계부호, HS 내비게이션 등을 하나의 도구로 제공합니다.",
    inputSchema: {
      action: z.enum(ACTIONS).describe(
        "search_hs=HS부호검색(hs_code필수) | tariff_rate=관세율조회(hs_code필수) | customs_rate=관세환율(currencies선택) | simple_drawback=간이환급률(base_date필수) | simple_drawback_company=간이정액적용업체(business_no필수) | export_period_short=수출기간단축(hs_code필수) | statistics_code=통계부호(code_type필수) | hs_navigation=HS부호체계탐색(hs_code필수) | market_exchange=수출입은행시장환율(date선택)",
      ),
      hs_code: z.string().optional().describe("HS 부호 (search_hs, tariff_rate, simple_drawback, export_period_short, hs_navigation에서 사용)"),
      currencies: z.array(z.string()).optional().describe("통화 코드 배열 (customs_rate에서 사용, 예: [\"USD\", \"EUR\"])"),
      base_date: z.string().optional().describe("기준일자 YYYYMMDD (simple_drawback에서 사용)"),
      business_no: z.string().optional().describe("사업자등록번호 (simple_drawback_company에서 사용)"),
      code_type: z.string().optional().describe("통계부호유형 (statistics_code에서 사용)"),
      value_name: z.string().optional().describe("코드값명칭 (statistics_code에서 사용)"),
      date: z.string().optional().describe("환율 조회 날짜 YYYYMMDD (market_exchange에서 사용)"),
    },
    callback: async (params) => handler(params as TariffParams),
  });
}
