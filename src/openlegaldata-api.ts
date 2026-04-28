/**
 * OpenLegalData API 클라이언트 — 독일 판례
 * https://de.openlegaldata.io/api/
 *
 * - 익명 접근 허용; 토큰 제공 시 Authorization: Token 헤더 부여
 * - throttle 없음 (문서화된 한도 없음)
 */

import { fetchWithRetry } from "./http-client.js";
import type {
  DECaseDetail,
  DECaseSearchResult,
  SearchDECasesParams,
} from "./openlegaldata-types.js";

const OPENLEGALDATA_BASE_URL = "https://de.openlegaldata.io/api";

function buildHeaders(token?: string): Record<string, string> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (token) headers["Authorization"] = `Token ${token}`;
  return headers;
}

async function callOpenLegalData<T>(
  url: string,
  token?: string,
): Promise<T> {
  const response = await fetchWithRetry(url, {
    init: { method: "GET", headers: buildHeaders(token) },
    timeoutMs: 15000,
  });

  if (!response.ok) {
    let detail = "";
    try {
      detail = await response.text();
    } catch {
      // 본문 읽기 실패는 무시
    }
    throw new Error(
      `OpenLegalData API 오류 (HTTP ${response.status})${detail ? `: ${detail.substring(0, 200)}` : ""}`,
    );
  }

  return (await response.json()) as T;
}

function buildSearchUrl(params: SearchDECasesParams): string {
  const qs = new URLSearchParams();
  qs.set("search", params.query);
  if (params.court) qs.set("court", params.court);
  if (params.dateFrom) qs.set("date_after", params.dateFrom);
  if (params.dateTo) qs.set("date_before", params.dateTo);
  if (params.page !== undefined) qs.set("page", String(params.page));
  if (params.pageSize !== undefined)
    qs.set("page_size", String(params.pageSize));
  return `${OPENLEGALDATA_BASE_URL}/cases/?${qs.toString()}`;
}

/** 독일 판례 검색 */
export async function searchDECases(
  params: SearchDECasesParams,
  token?: string,
): Promise<DECaseSearchResult> {
  return callOpenLegalData<DECaseSearchResult>(buildSearchUrl(params), token);
}

/** 독일 판례 상세 (case ID) */
export async function getDECaseDetail(
  caseId: string,
  token?: string,
): Promise<DECaseDetail> {
  const url = `${OPENLEGALDATA_BASE_URL}/cases/${encodeURIComponent(caseId)}/`;
  return callOpenLegalData<DECaseDetail>(url, token);
}
