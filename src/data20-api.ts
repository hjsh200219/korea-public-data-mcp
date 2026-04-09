/**
 * 공공데이터포털 (data.go.kr) API 클라이언트
 * DATA20_SERVICE_KEY 기반
 */

import { XMLParser } from "fast-xml-parser";
import { fetchWithRetry } from "./http-client.js";
import type {
  DataGoKrResult,
  PharmacyItem,
  HospitalItem,
  StockDividendItem,
  RareMedicineItem,
  HealthFoodItem,
  BioEquivalenceItem,
  MedicinePatentItem,
  BusinessValidateRequest,
  BusinessValidateResult,
  BusinessStatusResult,
  OnbidPbancCltrItem,
} from "./data20-types.js";

const REQUEST_TIMEOUT_MS = 15000;
const MAX_RETRIES = 2;

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
});

const DATA_GO_KR_ERRORS: Record<string, string> = {
  "01": "어플리케이션 에러",
  "02": "DB 에러",
  "03": "데이터 없음",
  "04": "HTTP 에러",
  "05": "서비스 타임아웃",
  "10": "잘못된 요청 파라미터",
  "11": "필수 파라미터 누락",
  "12": "등록되지 않은 서비스",
  "20": "서비스 접근 거부",
  "21": "일시적 사용 불가",
  "22": "일일 요청 한도 초과",
  "30": "등록되지 않은 서비스 키",
  "31": "만료된 서비스 키",
  "32": "최대 요청 횟수 초과",
};

function buildUrl(baseUrl: string, serviceKey: string, params: Record<string, string>): string {
  const url = new URL(baseUrl);
  url.searchParams.set("serviceKey", serviceKey);
  for (const [key, value] of Object.entries(params)) {
    if (value) url.searchParams.set(key, value);
  }
  return url.toString();
}

function throwIfErrorCode(code: string, msg?: string): void {
  if (code === "00" || code === "0") return;
  throw new Error(DATA_GO_KR_ERRORS[code] || msg || `오류 코드: ${code}`);
}

// --- XML fetch (약국, 병원) ---

async function fetchXml<T>(
  baseUrl: string,
  serviceKey: string,
  params: Record<string, string>,
): Promise<DataGoKrResult<T>> {
  const response = await fetchWithRetry(buildUrl(baseUrl, serviceKey, params), {
    timeoutMs: REQUEST_TIMEOUT_MS,
    maxRetries: MAX_RETRIES,
  });
  if (!response.ok) throw new Error(`API 오류: HTTP ${response.status}`);

  const text = await response.text();
  const parsed = xmlParser.parse(text) as {
    response?: {
      header?: { resultCode?: string | number; resultMsg?: string };
      body?: Record<string, unknown>;
    };
  };

  const header = parsed.response?.header;
  throwIfErrorCode(String(header?.resultCode ?? "00"), header?.resultMsg);

  const body = parsed.response?.body;
  const rawItems = (body?.items as Record<string, unknown>)?.item;
  const items = !rawItems ? [] : Array.isArray(rawItems) ? rawItems : [rawItems];

  return {
    totalCount: Number(body?.totalCount) || 0,
    pageNo: Number(body?.pageNo) || 1,
    numOfRows: Number(body?.numOfRows) || 0,
    items: items as T[],
  };
}

// --- JSON fetch (주식배당, 의약품, 건강식품) ---

async function fetchJson<T>(
  baseUrl: string,
  serviceKey: string,
  params: Record<string, string>,
): Promise<DataGoKrResult<T>> {
  const response = await fetchWithRetry(buildUrl(baseUrl, serviceKey, params), {
    timeoutMs: REQUEST_TIMEOUT_MS,
    maxRetries: MAX_RETRIES,
  });
  if (!response.ok) throw new Error(`API 오류: HTTP ${response.status}`);

  const data = await response.json() as Record<string, unknown>;

  const top = (data.response || data) as Record<string, unknown>;
  const header = top.header as Record<string, unknown> | undefined;
  const body = top.body as Record<string, unknown> | undefined;

  throwIfErrorCode(String(header?.resultCode ?? "00"), String(header?.resultMsg ?? ""));

  let items: T[];
  const bodyItems = body?.items as Record<string, unknown> | unknown[] | undefined;
  if (bodyItems && typeof bodyItems === "object" && !Array.isArray(bodyItems) && (bodyItems as Record<string, unknown>).item) {
    const raw = (bodyItems as Record<string, unknown>).item;
    items = Array.isArray(raw) ? raw as T[] : [raw as T];
  } else if (Array.isArray(bodyItems)) {
    items = bodyItems as T[];
  } else {
    items = [];
  }

  items = items.map((i) => {
    if (typeof i === "object" && i !== null && "item" in (i as Record<string, unknown>)) {
      return (i as Record<string, unknown>).item as T;
    }
    return i;
  });

  return {
    totalCount: Number(body?.totalCount) || 0,
    pageNo: Number(body?.pageNo) || 1,
    numOfRows: Number(body?.numOfRows) || 0,
    items,
  };
}

// --- 약국 검색 ---

export async function searchPharmacy(
  serviceKey: string,
  params: { Q0?: string; Q1?: string; QN?: string; QT?: string; pageNo?: number; numOfRows?: number },
): Promise<DataGoKrResult<PharmacyItem>> {
  return fetchXml<PharmacyItem>(
    "http://apis.data.go.kr/B551182/pharmacyInfoService/getParmacyBasisList",
    serviceKey,
    {
      Q0: params.Q0 || "",
      Q1: params.Q1 || "",
      QN: params.QN || "",
      QT: params.QT || "1",
      pageNo: String(params.pageNo || 1),
      numOfRows: String(params.numOfRows || 10),
    },
  );
}

// --- 병원 검색 ---

export async function searchHospital(
  serviceKey: string,
  params: {
    yadmNm?: string; sidoCd?: string; sgguCd?: string;
    clCd?: string; dgsbjtCd?: string;
    xPos?: string; yPos?: string; radius?: string;
    pageNo?: number; numOfRows?: number;
  },
): Promise<DataGoKrResult<HospitalItem>> {
  return fetchXml<HospitalItem>(
    "http://apis.data.go.kr/B551182/hospInfoServicev2/getHospBasisList",
    serviceKey,
    {
      yadmNm: params.yadmNm || "",
      sidoCd: params.sidoCd || "",
      sgguCd: params.sgguCd || "",
      clCd: params.clCd || "",
      dgsbjtCd: params.dgsbjtCd || "",
      xPos: params.xPos || "",
      yPos: params.yPos || "",
      radius: params.radius || "",
      pageNo: String(params.pageNo || 1),
      numOfRows: String(params.numOfRows || 10),
    },
  );
}

// --- 주식배당정보 ---

export async function searchStockDividend(
  serviceKey: string,
  params: { basDt?: string; stckIssuCmpyNm?: string; crno?: string; pageNo?: number; numOfRows?: number },
): Promise<DataGoKrResult<StockDividendItem>> {
  return fetchJson<StockDividendItem>(
    "https://apis.data.go.kr/1160100/service/GetStocDiviInfoService/getDiviInfo",
    serviceKey,
    {
      resultType: "json",
      basDt: params.basDt || "",
      stckIssuCmpyNm: params.stckIssuCmpyNm || "",
      crno: params.crno || "",
      pageNo: String(params.pageNo || 1),
      numOfRows: String(params.numOfRows || 10),
    },
  );
}

// --- 희귀의약품 검색 ---

export async function searchRareMedicine(
  serviceKey: string,
  params: { item_name?: string; entp_name?: string; pageNo?: number; numOfRows?: number },
): Promise<DataGoKrResult<RareMedicineItem>> {
  return fetchJson<RareMedicineItem>(
    "https://apis.data.go.kr/1471000/RareMdcinInfoService02/getRareMdcinList02",
    serviceKey,
    {
      type: "json",
      item_name: params.item_name || "",
      entp_name: params.entp_name || "",
      pageNo: String(params.pageNo || 1),
      numOfRows: String(params.numOfRows || 10),
    },
  );
}

// --- 건강식품 검색 ---

export async function searchHealthFood(
  serviceKey: string,
  params: { prdlst_nm?: string; pageNo?: number; numOfRows?: number },
): Promise<DataGoKrResult<HealthFoodItem>> {
  return fetchJson<HealthFoodItem>(
    "https://apis.data.go.kr/1471000/HtfsInfoService03/getHtfsItem01",
    serviceKey,
    {
      type: "json",
      prdlst_nm: params.prdlst_nm || "",
      pageNo: String(params.pageNo || 1),
      numOfRows: String(params.numOfRows || 10),
    },
  );
}

// --- 생동성인정품목 검색 ---

export async function searchBioEquivalence(
  serviceKey: string,
  params: { item_name?: string; pageNo?: number; numOfRows?: number },
): Promise<DataGoKrResult<BioEquivalenceItem>> {
  return fetchJson<BioEquivalenceItem>(
    "https://apis.data.go.kr/1471000/MdcBioEqInfoService01/getMdcBioEqList01",
    serviceKey,
    {
      type: "json",
      item_name: params.item_name || "",
      pageNo: String(params.pageNo || 1),
      numOfRows: String(params.numOfRows || 10),
    },
  );
}

// --- 의약품 특허정보 검색 ---

function strField(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v);
}

/** API가 DOMESTIC_*·INGR_NAME·SHAPE 등으로 내려줄 때 기존 필드명으로 맞춤 */
function normalizeMedicinePatentItem(row: unknown): MedicinePatentItem {
  const r = row as Record<string, unknown>;
  const pms = strField(r.PMS_END_DATE);
  const pmsUsable = pms !== "" && pms !== "-";
  return {
    ITEM_SEQ: strField(r.ITEM_SEQ),
    ITEM_NAME: strField(r.ITEM_NAME),
    ITEM_ENG_NAME: strField(r.ITEM_ENG_NAME),
    ENTP_NAME: strField(r.ENTP_NAME),
    INGR_KOR_NAME: strField(r.INGR_KOR_NAME || r.INGR_NAME),
    INGR_ENG_NAME: strField(r.INGR_ENG_NAME),
    PATENT_NO: strField(r.PATENT_NO || r.DOMESTIC_PATENT_NO),
    PATENT_DATE: strField(
      r.PATENT_DATE || r.DOMESTIC_RGST_DATE || r.DOMESTIC_START_DATE || r.REG_DATE || r.RGST_DATE,
    ),
    PATENT_EXPIRY_DATE: strField(
      r.PATENT_EXPIRY_DATE || r.DOMESTIC_END_DATE || (pmsUsable ? pms : ""),
    ),
    DOSAGE_FORM: strField(r.DOSAGE_FORM || r.SHAPE),
  };
}

export async function searchMedicinePatent(
  serviceKey: string,
  params: {
    item_name?: string; item_eng_name?: string;
    ingr_name?: string; ingr_eng_name?: string;
    pageNo?: number; numOfRows?: number;
  },
): Promise<DataGoKrResult<MedicinePatentItem>> {
  const raw = await fetchJson<Record<string, unknown>>(
    "https://apis.data.go.kr/1471000/MdcinPatentInfoService2/getMdcinPatentInfoList2",
    serviceKey,
    {
      type: "json",
      item_name: params.item_name || "",
      item_eng_name: params.item_eng_name || "",
      ingr_name: params.ingr_name || "",
      ingr_eng_name: params.ingr_eng_name || "",
      pageNo: String(params.pageNo || 1),
      numOfRows: String(params.numOfRows || 10),
    },
  );
  return {
    ...raw,
    items: raw.items.map(normalizeMedicinePatentItem),
  };
}

// --- 온비드 차세대 공고물건상세 (공고관리번호별 물건 목록) ---

export async function searchOnbidPbancCltrDetail(
  serviceKey: string,
  params: {
    pbancMngNo: string;
    pageNo?: number;
    numOfRows?: number;
  },
): Promise<DataGoKrResult<OnbidPbancCltrItem>> {
  return fetchJson<OnbidPbancCltrItem>(
    "https://apis.data.go.kr/B010003/OnbidPbancCltrDtlSrvc2/getPbancCltrInf2",
    serviceKey,
    {
      resultType: "json",
      pbancMngNo: params.pbancMngNo,
      pageNo: String(params.pageNo || 1),
      numOfRows: String(params.numOfRows || 10),
    },
  );
}

// --- 사업자등록 진위확인 ---

export async function verifyBusiness(
  serviceKey: string,
  businesses: BusinessValidateRequest[],
): Promise<BusinessValidateResult[]> {
  const url = `https://api.odcloud.kr/api/nts-businessman/v1/validate?serviceKey=${encodeURIComponent(serviceKey)}`;
  const response = await fetchWithRetry(url, {
    timeoutMs: REQUEST_TIMEOUT_MS,
    maxRetries: MAX_RETRIES,
    init: {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businesses }),
    },
  });
  if (!response.ok) throw new Error(`API 오류: HTTP ${response.status}`);

  const data = await response.json() as { data?: BusinessValidateResult[]; status_code?: string };
  if (data.status_code && data.status_code !== "OK") {
    throw new Error(`사업자등록 진위확인 오류: ${data.status_code}`);
  }
  return data.data || [];
}

// --- 사업자등록 상태조회 ---

export async function checkBusinessStatus(
  serviceKey: string,
  businessNumbers: string[],
): Promise<BusinessStatusResult[]> {
  const url = `https://api.odcloud.kr/api/nts-businessman/v1/status?serviceKey=${encodeURIComponent(serviceKey)}`;
  const response = await fetchWithRetry(url, {
    timeoutMs: REQUEST_TIMEOUT_MS,
    maxRetries: MAX_RETRIES,
    init: {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ b_no: businessNumbers }),
    },
  });
  if (!response.ok) throw new Error(`API 오류: HTTP ${response.status}`);

  const data = await response.json() as { data?: BusinessStatusResult[]; status_code?: string };
  if (data.status_code && data.status_code !== "OK") {
    throw new Error(`사업자등록 상태조회 오류: ${data.status_code}`);
  }
  return data.data || [];
}
