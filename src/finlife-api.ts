/**
 * 금융감독원 금융상품통합비교공시 (FINLIFE) API 클라이언트
 * https://finlife.fss.or.kr/finlife/api/fncCoApi/list.do
 *
 * 7종 API 제공:
 *   1. 금융회사          /finlifeapi/companySearch.json
 *   2. 정기예금          /finlifeapi/depositProductsSearch.json
 *   3. 적금              /finlifeapi/savingProductsSearch.json
 *   4. 연금저축          /finlifeapi/annuitySavingProductsSearch.json
 *   5. 주택담보대출      /finlifeapi/mortgageLoanProductsSearch.json
 *   6. 전세자금대출      /finlifeapi/rentHouseLoanProductsSearch.json
 *   7. 개인신용대출      /finlifeapi/creditLoanProductsSearch.json
 *
 * 공통 쿼리 파라미터:
 *   auth          : API 인증키 (FINLIFE_API_KEY). 끝에 `@content2@` 등 마커가 붙은
 *                   샘플 포맷을 방어적으로 정리.
 *   topFinGrpNo   : 6자리 권역코드 (020000:은행, 030200:여신전문,
 *                   030300:저축은행, 050000:보험, 060000:금융투자)
 *   pageNo        : 페이지 번호 (기본 1)
 *
 * 공통 응답 구조:
 *   { result: { err_cd, err_msg, total_count, max_page_no, now_page_no, baseList, optionList } }
 *   err_cd === "000" 이 성공
 *
 * 주의: FINLIFE 서버는 User-Agent 헤더가 없으면 빈 응답을 반환하므로 반드시 전달.
 */

import { fetchWithRetry } from "./http-client.js";
import type {
  FinlifeSearchParams,
  FinlifeCompanyResponse,
  FinlifeDepositResponse,
  FinlifeSavingResponse,
  FinlifeAnnuityResponse,
  FinlifeMortgageResponse,
  FinlifeRentLoanResponse,
  FinlifeCreditLoanResponse,
  FinlifeCompanyBase,
  FinlifeCompanyOption,
  FinlifeDepositBase,
  FinlifeDepositOption,
  FinlifeSavingBase,
  FinlifeSavingOption,
  FinlifeAnnuityBase,
  FinlifeAnnuityOption,
  FinlifeMortgageBase,
  FinlifeMortgageOption,
  FinlifeRentLoanBase,
  FinlifeRentLoanOption,
  FinlifeCreditLoanBase,
  FinlifeCreditLoanOption,
} from "./finlife-types.js";

const FINLIFE_BASE_URL = "https://finlife.fss.or.kr/finlifeapi";
const TIMEOUT_MS = 15000;
const MAX_RETRIES = 2;
const USER_AGENT = "Mozilla/5.0 (KoreanPublicDataMCP)";

// ---------------------------------------------------------------------------
// 공통 요청 빌더
// ---------------------------------------------------------------------------

/**
 * .env 등에서 들어온 원시 키에서 `@...@` 같은 마커 접미사를 제거.
 * FINLIFE 포털은 샘플 키를 `8b3852b0...@content2@` 형태로 표시하기 때문에
 * 사용자가 그대로 붙여넣는 경우가 많음.
 */
function sanitizeKey(apiKey: string): string {
  return apiKey.split("@")[0].trim();
}

/** 공통 요청 URL 생성 */
function buildUrl(
  apiKey: string,
  endpoint: string,
  params: FinlifeSearchParams,
): string {
  const qp = new URLSearchParams();
  qp.set("auth", sanitizeKey(apiKey));
  qp.set("topFinGrpNo", params.topFinGrpNo);
  qp.set("pageNo", String(params.pageNo ?? 1));
  if (params.finCoNo) qp.set("finCoNo", params.finCoNo);
  return `${FINLIFE_BASE_URL}/${endpoint}?${qp.toString()}`;
}

/** 공통 GET + JSON 파싱 + 에러 변환 */
async function getJson<T>(url: string, label: string): Promise<T> {
  let response: Response;
  try {
    response = await fetchWithRetry(url, {
      timeoutMs: TIMEOUT_MS,
      maxRetries: MAX_RETRIES,
      init: { headers: { "User-Agent": USER_AGENT } },
    });
  } catch (e) {
    throw new Error(
      `${label} API 연결 실패: ${e instanceof Error ? e.message : "네트워크 오류"}`,
    );
  }

  if (!response.ok) {
    throw new Error(`${label} API HTTP 오류: ${response.status}`);
  }

  const json = (await response.json()) as T & {
    result?: { err_cd?: string; err_msg?: string };
  };

  const errCd = json.result?.err_cd;
  if (errCd && errCd !== "000") {
    throw new Error(
      `${label} API 오류 (${errCd}): ${json.result?.err_msg ?? "알 수 없는 오류"}`,
    );
  }

  return json;
}

// ---------------------------------------------------------------------------
// 공통 결과 래퍼
// ---------------------------------------------------------------------------

export interface FinlifeFetchResult<B, O> {
  baseList: B[];
  optionList: O[];
  totalCount: number;
  nowPageNo: number;
  maxPageNo: number;
}

function unwrap<B, O>(
  json: { result: { baseList?: B[]; optionList?: O[]; total_count: number; now_page_no: number; max_page_no: number } },
): FinlifeFetchResult<B, O> {
  return {
    baseList: json.result.baseList ?? [],
    optionList: json.result.optionList ?? [],
    totalCount: json.result.total_count ?? 0,
    nowPageNo: json.result.now_page_no ?? 1,
    maxPageNo: json.result.max_page_no ?? 1,
  };
}

// ---------------------------------------------------------------------------
// 1. 금융회사
// ---------------------------------------------------------------------------

export async function fetchCompanies(
  apiKey: string,
  params: FinlifeSearchParams,
): Promise<FinlifeFetchResult<FinlifeCompanyBase, FinlifeCompanyOption>> {
  const url = buildUrl(apiKey, "companySearch.json", params);
  const json = await getJson<FinlifeCompanyResponse>(url, "금융회사");
  return unwrap(json);
}

// ---------------------------------------------------------------------------
// 2. 정기예금
// ---------------------------------------------------------------------------

export async function fetchDepositProducts(
  apiKey: string,
  params: FinlifeSearchParams,
): Promise<FinlifeFetchResult<FinlifeDepositBase, FinlifeDepositOption>> {
  const url = buildUrl(apiKey, "depositProductsSearch.json", params);
  const json = await getJson<FinlifeDepositResponse>(url, "정기예금");
  return unwrap(json);
}

// ---------------------------------------------------------------------------
// 3. 적금
// ---------------------------------------------------------------------------

export async function fetchSavingProducts(
  apiKey: string,
  params: FinlifeSearchParams,
): Promise<FinlifeFetchResult<FinlifeSavingBase, FinlifeSavingOption>> {
  const url = buildUrl(apiKey, "savingProductsSearch.json", params);
  const json = await getJson<FinlifeSavingResponse>(url, "적금");
  return unwrap(json);
}

// ---------------------------------------------------------------------------
// 4. 연금저축
// ---------------------------------------------------------------------------

export async function fetchAnnuityProducts(
  apiKey: string,
  params: FinlifeSearchParams,
): Promise<FinlifeFetchResult<FinlifeAnnuityBase, FinlifeAnnuityOption>> {
  const url = buildUrl(apiKey, "annuitySavingProductsSearch.json", params);
  const json = await getJson<FinlifeAnnuityResponse>(url, "연금저축");
  return unwrap(json);
}

// ---------------------------------------------------------------------------
// 5. 주택담보대출
// ---------------------------------------------------------------------------

export async function fetchMortgageLoanProducts(
  apiKey: string,
  params: FinlifeSearchParams,
): Promise<FinlifeFetchResult<FinlifeMortgageBase, FinlifeMortgageOption>> {
  const url = buildUrl(apiKey, "mortgageLoanProductsSearch.json", params);
  const json = await getJson<FinlifeMortgageResponse>(url, "주택담보대출");
  return unwrap(json);
}

// ---------------------------------------------------------------------------
// 6. 전세자금대출
// ---------------------------------------------------------------------------

export async function fetchRentHouseLoanProducts(
  apiKey: string,
  params: FinlifeSearchParams,
): Promise<FinlifeFetchResult<FinlifeRentLoanBase, FinlifeRentLoanOption>> {
  const url = buildUrl(apiKey, "rentHouseLoanProductsSearch.json", params);
  const json = await getJson<FinlifeRentLoanResponse>(url, "전세자금대출");
  return unwrap(json);
}

// ---------------------------------------------------------------------------
// 7. 개인신용대출
// ---------------------------------------------------------------------------

export async function fetchCreditLoanProducts(
  apiKey: string,
  params: FinlifeSearchParams,
): Promise<FinlifeFetchResult<FinlifeCreditLoanBase, FinlifeCreditLoanOption>> {
  const url = buildUrl(apiKey, "creditLoanProductsSearch.json", params);
  const json = await getJson<FinlifeCreditLoanResponse>(url, "개인신용대출");
  return unwrap(json);
}
