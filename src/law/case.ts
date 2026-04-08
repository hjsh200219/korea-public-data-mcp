/**
 * 법제처 API — 판례/헌재결정례/법령해석례/위원회결정문/행정심판례
 */

import type {
  SearchParams,
  CaseSearchParams,
  SearchResult,
  CaseListItem,
  CaseDetail,
  ConstitutionalListItem,
  ConstitutionalDetail,
  InterpretationListItem,
  InterpretationDetail,
  CommitteeDecisionListItem,
  CommitteeDecisionDetail,
  AdminAppealListItem,
  AdminAppealDetail,
} from "../law-types.js";
import {
  fetchXml,
  buildSearchUrl,
  buildDetailUrl,
  str,
  num,
  ensureArray,
  stripHtmlTags,
} from "./helpers.js";

// =========================================================
// 판례 (prec)
// =========================================================

export async function searchCases(
  oc: string,
  params: CaseSearchParams
): Promise<SearchResult<CaseListItem>> {
  let url = buildSearchUrl(oc, "prec", params);
  const u = new URL(url);
  if (params.search) u.searchParams.set("search", String(params.search));
  if (params.dateFrom || params.dateTo) {
    u.searchParams.set("prncYd", `${params.dateFrom || ""}~${params.dateTo || ""}`);
  }
  if (params.court) u.searchParams.set("org", params.court);
  url = u.toString();

  const data = await fetchXml(url);
  const root = data.PrecSearch as Record<string, unknown> | undefined;
  if (!root) return { totalCount: 0, currentPage: params.page || 1, items: [] };

  const rawList = ensureArray(root.prec as Record<string, unknown>[]);
  return {
    totalCount: num(root.totalCnt),
    currentPage: num(root.page) || params.page || 1,
    items: rawList.map((raw) => ({
      id: num(raw.판례일련번호),
      caseName: str(raw.사건명),
      caseNumber: str(raw.사건번호),
      decisionDate: str(raw.선고일자),
      courtName: str(raw.법원명),
      caseType: str(raw.사건종류명),
      verdictType: str(raw.판결유형),
      verdict: str(raw.선고),
      detailLink: str(raw.판례상세링크),
    })),
  };
}

export async function getCaseDetail(
  oc: string,
  id: number
): Promise<CaseDetail> {
  const url = buildDetailUrl(oc, "prec", "ID", id);
  const data = await fetchXml(url);

  const root = data.PrecService as Record<string, unknown> | undefined;
  if (!root) throw new Error("판례를 찾을 수 없습니다");

  return {
    id: num(root.판례정보일련번호 || root.판례일련번호),
    caseName: str(root.사건명),
    caseNumber: str(root.사건번호),
    decisionDate: str(root.선고일자),
    verdict: str(root.선고),
    courtName: str(root.법원명),
    caseType: str(root.사건종류명),
    verdictType: str(root.판결유형),
    holdings: stripHtmlTags(str(root.판시사항)),
    summary: stripHtmlTags(str(root.판결요지)),
    referenceLaws: stripHtmlTags(str(root.참조조문)),
    referenceCases: stripHtmlTags(str(root.참조판례)),
    content: stripHtmlTags(str(root.판례내용)),
  };
}

// =========================================================
// 헌재결정례 (detc)
// =========================================================

export async function searchConstitutional(
  oc: string,
  params: SearchParams
): Promise<SearchResult<ConstitutionalListItem>> {
  const url = buildSearchUrl(oc, "detc", params);
  const data = await fetchXml(url);

  const root = data.DetcSearch as Record<string, unknown> | undefined;
  if (!root) return { totalCount: 0, currentPage: params.page || 1, items: [] };

  const rawList = ensureArray(root.Detc as Record<string, unknown>[]);
  return {
    totalCount: num(root.totalCnt),
    currentPage: num(root.page) || params.page || 1,
    items: rawList.map((raw) => ({
      id: num(raw.헌재결정례일련번호),
      conclusionDate: str(raw.종국일자),
      caseNumber: str(raw.사건번호),
      caseName: str(raw.사건명),
      detailLink: str(raw.헌재결정례상세링크),
    })),
  };
}

export async function getConstitutionalDetail(
  oc: string,
  id: number
): Promise<ConstitutionalDetail> {
  const url = buildDetailUrl(oc, "detc", "ID", id);
  const data = await fetchXml(url);

  const root = data.DetcService as Record<string, unknown> | undefined;
  if (!root) throw new Error("헌재결정례를 찾을 수 없습니다");

  return {
    id: num(root.헌재결정례일련번호),
    conclusionDate: str(root.종국일자),
    caseNumber: str(root.사건번호),
    caseName: str(root.사건명),
    caseType: str(root.사건종류명),
    holdings: stripHtmlTags(str(root.판시사항)),
    decisionSummary: stripHtmlTags(str(root.결정요지)),
    fullText: stripHtmlTags(str(root.전문)),
    referenceLaws: stripHtmlTags(str(root.참조조문)),
    referenceCases: stripHtmlTags(str(root.참조판례)),
  };
}

// =========================================================
// 법령해석례 (expc)
// =========================================================

export async function searchInterpretations(
  oc: string,
  params: SearchParams
): Promise<SearchResult<InterpretationListItem>> {
  const url = buildSearchUrl(oc, "expc", params);
  const data = await fetchXml(url);

  const root = data.Expc as Record<string, unknown> | undefined;
  if (!root) return { totalCount: 0, currentPage: params.page || 1, items: [] };

  const rawList = ensureArray(root.expc as Record<string, unknown>[]);
  return {
    totalCount: num(root.totalCnt),
    currentPage: num(root.page) || params.page || 1,
    items: rawList.map((raw) => ({
      id: num(raw.법령해석례일련번호),
      title: str(raw.안건명),
      caseNumber: str(raw.안건번호),
      inquiryOrg: str(raw.질의기관명),
      replyOrg: str(raw.회신기관명),
      replyDate: str(raw.회신일자),
      detailLink: str(raw.법령해석례상세링크),
    })),
  };
}

export async function getInterpretationDetail(
  oc: string,
  id: number
): Promise<InterpretationDetail> {
  const url = buildDetailUrl(oc, "expc", "ID", id);
  const data = await fetchXml(url);

  const root = data.ExpcService as Record<string, unknown> | undefined;
  if (!root) throw new Error("법령해석례를 찾을 수 없습니다");

  return {
    id: num(root.법령해석례일련번호),
    title: str(root.안건명),
    caseNumber: str(root.안건번호),
    interpretationDate: str(root.해석일자),
    interpretationOrg: str(root.해석기관명),
    inquiryOrg: str(root.질의기관명),
    inquirySummary: stripHtmlTags(str(root.질의요지)),
    reply: stripHtmlTags(str(root.회답)),
    reason: stripHtmlTags(str(root.이유)),
  };
}

// =========================================================
// 위원회 결정문 (11개 위원회 통합)
// =========================================================

interface CommitteeConfig {
  searchRoot: string;
  itemTag: string;
  detailRoot: string;
  name: string;
}

const COMMITTEE_CONFIG: Record<string, CommitteeConfig> = {
  ftc:    { searchRoot: "Ftc",    itemTag: "ftc",    detailRoot: "FtcService",    name: "공정거래위원회" },
  acr:    { searchRoot: "Acr",    itemTag: "acr",    detailRoot: "AcrService",    name: "국민권익위원회" },
  fsc:    { searchRoot: "Fsc",    itemTag: "fsc",    detailRoot: "FscService",    name: "금융위원회" },
  nlrc:   { searchRoot: "Nlrc",   itemTag: "nlrc",   detailRoot: "NlrcService",   name: "노동위원회" },
  kcc:    { searchRoot: "Kcc",    itemTag: "kcc",    detailRoot: "KccService",    name: "방송통신위원회" },
  oclt:   { searchRoot: "Oclt",   itemTag: "oclt",   detailRoot: "OcltService",   name: "중앙토지수용위원회" },
  nhrck:  { searchRoot: "Nhrck",  itemTag: "nhrck",  detailRoot: "NhrckService",  name: "국가인권위원회" },
  eiac:   { searchRoot: "Eiac",   itemTag: "eiac",   detailRoot: "EiacService",   name: "고용보험심사위원회" },
  ecc:    { searchRoot: "Ecc",    itemTag: "ecc",    detailRoot: "EccService",    name: "중앙환경분쟁조정위원회" },
  sfc:    { searchRoot: "Sfc",    itemTag: "sfc",    detailRoot: "SfcService",    name: "증권선물위원회" },
  iaciac: { searchRoot: "Iaciac", itemTag: "iaciac", detailRoot: "IaciacService", name: "산재보험재심사위원회" },
};

export function getCommitteeName(committee: string): string {
  return COMMITTEE_CONFIG[committee]?.name || committee;
}

export async function searchCommitteeDecisions(
  oc: string,
  committee: string,
  params: SearchParams
): Promise<SearchResult<CommitteeDecisionListItem>> {
  const config = COMMITTEE_CONFIG[committee];
  if (!config) throw new Error(`지원하지 않는 위원회: ${committee}`);

  const url = buildSearchUrl(oc, committee, params);
  const data = await fetchXml(url);

  const root = data[config.searchRoot] as Record<string, unknown> | undefined;
  if (!root) return { totalCount: 0, currentPage: params.page || 1, items: [] };

  const rawList = ensureArray(root[config.itemTag] as Record<string, unknown>[]);
  return {
    totalCount: num(root.totalCnt),
    currentPage: num(root.page) || params.page || 1,
    items: rawList.map((raw) => ({
      id: num(raw.결정문일련번호),
      title: str(raw.사건명 || raw.안건명 || raw.제목),
      caseNumber: str(raw.사건번호 || raw.안건번호 || raw.의결번호 || raw.결정번호 || raw.의안번호),
      decisionDate: str(raw.결정일자 || raw.의결일자 || raw.의결일 || raw.등록일),
      agencyName: str(raw.기관명 || root.기관명 || config.name),
      detailLink: str(raw.결정문상세링크),
    })),
  };
}

export async function getCommitteeDecisionDetail(
  oc: string,
  committee: string,
  id: number
): Promise<CommitteeDecisionDetail> {
  const config = COMMITTEE_CONFIG[committee];
  if (!config) throw new Error(`지원하지 않는 위원회: ${committee}`);

  const url = buildDetailUrl(oc, committee, "ID", id);
  const data = await fetchXml(url);

  // 일부 위원회(acr)는 다른 루트 엘리먼트를 사용할 수 있음
  const root = (data[config.detailRoot] || data["의결서"]) as Record<string, unknown> | undefined;
  if (!root) throw new Error(`${config.name} 결정문을 찾을 수 없습니다`);

  const extras: Record<string, string> = {};

  // 위원회별 고유 필드 추출
  const extraFields: Record<string, string[]> = {
    ftc:    ["피심정보", "문서유형", "회의종류", "위원정보"],
    acr:    ["민원표시명", "결정구분", "회의종류"],
    fsc:    ["조치대상자"],
    nlrc:   ["자료구분", "판정사항"],
    kcc:    ["피심인", "의결서유형"],
    oclt:   [],
    nhrck:  ["위원회명"],
    eiac:   ["사건의분류", "의결서종류", "청구취지"],
    ecc:    ["신청인", "피신청인", "분쟁의경과", "당사자주장", "사실조사결과"],
    sfc:    ["조치대상자의인적사항"],
    iaciac: ["사건대분류", "사건중분류", "사건소분류", "쟁점", "청구취지"],
  };

  for (const field of extraFields[committee] || []) {
    const val = str(root[field]);
    if (val) extras[field] = stripHtmlTags(val);
  }

  return {
    id: num(root.결정문일련번호),
    title: str(root.사건명 || root.안건명 || root.제목),
    caseNumber: str(root.사건번호 || root.안건번호 || root.의결번호 || root.결정번호 || root.의안번호),
    agencyName: str(root.기관명 || config.name),
    decisionDate: str(root.결정일자 || root.의결일자 || root.의결일),
    ruling: stripHtmlTags(str(root.주문 || root.조치내용)),
    reason: stripHtmlTags(str(root.이유 || root.조치이유)),
    summary: stripHtmlTags(str(root.결정요지 || root.판정요지 || root.사건의개요 || root.개요 || root.내용)),
    extras,
  };
}

// =========================================================
// 행정심판례 (decc)
// =========================================================

export async function searchAdminAppeals(
  oc: string,
  params: SearchParams
): Promise<SearchResult<AdminAppealListItem>> {
  const url = buildSearchUrl(oc, "decc", params);
  const data = await fetchXml(url);

  const root = data.Decc as Record<string, unknown> | undefined;
  if (!root) return { totalCount: 0, currentPage: params.page || 1, items: [] };

  const rawList = ensureArray(root.decc as Record<string, unknown>[]);
  return {
    totalCount: num(root.totalCnt),
    currentPage: num(root.page) || params.page || 1,
    items: rawList.map((raw) => ({
      id: num(raw.행정심판재결례일련번호),
      caseName: str(raw.사건명),
      caseNumber: str(raw.사건번호),
      dispositionDate: str(raw.처분일자),
      decisionDate: str(raw.의결일자),
      dispositionAgency: str(raw.처분청),
      decisionAgency: str(raw.재결청),
      decisionType: str(raw.재결구분명),
      decisionTypeCode: str(raw.재결구분코드),
      detailLink: str(raw.행정심판례상세링크),
    })),
  };
}

export async function getAdminAppealDetail(
  oc: string,
  id: number
): Promise<AdminAppealDetail> {
  const url = buildDetailUrl(oc, "decc", "ID", id);
  const data = await fetchXml(url);

  const root = data.PrecService as Record<string, unknown> | undefined;
  if (!root) throw new Error("행정심판례를 찾을 수 없습니다");

  return {
    id: num(root.행정심판례일련번호),
    caseName: str(root.사건명),
    caseNumber: str(root.사건번호),
    dispositionDate: str(root.처분일자),
    decisionDate: str(root.의결일자),
    dispositionAgency: str(root.처분청),
    decisionAgency: str(root.재결청),
    decisionTypeName: str(root.재결례유형명),
    ruling: stripHtmlTags(str(root.주문)),
    claim: stripHtmlTags(str(root.청구취지)),
    reason: stripHtmlTags(str(root.이유)),
    summary: stripHtmlTags(str(root.재결요지)),
  };
}
