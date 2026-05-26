/**
 * 국회 Open API (open.assembly.go.kr) 타입 정의
 *
 * 응답 envelope (성공):
 *   { <datasetId>: [
 *     { head: [{ list_total_count: number }, { RESULT: { CODE, MESSAGE } }] },
 *     { row: [...] }
 *   ] }
 *
 * 응답 envelope (에러):
 *   { RESULT: { CODE, MESSAGE } }
 *
 * 에러 코드:
 *   INFO-000  성공
 *   INFO-200  데이터 없음 (정상 처리, 빈 결과)
 *   ERROR-300 필수 파라미터 누락
 *   ERROR-310 invalid 서비스 ID
 *   ERROR-336 인증키 오류
 */

// ---------------------------------------------------------------------------
// 공통 envelope
// ---------------------------------------------------------------------------

export interface AssemblyResultPayload {
  CODE: string;
  MESSAGE: string;
}

export interface AssemblyHeadCount {
  list_total_count: number;
}

export interface AssemblyHeadResult {
  RESULT: AssemblyResultPayload;
}

export type AssemblyHeadItem = AssemblyHeadCount | AssemblyHeadResult;

export interface AssemblySuccessSection<TRow> {
  head?: AssemblyHeadItem[];
  row?: TRow[];
}

// 응답 envelope shape (문서용):
//   성공 — { [datasetId]: AssemblySuccessSection<TRow>[] }
//   에러 — { RESULT: AssemblyResultPayload }
// parseEnvelope()는 unknown으로 받아 narrowing하므로 별도 export 타입 불요.

/** 파서가 반환하는 정규화된 결과 */
export interface AssemblyParsedResult<TRow> {
  rows: TRow[];
  totalCount: number;
  code: string;
  message: string;
}

// ---------------------------------------------------------------------------
// 요청 파라미터
// ---------------------------------------------------------------------------

/**
 * Open API 공통 + dataset별 추가 query string 파라미터.
 * 모든 값은 string 또는 number — 빌더가 URLSearchParams로 인코딩.
 */
export type AssemblyQueryParams = Record<string, string | number | undefined>;

export interface AssemblyFetchOptions {
  /** 페이지 번호 (1-base, 기본 1) */
  pIndex?: number;
  /** 페이지 크기 (기본 10, 최대 1000) */
  pSize?: number;
  /** 국회 대수 (예: 22 — dataset에 따라 필수/선택) */
  AGE?: string | number;
  /** dataset별 추가 필터 파라미터 */
  extra?: AssemblyQueryParams;
}

// ---------------------------------------------------------------------------
// dataset별 row 타입 (실 응답 기반 핵심 필드만 — unknown 추가 필드는 row passthrough)
// ---------------------------------------------------------------------------

/** nzmimeepazxkubdpn — 의안정보 검색 */
export interface BillSearchRow {
  BILL_ID?: string;
  BILL_NO?: string;
  BILL_NAME?: string;
  COMMITTEE?: string | null;
  PROPOSE_DT?: string;
  PROC_RESULT?: string | null;
  AGE?: string;
  DETAIL_LINK?: string;
  PROPOSER?: string;
  MEMBER_LIST?: string;
  RST_PROPOSER?: string;
  PUBL_PROPOSER?: string;
  LAW_PROC_DT?: string | null;
  LAW_PRESENT_DT?: string | null;
  LAW_SUBMIT_DT?: string | null;
  CMT_PROC_RESULT_CD?: string | null;
  CMT_PROC_DT?: string | null;
  CMT_PRESENT_DT?: string | null;
  COMMITTEE_DT?: string | null;
  PROC_DT?: string | null;
}

/** nwbpacrgavhjryiph — 법률안 처리현황 (위원회별) */
export interface BillProcessingRow {
  AGE?: string;
  BILL_NO?: string;
  BILL_NM?: string;
  BILL_KIND?: string;
  PROPOSER?: string;
  COMMITTEE_NM?: string;
  PROC_RESULT_CD?: string | null;
  PROC_DT?: string | null;
  PROPOSE_DT?: string;
  LINK_URL?: string;
}

/** nwbqublzajtcqpdae — 계류의안 */
export interface PendingBillRow {
  BILL_ID?: string;
  BILL_NO?: string;
  BILL_KND?: string;
  BILL_NM?: string;
  PPSR_KND?: string;
  PPSR_NM?: string;
  PPSL_DT?: string;
  JRCMIT_NM?: string;
  JRCMIT_CMMT_DT?: string | null;
  LINK_URL?: string;
}

/** VCONFBILLLIST — 본회의 의결안건 */
export interface PlenaryVoteBillRow {
  CONF_ID?: string;
  ERACO?: string;
  SESS?: string;
  DGR?: string;
  BILL_ID?: string;
  BILL_NM?: string;
  LINK_URL?: string;
  CONF_DT?: string;
  ANS_VOTE_CNT?: number | string;
  NO_VOTE_CNT?: number | string;
  BLANK_VOTE_CNT?: number | string;
  TOT_VOTE_CNT?: number | string;
  PRESENT_MEM_CNT?: number | string;
  RESULT_VOTE_MOD?: string;
}

/** nwvrqwxyaytdsfvhu — 현직 국회의원 (22대) */
export interface MemberCurrentRow {
  HG_NM?: string;
  HJ_NM?: string;
  ENG_NM?: string;
  BTH_GBN_NM?: string;
  BTH_DATE?: string;
  JOB_RES_NM?: string;
  POLY_NM?: string;
  ORIG_NM?: string;
  ELECT_GBN_NM?: string;
  CMIT_NM?: string;
  CMITS?: string;
  REELE_GBN_NM?: string;
  UNITS?: string;
  SEX_GBN_NM?: string;
  TEL_NO?: string;
  E_MAIL?: string;
  HOMEPAGE?: string;
  STAFF?: string;
  SECRETARY?: string;
  SECRETARY2?: string;
  ASSEM_ADDR?: string;
  MEM_TITLE?: string;
}

/** ncocpgfiaoituanbr — 의안별 표결현황 (집계) */
export interface VoteByBillRow {
  BILL_ID?: string;
  BILL_NO?: string;
  BILL_NAME?: string;
  AGE?: string;
  PROC_DT?: string;
  CURR_COMMITTEE?: string;
  CURR_COMMITTEE_ID?: string;
  PROC_RESULT_CD?: string;
  BILL_KIND_CD?: string;
  MEMBER_TCNT?: number | string;
  VOTE_TCNT?: number | string;
  YES_TCNT?: number | string;
  NO_TCNT?: number | string;
  BLANK_TCNT?: number | string;
  LINK_URL?: string;
}

/** nzbyfwhwaoanttzje — 본회의 회의록 / ncwgseseafwbuheph — 위원회 회의록 (공통 스키마) */
export interface MinutesRow {
  CONFER_NUM?: string;
  TITLE?: string;
  CLASS_NAME?: string;
  DAE_NUM?: string;
  COMM_NAME?: string;
  DEPT_CD?: string;
  CONF_DATE?: string;
  SUB_NUM?: string;
  SUB_NAME?: string;
  VOD_LINK_URL?: string;
  CONF_LINK_URL?: string;
  PDF_LINK_URL?: string;
  CONF_ID?: string;
}

/** nekcaiymatialqlxr — 본회의 일정 */
export interface PlenaryScheduleRow {
  MEETINGSESSION?: string;
  CHA?: string;
  TITLE?: string;
  MEETTING_DATE?: string;
  MEETTING_TIME?: string;
  LINK_URL?: string;
  UNIT_CD?: string;
  UNIT_NM?: string;
  CONTS?: string;
}

/** nojepdqqaweusdfbi — 국회의원 본회의 표결정보 */
export interface MemberVoteRow {
  HG_NM?: string;
  HJ_NM?: string;
  POLY_NM?: string;
  ORIG_NM?: string;
  MEMBER_NO?: string;
  MONA_CD?: string;
  VOTE_DATE?: string;
  BILL_NO?: string;
  BILL_NAME?: string;
  BILL_ID?: string;
  LAW_TITLE?: string;
  CURR_COMMITTEE?: string;
  CURR_COMMITTEE_ID?: string;
  RESULT_VOTE_MOD?: string;
  DEPT_CD?: string;
  BILL_URL?: string;
  BILL_NAME_URL?: string;
  AGE?: string;
}

/** BILLINFODETAIL — 의안 상세정보 */
export interface BillDetailRow {
  BILL_ID?: string;
  BILL_NO?: string;
  BILL_NM?: string;
  PPSR?: string;
  PPSR_KIND?: string;
  PPSL_DT?: string;
  JRCMIT_NM?: string;
  JRCMIT_CMMT_DT?: string | null;
  JRCMIT_PRSNT_DT?: string | null;
  JRCMIT_PROC_DT?: string | null;
  JRCMIT_PROC_RSLT?: string | null;
  LAW_CMMT_DT?: string | null;
  LAW_PRSNT_DT?: string | null;
  LAW_PROC_DT?: string | null;
  LAW_PROC_RSLT?: string | null;
  RGS_PRSNT_DT?: string | null;
  RGS_RSLN_DT?: string | null;
  RGS_CONF_NM?: string | null;
  RGS_CONF_RSLT?: string | null;
  GVRN_TRSF_DT?: string | null;
  PROM_LAW_NM?: string | null;
  PROM_DT?: string | null;
  PROM_NO?: string | null;
  LINK_URL?: string;
}

/** BILLINFOPPSR — 의안 제안자 정보 */
export interface BillProposerRow {
  ERACO?: string;
  BILL_ID?: string;
  BILL_NO?: string;
  BILL_NM?: string;
  RST_MONA_CD?: string;
  RST_PROPOSER?: string;
  PUBL_PROPOSER?: string;
  MEMBER_LIST?: string;
}

/** BILLJUDGECONF — 위원회 회의정보 (의안별) */
export interface BillCommitteeConfRow {
  ERACO?: string;
  BILL_ID?: string;
  BILL_NO?: string;
  BILL_NM?: string;
  CONF_ID?: string;
  CONF_TTL?: string;
  CONF_DT?: string;
  CMMT_PROC_RSLT?: string | null;
  LINK_URL?: string;
}

/** BILLRCP — 의안 접수목록 */
export interface BillReceiptRow {
  ERACO?: string;
  BILL_ID?: string;
  BILL_NO?: string;
  BILL_KIND?: string;
  BILL_NM?: string;
  PPSR_KIND?: string;
  PPSL_DT?: string;
  PROC_RSLT?: string | null;
  LINK_URL?: string;
}

/** BILLJUDGE — 위원회 심사정보 */
export interface BillJudgeRow {
  ERACO?: string;
  BILL_ID?: string;
  BILL_NO?: string;
  BILL_NM?: string;
  PPSR_KIND?: string;
  PPSL_DT?: string;
  JRCMIT_NM?: string;
  BDG_CMMT_DT?: string | null;
  JRCMIT_PRSNT_DT?: string | null;
  JRCMIT_PROC_DT?: string | null;
  JRCMIT_PROC_RSLT?: string | null;
  LINK_URL?: string;
}

/** ALLNAMEMBER — 역대 국회의원 */
export interface MemberHistoryRow {
  NAAS_CD?: string;
  NAAS_NM?: string;
  NAAS_CH_NM?: string;
  NAAS_EN_NM?: string | null;
  BIRDY_DIV_CD?: string;
  BIRDY_DT?: string;
  DTY_NM?: string | null;
  PLPT_NM?: string;
  ELECD_NM?: string | null;
  ELECD_DIV_NM?: string | null;
  CMIT_NM?: string | null;
  BLNG_CMIT_NM?: string | null;
  RLCT_DIV_NM?: string | null;
  GTELT_ERACO?: string;
  NTR_DIV?: string | null;
  NAAS_TEL_NO?: string | null;
  NAAS_EMAIL_ADDR?: string | null;
  NAAS_HP_URL?: string | null;
  AIDE_NM?: string | null;
  CHF_SCRT_NM?: string | null;
  SCRT_NM?: string | null;
  BRF_HST?: string | null;
  OFFM_RNUM_NO?: string | null;
  NAAS_PIC?: string | null;
}
