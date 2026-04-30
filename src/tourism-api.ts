/**
 * 한국관광공사 Tour API 2.0 (KorService2) 클라이언트
 * DATA20_SERVICE_KEY 재사용
 */

import { fetchWithRetry } from "./http-client.js";
import type {
  TourismResult,
  AreaCodeItem,
  CategoryCodeItem,
  AreaBasedItem,
  KeywordSearchItem,
  LocationBasedItem,
  FestivalItem,
  StayItem,
  DetailCommonItem,
  DetailIntroItem,
  DetailInfoItem,
  DetailImageItem,
  AreaBasedSyncItem,
  LdongCodeItem,
  LclsSystmCodeItem,
} from "./tourism-types.js";

const BASE_URL = "https://apis.data.go.kr/B551011/KorService2";
const REQUEST_TIMEOUT_MS = 15000;
const MAX_RETRIES = 2;

const KOR_SERVICE_ERRORS: Record<string, string> = {
  "0010": "잘못된 요청 파라미터 오류",
  "0011": "필수 요청 파라미터가 없는 오류",
  "0012": "해당 서비스를 제공하지 않거나 중지된 오류",
  "0020": "서비스 접근 거부",
  "0021": "일시적 사용 불가",
  "0022": "서비스 요청 제한 초과 오류",
  "0030": "등록되지 않은 서비스키",
  "0031": "기한 만료된 서비스키",
  "0032": "등록되지 않은 도메인",
};

function buildUrl(endpoint: string, serviceKey: string, params: Record<string, string>): string {
  const url = new URL(`${BASE_URL}/${endpoint}`);
  url.searchParams.set("serviceKey", serviceKey);
  url.searchParams.set("MobileOS", "ETC");
  url.searchParams.set("MobileApp", "K-Data-MCP");
  url.searchParams.set("_type", "json");
  for (const [key, value] of Object.entries(params)) {
    if (value) url.searchParams.set(key, value);
  }
  return url.toString();
}

function throwIfErrorCode(code: string, msg?: string): void {
  if (code === "0000" || code === "00") return;
  throw new Error(KOR_SERVICE_ERRORS[code] || msg || `오류 코드: ${code}`);
}

async function fetchTourism<T>(
  endpoint: string,
  serviceKey: string,
  params: Record<string, string>,
): Promise<TourismResult<T>> {
  const response = await fetchWithRetry(buildUrl(endpoint, serviceKey, params), {
    timeoutMs: REQUEST_TIMEOUT_MS,
    maxRetries: MAX_RETRIES,
  });
  if (!response.ok) throw new Error(`API 오류: HTTP ${response.status}`);

  const data = await response.json() as Record<string, unknown>;
  const res = data.response as Record<string, unknown> | undefined;
  const header = res?.header as Record<string, unknown> | undefined;
  const body = res?.body as Record<string, unknown> | undefined;

  throwIfErrorCode(String(header?.resultCode ?? "0000"), String(header?.resultMsg ?? ""));

  // items가 ""(빈 문자열)로 올 때 빈 배열 처리
  const rawItems = body?.items;
  let items: T[] = [];
  if (rawItems && typeof rawItems === "object" && !Array.isArray(rawItems)) {
    const item = (rawItems as Record<string, unknown>).item;
    if (item) {
      items = Array.isArray(item) ? (item as T[]) : [item as T];
    }
  }

  return {
    totalCount: Number(body?.totalCount) || 0,
    pageNo: Number(body?.pageNo) || 1,
    numOfRows: Number(body?.numOfRows) || 0,
    items,
  };
}

// --- 지역코드 조회 ---

export async function getAreaCode(
  serviceKey: string,
  params: { areaCode?: string; pageNo?: number; numOfRows?: number },
): Promise<TourismResult<AreaCodeItem>> {
  return fetchTourism<AreaCodeItem>("areaCode2", serviceKey, {
    areaCode: params.areaCode || "",
    pageNo: String(params.pageNo || 1),
    numOfRows: String(params.numOfRows || 100),
  });
}

// --- 서비스분류코드 조회 ---

export async function getCategoryCode(
  serviceKey: string,
  params: { contentTypeId?: string; cat1?: string; cat2?: string; cat3?: string; pageNo?: number; numOfRows?: number },
): Promise<TourismResult<CategoryCodeItem>> {
  return fetchTourism<CategoryCodeItem>("categoryCode2", serviceKey, {
    contentTypeId: params.contentTypeId || "",
    cat1: params.cat1 || "",
    cat2: params.cat2 || "",
    cat3: params.cat3 || "",
    pageNo: String(params.pageNo || 1),
    numOfRows: String(params.numOfRows || 100),
  });
}

// --- 지역기반 관광정보 조회 ---

export async function searchAreaBased(
  serviceKey: string,
  params: {
    areaCode?: string; sigunguCode?: string; contentTypeId?: string;
    cat1?: string; cat2?: string; cat3?: string;
    pageNo?: number; numOfRows?: number; arrange?: string;
  },
): Promise<TourismResult<AreaBasedItem>> {
  return fetchTourism<AreaBasedItem>("areaBasedList2", serviceKey, {
    areaCode: params.areaCode || "",
    sigunguCode: params.sigunguCode || "",
    contentTypeId: params.contentTypeId || "",
    cat1: params.cat1 || "",
    cat2: params.cat2 || "",
    cat3: params.cat3 || "",
    arrange: params.arrange || "A",
    pageNo: String(params.pageNo || 1),
    numOfRows: String(params.numOfRows || 10),
  });
}

// --- 키워드 검색 ---

export async function searchKeyword(
  serviceKey: string,
  params: {
    keyword: string; areaCode?: string; sigunguCode?: string;
    contentTypeId?: string; cat1?: string; cat2?: string; cat3?: string;
    pageNo?: number; numOfRows?: number; arrange?: string;
  },
): Promise<TourismResult<KeywordSearchItem>> {
  return fetchTourism<KeywordSearchItem>("searchKeyword2", serviceKey, {
    keyword: params.keyword,
    areaCode: params.areaCode || "",
    sigunguCode: params.sigunguCode || "",
    contentTypeId: params.contentTypeId || "",
    cat1: params.cat1 || "",
    cat2: params.cat2 || "",
    cat3: params.cat3 || "",
    arrange: params.arrange || "A",
    pageNo: String(params.pageNo || 1),
    numOfRows: String(params.numOfRows || 10),
  });
}

// --- 위치기반 관광정보 조회 ---

export async function searchLocationBased(
  serviceKey: string,
  params: {
    mapX: string; mapY: string; radius: string;
    contentTypeId?: string; areaCode?: string;
    pageNo?: number; numOfRows?: number; arrange?: string;
  },
): Promise<TourismResult<LocationBasedItem>> {
  return fetchTourism<LocationBasedItem>("locationBasedList2", serviceKey, {
    mapX: params.mapX,
    mapY: params.mapY,
    radius: params.radius,
    contentTypeId: params.contentTypeId || "",
    areaCode: params.areaCode || "",
    arrange: params.arrange || "A",
    pageNo: String(params.pageNo || 1),
    numOfRows: String(params.numOfRows || 10),
  });
}

// --- 축제·공연·행사 검색 ---

export async function searchFestival(
  serviceKey: string,
  params: {
    eventStartDate: string; eventEndDate?: string;
    areaCode?: string; sigunguCode?: string;
    pageNo?: number; numOfRows?: number; arrange?: string;
  },
): Promise<TourismResult<FestivalItem>> {
  return fetchTourism<FestivalItem>("searchFestival2", serviceKey, {
    eventStartDate: params.eventStartDate,
    eventEndDate: params.eventEndDate || "",
    areaCode: params.areaCode || "",
    sigunguCode: params.sigunguCode || "",
    arrange: params.arrange || "A",
    pageNo: String(params.pageNo || 1),
    numOfRows: String(params.numOfRows || 10),
  });
}

// --- 숙박 검색 ---

export async function searchStay(
  serviceKey: string,
  params: {
    areaCode?: string; sigunguCode?: string;
    pageNo?: number; numOfRows?: number; arrange?: string;
    benikia?: string; goodstay?: string; hanok?: string;
  },
): Promise<TourismResult<StayItem>> {
  return fetchTourism<StayItem>("searchStay2", serviceKey, {
    areaCode: params.areaCode || "",
    sigunguCode: params.sigunguCode || "",
    arrange: params.arrange || "A",
    benikia: params.benikia || "",
    goodstay: params.goodstay || "",
    hanok: params.hanok || "",
    pageNo: String(params.pageNo || 1),
    numOfRows: String(params.numOfRows || 10),
  });
}

// --- 공통정보 조회 ---

export async function getDetailCommon(
  serviceKey: string,
  params: {
    contentId: string;
    defaultYN?: string; firstImageYN?: string; areacodeYN?: string;
    catcodeYN?: string; addrinfoYN?: string; mapinfoYN?: string;
    overviewYN?: string;
  },
): Promise<TourismResult<DetailCommonItem>> {
  return fetchTourism<DetailCommonItem>("detailCommon2", serviceKey, {
    contentId: params.contentId,
    defaultYN: params.defaultYN || "Y",
    firstImageYN: params.firstImageYN || "Y",
    areacodeYN: params.areacodeYN || "Y",
    catcodeYN: params.catcodeYN || "Y",
    addrinfoYN: params.addrinfoYN || "Y",
    mapinfoYN: params.mapinfoYN || "Y",
    overviewYN: params.overviewYN || "Y",
  });
}

// --- 소개정보 조회 ---

export async function getDetailIntro(
  serviceKey: string,
  params: { contentId: string; contentTypeId: string },
): Promise<TourismResult<DetailIntroItem>> {
  return fetchTourism<DetailIntroItem>("detailIntro2", serviceKey, {
    contentId: params.contentId,
    contentTypeId: params.contentTypeId,
  });
}

// --- 반복정보 조회 ---

export async function getDetailInfo(
  serviceKey: string,
  params: { contentId: string; contentTypeId: string; pageNo?: number; numOfRows?: number },
): Promise<TourismResult<DetailInfoItem>> {
  return fetchTourism<DetailInfoItem>("detailInfo2", serviceKey, {
    contentId: params.contentId,
    contentTypeId: params.contentTypeId,
    pageNo: String(params.pageNo || 1),
    numOfRows: String(params.numOfRows || 10),
  });
}

// --- 이미지정보 조회 ---

export async function getDetailImage(
  serviceKey: string,
  params: { contentId: string; imageYN?: string; subImageYN?: string; pageNo?: number; numOfRows?: number },
): Promise<TourismResult<DetailImageItem>> {
  return fetchTourism<DetailImageItem>("detailImage2", serviceKey, {
    contentId: params.contentId,
    imageYN: params.imageYN || "Y",
    subImageYN: params.subImageYN || "Y",
    pageNo: String(params.pageNo || 1),
    numOfRows: String(params.numOfRows || 10),
  });
}

// --- 지역기반 동기화 목록 조회 ---

export async function getAreaBasedSync(
  serviceKey: string,
  params: {
    areaCode?: string; sigunguCode?: string; contentTypeId?: string;
    pageNo?: number; numOfRows?: number; modifiedtime?: string;
  },
): Promise<TourismResult<AreaBasedSyncItem>> {
  return fetchTourism<AreaBasedSyncItem>("areaBasedSyncList2", serviceKey, {
    areaCode: params.areaCode || "",
    sigunguCode: params.sigunguCode || "",
    contentTypeId: params.contentTypeId || "",
    modifiedtime: params.modifiedtime || "",
    pageNo: String(params.pageNo || 1),
    numOfRows: String(params.numOfRows || 10),
  });
}

// --- 법정동코드 조회 ---

export async function getLdongCode(
  serviceKey: string,
  params: { areaCode?: string; sigunguCode?: string; pageNo?: number; numOfRows?: number },
): Promise<TourismResult<LdongCodeItem>> {
  return fetchTourism<LdongCodeItem>("ldongCode2", serviceKey, {
    areaCode: params.areaCode || "",
    sigunguCode: params.sigunguCode || "",
    pageNo: String(params.pageNo || 1),
    numOfRows: String(params.numOfRows || 100),
  });
}

// --- 관광타입 소분류 코드 조회 ---

export async function getLclsSystmCode(
  serviceKey: string,
  params: { lclsSystmCode?: string; pageNo?: number; numOfRows?: number },
): Promise<TourismResult<LclsSystmCodeItem>> {
  return fetchTourism<LclsSystmCodeItem>("lclsSystmCode2", serviceKey, {
    lclsSystmCode: params.lclsSystmCode || "",
    pageNo: String(params.pageNo || 1),
    numOfRows: String(params.numOfRows || 100),
  });
}
