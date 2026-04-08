/**
 * 금융위원회 보험상품 공시 OpenAPI 경로 정의 (data.go.kr)
 */

import { apiPath, jsonResponse, param } from "./shared.js";
import type { OpenApiPaths, OpenApiParam } from "./shared.js";

const COMMON_PAGE: OpenApiParam[] = [
  param("page_no", "페이지 번호", { schema: { type: "integer", default: 1 } }),
  param("num_of_rows", "페이지당 건수", { schema: { type: "integer", default: 10 } }),
];

const MEDICAL_PARAMS: OpenApiParam[] = [
  param("bas_dt", "기준일자 YYYYMMDD"),
  param("begin_bas_dt", "기준일자 시작"),
  param("end_bas_dt", "기준일자 종료"),
  param("cmpy_cd", "회사코드"),
  param("cmpy_nm", "회사명 (정확)"),
  param("ptrn", "상품종류"),
  param("mog", "담보종류"),
  param("prd_nm", "상품명 (정확)"),
  param("like_prd_nm", "상품명 부분 일치"),
  param("age", "나이"),
  param("ofr_inst_nm", "제공기관명"),
  ...COMMON_PAGE,
];

const PROPERTY_PARAMS: OpenApiParam[] = [
  param("stts_accml_trgt_yr", "통계누적대상연도 (정확)"),
  param("like_stts_accml_trgt_yr", "통계누적대상연도 부분 일치"),
  param("begin_stts_accml_trgt_yr", "시작 연도"),
  param("end_stts_accml_trgt_yr", "종료 연도"),
  param("mog_clsf_nm", "담보구분명"),
  param("objc_clsf_nm", "목적물구분명"),
  ...COMMON_PAGE,
];

const AUTO_CONTRACT_PARAMS: OpenApiParam[] = [
  param("isu_cmpy_ofr_ym", "보험사 제공 연월 YYYYMM"),
  param("begin_isu_cmpy_ofr_ym", "제공 연월 시작"),
  param("end_isu_cmpy_ofr_ym", "제공 연월 종료"),
  param("isu_itms_nm", "보험종목명"),
  param("mog_clsf_nm", "담보구분명"),
  param("sex_nm", "성별명"),
  param("aggr", "연령대"),
  param("atmb_plor_nm", "자동차소유자명 (개인/법인)"),
  param("kncr_nm", "차종명"),
  ...COMMON_PAGE,
];

const AUTO_LOS_PARAMS: OpenApiParam[] = [
  param("isu_cmpy_ofr_ym", "보험사 제공 연월 YYYYMM"),
  param("begin_isu_cmpy_ofr_ym", "제공 연월 시작"),
  param("end_isu_cmpy_ofr_ym", "제공 연월 종료"),
  param("isu_itms_nm", "보험종목명"),
  param("mog_clsf_nm", "담보구분명"),
  param("kncr_nm", "차종명"),
  ...COMMON_PAGE,
];

const AUTO_VICTIM_PARAMS: OpenApiParam[] = [
  param("atmb_acdn_cnls_ym", "자동차사고 집계 연월 YYYYMM"),
  param("begin_atmb_acdn_cnls_ym", "집계 연월 시작"),
  param("end_atmb_acdn_cnls_ym", "집계 연월 종료"),
  param("dth_inj_clsf_nm", "사망/부상 구분명"),
  param("imp_yn", "과실여부 (Y/N)"),
  param("inj_lvlcnt_cd", "부상등급코드"),
  param("imp_lvlcnt_cd", "과실등급코드"),
  ...COMMON_PAGE,
];

const VARIABLE_INSURANCE_PARAMS: OpenApiParam[] = [
  param("cmpy_cd", "회사코드"),
  param("cmpy_nm", "회사명 (정확)"),
  param("like_cmpy_nm", "회사명 부분 일치"),
  param("fnd_nm", "펀드명 (정확)"),
  param("like_fnd_nm", "펀드명 부분 일치"),
  param("fnd_cd", "펀드코드"),
  param("bas_dt", "기준일자 YYYYMMDD"),
  param("begin_bas_dt", "기준일자 이상"),
  param("end_bas_dt", "기준일자 미만"),
  param("like_bas_dt", "기준일자 부분 일치"),
  ...COMMON_PAGE,
];

const LIFE_INSU_JOIN_PARAMS: OpenApiParam[] = [
  param("stts_accml_trgt_yr", "통계집적대상년도"),
  param("area_nm", "지역명"),
  param("sex_nm", "성별명"),
  param("rchn_aggr", "도달연령대"),
  param("isu_kind_nm", "보험종류명"),
  ...COMMON_PAGE,
];

const INDIVIDUAL_ANNUITY_PARAMS: OpenApiParam[] = [
  param("stts_accml_trgt_yr", "통계집적대상년도"),
  param("rchn_aggr", "도달연령대"),
  param("tax_prql_yn", "세제적격여부 (Y/N)"),
  param("pymt_mth_nm", "납입방법명"),
  param("offr_ty_nm", "모집형태명"),
  param("yer_unit_pymt_term", "년단위납입기간"),
  ...COMMON_PAGE,
];

const RETIREMENT_PENSION_PARAMS: OpenApiParam[] = [
  param("cmpy_cd", "회사코드"),
  param("cmpy_nm", "회사명 (정확)"),
  param("like_cmpy_nm", "회사명 부분 일치"),
  param("fnd_nm", "펀드명 (정확)"),
  param("like_fnd_nm", "펀드명 부분 일치"),
  param("fnd_cd", "펀드코드"),
  param("bas_dt", "기준일자 YYYYMMDD"),
  param("begin_bas_dt", "기준일자 이상"),
  param("end_bas_dt", "기준일자 미만"),
  param("like_bas_dt", "기준일자 부분 일치"),
  param("begin_basprc", "기준가 이상"),
  param("end_basprc", "기준가 미만"),
  param("ofr_inst_nm", "제공기관명"),
  ...COMMON_PAGE,
];

export function getInsurancePaths(): OpenApiPaths {
  return {
    ...apiPath({
      path: "/api/insurance/medical-reimbursement",
      operationId: "insuranceSearchMedicalReimbursement",
      summary: "실손보험정보 조회",
      description: "금융위원회 실손의료보험 상품의 회사·담보·나이별 남/여 보험료를 조회합니다.",
      parameters: MEDICAL_PARAMS,
      responses: jsonResponse("실손보험정보 목록"),
    }),
    ...apiPath({
      path: "/api/insurance/property-insu-join",
      operationId: "insuranceSearchPropertyInsuJoin",
      summary: "일반손해보험 가입정보 조회",
      description: "일반손해보험의 담보·목적물별 계약건수와 보험료를 조회합니다.",
      parameters: PROPERTY_PARAMS,
      responses: jsonResponse("일반손해보험 가입정보 목록"),
    }),
    ...apiPath({
      path: "/api/insurance/auto-contract",
      operationId: "insuranceSearchAutoContract",
      summary: "자동차보험 계약정보 조회",
      description: "자동차보험의 보험종목·담보·성별·연령·차종별 가입건수와 경과보험료를 조회합니다.",
      parameters: AUTO_CONTRACT_PARAMS,
      responses: jsonResponse("자동차보험 계약정보 목록"),
    }),
    ...apiPath({
      path: "/api/insurance/auto-los-circumstance",
      operationId: "insuranceSearchAutoLosCircumstance",
      summary: "자동차보험 사고현황 조회",
      description: "자동차보험보별·차종별 손해액, 부상자수, 사망자수를 조회합니다.",
      parameters: AUTO_LOS_PARAMS,
      responses: jsonResponse("자동차보험 사고현황 목록"),
    }),
    ...apiPath({
      path: "/api/insurance/auto-victim",
      operationId: "insuranceSearchAutoVictim",
      summary: "자동차보험 피해자 정보 조회",
      description: "자동차보험 사망/부상 구분, 과실여부, 부상·과실 등급별 피해자 정보를 조회합니다.",
      parameters: AUTO_VICTIM_PARAMS,
      responses: jsonResponse("자동차보험 피해자 정보 목록"),
    }),
    ...apiPath({
      path: "/api/insurance/variable-insurance-fund",
      operationId: "insuranceSearchVariableInsuranceFund",
      summary: "변액보험 펀드정보 조회",
      description: "생명보험협회가 제공하는 변액보험 회사·펀드별 기준가와 순자산금액을 조회합니다.",
      parameters: VARIABLE_INSURANCE_PARAMS,
      responses: jsonResponse("변액보험 펀드 목록"),
    }),
    ...apiPath({
      path: "/api/insurance/life-insu-join-status",
      operationId: "insuranceSearchLifeInsuJoinStatus",
      summary: "생명보험 가입현황 조회",
      description: "국민의 생명보험 가입현황을 지역·성별·도달연령대·보험종류별로 조회합니다.",
      parameters: LIFE_INSU_JOIN_PARAMS,
      responses: jsonResponse("생명보험 가입현황 목록"),
    }),
    ...apiPath({
      path: "/api/insurance/individual-annuity-insu",
      operationId: "insuranceSearchIndividualAnnuityInsu",
      summary: "개인연금보험 가입정보 조회",
      description: "개인연금보험의 도달연령·세제적격·납입방법·모집형태별 가입정보를 조회합니다.",
      parameters: INDIVIDUAL_ANNUITY_PARAMS,
      responses: jsonResponse("개인연금보험 가입정보 목록"),
    }),
    ...apiPath({
      path: "/api/insurance/retirement-pension-fund",
      operationId: "insuranceSearchRetirementPensionFund",
      summary: "퇴직연금 펀드정보 조회",
      description: "생명보험협회·손해보험협회가 제공하는 퇴직연금 회사·펀드별 기준가와 순자산금액을 조회합니다.",
      parameters: RETIREMENT_PENSION_PARAMS,
      responses: jsonResponse("퇴직연금 펀드 목록"),
    }),
  };
}
