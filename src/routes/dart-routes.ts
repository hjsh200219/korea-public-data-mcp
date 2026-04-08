/**
 * DART 전자공시 REST API 라우트 (/dart/*)
 */

import type { Router } from "express";
import { z } from "zod";
import { handle } from "./route-helpers.js";
import { validateQuery } from "./_validation.js";
import {
  resolveCorpCode,
  searchDisclosures,
  getCompanyInfo,
  getFinancialStatements,
  getKeyAccounts,
  getDisclosureDocument,
} from "../dart-api.js";

const corpCodeSchema = z.object({
  corp_name: z.string().min(1, "회사명을 입력해주세요"),
});

const disclosureSchema = z.object({
  corp_code: z.string().optional(),
  bgn_de: z.string().regex(/^\d{8}$/, "시작일은 YYYYMMDD 형식이어야 합니다").optional(),
  end_de: z.string().regex(/^\d{8}$/, "종료일은 YYYYMMDD 형식이어야 합니다").optional(),
  pblntf_ty: z.string().optional(),
  page_no: z.coerce.number().int().positive().optional().default(1),
  page_count: z.coerce.number().int().positive().optional().default(20),
});

const companySchema = z.object({
  corp_code: z.string().min(1, "DART 고유번호(corp_code)를 입력해주세요"),
});

const financialsSchema = z.object({
  corp_code: z.string().min(1, "DART 고유번호(corp_code)를 입력해주세요"),
  bsns_year: z.string().regex(/^\d{4}$/, "사업연도는 YYYY 형식이어야 합니다"),
  reprt_code: z.enum(["11013", "11012", "11014", "11011"]).optional().default("11011"),
  fs_div: z.enum(["OFS", "CFS"]).optional().default("CFS"),
});

const keyAccountsSchema = z.object({
  corp_code: z.string().min(1, "DART 고유번호(corp_code)를 입력해주세요"),
  bsns_year: z.string().regex(/^\d{4}$/, "사업연도는 YYYY 형식이어야 합니다"),
  reprt_code: z.enum(["11013", "11012", "11014", "11011"]).optional().default("11011"),
});

const documentSchema = z.object({
  rcept_no: z.string().min(1, "접수번호(rcept_no)를 입력해주세요"),
});

export function registerDartRoutes(router: Router, dartKey: string): void {
  router.get("/dart/corp-code", validateQuery(corpCodeSchema), handle(async (req) => {
    const q = req.query as unknown as z.infer<typeof corpCodeSchema>;
    return resolveCorpCode(dartKey, q.corp_name);
  }));

  router.get("/dart/disclosures", validateQuery(disclosureSchema), handle(async (req) => {
    const q = req.query as unknown as z.infer<typeof disclosureSchema>;
    return searchDisclosures(dartKey, {
      corp_code: q.corp_code,
      bgn_de: q.bgn_de,
      end_de: q.end_de,
      pblntf_ty: q.pblntf_ty,
      page_no: q.page_no,
      page_count: q.page_count,
    });
  }));

  router.get("/dart/company", validateQuery(companySchema), handle(async (req) => {
    const q = req.query as unknown as z.infer<typeof companySchema>;
    return getCompanyInfo(dartKey, q.corp_code);
  }));

  router.get("/dart/financials", validateQuery(financialsSchema), handle(async (req) => {
    const q = req.query as unknown as z.infer<typeof financialsSchema>;
    return getFinancialStatements(dartKey, {
      corp_code: q.corp_code,
      bsns_year: q.bsns_year,
      reprt_code: q.reprt_code,
      fs_div: q.fs_div,
    });
  }));

  router.get("/dart/key-accounts", validateQuery(keyAccountsSchema), handle(async (req) => {
    const q = req.query as unknown as z.infer<typeof keyAccountsSchema>;
    return getKeyAccounts(dartKey, {
      corp_code: q.corp_code,
      bsns_year: q.bsns_year,
      reprt_code: q.reprt_code,
    });
  }));

  router.get("/dart/document", validateQuery(documentSchema), handle(async (req) => {
    const q = req.query as unknown as z.infer<typeof documentSchema>;
    return getDisclosureDocument(dartKey, q.rcept_no);
  }));
}
