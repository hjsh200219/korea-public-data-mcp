/**
 * DART 전자공시 OpenAPI 경로 정의
 */

import { apiPath, jsonResponse, param } from "./shared.js";
import type { OpenApiPaths } from "./shared.js";

export function getDartPaths(): OpenApiPaths {
  return {
    ...apiPath({
      path: "/api/dart/corp-code",
      operationId: "dartResolveCorpCode",
      summary: "DART 기업 고유번호 검색",
      description: "회사명으로 DART 기업 고유번호를 조회합니다.",
      parameters: [param("corp_name", "검색할 회사명", { required: true, schema: { type: "string" } })],
      responses: jsonResponse("기업 고유번호 검색 결과"),
    }),
    ...apiPath({
      path: "/api/dart/disclosures",
      operationId: "dartSearchDisclosures",
      summary: "DART 공시보고서 검색",
      description: "기업 공시보고서 목록을 조회합니다.",
      parameters: [
        param("corp_code", "DART 고유번호 (8자리)", { schema: { type: "string" } }),
        param("bgn_de", "시작일 (YYYYMMDD)", { schema: { type: "string", pattern: "^\\d{8}$" } }),
        param("end_de", "종료일 (YYYYMMDD)", { schema: { type: "string", pattern: "^\\d{8}$" } }),
        param("pblntf_ty", "공시유형", {
          schema: { type: "string", enum: ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"] },
        }),
        param("page_no", "페이지 번호", { schema: { type: "integer", default: 1 } }),
        param("page_count", "페이지당 건수", { schema: { type: "integer", default: 20 } }),
      ],
      responses: jsonResponse("공시보고서 검색 결과"),
    }),
    ...apiPath({
      path: "/api/dart/company",
      operationId: "dartGetCompanyInfo",
      summary: "DART 기업개황 조회",
      description: "기업 기본정보(대표자, 주소, 업종 등)를 조회합니다.",
      parameters: [param("corp_code", "DART 고유번호 (8자리)", { required: true, schema: { type: "string" } })],
      responses: jsonResponse("기업개황 정보"),
    }),
    ...apiPath({
      path: "/api/dart/financials",
      operationId: "dartGetFinancials",
      summary: "DART 전체 재무제표 조회",
      description: "기업의 전체 재무제표(재무상태표, 손익계산서 등)를 조회합니다.",
      parameters: [
        param("corp_code", "DART 고유번호", { required: true, schema: { type: "string" } }),
        param("bsns_year", "사업연도 (YYYY)", { required: true, schema: { type: "string" } }),
        param("reprt_code", "보고서코드 (11013:1분기, 11012:반기, 11014:3분기, 11011:사업보고서)", {
          required: true,
          schema: { type: "string", enum: ["11013", "11012", "11014", "11011"] },
        }),
        param("fs_div", "재무제표구분", {
          schema: { type: "string", enum: ["OFS", "CFS"], default: "CFS" },
        }),
      ],
      responses: jsonResponse("전체 재무제표"),
    }),
    ...apiPath({
      path: "/api/dart/key-accounts",
      operationId: "dartGetKeyAccounts",
      summary: "DART 주요계정 조회",
      description: "매출액, 영업이익, 당기순이익 등 핵심 재무지표를 조회합니다.",
      parameters: [
        param("corp_code", "DART 고유번호", { required: true, schema: { type: "string" } }),
        param("bsns_year", "사업연도 (YYYY)", { required: true, schema: { type: "string" } }),
        param("reprt_code", "보고서코드", {
          required: true,
          schema: { type: "string", enum: ["11013", "11012", "11014", "11011"] },
        }),
      ],
      responses: jsonResponse("주요계정 정보"),
    }),
    ...apiPath({
      path: "/api/dart/document",
      operationId: "dartGetDocument",
      summary: "DART 공시서류 본문 조회",
      description: "접수번호로 공시서류의 원문(본문 텍스트)을 조회합니다.",
      parameters: [param("rcept_no", "접수번호 (14자리)", { required: true, schema: { type: "string" } })],
      responses: jsonResponse("공시서류 본문"),
    }),
  };
}
