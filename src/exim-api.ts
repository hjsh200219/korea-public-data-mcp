/**
 * 한국수출입은행 환율 API 클라이언트
 * https://oapi.koreaexim.go.kr/site/program/financial/exchangeJSON
 *
 * 수출입은행 API는 쿠키 기반 보안 검증 사용:
 * 첫 요청 → 302 + Set-Cookie → 쿠키 포함 재요청 → JSON 응답
 *
 * 영업일 자동 폴백: 주말/공휴일/11시 이전 등으로 빈 응답 시
 * 최대 7일 전까지 자동 재시도
 */

import type { EximExchangeRateRaw, EximExchangeRate } from "./exim-types.js";
import { toKSTDate, formatYYYYMMDD, subtractDays, skipWeekends } from "./kst-date.js";

const KOREAEXIM_API_URL =
  "https://oapi.koreaexim.go.kr/site/program/financial/exchangeJSON";
const TIMEOUT_MS = 15000;
const MAX_FALLBACK_DAYS = 7;

export function parseExchangeRateResponse(
  items: EximExchangeRateRaw[],
): EximExchangeRate[] {
  return items
    .filter((item) => item.result === 1)
    .map((item) => ({
      currency: item.cur_unit.replace(/\(.*\)/, "").trim(),
      currencyName: item.cur_nm,
      dealBaseRate: parseFloat(item.deal_bas_r.replace(/,/g, "")),
      ttBuy: item.ttb,
      ttSell: item.tts,
      baseRate: item.bkpr,
    }))
    .filter((item) => !isNaN(item.dealBaseRate));
}

async function fetchRatesForDate(
  apiKey: string,
  searchDate: string,
): Promise<EximExchangeRate[]> {
  const url = `${KOREAEXIM_API_URL}?authkey=${apiKey}&searchdate=${searchDate}&data=AP01`;
  const fetchOptions: RequestInit = {
    method: "GET",
    headers: { "User-Agent": "Mozilla/5.0 (KoreanPublicDataMCP)" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  };

  const first = await fetch(url, { ...fetchOptions, redirect: "manual" });

  let response: Response;
  if (first.status === 302) {
    const cookie = first.headers.get("set-cookie")?.split(";")[0] ?? "";
    const location = first.headers.get("location") ?? "";
    const redirectUrl = location.startsWith("http")
      ? location
      : `https://oapi.koreaexim.go.kr${location}`;
    response = await fetch(redirectUrl, {
      ...fetchOptions,
      headers: {
        "User-Agent": "Mozilla/5.0 (KoreanPublicDataMCP)",
        Cookie: cookie,
      },
    });
  } else {
    response = first;
  }

  if (!response.ok) return [];

  const json = await response.json();
  if (!Array.isArray(json) || json.length === 0) return [];

  return parseExchangeRateResponse(json as EximExchangeRateRaw[]);
}

export interface EximExchangeRateResult {
  rates: EximExchangeRate[];
  queriedDate: string;
  isFallback: boolean;
}

/**
 * 비영업일(주말·공휴일·11시 이전) 자동 폴백:
 * 요청일에 결과가 없으면 최대 7일 전까지 하루씩 되돌아가며 재시도.
 * 주말은 API 호출 없이 건너뜀.
 */
export async function getMarketExchangeRates(
  apiKey: string,
  dateStr?: string,
): Promise<EximExchangeRateResult> {
  const today = formatYYYYMMDD(toKSTDate());
  const requestDate = dateStr ?? today;
  const originalDate = requestDate;

  let candidate = skipWeekends(requestDate);

  for (let attempt = 0; attempt < MAX_FALLBACK_DAYS; attempt++) {
    try {
      const rates = await fetchRatesForDate(apiKey, candidate);
      if (rates.length > 0) {
        return {
          rates,
          queriedDate: candidate,
          isFallback: candidate !== originalDate,
        };
      }
    } catch (e) {
      console.error(`수출입은행 API error (${candidate}):`, e);
    }
    candidate = skipWeekends(subtractDays(candidate, 1));
  }

  return { rates: [], queriedDate: requestDate, isFallback: false };
}
