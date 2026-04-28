/**
 * 스킬 도구 오케스트레이터 — 15개 스킬 도구 + MCP Prompts 등록
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ServerConfig } from "../../config.js";
import { registerLegalResearch } from "./legal-research.js";
import { registerCaseResearch } from "./case-research.js";
import { registerLawAmendment } from "./law-amendment.js";
import { registerImportClearance } from "./import-clearance.js";
import { registerExportClearance } from "./export-clearance.js";
import { registerShippingLogistics } from "./shipping-logistics.js";
import { registerTariffLookup } from "./tariff-lookup.js";
import { registerTradeEntity } from "./trade-entity.js";
import { registerCorporateDisclosure } from "./corporate-disclosure.js";
import { registerPublicData } from "./public-data.js";
import { registerFinancialProduct } from "./financial-product.js";
import { registerInsurance } from "./insurance.js";
import { registerProcurement } from "./procurement.js";
import { registerYoutube } from "./youtube.js";
import { registerForeignCaseResearch } from "./foreign-case-research.js";
import { registerSkillPrompts } from "./prompts.js";

export function registerSkillTools(
  server: McpServer,
  config: ServerConfig,
): void {
  registerLegalResearch(server, config.lawApiOc);
  registerCaseResearch(server, config.lawApiOc);
  registerLawAmendment(server, config.lawApiOc);

  if (config.unipassApiKeys && Object.keys(config.unipassApiKeys).length > 0) {
    registerImportClearance(server, config.unipassApiKeys, config.mafraApiKey);
    registerExportClearance(server, config.unipassApiKeys);
    registerShippingLogistics(server, config.unipassApiKeys);
    registerTariffLookup(server, config.unipassApiKeys, config.eximApiKey);
    registerTradeEntity(server, config.unipassApiKeys);
  }

  registerCorporateDisclosure(server, config.dartApiKey, config.data20ServiceKey);

  if (config.data20ServiceKey) {
    registerPublicData(server, config.data20ServiceKey);
    registerInsurance(server, config.data20ServiceKey);
  }

  if (config.finlifeApiKey) {
    registerFinancialProduct(server, config.finlifeApiKey);
  }

  if (config.data20ServiceKey) {
    registerProcurement(server, config.data20ServiceKey);
  }

  registerYoutube(server, config.youtubeApiKey);

  // 해외 판례: 소스별 환경변수 게이팅
  // - COURTLISTENER_API_TOKEN 설정 → 미국 액션 활성
  // - OPENLEGALDATA_API_TOKEN 설정 또는 FOREIGN_CASE_ENABLED=true → 독일 액션 활성
  // - 어느 한쪽이라도 활성화되면 도구 등록
  const hasCourtListener = !!config.courtlistenerApiToken;
  const hasOpenLegalData = !!config.openLegalDataApiToken || !!config.foreignCaseEnabled;
  if (hasCourtListener || hasOpenLegalData) {
    registerForeignCaseResearch(server, {
      courtlistenerApiToken: config.courtlistenerApiToken,
      openLegalDataApiToken: config.openLegalDataApiToken,
      enableUS: hasCourtListener,
      enableDE: hasOpenLegalData,
    });
  }

  registerSkillPrompts(server);
}
