/**
 * OpenLegalData OpenAPI 경로 정의 (독일 판례)
 */

import { apiPath, jsonResponse, param } from "./shared.js";
import type { OpenApiPaths } from "./shared.js";

export function getOpenlegalDataPaths(): OpenApiPaths {
  return {
    ...apiPath({
      path: "/api/openlegaldata/search",
      operationId: "openLegalDataSearch",
      summary: "독일 판례 검색 (OpenLegalData)",
      description:
        "OpenLegalData API를 통해 독일 판례를 검색합니다. 본문/메타데이터는 독일어 원문으로 제공됩니다 (번역 미제공).",
      parameters: [
        param("q", "검색어", { required: true, schema: { type: "string" } }),
        param("court", "법원 슬러그 (예: bgh, bverfg)", {
          schema: { type: "string" },
        }),
        param("date_after", "판결일 시작 (YYYY-MM-DD)", {
          schema: { type: "string", format: "date" },
        }),
        param("date_before", "판결일 종료 (YYYY-MM-DD)", {
          schema: { type: "string", format: "date" },
        }),
        param("page", "페이지 번호", {
          schema: { type: "integer", default: 1 },
        }),
        param("page_size", "페이지당 결과 수", {
          schema: { type: "integer", default: 20 },
        }),
      ],
      responses: jsonResponse("독일 판례 검색 결과"),
    }),
    ...apiPath({
      path: "/api/openlegaldata/cases/{caseId}",
      operationId: "openLegalDataCaseDetail",
      summary: "독일 판례 상세 (OpenLegalData)",
      description: "Case ID로 독일 판례 본문 및 메타데이터를 조회합니다.",
      parameters: [
        param("caseId", "OpenLegalData case ID", {
          in: "path",
          required: true,
          schema: { type: "string" },
        }),
      ],
      responses: jsonResponse("독일 판례 상세"),
    }),
  };
}
