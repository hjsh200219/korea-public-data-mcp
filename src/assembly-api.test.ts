/**
 * assembly-api.ts 단위 테스트
 * - envelope 파싱 (성공/INFO-200 빈 결과)
 * - 에러 응답 분기 (ERROR-300/310/336)
 * - URL 빌더 (KEY/Type/pIndex/pSize/AGE + extra params)
 * - 24개 named wrapper 호출 매핑
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  fetchAssembly,
  searchBills,
  getBillProcessing,
  getPendingBills,
  getProcessedBills,
  getRecentPlenaryBills,
  getPlenaryReferredBills,
  getCommitteeAlternativeBills,
  getPlenaryVoteBills,
  getVoteByBill,
  getPlenaryProcessedV1,
  getPlenaryProcessedV2,
  getPlenaryProcessedV3,
  getCurrentMembers,
  getMemberHistory,
  searchBillsExtended,
  getBillReceipts,
  getBillJudge,
  getBillDetail,
  getBillProposers,
  getBillCommitteeConferences,
  getMemberVotes,
  getPlenaryMinutes,
  getCommitteeMinutes,
  getPlenarySchedule,
} from "./assembly-api.js";

const TEST_KEY = "test-assembly-key";

function mockFetchOnce(payload: unknown, init?: ResponseInit): void {
  vi.spyOn(global, "fetch").mockResolvedValueOnce(
    new Response(JSON.stringify(payload), { status: 200, ...init }),
  );
}

function successEnvelope(datasetId: string, rows: Array<Record<string, unknown>>, total = rows.length): unknown {
  return {
    [datasetId]: [
      { head: [{ list_total_count: total }, { RESULT: { CODE: "INFO-000", MESSAGE: "정상 처리되었습니다." } }] },
      { row: rows },
    ],
  };
}

describe("fetchAssembly — envelope 파싱", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("성공 envelope에서 rows + totalCount 추출", async () => {
    mockFetchOnce(successEnvelope("nzmimeepazxkubdpn", [
      { BILL_ID: "PRC_ABC", BILL_NAME: "테스트 법률안" },
    ], 17286));
    const result = await fetchAssembly("nzmimeepazxkubdpn", TEST_KEY);
    expect(result.code).toBe("INFO-000");
    expect(result.totalCount).toBe(17286);
    expect(result.rows).toHaveLength(1);
    expect((result.rows[0] as { BILL_ID: string }).BILL_ID).toBe("PRC_ABC");
  });

  it("INFO-200 빈 결과는 정상 반환 (rows 빈 배열)", async () => {
    mockFetchOnce({ RESULT: { CODE: "INFO-200", MESSAGE: "해당하는 데이터가 없습니다." } });
    const result = await fetchAssembly("nzmimeepazxkubdpn", TEST_KEY);
    expect(result.code).toBe("INFO-200");
    expect(result.rows).toEqual([]);
    expect(result.totalCount).toBe(0);
  });

  it("ERROR-300 (필수 param 누락) throw", async () => {
    mockFetchOnce({ RESULT: { CODE: "ERROR-300", MESSAGE: "필수 값이 누락되어 있습니다." } });
    await expect(fetchAssembly("nzmimeepazxkubdpn", TEST_KEY)).rejects.toThrow(/ERROR-300/);
  });

  it("ERROR-310 (invalid ID) throw", async () => {
    mockFetchOnce({ RESULT: { CODE: "ERROR-310", MESSAGE: "해당하는 서비스를 찾을 수 없습니다." } });
    await expect(fetchAssembly("BADID", TEST_KEY)).rejects.toThrow(/ERROR-310/);
  });

  it("HTTP 5xx throw", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response("Internal Server Error", { status: 500 }),
    );
    await expect(fetchAssembly("nzmimeepazxkubdpn", TEST_KEY)).rejects.toThrow(/500/);
  });

  it("URL 빌더: KEY/Type=json/pIndex/pSize/AGE + extra params 포함", async () => {
    const spy = vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(successEnvelope("nzmimeepazxkubdpn", [])), { status: 200 }),
    );
    await fetchAssembly("nzmimeepazxkubdpn", TEST_KEY, {
      pIndex: 2,
      pSize: 50,
      AGE: 22,
      extra: { BILL_NAME: "교원" },
    });
    const calledUrl = spy.mock.calls[0]?.[0] as string;
    expect(calledUrl).toContain("https://open.assembly.go.kr/portal/openapi/nzmimeepazxkubdpn");
    expect(calledUrl).toContain("KEY=test-assembly-key");
    expect(calledUrl).toContain("Type=json");
    expect(calledUrl).toContain("pIndex=2");
    expect(calledUrl).toContain("pSize=50");
    expect(calledUrl).toContain("AGE=22");
    expect(calledUrl).toContain("BILL_NAME=%EA%B5%90%EC%9B%90");
  });

  it("pSize 1000 초과 시 clamp to 1000", async () => {
    const spy = vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(successEnvelope("nzmimeepazxkubdpn", [])), { status: 200 }),
    );
    await fetchAssembly("nzmimeepazxkubdpn", TEST_KEY, { pSize: 9999 });
    const calledUrl = spy.mock.calls[0]?.[0] as string;
    expect(calledUrl).toContain("pSize=1000");
  });

  it("pIndex 0 이하 시 1로 보정", async () => {
    const spy = vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(successEnvelope("nzmimeepazxkubdpn", [])), { status: 200 }),
    );
    await fetchAssembly("nzmimeepazxkubdpn", TEST_KEY, { pIndex: 0 });
    const calledUrl = spy.mock.calls[0]?.[0] as string;
    expect(calledUrl).toContain("pIndex=1");
  });

  it("빈 datasetId reject", async () => {
    await expect(fetchAssembly("", TEST_KEY)).rejects.toThrow(/datasetId/);
  });

  it("빈 apiKey reject", async () => {
    await expect(fetchAssembly("nzmimeepazxkubdpn", "")).rejects.toThrow(/apiKey/);
  });
});

describe("named wrappers — dataset_id 매핑", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const cases: Array<[string, string, () => Promise<unknown>]> = [
    ["searchBills", "nzmimeepazxkubdpn", () => searchBills(TEST_KEY)],
    ["getBillProcessing", "nwbpacrgavhjryiph", () => getBillProcessing(TEST_KEY, { AGE: 22 })],
    ["getPendingBills", "nwbqublzajtcqpdae", () => getPendingBills(TEST_KEY)],
    ["getProcessedBills", "nzpltgfqabtcpsmai", () => getProcessedBills(TEST_KEY, { AGE: 22 })],
    ["getRecentPlenaryBills", "nxjuyqnxadtotdrbw", () => getRecentPlenaryBills(TEST_KEY, { AGE: 22 })],
    ["getPlenaryReferredBills", "nayjnliqaexiioauy", () => getPlenaryReferredBills(TEST_KEY)],
    ["getCommitteeAlternativeBills", "nxtkyptyaolzcbfwl", () => getCommitteeAlternativeBills(TEST_KEY)],
    ["getPlenaryVoteBills", "VCONFBILLLIST", () => getPlenaryVoteBills(TEST_KEY)],
    ["getVoteByBill", "ncocpgfiaoituanbr", () => getVoteByBill(TEST_KEY, { AGE: 22 })],
    ["getPlenaryProcessedV1", "nkalemivaqmoibxro", () => getPlenaryProcessedV1(TEST_KEY, { AGE: 22 })],
    ["getPlenaryProcessedV2", "nbslryaradshbpbpm", () => getPlenaryProcessedV2(TEST_KEY, { AGE: 22 })],
    ["getPlenaryProcessedV3", "nzgjnvnraowulzqwl", () => getPlenaryProcessedV3(TEST_KEY, { AGE: 22 })],
    ["getCurrentMembers", "nwvrqwxyaytdsfvhu", () => getCurrentMembers(TEST_KEY, { AGE: 22 })],
    ["getMemberHistory", "ALLNAMEMBER", () => getMemberHistory(TEST_KEY)],
    ["searchBillsExtended", "TVBPMBILL11", () => searchBillsExtended(TEST_KEY)],
    ["getBillReceipts", "BILLRCP", () => getBillReceipts(TEST_KEY)],
    ["getBillJudge", "BILLJUDGE", () => getBillJudge(TEST_KEY)],
    ["getBillDetail", "BILLINFODETAIL", () => getBillDetail(TEST_KEY, { extra: { BILL_ID: "PRC_X" } })],
    ["getBillProposers", "BILLINFOPPSR", () => getBillProposers(TEST_KEY, { extra: { BILL_ID: "PRC_X" } })],
    ["getBillCommitteeConferences", "BILLJUDGECONF", () => getBillCommitteeConferences(TEST_KEY, { extra: { BILL_ID: "PRC_X" } })],
    ["getMemberVotes", "nojepdqqaweusdfbi", () => getMemberVotes(TEST_KEY, { extra: { BILL_ID: "PRC_X" } })],
    ["getPlenaryMinutes", "nzbyfwhwaoanttzje", () => getPlenaryMinutes(TEST_KEY, { extra: { DAE_NUM: "22", CONF_DATE: "2025" } })],
    ["getCommitteeMinutes", "ncwgseseafwbuheph", () => getCommitteeMinutes(TEST_KEY, { extra: { DAE_NUM: "22", CONF_DATE: "2025" } })],
    ["getPlenarySchedule", "nekcaiymatialqlxr", () => getPlenarySchedule(TEST_KEY, { extra: { UNIT_CD: "100022" } })],
  ];

  for (const [name, datasetId, fn] of cases) {
    it(`${name} → ${datasetId}`, async () => {
      const spy = vi.spyOn(global, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify(successEnvelope(datasetId, [])), { status: 200 }),
      );
      await fn();
      const calledUrl = spy.mock.calls[0]?.[0] as string;
      expect(calledUrl).toContain(`/portal/openapi/${datasetId}`);
    });
  }
});
