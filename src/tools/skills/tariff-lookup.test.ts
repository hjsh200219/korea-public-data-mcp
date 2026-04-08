import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../unipass-api.js", () => ({
  searchHsCode: vi.fn(),
  getTariffRate: vi.fn(),
  getCustomsExchangeRates: vi.fn(),
  getSimpleDrawbackRate: vi.fn(),
  getSimpleDrawbackCompany: vi.fn(),
  getExportPeriodShortTarget: vi.fn(),
  getStatisticsCode: vi.fn(),
  getHsCodeNavigation: vi.fn(),
}));

vi.mock("../../exim-api.js", () => ({
  getMarketExchangeRates: vi.fn(),
}));

import {
  searchHsCode,
  getTariffRate,
  getCustomsExchangeRates,
  getSimpleDrawbackRate,
  getSimpleDrawbackCompany,
  getExportPeriodShortTarget,
  getStatisticsCode,
  getHsCodeNavigation,
} from "../../unipass-api.js";
import { getMarketExchangeRates } from "../../exim-api.js";
import { createTariffLookupHandler } from "./tariff-lookup.js";

const MOCK_KEYS = { "018": "test-key" };

describe("tariff_lookup 스킬", () => {
  let handler: ReturnType<typeof createTariffLookupHandler>;

  beforeEach(() => {
    vi.clearAllMocks();
    handler = createTariffLookupHandler(MOCK_KEYS, "exim-test-key");
  });

  // -- action 라우팅 --

  it("알수없는action_isError반환", async () => {
    const result = await handler({ action: "nonexistent" } as any);
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("알 수 없는 action");
  });

  // -- search_hs --

  it("search_hs_유효한결과_포맷팅반환", async () => {
    vi.mocked(searchHsCode).mockResolvedValue([
      { hsSgn: "0201", korePrnm: "소고기", englPrnm: "Beef", txrt: "40", txtpSgn: "기본" },
    ] as any);

    const result = await handler({ action: "search_hs", hs_code: "0201" });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("0201");
    expect(result.content[0].text).toContain("소고기");
    expect(searchHsCode).toHaveBeenCalledWith(MOCK_KEYS, "0201");
  });

  it("search_hs_빈결과_안내메시지", async () => {
    vi.mocked(searchHsCode).mockResolvedValue([]);

    const result = await handler({ action: "search_hs", hs_code: "9999" });
    expect(result.content[0].text).toContain("결과가 없습니다");
  });

  it("search_hs_hs_code누락_에러", async () => {
    const result = await handler({ action: "search_hs" } as any);
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("hs_code");
  });

  // -- tariff_rate --

  it("tariff_rate_유효한결과_포맷팅반환", async () => {
    vi.mocked(getTariffRate).mockResolvedValue([
      { hsSgn: "0201100000", trrtTpNm: "기본세율", trrtTpcd: "A", trrt: "40", aplyStrtDt: "20200101", aplyEndDt: "99991231" },
    ] as any);

    const result = await handler({ action: "tariff_rate", hs_code: "0201100000" });
    expect(result.content[0].text).toContain("관세율");
    expect(getTariffRate).toHaveBeenCalledWith(MOCK_KEYS, "0201100000");
  });

  it("tariff_rate_빈배열_안내", async () => {
    vi.mocked(getTariffRate).mockResolvedValue([]);
    const r = await handler({ action: "tariff_rate", hs_code: "9999999999" });
    expect(r.isError).toBeUndefined();
    expect(r.content[0].text).toContain("관세율 조회 검색 결과가 없습니다");
  });

  // -- customs_rate --

  it("customs_rate_유효한결과_포맷팅반환", async () => {
    vi.mocked(getCustomsExchangeRates).mockResolvedValue({
      rates: [{ currSgn: "USD", mtryUtNm: "미국 달러", fxrt: "1350.00", aplyBgnDt: "20260101", cntySgn: "US", imexTp: "1" }],
      queriedDate: "20260403",
      isFallback: false,
    } as any);

    const result = await handler({ action: "customs_rate" });
    expect(result.content[0].text).toContain("USD");
    expect(result.content[0].text).toContain("2026-04-03");
    expect(getCustomsExchangeRates).toHaveBeenCalledWith(MOCK_KEYS, undefined);
  });

  it("customs_rate_폴백시_안내메시지포함", async () => {
    vi.mocked(getCustomsExchangeRates).mockResolvedValue({
      rates: [{ currSgn: "USD", mtryUtNm: "미국 달러", fxrt: "1350.00", aplyBgnDt: "20260327", cntySgn: "US", imexTp: "1" }],
      queriedDate: "20260327",
      isFallback: true,
    } as any);

    const result = await handler({ action: "customs_rate" });
    expect(result.content[0].text).toContain("데이터 없음");
    expect(result.content[0].text).toContain("2026-03-27");
  });

  it("customs_rate_통화지정_전달", async () => {
    vi.mocked(getCustomsExchangeRates).mockResolvedValue({
      rates: [],
      queriedDate: "20260403",
      isFallback: false,
    } as any);

    await handler({ action: "customs_rate", currencies: ["USD", "EUR"] });
    expect(getCustomsExchangeRates).toHaveBeenCalledWith(MOCK_KEYS, ["USD", "EUR"]);
  });

  it("customs_rate_빈rates_안내", async () => {
    vi.mocked(getCustomsExchangeRates).mockResolvedValue({ rates: [], queriedDate: "20260403", isFallback: false } as any);
    const r = await handler({ action: "customs_rate" });
    expect(r.isError).toBeUndefined();
    expect(r.content[0].text).toContain("관세 환율 정보를 찾을 수 없습니다");
  });

  // -- simple_drawback --

  it("simple_drawback_base_date필수", async () => {
    const result = await handler({ action: "simple_drawback" } as any);
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("base_date");
  });

  it("simple_drawback_유효한결과", async () => {
    vi.mocked(getSimpleDrawbackRate).mockResolvedValue([
      { hs10: "0201100000", prutDrwbWncrAmt: "500" },
    ] as any);

    const result = await handler({ action: "simple_drawback", base_date: "20260101" });
    expect(result.content[0].text).toContain("환급율");
  });

  it("simple_drawback_빈배열_결과없음", async () => {
    vi.mocked(getSimpleDrawbackRate).mockResolvedValue([]);
    const r = await handler({ action: "simple_drawback", base_date: "20260101" });
    expect(r.isError).toBeUndefined();
    expect(r.content[0].text).toContain("결과가 없습니다");
  });

  // -- simple_drawback_company --

  it("simple_drawback_company_유효한결과", async () => {
    vi.mocked(getSimpleDrawbackCompany).mockResolvedValue({
      conm: "테스트기업", rgsrCstmNm: "인천세관", simlFxamtAplyApreDt: "20250101",
    } as any);

    const result = await handler({ action: "simple_drawback_company", business_no: "1234567890" });
    expect(result.content[0].text).toContain("테스트기업");
  });

  it("simple_drawback_company_null_결과없음", async () => {
    vi.mocked(getSimpleDrawbackCompany).mockResolvedValue(null as any);
    const r = await handler({ action: "simple_drawback_company", business_no: "0000000000" });
    expect(r.isError).toBeUndefined();
    expect(r.content[0].text).toContain("결과를 찾을 수 없습니다");
  });

  // -- export_period_short --

  it("export_period_short_유효한결과", async () => {
    vi.mocked(getExportPeriodShortTarget).mockResolvedValue([
      { hsSgn: "0201", prnm: "소고기", ffmnTmlmDt: "20261231" },
    ] as any);

    const result = await handler({ action: "export_period_short", hs_code: "0201" });
    expect(result.content[0].text).toContain("수출이행기간");
  });

  it("export_period_short_빈배열_결과없음", async () => {
    vi.mocked(getExportPeriodShortTarget).mockResolvedValue([]);
    const r = await handler({ action: "export_period_short", hs_code: "9999" });
    expect(r.isError).toBeUndefined();
    expect(r.content[0].text).toContain("결과가 없습니다");
  });

  // -- statistics_code --

  it("statistics_code_code_type필수", async () => {
    const result = await handler({ action: "statistics_code" } as any);
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("code_type");
  });

  it("statistics_code_유효한결과", async () => {
    vi.mocked(getStatisticsCode).mockResolvedValue([
      { statsSgn: "A01", koreAbrt: "한국", englAbrt: "Korea" },
    ] as any);

    const result = await handler({ action: "statistics_code", code_type: "country" });
    expect(result.content[0].text).toContain("통계부호");
  });

  it("statistics_code_빈배열_결과없음", async () => {
    vi.mocked(getStatisticsCode).mockResolvedValue([]);
    const r = await handler({ action: "statistics_code", code_type: "country" });
    expect(r.isError).toBeUndefined();
    expect(r.content[0].text).toContain("결과가 없습니다");
  });

  // -- hs_navigation --

  it("hs_navigation_유효한결과", async () => {
    vi.mocked(getHsCodeNavigation).mockResolvedValue([
      { hs10Sgn: "0201100000", prlstNm: "소고기 뼈 붙은 것", acrsTcntRnk: "1" },
    ] as any);

    const result = await handler({ action: "hs_navigation", hs_code: "0201" });
    expect(result.content[0].text).toContain("내비게이션");
  });

  it("hs_navigation_빈배열_결과없음", async () => {
    vi.mocked(getHsCodeNavigation).mockResolvedValue([]);
    const r = await handler({ action: "hs_navigation", hs_code: "9999" });
    expect(r.isError).toBeUndefined();
    expect(r.content[0].text).toContain("결과가 없습니다");
  });

  // -- market_exchange --

  it("market_exchange_유효한결과", async () => {
    vi.mocked(getMarketExchangeRates).mockResolvedValue({
      rates: [{ currency: "USD", currencyName: "미국 달러", dealBaseRate: 1350, ttBuy: "1348", ttSell: "1352", baseRate: "1350" }],
      queriedDate: "20260403",
      isFallback: false,
    } as any);

    const result = await handler({ action: "market_exchange" });
    expect(result.content[0].text).toContain("시장 환율");
    expect(result.content[0].text).toContain("2026-04-03");
    expect(getMarketExchangeRates).toHaveBeenCalledWith("exim-test-key", undefined);
  });

  it("market_exchange_폴백시_안내메시지포함", async () => {
    vi.mocked(getMarketExchangeRates).mockResolvedValue({
      rates: [{ currency: "USD", currencyName: "미국 달러", dealBaseRate: 1350, ttBuy: "1348", ttSell: "1352", baseRate: "1350" }],
      queriedDate: "20260403",
      isFallback: true,
    } as any);

    const result = await handler({ action: "market_exchange" });
    expect(result.content[0].text).toContain("비영업일");
    expect(result.content[0].text).toContain("2026-04-03");
  });

  it("market_exchange_빈rates_안내", async () => {
    vi.mocked(getMarketExchangeRates).mockResolvedValue({ rates: [], queriedDate: "20260403", isFallback: false } as any);
    const r = await handler({ action: "market_exchange" });
    expect(r.isError).toBeUndefined();
    expect(r.content[0].text).toContain("환율 정보를 찾을 수 없습니다");
  });

  it("market_exchange_eximApiKey없으면_안내", async () => {
    const noEximHandler = createTariffLookupHandler(MOCK_KEYS, undefined);
    const result = await noEximHandler({ action: "market_exchange" });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("EXCHANGE_RATE_API_KEY");
  });

  // -- API 에러 처리 --

  it("API예외_errorResponse반환", async () => {
    vi.mocked(searchHsCode).mockRejectedValue(new Error("Network timeout"));

    const result = await handler({ action: "search_hs", hs_code: "0201" });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Network timeout");
  });
});
