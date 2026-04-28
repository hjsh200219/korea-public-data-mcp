/**
 * 법제처 API 공통 유틸리티
 * XML 파서, HTTP 클라이언트, 변환 헬퍼
 */

import { XMLParser } from "fast-xml-parser";
import type { SearchParams } from "../law-types.js";

const BASE_URL = "http://www.law.go.kr/DRF";
const TIMEOUT_MS = 30000;
const REQUEST_INTERVAL_MS = 1000; // 요청 간 최소 1초 간격
const MAX_RETRIES = 3;
const BASE_RETRY_DELAY_MS = 3000; // 재시도 시 기본 대기 3초 (지수 백오프)

let lastRequestTime = 0;

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
  isArray: (name) => {
    // 목록 응답에서 단일 결과일 때 배열로 강제
    const arrayTags = [
      "law", "prec", "Detc", "expc", "admrul", "Trty", "lstrm",
      "조문단위", "조", "Jo",
      "ftc", "acr", "fsc", "nlrc", "kcc", "oclt", "nhrck", "eiac", "ecc", "sfc", "iaciac",
      "decc", "oldAndNew", "thdCmp", "licbyl", "법령용어",
      "조문", "법률조문", "시행규칙조문", "위임행정규칙", "삼단비교",
    ];
    return arrayTags.includes(name);
  },
});

// --- 공통 유틸리티 ---

import { stripHtmlTags } from "../shared.js";
export { stripHtmlTags };

export function str(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "object" && v !== null && "#text" in v) {
    return String((v as Record<string, unknown>)["#text"]).trim();
  }
  return String(v).trim();
}

export function num(v: unknown): number {
  return Number(v) || 0;
}

export function ensureArray<T>(v: T | T[] | null | undefined): T[] {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  return [v];
}

export function extractArticles(list: unknown): string {
  const wrapper = list as Record<string, unknown> | undefined;
  if (!wrapper) return "";
  const articles = ensureArray(wrapper["조문"] as Record<string, unknown>[]);
  return articles.map((a) => stripHtmlTags(str(a["#text"] || a["조문내용"] || JSON.stringify(a)))).join("\n\n");
}

async function throttle(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < REQUEST_INTERVAL_MS) {
    await new Promise((resolve) => setTimeout(resolve, REQUEST_INTERVAL_MS - elapsed));
  }
  lastRequestTime = Date.now();
}

export async function fetchXml(url: string): Promise<Record<string, unknown>> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    await throttle();

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const response = await fetch(url, { signal: controller.signal });

      // rate limit 응답 시 재시도
      if (response.status === 429 || response.status === 503) {
        clearTimeout(timeout);
        if (attempt < MAX_RETRIES) {
          const delay = BASE_RETRY_DELAY_MS * Math.pow(2, attempt);
          console.error(`법제처 API 요청 제한 (HTTP ${response.status}), ${delay / 1000}초 후 재시도... (${attempt + 1}/${MAX_RETRIES})`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
        throw new Error(`법제처 API 요청 제한: ${MAX_RETRIES}회 재시도 후에도 실패했습니다. 잠시 후 다시 시도해주세요.`);
      }

      if (!response.ok) {
        clearTimeout(timeout);
        // 서버 오류(5xx)도 재시도
        if (response.status >= 500 && attempt < MAX_RETRIES) {
          const delay = BASE_RETRY_DELAY_MS * Math.pow(2, attempt);
          console.error(`법제처 API 서버 오류 (HTTP ${response.status}), ${delay / 1000}초 후 재시도... (${attempt + 1}/${MAX_RETRIES})`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
        throw new Error(`법제처 API 오류: HTTP ${response.status}`);
      }

      const text = await response.text();

      // 빈 응답도 rate limit일 수 있음
      if (!text || text.trim() === "") {
        clearTimeout(timeout);
        if (attempt < MAX_RETRIES) {
          const delay = BASE_RETRY_DELAY_MS * Math.pow(2, attempt);
          console.error(`법제처 API 빈 응답, ${delay / 1000}초 후 재시도... (${attempt + 1}/${MAX_RETRIES})`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
        throw new Error("법제처 API가 빈 응답을 반환했습니다. 요청 제한일 수 있습니다. 잠시 후 다시 시도해주세요.");
      }

      return xmlParser.parse(text) as Record<string, unknown>;
    } catch (err) {
      clearTimeout(timeout);
      const isAbort = err instanceof DOMException && err.name === "AbortError";
      const isRetryable = isAbort || (err instanceof TypeError && (err as NodeJS.ErrnoException).message === "fetch failed");
      if (isRetryable && attempt < MAX_RETRIES) {
        const cause = (err as { cause?: Error }).cause;
        const detail = cause ? ` (${cause.message})` : "";
        const delay = BASE_RETRY_DELAY_MS * Math.pow(2, attempt);
        console.error(`법제처 API 요청 실패${detail}, ${delay / 1000}초 후 재시도... (${attempt + 1}/${MAX_RETRIES})`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      if (err instanceof TypeError) {
        const cause = (err as { cause?: Error }).cause;
        throw new Error(`법제처 API 네트워크 오류: ${cause?.message || err.message}`, { cause: err });
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new Error("법제처 API 요청 실패: 최대 재시도 횟수를 초과했습니다.");
}

/**
 * XML 파싱 결과에서 지정된 루트 요소를 안전하게 추출.
 * upstream이 XML 구조를 변경하면 null을 반환하여 무음 실패 대신 빈 결과 처리.
 *
 * @internal 점진적 XML 안전 파싱 롤아웃용(TD-014).
 */
export function safeRoot(data: Record<string, unknown>, key: string): Record<string, unknown> | null {
  const root = data[key];
  if (root !== null && root !== undefined && typeof root === "object" && !Array.isArray(root)) {
    return root as Record<string, unknown>;
  }
  return null;
}

export { BASE_URL };

export function buildSearchUrl(
  oc: string,
  target: string,
  params: SearchParams
): string {
  const url = new URL(`${BASE_URL}/lawSearch.do`);
  url.searchParams.set("OC", oc);
  url.searchParams.set("target", target);
  url.searchParams.set("type", "XML");
  url.searchParams.set("query", params.query);
  url.searchParams.set("display", String(params.display || 20));
  url.searchParams.set("page", String(params.page || 1));
  if (params.sort) url.searchParams.set("sort", params.sort);
  return url.toString();
}

export function buildDetailUrl(
  oc: string,
  target: string,
  idParam: string,
  idValue: string | number
): string {
  const url = new URL(`${BASE_URL}/lawService.do`);
  url.searchParams.set("OC", oc);
  url.searchParams.set("target", target);
  url.searchParams.set("type", "XML");
  url.searchParams.set(idParam, String(idValue));
  return url.toString();
}
