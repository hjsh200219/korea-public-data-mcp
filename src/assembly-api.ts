/**
 * 국회 Open API (open.assembly.go.kr / 열린국회정보) 클라이언트
 *
 * 단일 generic fetcher + 24개 named wrapper.
 * 공통 query: KEY, Type=json, pIndex, pSize, AGE (선택), dataset별 extra params.
 *
 * dataset_id 카탈로그 (v2 — 24개):
 *   의안/법률안
 *     nzmimeepazxkubdpn  의안정보 검색
 *     TVBPMBILL11        의안 검색 (확장 18.5K건)
 *     nwbqublzajtcqpdae  계류의안
 *     nzpltgfqabtcpsmai  처리의안
 *     nxjuyqnxadtotdrbw  최근 본회의처리 의안
 *     nayjnliqaexiioauy  본회의부의안건
 *     nxtkyptyaolzcbfwl  위원회안·대안
 *     BILLRCP            의안 접수목록 (119.5K건)
 *     BILLJUDGE          위원회 심사정보 (36K건)
 *     BILLINFODETAIL     의안 상세 (필수 BILL_ID)
 *     BILLINFOPPSR       의안 제안자 정보 (필수 BILL_ID)
 *   본회의 처리안건/표결
 *     nwbpacrgavhjryiph  본회의 처리안건_결산
 *     nkalemivaqmoibxro  본회의 처리안건_법률안
 *     nbslryaradshbpbpm  본회의 처리안건_예산안
 *     nzgjnvnraowulzqwl  본회의 처리안건_기타
 *     VCONFBILLLIST      본회의 의결안건
 *     ncocpgfiaoituanbr  의안별 표결현황
 *     nojepdqqaweusdfbi  국회의원 본회의 표결정보 (필수 BILL_ID)
 *   회의록/일정
 *     nzbyfwhwaoanttzje  본회의 회의록 (필수 DAE_NUM + CONF_DATE)
 *     ncwgseseafwbuheph  위원회 회의록 (필수 DAE_NUM + CONF_DATE)
 *     nekcaiymatialqlxr  본회의 일정 (필수 UNIT_CD)
 *     BILLJUDGECONF      위원회심사 회의정보 (필수 BILL_ID)
 *   국회의원
 *     nwvrqwxyaytdsfvhu  현직 국회의원
 *     ALLNAMEMBER        역대 국회의원
 */

import { fetchWithRetry } from "./http-client.js";
import type {
  AssemblyFetchOptions,
  AssemblyParsedResult,
  AssemblySuccessSection,
  AssemblyHeadCount,
  AssemblyHeadResult,
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
} from "./assembly-types.js";

const BASE_URL = "https://open.assembly.go.kr/portal/openapi";
const TIMEOUT_MS = 15_000;
const MAX_RETRIES = 2;
const MAX_PSIZE = 1000;

// ---------------------------------------------------------------------------
// 내부 헬퍼
// ---------------------------------------------------------------------------

function buildUrl(
  datasetId: string,
  apiKey: string,
  options?: AssemblyFetchOptions,
): string {
  const qp = new URLSearchParams();
  qp.set("KEY", apiKey);
  qp.set("Type", "json");
  const pIndex = Math.max(1, Math.floor(options?.pIndex ?? 1));
  const pSizeRaw = Math.max(1, Math.floor(options?.pSize ?? 10));
  const pSize = Math.min(pSizeRaw, MAX_PSIZE);
  qp.set("pIndex", String(pIndex));
  qp.set("pSize", String(pSize));
  if (options?.AGE !== undefined) {
    qp.set("AGE", String(options.AGE));
  }
  if (options?.extra) {
    for (const [k, v] of Object.entries(options.extra)) {
      if (v !== undefined && v !== "") {
        qp.set(k, String(v));
      }
    }
  }
  return `${BASE_URL}/${datasetId}?${qp.toString()}`;
}

function isHeadCount(item: unknown): item is AssemblyHeadCount {
  return typeof item === "object" && item !== null && "list_total_count" in item;
}

function isHeadResult(item: unknown): item is AssemblyHeadResult {
  return typeof item === "object" && item !== null && "RESULT" in item;
}

function parseEnvelope<TRow>(datasetId: string, raw: unknown): AssemblyParsedResult<TRow> {
  if (typeof raw !== "object" || raw === null) {
    throw new Error(`국회 Open API: 잘못된 응답 형식 (${datasetId})`);
  }

  const obj = raw as Record<string, unknown>;

  // 에러 envelope: { RESULT: { CODE, MESSAGE } }
  const topResult = obj.RESULT;
  if (topResult && typeof topResult === "object" && "CODE" in topResult) {
    const resultObj = topResult as { CODE: unknown; MESSAGE?: unknown };
    const code = String(resultObj.CODE);
    const message = String(resultObj.MESSAGE ?? "");
    if (code === "INFO-200") {
      return { rows: [], totalCount: 0, code, message };
    }
    throw new Error(`국회 Open API ${code}: ${message} (dataset=${datasetId})`);
  }

  // 성공 envelope: { [datasetId]: [{head:[...]}, {row:[...]}] }
  const section = obj[datasetId];
  if (!Array.isArray(section)) {
    throw new Error(`국회 Open API: dataset 응답 누락 (${datasetId})`);
  }

  const sections = section as AssemblySuccessSection<TRow>[];
  let totalCount = 0;
  let code = "INFO-000";
  let message = "정상 처리되었습니다.";
  let rows: TRow[] = [];

  for (const part of sections) {
    if (part.head) {
      for (const headItem of part.head) {
        if (isHeadCount(headItem)) {
          totalCount = headItem.list_total_count;
        } else if (isHeadResult(headItem)) {
          code = headItem.RESULT.CODE;
          message = headItem.RESULT.MESSAGE;
        }
      }
    }
    if (part.row) {
      rows = part.row;
    }
  }

  if (code !== "INFO-000" && code !== "INFO-200") {
    throw new Error(`국회 Open API ${code}: ${message} (dataset=${datasetId})`);
  }

  return { rows, totalCount, code, message };
}

// ---------------------------------------------------------------------------
// Generic fetcher
// ---------------------------------------------------------------------------

/**
 * generic Open API 호출 — datasetId + 인증키 + 옵션으로 envelope 파싱 후 정규화 결과 반환.
 */
export async function fetchAssembly<TRow>(
  datasetId: string,
  apiKey: string,
  options?: AssemblyFetchOptions,
): Promise<AssemblyParsedResult<TRow>> {
  if (!datasetId) {
    throw new Error("국회 Open API: datasetId가 필요합니다.");
  }
  if (!apiKey) {
    throw new Error("국회 Open API: apiKey가 필요합니다.");
  }

  const url = buildUrl(datasetId, apiKey, options);
  const response = await fetchWithRetry(url, {
    timeoutMs: TIMEOUT_MS,
    maxRetries: MAX_RETRIES,
  });

  if (!response.ok) {
    throw new Error(`국회 Open API HTTP ${response.status} (dataset=${datasetId})`);
  }

  const raw = await response.json();
  return parseEnvelope<TRow>(datasetId, raw);
}

// ---------------------------------------------------------------------------
// Named wrappers — dataset_id 별 entry point
// ---------------------------------------------------------------------------

export function searchBills(apiKey: string, options?: AssemblyFetchOptions): Promise<AssemblyParsedResult<BillSearchRow>> {
  return fetchAssembly<BillSearchRow>("nzmimeepazxkubdpn", apiKey, options);
}

export function getBillProcessing(apiKey: string, options?: AssemblyFetchOptions): Promise<AssemblyParsedResult<BillProcessingRow>> {
  return fetchAssembly<BillProcessingRow>("nwbpacrgavhjryiph", apiKey, options);
}

export function getPendingBills(apiKey: string, options?: AssemblyFetchOptions): Promise<AssemblyParsedResult<PendingBillRow>> {
  return fetchAssembly<PendingBillRow>("nwbqublzajtcqpdae", apiKey, options);
}

export function getProcessedBills(apiKey: string, options?: AssemblyFetchOptions): Promise<AssemblyParsedResult<BillSearchRow>> {
  return fetchAssembly<BillSearchRow>("nzpltgfqabtcpsmai", apiKey, options);
}

export function getRecentPlenaryBills(apiKey: string, options?: AssemblyFetchOptions): Promise<AssemblyParsedResult<BillSearchRow>> {
  return fetchAssembly<BillSearchRow>("nxjuyqnxadtotdrbw", apiKey, options);
}

export function getPlenaryReferredBills(apiKey: string, options?: AssemblyFetchOptions): Promise<AssemblyParsedResult<BillSearchRow>> {
  return fetchAssembly<BillSearchRow>("nayjnliqaexiioauy", apiKey, options);
}

export function getCommitteeAlternativeBills(apiKey: string, options?: AssemblyFetchOptions): Promise<AssemblyParsedResult<BillSearchRow>> {
  return fetchAssembly<BillSearchRow>("nxtkyptyaolzcbfwl", apiKey, options);
}

export function getPlenaryVoteBills(apiKey: string, options?: AssemblyFetchOptions): Promise<AssemblyParsedResult<PlenaryVoteBillRow>> {
  return fetchAssembly<PlenaryVoteBillRow>("VCONFBILLLIST", apiKey, options);
}

export function getVoteByBill(apiKey: string, options?: AssemblyFetchOptions): Promise<AssemblyParsedResult<VoteByBillRow>> {
  return fetchAssembly<VoteByBillRow>("ncocpgfiaoituanbr", apiKey, options);
}

export function getPlenaryProcessedV1(apiKey: string, options?: AssemblyFetchOptions): Promise<AssemblyParsedResult<BillSearchRow>> {
  return fetchAssembly<BillSearchRow>("nkalemivaqmoibxro", apiKey, options);
}

// 주의: nbslryaradshbpbpm row schema는 BillProcessingRow (BILL_NM/COMMITTEE_NM/LINK_URL)
export function getPlenaryProcessedV2(apiKey: string, options?: AssemblyFetchOptions): Promise<AssemblyParsedResult<BillProcessingRow>> {
  return fetchAssembly<BillProcessingRow>("nbslryaradshbpbpm", apiKey, options);
}

export function getPlenaryProcessedV3(apiKey: string, options?: AssemblyFetchOptions): Promise<AssemblyParsedResult<BillSearchRow>> {
  return fetchAssembly<BillSearchRow>("nzgjnvnraowulzqwl", apiKey, options);
}

export function getCurrentMembers(apiKey: string, options?: AssemblyFetchOptions): Promise<AssemblyParsedResult<MemberCurrentRow>> {
  return fetchAssembly<MemberCurrentRow>("nwvrqwxyaytdsfvhu", apiKey, options);
}

export function getMemberHistory(apiKey: string, options?: AssemblyFetchOptions): Promise<AssemblyParsedResult<MemberHistoryRow>> {
  return fetchAssembly<MemberHistoryRow>("ALLNAMEMBER", apiKey, options);
}

// v2 추가 — 회의록/일정/표결/상세

export function searchBillsExtended(apiKey: string, options?: AssemblyFetchOptions): Promise<AssemblyParsedResult<BillSearchRow>> {
  return fetchAssembly<BillSearchRow>("TVBPMBILL11", apiKey, options);
}

export function getBillReceipts(apiKey: string, options?: AssemblyFetchOptions): Promise<AssemblyParsedResult<BillReceiptRow>> {
  return fetchAssembly<BillReceiptRow>("BILLRCP", apiKey, options);
}

export function getBillJudge(apiKey: string, options?: AssemblyFetchOptions): Promise<AssemblyParsedResult<BillJudgeRow>> {
  return fetchAssembly<BillJudgeRow>("BILLJUDGE", apiKey, options);
}

export function getBillDetail(apiKey: string, options?: AssemblyFetchOptions): Promise<AssemblyParsedResult<BillDetailRow>> {
  return fetchAssembly<BillDetailRow>("BILLINFODETAIL", apiKey, options);
}

export function getBillProposers(apiKey: string, options?: AssemblyFetchOptions): Promise<AssemblyParsedResult<BillProposerRow>> {
  return fetchAssembly<BillProposerRow>("BILLINFOPPSR", apiKey, options);
}

export function getBillCommitteeConferences(apiKey: string, options?: AssemblyFetchOptions): Promise<AssemblyParsedResult<BillCommitteeConfRow>> {
  return fetchAssembly<BillCommitteeConfRow>("BILLJUDGECONF", apiKey, options);
}

export function getMemberVotes(apiKey: string, options?: AssemblyFetchOptions): Promise<AssemblyParsedResult<MemberVoteRow>> {
  return fetchAssembly<MemberVoteRow>("nojepdqqaweusdfbi", apiKey, options);
}

export function getPlenaryMinutes(apiKey: string, options?: AssemblyFetchOptions): Promise<AssemblyParsedResult<MinutesRow>> {
  return fetchAssembly<MinutesRow>("nzbyfwhwaoanttzje", apiKey, options);
}

export function getCommitteeMinutes(apiKey: string, options?: AssemblyFetchOptions): Promise<AssemblyParsedResult<MinutesRow>> {
  return fetchAssembly<MinutesRow>("ncwgseseafwbuheph", apiKey, options);
}

export function getPlenarySchedule(apiKey: string, options?: AssemblyFetchOptions): Promise<AssemblyParsedResult<PlenaryScheduleRow>> {
  return fetchAssembly<PlenaryScheduleRow>("nekcaiymatialqlxr", apiKey, options);
}
