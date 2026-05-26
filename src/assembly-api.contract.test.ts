/**
 * 국회 Open API 실 API 호출 contract test.
 *
 * ASSEMBLY_API_KEY 환경변수가 있어야 실행됨 (없으면 skip).
 * CI에서는 ASSEMBLY_API_KEY를 secrets에 등록하면 활성화됨.
 *
 * 검증 항목:
 * - 24개 dataset 모두 실 API에서 INFO-000 또는 INFO-200 응답
 * - 응답 envelope이 우리 파서로 정상 파싱되는지
 * - 필수 param이 있는 dataset은 적절한 BILL_ID/DAE_NUM/UNIT_CD 등으로 호출
 * - 페이지/사이즈 가드 작동 (pSize=1로 트래픽 최소화)
 */

import { describe, it, expect } from "vitest";
import {
  searchBills,
  searchBillsExtended,
  getBillProcessing,
  getPendingBills,
  getProcessedBills,
  getRecentPlenaryBills,
  getPlenaryReferredBills,
  getCommitteeAlternativeBills,
  getBillReceipts,
  getBillJudge,
  getBillDetail,
  getBillProposers,
  getPlenaryVoteBills,
  getPlenaryProcessedV1,
  getPlenaryProcessedV2,
  getPlenaryProcessedV3,
  getVoteByBill,
  getMemberVotes,
  getPlenaryMinutes,
  getCommitteeMinutes,
  getPlenarySchedule,
  getBillCommitteeConferences,
  getCurrentMembers,
  getMemberHistory,
} from "./assembly-api.js";

const KEY = process.env.ASSEMBLY_API_KEY;
const SKIP = !KEY;

// 알려진 의안 ID — 본회의 의결 통과한 계량법 일부개정안 (테스트용)
const KNOWN_BILL_ID = "PRC_F2G5E1D1D1L4L0K9L4J7J1H9Q5Q5O7";

const describeIfKey = SKIP ? describe.skip : describe;

describeIfKey("국회 Open API contract test (실 API)", () => {
  const baseOpts = { pSize: 1 };

  it("bill_search — searchBills (AGE 필요)", async () => {
    const r = await searchBills(KEY!, { ...baseOpts, AGE: 22 });
    expect(r.code).toMatch(/INFO-(000|200)/);
    expect(r.totalCount).toBeGreaterThanOrEqual(0);
  });

  it("bill_search_extended — TVBPMBILL11 (AGE 필요)", async () => {
    const r = await searchBillsExtended(KEY!, { ...baseOpts, AGE: 22 });
    expect(r.code).toMatch(/INFO-(000|200)/);
  });

  it("bill_processing — nwbpacrgavhjryiph", async () => {
    const r = await getBillProcessing(KEY!, { ...baseOpts, AGE: 22 });
    expect(r.code).toMatch(/INFO-(000|200)/);
  });

  it("bill_pending — nwbqublzajtcqpdae", async () => {
    const r = await getPendingBills(KEY!, baseOpts);
    expect(r.code).toMatch(/INFO-(000|200)/);
  });

  it("bill_processed — nzpltgfqabtcpsmai", async () => {
    const r = await getProcessedBills(KEY!, { ...baseOpts, AGE: 22 });
    expect(r.code).toMatch(/INFO-(000|200)/);
  });

  it("bill_recent_plenary — nxjuyqnxadtotdrbw", async () => {
    const r = await getRecentPlenaryBills(KEY!, { ...baseOpts, AGE: 22 });
    expect(r.code).toMatch(/INFO-(000|200)/);
  });

  it("bill_plenary_referred — nayjnliqaexiioauy", async () => {
    const r = await getPlenaryReferredBills(KEY!, baseOpts);
    expect(r.code).toMatch(/INFO-(000|200)/);
  });

  it("bill_committee_alt — nxtkyptyaolzcbfwl", async () => {
    const r = await getCommitteeAlternativeBills(KEY!, baseOpts);
    expect(r.code).toMatch(/INFO-(000|200)/);
  });

  it("bill_receipts — BILLRCP", async () => {
    const r = await getBillReceipts(KEY!, baseOpts);
    expect(r.code).toMatch(/INFO-(000|200)/);
    expect(r.totalCount).toBeGreaterThan(100000); // 119.5K건 확인
  });

  it("bill_judge — BILLJUDGE", async () => {
    const r = await getBillJudge(KEY!, baseOpts);
    expect(r.code).toMatch(/INFO-(000|200)/);
  });

  it("bill_detail — BILLINFODETAIL (BILL_ID 필수)", async () => {
    const r = await getBillDetail(KEY!, { ...baseOpts, extra: { BILL_ID: KNOWN_BILL_ID, AGE: "22" } });
    expect(r.code).toMatch(/INFO-(000|200)/);
  });

  it("bill_proposers — BILLINFOPPSR (BILL_ID 필수)", async () => {
    const r = await getBillProposers(KEY!, { ...baseOpts, extra: { BILL_ID: KNOWN_BILL_ID, AGE: "22" } });
    expect(r.code).toMatch(/INFO-(000|200)/);
  });

  it("plenary_vote_bills — VCONFBILLLIST", async () => {
    const r = await getPlenaryVoteBills(KEY!, baseOpts);
    expect(r.code).toMatch(/INFO-(000|200)/);
    expect(r.totalCount).toBeGreaterThan(100000); // 200K+ 확인
  });

  it("plenary_processed_law — nkalemivaqmoibxro", async () => {
    const r = await getPlenaryProcessedV1(KEY!, { ...baseOpts, AGE: 22 });
    expect(r.code).toMatch(/INFO-(000|200)/);
  });

  it("plenary_processed_budget — nbslryaradshbpbpm", async () => {
    const r = await getPlenaryProcessedV2(KEY!, { ...baseOpts, AGE: 22 });
    expect(r.code).toMatch(/INFO-(000|200)/);
  });

  it("plenary_processed_etc — nzgjnvnraowulzqwl", async () => {
    const r = await getPlenaryProcessedV3(KEY!, { ...baseOpts, AGE: 22 });
    expect(r.code).toMatch(/INFO-(000|200)/);
  });

  it("vote_by_bill — ncocpgfiaoituanbr (vote-count fields)", async () => {
    const r = await getVoteByBill(KEY!, { ...baseOpts, AGE: 22 });
    expect(r.code).toMatch(/INFO-(000|200)/);
    if (r.code === "INFO-000" && r.rows.length > 0) {
      const row = r.rows[0];
      // 표결 카운트 필드 존재 확인 (renderer가 이를 사용)
      expect(row).toHaveProperty("MEMBER_TCNT");
      expect(row).toHaveProperty("YES_TCNT");
      expect(row).toHaveProperty("NO_TCNT");
      expect(row).toHaveProperty("BLANK_TCNT");
    }
  });

  it("member_votes — nojepdqqaweusdfbi (BILL_ID 필수)", async () => {
    const r = await getMemberVotes(KEY!, { ...baseOpts, extra: { BILL_ID: KNOWN_BILL_ID, AGE: "22" } });
    expect(r.code).toMatch(/INFO-(000|200)/);
  });

  it("plenary_minutes — nzbyfwhwaoanttzje (DAE_NUM + CONF_DATE 필수)", async () => {
    const r = await getPlenaryMinutes(KEY!, { ...baseOpts, extra: { DAE_NUM: "22", CONF_DATE: "2025" } });
    expect(r.code).toMatch(/INFO-(000|200)/);
  });

  it("committee_minutes — ncwgseseafwbuheph (DAE_NUM + CONF_DATE 필수)", async () => {
    const r = await getCommitteeMinutes(KEY!, { ...baseOpts, extra: { DAE_NUM: "22", CONF_DATE: "2025" } });
    expect(r.code).toMatch(/INFO-(000|200)/);
  });

  it("plenary_schedule — nekcaiymatialqlxr (UNIT_CD 필수)", async () => {
    const r = await getPlenarySchedule(KEY!, { ...baseOpts, extra: { UNIT_CD: "100022" } });
    expect(r.code).toMatch(/INFO-(000|200)/);
  });

  it("bill_committee_conferences — BILLJUDGECONF (BILL_ID 필수)", async () => {
    const r = await getBillCommitteeConferences(KEY!, { ...baseOpts, extra: { BILL_ID: KNOWN_BILL_ID, AGE: "22" } });
    expect(r.code).toMatch(/INFO-(000|200)/);
  });

  it("member_current — nwvrqwxyaytdsfvhu", async () => {
    const r = await getCurrentMembers(KEY!, { ...baseOpts, AGE: 22 });
    expect(r.code).toMatch(/INFO-(000|200)/);
    expect(r.totalCount).toBeGreaterThan(0);
  });

  it("member_history — ALLNAMEMBER", async () => {
    const r = await getMemberHistory(KEY!, baseOpts);
    expect(r.code).toMatch(/INFO-(000|200)/);
    expect(r.totalCount).toBeGreaterThan(1000); // 역대 3K+
  });
});
