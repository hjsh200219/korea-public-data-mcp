/**
 * REST API 라우터 오케스트레이터 - 도메인별 라우트를 조합
 */

import { Router } from "express";
import type { ServerConfig } from "./config.js";
import { registerLawRoutes } from "./routes/law-routes.js";
import { registerDartRoutes } from "./routes/dart-routes.js";
import { registerData20Routes } from "./routes/data20-routes.js";
import { registerUnipassRoutes } from "./routes/unipass-routes.js";
import { registerEximRoutes } from "./routes/exim-routes.js";
import { registerMafraRoutes } from "./routes/mafra-routes.js";
import { registerFinlifeRoutes } from "./routes/finlife-routes.js";
import { registerInsuranceRoutes } from "./routes/insurance-routes.js";
import { registerCourtlistenerRoutes } from "./routes/courtlistener-routes.js";
import { registerOpenlegalDataRoutes } from "./routes/openlegaldata-routes.js";

export function createApiRouter(config: ServerConfig): Router {
  const router = Router();

  registerLawRoutes(router, config.lawApiOc);

  if (config.dartApiKey) {
    registerDartRoutes(router, config.dartApiKey);
  }

  if (config.data20ServiceKey) {
    registerData20Routes(router, config.data20ServiceKey);
    registerInsuranceRoutes(router, config.data20ServiceKey);
  }

  if (config.unipassApiKeys && Object.keys(config.unipassApiKeys).length > 0) {
    registerUnipassRoutes(router, config.unipassApiKeys);
  }

  if (config.eximApiKey) {
    registerEximRoutes(router, config.eximApiKey);
  }

  if (config.mafraApiKey) {
    registerMafraRoutes(router, config.mafraApiKey);
  }

  if (config.finlifeApiKey) {
    registerFinlifeRoutes(router, config.finlifeApiKey);
  }

  if (config.courtlistenerApiToken) {
    registerCourtlistenerRoutes(router, config.courtlistenerApiToken);
  }

  if (config.openLegalDataApiToken || config.foreignCaseEnabled) {
    registerOpenlegalDataRoutes(router, config.openLegalDataApiToken);
  }

  return router;
}
