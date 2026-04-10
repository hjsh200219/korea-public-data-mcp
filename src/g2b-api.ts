/**
 * 나라장터(G2B) 조달청 API 클라이언트
 * - BidPublicInfoService: 입찰공고정보 (물품/용역/공사/외자)
 * - ScsbidInfoService: 낙찰정보 (물품/용역/공사/외자)
 *
 * 기본 URL: https://apis.data.go.kr/1230000
 * 인증: DATA20_SERVICE_KEY (공공데이터포털 서비스키)
 */

import { fetchWithRetry } from "./http-client.js";
import type {
  G2bResponse,
  BidPublicItem,
  ScsbidItem,
  BidType,
} from "./g2b-types.js";

const BID_BASE = "https://apis.data.go.kr/1230000/ad/BidPublicInfoService";
const SCSBID_BASE = "https://apis.data.go.kr/1230000/as/ScsbidInfoService";
const TIMEOUT_MS = 15_000;
const MAX_RETRIES = 1;

const BID_ENDPOINTS: Record<BidType, string> = {
  thng: "getBidPblancListInfoThng",
  servc: "getBidPblancListInfoServc",
  cnstwk: "getBidPblancListInfoCnstwk",
  frgcpt: "getBidPblancListInfoFrgcpt",
};

const SCSBID_ENDPOINTS: Record<BidType, string> = {
  thng: "getScsbidListSttusThng",
  servc: "getScsbidListSttusServc",
  cnstwk: "getScsbidListSttusCnstwk",
  frgcpt: "getScsbidListSttusFrgcpt",
};

function buildUrl(
  base: string,
  endpoint: string,
  serviceKey: string,
  params: Record<string, string>,
): string {
  const url = new URL(`${base}/${endpoint}`);
  url.searchParams.set("serviceKey", serviceKey);
  url.searchParams.set("type", "json");
  for (const [k, v] of Object.entries(params)) {
    if (v) url.searchParams.set(k, v);
  }
  return url.toString();
}

async function fetchG2b<T>(url: string): Promise<G2bResponse<T>> {
  const res = await fetchWithRetry(url, {
    timeoutMs: TIMEOUT_MS,
    maxRetries: MAX_RETRIES,
    retryDelayMs: 1000,
  });
  if (!res.ok) {
    throw new Error(`G2B API HTTP ${res.status}`);
  }
  const data = await res.json();
  // 에러 응답 형식 처리
  if (data["nkoneps.com.response.ResponseError"]) {
    const header = data["nkoneps.com.response.ResponseError"].header;
    throw new Error(`G2B 에러 [${header.resultCode}]: ${header.resultMsg}`);
  }
  return data as G2bResponse<T>;
}

/** 입찰공고 목록 조회 */
export async function getBidPublicList(
  serviceKey: string,
  bidType: BidType,
  params: {
    inqryDiv: string;
    inqryBgnDt?: string;
    inqryEndDt?: string;
    bidNtceNm?: string;
    ntceInsttCd?: string;
    dminsttCd?: string;
    numOfRows?: string;
    pageNo?: string;
  },
): Promise<G2bResponse<BidPublicItem>> {
  const endpoint = BID_ENDPOINTS[bidType];
  const queryParams: Record<string, string> = {
    inqryDiv: params.inqryDiv,
    numOfRows: params.numOfRows ?? "10",
    pageNo: params.pageNo ?? "1",
  };
  if (params.inqryBgnDt) queryParams.inqryBgnDt = params.inqryBgnDt;
  if (params.inqryEndDt) queryParams.inqryEndDt = params.inqryEndDt;
  if (params.bidNtceNm) queryParams.bidNtceNm = params.bidNtceNm;
  if (params.ntceInsttCd) queryParams.ntceInsttCd = params.ntceInsttCd;
  if (params.dminsttCd) queryParams.dminsttCd = params.dminsttCd;
  const url = buildUrl(BID_BASE, endpoint, serviceKey, queryParams);
  return fetchG2b<BidPublicItem>(url);
}

/** 낙찰정보 목록 조회 */
export async function getScsbidList(
  serviceKey: string,
  bidType: BidType,
  params: {
    inqryDiv: string;
    inqryBgnDt?: string;
    inqryEndDt?: string;
    numOfRows?: string;
    pageNo?: string;
  },
): Promise<G2bResponse<ScsbidItem>> {
  const endpoint = SCSBID_ENDPOINTS[bidType];
  const queryParams: Record<string, string> = {
    inqryDiv: params.inqryDiv,
    numOfRows: params.numOfRows ?? "10",
    pageNo: params.pageNo ?? "1",
  };
  if (params.inqryBgnDt) queryParams.inqryBgnDt = params.inqryBgnDt;
  if (params.inqryEndDt) queryParams.inqryEndDt = params.inqryEndDt;
  const url = buildUrl(SCSBID_BASE, endpoint, serviceKey, queryParams);
  return fetchG2b<ScsbidItem>(url);
}
