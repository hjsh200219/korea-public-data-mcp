/**
 * OpenAPI 스펙 공유 헬퍼 - 파라미터/응답 빌더
 */

export { param, jsonResponse, apiPath } from "./_helpers.js";
export type { OpenApiParam, OpenApiResponse, OpenApiPaths, ParamOptions, ApiPathSpec, HttpMethod } from "./_helpers.js";

import { param } from "./_helpers.js";
import type { OpenApiParam } from "./_helpers.js";

export const searchParams = {
  query: param("query", "검색어", { required: true, schema: { type: "string" } }),
  page: param("page", "페이지 번호", { schema: { type: "integer", default: 1 } }),
  display: param("display", "페이지당 결과 수 (최대 100)", { schema: { type: "integer", default: 20 } }),
};

export const paginationParams: OpenApiParam[] = [
  param("pageNo", "페이지 번호", { schema: { type: "integer", default: 1 } }),
  param("numOfRows", "페이지당 건수", { schema: { type: "integer", default: 10 } }),
];

export function searchTypeParam(desc: string): OpenApiParam {
  return param("search_type", desc, {
    schema: { type: "string", enum: ["law_name", "full_text"], default: "law_name" },
  });
}

export function idParam(desc: string): OpenApiParam {
  return param("id", desc, { in: "path", schema: { type: "integer" } });
}
