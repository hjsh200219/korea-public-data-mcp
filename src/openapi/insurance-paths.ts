/**
 * 금융위원회 보험상품 공시 OpenAPI 경로 정의 (data.go.kr)
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

const VARIABLE_INSURANCE_PARAMS: OpenApiParam[] = [
  { name: "cmpy_cd", in: "query", schema: { type: "string" }, description: "회사코드" },
  { name: "cmpy_nm", in: "query", schema: { type: "string" }, description: "회사명 (정확)" },
  { name: "like_cmpy_nm", in: "query", schema: { type: "string" }, description: "회사명 부분 일치" },
  { name: "fnd_nm", in: "query", schema: { type: "string" }, description: "펀드명 (정확)" },
  { name: "like_fnd_nm", in: "query", schema: { type: "string" }, description: "펀드명 부분 일치" },
  { name: "fnd_cd", in: "query", schema: { type: "string" }, description: "펀드코드" },
  { name: "bas_dt", in: "query", schema: { type: "string" }, description: "기준일자 YYYYMMDD" },
  { name: "begin_bas_dt", in: "query", schema: { type: "string" }, description: "기준일자 이상" },
  { name: "end_bas_dt", in: "query", schema: { type: "string" }, description: "기준일자 미만" },
  { name: "like_bas_dt", in: "query", schema: { type: "string" }, description: "기준일자 부분 일치" },
  ...COMMON_PAGE,
];

const LIFE_INSU_JOIN_PARAMS: OpenApiParam[] = [
  { name: "stts_accml_trgt_yr", in: "query", schema: { type: "string" }, description: "통계집적대상년도" },
  { name: "area_nm", in: "query", schema: { type: "string" }, description: "지역명" },
  { name: "sex_nm", in: "query", schema: { type: "string" }, description: "성별명" },
  { name: "rchn_aggr", in: "query", schema: { type: "string" }, description: "도달연령대" },
  { name: "isu_kind_nm", in: "query", schema: { type: "string" }, description: "보험종류명" },
  ...COMMON_PAGE,
];

const INDIVIDUAL_ANNUITY_PARAMS: OpenApiParam[] = [
  { name: "stts_accml_trgt_yr", in: "query", schema: { type: "string" }, description: "통계집적대상년도" },
  { name: "rchn_aggr", in: "query", schema: { type: "string" }, description: "도달연령대" },
  { name: "tax_prql_yn", in: "query", schema: { type: "string" }, description: "세제적격여부 (Y/N)" },
  { name: "pymt_mth_nm", in: "query", schema: { type: "string" }, description: "납입방법명" },
  { name: "offr_ty_nm", in: "query", schema: { type: "string" }, description: "모집형태명" },
  { name: "yer_unit_pymt_term", in: "query", schema: { type: "string" }, description: "년단위납입기간" },
  ...COMMON_PAGE,
];

const RETIREMENT_PENSION_PARAMS: OpenApiParam[] = [
  { name: "cmpy_cd", in: "query", schema: { type: "string" }, description: "회사코드" },
  { name: "cmpy_nm", in: "query", schema: { type: "string" }, description: "회사명 (정확)" },
  { name: "like_cmpy_nm", in: "query", schema: { type: "string" }, description: "회사명 부분 일치" },
  { name: "fnd_nm", in: "query", schema: { type: "string" }, description: "펀드명 (정확)" },
  { name: "like_fnd_nm", in: "query", schema: { type: "string" }, description: "펀드명 부분 일치" },
  { name: "fnd_cd", in: "query", schema: { type: "string" }, description: "펀드코드" },
  { name: "bas_dt", in: "query", schema: { type: "string" }, description: "기준일자 YYYYMMDD" },
  { name: "begin_bas_dt", in: "query", schema: { type: "string" }, description: "기준일자 이상" },
  { name: "end_bas_dt", in: "query", schema: { type: "string" }, description: "기준일자 미만" },
  { name: "like_bas_dt", in: "query", schema: { type: "string" }, description: "기준일자 부분 일치" },
  { name: "begin_basprc", in: "query", schema: { type: "string" }, description: "기준가 이상" },
  { name: "end_basprc", in: "query", schema: { type: "string" }, description: "기준가 미만" },
  { name: "ofr_inst_nm", in: "query", schema: { type: "string" }, description: "제공기관명" },
  ...COMMON_PAGE,
];

export function getInsurancePaths(): OpenApiPaths {
  return {
    "/api/insurance/medical-reimbursement": {
      get: {
        operationId: "insuranceSearchMedicalReimbursement",
        summary: "실손보험정보 조회",
        description: "금융위원회 실손의료보험 상품의 회사·담보·나이별 남/여 보험료를 조회합니다.",
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
    "/api/insurance/variable-insurance-fund": {
      get: {
        operationId: "insuranceSearchVariableInsuranceFund",
        summary: "변액보험 펀드정보 조회",
        description: "생명보험협회가 제공하는 변액보험 회사·펀드별 기준가와 순자산금액을 조회합니다.",
        parameters: VARIABLE_INSURANCE_PARAMS,
        responses: jsonResponse("변액보험 펀드 목록"),
      },
    },
    "/api/insurance/life-insu-join-status": {
      get: {
        operationId: "insuranceSearchLifeInsuJoinStatus",
        summary: "생명보험 가입현황 조회",
        description: "국민의 생명보험 가입현황을 지역·성별·도달연령대·보험종류별로 조회합니다.",
        parameters: LIFE_INSU_JOIN_PARAMS,
        responses: jsonResponse("생명보험 가입현황 목록"),
      },
    },
    "/api/insurance/individual-annuity-insu": {
      get: {
        operationId: "insuranceSearchIndividualAnnuityInsu",
        summary: "개인연금보험 가입정보 조회",
        description: "개인연금보험의 도달연령·세제적격·납입방법·모집형태별 가입정보를 조회합니다.",
        parameters: INDIVIDUAL_ANNUITY_PARAMS,
        responses: jsonResponse("개인연금보험 가입정보 목록"),
      },
    },
    "/api/insurance/retirement-pension-fund": {
      get: {
        operationId: "insuranceSearchRetirementPensionFund",
        summary: "퇴직연금 펀드정보 조회",
        description: "생명보험협회·손해보험협회가 제공하는 퇴직연금 회사·펀드별 기준가와 순자산금액을 조회합니다.",
        parameters: RETIREMENT_PENSION_PARAMS,
        responses: jsonResponse("퇴직연금 펀드 목록"),
      },
    },
  };
}
