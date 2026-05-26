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

describe("assembly — 전 렌더러 커버리지", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("bill_processing: BILL_NM/PROC_RESULT_CD/LINK_URL 렌더", async () => {
    mockFetchPayload(successEnv("nwbpacrgavhjryiph", [
      {
        AGE: "22", BILL_NO: "2218991", BILL_NM: "유엔참전용사 명예선양법", BILL_KIND: "법률안",
        PROPOSER: "정희용", COMMITTEE_NM: "정무위", PROC_RESULT_CD: "원안가결",
        PROPOSE_DT: "2026-05-01", LINK_URL: "https://example.kr/bill/1",
      },
    ], 1548));
    const r = await createAssemblyHandler(TEST_KEY)({ action: "bill_processing", age: 22 });
    const t = r.content[0].text;
    expect(t).toContain("⚖️ 법률안 처리현황");
    expect(t).toContain("유엔참전용사 명예선양법");
    expect(t).toContain("정희용");
    expect(t).toContain("정무위");
    expect(t).toContain("처리: 원안가결");
    expect(t).toContain("https://example.kr/bill/1");
  });

  it("bill_pending: PPSL_DT/JRCMIT_NM 렌더", async () => {
    mockFetchPayload(successEnv("nwbqublzajtcqpdae", [
      { BILL_ID: "PRC_X", BILL_NO: "2200001", BILL_KND: "법률안", BILL_NM: "테스트법", PPSR_NM: "홍길동", JRCMIT_NM: "법사위", PPSL_DT: "2026-01-01", LINK_URL: "https://x.kr" },
    ], 13152));
    const r = await createAssemblyHandler(TEST_KEY)({ action: "bill_pending" });
    const t = r.content[0].text;
    expect(t).toContain("⏳ 계류의안");
    expect(t).toContain("테스트법");
    expect(t).toContain("법사위");
    expect(t).toContain("제안 2026-01-01");
  });

  it("vote_by_bill: 재적/투표/찬성/반대/기권 렌더", async () => {
    mockFetchPayload(successEnv("ncocpgfiaoituanbr", [
      {
        BILL_ID: "PRC_X", BILL_NO: "2218872", BILL_NAME: "항공안전법 일부개정안",
        CURR_COMMITTEE: "국토교통위", PROC_DT: "2026-05-07", PROC_RESULT_CD: "원안가결",
        MEMBER_TCNT: 298, VOTE_TCNT: 250, YES_TCNT: 240, NO_TCNT: 5, BLANK_TCNT: 5,
        LINK_URL: "https://x.kr",
      },
    ], 1595));
    const r = await createAssemblyHandler(TEST_KEY)({ action: "vote_by_bill", age: 22 });
    const t = r.content[0].text;
    expect(t).toContain("🗳️ 의안별 표결현황");
    expect(t).toContain("재적 298");
    expect(t).toContain("투표 250");
    expect(t).toContain("찬성 240");
    expect(t).toContain("반대 5");
    expect(t).toContain("기권 5");
  });

  it("member_votes: 의원/정당/의안/표결결과 렌더", async () => {
    mockFetchPayload(successEnv("nojepdqqaweusdfbi", [
      { HG_NM: "홍길동", POLY_NM: "더불어민주당", ORIG_NM: "서울 강남", BILL_NO: "2200001", BILL_NAME: "테스트법", VOTE_DATE: "11-NOV-21", RESULT_VOTE_MOD: "찬성", BILL_URL: "https://x.kr" },
    ], 100));
    const r = await createAssemblyHandler(TEST_KEY)({ action: "member_votes", bill_id: "PRC_X" });
    const t = r.content[0].text;
    expect(t).toContain("🙋 국회의원 본회의 표결정보");
    expect(t).toContain("홍길동");
    expect(t).toContain("찬성");
    expect(t).toContain("더불어민주당");
  });

  it("plenary_minutes: 회의명/대수/PDF/VOD 링크 렌더", async () => {
    mockFetchPayload(successEnv("nzbyfwhwaoanttzje", [
      {
        CONFER_NUM: "1", TITLE: "제435회 본회의 제2차", CLASS_NAME: "본회의",
        DAE_NUM: "22", CONF_DATE: "2025-05-08", SUB_NAME: "계량법 외 11건",
        VOD_LINK_URL: "https://vod.kr", PDF_LINK_URL: "https://pdf.kr", CONF_LINK_URL: "https://conf.kr",
      },
    ], 50));
    const r = await createAssemblyHandler(TEST_KEY)({ action: "plenary_minutes", dae_num: "22", conf_date: "2025" });
    const t = r.content[0].text;
    expect(t).toContain("📜 본회의 회의록");
    expect(t).toContain("제435회 본회의 제2차");
    expect(t).toContain("제22대");
    expect(t).toContain("안건: 계량법 외 11건");
    expect(t).toContain("📄 https://pdf.kr");
    expect(t).toContain("🎥 https://vod.kr");
  });

  it("committee_minutes: 위원회명/안건 렌더", async () => {
    mockFetchPayload(successEnv("ncwgseseafwbuheph", [
      { TITLE: "교육위 제1차", DAE_NUM: "22", COMM_NAME: "교육위원회", CONF_DATE: "2025-05-01", PDF_LINK_URL: "https://pdf.kr" },
    ], 30));
    const r = await createAssemblyHandler(TEST_KEY)({ action: "committee_minutes", dae_num: "22", conf_date: "2025" });
    const t = r.content[0].text;
    expect(t).toContain("📜 위원회 회의록");
    expect(t).toContain("교육위 제1차");
    expect(t).toContain("교육위원회");
  });

  it("plenary_schedule: 제목/일자/CONTS 렌더", async () => {
    mockFetchPayload(successEnv("nekcaiymatialqlxr", [
      {
        MEETINGSESSION: "제435회 국회 임시회", CHA: "제2차", TITLE: "제435-2차 의사일정",
        MEETTING_DATE: "2026-05-08", MEETTING_TIME: "14:00", LINK_URL: "https://x.kr",
        UNIT_CD: "100022", UNIT_NM: "제22대",
        CONTS: "1. 헌법 개정안<br>2. 국가재정법",
      },
    ], 109));
    const r = await createAssemblyHandler(TEST_KEY)({ action: "plenary_schedule", unit_cd: "100022" });
    const t = r.content[0].text;
    expect(t).toContain("📅 본회의 일정");
    expect(t).toContain("제435-2차 의사일정");
    expect(t).toContain("제22대");
    expect(t).toContain("2026-05-08 14:00");
    expect(t).toContain("헌법 개정안");
  });

  it("bill_detail: 처리 단계 렌더 (위원회→법사위→본회의→공포)", async () => {
    mockFetchPayload(successEnv("BILLINFODETAIL", [
      {
        BILL_ID: "PRC_X", BILL_NO: "2214372", BILL_NM: "계량법 일부개정안",
        PPSR_KIND: "의원", PPSR: "김원이", JRCMIT_NM: "산자위",
        PPSL_DT: "2025-01-01", JRCMIT_PROC_DT: "2025-02-01", JRCMIT_PROC_RSLT: "수정가결",
        LAW_PROC_DT: "2025-03-01", LAW_PROC_RSLT: "원안가결",
        RGS_RSLN_DT: "2025-04-01", RGS_CONF_RSLT: "가결",
        PROM_DT: "2025-05-01", PROM_NO: "12345",
        LINK_URL: "https://x.kr",
      },
    ], 1));
    const r = await createAssemblyHandler(TEST_KEY)({ action: "bill_detail", bill_id: "PRC_X" });
    const t = r.content[0].text;
    expect(t).toContain("📖 의안 상세");
    expect(t).toContain("계량법 일부개정안");
    expect(t).toContain("위원회처리 2025-02-01 수정가결");
    expect(t).toContain("법사위 2025-03-01 원안가결");
    expect(t).toContain("본회의 2025-04-01 가결");
    expect(t).toContain("공포 2025-05-01 (제12345호)");
  });

  it("bill_proposers: 대표/공동/명단 렌더", async () => {
    mockFetchPayload(successEnv("BILLINFOPPSR", [
      { ERACO: "제22대", BILL_ID: "PRC_X", BILL_NO: "2214372", BILL_NM: "계량법", RST_PROPOSER: "김원이", PUBL_PROPOSER: "홍길동 외 9인", MEMBER_LIST: "홍길동·이순신·강감찬" },
    ], 10));
    const r = await createAssemblyHandler(TEST_KEY)({ action: "bill_proposers", bill_id: "PRC_X" });
    const t = r.content[0].text;
    expect(t).toContain("👥 의안 제안자");
    expect(t).toContain("대표발의: 김원이");
    expect(t).toContain("공동발의: 홍길동 외 9인");
    expect(t).toContain("명단:");
  });

  it("bill_committee_conferences: 회의명/처리결과 렌더", async () => {
    mockFetchPayload(successEnv("BILLJUDGECONF", [
      { ERACO: "제22대", BILL_ID: "PRC_X", BILL_NO: "2214372", BILL_NM: "계량법", CONF_ID: "C001", CONF_TTL: "산자위 제1차", CONF_DT: "2025-02-01", CMMT_PROC_RSLT: "수정가결", LINK_URL: "https://x.kr" },
    ], 12));
    const r = await createAssemblyHandler(TEST_KEY)({ action: "bill_committee_conferences", bill_id: "PRC_X" });
    const t = r.content[0].text;
    expect(t).toContain("🗣️ 위원회심사 회의정보");
    expect(t).toContain("산자위 제1차");
    expect(t).toContain("결과: 수정가결");
  });

  it("bill_receipts: ERACO/BILL_KIND/PPSR_KIND 렌더", async () => {
    mockFetchPayload(successEnv("BILLRCP", [
      { ERACO: "제20대", BILL_ID: "PRC_X", BILL_NO: "2009086", BILL_KIND: "법률안", BILL_NM: "전통시장법", PPSR_KIND: "의원", PPSL_DT: "2018-01-01", PROC_RSLT: "원안가결", LINK_URL: "https://x.kr" },
    ], 119500));
    const r = await createAssemblyHandler(TEST_KEY)({ action: "bill_receipts" });
    const t = r.content[0].text;
    expect(t).toContain("📥 의안 접수목록");
    expect(t).toContain("전통시장법");
    expect(t).toContain("제20대");
    expect(t).toContain("접수 2018-01-01");
  });

  it("bill_judge: JRCMIT_NM/JRCMIT_PROC_RSLT 렌더", async () => {
    mockFetchPayload(successEnv("BILLJUDGE", [
      { ERACO: "제22대", BILL_ID: "PRC_X", BILL_NO: "2207617", BILL_NM: "원산지표시법", PPSR_KIND: "의원", PPSL_DT: "2024-06-01", JRCMIT_NM: "농해수위", JRCMIT_PROC_RSLT: "원안가결", LINK_URL: "https://x.kr" },
    ], 35969));
    const r = await createAssemblyHandler(TEST_KEY)({ action: "bill_judge" });
    const t = r.content[0].text;
    expect(t).toContain("🔍 위원회 심사정보");
    expect(t).toContain("원산지표시법");
    expect(t).toContain("농해수위");
    expect(t).toContain("결과: 원안가결");
  });

  it("member_history: 한자명/정당/대수 렌더", async () => {
    mockFetchPayload(successEnv("ALLNAMEMBER", [
      { NAAS_CD: "D2V1479C", NAAS_NM: "갈봉근", NAAS_CH_NM: "葛奉根", PLPT_NM: "유신정우회", GTELT_ERACO: "제9-10대", BIRDY_DT: "1932-04-06" },
    ], 3286));
    const r = await createAssemblyHandler(TEST_KEY)({ action: "member_history" });
    const t = r.content[0].text;
    expect(t).toContain("📜 역대 국회의원");
    expect(t).toContain("갈봉근 (葛奉根)");
    expect(t).toContain("유신정우회");
    expect(t).toContain("제9-10대");
    expect(t).toContain("생 1932-04-06");
  });

  it("bill_search 변형 actions — plenary_processed_law/budget/etc + bill_processed/recent/referred/committee_alt 렌더", async () => {
    const handler = createAssemblyHandler(TEST_KEY);
    const variants: Array<[string, string]> = [
      ["bill_processed", "nzpltgfqabtcpsmai"],
      ["bill_recent_plenary", "nxjuyqnxadtotdrbw"],
      ["bill_plenary_referred", "nayjnliqaexiioauy"],
      ["bill_committee_alt", "nxtkyptyaolzcbfwl"],
      ["plenary_processed_law", "nkalemivaqmoibxro"],
      ["plenary_processed_budget", "nbslryaradshbpbpm"],
      ["plenary_processed_etc", "nzgjnvnraowulzqwl"],
      ["bill_search_extended", "TVBPMBILL11"],
    ];
    for (const [action, datasetId] of variants) {
      vi.restoreAllMocks();
      mockFetchPayload(successEnv(datasetId, [
        { BILL_ID: "PRC_X", BILL_NO: "2200001", BILL_NAME: "테스트", PROPOSE_DT: "2025-01-01", DETAIL_LINK: "https://x.kr" },
      ], 100));
      const r = await handler({ action: action as never, age: 22 });
      expect(r.isError).toBeUndefined();
      expect(r.content[0].text).toContain("테스트");
      expect(r.content[0].text).toContain("https://x.kr");
    }
  });
});
