/**
 * 스킬 도구 오케스트레이터 — 12개 스킬 도구 + MCP Prompts 등록
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

  registerSkillPrompts(server);
}
