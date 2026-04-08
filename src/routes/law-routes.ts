/**
 * 법제처 REST API 라우트 (/search/*, /detail/*)
 */

import type { Router } from "express";
import { z } from "zod";
import { handle } from "./route-helpers.js";
import { validateQuery } from "./_validation.js";
import {
  searchLaws, getLawDetail,
  searchCases, getCaseDetail,
  searchConstitutional, getConstitutionalDetail,
  searchInterpretations, getInterpretationDetail,
  searchAdminRules, getAdminRuleDetail,
  searchOrdinances, getOrdinanceDetail,
  searchTreaties, getTreatyDetail,
  searchLegalTerms, getLegalTermDetail,
  searchEnglishLaws, getEnglishLawDetail,
  searchCommitteeDecisions, getCommitteeDecisionDetail,
  searchAdminAppeals, getAdminAppealDetail,
  searchOldNewLaw, getOldNewLawDetail,
  searchLawSystem, getLawSystemDetail,
  searchThreeWayComp, getThreeWayCompDetail,
  searchAttachedForms,
  searchLawAbbreviations,
  searchLawChangeHistory,
  getLawArticleSub,
  searchAILegalTerms,
  searchLinkedOrdinances,
  searchAdminRuleOldNew, getAdminRuleOldNewDetail,
} from "../law-api.js";

// --- 공통 스키마 ---

const searchParamsSchema = z.object({
  query: z.string().min(1, "검색어를 입력해주세요"),
  page: z.coerce.number().int().positive().optional().default(1),
  display: z.coerce.number().int().positive().optional().default(20),
});

const searchTypeSchema = searchParamsSchema.extend({
  search_type: z.enum(["full_text", "title"]).optional().default("title"),
});

const caseSearchSchema = searchParamsSchema.extend({
  search_type: z.enum(["case_name", "content"]).optional().default("content"),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  court: z.string().optional(),
});

const committeeSearchSchema = searchParamsSchema.extend({
  committee: z.string().min(1, "위원회명을 입력해주세요"),
});

const attachedFormSchema = searchParamsSchema.extend({
  form_type: z.enum(["table", "form", "annex", "other", "unclassified"]).optional(),
});

const lawChangeHistorySchema = z.object({
  date: z.string().optional().default(""),
  page: z.coerce.number().int().positive().optional().default(1),
  display: z.coerce.number().int().positive().optional().default(20),
});

const articleSubSchema = z.object({
  article: z.string().min(1, "조문 번호를 입력해주세요"),
  paragraph: z.string().optional(),
  clause: z.string().optional(),
  subclause: z.string().optional(),
});

const threeWayCompQuerySchema = z.object({
  comparison_type: z.enum(["delegation", "default"]).optional().default("default"),
});

export function registerLawRoutes(router: Router, oc: string): void {
  // --- 검색 ---

  router.get("/search/laws", validateQuery(searchTypeSchema), handle(async (req) => {
    const q = req.query as unknown as z.infer<typeof searchTypeSchema>;
    return searchLaws(oc, { query: q.query, page: q.page, display: q.display, search: q.search_type === "full_text" ? 2 : 1 });
  }));

  router.get("/search/cases", validateQuery(caseSearchSchema), handle(async (req) => {
    const q = req.query as unknown as z.infer<typeof caseSearchSchema>;
    return searchCases(oc, {
      query: q.query,
      page: q.page,
      display: q.display,
      search: q.search_type === "case_name" ? 1 : 2,
      dateFrom: q.date_from,
      dateTo: q.date_to,
      court: q.court,
    });
  }));

  router.get("/search/constitutional", validateQuery(searchParamsSchema), handle(async (req) => {
    const q = req.query as unknown as z.infer<typeof searchParamsSchema>;
    return searchConstitutional(oc, { query: q.query, page: q.page, display: q.display });
  }));

  router.get("/search/interpretations", validateQuery(searchParamsSchema), handle(async (req) => {
    const q = req.query as unknown as z.infer<typeof searchParamsSchema>;
    return searchInterpretations(oc, { query: q.query, page: q.page, display: q.display });
  }));

  router.get("/search/admin-rules", validateQuery(searchParamsSchema), handle(async (req) => {
    const q = req.query as unknown as z.infer<typeof searchParamsSchema>;
    return searchAdminRules(oc, { query: q.query, page: q.page, display: q.display });
  }));

  router.get("/search/ordinances", validateQuery(searchTypeSchema), handle(async (req) => {
    const q = req.query as unknown as z.infer<typeof searchTypeSchema>;
    return searchOrdinances(oc, { query: q.query, page: q.page, display: q.display, search: q.search_type === "full_text" ? 2 : 1 });
  }));

  router.get("/search/treaties", validateQuery(searchParamsSchema), handle(async (req) => {
    const q = req.query as unknown as z.infer<typeof searchParamsSchema>;
    return searchTreaties(oc, { query: q.query, page: q.page, display: q.display });
  }));

  router.get("/search/legal-terms", validateQuery(searchParamsSchema), handle(async (req) => {
    const q = req.query as unknown as z.infer<typeof searchParamsSchema>;
    return searchLegalTerms(oc, { query: q.query, page: q.page, display: q.display });
  }));

  router.get("/search/english-laws", validateQuery(searchParamsSchema), handle(async (req) => {
    const q = req.query as unknown as z.infer<typeof searchParamsSchema>;
    return searchEnglishLaws(oc, { query: q.query, page: q.page, display: q.display });
  }));

  router.get("/search/committee-decisions", validateQuery(committeeSearchSchema), handle(async (req) => {
    const q = req.query as unknown as z.infer<typeof committeeSearchSchema>;
    return searchCommitteeDecisions(oc, q.committee, { query: q.query, page: q.page, display: q.display });
  }));

  router.get("/search/admin-appeals", validateQuery(searchParamsSchema), handle(async (req) => {
    const q = req.query as unknown as z.infer<typeof searchParamsSchema>;
    return searchAdminAppeals(oc, { query: q.query, page: q.page, display: q.display });
  }));

  router.get("/search/old-new-law", validateQuery(searchParamsSchema), handle(async (req) => {
    const q = req.query as unknown as z.infer<typeof searchParamsSchema>;
    return searchOldNewLaw(oc, { query: q.query, page: q.page, display: q.display });
  }));

  router.get("/search/law-system", validateQuery(searchParamsSchema), handle(async (req) => {
    const q = req.query as unknown as z.infer<typeof searchParamsSchema>;
    return searchLawSystem(oc, { query: q.query, page: q.page, display: q.display });
  }));

  router.get("/search/three-way-comp", validateQuery(searchParamsSchema), handle(async (req) => {
    const q = req.query as unknown as z.infer<typeof searchParamsSchema>;
    return searchThreeWayComp(oc, { query: q.query, page: q.page, display: q.display });
  }));

  router.get("/search/attached-forms", validateQuery(attachedFormSchema), handle(async (req) => {
    const q = req.query as unknown as z.infer<typeof attachedFormSchema>;
    const kndMap: Record<string, number> = { table: 1, form: 2, annex: 3, other: 4, unclassified: 5 };
    const knd = q.form_type ? kndMap[q.form_type] as 1 | 2 | 3 | 4 | 5 | undefined : undefined;
    return searchAttachedForms(oc, { query: q.query, page: q.page, display: q.display, knd });
  }));

  router.get("/search/law-abbreviations", validateQuery(searchParamsSchema), handle(async (req) => {
    const q = req.query as unknown as z.infer<typeof searchParamsSchema>;
    return searchLawAbbreviations(oc, { query: q.query, page: q.page, display: q.display });
  }));

  router.get("/search/law-change-history", validateQuery(lawChangeHistorySchema), handle(async (req) => {
    const q = req.query as unknown as z.infer<typeof lawChangeHistorySchema>;
    return searchLawChangeHistory(oc, { regDt: q.date, page: q.page, display: q.display });
  }));

  router.get("/search/ai-legal-terms", validateQuery(searchParamsSchema), handle(async (req) => {
    const q = req.query as unknown as z.infer<typeof searchParamsSchema>;
    return searchAILegalTerms(oc, { query: q.query, page: q.page, display: q.display });
  }));

  router.get("/search/linked-ordinances", validateQuery(searchParamsSchema), handle(async (req) => {
    const q = req.query as unknown as z.infer<typeof searchParamsSchema>;
    return searchLinkedOrdinances(oc, { query: q.query, page: q.page, display: q.display });
  }));

  router.get("/search/admin-rule-old-new", validateQuery(searchParamsSchema), handle(async (req) => {
    const q = req.query as unknown as z.infer<typeof searchParamsSchema>;
    return searchAdminRuleOldNew(oc, { query: q.query, page: q.page, display: q.display });
  }));

  // --- 상세조회 ---

  router.get("/detail/law/:id", handle(async (req) =>
    getLawDetail(oc, Number(req.params.id))
  ));

  router.get("/detail/case/:id", handle(async (req) =>
    getCaseDetail(oc, Number(req.params.id))
  ));

  router.get("/detail/constitutional/:id", handle(async (req) =>
    getConstitutionalDetail(oc, Number(req.params.id))
  ));

  router.get("/detail/interpretation/:id", handle(async (req) =>
    getInterpretationDetail(oc, Number(req.params.id))
  ));

  router.get("/detail/admin-rule/:id", handle(async (req) =>
    getAdminRuleDetail(oc, Number(req.params.id))
  ));

  router.get("/detail/ordinance/:id", handle(async (req) =>
    getOrdinanceDetail(oc, Number(req.params.id))
  ));

  router.get("/detail/treaty/:id", handle(async (req) =>
    getTreatyDetail(oc, Number(req.params.id))
  ));

  router.get("/detail/legal-term/:id", handle(async (req) =>
    getLegalTermDetail(oc, String(req.params.id))
  ));

  router.get("/detail/english-law/:id", handle(async (req) =>
    getEnglishLawDetail(oc, Number(req.params.id))
  ));

  router.get("/detail/committee-decision/:committee/:id", handle(async (req) =>
    getCommitteeDecisionDetail(oc, String(req.params.committee), Number(req.params.id))
  ));

  router.get("/detail/admin-appeal/:id", handle(async (req) =>
    getAdminAppealDetail(oc, Number(req.params.id))
  ));

  router.get("/detail/old-new-law/:id", handle(async (req) =>
    getOldNewLawDetail(oc, Number(req.params.id))
  ));

  router.get("/detail/law-system/:id", handle(async (req) =>
    getLawSystemDetail(oc, Number(req.params.id))
  ));

  router.get("/detail/three-way-comp/:id", validateQuery(threeWayCompQuerySchema), handle(async (req) => {
    const q = req.query as unknown as z.infer<typeof threeWayCompQuerySchema>;
    return getThreeWayCompDetail(oc, Number(req.params.id), q.comparison_type === "delegation" ? 2 : 1);
  }));

  router.get("/detail/law-article-sub/:id", validateQuery(articleSubSchema), handle(async (req) => {
    const q = req.query as unknown as z.infer<typeof articleSubSchema>;
    return getLawArticleSub(oc, {
      lawId: Number(req.params.id),
      jo: q.article,
      hang: q.paragraph,
      ho: q.clause,
      mok: q.subclause,
    });
  }));

  router.get("/detail/admin-rule-old-new/:id", handle(async (req) =>
    getAdminRuleOldNewDetail(oc, Number(req.params.id))
  ));
}
