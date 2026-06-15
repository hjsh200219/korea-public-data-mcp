/**
 * DART 전자공시시스템 OpenAPI 클라이언트
 * JSON 기반 — https://opendart.fss.or.kr/api/
 */

import { XMLParser } from "fast-xml-parser";
import type {
  DartDisclosureSearchResult,
  DartDisclosureSearchParams,
  DartCompanyInfo,
  DartFinancialResult,
  DartFinancialParams,
  DartKeyAccountResult,
  DartDocumentResult,
  DartDocumentFile,
  CorpCodeEntry,
} from "./dart-types.js";
import { getCorpCodeSnapshot } from "./dart-corp-codes.js";

const DART_BASE_URL = "https://opendart.fss.or.kr/api";
const DART_TIMEOUT_MS = 15000;
const DART_REQUEST_INTERVAL_MS = 200;
const DART_MAX_RETRIES = 2;
const BASE_RETRY_DELAY_MS = 2000;

const CORP_CODE_TTL_MS = 24 * 60 * 60 * 1000;
const CORP_CODE_TIMEOUT_MS = 60000;

// --- Rate limiting ---

let lastRequestTime = 0;
let dailyRequestCount = 0;
let dailyResetDate = "";
const DAILY_LIMIT = 20000;
const DAILY_WARNING_THRESHOLD = 18000;

function trackRequest(): void {
  const today = new Date().toDateString();
  if (today !== dailyResetDate) {
    dailyRequestCount = 0;
    dailyResetDate = today;
  }
  dailyRequestCount++;
  if (dailyRequestCount >= DAILY_WARNING_THRESHOLD) {
    console.warn(`DART API 일일 한도 경고: ${dailyRequestCount}/${DAILY_LIMIT}`);
  }
}

async function throttle(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < DART_REQUEST_INTERVAL_MS) {
    await new Promise((resolve) => setTimeout(resolve, DART_REQUEST_INTERVAL_MS - elapsed));
  }
  lastRequestTime = Date.now();
}

// --- DART 상태 코드 메시지 ---

const DART_STATUS_MESSAGES: Record<string, string> = {
  "000": "정상",
  "010": "등록되지 않은 인증키입니다.",
  "011": "사용할 수 없는 인증키입니다.",
  "013": "조회된 데이터가 없습니다.",
  "020": "DART API 일일 호출 한도(20,000건)를 초과했습니다. 내일 다시 시도해주세요.",
  "100": "필드 값이 올바르지 않습니다.",
  "800": "시스템 점검 중입니다.",
  "900": "정의되지 않은 오류가 발생했습니다.",
};

// --- JSON fetch ---

async function fetchDartJson<T>(url: string): Promise<T> {
  if (dailyRequestCount >= DAILY_LIMIT) {
    throw new Error(DART_STATUS_MESSAGES["020"]);
  }

  for (let attempt = 0; attempt <= DART_MAX_RETRIES; attempt++) {
    await throttle();
    trackRequest();

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DART_TIMEOUT_MS);

    try {
      const response = await fetch(url, { signal: controller.signal });

      if (response.status === 429 || response.status === 503) {
        clearTimeout(timeout);
        if (attempt < DART_MAX_RETRIES) {
          const delay = BASE_RETRY_DELAY_MS * Math.pow(2, attempt);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
        throw new Error("DART API 요청 제한. 잠시 후 다시 시도해주세요.");
      }

      if (!response.ok) {
        clearTimeout(timeout);
        throw new Error(`DART API 오류: HTTP ${response.status}`);
      }

      const data = await response.json() as T & { status?: string; message?: string };

      if (data.status && data.status !== "000") {
        const msg = DART_STATUS_MESSAGES[data.status] || data.message || `DART 상태 코드: ${data.status}`;
        if (data.status === "013") return data;
        throw new Error(msg);
      }

      return data;
    } catch (err) {
      clearTimeout(timeout);
      if (err instanceof DOMException && err.name === "AbortError" && attempt < DART_MAX_RETRIES) {
        const delay = BASE_RETRY_DELAY_MS * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new Error("DART API 요청 실패: 최대 재시도 횟수 초과");
}

// --- 공시검색 ---

export async function searchDisclosures(
  apiKey: string,
  params: DartDisclosureSearchParams,
): Promise<DartDisclosureSearchResult> {
  const url = new URL(`${DART_BASE_URL}/list.json`);
  url.searchParams.set("crtfc_key", apiKey);
  if (params.corp_code) url.searchParams.set("corp_code", params.corp_code);
  if (params.bgn_de) url.searchParams.set("bgn_de", params.bgn_de);
  if (params.end_de) url.searchParams.set("end_de", params.end_de);
  if (params.last_reprt_at) url.searchParams.set("last_reprt_at", params.last_reprt_at);
  if (params.pblntf_ty) url.searchParams.set("pblntf_ty", params.pblntf_ty);
  if (params.pblntf_detail_ty) url.searchParams.set("pblntf_detail_ty", params.pblntf_detail_ty);
  if (params.corp_cls) url.searchParams.set("corp_cls", params.corp_cls);
  if (params.sort) url.searchParams.set("sort", params.sort);
  if (params.sort_mth) url.searchParams.set("sort_mth", params.sort_mth);
  url.searchParams.set("page_no", String(params.page_no || 1));
  url.searchParams.set("page_count", String(params.page_count || 20));

  return fetchDartJson<DartDisclosureSearchResult>(url.toString());
}

// --- 기업개황 ---

export async function getCompanyInfo(
  apiKey: string,
  corpCode: string,
): Promise<DartCompanyInfo> {
  const url = new URL(`${DART_BASE_URL}/company.json`);
  url.searchParams.set("crtfc_key", apiKey);
  url.searchParams.set("corp_code", corpCode);

  return fetchDartJson<DartCompanyInfo>(url.toString());
}

// --- 전체 재무제표 ---

export async function getFinancialStatements(
  apiKey: string,
  params: DartFinancialParams,
): Promise<DartFinancialResult> {
  const url = new URL(`${DART_BASE_URL}/fnlttSinglAcntAll.json`);
  url.searchParams.set("crtfc_key", apiKey);
  url.searchParams.set("corp_code", params.corp_code);
  url.searchParams.set("bsns_year", params.bsns_year);
  url.searchParams.set("reprt_code", params.reprt_code);
  url.searchParams.set("fs_div", params.fs_div || "CFS");

  return fetchDartJson<DartFinancialResult>(url.toString());
}

// --- 주요계정 ---

export async function getKeyAccounts(
  apiKey: string,
  params: Omit<DartFinancialParams, "fs_div">,
): Promise<DartKeyAccountResult> {
  const url = new URL(`${DART_BASE_URL}/fnlttSinglAcnt.json`);
  url.searchParams.set("crtfc_key", apiKey);
  url.searchParams.set("corp_code", params.corp_code);
  url.searchParams.set("bsns_year", params.bsns_year);
  url.searchParams.set("reprt_code", params.reprt_code);

  return fetchDartJson<DartKeyAccountResult>(url.toString());
}

// --- 공시서류 본문 조회 ---

function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/tr>/gi, "\n")
    .replace(/<\/td>/gi, "\t")
    .replace(/<\/th>/gi, "\t")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#\d+;/g, "")
    .replace(/\t{2,}/g, "\t")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function getDisclosureDocument(
  apiKey: string,
  rceptNo: string,
): Promise<DartDocumentResult> {
  const url = `${DART_BASE_URL}/document.xml?crtfc_key=${encodeURIComponent(apiKey)}&rcept_no=${encodeURIComponent(rceptNo)}`;

  await throttle();
  trackRequest();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(url, { signal: controller.signal });

    if (!response.ok) {
      throw new Error(`DART 공시서류 다운로드 실패: HTTP ${response.status}`);
    }

    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json") || contentType.includes("text/xml")) {
      const text = await response.text();
      if (text.includes('"status"') || text.includes("<status>")) {
        throw new Error("DART 공시서류를 찾을 수 없습니다. 접수번호를 확인해주세요.");
      }
    }

    const buffer = await response.arrayBuffer();
    const JSZip = (await import("jszip")).default;
    const zip = await JSZip.loadAsync(buffer);

    const files: DartDocumentFile[] = [];
    const fileNames = Object.keys(zip.files).filter((f) => !zip.files[f].dir);

    for (const fname of fileNames) {
      const raw = await zip.files[fname].async("text");
      const text = stripHtml(raw);
      if (text.length > 0) {
        files.push({ filename: fname, content: text });
      }
    }

    files.sort((a, b) => b.content.length - a.content.length);

    const mainFile = files[0];
    const MAX_SUMMARY = 8000;
    const summary = mainFile
      ? mainFile.content.substring(0, MAX_SUMMARY) + (mainFile.content.length > MAX_SUMMARY ? "\n\n...(이하 생략)" : "")
      : "본문을 추출할 수 없습니다.";

    return { rcept_no: rceptNo, files, summary };
  } finally {
    clearTimeout(timeout);
  }
}

// --- 고유번호 (corpCode) 캐시 ---

let corpCodeMap: Map<string, CorpCodeEntry[]> | null = null;
let corpCodeCacheTime = 0;
let corpCodeLoadPromise: Promise<Map<string, CorpCodeEntry[]>> | null = null;

const corpCodeXmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
});

async function loadCorpCodes(apiKey: string): Promise<Map<string, CorpCodeEntry[]>> {
  const url = `${DART_BASE_URL}/corpCode.xml?crtfc_key=${encodeURIComponent(apiKey)}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CORP_CODE_TIMEOUT_MS);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`DART corpCode 다운로드 실패: HTTP ${response.status}`);

    const buffer = await response.arrayBuffer();
    const JSZip = (await import("jszip")).default;
    const zip = await JSZip.loadAsync(buffer);

    const xmlFile = zip.file("CORPCODE.xml");
    if (!xmlFile) throw new Error("CORPCODE.xml을 ZIP에서 찾을 수 없습니다");

    const xmlText = await xmlFile.async("text");
    const parsed = corpCodeXmlParser.parse(xmlText) as {
      result?: { list?: Array<Record<string, unknown>> | Record<string, unknown> };
    };

    const rawList = parsed.result?.list;
    if (!rawList) return new Map();

    const items = Array.isArray(rawList) ? rawList : [rawList];
    const map = new Map<string, CorpCodeEntry[]>();

    for (const item of items) {
      const entry: CorpCodeEntry = {
        corpCode: String(item.corp_code || "").padStart(8, "0"),
        corpName: String(item.corp_name || ""),
        stockCode: String(item.stock_code || "").trim(),
        modifyDate: String(item.modify_date || ""),
      };
      if (!entry.corpName) continue;

      const existing = map.get(entry.corpName);
      if (existing) {
        existing.push(entry);
      } else {
        map.set(entry.corpName, [entry]);
      }
    }

    return map;
  } finally {
    clearTimeout(timeout);
  }
}

async function getCorpCodeMap(apiKey: string): Promise<Map<string, CorpCodeEntry[]>> {
  if (corpCodeMap && Date.now() - corpCodeCacheTime < CORP_CODE_TTL_MS) {
    return corpCodeMap;
  }
  if (corpCodeLoadPromise) return corpCodeLoadPromise;

  corpCodeLoadPromise = (async () => {
    try {
      corpCodeMap = await loadCorpCodes(apiKey);
      corpCodeCacheTime = Date.now();
      console.warn(`DART 기업코드 캐시 갱신 완료: ${corpCodeMap.size}개 기업`);
      return corpCodeMap;
    } finally {
      corpCodeLoadPromise = null;
    }
  })();

  return corpCodeLoadPromise;
}

/** Map 에서 정확 일치 → 없으면 부분 일치(최대 20건) 조회. */
function lookupInMap(
  map: Map<string, CorpCodeEntry[]>,
  corpName: string,
): CorpCodeEntry[] {
  const exact = map.get(corpName);
  if (exact) return exact;

  const results: CorpCodeEntry[] = [];
  for (const [name, entries] of map) {
    if (name.includes(corpName)) {
      results.push(...entries);
    }
    if (results.length >= 20) break;
  }
  return results;
}

/**
 * 회사명 → 고유번호(corp_code) 해석.
 *
 * 정적 스냅샷(dart-corp-codes.ts)을 먼저 조회한다. Railway egress 가
 * opendart.fss.or.kr 에 느려 3.5MB corpCode.xml 라이브 다운로드가 60s 타임아웃
 * 안에 못 끝나는 문제를 회피하기 위함. 스냅샷에 없을 때만 라이브 corpCode.xml 폴백.
 */
export async function resolveCorpCode(
  apiKey: string,
  corpName: string,
): Promise<CorpCodeEntry[]> {
  const snapshot = getCorpCodeSnapshot();
  const fromSnapshot = lookupInMap(snapshot, corpName);
  if (fromSnapshot.length > 0) return fromSnapshot;

  // 스냅샷 미수록 (신규 상장/개명 등) → 라이브 corpCode.xml 폴백
  const map = await getCorpCodeMap(apiKey);
  return lookupInMap(map, corpName);
}
