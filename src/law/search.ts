/**
 * 법제처 API — 법령/행정규칙/자치법규/조약/법령용어/영문법령/별표서식/약칭/AI법령용어/연계조례 검색
 */

import type {
  SearchParams,
  LawSearchParams,
  OrdinSearchParams,
  AttachedFormSearchParams,
  SearchResult,
  LawListItem,
  AdminRuleListItem,
  OrdinanceListItem,
  TreatyListItem,
  LegalTermListItem,
  ElawListItem,
  AttachedFormListItem,
  LawAbbreviationListItem,
  AILegalTermListItem,
  LinkedOrdinanceListItem,
} from "../law-types.js";
import {
  fetchXml,
  buildSearchUrl,
  str,
  num,
  ensureArray,
} from "./helpers.js";

// =========================================================
// 법령 (law)
// =========================================================

export async function searchLaws(
  oc: string,
  params: LawSearchParams
): Promise<SearchResult<LawListItem>> {
  const url = buildSearchUrl(oc, "law", params);
  if (params.search) {
    const u = new URL(url);
    u.searchParams.set("search", String(params.search));
    if (params.org) u.searchParams.set("org", params.org);
    const data = await fetchXml(u.toString());
    return normalizeLawList(data, params.page);
  }
  const data = await fetchXml(url);
  return normalizeLawList(data, params.page);
}

function normalizeLawList(
  data: Record<string, unknown>,
  page?: number
): SearchResult<LawListItem> {
  const root = data.LawSearch as Record<string, unknown> | undefined;
  if (!root) return { totalCount: 0, currentPage: page || 1, items: [] };

  const rawList = ensureArray(root.law as Record<string, unknown>[]);
  return {
    totalCount: num(root.totalCnt),
    currentPage: num(root.page) || page || 1,
    items: rawList.map((raw) => ({
      id: num(raw.법령일련번호),
      lawName: str(raw.법령명한글),
      lawAbbreviation: str(raw.법령약칭명),
      lawId: str(raw.법령ID),
      promulgationDate: str(raw.공포일자),
      promulgationNumber: str(raw.공포번호),
      amendmentType: str(raw.제개정구분명),
      departmentName: str(raw.소관부처명),
      lawType: str(raw.법령구분명),
      enforcementDate: str(raw.시행일자),
      currentHistoryCode: str(raw.현행연혁코드),
      detailLink: str(raw.법령상세링크),
    })),
  };
}

// =========================================================
// 행정규칙 (admrul) — 검색
// =========================================================

export async function searchAdminRules(
  oc: string,
  params: SearchParams
): Promise<SearchResult<AdminRuleListItem>> {
  const url = buildSearchUrl(oc, "admrul", params);
  const data = await fetchXml(url);

  const root = data.AdmRulSearch as Record<string, unknown> | undefined;
  if (!root) return { totalCount: 0, currentPage: params.page || 1, items: [] };

  const rawList = ensureArray(root.admrul as Record<string, unknown>[]);
  return {
    totalCount: num(root.totalCnt),
    currentPage: num(root.page) || params.page || 1,
    items: rawList.map((raw) => ({
      id: num(raw.행정규칙일련번호),
      ruleName: str(raw.행정규칙명),
      ruleType: str(raw.행정규칙종류),
      issuanceDate: str(raw.발령일자),
      issuanceNumber: str(raw.발령번호),
      departmentName: str(raw.소관부처명),
      currentHistoryType: str(raw.현행연혁구분),
      amendmentType: str(raw.제개정구분명),
      ruleId: str(raw.행정규칙ID),
      enforcementDate: str(raw.시행일자),
      detailLink: str(raw.행정규칙상세링크),
    })),
  };
}

// =========================================================
// 자치법규 (ordin) — 검색
// =========================================================

export async function searchOrdinances(
  oc: string,
  params: OrdinSearchParams
): Promise<SearchResult<OrdinanceListItem>> {
  let url = buildSearchUrl(oc, "ordin", params);
  if (params.search) {
    const u = new URL(url);
    u.searchParams.set("search", String(params.search));
    url = u.toString();
  }
  const data = await fetchXml(url);

  const root = data.OrdinSearch as Record<string, unknown> | undefined;
  if (!root) return { totalCount: 0, currentPage: params.page || 1, items: [] };

  const rawList = ensureArray(root.law as Record<string, unknown>[]);
  return {
    totalCount: num(root.totalCnt),
    currentPage: num(root.page) || params.page || 1,
    items: rawList.map((raw) => ({
      id: num(raw.자치법규일련번호),
      ordinanceName: str(raw.자치법규명),
      ordinanceId: str(raw.자치법규ID),
      promulgationDate: str(raw.공포일자),
      promulgationNumber: str(raw.공포번호),
      amendmentType: str(raw.제개정구분명),
      localGovName: str(raw.지자체기관명),
      ordinanceType: str(raw.자치법규종류),
      enforcementDate: str(raw.시행일자),
      detailLink: str(raw.자치법규상세링크),
    })),
  };
}

// =========================================================
// 조약 (trty) — 검색
// =========================================================

export async function searchTreaties(
  oc: string,
  params: SearchParams
): Promise<SearchResult<TreatyListItem>> {
  const url = buildSearchUrl(oc, "trty", params);
  const data = await fetchXml(url);

  const root = data.TrtySearch as Record<string, unknown> | undefined;
  if (!root) return { totalCount: 0, currentPage: params.page || 1, items: [] };

  const rawList = ensureArray(root.Trty as Record<string, unknown>[]);
  return {
    totalCount: num(root.totalCnt),
    currentPage: num(root.page) || params.page || 1,
    items: rawList.map((raw) => ({
      id: num(raw.조약일련번호),
      treatyName: str(raw.조약명),
      treatyType: str(raw.조약구분명),
      effectiveDate: str(raw.발효일자),
      signDate: str(raw.서명일자),
      treatyNumber: str(raw.조약번호),
      detailLink: str(raw.조약상세링크),
    })),
  };
}

// =========================================================
// 법령용어 (lstrm) — 검색
// =========================================================

export async function searchLegalTerms(
  oc: string,
  params: SearchParams
): Promise<SearchResult<LegalTermListItem>> {
  const url = buildSearchUrl(oc, "lstrm", params);
  const data = await fetchXml(url);

  const root = data.LsTrmSearch as Record<string, unknown> | undefined;
  if (!root) return { totalCount: 0, currentPage: params.page || 1, items: [] };

  const rawList = ensureArray(root.lstrm as Record<string, unknown>[]);
  return {
    totalCount: num(root.totalCnt),
    currentPage: num(root.page) || params.page || 1,
    items: rawList.map((raw) => ({
      id: str(raw.법령용어ID),
      termName: str(raw.법령용어명),
      detailLink: str(raw.법령용어상세링크),
    })),
  };
}

// =========================================================
// 영문법령 (elaw) — 검색
// =========================================================

export async function searchEnglishLaws(
  oc: string,
  params: SearchParams
): Promise<SearchResult<ElawListItem>> {
  const url = buildSearchUrl(oc, "elaw", params);
  const data = await fetchXml(url);

  const root = data.LawSearch as Record<string, unknown> | undefined;
  if (!root) return { totalCount: 0, currentPage: params.page || 1, items: [] };

  const rawList = ensureArray(root.law as Record<string, unknown>[]);
  return {
    totalCount: num(root.totalCnt),
    currentPage: num(root.page) || params.page || 1,
    items: rawList.map((raw) => ({
      id: num(raw.법령일련번호),
      lawNameKo: str(raw.법령명한글),
      lawNameEn: str(raw.법령명영문),
      lawId: str(raw.법령ID),
      promulgationDate: str(raw.공포일자),
      promulgationNumber: str(raw.공포번호),
      amendmentType: str(raw.제개정구분명),
      departmentName: str(raw.소관부처명),
      lawType: str(raw.법령구분명),
      enforcementDate: str(raw.시행일자),
      currentHistoryCode: str(raw.현행연혁코드),
      detailLink: str(raw.법령상세링크),
    })),
  };
}

// =========================================================
// 별표서식 (licbyl)
// =========================================================

export async function searchAttachedForms(
  oc: string,
  params: AttachedFormSearchParams
): Promise<SearchResult<AttachedFormListItem>> {
  const url = buildSearchUrl(oc, "licbyl", params);
  const u = new URL(url);
  if (params.search) u.searchParams.set("search", String(params.search));
  if (params.knd) u.searchParams.set("knd", String(params.knd));

  const data = await fetchXml(u.toString());

  const root = data.licBylSearch as Record<string, unknown> | undefined;
  if (!root) return { totalCount: 0, currentPage: params.page || 1, items: [] };

  const rawList = ensureArray(root.licbyl as Record<string, unknown>[]);
  return {
    totalCount: num(root.totalCnt),
    currentPage: num(root.page) || params.page || 1,
    items: rawList.map((raw) => ({
      id: num(raw.별표일련번호),
      relatedLawId: num(raw.관련법령일련번호),
      formName: str(raw.별표명),
      relatedLawName: str(raw.관련법령명),
      formNumber: str(raw.별표번호),
      formType: str(raw.별표종류),
      departmentName: str(raw.소관부처명),
      promulgationDate: str(raw.공포일자),
      amendmentType: str(raw.제개정구분명),
      lawType: str(raw.법령종류),
      fileLink: str(raw.별표서식파일링크),
      detailLink: str(raw.별표법령상세링크),
    })),
  };
}

// =========================================================
// 법령명 약칭 (lsAbrv)
// =========================================================

export async function searchLawAbbreviations(
  oc: string,
  params: SearchParams
): Promise<SearchResult<LawAbbreviationListItem>> {
  const url = buildSearchUrl(oc, "lsAbrv", params);
  const data = await fetchXml(url);

  const root = data.LawSearch as Record<string, unknown> | undefined;
  if (!root) return { totalCount: 0, currentPage: params.page || 1, items: [] };

  const rawList = ensureArray(root.law as Record<string, unknown>[]);
  return {
    totalCount: num(root.totalCnt),
    currentPage: num(root.page) || params.page || 1,
    items: rawList.map((raw) => ({
      id: num(raw.법령일련번호),
      currentHistoryCode: str(raw.현행연혁코드),
      lawName: str(raw.법령명한글),
      abbreviation: str(raw.법령약칭명),
      lawId: str(raw.법령ID),
      promulgationDate: str(raw.공포일자),
      promulgationNumber: str(raw.공포번호),
      amendmentType: str(raw.제개정구분명),
      registrationDate: str(raw.등록일),
      departmentCode: str(raw.소관부처코드),
      departmentName: str(raw.소관부처명),
      lawType: str(raw.법령구분명),
      enforcementDate: str(raw.시행일자),
      selfOtherLaw: str(raw.자법타법여부),
      detailLink: str(raw.법령상세링크),
    })),
  };
}

// =========================================================
// 지식베이스 법령용어 (lstrmAI)
// =========================================================

export async function searchAILegalTerms(
  oc: string,
  params: SearchParams
): Promise<SearchResult<AILegalTermListItem>> {
  const url = buildSearchUrl(oc, "lstrmAI", params);
  const data = await fetchXml(url);

  const root = data.lstrmAISearch as Record<string, unknown> | undefined;
  if (!root) return { totalCount: 0, currentPage: params.page || 1, items: [] };

  const rawList = ensureArray(root["법령용어"] as Record<string, unknown>[]);
  return {
    totalCount: num(root["검색결과개수"] || root.totalCnt),
    currentPage: num(root.page) || params.page || 1,
    items: rawList.map((raw) => ({
      termName: str(raw.법령용어명),
      homonymExists: str(raw.동음이의어존재여부),
      remarks: str(raw.비고),
      termRelationLink: str(raw.용어간관계링크),
      articleRelationLink: str(raw.조문간관계링크),
    })),
  };
}

// =========================================================
// 법령-자치법규 연계 조례 (lnkOrd)
// =========================================================

export async function searchLinkedOrdinances(
  oc: string,
  params: SearchParams
): Promise<SearchResult<LinkedOrdinanceListItem>> {
  const url = buildSearchUrl(oc, "lnkOrd", params);
  const data = await fetchXml(url);

  const root = data.OrdinSearch as Record<string, unknown> | undefined;
  if (!root) return { totalCount: 0, currentPage: params.page || 1, items: [] };

  const rawList = ensureArray(root.law as Record<string, unknown>[]);
  return {
    totalCount: num(root.totalCnt),
    currentPage: num(root.page) || params.page || 1,
    items: rawList.map((raw) => ({
      id: num(raw.자치법규일련번호),
      ordinanceName: str(raw.자치법규명),
      ordinanceId: str(raw.자치법규ID),
      promulgationDate: str(raw.공포일자),
      promulgationNumber: str(raw.공포번호),
      amendmentType: str(raw.제개정구분명),
      ordinanceType: str(raw.자치법규종류),
      enforcementDate: str(raw.시행일자),
    })),
  };
}
