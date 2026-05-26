/**
 * assembly 스킬 단위 테스트
 * - 14 action dispatcher routing
 * - 알 수 없는 action 에러
 * - 빈 결과 emptyResultMessage
 * - 출력 포맷 검증 (Korean 헤더 + bullet + 페이지 footer)
 * - 에러 전파 (errorResponse)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { createAssemblyHandler } from "./assembly.js";

const TEST_KEY = "test-key";

function mockFetchPayload(payload: unknown): void {
  vi.spyOn(global, "fetch").mockResolvedValueOnce(
    new Response(JSON.stringify(payload), { status: 200 }),
  );
}

function successEnv(datasetId: string, rows: Array<Record<string, unknown>>, total = rows.length): unknown {
  return {
    [datasetId]: [
      { head: [{ list_total_count: total }, { RESULT: { CODE: "INFO-000", MESSAGE: "정상" } }] },
      { row: rows },
    ],
  };
}

describe("assembly dispatcher — action routing", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("알 수 없는 action → isError true", async () => {
    const handler = createAssemblyHandler(TEST_KEY);
    const result = await handler({ action: "unknown_action" as never });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("알 수 없는 action");
  });

  // 액션 → dataset ID 매핑. 필수 param 있는 액션은 미리 채워서 통과시킴.
  const routingCases: Array<[string, string, Partial<Record<string, string>>?]> = [
    ["bill_search", "nzmimeepazxkubdpn"],
    ["bill_search_extended", "TVBPMBILL11"],
    ["bill_processing", "nwbpacrgavhjryiph"],
    ["bill_pending", "nwbqublzajtcqpdae"],
    ["bill_processed", "nzpltgfqabtcpsmai"],
    ["bill_recent_plenary", "nxjuyqnxadtotdrbw"],
    ["bill_plenary_referred", "nayjnliqaexiioauy"],
    ["bill_committee_alt", "nxtkyptyaolzcbfwl"],
    ["bill_receipts", "BILLRCP"],
    ["bill_judge", "BILLJUDGE"],
    ["bill_detail", "BILLINFODETAIL", { bill_id: "PRC_X" }],
    ["bill_proposers", "BILLINFOPPSR", { bill_id: "PRC_X" }],
    ["plenary_vote_bills", "VCONFBILLLIST"],
    ["plenary_processed_law", "nkalemivaqmoibxro"],
    ["plenary_processed_budget", "nbslryaradshbpbpm"],
    ["plenary_processed_etc", "nzgjnvnraowulzqwl"],
    ["vote_by_bill", "ncocpgfiaoituanbr"],
    ["member_votes", "nojepdqqaweusdfbi", { bill_id: "PRC_X" }],
    ["plenary_minutes", "nzbyfwhwaoanttzje", { dae_num: "22", conf_date: "2025" }],
    ["committee_minutes", "ncwgseseafwbuheph", { dae_num: "22", conf_date: "2025" }],
    ["plenary_schedule", "nekcaiymatialqlxr", { unit_cd: "100022" }],
    ["bill_committee_conferences", "BILLJUDGECONF", { bill_id: "PRC_X" }],
    ["member_current", "nwvrqwxyaytdsfvhu"],
    ["member_history", "ALLNAMEMBER"],
  ];

  for (const [action, datasetId, extraParams] of routingCases) {
    it(`${action} → URL /portal/openapi/${datasetId}`, async () => {
      const handler = createAssemblyHandler(TEST_KEY);
      const spy = vi.spyOn(global, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify(successEnv(datasetId, [])), { status: 200 }),
      );
      await handler({ action: action as never, ...(extraParams ?? {}) });
      const calledUrl = spy.mock.calls[0]?.[0] as string;
      expect(calledUrl).toContain(`/portal/openapi/${datasetId}`);
    });
  }
});

describe("assembly — 필수 param 검증", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const requiredCases: Array<[string, string[]]> = [
    ["bill_detail", ["bill_id"]],
    ["bill_proposers", ["bill_id"]],
    ["member_votes", ["bill_id"]],
    ["bill_committee_conferences", ["bill_id"]],
    ["plenary_minutes", ["dae_num", "conf_date"]],
    ["committee_minutes", ["dae_num", "conf_date"]],
    ["plenary_schedule", ["unit_cd"]],
  ];

  for (const [action, params] of requiredCases) {
    it(`${action} → ${params.join("+")} 누락 시 isError`, async () => {
      const handler = createAssemblyHandler(TEST_KEY);
      const result = await handler({ action: action as never });
      expect(result.isError).toBe(true);
      for (const p of params) {
        expect(result.content[0].text).toContain(p);
      }
    });
  }
});

describe("assembly — 출력 포맷", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("bill_search: 헤더 + 행 + 페이지 footer", async () => {
    mockFetchPayload(successEnv("nzmimeepazxkubdpn", [
      { BILL_ID: "PRC_X", BILL_NO: "2219057", BILL_NAME: "교원의 지위 향상법", PROPOSE_DT: "2026-05-22", PROPOSER: "홍길동" },
    ], 17286));
    const handler = createAssemblyHandler(TEST_KEY);
    const result = await handler({ action: "bill_search", page: 1, size: 10 });
    expect(result.isError).toBeUndefined();
    const txt = result.content[0].text;
    expect(txt).toContain("📋 의안정보 검색");
    expect(txt).toContain("교원의 지위 향상법");
    expect(txt).toContain("No.2219057");
    expect(txt).toContain("홍길동");
    expect(txt).toContain("총 17,286건");
    expect(txt).toContain("페이지 1/1729");
  });

  it("plenary_vote_bills: 표결 정보 표시", async () => {
    mockFetchPayload(successEnv("VCONFBILLLIST", [
      { CONF_ID: "N054276", ERACO: "제22대", SESS: "제435회", DGR: "제2차", BILL_NM: "계량법 일부개정안", ANS_VOTE_CNT: 250, NO_VOTE_CNT: 3, BLANK_VOTE_CNT: 1, RESULT_VOTE_MOD: "가결" },
    ], 201911));
    const handler = createAssemblyHandler(TEST_KEY);
    const result = await handler({ action: "plenary_vote_bills" });
    const txt = result.content[0].text;
    expect(txt).toContain("🗳️ 본회의 의결안건");
    expect(txt).toContain("계량법 일부개정안");
    expect(txt).toContain("찬성 250");
    expect(txt).toContain("반대 3");
    expect(txt).toContain("기권 1");
    expect(txt).toContain("결과: 가결");
  });

  it("member_current: 정당·지역구·연락처 표시", async () => {
    mockFetchPayload(successEnv("nwvrqwxyaytdsfvhu", [
      { HG_NM: "강경숙", HJ_NM: "姜景淑", POLY_NM: "조국혁신당", ORIG_NM: "비례대표", ELECT_GBN_NM: "비례대표", CMIT_NM: "교육위원회", TEL_NO: "02-1234-5678", E_MAIL: "test@assembly.go.kr" },
    ], 286));
    const handler = createAssemblyHandler(TEST_KEY);
    const result = await handler({ action: "member_current", age: 22 });
    const txt = result.content[0].text;
    expect(txt).toContain("👤 현직 국회의원 (22대)");
    expect(txt).toContain("강경숙 (姜景淑)");
    expect(txt).toContain("조국혁신당");
    expect(txt).toContain("☎ 02-1234-5678");
    expect(txt).toContain("✉ test@assembly.go.kr");
  });

  it("빈 결과 → emptyResultMessage", async () => {
    mockFetchPayload({ RESULT: { CODE: "INFO-200", MESSAGE: "해당하는 데이터가 없습니다." } });
    const handler = createAssemblyHandler(TEST_KEY);
    const result = await handler({ action: "bill_search", page: 99 });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("의안정보 검색 검색 결과가 없습니다");
  });

  it("ERROR-300 → errorResponse (isError true)", async () => {
    mockFetchPayload({ RESULT: { CODE: "ERROR-300", MESSAGE: "필수 값이 누락되어 있습니다." } });
    const handler = createAssemblyHandler(TEST_KEY);
    const result = await handler({ action: "bill_search" });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("ERROR-300");
  });

  it("query 필터 — bill_name → BILL_NAME 인자 전달", async () => {
    const spy = vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(successEnv("nzmimeepazxkubdpn", [])), { status: 200 }),
    );
    const handler = createAssemblyHandler(TEST_KEY);
    await handler({ action: "bill_search", bill_name: "교원", page: 2, size: 50 });
    const url = spy.mock.calls[0]?.[0] as string;
    expect(url).toContain("BILL_NAME=%EA%B5%90%EC%9B%90");
    expect(url).toContain("pIndex=2");
    expect(url).toContain("pSize=50");
  });

  it("query 필터 — bill_processing: COMMITTEE_NM 인자 전달", async () => {
    const spy = vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(successEnv("nwbpacrgavhjryiph", [])), { status: 200 }),
    );
    const handler = createAssemblyHandler(TEST_KEY);
    await handler({ action: "bill_processing", committee_nm: "정무위원회", age: 22 });
    const url = spy.mock.calls[0]?.[0] as string;
    expect(url).toContain("COMMITTEE_NM=%EC%A0%95%EB%AC%B4%EC%9C%84%EC%9B%90%ED%9A%8C");
    expect(url).toContain("AGE=22");
  });

  it("query 필터 — member_current: POLY_NM 인자 전달", async () => {
    const spy = vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(successEnv("nwvrqwxyaytdsfvhu", [])), { status: 200 }),
    );
    const handler = createAssemblyHandler(TEST_KEY);
    await handler({ action: "member_current", poly_nm: "국민의힘" });
    const url = spy.mock.calls[0]?.[0] as string;
    expect(url).toContain("POLY_NM=%EA%B5%AD%EB%AF%BC%EC%9D%98%ED%9E%98");
  });
});
