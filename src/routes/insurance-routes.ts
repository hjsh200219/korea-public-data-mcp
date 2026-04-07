/**
 * 금융위원회 보험상품 공시 REST API 라우트 (/insurance/*)
 *
 * 9종 오퍼레이션:
 *   GET /insurance/medical-reimbursement     실손보험정보
 *   GET /insurance/property-insu-join        일반손해보험 가입정보
 *   GET /insurance/auto-contract             자동차보험 계약정보
 *   GET /insurance/auto-los-circumstance     자동차보험 사고현황
 *   GET /insurance/auto-victim               자동차보험 피해자 정보
 *   GET /insurance/variable-insurance-fund   변액보험 펀드정보
 *   GET /insurance/life-insu-join-status     생명보험 가입현황
 *   GET /insurance/individual-annuity-insu   개인연금보험 가입정보
 *   GET /insurance/retirement-pension-fund   퇴직연금 펀드정보
 */

import type { Router } from "express";
import { handle } from "./route-helpers.js";
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
} from "../insurance-api.js";

function str(v: unknown): string | undefined {
  return v == null || v === "" ? undefined : String(v);
}

function intOr(v: unknown): number | undefined {
  if (v == null || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

export function registerInsuranceRoutes(router: Router, serviceKey: string): void {
  router.get(
    "/insurance/medical-reimbursement",
    handle(async (req) => {
      const q = req.query as Record<string, unknown>;
      return searchMedicalReimbursementInsurance(serviceKey, {
        basDt: str(q.bas_dt),
        beginBasDt: str(q.begin_bas_dt),
        endBasDt: str(q.end_bas_dt),
        cmpyCd: str(q.cmpy_cd),
        cmpyNm: str(q.cmpy_nm),
        ptrn: str(q.ptrn),
        mog: str(q.mog),
        prdNm: str(q.prd_nm),
        likePrdNm: str(q.like_prd_nm),
        age: str(q.age),
        ofrInstNm: str(q.ofr_inst_nm),
        pageNo: intOr(q.page_no),
        numOfRows: intOr(q.num_of_rows),
      });
    }),
  );

  router.get(
    "/insurance/property-insu-join",
    handle(async (req) => {
      const q = req.query as Record<string, unknown>;
      return searchPropertyInsuJoin(serviceKey, {
        sttsAccmlTrgtYr: str(q.stts_accml_trgt_yr),
        likeSttsAccmlTrgtYr: str(q.like_stts_accml_trgt_yr),
        beginSttsAccmlTrgtYr: str(q.begin_stts_accml_trgt_yr),
        endSttsAccmlTrgtYr: str(q.end_stts_accml_trgt_yr),
        mogClsfNm: str(q.mog_clsf_nm),
        objcClsfNm: str(q.objc_clsf_nm),
        pageNo: intOr(q.page_no),
        numOfRows: intOr(q.num_of_rows),
      });
    }),
  );

  router.get(
    "/insurance/auto-contract",
    handle(async (req) => {
      const q = req.query as Record<string, unknown>;
      return searchAutoContract(serviceKey, {
        isuCmpyOfrYm: str(q.isu_cmpy_ofr_ym),
        beginIsuCmpyOfrYm: str(q.begin_isu_cmpy_ofr_ym),
        endIsuCmpyOfrYm: str(q.end_isu_cmpy_ofr_ym),
        isuItmsNm: str(q.isu_itms_nm),
        mogClsfNm: str(q.mog_clsf_nm),
        sexNm: str(q.sex_nm),
        aggr: str(q.aggr),
        atmbPlorNm: str(q.atmb_plor_nm),
        kncrNm: str(q.kncr_nm),
        pageNo: intOr(q.page_no),
        numOfRows: intOr(q.num_of_rows),
      });
    }),
  );

  router.get(
    "/insurance/auto-los-circumstance",
    handle(async (req) => {
      const q = req.query as Record<string, unknown>;
      return searchAutoLosCircumstance(serviceKey, {
        isuCmpyOfrYm: str(q.isu_cmpy_ofr_ym),
        beginIsuCmpyOfrYm: str(q.begin_isu_cmpy_ofr_ym),
        endIsuCmpyOfrYm: str(q.end_isu_cmpy_ofr_ym),
        isuItmsNm: str(q.isu_itms_nm),
        mogClsfNm: str(q.mog_clsf_nm),
        kncrNm: str(q.kncr_nm),
        pageNo: intOr(q.page_no),
        numOfRows: intOr(q.num_of_rows),
      });
    }),
  );

  router.get(
    "/insurance/auto-victim",
    handle(async (req) => {
      const q = req.query as Record<string, unknown>;
      return searchAutoVictim(serviceKey, {
        atmbAcdnCnlsYm: str(q.atmb_acdn_cnls_ym),
        beginAtmbAcdnCnlsYm: str(q.begin_atmb_acdn_cnls_ym),
        endAtmbAcdnCnlsYm: str(q.end_atmb_acdn_cnls_ym),
        dthInjClsfNm: str(q.dth_inj_clsf_nm),
        impYn: str(q.imp_yn),
        injLvlcntCd: str(q.inj_lvlcnt_cd),
        impLvlcntCd: str(q.imp_lvlcnt_cd),
        pageNo: intOr(q.page_no),
        numOfRows: intOr(q.num_of_rows),
      });
    }),
  );

  router.get(
    "/insurance/variable-insurance-fund",
    handle(async (req) => {
      const q = req.query as Record<string, unknown>;
      return searchVariableInsuranceFund(serviceKey, {
        cmpyCd: str(q.cmpy_cd),
        cmpyNm: str(q.cmpy_nm),
        likeCmpyNm: str(q.like_cmpy_nm),
        fndNm: str(q.fnd_nm),
        likeFndNm: str(q.like_fnd_nm),
        fndCd: str(q.fnd_cd),
        basDt: str(q.bas_dt),
        beginBasDt: str(q.begin_bas_dt),
        endBasDt: str(q.end_bas_dt),
        likeBasDt: str(q.like_bas_dt),
        pageNo: intOr(q.page_no),
        numOfRows: intOr(q.num_of_rows),
      });
    }),
  );

  router.get(
    "/insurance/life-insu-join-status",
    handle(async (req) => {
      const q = req.query as Record<string, unknown>;
      return searchLifeInsuJoinStatus(serviceKey, {
        sttsAccmlTrgtYr: str(q.stts_accml_trgt_yr),
        areaNm: str(q.area_nm),
        sexNm: str(q.sex_nm),
        rchnAggr: str(q.rchn_aggr),
        isuKindNm: str(q.isu_kind_nm),
        pageNo: intOr(q.page_no),
        numOfRows: intOr(q.num_of_rows),
      });
    }),
  );

  router.get(
    "/insurance/individual-annuity-insu",
    handle(async (req) => {
      const q = req.query as Record<string, unknown>;
      return searchIndividualAnnuityInsu(serviceKey, {
        sttsAccmlTrgtYr: str(q.stts_accml_trgt_yr),
        rchnAggr: str(q.rchn_aggr),
        taxPrqlYn: str(q.tax_prql_yn),
        pymtMthNm: str(q.pymt_mth_nm),
        offrTyNm: str(q.offr_ty_nm),
        yerUnitPymtTerm: str(q.yer_unit_pymt_term),
        pageNo: intOr(q.page_no),
        numOfRows: intOr(q.num_of_rows),
      });
    }),
  );

  router.get(
    "/insurance/retirement-pension-fund",
    handle(async (req) => {
      const q = req.query as Record<string, unknown>;
      return searchRetirementPensionFund(serviceKey, {
        cmpyCd: str(q.cmpy_cd),
        cmpyNm: str(q.cmpy_nm),
        likeCmpyNm: str(q.like_cmpy_nm),
        fndNm: str(q.fnd_nm),
        likeFndNm: str(q.like_fnd_nm),
        fndCd: str(q.fnd_cd),
        basDt: str(q.bas_dt),
        beginBasDt: str(q.begin_bas_dt),
        endBasDt: str(q.end_bas_dt),
        likeBasDt: str(q.like_bas_dt),
        beginBasprc: str(q.begin_basprc),
        endBasprc: str(q.end_basprc),
        ofrInstNm: str(q.ofr_inst_nm),
        pageNo: intOr(q.page_no),
        numOfRows: intOr(q.num_of_rows),
      });
    }),
  );
}
