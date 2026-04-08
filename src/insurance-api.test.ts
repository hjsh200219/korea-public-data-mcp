import { describe, it, expect, vi, beforeEach } from "vitest";

const { fetchWithRetry } = vi.hoisted(() => ({
  fetchWithRetry: vi.fn(),
}));

vi.mock("./http-client.js", () => ({
  fetchWithRetry,
}));

import {
  searchMedicalReimbursementInsurance,
  searchPropertyInsuJoin,
  searchAutoContract,
  searchAutoLosCircumstance,
  searchAutoVictim,
  searchVariableInsuranceFund,
  searchLifeInsuJoinStatus,
  searchIndividualAnnuityInsu,
  searchRetirementPensionFund,
} from "./insurance-api.js";

function apiJson(body: Record<string, unknown>, ok = true, status = 200) {
  return {
    ok,
    status,
    json: async () => body,
  } as any;
}

function successBody(item: Record<string, unknown>) {
  return {
    response: {
      header: { resultCode: "00", resultMsg: "NORMAL SERVICE." },
      body: {
        items: { item: [item] },
        totalCount: 1,
        pageNo: 1,
        numOfRows: 10,
      },
    },
  };
}

describe("insurance-api", () => {
  beforeEach(() => {
    fetchWithRetry.mockReset();
  });

  it("searchMedicalReimbursementInsurance_성공_아이템파싱", async () => {
    const row = { cmpyNm: "보험사", prdNm: "실손" };
    fetchWithRetry.mockResolvedValue(apiJson(successBody(row)));

    const res = await searchMedicalReimbursementInsurance("svc", {
      basDt: "20240101",
      pageNo: 1,
      numOfRows: 10,
    });

    expect(res.items).toEqual([row]);
    expect(res.totalCount).toBe(1);
    const url = fetchWithRetry.mock.calls[0][0] as string;
    expect(url).toContain("GetMedicalReimbursementInsuranceInfoService");
    expect(url).toContain("serviceKey=svc");
    expect(url).toContain("basDt=20240101");
    expect(url).toContain("resultType=json");
  });

  it("searchMedicalReimbursementInsurance_resultCode오류_예외", async () => {
    fetchWithRetry.mockResolvedValue(
      apiJson({
        response: {
          header: { resultCode: "30", resultMsg: "BAD KEY" },
          body: {},
        },
      }),
    );

    await expect(
      searchMedicalReimbursementInsurance("k", {}),
    ).rejects.toThrow(/등록되지 않은 서비스 키/);
  });

  it("searchPropertyInsuJoin_성공", async () => {
    fetchWithRetry.mockResolvedValue(apiJson(successBody({ mogClsfNm: "화재" })));

    const res = await searchPropertyInsuJoin("key", {
      sttsAccmlTrgtYr: "2023",
    });
    expect(res.items[0]).toMatchObject({ mogClsfNm: "화재" });
    expect(fetchWithRetry.mock.calls[0][0] as string).toContain("getPropertyInsuJoinInfo");
  });

  it("searchAutoContract_단일item_배열로정규화", async () => {
    const single = { isuItmsNm: "종합" };
    fetchWithRetry.mockResolvedValue(
      apiJson({
        response: {
          header: { resultCode: "00", resultMsg: "OK" },
          body: {
            items: { item: single },
            totalCount: 1,
            pageNo: 1,
            numOfRows: 5,
          },
        },
      }),
    );

    const res = await searchAutoContract("k", { isuCmpyOfrYm: "202301" });
    expect(res.items).toEqual([single]);
    expect(fetchWithRetry.mock.calls[0][0] as string).toContain("getContractInfo");
  });

  it("searchAutoContract_HTTP오류_예외", async () => {
    fetchWithRetry.mockResolvedValue(apiJson({}, false, 500));

    await expect(searchAutoContract("k", {})).rejects.toThrow(/HTTP 500/);
  });

  it("searchAutoLosCircumstance_성공_아이템파싱", async () => {
    const row = { isuCmpyOfrYm: "202301", acdnCnt: "5" };
    fetchWithRetry.mockResolvedValue(apiJson(successBody(row)));

    const res = await searchAutoLosCircumstance("svc", { isuCmpyOfrYm: "202301" });
    expect(res.items).toEqual([row]);
    expect(fetchWithRetry.mock.calls[0][0] as string).toContain("getLosCircumstance");
  });

  it("searchAutoVictim_성공_아이템파싱", async () => {
    const row = { atmbAcdnCnlsYm: "202302", dthInjClsfNm: "부상" };
    fetchWithRetry.mockResolvedValue(apiJson(successBody(row)));

    const res = await searchAutoVictim("svc", { atmbAcdnCnlsYm: "202302" });
    expect(res.items).toEqual([row]);
    expect(fetchWithRetry.mock.calls[0][0] as string).toContain("getVictimInfo");
  });

  it("searchVariableInsuranceFund_성공_아이템파싱", async () => {
    const row = { cmpyNm: "생명사", fndNm: "성장펀드", fndCd: "F001" };
    fetchWithRetry.mockResolvedValue(apiJson(successBody(row)));

    const res = await searchVariableInsuranceFund("svc", { basDt: "20240101" });
    expect(res.items).toEqual([row]);
    expect(fetchWithRetry.mock.calls[0][0] as string).toContain("GetVariableInsuranceInfoService");
    expect(fetchWithRetry.mock.calls[0][0] as string).toContain("getFundInfo");
  });

  it("searchLifeInsuJoinStatus_성공_아이템파싱", async () => {
    const row = { sttsAccmlTrgtYr: "2023", areaNm: "서울", sexNm: "남" };
    fetchWithRetry.mockResolvedValue(apiJson(successBody(row)));

    const res = await searchLifeInsuJoinStatus("svc", { sttsAccmlTrgtYr: "2023" });
    expect(res.items).toEqual([row]);
    expect(fetchWithRetry.mock.calls[0][0] as string).toContain("getLifeInsuJoinStatus");
  });

  it("searchIndividualAnnuityInsu_성공_아이템파싱", async () => {
    const row = { sttsAccmlTrgtYr: "2023", taxPrqlYn: "Y", pymtMthNm: "월납" };
    fetchWithRetry.mockResolvedValue(apiJson(successBody(row)));

    const res = await searchIndividualAnnuityInsu("svc", { sttsAccmlTrgtYr: "2023" });
    expect(res.items).toEqual([row]);
    expect(fetchWithRetry.mock.calls[0][0] as string).toContain("getIndividualAnnuityInsuInfo");
  });

  it("searchRetirementPensionFund_성공_아이템파싱", async () => {
    const row = { cmpyNm: "퇴직운용", fndNm: "TDF2045", basDt: "20240401" };
    fetchWithRetry.mockResolvedValue(apiJson(successBody(row)));

    const res = await searchRetirementPensionFund("svc", { basDt: "20240401" });
    expect(res.items).toEqual([row]);
    expect(fetchWithRetry.mock.calls[0][0] as string).toContain("GetRetirementPensionInfoService");
    expect(fetchWithRetry.mock.calls[0][0] as string).toContain("getFundInfo");
  });
});
