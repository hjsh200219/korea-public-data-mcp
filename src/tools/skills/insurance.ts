/**
 * Skill: insurance — 금융위원회 보험상품 공시 (data.go.kr)
 *
 * 9개 보험 공시 API를 단일 스킬로 제공:
 *   - medical_reimbursement   실손보험정보 (남/여 보험료)
 *   - property_insu_join      일반손해보험 가입정보 (담보별 계약건수/보험료)
 *   - auto_contract           자동차보험 계약정보 (성별·연령·차종별)
 *   - auto_los_circumstance   자동차보험 사고현황 (손해액/사상자)
 *   - auto_victim             자동차보험 피해자 정보 (사상/과실 등급)
 *   - variable_insurance_fund 변액보험 펀드정보 (회사·펀드별 기준가/순자산)
 *   - life_insu_join_status   생명보험 가입현황 (지역·성별·연령별 가입건수/율)
 *   - individual_annuity_insu 개인연금보험 가입정보 (납입·세제·모집형태별)
 *   - retirement_pension_fund 퇴직연금 펀드정보 (회사·펀드별 기준가/순자산)
 *
 * 인증: DATA20_SERVICE_KEY 재사용 (data.go.kr 통합 키).
 *       단, 각 API별로 활용신청 승인이 필요합니다.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  searchMedicalReimbursementInsurance,
  searchPropertyInsuJoin,
  searchAutoContract,
  searchAutoLosCircumstance,
  searchAutoVictim,
  searchVariableInsuranceFund,
  searchLifeInsuJoinStatus,
  searchIndividualAnnuityInsu,
  searchRetirementPensionFund,
} from "../../insurance-api.js";
import type {
  MedicalReimbursementItem,
  PropertyInsuJoinItem,
  AutoContractItem,
  AutoLosCircumstanceItem,
  AutoVictimItem,
  VariableInsuranceFundItem,
  LifeInsuJoinStatusItem,
  IndividualAnnuityInsuItem,
  RetirementPensionFundItem,
} from "../../insurance-types.js";
import { errorResponse, truncate } from "../../shared.js";
import {
  createDispatcher,
  emptyResultMessage,
  type SkillResult,
} from "./_shared.js";

const ACTIONS = [
  "medical_reimbursement",
  "property_insu_join",
  "auto_contract",
  "auto_los_circumstance",
  "auto_victim",
  "variable_insurance_fund",
  "life_insu_join_status",
  "individual_annuity_insu",
  "retirement_pension_fund",
] as const;

type InsuranceParams = {
  action: string;
  // 공통
  page_no?: number;
  num_of_rows?: number;
  // 실손보험
  bas_dt?: string;
  begin_bas_dt?: string;
  end_bas_dt?: string;
  cmpy_cd?: string;
  cmpy_nm?: string;
  ptrn?: string;
  mog?: string;
  prd_nm?: string;
  like_prd_nm?: string;
  age?: string;
  ofr_inst_nm?: string;
  // 일반손해보험
  stts_accml_trgt_yr?: string;
  like_stts_accml_trgt_yr?: string;
  begin_stts_accml_trgt_yr?: string;
  end_stts_accml_trgt_yr?: string;
  mog_clsf_nm?: string;
  objc_clsf_nm?: string;
  // 자동차보험
  isu_cmpy_ofr_ym?: string;
  begin_isu_cmpy_ofr_ym?: string;
  end_isu_cmpy_ofr_ym?: string;
  isu_itms_nm?: string;
  sex_nm?: string;
  aggr?: string;
  atmb_plor_nm?: string;
  kncr_nm?: string;
  // 자동차 피해자
  atmb_acdn_cnls_ym?: string;
  begin_atmb_acdn_cnls_ym?: string;
  end_atmb_acdn_cnls_ym?: string;
  dth_inj_clsf_nm?: string;
  imp_yn?: string;
  inj_lvlcnt_cd?: string;
  imp_lvlcnt_cd?: string;
  // 변액보험 / 퇴직연금 (펀드 공통)
  like_cmpy_nm?: string;
  fnd_nm?: string;
  like_fnd_nm?: string;
  fnd_cd?: string;
  like_bas_dt?: string;
  begin_basprc?: string;
  end_basprc?: string;
  // 생명보험 가입현황
  area_nm?: string;
  rchn_aggr?: string;
  isu_kind_nm?: string;
  // 개인연금보험
  tax_prql_yn?: string;
  pymt_mth_nm?: string;
  offr_ty_nm?: string;
  yer_unit_pymt_term?: string;
};

// ---------------------------------------------------------------------------
// 공통 유틸
// ---------------------------------------------------------------------------

function fmtFooter(now: number, num: number, total: number): string {
  return `\n\n_총 ${total}건 / 페이지 ${now} (페이지당 ${num}건)_`;
}

function num(v: number | null | undefined, suffix = ""): string {
  if (v == null) return "-";
  return `${Number(v).toLocaleString()}${suffix}`;
}

// ---------------------------------------------------------------------------
// 1. 실손보험정보
// ---------------------------------------------------------------------------

function renderMedicalReimbursement(item: MedicalReimbursementItem): string {
  return [
    `### ${item.cmpyNm} — ${item.prdNm}`,
    `상품종류: ${item.ptrn || "-"} | 담보: ${item.mog || "-"} | 나이: ${item.age || "-"}`,
    `남자 보험료: ${num(item.mlInsRt, "원")} | 여자 보험료: ${num(item.fmlInsRt, "원")}`,
    `기준일: ${item.basDt || "-"} | 제공기관: ${item.ofrInstNm || "-"}`,
  ].join("\n");
}

function handleMedicalReimbursement(serviceKey: string) {
  return async (p: InsuranceParams): Promise<SkillResult> => {
    try {
      const result = await searchMedicalReimbursementInsurance(serviceKey, {
        basDt: p.bas_dt,
        beginBasDt: p.begin_bas_dt,
        endBasDt: p.end_bas_dt,
        cmpyCd: p.cmpy_cd,
        cmpyNm: p.cmpy_nm,
        ptrn: p.ptrn,
        mog: p.mog,
        prdNm: p.prd_nm,
        likePrdNm: p.like_prd_nm,
        age: p.age,
        ofrInstNm: p.ofr_inst_nm,
        pageNo: p.page_no,
        numOfRows: p.num_of_rows,
      });
      if (result.items.length === 0) {
        return emptyResultMessage("실손보험정보", {
          cmpy_nm: p.cmpy_nm,
          prd_nm: p.prd_nm,
          like_prd_nm: p.like_prd_nm,
          bas_dt: p.bas_dt,
        });
      }
      const blocks = result.items.map(renderMedicalReimbursement);
      const header = "## 실손보험정보 (금융위원회)";
      const footer = fmtFooter(result.pageNo, result.numOfRows, result.totalCount);
      return {
        content: [{
          type: "text",
          text: truncate(`${header}\n\n${blocks.join("\n\n")}${footer}`),
        }],
      };
    } catch (error) {
      return errorResponse("실손보험정보 조회", error);
    }
  };
}

// ---------------------------------------------------------------------------
// 2. 일반손해보험 가입정보
// ---------------------------------------------------------------------------

function renderPropertyInsuJoin(item: PropertyInsuJoinItem): string {
  return [
    `### ${item.sttsAccmlTrgtYr}년 — ${item.mogClsfNm || "-"} / ${item.objcClsfNm || "-"}`,
    `계약건수: ${num(item.cntrCnt, "건")} | 보험료: ${num(item.inpm, "원")}`,
  ].join("\n");
}

function handlePropertyInsuJoin(serviceKey: string) {
  return async (p: InsuranceParams): Promise<SkillResult> => {
    // likeSttsAccmlTrgtYr 또는 sttsAccmlTrgtYr 중 하나는 사실상 필요
    // (정책상 likeSttsAccmlTrgtYr이 필수로 명시되어 있음 - 미지정 시 빈 문자열 전송 → 에러 가능)
    try {
      const result = await searchPropertyInsuJoin(serviceKey, {
        sttsAccmlTrgtYr: p.stts_accml_trgt_yr,
        likeSttsAccmlTrgtYr: p.like_stts_accml_trgt_yr,
        beginSttsAccmlTrgtYr: p.begin_stts_accml_trgt_yr,
        endSttsAccmlTrgtYr: p.end_stts_accml_trgt_yr,
        mogClsfNm: p.mog_clsf_nm,
        objcClsfNm: p.objc_clsf_nm,
        pageNo: p.page_no,
        numOfRows: p.num_of_rows,
      });
      if (result.items.length === 0) {
        return emptyResultMessage("일반손해보험 가입정보", {
          stts_accml_trgt_yr: p.stts_accml_trgt_yr,
          like_stts_accml_trgt_yr: p.like_stts_accml_trgt_yr,
          mog_clsf_nm: p.mog_clsf_nm,
          objc_clsf_nm: p.objc_clsf_nm,
        });
      }
      const blocks = result.items.map(renderPropertyInsuJoin);
      const header = "## 일반손해보험 가입정보 (금융위원회)";
      const footer = fmtFooter(result.pageNo, result.numOfRows, result.totalCount);
      return {
        content: [{
          type: "text",
          text: truncate(`${header}\n\n${blocks.join("\n\n")}${footer}`),
        }],
      };
    } catch (error) {
      return errorResponse("일반손해보험 가입정보 조회", error);
    }
  };
}

// ---------------------------------------------------------------------------
// 3. 자동차보험 계약정보
// ---------------------------------------------------------------------------

function renderAutoContract(item: AutoContractItem): string {
  return [
    `### ${item.isuCmpyOfrYm} — ${item.isuItmsNm || "-"} / ${item.mogClsfNm || "-"}`,
    `소유: ${item.atmbPlorNm || "-"} | 차종: ${item.kncrNm || "-"} | 성별: ${item.sexNm || "-"} | 연령: ${item.aggr || "-"}`,
    `가입건수: ${num(item.joinCnt, "건")} | 경과보험료: ${num(item.elpsInpm, "원")}`,
  ].join("\n");
}

function handleAutoContract(serviceKey: string) {
  return async (p: InsuranceParams): Promise<SkillResult> => {
    try {
      const result = await searchAutoContract(serviceKey, {
        isuCmpyOfrYm: p.isu_cmpy_ofr_ym,
        beginIsuCmpyOfrYm: p.begin_isu_cmpy_ofr_ym,
        endIsuCmpyOfrYm: p.end_isu_cmpy_ofr_ym,
        isuItmsNm: p.isu_itms_nm,
        mogClsfNm: p.mog_clsf_nm,
        sexNm: p.sex_nm,
        aggr: p.aggr,
        atmbPlorNm: p.atmb_plor_nm,
        kncrNm: p.kncr_nm,
        pageNo: p.page_no,
        numOfRows: p.num_of_rows,
      });
      if (result.items.length === 0) {
        return emptyResultMessage("자동차보험 계약정보", {
          isu_cmpy_ofr_ym: p.isu_cmpy_ofr_ym,
          isu_itms_nm: p.isu_itms_nm,
          mog_clsf_nm: p.mog_clsf_nm,
          kncr_nm: p.kncr_nm,
        });
      }
      const blocks = result.items.map(renderAutoContract);
      const header = "## 자동차보험 계약정보 (금융위원회)";
      const footer = fmtFooter(result.pageNo, result.numOfRows, result.totalCount);
      return {
        content: [{
          type: "text",
          text: truncate(`${header}\n\n${blocks.join("\n\n")}${footer}`),
        }],
      };
    } catch (error) {
      return errorResponse("자동차보험 계약정보 조회", error);
    }
  };
}

// ---------------------------------------------------------------------------
// 4. 자동차보험 사고현황
// ---------------------------------------------------------------------------

function renderAutoLosCircumstance(item: AutoLosCircumstanceItem): string {
  return [
    `### ${item.isuCmpyOfrYm} — ${item.isuItmsNm || "-"} / ${item.mogClsfNm || "-"}`,
    `차종: ${item.kncrNm || "-"}`,
    `손해액: ${num(item.losAmt, "원")} | 부상자수: ${num(item.injPtlCnt, "명")} | 사망자수: ${num(item.dthTotlCnt, "명")}`,
  ].join("\n");
}

function handleAutoLosCircumstance(serviceKey: string) {
  return async (p: InsuranceParams): Promise<SkillResult> => {
    try {
      const result = await searchAutoLosCircumstance(serviceKey, {
        isuCmpyOfrYm: p.isu_cmpy_ofr_ym,
        beginIsuCmpyOfrYm: p.begin_isu_cmpy_ofr_ym,
        endIsuCmpyOfrYm: p.end_isu_cmpy_ofr_ym,
        isuItmsNm: p.isu_itms_nm,
        mogClsfNm: p.mog_clsf_nm,
        kncrNm: p.kncr_nm,
        pageNo: p.page_no,
        numOfRows: p.num_of_rows,
      });
      if (result.items.length === 0) {
        return emptyResultMessage("자동차보험 사고현황", {
          isu_cmpy_ofr_ym: p.isu_cmpy_ofr_ym,
          isu_itms_nm: p.isu_itms_nm,
          mog_clsf_nm: p.mog_clsf_nm,
          kncr_nm: p.kncr_nm,
        });
      }
      const blocks = result.items.map(renderAutoLosCircumstance);
      const header = "## 자동차보험 사고현황 (금융위원회)";
      const footer = fmtFooter(result.pageNo, result.numOfRows, result.totalCount);
      return {
        content: [{
          type: "text",
          text: truncate(`${header}\n\n${blocks.join("\n\n")}${footer}`),
        }],
      };
    } catch (error) {
      return errorResponse("자동차보험 사고현황 조회", error);
    }
  };
}

// ---------------------------------------------------------------------------
// 5. 자동차보험 피해자 정보
// ---------------------------------------------------------------------------

function renderAutoVictim(item: AutoVictimItem): string {
  return [
    `### ${item.atmbAcdnCnlsYm} — ${item.dthInjClsfNm || "-"}`,
    `과실여부: ${item.impYn || "-"} | 부상등급: ${item.injLvlcntCd || "-"} | 과실등급: ${item.impLvlcntCd || "-"}`,
    item.victimCnt != null ? `피해자수: ${num(item.victimCnt, "명")}` : "",
  ].filter(Boolean).join("\n");
}

function handleAutoVictim(serviceKey: string) {
  return async (p: InsuranceParams): Promise<SkillResult> => {
    try {
      const result = await searchAutoVictim(serviceKey, {
        atmbAcdnCnlsYm: p.atmb_acdn_cnls_ym,
        beginAtmbAcdnCnlsYm: p.begin_atmb_acdn_cnls_ym,
        endAtmbAcdnCnlsYm: p.end_atmb_acdn_cnls_ym,
        dthInjClsfNm: p.dth_inj_clsf_nm,
        impYn: p.imp_yn,
        injLvlcntCd: p.inj_lvlcnt_cd,
        impLvlcntCd: p.imp_lvlcnt_cd,
        pageNo: p.page_no,
        numOfRows: p.num_of_rows,
      });
      if (result.items.length === 0) {
        return emptyResultMessage("자동차보험 피해자 정보", {
          atmb_acdn_cnls_ym: p.atmb_acdn_cnls_ym,
          dth_inj_clsf_nm: p.dth_inj_clsf_nm,
          imp_yn: p.imp_yn,
        });
      }
      const blocks = result.items.map(renderAutoVictim);
      const header = "## 자동차보험 피해자 정보 (금융위원회)";
      const footer = fmtFooter(result.pageNo, result.numOfRows, result.totalCount);
      return {
        content: [{
          type: "text",
          text: truncate(`${header}\n\n${blocks.join("\n\n")}${footer}`),
        }],
      };
    } catch (error) {
      return errorResponse("자동차보험 피해자 정보 조회", error);
    }
  };
}

// ---------------------------------------------------------------------------
// 6. 변액보험 펀드정보
// ---------------------------------------------------------------------------

function renderVariableInsuranceFund(item: VariableInsuranceFundItem): string {
  return [
    `### ${item.cmpyNm || "-"} — ${item.fndNm || "-"}`,
    `회사코드: ${item.cmpyCd || "-"} | 펀드코드: ${item.fndCd || "-"} | 기준일: ${item.basDt || "-"}`,
    `기준가: ${item.basprc ?? "-"} | 순자산금액: ${item.nPptAmt ?? "-"}`,
  ].join("\n");
}

function handleVariableInsuranceFund(serviceKey: string) {
  return async (p: InsuranceParams): Promise<SkillResult> => {
    try {
      const result = await searchVariableInsuranceFund(serviceKey, {
        cmpyCd: p.cmpy_cd,
        cmpyNm: p.cmpy_nm,
        likeCmpyNm: p.like_cmpy_nm,
        fndNm: p.fnd_nm,
        likeFndNm: p.like_fnd_nm,
        fndCd: p.fnd_cd,
        basDt: p.bas_dt,
        beginBasDt: p.begin_bas_dt,
        endBasDt: p.end_bas_dt,
        likeBasDt: p.like_bas_dt,
        pageNo: p.page_no,
        numOfRows: p.num_of_rows,
      });
      if (result.items.length === 0) {
        return emptyResultMessage("변액보험 펀드정보", {
          cmpy_nm: p.cmpy_nm,
          like_cmpy_nm: p.like_cmpy_nm,
          fnd_nm: p.fnd_nm,
          like_fnd_nm: p.like_fnd_nm,
          bas_dt: p.bas_dt,
        });
      }
      const blocks = result.items.map(renderVariableInsuranceFund);
      const header = "## 변액보험 펀드정보 (금융위원회)";
      const footer = fmtFooter(result.pageNo, result.numOfRows, result.totalCount);
      return {
        content: [{
          type: "text",
          text: truncate(`${header}\n\n${blocks.join("\n\n")}${footer}`),
        }],
      };
    } catch (error) {
      return errorResponse("변액보험 펀드정보 조회", error);
    }
  };
}

// ---------------------------------------------------------------------------
// 7. 생명보험 가입현황
// ---------------------------------------------------------------------------

function renderLifeInsuJoinStatus(item: LifeInsuJoinStatusItem): string {
  return [
    `### ${item.sttsAccmlTrgtYr || "-"}년 — ${item.isuKindNm || "-"}`,
    `지역: ${item.areaNm || "-"} | 성별: ${item.sexNm || "-"} | 연령대: ${item.rchnAggr || "-"}`,
    `가입건수: ${num(item.joinCnt, "건")} | 가입율: ${num(item.joinRto, "%")}`,
  ].join("\n");
}

function handleLifeInsuJoinStatus(serviceKey: string) {
  return async (p: InsuranceParams): Promise<SkillResult> => {
    try {
      const result = await searchLifeInsuJoinStatus(serviceKey, {
        sttsAccmlTrgtYr: p.stts_accml_trgt_yr,
        areaNm: p.area_nm,
        sexNm: p.sex_nm,
        rchnAggr: p.rchn_aggr,
        isuKindNm: p.isu_kind_nm,
        pageNo: p.page_no,
        numOfRows: p.num_of_rows,
      });
      if (result.items.length === 0) {
        return emptyResultMessage("생명보험 가입현황", {
          stts_accml_trgt_yr: p.stts_accml_trgt_yr,
          area_nm: p.area_nm,
          sex_nm: p.sex_nm,
          rchn_aggr: p.rchn_aggr,
          isu_kind_nm: p.isu_kind_nm,
        });
      }
      const blocks = result.items.map(renderLifeInsuJoinStatus);
      const header = "## 생명보험 가입현황 (금융위원회)";
      const footer = fmtFooter(result.pageNo, result.numOfRows, result.totalCount);
      return {
        content: [{
          type: "text",
          text: truncate(`${header}\n\n${blocks.join("\n\n")}${footer}`),
        }],
      };
    } catch (error) {
      return errorResponse("생명보험 가입현황 조회", error);
    }
  };
}

// ---------------------------------------------------------------------------
// 8. 개인연금보험 가입정보
// ---------------------------------------------------------------------------

function renderIndividualAnnuityInsu(item: IndividualAnnuityInsuItem): string {
  return [
    `### ${item.sttsAccmlTrgtYr || "-"}년 — ${item.rchnAggr || "-"}`,
    `세제적격: ${item.taxPrqlYn || "-"} | 납입방법: ${item.pymtMthNm || "-"} | 모집형태: ${item.offrTyNm || "-"}`,
    `납입기간: ${item.yerUnitPymtTerm || "-"} | 가입건수: ${num(item.joinCnt, "건")}`,
  ].join("\n");
}

function handleIndividualAnnuityInsu(serviceKey: string) {
  return async (p: InsuranceParams): Promise<SkillResult> => {
    try {
      const result = await searchIndividualAnnuityInsu(serviceKey, {
        sttsAccmlTrgtYr: p.stts_accml_trgt_yr,
        rchnAggr: p.rchn_aggr,
        taxPrqlYn: p.tax_prql_yn,
        pymtMthNm: p.pymt_mth_nm,
        offrTyNm: p.offr_ty_nm,
        yerUnitPymtTerm: p.yer_unit_pymt_term,
        pageNo: p.page_no,
        numOfRows: p.num_of_rows,
      });
      if (result.items.length === 0) {
        return emptyResultMessage("개인연금보험 가입정보", {
          stts_accml_trgt_yr: p.stts_accml_trgt_yr,
          rchn_aggr: p.rchn_aggr,
          tax_prql_yn: p.tax_prql_yn,
          pymt_mth_nm: p.pymt_mth_nm,
          offr_ty_nm: p.offr_ty_nm,
        });
      }
      const blocks = result.items.map(renderIndividualAnnuityInsu);
      const header = "## 개인연금보험 가입정보 (금융위원회)";
      const footer = fmtFooter(result.pageNo, result.numOfRows, result.totalCount);
      return {
        content: [{
          type: "text",
          text: truncate(`${header}\n\n${blocks.join("\n\n")}${footer}`),
        }],
      };
    } catch (error) {
      return errorResponse("개인연금보험 가입정보 조회", error);
    }
  };
}

// ---------------------------------------------------------------------------
// 9. 퇴직연금 펀드정보
// ---------------------------------------------------------------------------

function renderRetirementPensionFund(item: RetirementPensionFundItem): string {
  return [
    `### ${item.cmpyNm || "-"} — ${item.fndNm || "-"}`,
    `회사코드: ${item.cmpyCd || "-"} | 펀드코드: ${item.fndCd || "-"} | 기준일: ${item.basDt || "-"}`,
    `기준가: ${item.basprc ?? "-"} | 순자산금액: ${item.nPptAmt ?? "-"}`,
    `제공기관: ${item.ofrInstNm || "-"}`,
  ].join("\n");
}

function handleRetirementPensionFund(serviceKey: string) {
  return async (p: InsuranceParams): Promise<SkillResult> => {
    try {
      const result = await searchRetirementPensionFund(serviceKey, {
        cmpyCd: p.cmpy_cd,
        cmpyNm: p.cmpy_nm,
        likeCmpyNm: p.like_cmpy_nm,
        fndNm: p.fnd_nm,
        likeFndNm: p.like_fnd_nm,
        fndCd: p.fnd_cd,
        basDt: p.bas_dt,
        beginBasDt: p.begin_bas_dt,
        endBasDt: p.end_bas_dt,
        likeBasDt: p.like_bas_dt,
        beginBasprc: p.begin_basprc,
        endBasprc: p.end_basprc,
        ofrInstNm: p.ofr_inst_nm,
        pageNo: p.page_no,
        numOfRows: p.num_of_rows,
      });
      if (result.items.length === 0) {
        return emptyResultMessage("퇴직연금 펀드정보", {
          cmpy_nm: p.cmpy_nm,
          like_cmpy_nm: p.like_cmpy_nm,
          fnd_nm: p.fnd_nm,
          like_fnd_nm: p.like_fnd_nm,
          bas_dt: p.bas_dt,
          ofr_inst_nm: p.ofr_inst_nm,
        });
      }
      const blocks = result.items.map(renderRetirementPensionFund);
      const header = "## 퇴직연금 펀드정보 (금융위원회)";
      const footer = fmtFooter(result.pageNo, result.numOfRows, result.totalCount);
      return {
        content: [{
          type: "text",
          text: truncate(`${header}\n\n${blocks.join("\n\n")}${footer}`),
        }],
      };
    } catch (error) {
      return errorResponse("퇴직연금 펀드정보 조회", error);
    }
  };
}

// ---------------------------------------------------------------------------
// 디스패처 + MCP 등록
// ---------------------------------------------------------------------------

export function createInsuranceHandler(serviceKey: string) {
  return createDispatcher<InsuranceParams>("insurance", {
    medical_reimbursement: handleMedicalReimbursement(serviceKey),
    property_insu_join: handlePropertyInsuJoin(serviceKey),
    auto_contract: handleAutoContract(serviceKey),
    auto_los_circumstance: handleAutoLosCircumstance(serviceKey),
    auto_victim: handleAutoVictim(serviceKey),
    variable_insurance_fund: handleVariableInsuranceFund(serviceKey),
    life_insu_join_status: handleLifeInsuJoinStatus(serviceKey),
    individual_annuity_insu: handleIndividualAnnuityInsu(serviceKey),
    retirement_pension_fund: handleRetirementPensionFund(serviceKey),
  });
}

export function registerInsurance(server: McpServer, serviceKey: string): void {
  const handler = createInsuranceHandler(serviceKey);

  server.tool(
    "insurance",
    "금융위원회 보험상품 공시 — 실손/일반손해/자동차/변액/생명/개인연금/퇴직연금 보험 정보를 조회합니다. (data.go.kr API, 활용신청 필요)",
    {
      action: z.enum(ACTIONS).describe(
        "medical_reimbursement=실손보험 보험료 | property_insu_join=일반손해보험 가입정보 | auto_contract=자동차보험 계약정보 | auto_los_circumstance=자동차보험 사고현황 | auto_victim=자동차보험 피해자 정보 | variable_insurance_fund=변액보험 펀드정보 | life_insu_join_status=생명보험 가입현황 | individual_annuity_insu=개인연금보험 가입정보 | retirement_pension_fund=퇴직연금 펀드정보",
      ),
      // 공통 페이징
      page_no: z.number().int().min(1).optional().describe("페이지 번호 (기본 1)"),
      num_of_rows: z.number().int().min(1).max(1000).optional().describe("페이지당 결과 수 (기본 10)"),

      // 실손보험 (medical_reimbursement)
      bas_dt: z.string().optional().describe("[실손] 기준일자 YYYYMMDD"),
      begin_bas_dt: z.string().optional().describe("[실손] 기준일자 시작 YYYYMMDD"),
      end_bas_dt: z.string().optional().describe("[실손] 기준일자 종료 YYYYMMDD"),
      cmpy_cd: z.string().optional().describe("[실손] 회사코드"),
      cmpy_nm: z.string().optional().describe("[실손] 회사명 (정확히 일치)"),
      ptrn: z.string().optional().describe("[실손] 상품종류"),
      mog: z.string().optional().describe("[실손] 담보종류"),
      prd_nm: z.string().optional().describe("[실손] 상품명 (정확히 일치)"),
      like_prd_nm: z.string().optional().describe("[실손] 상품명 부분 일치"),
      age: z.string().optional().describe("[실손] 나이"),
      ofr_inst_nm: z.string().optional().describe("[실손] 제공기관명"),

      // 일반손해보험 (property_insu_join)
      stts_accml_trgt_yr: z.string().optional().describe("[일반손해] 통계누적대상연도 (정확히 일치)"),
      like_stts_accml_trgt_yr: z.string().optional().describe("[일반손해] 통계누적대상연도 부분 일치"),
      begin_stts_accml_trgt_yr: z.string().optional().describe("[일반손해] 통계누적대상연도 시작"),
      end_stts_accml_trgt_yr: z.string().optional().describe("[일반손해] 통계누적대상연도 종료"),
      mog_clsf_nm: z.string().optional().describe("[일반손해/자동차] 담보구분명"),
      objc_clsf_nm: z.string().optional().describe("[일반손해] 목적물구분명"),

      // 자동차보험 (auto_contract / auto_los_circumstance)
      isu_cmpy_ofr_ym: z.string().optional().describe("[자동차] 보험사 제공 연월 YYYYMM"),
      begin_isu_cmpy_ofr_ym: z.string().optional().describe("[자동차] 제공 연월 시작"),
      end_isu_cmpy_ofr_ym: z.string().optional().describe("[자동차] 제공 연월 종료"),
      isu_itms_nm: z.string().optional().describe("[자동차] 보험종목명"),
      sex_nm: z.string().optional().describe("[자동차] 성별명"),
      aggr: z.string().optional().describe("[자동차] 연령대"),
      atmb_plor_nm: z.string().optional().describe("[자동차] 자동차소유자명 (개인/법인)"),
      kncr_nm: z.string().optional().describe("[자동차] 차종명"),

      // 자동차 피해자 정보 (auto_victim)
      atmb_acdn_cnls_ym: z.string().optional().describe("[피해자] 자동차사고 집계 연월 YYYYMM"),
      begin_atmb_acdn_cnls_ym: z.string().optional().describe("[피해자] 집계 연월 시작"),
      end_atmb_acdn_cnls_ym: z.string().optional().describe("[피해자] 집계 연월 종료"),
      dth_inj_clsf_nm: z.string().optional().describe("[피해자] 사망/부상 구분명"),
      imp_yn: z.string().optional().describe("[피해자] 과실여부 (Y/N)"),
      inj_lvlcnt_cd: z.string().optional().describe("[피해자] 부상등급코드"),
      imp_lvlcnt_cd: z.string().optional().describe("[피해자] 과실등급코드"),

      // 변액보험·퇴직연금 펀드 공통 (variable_insurance_fund / retirement_pension_fund)
      like_cmpy_nm: z.string().optional().describe("[변액/퇴직연금] 회사명 부분 일치"),
      fnd_nm: z.string().optional().describe("[변액/퇴직연금] 펀드명 (정확히 일치)"),
      like_fnd_nm: z.string().optional().describe("[변액/퇴직연금] 펀드명 부분 일치"),
      fnd_cd: z.string().optional().describe("[변액/퇴직연금] 펀드코드"),
      like_bas_dt: z.string().optional().describe("[변액/퇴직연금] 기준일자 부분 일치"),
      begin_basprc: z.string().optional().describe("[퇴직연금] 기준가 이상"),
      end_basprc: z.string().optional().describe("[퇴직연금] 기준가 미만"),

      // 생명보험 가입현황 (life_insu_join_status)
      area_nm: z.string().optional().describe("[생명/가입현황] 지역명"),
      rchn_aggr: z.string().optional().describe("[생명/개인연금] 도달연령대"),
      isu_kind_nm: z.string().optional().describe("[생명/가입현황] 보험종류명"),

      // 개인연금보험 가입정보 (individual_annuity_insu)
      tax_prql_yn: z.string().optional().describe("[개인연금] 세제적격여부 (Y/N)"),
      pymt_mth_nm: z.string().optional().describe("[개인연금] 납입방법명"),
      offr_ty_nm: z.string().optional().describe("[개인연금] 모집형태명"),
      yer_unit_pymt_term: z.string().optional().describe("[개인연금] 년단위납입기간"),
    },
    async (params) => handler(params as InsuranceParams),
  );
}
