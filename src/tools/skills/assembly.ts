/**
 * Skill: assembly — 국회 Open API (open.assembly.go.kr)
 *
 * 24개 dataset 통합 — 의안·법률안·접수·심사·상세·제안자, 본회의 의결/처리/표결,
 * 의원별 본회의 표결, 본회의·위원회 회의록, 본회의 일정, 현직·역대 국회의원.
 *
 * 공통 파라미터: page (pIndex), size (pSize), age (AGE)
 * dataset별 필터: bill_name, proposer, hg_nm, poly_nm, orig_nm, bill_id 등
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
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
} from "../../assembly-api.js";
import type {
  AssemblyFetchOptions,
  AssemblyParsedResult,
  AssemblyQueryParams,
  BillSearchRow,
  BillProcessingRow,
  PendingBillRow,
  PlenaryVoteBillRow,
  MemberCurrentRow,
  MemberHistoryRow,
  MinutesRow,
  PlenaryScheduleRow,
  MemberVoteRow,
  BillDetailRow,
  BillProposerRow,
  BillCommitteeConfRow,
  BillReceiptRow,
  BillJudgeRow,
  VoteByBillRow,
} from "../../assembly-types.js";
import { errorResponse, truncate } from "../../shared.js";
import {
  createDispatcher,
  emptyResultMessage,
  registerSkillTool,
  type SkillResult,
} from "./_shared.js";

const ACTIONS = [
  // 의안/법률안
  "bill_search",
  "bill_search_extended",
  "bill_processing",
  "bill_pending",
  "bill_processed",
  "bill_recent_plenary",
  "bill_plenary_referred",
  "bill_committee_alt",
  "bill_receipts",
  "bill_judge",
  "bill_detail",
  "bill_proposers",
  // 본회의/표결
  "plenary_vote_bills",
  "plenary_processed_law",
  "plenary_processed_budget",
  "plenary_processed_etc",
  "plenary_processed_settlement",
  "vote_by_bill",
  "member_votes",
  // 회의록/일정
  "plenary_minutes",
  "committee_minutes",
  "plenary_schedule",
  "bill_committee_conferences",
  // 국회의원
  "member_current",
  "member_history",
] as const;

type AssemblyAction = typeof ACTIONS[number];

interface AssemblyParams {
  action: AssemblyAction;
  page?: number;
  size?: number;
  age?: string | number;
  bill_name?: string;
  bill_id?: string;
  bill_no?: string;
  proposer?: string;
  committee_nm?: string;
  hg_nm?: string;
  poly_nm?: string;
  orig_nm?: string;
  era_co?: string;
  sess?: string;
  dgr?: string;
  // 회의록·일정
  dae_num?: string;
  conf_date?: string;
  unit_cd?: string;
  title?: string;
  class_name?: string;
  comm_name?: string;
  meetting_date?: string;
  // 의원별 표결
  member_no?: string;
  vote_date?: string;
  // vote_by_bill 처리결과 필터
  proc_result_cd?: string;
  // 대수 (BILLRCPV2/BILLJUDGE)
  eraco?: string;
}

// ---------------------------------------------------------------------------
// 옵션 변환 — 스킬 인자 → AssemblyFetchOptions
// ---------------------------------------------------------------------------

function toOptions(p: AssemblyParams, extraKeys: Record<string, string>, defaultAge?: string | number): AssemblyFetchOptions {
  const extra: AssemblyQueryParams = {};
  const record = p as unknown as Record<string, unknown>;
  for (const [paramKey, queryKey] of Object.entries(extraKeys)) {
    const v = record[paramKey];
    if (typeof v === "string" && v !== "") extra[queryKey] = v;
    else if (typeof v === "number") extra[queryKey] = v;
  }
  return {
    pIndex: p.page,
    pSize: p.size,
    AGE: p.age ?? defaultAge,
    extra: Object.keys(extra).length > 0 ? extra : undefined,
  };
}

function fmtFooter(now: number, size: number, total: number): string {
  const maxPage = total > 0 ? Math.ceil(total / Math.max(1, size)) : 1;
  return `\n\n_총 ${total.toLocaleString()}건 / 페이지 ${now}/${maxPage}_`;
}

// ---------------------------------------------------------------------------
// dataset별 row 렌더러
// ---------------------------------------------------------------------------

function renderBillSearchRow(r: BillSearchRow): string {
  const parts: string[] = [];
  parts.push(`- **${r.BILL_NAME ?? r.BILL_NO ?? "(이름 없음)"}**`);
  const meta: string[] = [];
  if (r.BILL_NO) meta.push(`No.${r.BILL_NO}`);
  if (r.PROPOSER) meta.push(r.PROPOSER);
  if (r.COMMITTEE) meta.push(r.COMMITTEE);
  if (r.PROPOSE_DT) meta.push(`발의 ${r.PROPOSE_DT}`);
  if (r.PROC_RESULT) meta.push(`처리: ${r.PROC_RESULT}`);
  if (meta.length > 0) parts.push(`  ${meta.join(" · ")}`);
  if (r.DETAIL_LINK) parts.push(`  🔗 ${r.DETAIL_LINK}`);
  return parts.join("\n");
}

function renderBillProcessingRow(r: BillProcessingRow): string {
  const parts: string[] = [];
  parts.push(`- **${r.BILL_NM ?? r.BILL_NO ?? "(이름 없음)"}**`);
  const meta: string[] = [];
  if (r.BILL_NO) meta.push(`No.${r.BILL_NO}`);
  if (r.BILL_KIND) meta.push(r.BILL_KIND);
  if (r.PROPOSER) meta.push(r.PROPOSER);
  if (r.COMMITTEE_NM) meta.push(r.COMMITTEE_NM);
  if (r.PROC_RESULT_CD) meta.push(`처리: ${r.PROC_RESULT_CD}`);
  if (r.PROPOSE_DT) meta.push(`발의 ${r.PROPOSE_DT}`);
  if (meta.length > 0) parts.push(`  ${meta.join(" · ")}`);
  if (r.LINK_URL) parts.push(`  🔗 ${r.LINK_URL}`);
  return parts.join("\n");
}

function renderPendingBillRow(r: PendingBillRow): string {
  const parts: string[] = [];
  parts.push(`- **${r.BILL_NM ?? r.BILL_NO ?? "(이름 없음)"}**`);
  const meta: string[] = [];
  if (r.BILL_NO) meta.push(`No.${r.BILL_NO}`);
  if (r.BILL_KND) meta.push(r.BILL_KND);
  if (r.PPSR_NM) meta.push(r.PPSR_NM);
  if (r.JRCMIT_NM) meta.push(r.JRCMIT_NM);
  if (r.PPSL_DT) meta.push(`제안 ${r.PPSL_DT}`);
  if (meta.length > 0) parts.push(`  ${meta.join(" · ")}`);
  if (r.LINK_URL) parts.push(`  🔗 ${r.LINK_URL}`);
  return parts.join("\n");
}

function renderPlenaryVoteRow(r: PlenaryVoteBillRow): string {
  const parts: string[] = [];
  parts.push(`- **${r.BILL_NM ?? "(이름 없음)"}**`);
  const meta: string[] = [];
  if (r.ERACO) meta.push(r.ERACO);
  if (r.SESS) meta.push(r.SESS);
  if (r.DGR) meta.push(r.DGR);
  if (r.CONF_DT) meta.push(r.CONF_DT);
  if (r.RESULT_VOTE_MOD) meta.push(`결과: ${r.RESULT_VOTE_MOD}`);
  if (meta.length > 0) parts.push(`  ${meta.join(" · ")}`);
  const votes: string[] = [];
  if (r.ANS_VOTE_CNT != null) votes.push(`찬성 ${r.ANS_VOTE_CNT}`);
  if (r.NO_VOTE_CNT != null) votes.push(`반대 ${r.NO_VOTE_CNT}`);
  if (r.BLANK_VOTE_CNT != null) votes.push(`기권 ${r.BLANK_VOTE_CNT}`);
  if (votes.length > 0) parts.push(`  표결: ${votes.join(" / ")}`);
  if (r.LINK_URL) parts.push(`  🔗 ${r.LINK_URL}`);
  return parts.join("\n");
}

function renderMemberCurrentRow(r: MemberCurrentRow): string {
  const parts: string[] = [];
  const name = r.HG_NM ?? "(이름 없음)";
  const hj = r.HJ_NM ? ` (${r.HJ_NM})` : "";
  parts.push(`- **${name}${hj}**`);
  const meta: string[] = [];
  if (r.POLY_NM) meta.push(r.POLY_NM);
  if (r.ORIG_NM) meta.push(r.ORIG_NM);
  if (r.ELECT_GBN_NM) meta.push(r.ELECT_GBN_NM);
  if (r.CMIT_NM) meta.push(r.CMIT_NM);
  if (r.REELE_GBN_NM) meta.push(r.REELE_GBN_NM);
  if (meta.length > 0) parts.push(`  ${meta.join(" · ")}`);
  const contact: string[] = [];
  if (r.TEL_NO) contact.push(`☎ ${r.TEL_NO}`);
  if (r.E_MAIL) contact.push(`✉ ${r.E_MAIL}`);
  if (r.HOMEPAGE) contact.push(`🔗 ${r.HOMEPAGE}`);
  if (contact.length > 0) parts.push(`  ${contact.join(" · ")}`);
  return parts.join("\n");
}

function renderMemberHistoryRow(r: MemberHistoryRow): string {
  const parts: string[] = [];
  const name = r.NAAS_NM ?? "(이름 없음)";
  const ch = r.NAAS_CH_NM ? ` (${r.NAAS_CH_NM})` : "";
  parts.push(`- **${name}${ch}**`);
  const meta: string[] = [];
  if (r.PLPT_NM) meta.push(r.PLPT_NM);
  if (r.GTELT_ERACO) meta.push(r.GTELT_ERACO);
  if (r.BLNG_CMIT_NM) meta.push(r.BLNG_CMIT_NM);
  if (r.BIRDY_DT) meta.push(`생 ${r.BIRDY_DT}`);
  if (meta.length > 0) parts.push(`  ${meta.join(" · ")}`);
  return parts.join("\n");
}

function renderMinutesRow(r: MinutesRow): string {
  const parts: string[] = [];
  parts.push(`- **${r.TITLE ?? "(회의명 없음)"}**`);
  const meta: string[] = [];
  if (r.DAE_NUM) meta.push(`제${r.DAE_NUM}대`);
  if (r.CLASS_NAME) meta.push(r.CLASS_NAME);
  if (r.COMM_NAME) meta.push(r.COMM_NAME);
  if (r.CONF_DATE) meta.push(r.CONF_DATE);
  if (r.SUB_NAME) meta.push(`안건: ${r.SUB_NAME}`);
  if (meta.length > 0) parts.push(`  ${meta.join(" · ")}`);
  const links: string[] = [];
  if (r.PDF_LINK_URL) links.push(`📄 ${r.PDF_LINK_URL}`);
  if (r.VOD_LINK_URL) links.push(`🎥 ${r.VOD_LINK_URL}`);
  if (r.CONF_LINK_URL) links.push(`🔗 ${r.CONF_LINK_URL}`);
  if (links.length > 0) parts.push(`  ${links.join(" · ")}`);
  return parts.join("\n");
}

function renderPlenaryScheduleRow(r: PlenaryScheduleRow): string {
  const parts: string[] = [];
  parts.push(`- **${r.TITLE ?? r.MEETINGSESSION ?? "(제목 없음)"}**`);
  const meta: string[] = [];
  if (r.UNIT_NM) meta.push(r.UNIT_NM);
  if (r.MEETINGSESSION) meta.push(r.MEETINGSESSION);
  if (r.CHA) meta.push(r.CHA);
  if (r.MEETTING_DATE) meta.push(`${r.MEETTING_DATE}${r.MEETTING_TIME ? ` ${r.MEETTING_TIME}` : ""}`);
  if (meta.length > 0) parts.push(`  ${meta.join(" · ")}`);
  if (r.CONTS) {
    const conts = r.CONTS.replace(/<br\s*\/?>/gi, "\n    ").slice(0, 400);
    parts.push(`  의안:\n    ${conts}`);
  }
  if (r.LINK_URL) parts.push(`  🔗 ${r.LINK_URL}`);
  return parts.join("\n");
}

function renderMemberVoteRow(r: MemberVoteRow): string {
  const parts: string[] = [];
  parts.push(`- **${r.HG_NM ?? "(의원명 없음)"}** — ${r.RESULT_VOTE_MOD ?? "?"}`);
  const meta: string[] = [];
  if (r.POLY_NM) meta.push(r.POLY_NM);
  if (r.ORIG_NM) meta.push(r.ORIG_NM);
  if (r.BILL_NAME) meta.push(`의안: ${r.BILL_NAME}`);
  if (r.BILL_NO) meta.push(`No.${r.BILL_NO}`);
  if (r.VOTE_DATE) meta.push(`표결일 ${r.VOTE_DATE}`);
  if (meta.length > 0) parts.push(`  ${meta.join(" · ")}`);
  if (r.BILL_URL) parts.push(`  🔗 ${r.BILL_URL}`);
  return parts.join("\n");
}

function renderBillDetailRow(r: BillDetailRow): string {
  const parts: string[] = [];
  parts.push(`- **${r.BILL_NM ?? "(이름 없음)"}** (${r.BILL_NO ?? "-"})`);
  const meta: string[] = [];
  if (r.PPSR_KIND) meta.push(r.PPSR_KIND);
  if (r.PPSR) meta.push(r.PPSR);
  if (r.JRCMIT_NM) meta.push(r.JRCMIT_NM);
  if (r.PPSL_DT) meta.push(`제안 ${r.PPSL_DT}`);
  if (meta.length > 0) parts.push(`  ${meta.join(" · ")}`);
  const proc: string[] = [];
  if (r.JRCMIT_PROC_DT) proc.push(`위원회처리 ${r.JRCMIT_PROC_DT} ${r.JRCMIT_PROC_RSLT ?? ""}`);
  if (r.LAW_PROC_DT) proc.push(`법사위 ${r.LAW_PROC_DT} ${r.LAW_PROC_RSLT ?? ""}`);
  if (r.RGS_RSLN_DT) proc.push(`본회의 ${r.RGS_RSLN_DT} ${r.RGS_CONF_RSLT ?? ""}`);
  if (r.PROM_DT) proc.push(`공포 ${r.PROM_DT} (제${r.PROM_NO ?? "?"}호)`);
  if (proc.length > 0) parts.push(`  처리: ${proc.join(" → ")}`);
  if (r.LINK_URL) parts.push(`  🔗 ${r.LINK_URL}`);
  return parts.join("\n");
}

function renderBillProposerRow(r: BillProposerRow): string {
  const parts: string[] = [];
  parts.push(`- **${r.BILL_NM ?? "(이름 없음)"}** (${r.BILL_NO ?? "-"})`);
  if (r.RST_PROPOSER) parts.push(`  대표발의: ${r.RST_PROPOSER}`);
  if (r.PUBL_PROPOSER) parts.push(`  공동발의: ${r.PUBL_PROPOSER}`);
  if (r.MEMBER_LIST) parts.push(`  명단: ${r.MEMBER_LIST.slice(0, 300)}`);
  return parts.join("\n");
}

function renderBillCommitteeConfRow(r: BillCommitteeConfRow): string {
  const parts: string[] = [];
  parts.push(`- **${r.CONF_TTL ?? "(회의명 없음)"}**`);
  const meta: string[] = [];
  if (r.ERACO) meta.push(r.ERACO);
  if (r.CONF_DT) meta.push(r.CONF_DT);
  if (r.CMMT_PROC_RSLT) meta.push(`결과: ${r.CMMT_PROC_RSLT}`);
  if (r.BILL_NM) meta.push(`의안: ${r.BILL_NM}`);
  if (meta.length > 0) parts.push(`  ${meta.join(" · ")}`);
  if (r.LINK_URL) parts.push(`  🔗 ${r.LINK_URL}`);
  return parts.join("\n");
}

function renderBillReceiptRow(r: BillReceiptRow): string {
  const parts: string[] = [];
  parts.push(`- **${r.BILL_NM ?? r.BILL_NO ?? "(이름 없음)"}**`);
  const meta: string[] = [];
  if (r.ERACO) meta.push(r.ERACO);
  if (r.BILL_NO) meta.push(`No.${r.BILL_NO}`);
  if (r.BILL_KIND) meta.push(r.BILL_KIND);
  if (r.PPSR_KIND) meta.push(r.PPSR_KIND);
  if (r.PPSL_DT) meta.push(`접수 ${r.PPSL_DT}`);
  if (r.PROC_RSLT) meta.push(`처리: ${r.PROC_RSLT}`);
  if (meta.length > 0) parts.push(`  ${meta.join(" · ")}`);
  if (r.LINK_URL) parts.push(`  🔗 ${r.LINK_URL}`);
  return parts.join("\n");
}

function renderVoteByBillRow(r: VoteByBillRow): string {
  const parts: string[] = [];
  parts.push(`- **${r.BILL_NAME ?? r.BILL_NO ?? "(이름 없음)"}**`);
  const meta: string[] = [];
  if (r.BILL_NO) meta.push(`No.${r.BILL_NO}`);
  if (r.CURR_COMMITTEE) meta.push(r.CURR_COMMITTEE);
  if (r.PROC_DT) meta.push(`처리 ${r.PROC_DT}`);
  if (r.PROC_RESULT_CD) meta.push(`결과: ${r.PROC_RESULT_CD}`);
  if (meta.length > 0) parts.push(`  ${meta.join(" · ")}`);
  const votes: string[] = [];
  if (r.MEMBER_TCNT != null) votes.push(`재적 ${r.MEMBER_TCNT}`);
  if (r.VOTE_TCNT != null) votes.push(`투표 ${r.VOTE_TCNT}`);
  if (r.YES_TCNT != null) votes.push(`찬성 ${r.YES_TCNT}`);
  if (r.NO_TCNT != null) votes.push(`반대 ${r.NO_TCNT}`);
  if (r.BLANK_TCNT != null) votes.push(`기권 ${r.BLANK_TCNT}`);
  if (votes.length > 0) parts.push(`  표결: ${votes.join(" / ")}`);
  if (r.LINK_URL) parts.push(`  🔗 ${r.LINK_URL}`);
  return parts.join("\n");
}

function renderBillJudgeRow(r: BillJudgeRow): string {
  const parts: string[] = [];
  parts.push(`- **${r.BILL_NM ?? r.BILL_NO ?? "(이름 없음)"}**`);
  const meta: string[] = [];
  if (r.ERACO) meta.push(r.ERACO);
  if (r.BILL_NO) meta.push(`No.${r.BILL_NO}`);
  if (r.PPSR_KIND) meta.push(r.PPSR_KIND);
  if (r.JRCMIT_NM) meta.push(r.JRCMIT_NM);
  if (r.PPSL_DT) meta.push(`제안 ${r.PPSL_DT}`);
  if (r.JRCMIT_PROC_RSLT) meta.push(`결과: ${r.JRCMIT_PROC_RSLT}`);
  if (meta.length > 0) parts.push(`  ${meta.join(" · ")}`);
  if (r.LINK_URL) parts.push(`  🔗 ${r.LINK_URL}`);
  return parts.join("\n");
}

// ---------------------------------------------------------------------------
// 공통 핸들러 빌더
// ---------------------------------------------------------------------------

interface HandlerConfig<TRow> {
  domain: string;
  emoji: string;
  fetcher: (apiKey: string, options?: AssemblyFetchOptions) => Promise<AssemblyParsedResult<TRow>>;
  render: (row: TRow) => string;
  extraKeys: Record<string, string>;
  /** 필수 param 키 (skill param 이름) — 누락 시 isError 반환 */
  requiredParams?: ReadonlyArray<keyof AssemblyParams>;
  /** AGE 미지정 시 자동 적용 — dataset이 AGE를 필수로 요구할 때 사용 */
  defaultAge?: string | number;
  /**
   * 서버가 무시하는 필터 — fetch 후 client-side로 row 필터링.
   * 키: skill param 이름 (예: "committee_nm")
   * 값: row 객체의 필드명 (예: "CMIT_NM") — substring 매칭
   * 매핑된 param은 서버에 전송하지 않고 client에서 처리.
   */
  clientFilters?: Record<string, string>;
}

function buildHandler<TRow>(apiKey: string, cfg: HandlerConfig<TRow>) {
  return async (p: AssemblyParams): Promise<SkillResult> => {
    if (cfg.requiredParams) {
      const missing = cfg.requiredParams.filter((k) => {
        const v = p[k];
        return v === undefined || v === null || v === "";
      });
      if (missing.length > 0) {
        return {
          content: [{
            type: "text",
            text: `"${p.action}" action에는 다음 필수 파라미터가 필요합니다: ${missing.join(", ")}`,
          }],
          isError: true,
        };
      }
    }
    try {
      const opts = toOptions(p, cfg.extraKeys, cfg.defaultAge);
      // client-filter 활성 여부 — server가 무시하는 필터가 사용자 인자에 있으면 활성
      const record = p as unknown as Record<string, unknown>;
      const activeClientFilters: Array<[string, string]> = [];
      if (cfg.clientFilters) {
        for (const [paramKey, rowField] of Object.entries(cfg.clientFilters)) {
          const v = record[paramKey];
          if (typeof v === "string" && v !== "") activeClientFilters.push([rowField, v]);
        }
      }
      // client-filter 활성 시 1페이지 최대 1000건 fetch (필터 효과 극대화)
      if (activeClientFilters.length > 0) {
        opts.pSize = Math.max(opts.pSize ?? 0, 1000);
        opts.pIndex = 1;
      }
      const result = await cfg.fetcher(apiKey, opts);
      let rows = result.rows;
      let clientFilterNote = "";
      if (activeClientFilters.length > 0) {
        const before = rows.length;
        rows = rows.filter((row) => {
          const r = row as unknown as Record<string, unknown>;
          return activeClientFilters.every(([field, val]) => {
            const fv = r[field];
            return typeof fv === "string" && fv.includes(val);
          });
        });
        const filterDesc = activeClientFilters.map(([f, v]) => `${f}=${v}`).join(", ");
        clientFilterNote = `\n\n_⚠️ 서버가 ${filterDesc} 필터를 무시하므로 client-side 필터 적용 — ${before}건 중 ${rows.length}건 매칭 (1페이지 ${opts.pSize}건 한정)_`;
      }
      if (rows.length === 0) {
        return emptyResultMessage(cfg.domain, {
          age: p.age != null ? String(p.age) : undefined,
          page: p.page != null ? String(p.page) : undefined,
        });
      }
      const header = `## ${cfg.emoji} ${cfg.domain}`;
      const body = rows.map(cfg.render).join("\n\n");
      const footer = activeClientFilters.length > 0
        ? `\n\n_총 ${rows.length}건 매칭 (서버 응답 ${result.totalCount.toLocaleString()}건)_${clientFilterNote}`
        : fmtFooter(p.page ?? 1, p.size ?? 10, result.totalCount);
      return {
        content: [{ type: "text", text: truncate(`${header}\n\n${body}${footer}`) }],
      };
    } catch (error) {
      return errorResponse(cfg.domain, error);
    }
  };
}

// ---------------------------------------------------------------------------
// 디스패처
// ---------------------------------------------------------------------------

export function createAssemblyHandler(apiKey: string) {
  // server-supported extra-key 매핑 (실API 매트릭스 검증)
  const billSearchKeys = { bill_name: "BILL_NAME", proposer: "PROPOSER", bill_id: "BILL_ID" };
  const billProcessingKeys = { bill_name: "BILL_NM", proposer: "PROPOSER", committee_nm: "COMMITTEE_NM" };
  const memberHistoryKeys = { hg_nm: "NAAS_NM", poly_nm: "PLPT_NM" };
  const billByIdKeys = { bill_id: "BILL_ID" };
  const memberVoteKeys = {
    bill_id: "BILL_ID", hg_nm: "HG_NM", poly_nm: "POLY_NM", member_no: "MEMBER_NO",
    vote_date: "VOTE_DATE", bill_no: "BILL_NO", bill_name: "BILL_NAME",
  };
  const scheduleKeys = { unit_cd: "UNIT_CD", title: "TITLE" };
  const voteByBillKeys = { bill_name: "BILL_NAME", proc_result_cd: "PROC_RESULT_CD" };

  // bill_pending/bill_committee_alt/processed* spec 재확인 결과 server-side 필터 (BILL_NAME/PROPOSER) 작동.
  // 잘못된 BILL_NM/PPSR_NM 매핑이 무시되었던 것이므로 server extraKeys로 이동.
  const billNameProposerKeys = { bill_name: "BILL_NAME", proposer: "PROPOSER", bill_id: "BILL_ID" };
  // nbslryaradshbpbpm (plenary_processed_etc) row field가 BILL_NM 이며 BILL_NAME server-side 무시 — BILL_NM/COMMITTEE_NM 사용
  const etcProcessingKeys = { bill_name: "BILL_NM", proposer: "PROPOSER", committee_nm: "COMMITTEE_NM" };
  // VCONFBILLLIST는 spec 미확인 — 보수적으로 client filter 유지
  const voteListClientFilters = { bill_name: "BILL_NM", era_co: "ERACO", sess: "SESS", dgr: "DGR" };
  // 회의록 dataset (nzbyfwhwaoanttzje/ncwgseseafwbuheph)은 spec에 TITLE/CLASS_NAME 명시 — server-side
  const plenaryMinutesKeys = { dae_num: "DAE_NUM", conf_date: "CONF_DATE", title: "TITLE", class_name: "CLASS_NAME" };
  const committeeMinutesKeys = { dae_num: "DAE_NUM", conf_date: "CONF_DATE", title: "TITLE", class_name: "CLASS_NAME", comm_name: "COMM_NAME" };
  // member_current: 위원회 필터 = CMITS (spec) — server-side OK, client-filter 불요
  const memberCurrentWithCommittee = { hg_nm: "HG_NM", poly_nm: "POLY_NM", orig_nm: "ORIG_NM", committee_nm: "CMITS" };

  return createDispatcher<AssemblyParams>("assembly", {
    // 의안/법률안
    bill_search: buildHandler<BillSearchRow>(apiKey, {
      domain: "의안정보 검색", emoji: "📋", fetcher: searchBills, render: renderBillSearchRow, extraKeys: billSearchKeys, defaultAge: 22,
    }),
    bill_search_extended: buildHandler<BillSearchRow>(apiKey, {
      domain: "의안 검색 (확장)", emoji: "📋", fetcher: searchBillsExtended, render: renderBillSearchRow, extraKeys: billSearchKeys, defaultAge: 22,
    }),
    // 주의: bill_processing은 plenary_processed_law와 동일 dataset (nwbpacrgavhjryiph) — backward-compat alias
    bill_processing: buildHandler<BillProcessingRow>(apiKey, {
      domain: "본회의 처리안건_법률안 (= plenary_processed_law)", emoji: "⚖️", fetcher: getBillProcessing, render: renderBillProcessingRow, extraKeys: billProcessingKeys,
    }),
    bill_pending: buildHandler<PendingBillRow>(apiKey, {
      domain: "계류의안", emoji: "⏳", fetcher: getPendingBills, render: renderPendingBillRow, extraKeys: billNameProposerKeys,
    }),
    bill_processed: buildHandler<BillSearchRow>(apiKey, {
      domain: "처리의안", emoji: "✅", fetcher: getProcessedBills, render: renderBillSearchRow, extraKeys: billSearchKeys,
    }),
    bill_recent_plenary: buildHandler<BillSearchRow>(apiKey, {
      domain: "최근 본회의처리 의안", emoji: "🏛️", fetcher: getRecentPlenaryBills, render: renderBillSearchRow, extraKeys: billSearchKeys,
    }),
    bill_plenary_referred: buildHandler<BillSearchRow>(apiKey, {
      domain: "본회의부의안건", emoji: "📥", fetcher: getPlenaryReferredBills, render: renderBillSearchRow, extraKeys: billSearchKeys,
    }),
    bill_committee_alt: buildHandler<BillSearchRow>(apiKey, {
      domain: "위원회안·대안", emoji: "🧩", fetcher: getCommitteeAlternativeBills, render: renderBillSearchRow, extraKeys: billSearchKeys,
    }),
    // BILLRCPV2가 spec 정식 ID지만 BILL_ID 필수 — 기존 BILLRCP (호환성 동작 확인됨) 유지
    bill_receipts: buildHandler<BillReceiptRow>(apiKey, {
      domain: "의안 접수목록", emoji: "📥", fetcher: getBillReceipts, render: renderBillReceiptRow, extraKeys: { eraco: "ERACO" },
    }),
    bill_judge: buildHandler<BillJudgeRow>(apiKey, {
      domain: "위원회 심사정보 (예결산 제외)", emoji: "🔍", fetcher: getBillJudge, render: renderBillJudgeRow, extraKeys: { eraco: "ERACO" },
    }),
    bill_detail: buildHandler<BillDetailRow>(apiKey, {
      domain: "의안 상세", emoji: "📖", fetcher: getBillDetail, render: renderBillDetailRow,
      extraKeys: billByIdKeys, requiredParams: ["bill_id"],
    }),
    bill_proposers: buildHandler<BillProposerRow>(apiKey, {
      domain: "의안 제안자", emoji: "👥", fetcher: getBillProposers, render: renderBillProposerRow,
      extraKeys: billByIdKeys, requiredParams: ["bill_id"],
    }),
    // 본회의/표결
    plenary_vote_bills: buildHandler<PlenaryVoteBillRow>(apiKey, {
      domain: "본회의 의결안건", emoji: "🗳️", fetcher: getPlenaryVoteBills, render: renderPlenaryVoteRow, extraKeys: {}, clientFilters: voteListClientFilters,
    }),
    // 정정: portal spec 확인 결과 v1/v2/v3 → settlement/etc/budget 매핑 (이전 추측 잘못)
    // nwbpacrgavhjryiph = 본회의 처리안건_법률안 (이전 "법률안 처리현황" 라벨)
    plenary_processed_law: buildHandler<BillProcessingRow>(apiKey, {
      domain: "본회의 처리안건_법률안", emoji: "🏛️", fetcher: getBillProcessing, render: renderBillProcessingRow, extraKeys: billProcessingKeys,
    }),
    // nzgjnvnraowulzqwl = 예산안 (이전 etc로 매핑)
    plenary_processed_budget: buildHandler<BillSearchRow>(apiKey, {
      domain: "본회의 처리안건_예산안", emoji: "🏛️", fetcher: getPlenaryProcessedV3, render: renderBillSearchRow, extraKeys: billSearchKeys,
    }),
    // nbslryaradshbpbpm = 기타 (row field가 BILL_NM/COMMITTEE_NM이라 etcProcessingKeys + processing renderer 사용)
    plenary_processed_etc: buildHandler<BillProcessingRow>(apiKey, {
      domain: "본회의 처리안건_기타", emoji: "🏛️", fetcher: getPlenaryProcessedV2 as never, render: renderBillProcessingRow, extraKeys: etcProcessingKeys,
    }),
    // nkalemivaqmoibxro = 결산 (이전 v1=law로 매핑)
    plenary_processed_settlement: buildHandler<BillSearchRow>(apiKey, {
      domain: "본회의 처리안건_결산", emoji: "🏛️", fetcher: getPlenaryProcessedV1, render: renderBillSearchRow, extraKeys: billSearchKeys,
    }),
    vote_by_bill: buildHandler<VoteByBillRow>(apiKey, {
      domain: "의안별 표결현황", emoji: "🗳️", fetcher: getVoteByBill, render: renderVoteByBillRow, extraKeys: voteByBillKeys,
    }),
    member_votes: buildHandler<MemberVoteRow>(apiKey, {
      domain: "국회의원 본회의 표결정보", emoji: "🙋", fetcher: getMemberVotes, render: renderMemberVoteRow,
      extraKeys: memberVoteKeys, requiredParams: ["bill_id"],
    }),
    // 회의록/일정
    plenary_minutes: buildHandler<MinutesRow>(apiKey, {
      domain: "본회의 회의록", emoji: "📜", fetcher: getPlenaryMinutes, render: renderMinutesRow,
      extraKeys: plenaryMinutesKeys, requiredParams: ["dae_num", "conf_date"],
    }),
    committee_minutes: buildHandler<MinutesRow>(apiKey, {
      domain: "위원회 회의록", emoji: "📜", fetcher: getCommitteeMinutes, render: renderMinutesRow,
      extraKeys: committeeMinutesKeys, requiredParams: ["dae_num", "conf_date"],
    }),
    plenary_schedule: buildHandler<PlenaryScheduleRow>(apiKey, {
      domain: "본회의 일정", emoji: "📅", fetcher: getPlenarySchedule, render: renderPlenaryScheduleRow,
      extraKeys: scheduleKeys, requiredParams: ["unit_cd"],
    }),
    bill_committee_conferences: buildHandler<BillCommitteeConfRow>(apiKey, {
      domain: "위원회심사 회의정보", emoji: "🗣️", fetcher: getBillCommitteeConferences, render: renderBillCommitteeConfRow,
      extraKeys: billByIdKeys, requiredParams: ["bill_id"],
    }),
    // 국회의원
    member_current: buildHandler<MemberCurrentRow>(apiKey, {
      domain: "현직 국회의원 (22대)", emoji: "👤", fetcher: getCurrentMembers, render: renderMemberCurrentRow, extraKeys: memberCurrentWithCommittee,
    }),
    member_history: buildHandler<MemberHistoryRow>(apiKey, {
      domain: "역대 국회의원", emoji: "📜", fetcher: getMemberHistory, render: renderMemberHistoryRow, extraKeys: memberHistoryKeys,
    }),
  });
}

// ---------------------------------------------------------------------------
// MCP 등록
// ---------------------------------------------------------------------------

export function registerAssembly(server: McpServer, apiKey: string): void {
  const handler = createAssemblyHandler(apiKey);

  registerSkillTool(server, {
    name: "assembly",
    title: "National Assembly / 국회 Open API",
    description:
      "Search bills, plenary votes, members from the Korean National Assembly. / 의안·법률안 처리현황·본회의 의결·국회의원 정보를 국회 Open API (open.assembly.go.kr)에서 조회합니다.",
    inputSchema: {
      action: z.enum(ACTIONS).describe(
        "[의안] bill_search/bill_search_extended/bill_processing/bill_pending/bill_processed/bill_recent_plenary/bill_plenary_referred/bill_committee_alt/bill_receipts/bill_judge | [상세, BILL_ID 필수] bill_detail/bill_proposers | [본회의/표결] plenary_vote_bills/plenary_processed_law/plenary_processed_budget/plenary_processed_etc/vote_by_bill | [의원별표결, BILL_ID 필수] member_votes | [회의록, DAE_NUM+CONF_DATE 필수] plenary_minutes/committee_minutes | [일정, UNIT_CD 필수] plenary_schedule | [위원회회의, BILL_ID 필수] bill_committee_conferences | [의원] member_current/member_history",
      ),
      page: z.number().int().min(1).optional().describe("페이지 번호 (1-base, 기본 1)"),
      size: z.number().int().min(1).max(1000).optional().describe("페이지당 결과 수 (기본 10, 최대 1000)"),
      age: z.union([z.number().int(), z.string()]).optional().describe("국회 대수 (예: 22)"),
      bill_name: z.string().optional().describe("의안명 필터 (LIKE 검색)"),
      bill_id: z.string().optional().describe("의안 ID (BILL_ID) — bill_detail/bill_proposers/member_votes/bill_committee_conferences에 필수"),
      bill_no: z.string().optional().describe("의안번호 (BILL_NO)"),
      proposer: z.string().optional().describe("발의자명 필터"),
      committee_nm: z.string().optional().describe("위원회명 필터"),
      hg_nm: z.string().optional().describe("의원 한글명 필터"),
      poly_nm: z.string().optional().describe("정당명 필터"),
      orig_nm: z.string().optional().describe("선거구명 필터"),
      era_co: z.string().optional().describe("회기 (본회의 의결)"),
      sess: z.string().optional().describe("회기 차수"),
      dgr: z.string().optional().describe("차수"),
      dae_num: z.string().optional().describe("대수 (예: '22') — plenary_minutes/committee_minutes 필수"),
      conf_date: z.string().optional().describe("회의날짜 (예: '2025' 또는 '2025-10-08') — plenary_minutes/committee_minutes 필수"),
      unit_cd: z.string().optional().describe("대수 코드 (예: '100022') — plenary_schedule 필수"),
      title: z.string().optional().describe("제목 검색어 (회의록/일정)"),
      class_name: z.string().optional().describe("회의종류명 (회의록)"),
      comm_name: z.string().optional().describe("위원회명 (committee_minutes)"),
      meetting_date: z.string().optional().describe("일자 (plenary_schedule, 예: '2021-11-11')"),
      member_no: z.string().optional().describe("의원번호 (member_votes)"),
      vote_date: z.string().optional().describe("의결일자 (member_votes, 예: '11-NOV-21')"),
      proc_result_cd: z.string().optional().describe("처리결과 필터 (vote_by_bill, 예: '원안가결')"),
      eraco: z.string().optional().describe("대수 (bill_receipts/bill_judge, 예: '제22대')"),
    },
    callback: async (params) => handler(params as AssemblyParams),
  });
}
