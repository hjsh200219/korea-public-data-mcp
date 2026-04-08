/**
 * 금융감독원 금융상품 비교공시 OpenAPI 경로 정의
 */

import { apiPath, jsonResponse, param } from "./shared.js";
import type { OpenApiPaths, OpenApiParam } from "./shared.js";

const TOP_FIN_GRP_PARAM: OpenApiParam = param(
  "top_fin_grp_no",
  "권역코드 6자리 (020000=은행, 030200=여신전문, 030300=저축은행, 050000=보험, 060000=금융투자)",
  {
    required: true,
    schema: { type: "string", enum: ["020000", "030200", "030300", "050000", "060000"] },
  },
);

const PAGE_NO_PARAM: OpenApiParam = param("page_no", "페이지 번호", {
  schema: { type: "integer", default: 1 },
});

const FIN_CO_NO_PARAM: OpenApiParam = param("fin_co_no", "금융회사 코드 (선택 필터)", {
  schema: { type: "string" },
});

const BASE_PARAMS: OpenApiParam[] = [TOP_FIN_GRP_PARAM, PAGE_NO_PARAM];
const COMPANY_PARAMS: OpenApiParam[] = [TOP_FIN_GRP_PARAM, PAGE_NO_PARAM, FIN_CO_NO_PARAM];

export function getFinlifePaths(): OpenApiPaths {
  return {
    ...apiPath({
      path: "/api/finlife/companies",
      operationId: "finlifeSearchCompanies",
      summary: "금융회사 목록 조회",
      description: "금융감독원에 공시된 금융회사 기본정보(회사명, 고객센터, 홈페이지)를 조회합니다.",
      parameters: COMPANY_PARAMS,
      responses: jsonResponse("금융회사 목록"),
    }),
    ...apiPath({
      path: "/api/finlife/deposits",
      operationId: "finlifeSearchDeposits",
      summary: "정기예금 상품 조회",
      description: "금융회사별 정기예금 상품의 기본 이율·최고 우대금리·저축기간 등을 조회합니다.",
      parameters: BASE_PARAMS,
      responses: jsonResponse("정기예금 상품 목록"),
    }),
    ...apiPath({
      path: "/api/finlife/savings",
      operationId: "finlifeSearchSavings",
      summary: "적금 상품 조회",
      description: "금융회사별 적금(정액·자유) 상품의 기본 이율·최고 우대금리·저축기간 등을 조회합니다.",
      parameters: BASE_PARAMS,
      responses: jsonResponse("적금 상품 목록"),
    }),
    ...apiPath({
      path: "/api/finlife/annuities",
      operationId: "finlifeSearchAnnuities",
      summary: "연금저축 상품 조회",
      description: "연금저축 상품의 공시이율, 평균 수익률, 월 예상 연금 수령액 등을 조회합니다.",
      parameters: BASE_PARAMS,
      responses: jsonResponse("연금저축 상품 목록"),
    }),
    ...apiPath({
      path: "/api/finlife/mortgage-loans",
      operationId: "finlifeSearchMortgageLoans",
      summary: "주택담보대출 상품 조회",
      description:
        "주택담보대출 상품의 금리(고정/변동/혼합), 담보유형(아파트/아파트외), 한도, 중도상환수수료 등을 조회합니다.",
      parameters: BASE_PARAMS,
      responses: jsonResponse("주택담보대출 상품 목록"),
    }),
    ...apiPath({
      path: "/api/finlife/rent-house-loans",
      operationId: "finlifeSearchRentHouseLoans",
      summary: "전세자금대출 상품 조회",
      description: "전세자금대출 상품의 금리, 한도, 중도상환수수료 등을 조회합니다.",
      parameters: BASE_PARAMS,
      responses: jsonResponse("전세자금대출 상품 목록"),
    }),
    ...apiPath({
      path: "/api/finlife/credit-loans",
      operationId: "finlifeSearchCreditLoans",
      summary: "개인신용대출 상품 조회",
      description: "개인신용대출 상품의 신용점수 구간별 금리(900초과~300이하)와 평균 금리를 조회합니다.",
      parameters: BASE_PARAMS,
      responses: jsonResponse("개인신용대출 상품 목록"),
    }),
  };
}
