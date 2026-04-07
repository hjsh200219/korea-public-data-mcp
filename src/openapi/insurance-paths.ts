/**
 * 금융감독원 보험상품 공시 OpenAPI 경로 정의 (data.go.kr)
 */

import { jsonResponse, paginationParams } from "./shared.js";
import type { OpenApiPaths, OpenApiParam } from "./shared.js";

const COMMON_PAGE: OpenApiParam[] = [
  { name: "page_no", in: "query", schema: { type: "integer", default: 1 }, description: "페이지 번호" },
  { name: "num_of_rows", in: "query", schema: { type: "integer", default: 10 }, description: "페이지당 건수" },
];

void paginationParams; // 동일 의미 — kebab-case 별도 사용

const MEDICAL_PARAMS: OpenApiParam[] = [
  { name: "bas_dt", in: "query", schema: { type: "string" }, description: "기준일자 YYYYMMDD" },
  { name: "begin_bas_dt", in: "query", schema: { type: "string" }, description: "기준일자 시작" },
  { name: "end_bas_dt", in: "query", schema: { type: "string" }, description: "기준일자 종료" },
  { name: "cmpy_cd", in: "query", schema: { type: "string" }, description: "회사코드" },
  { name: "cmpy_nm", in: "query", schema: { type: "string" }, description: "회사명 (정확)" },
  { name: "ptrn", in: "query", schema: { type: "string" }, description: "상품종류" },
  { name: "mog", in: "query", schema: { type: "string" }, description: "담보종류" },
  { name: "prd_nm", in: "query", schema: { type: "string" }, description: "상품명 (정확)" },
  { name: "like_prd_nm", in: "query", schema: { type: "string" }, description: "상품명 부분 일치" },
  { name: "age", in: "query", schema: { type: "string" }, description: "나이" },
  { name: "ofr_inst_nm", in: "query", schema: { type: "string" }, description: "제공기관명" },
  ...COMMON_PAGE,
];

const PROPERTY_PARAMS: OpenApiParam[] = [
  { name: "stts_accml_trgt_yr", in: "query", schema: { type: "string" }, description: "통계누적대상연도 (정확)" },
  { name: "like_stts_accml_trgt_yr", in: "query", schema: { type: "string" }, description: "통계누적대상연도 부분 일치" },
  { name: "begin_stts_accml_trgt_yr", in: "query", schema: { type: "string" }, description: "시작 연도" },
  { name: "end_stts_accml_trgt_yr", in: "query", schema: { type: "string" }, description: "종료 연도" },
  { name: "mog_clsf_nm", in: "query", schema: { type: "string" }, description: "담보구분명" },
  { name: "objc_clsf_nm", in: "query", schema: { type: "string" }, description: "목적물구분명" },
  ...COMMON_PAGE,
];

const AUTO_CONTRACT_PARAMS: OpenApiParam[] = [
  { name: "isu_cmpy_ofr_ym", in: "query", schema: { type: "string" }, description: "보험사 제공 연월 YYYYMM" },
  { name: "begin_isu_cmpy_ofr_ym", in: "query", schema: { type: "string" }, description: "제공 연월 시작" },
  { name: "end_isu_cmpy_ofr_ym", in: "query", schema: { type: "string" }, description: "제공 연월 종료" },
  { name: "isu_itms_nm", in: "query", schema: { type: "string" }, description: "보험종목명" },
  { name: "mog_clsf_nm", in: "query", schema: { type: "string" }, description: "담보구분명" },
  { name: "sex_nm", in: "query", schema: { type: "string" }, description: "성별명" },
  { name: "aggr", in: "query", schema: { type: "string" }, description: "연령대" },
  { name: "atmb_plor_nm", in: "query", schema: { type: "string" }, description: "자동차소유자명 (개인/법인)" },
  { name: "kncr_nm", in: "query", schema: { type: "string" }, description: "차종명" },
  ...COMMON_PAGE,
];

const AUTO_LOS_PARAMS: OpenApiParam[] = [
  { name: "isu_cmpy_ofr_ym", in: "query", schema: { type: "string" }, description: "보험사 제공 연월 YYYYMM" },
  { name: "begin_isu_cmpy_ofr_ym", in: "query", schema: { type: "string" }, description: "제공 연월 시작" },
  { name: "end_isu_cmpy_ofr_ym", in: "query", schema: { type: "string" }, description: "제공 연월 종료" },
  { name: "isu_itms_nm", in: "query", schema: { type: "string" }, description: "보험종목명" },
  { name: "mog_clsf_nm", in: "query", schema: { type: "string" }, description: "담보구분명" },
  { name: "kncr_nm", in: "query", schema: { type: "string" }, description: "차종명" },
  ...COMMON_PAGE,
];

const AUTO_VICTIM_PARAMS: OpenApiParam[] = [
  { name: "atmb_acdn_cnls_ym", in: "query", schema: { type: "string" }, description: "자동차사고 집계 연월 YYYYMM" },
  { name: "begin_atmb_acdn_cnls_ym", in: "query", schema: { type: "string" }, description: "집계 연월 시작" },
  { name: "end_atmb_acdn_cnls_ym", in: "query", schema: { type: "string" }, description: "집계 연월 종료" },
  { name: "dth_inj_clsf_nm", in: "query", schema: { type: "string" }, description: "사망/부상 구분명" },
  { name: "imp_yn", in: "query", schema: { type: "string" }, description: "과실여부 (Y/N)" },
  { name: "inj_lvlcnt_cd", in: "query", schema: { type: "string" }, description: "부상등급코드" },
  { name: "imp_lvlcnt_cd", in: "query", schema: { type: "string" }, description: "과실등급코드" },
  ...COMMON_PAGE,
];

export function getInsurancePaths(): OpenApiPaths {
  return {
    "/api/insurance/medical-reimbursement": {
      get: {
        operationId: "insuranceSearchMedicalReimbursement",
        summary: "실손보험정보 조회",
        description: "금융감독원 실손의료보험 상품의 회사·담보·나이별 남/여 보험료를 조회합니다.",
        parameters: MEDICAL_PARAMS,
        responses: jsonResponse("실손보험정보 목록"),
      },
    },
    "/api/insurance/property-insu-join": {
      get: {
        operationId: "insuranceSearchPropertyInsuJoin",
        summary: "일반손해보험 가입정보 조회",
        description: "일반손해보험의 담보·목적물별 계약건수와 보험료를 조회합니다.",
        parameters: PROPERTY_PARAMS,
        responses: jsonResponse("일반손해보험 가입정보 목록"),
      },
    },
    "/api/insurance/auto-contract": {
      get: {
        operationId: "insuranceSearchAutoContract",
        summary: "자동차보험 계약정보 조회",
        description: "자동차보험의 보험종목·담보·성별·연령·차종별 가입건수와 경과보험료를 조회합니다.",
        parameters: AUTO_CONTRACT_PARAMS,
        responses: jsonResponse("자동차보험 계약정보 목록"),
      },
    },
    "/api/insurance/auto-los-circumstance": {
      get: {
        operationId: "insuranceSearchAutoLosCircumstance",
        summary: "자동차보험 사고현황 조회",
        description: "자동차보험 담보별·차종별 손해액, 부상자수, 사망자수를 조회합니다.",
        parameters: AUTO_LOS_PARAMS,
        responses: jsonResponse("자동차보험 사고현황 목록"),
      },
    },
    "/api/insurance/auto-victim": {
      get: {
        operationId: "insuranceSearchAutoVictim",
        summary: "자동차보험 피해자 정보 조회",
        description: "자동차보험 사망/부상 구분, 과실여부, 부상·과실 등급별 피해자 정보를 조회합니다.",
        parameters: AUTO_VICTIM_PARAMS,
        responses: jsonResponse("자동차보험 피해자 정보 목록"),
      },
    },
  };
}
