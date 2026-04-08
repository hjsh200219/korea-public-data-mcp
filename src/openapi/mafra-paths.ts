/**
 * 농림축산식품부 OpenAPI 경로 정의
 */

import { apiPath, jsonResponse, param } from "./shared.js";
import type { OpenApiPaths } from "./shared.js";

export function getMafraPaths(): OpenApiPaths {
  return {
    ...apiPath({
      path: "/api/mafra/import-meat",
      operationId: "mafraSearchImportMeat",
      summary: "수입축산물 이력 조회",
      description:
        "수입일자 기준으로 수입축산물(쇠고기/돼지고기)의 유통식별번호, 원산지, 도축장, 가공장, BL번호 등을 조회합니다.",
      parameters: [
        param("import_date", "수입일자 (YYYYMMDD)", {
          required: true,
          schema: { type: "string", pattern: "^\\d{8}$" },
        }),
        param("product_code", "품목코드", { schema: { type: "string" } }),
        param("bl_no", "선하증권번호", { schema: { type: "string" } }),
        param("origin_country", "원산지국가 (예: 호주, 미국)", { schema: { type: "string" } }),
        param("sale_status", "판매여부", { schema: { type: "string", enum: ["Y", "N"] } }),
        param("page", "페이지 번호", { schema: { type: "integer", default: 1 } }),
        param("per_page", "페이지당 건수 (최대 1000)", { schema: { type: "integer", default: 100 } }),
      ],
      responses: jsonResponse("수입축산물 이력 정보"),
    }),
  };
}
