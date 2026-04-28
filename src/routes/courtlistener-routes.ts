/**
 * CourtListener REST API 라우트 (/api/courtlistener/*) — 미국 판례
 *
 * - GET /search                  → Opinion 검색 (cursor 페이지네이션, 정규화 응답)
 * - GET /opinions/:opinionId     → Opinion 상세 (includeCluster=true; full text)
 * - GET /clusters/:clusterId     → Cluster 메타 + 인용/서브 의견
 * - GET /courts                  → 법원 목록 (jurisdiction 필터)
 *
 * 쿼리 파라미터: 프로젝트 공통 컨벤션 (q=검색어, kebab/snake 혼용 가능).
 * 응답: courtlistener-types.ts 의 정규화 도메인 타입 (camelCase).
 */

import type { Router } from "express";
import { handle } from "./route-helpers.js";
import { createCourtListenerClient } from "../courtlistener-api.js";
import {
  JURISDICTION_VALUES,
  PRECEDENTIAL_STATUS_VALUES,
  type Jurisdiction,
  type PrecedentialStatus,
} from "../courtlistener-types.js";

function badRequest(message: string): Error {
  const err = new Error(message);
  (err as Error & { status?: number }).status = 400;
  return err;
}

function pickJurisdiction(value: unknown): Jurisdiction | undefined {
  if (typeof value !== "string") return undefined;
  return (JURISDICTION_VALUES as readonly string[]).includes(value)
    ? (value as Jurisdiction)
    : undefined;
}

function pickPrecedentialStatus(value: unknown): PrecedentialStatus | undefined {
  if (typeof value !== "string") return undefined;
  return (PRECEDENTIAL_STATUS_VALUES as readonly string[]).includes(value)
    ? (value as PrecedentialStatus)
    : undefined;
}

export function registerCourtlistenerRoutes(
  router: Router,
  token?: string,
): void {
  const client = createCourtListenerClient({ token });

  router.get(
    "/courtlistener/search",
    handle(async (req) => {
      const q = req.query.q ? String(req.query.q) : "";
      if (!q) throw badRequest("q (검색어) 파라미터가 필요합니다.");

      return client.searchOpinions({
        query: q,
        cursor: req.query.cursor ? String(req.query.cursor) : undefined,
        pageSize: req.query.page_size ? Number(req.query.page_size) : undefined,
        jurisdiction: pickJurisdiction(req.query.jurisdiction),
        court: req.query.court ? String(req.query.court) : undefined,
        dateFrom: req.query.filed_after
          ? String(req.query.filed_after)
          : undefined,
        dateTo: req.query.filed_before
          ? String(req.query.filed_before)
          : undefined,
        precedentialStatus: pickPrecedentialStatus(
          req.query.precedential_status,
        ),
      });
    }),
  );

  router.get(
    "/courtlistener/opinions/:opinionId",
    handle(async (req) => {
      const id = parseInt(String(req.params.opinionId ?? ""), 10);
      if (Number.isNaN(id) || id <= 0) {
        throw badRequest("opinionId는 양의 정수여야 합니다.");
      }
      return client.getOpinion(id, { includeCluster: true });
    }),
  );

  router.get(
    "/courtlistener/clusters/:clusterId",
    handle(async (req) => {
      const id = parseInt(String(req.params.clusterId ?? ""), 10);
      if (Number.isNaN(id) || id <= 0) {
        throw badRequest("clusterId는 양의 정수여야 합니다.");
      }
      return client.getCluster(id);
    }),
  );

  router.get(
    "/courtlistener/courts",
    handle(async (req) => {
      const jurisdiction = req.query.jurisdiction
        ? String(req.query.jurisdiction)
        : undefined;
      return client.listCourts(jurisdiction);
    }),
  );
}
