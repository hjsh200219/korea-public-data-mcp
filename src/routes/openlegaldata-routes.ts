/**
 * OpenLegalData REST API 라우트 (/api/openlegaldata/*) — 독일 판례
 */

import type { Router } from "express";
import { handle } from "./route-helpers.js";
import { searchDECases, getDECaseDetail } from "../openlegaldata-api.js";

export function registerOpenlegalDataRoutes(
  router: Router,
  token?: string,
): void {
  router.get(
    "/openlegaldata/search",
    handle(async (req) => {
      const q = req.query.q ? String(req.query.q) : "";
      if (!q) {
        const err = new Error("q (검색어) 파라미터가 필요합니다.");
        (err as Error & { status?: number }).status = 400;
        throw err;
      }
      const params = {
        query: q,
        court: req.query.court ? String(req.query.court) : undefined,
        page: req.query.page ? Number(req.query.page) : undefined,
        pageSize: req.query.page_size ? Number(req.query.page_size) : undefined,
        dateFrom: req.query.date_after
          ? String(req.query.date_after)
          : undefined,
        dateTo: req.query.date_before
          ? String(req.query.date_before)
          : undefined,
      };
      return await searchDECases(params, token);
    }),
  );

  router.get(
    "/openlegaldata/cases/:caseId",
    handle(async (req) => {
      const caseId = String(req.params.caseId);
      return await getDECaseDetail(caseId, token);
    }),
  );
}
