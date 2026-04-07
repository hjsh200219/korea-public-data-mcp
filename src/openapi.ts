/**
 * OpenAPI 3.1 스펙 생성 - GPT Actions용
 * 도메인별 경로 정의를 조합하여 최종 스펙을 생성하는 오케스트레이터
 */

import { getLawPaths } from "./openapi/law-paths.js";
import { getDartPaths } from "./openapi/dart-paths.js";
import { getData20Paths } from "./openapi/data20-paths.js";
import { getUnipassPaths } from "./openapi/unipass-paths.js";
import { getEximPaths } from "./openapi/exim-paths.js";
import { getMafraPaths } from "./openapi/mafra-paths.js";
import { getFinlifePaths } from "./openapi/finlife-paths.js";

export interface OpenApiSpecOptions {
  baseUrl: string;
  hasDart?: boolean;
  hasData20?: boolean;
  hasUnipass?: boolean;
  hasExim?: boolean;
  hasMafra?: boolean;
  hasFinlife?: boolean;
}

export function generateOpenApiSpec(options: OpenApiSpecOptions) {
  const { baseUrl, hasDart, hasData20, hasUnipass, hasExim, hasMafra, hasFinlife } = options;

  return {
    openapi: "3.1.0",
    info: {
      title: "Korean Public Data MCP - 대한민국 공공데이터 API",
      description: "대한민국 공공데이터 MCP 서버 - 법제처·DART·공공데이터포털·관세청 UNI-PASS·수출입은행·금융감독원 API 통합 서비스",
      version: "6.0.0",
    },
    servers: [{ url: baseUrl }],
    paths: {
      ...getLawPaths(),
      ...(hasDart ? getDartPaths() : {}),
      ...(hasData20 ? getData20Paths() : {}),
      ...(hasUnipass ? getUnipassPaths() : {}),
      ...(hasExim ? getEximPaths() : {}),
      ...(hasMafra ? getMafraPaths() : {}),
      ...(hasFinlife ? getFinlifePaths() : {}),
    },
  };
}
