/**
 * CourtListener OpenAPI 경로 정의 (미국 판례)
 */

import { apiPath, jsonResponse, param } from "./shared.js";
import type { OpenApiPaths } from "./shared.js";

export function getCourtlistenerPaths(): OpenApiPaths {
  return {
    ...apiPath({
      path: "/api/courtlistener/search",
      operationId: "courtlistenerSearch",
      summary: "미국 판례 검색 (CourtListener)",
      description:
        "CourtListener REST API v4를 통해 미국 판례를 검색합니다. 본문/메타데이터는 영어 원문으로 제공됩니다.",
      parameters: [
        param("q", "검색어", { required: true, schema: { type: "string" } }),
        param("court", "법원 슬러그 (예: scotus, ca1, ca9, dcd)", {
          schema: { type: "string" },
        }),
        param("filed_after", "판결일 시작 (YYYY-MM-DD)", {
          schema: { type: "string", format: "date" },
        }),
        param("filed_before", "판결일 종료 (YYYY-MM-DD)", {
          schema: { type: "string", format: "date" },
        }),
        param("page", "페이지 번호", {
          schema: { type: "integer", default: 1 },
        }),
        param("page_size", "페이지당 결과 수", {
          schema: { type: "integer", default: 20 },
        }),
      ],
      responses: jsonResponse("미국 판례 검색 결과"),
    }),
    ...apiPath({
      path: "/api/courtlistener/opinions/{opinionId}",
      operationId: "courtlistenerOpinionDetail",
      summary: "미국 판례 상세 (CourtListener)",
      description: "Opinion ID로 판례 본문 및 메타데이터를 조회합니다.",
      parameters: [
        param("opinionId", "CourtListener opinion ID", {
          in: "path",
          required: true,
          schema: { type: "string" },
        }),
      ],
      responses: jsonResponse("미국 판례 상세"),
    }),
  };
}
