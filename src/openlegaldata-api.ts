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

/**
 * 연방법원 코드 — OpenLegalData court 필터는 대소문자를 구분한다(BVerfG 103건 / BVERFG·bverfg 0건, 2026-10-19 실측).
 * 소문자 슬러그("bgh")로 들어와도 맞는 코드로 바꾸고, 그 밖의 코드는 그대로 넘긴다.
 */
const FEDERAL_COURT_CODES = new Map(
  ["BAG", "BFH", "BGH", "BPatG", "BSG", "BVerfG", "BVerwG"].map((c) => [
    c.toLowerCase(),
    c,
  ]),
);

function normalizeCourtCode(court: string): string {
  const trimmed = court.trim();
  return FEDERAL_COURT_CODES.get(trimmed.toLowerCase()) ?? trimmed;
}

/**
 * 본문 검색 경로(/cases/search/?text=)를 쓴다.
 * /cases/?search= 는 검색어를 무시하고 전체(42만여 건)를 돌려주고 court 에 숫자 ID 만 받는다(2026-10-15 실측).
 * 날짜 필터 이름도 start_date/end_date 다 — date_after/date_before 는 조용히 무시된다.
 */
function buildSearchUrl(params: SearchDECasesParams): string {
  const qs = new URLSearchParams();
  qs.set("text", params.query);
  if (params.court) qs.set("court", normalizeCourtCode(params.court));
  if (params.courtLevel) qs.set("court_level_of_appeal", params.courtLevel.trim());
  if (params.dateFrom) qs.set("start_date", params.dateFrom);
  if (params.dateTo) qs.set("end_date", params.dateTo);
  if (params.page !== undefined) qs.set("page", String(params.page));
  if (params.pageSize !== undefined)
    qs.set("page_size", String(params.pageSize));
  return `${OPENLEGALDATA_BASE_URL}/cases/search/?${qs.toString()}`;
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
