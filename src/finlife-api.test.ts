import { describe, it, expect, vi, beforeEach } from "vitest";

const { fetchWithRetry } = vi.hoisted(() => ({
  fetchWithRetry: vi.fn(),
}));

vi.mock("./http-client.js", () => ({
  fetchWithRetry,
}));

import {
  fetchCompanies,
  fetchDepositProducts,
  fetchSavingProducts,
  fetchAnnuityProducts,
  fetchMortgageLoanProducts,
  fetchRentHouseLoanProducts,
  fetchCreditLoanProducts,
} from "./finlife-api.js";

function finlifeJsonResponse(payload: Record<string, unknown>, ok = true, status = 200) {
  return {
    ok,
    status,
    json: async () => payload,
  } as any;
}

function successResult(base: unknown[], options: unknown[] = []) {
  return {
    result: {
      err_cd: "000",
      err_msg: "정상",
      prdt_div: "D",
      total_count: 1,
      max_page_no: 1,
      now_page_no: 1,
      baseList: base,
      optionList: options,
    },
  };
}

describe("finlife-api", () => {
  beforeEach(() => {
    fetchWithRetry.mockReset();
  });

  const params = { topFinGrpNo: "020000" as const, pageNo: 1 };

  it("fetchCompanies_성공_언랩결과", async () => {
    const base = [{ fin_co_no: "001", kor_co_nm: "은행" }];
    fetchWithRetry.mockResolvedValue(finlifeJsonResponse(successResult(base)));

    const out = await fetchCompanies("secret", params);
    expect(out.baseList).toEqual(base);
    expect(out.totalCount).toBe(1);
    expect(fetchWithRetry).toHaveBeenCalledWith(
      expect.stringContaining("companySearch.json"),
      expect.objectContaining({
        init: expect.objectContaining({
          headers: { "User-Agent": "Mozilla/5.0 (KoreanPublicDataMCP)" },
        }),
      }),
    );
    const url = fetchWithRetry.mock.calls[0][0] as string;
    expect(url).toContain("auth=secret");
    expect(url).toContain("topFinGrpNo=020000");
  });

  it("fetchCompanies_api키_접미사제거", async () => {
    fetchWithRetry.mockResolvedValue(finlifeJsonResponse(successResult([])));

    await fetchCompanies("abc@content2@", params);
    const url = fetchWithRetry.mock.calls[0][0] as string;
    expect(url).toContain("auth=abc");
  });

  it("fetchCompanies_err_cd비정상_예외", async () => {
    fetchWithRetry.mockResolvedValue(
      finlifeJsonResponse({
        result: { err_cd: "999", err_msg: "실패", total_count: 0, max_page_no: 1, now_page_no: 1 },
      }),
    );

    await expect(fetchCompanies("k", params)).rejects.toThrow(/999/);
  });

  it("fetchCompanies_HTTP비정상_예외", async () => {
    fetchWithRetry.mockResolvedValue(finlifeJsonResponse({}, false, 503));

    await expect(fetchCompanies("k", params)).rejects.toThrow(/503/);
  });

  it("fetchDepositProducts_성공", async () => {
    fetchWithRetry.mockResolvedValue(finlifeJsonResponse(successResult([{ fin_prdt_cd: "d1" }])));

    const out = await fetchDepositProducts("k", { ...params, finCoNo: "F1" });
    expect(out.baseList).toHaveLength(1);
    expect(fetchWithRetry.mock.calls[0][0] as string).toContain("depositProductsSearch.json");
    expect(fetchWithRetry.mock.calls[0][0] as string).toContain("finCoNo=F1");
  });

  it("fetchSavingProducts_성공", async () => {
    fetchWithRetry.mockResolvedValue(finlifeJsonResponse(successResult([])));

    await fetchSavingProducts("k", params);
    expect(fetchWithRetry.mock.calls[0][0] as string).toContain("savingProductsSearch.json");
  });

  it("fetchAnnuityProducts_성공", async () => {
    fetchWithRetry.mockResolvedValue(finlifeJsonResponse(successResult([])));

    await fetchAnnuityProducts("k", params);
    expect(fetchWithRetry.mock.calls[0][0] as string).toContain("annuitySavingProductsSearch.json");
  });

  it("fetchMortgageLoanProducts_성공", async () => {
    fetchWithRetry.mockResolvedValue(finlifeJsonResponse(successResult([])));

    await fetchMortgageLoanProducts("k", params);
    expect(fetchWithRetry.mock.calls[0][0] as string).toContain("mortgageLoanProductsSearch.json");
  });

  it("fetchRentHouseLoanProducts_성공", async () => {
    fetchWithRetry.mockResolvedValue(finlifeJsonResponse(successResult([])));

    await fetchRentHouseLoanProducts("k", params);
    expect(fetchWithRetry.mock.calls[0][0] as string).toContain("rentHouseLoanProductsSearch.json");
  });

  it("fetchCreditLoanProducts_성공", async () => {
    fetchWithRetry.mockResolvedValue(finlifeJsonResponse(successResult([])));

    await fetchCreditLoanProducts("k", params);
    expect(fetchWithRetry.mock.calls[0][0] as string).toContain("creditLoanProductsSearch.json");
  });
});
