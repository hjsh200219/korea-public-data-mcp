/**
 * 수출입은행 OpenAPI 경로 정의
 */

import { apiPath, jsonResponse, param } from "./shared.js";
import type { OpenApiPaths } from "./shared.js";

export function getEximPaths(): OpenApiPaths {
  return {
    ...apiPath({
      path: "/api/exim/exchange-rate",
      operationId: "eximGetExchangeRate",
      summary: "수출입은행 시장 환율 조회",
      description: "한국수출입은행 매매기준율, 전신환 매입/매도율을 조회합니다.",
      parameters: [
        param("date", "조회일 (YYYYMMDD, 미지정 시 당일)", {
          schema: { type: "string", pattern: "^\\d{8}$" },
        }),
      ],
      responses: jsonResponse("시장 환율 정보"),
    }),
  };
}
