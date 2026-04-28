/**
 * CourtListener REST API 라우트 (/api/courtlistener/*) — 미국 판례
 */

import type { Router } from "express";
import { handle } from "./route-helpers.js";
import { searchUSCases, getUSCaseDetail } from "../courtlistener-api.js";

export function registerCourtlistenerRoutes(
  router: Router,
  token?: string,
): void {
  router.get(
    "/courtlistener/search",
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
        dateFiledAfter: req.query.filed_after
          ? String(req.query.filed_after)
          : undefined,
        dateFiledBefore: req.query.filed_before
          ? String(req.query.filed_before)
          : undefined,
      };
      return await searchUSCases(params, token);
    }),
  );

  router.get(
    "/courtlistener/opinions/:opinionId",
    handle(async (req) => {
      const opinionId = String(req.params.opinionId);
      return await getUSCaseDetail(opinionId, token);
    }),
  );
}
