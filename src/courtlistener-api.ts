/**
 * CourtListener REST API v4 클라이언트 — 미국 판례
 * https://www.courtlistener.com/api/rest/v4/
 *
 * - 토큰 제공 시 Authorization: Token <token> 헤더 추가 (시간당 5,000건)
 * - 호출별 200ms throttle (다른 클라이언트 throttleMs 미사용 → 안전)
 * - 429 시 한도 안내 한글 에러로 변환
 */

import { fetchWithRetry } from "./http-client.js";
import type {
  SearchUSCasesParams,
  USCaseDetail,
  USCaseSearchResult,
} from "./courtlistener-types.js";

const COURTLISTENER_BASE_URL = "https://www.courtlistener.com/api/rest/v4";
const COURTLISTENER_THROTTLE_MS = 200;

function buildHeaders(token?: string): Record<string, string> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (token) headers["Authorization"] = `Token ${token}`;
  return headers;
}

async function callCourtListener<T>(
  url: string,
  token?: string,
): Promise<T> {
  const response = await fetchWithRetry(url, {
    init: { method: "GET", headers: buildHeaders(token) },
    throttleMs: COURTLISTENER_THROTTLE_MS,
    timeoutMs: 15000,
  });

  if (response.status === 429) {
    throw new Error(
      "CourtListener API 시간당 요청 한도(5,000건)에 도달했습니다. 잠시 후 다시 시도해 주세요.",
    );
  }

  if (!response.ok) {
    let detail = "";
    try {
      detail = await response.text();
    } catch {
      // 본문 읽기 실패는 무시 (HTTP 상태만으로 충분한 정보 제공)
    }
    throw new Error(
      `CourtListener API 오류 (HTTP ${response.status})${detail ? `: ${detail.substring(0, 200)}` : ""}`,
    );
  }

  return (await response.json()) as T;
}

function buildSearchUrl(params: SearchUSCasesParams): string {
  const qs = new URLSearchParams();
  qs.set("q", params.query);
  qs.set("type", "o");
  if (params.court) qs.set("court", params.court);
  if (params.dateFiledAfter) qs.set("filed_after", params.dateFiledAfter);
  if (params.dateFiledBefore) qs.set("filed_before", params.dateFiledBefore);
  if (params.page !== undefined) qs.set("page", String(params.page));
  if (params.pageSize !== undefined)
    qs.set("page_size", String(params.pageSize));
  return `${COURTLISTENER_BASE_URL}/search/?${qs.toString()}`;
}

/** 미국 판례(opinion cluster) 검색 */
export async function searchUSCases(
  params: SearchUSCasesParams,
  token?: string,
): Promise<USCaseSearchResult> {
  return callCourtListener<USCaseSearchResult>(buildSearchUrl(params), token);
}

/** 미국 판례 상세 (opinion ID) */
export async function getUSCaseDetail(
  opinionId: string,
  token?: string,
): Promise<USCaseDetail> {
  const url = `${COURTLISTENER_BASE_URL}/opinions/${encodeURIComponent(opinionId)}/`;
  return callCourtListener<USCaseDetail>(url, token);
}
