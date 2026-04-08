/**
 * OpenAPI 경로 정의용 공통 헬퍼 (파라미터·응답·경로 조각)
 * 프로퍼티 삽입 순서는 JSON 직렬화 시 기존 스펙과 동일하게 유지한다.
 */

export type OpenApiParam = Record<string, unknown>;
export type OpenApiResponse = Record<string, unknown>;
export type OpenApiPaths = Record<string, Record<string, unknown>>;

export type ParamOptions = {
  in?: "query" | "path";
  required?: boolean;
  schema?: Record<string, unknown>;
};

/**
 * Query/Path 파라미터 객체 생성. path이면 required: true를 자동 부여한다.
 */
export function param(name: string, description: string, options?: ParamOptions): OpenApiParam {
  const location = options?.in ?? "query";
  const schema = options?.schema ?? { type: "string" };
  const required = location === "path" || options?.required === true;
  if (required) {
    return { name, in: location, required: true, schema, description };
  }
  return { name, in: location, schema, description };
}

const DEFAULT_ERROR_SCHEMA = {
  type: "object",
  properties: { error: { type: "string" } },
} as const;

/**
 * 200 JSON + 500 오류 응답. schemaProps는 200 응답 schema에 병합된다.
 */
export function jsonResponse(description: string, schemaProps?: Record<string, unknown>): OpenApiResponse {
  const schema =
    schemaProps === undefined
      ? { type: "object" }
      : { type: "object", ...schemaProps };
  return {
    "200": {
      description,
      content: { "application/json": { schema } },
    },
    "500": {
      description: "서버 오류",
      content: { "application/json": { schema: DEFAULT_ERROR_SCHEMA } },
    },
  };
}

export type HttpMethod = "get" | "post";

export type ApiPathSpec = {
  path: string;
  method?: HttpMethod;
  operationId: string;
  summary: string;
  description?: string;
  parameters?: OpenApiParam[];
  responses: OpenApiResponse;
  requestBody?: Record<string, unknown>;
};

/**
 * 단일 path 항목을 OpenApiPaths 조각으로 반환 (스프레드로 합성)
 */
export function apiPath(spec: ApiPathSpec): OpenApiPaths {
  const method = spec.method ?? "get";
  const operation: Record<string, unknown> = {
    operationId: spec.operationId,
    summary: spec.summary,
  };
  if (spec.description !== undefined) {
    operation.description = spec.description;
  }
  if (spec.parameters !== undefined) {
    operation.parameters = spec.parameters;
  }
  if (spec.requestBody !== undefined) {
    operation.requestBody = spec.requestBody;
  }
  operation.responses = spec.responses;
  return { [spec.path]: { [method]: operation } };
}
