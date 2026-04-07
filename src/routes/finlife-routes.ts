/**
 * 금융감독원 FINLIFE REST API 라우트 (/finlife/*)
 */

import type { Router } from "express";
import { handle } from "./route-helpers.js";
import {
  fetchCompanies,
  fetchDepositProducts,
  fetchSavingProducts,
  fetchAnnuityProducts,
  fetchMortgageLoanProducts,
  fetchRentHouseLoanProducts,
  fetchCreditLoanProducts,
} from "../finlife-api.js";
import type { TopFinGrpNo, FinlifeSearchParams } from "../finlife-types.js";

const VALID_GRP: ReadonlySet<TopFinGrpNo> = new Set([
  "020000",
  "030200",
  "030300",
  "050000",
  "060000",
]);

function parseParams(q: Record<string, unknown>): FinlifeSearchParams {
  const topFinGrpNo = String(q.top_fin_grp_no || "") as TopFinGrpNo;
  if (!topFinGrpNo || !VALID_GRP.has(topFinGrpNo)) {
    throw new Error(
      "top_fin_grp_no 파라미터가 필요합니다. (020000=은행, 030200=여신전문, 030300=저축은행, 050000=보험, 060000=금융투자)",
    );
  }
  return {
    topFinGrpNo,
    pageNo: q.page_no ? Number(q.page_no) : undefined,
    finCoNo: q.fin_co_no ? String(q.fin_co_no) : undefined,
  };
}

export function registerFinlifeRoutes(router: Router, finlifeKey: string): void {
  router.get("/finlife/companies", handle(async (req) => {
    return fetchCompanies(finlifeKey, parseParams(req.query as Record<string, unknown>));
  }));

  router.get("/finlife/deposits", handle(async (req) => {
    return fetchDepositProducts(finlifeKey, parseParams(req.query as Record<string, unknown>));
  }));

  router.get("/finlife/savings", handle(async (req) => {
    return fetchSavingProducts(finlifeKey, parseParams(req.query as Record<string, unknown>));
  }));

  router.get("/finlife/annuities", handle(async (req) => {
    return fetchAnnuityProducts(finlifeKey, parseParams(req.query as Record<string, unknown>));
  }));

  router.get("/finlife/mortgage-loans", handle(async (req) => {
    return fetchMortgageLoanProducts(finlifeKey, parseParams(req.query as Record<string, unknown>));
  }));

  router.get("/finlife/rent-house-loans", handle(async (req) => {
    return fetchRentHouseLoanProducts(finlifeKey, parseParams(req.query as Record<string, unknown>));
  }));

  router.get("/finlife/credit-loans", handle(async (req) => {
    return fetchCreditLoanProducts(finlifeKey, parseParams(req.query as Record<string, unknown>));
  }));
}
