import { describe, it, expect, vi, beforeEach } from "vitest";
import { getMarketExchangeRates, parseExchangeRateResponse } from "./exim-api.js";

beforeEach(() => {
  vi.restoreAllMocks();
});

// --- parseExchangeRateResponse ---

describe("parseExchangeRateResponse", () => {
  it("parseExchangeRateResponse_유효한JSON_환율배열반환", () => {
    const raw = [
      {
        result: 1,
        cur_unit: "USD",
        ttb: "1,348.5",
        tts: "1,375.5",
        deal_bas_r: "1,362",
        bkpr: "1,362",
        yy_efee_r: "0",
        ten_dd_efee_r: "0",
        kftc_bkpr: "1,362",
        kftc_deal_bas_r: "1,362",
        cur_nm: "미국 달러",
      },
    ];

    const result = parseExchangeRateResponse(raw);
    expect(result).toHaveLength(1);
    expect(result[0].currency).toBe("USD");
    expect(result[0].dealBaseRate).toBe(1362);
    expect(result[0].currencyName).toBe("미국 달러");
  });

  it("parseExchangeRateResponse_result가1아닌항목_필터링", () => {
    const raw = [
      { result: 1, cur_unit: "USD", deal_bas_r: "1,362", cur_nm: "미국 달러", ttb: "", tts: "", bkpr: "", yy_efee_r: "", ten_dd_efee_r: "", kftc_bkpr: "", kftc_deal_bas_r: "" },
      { result: 4, cur_unit: "KRW", deal_bas_r: "0", cur_nm: "한국 원", ttb: "", tts: "", bkpr: "", yy_efee_r: "", ten_dd_efee_r: "", kftc_bkpr: "", kftc_deal_bas_r: "" },
    ];

    const result = parseExchangeRateResponse(raw);
    expect(result).toHaveLength(1);
    expect(result[0].currency).toBe("USD");
  });

  it("parseExchangeRateResponse_빈배열_빈배열반환", () => {
    const result = parseExchangeRateResponse([]);
    expect(result).toEqual([]);
  });

  it("parseExchangeRateResponse_JPY100엔단위_괄호제거", () => {
    const raw = [
      { result: 1, cur_unit: "JPY(100)", deal_bas_r: "910.5", cur_nm: "일본 엔", ttb: "900", tts: "920", bkpr: "910", yy_efee_r: "", ten_dd_efee_r: "", kftc_bkpr: "", kftc_deal_bas_r: "" },
    ];

    const result = parseExchangeRateResponse(raw);
    expect(result).toHaveLength(1);
    expect(result[0].currency).toBe("JPY");
  });
});

// --- getMarketExchangeRates (fetch mock) ---

function mockFetchOk(data: unknown[]) {
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: () => Promise.resolve(data),
  });
}

const USD_RAW = {
  result: 1, cur_unit: "USD", deal_bas_r: "1,362", cur_nm: "미국 달러",
  ttb: "1,348.5", tts: "1,375.5", bkpr: "1,362",
  yy_efee_r: "0", ten_dd_efee_r: "0", kftc_bkpr: "1,362", kftc_deal_bas_r: "1,362",
};

describe("getMarketExchangeRates", () => {
  it("getMarketExchangeRates_평일정상응답_환율반환", async () => {
    vi.stubGlobal("fetch", mockFetchOk([USD_RAW]));

    const result = await getMarketExchangeRates("testkey", "20260403");
    expect(result.rates).toHaveLength(1);
    expect(result.rates[0].currency).toBe("USD");
    expect(result.queriedDate).toBe("20260403");
    expect(result.isFallback).toBe(false);
  });

  it("getMarketExchangeRates_날짜필터_searchdate가첫요청URL에포함", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve([USD_RAW]),
    });
    vi.stubGlobal("fetch", fetchMock);

    await getMarketExchangeRates("myauthkey", "20250115");

    const firstUrl = fetchMock.mock.calls[0][0] as string;
    expect(firstUrl).toContain("authkey=myauthkey");
    expect(firstUrl).toContain("searchdate=20250115");
    expect(firstUrl).toContain("data=AP01");
  });

  it("getMarketExchangeRates_주말요청_평일자동폴백", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve([USD_RAW]) });

    vi.stubGlobal("fetch", fetchMock);

    const result = await getMarketExchangeRates("testkey", "20260405");
    expect(result.rates).toHaveLength(1);
    expect(result.queriedDate).toBe("20260403");
    expect(result.isFallback).toBe(true);
  });

  it("getMarketExchangeRates_빈응답_이전영업일자동폴백", async () => {
    let callCount = 0;
    const fetchMock = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount <= 1) {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve([]) });
      }
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve([USD_RAW]) });
    });

    vi.stubGlobal("fetch", fetchMock);

    const result = await getMarketExchangeRates("testkey", "20260403");
    expect(result.rates).toHaveLength(1);
    expect(result.isFallback).toBe(true);
    expect(result.queriedDate).toBe("20260402");
  });

  it("getMarketExchangeRates_302리다이렉트_쿠키포함재요청", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 302,
        headers: new Map([
          ["set-cookie", "JSESSIONID=abc123; Path=/"],
          ["location", "/site/program/financial/exchangeJSON?authkey=testkey&searchdate=20260403&data=AP01"],
        ]),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve([
          { result: 1, cur_unit: "EUR", deal_bas_r: "1,500", cur_nm: "유로", ttb: "", tts: "", bkpr: "", yy_efee_r: "", ten_dd_efee_r: "", kftc_bkpr: "", kftc_deal_bas_r: "" },
        ]),
      });

    vi.stubGlobal("fetch", fetchMock);

    const result = await getMarketExchangeRates("testkey", "20260403");
    expect(result.rates).toHaveLength(1);
    expect(result.rates[0].currency).toBe("EUR");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("getMarketExchangeRates_7일연속빈응답_빈결과반환", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true, status: 200, json: () => Promise.resolve([]),
    }));

    const result = await getMarketExchangeRates("testkey", "20260403");
    expect(result.rates).toEqual([]);
  });

  it("getMarketExchangeRates_네트워크에러_빈결과반환", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("timeout")));
    const result = await getMarketExchangeRates("testkey", "20260403");
    expect(result.rates).toEqual([]);
  });
});
