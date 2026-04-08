/**
 * 법제처 API — 신구법비교/법령체계도/3단비교/법령변경이력/행정규칙 신구법비교
 */

import type {
  SearchParams,
  LawChangeHistoryParams,
  SearchResult,
  OldNewLawListItem,
  OldNewLawDetail,
  LawSystemListItem,
  LawSystemDetail,
  ThreeWayCompListItem,
  ThreeWayCompDetail,
  LawChangeHistoryListItem,
  AdminRuleOldNewListItem,
  AdminRuleOldNewDetail,
} from "../law-types.js";
import {
  fetchXml,
  buildSearchUrl,
  buildDetailUrl,
  BASE_URL,
  str,
  num,
  ensureArray,
  stripHtmlTags,
  extractArticles,
} from "./helpers.js";

// =========================================================
// 신구법비교 (oldAndNew)
// =========================================================

export async function searchOldNewLaw(
  oc: string,
  params: SearchParams
): Promise<SearchResult<OldNewLawListItem>> {
  const url = buildSearchUrl(oc, "oldAndNew", params);
  const data = await fetchXml(url);

  const root = data.OldAndNewLawSearch as Record<string, unknown> | undefined;
  if (!root) return { totalCount: 0, currentPage: params.page || 1, items: [] };

  const rawList = ensureArray(root.oldAndNew as Record<string, unknown>[]);
  return {
    totalCount: num(root.totalCnt),
    currentPage: num(root.page) || params.page || 1,
    items: rawList.map((raw) => ({
      id: num(raw.신구법일련번호),
      currentHistoryCode: str(raw.현행연혁코드),
      lawName: str(raw.신구법명),
      lawId: str(raw.신구법ID),
      promulgationDate: str(raw.공포일자),
      promulgationNumber: str(raw.공포번호),
      amendmentType: str(raw.제개정구분명),
      departmentCode: str(raw.소관부처코드),
      departmentName: str(raw.소관부처명),
      lawType: str(raw.법령구분명),
      enforcementDate: str(raw.시행일자),
      detailLink: str(raw.신구법상세링크),
    })),
  };
}

export async function getOldNewLawDetail(
  oc: string,
  id: number
): Promise<OldNewLawDetail> {
  const url = buildDetailUrl(oc, "oldAndNew", "MST", id);
  const data = await fetchXml(url);

  const root = data.OldAndNewService as Record<string, unknown> | undefined;
  if (!root) throw new Error("신구법비교 정보를 찾을 수 없습니다");

  const oldInfo = root["구조문_기본정보"] as Record<string, unknown> || {};
  const newInfo = root["신조문_기본정보"] as Record<string, unknown> || {};

  return {
    oldBasicInfo: {
      lawId: str(oldInfo.법령ID),
      lawSerialNumber: num(oldInfo.법령일련번호),
      enforcementDate: str(oldInfo.시행일자),
      promulgationDate: str(oldInfo.공포일자),
      promulgationNumber: str(oldInfo.공포번호),
      isCurrent: str(oldInfo.현행여부),
      amendmentType: str(oldInfo.제개정구분명),
      lawName: str(oldInfo.법령명),
      lawType: str(oldInfo.법종구분),
    },
    newBasicInfo: {
      lawId: str(newInfo.법령ID),
      lawSerialNumber: num(newInfo.법령일련번호),
      enforcementDate: str(newInfo.시행일자),
      promulgationDate: str(newInfo.공포일자),
      promulgationNumber: str(newInfo.공포번호),
      isCurrent: str(newInfo.현행여부),
      amendmentType: str(newInfo.제개정구분명),
      lawName: str(newInfo.법령명),
      lawType: str(newInfo.법종구분),
    },
    oldArticles: extractArticles(root["구조문목록"]),
    newArticles: extractArticles(root["신조문목록"]),
  };
}

// =========================================================
// 법령 체계도 (lsStmd)
// =========================================================

export async function searchLawSystem(
  oc: string,
  params: SearchParams
): Promise<SearchResult<LawSystemListItem>> {
  const url = buildSearchUrl(oc, "lsStmd", params);
  const data = await fetchXml(url);

  const root = data.LsStmdSearch as Record<string, unknown> | undefined;
  if (!root) return { totalCount: 0, currentPage: params.page || 1, items: [] };

  const rawList = ensureArray(root.law as Record<string, unknown>[]);
  return {
    totalCount: num(root.totalCnt),
    currentPage: num(root.page) || params.page || 1,
    items: rawList.map((raw) => ({
      id: num(raw.법령일련번호),
      lawName: str(raw.법령명),
      lawId: str(raw.법령ID),
      promulgationDate: str(raw.공포일자),
      promulgationNumber: str(raw.공포번호),
      amendmentType: str(raw.제개정구분명),
      departmentCode: str(raw.소관부처코드),
      departmentName: str(raw.소관부처명),
      lawType: str(raw.법령구분명),
      enforcementDate: str(raw.시행일자),
      detailLink: str(raw.본문상세링크),
    })),
  };
}

export async function getLawSystemDetail(
  oc: string,
  id: number
): Promise<LawSystemDetail> {
  const url = buildDetailUrl(oc, "lsStmd", "MST", id);
  const data = await fetchXml(url);

  const root = data["법령체계도"] as Record<string, unknown> | undefined;
  if (!root) throw new Error("법령 체계도를 찾을 수 없습니다");

  const basic = root["기본정보"] as Record<string, unknown> || {};

  // 값에서 텍스트 추출 (객체인 경우 #text 추출)
  function textVal(v: unknown): string {
    if (!v) return "";
    if (typeof v === "object" && v !== null) {
      const obj = v as Record<string, unknown>;
      return str(obj["#text"] || "");
    }
    return str(v);
  }

  // 상하위법 구조를 재귀적으로 텍스트로 변환
  function formatHierarchy(node: unknown, depth = 0): string {
    if (!node || typeof node !== "object") return "";
    const obj = node as Record<string, unknown>;
    const parts: string[] = [];
    const indent = "  ".repeat(depth);

    // 기본정보에서 법령명 추출
    const info = obj["기본정보"] as Record<string, unknown> | undefined;
    if (info && typeof info === "object") {
      const name = textVal(info["법령명"] || info["행정규칙명"] || info["자치법규명"]);
      const type = textVal(info["법종구분"]);
      if (name) parts.push(`${indent}${type ? `[${type}] ` : ""}${name}`);
    }

    // 하위 구조 탐색 (기본정보 및 링크/단순값 필드 제외)
    const structuralKeys = new Set(["법률", "시행령", "시행규칙", "행정규칙", "자치법규", "고시", "훈령", "예규", "조례", "규칙"]);
    for (const [key, val] of Object.entries(obj)) {
      if (key === "기본정보") continue;
      if (!structuralKeys.has(key)) continue;
      if (typeof val === "object" && val !== null) {
        const items = Array.isArray(val) ? val : [val];
        for (const item of items) {
          if (typeof item !== "object" || item === null) continue;
          const sub = formatHierarchy(item, depth + 1);
          if (sub) {
            parts.push(`${indent}▸ ${key}`);
            parts.push(sub);
          }
        }
      }
    }
    return parts.join("\n");
  }

  const hierarchyText = formatHierarchy(root["상하위법"]);

  return {
    basicInfo: {
      lawId: str(basic.법령ID),
      lawSerialNumber: num(basic.법령일련번호),
      promulgationDate: str(basic.공포일자),
      promulgationNumber: str(basic.공포번호),
      lawType: str(basic.법종구분),
      lawName: str(basic.법령명),
      enforcementDate: str(basic.시행일자),
      amendmentType: str(basic.제개정구분),
    },
    hierarchy: hierarchyText,
  };
}

// =========================================================
// 3단비교 (thdCmp)
// =========================================================

export async function searchThreeWayComp(
  oc: string,
  params: SearchParams
): Promise<SearchResult<ThreeWayCompListItem>> {
  const url = buildSearchUrl(oc, "thdCmp", params);
  const data = await fetchXml(url);

  const root = data.thdCmpLawSearch as Record<string, unknown> | undefined;
  if (!root) return { totalCount: 0, currentPage: params.page || 1, items: [] };

  const rawList = ensureArray(root.thdCmp as Record<string, unknown>[]);
  return {
    totalCount: num(root.totalCnt),
    currentPage: num(root.page) || params.page || 1,
    items: rawList.map((raw) => ({
      id: num(raw.삼단비교일련번호),
      lawName: str(raw.법령명한글),
      lawId: str(raw.법령ID),
      promulgationDate: str(raw.공포일자),
      promulgationNumber: str(raw.공포번호),
      amendmentType: str(raw.제개정구분명),
      departmentCode: str(raw.소관부처코드),
      departmentName: str(raw.소관부처명),
      lawType: str(raw.법령구분명),
      enforcementDate: str(raw.시행일자),
      citationLink: str(raw["인용조문_삼단비교상세링크"]),
      delegationLink: str(raw["위임조문_삼단비교상세링크"]),
    })),
  };
}

export async function getThreeWayCompDetail(
  oc: string,
  id: number,
  knd: 1 | 2 = 1
): Promise<ThreeWayCompDetail> {
  const url = new URL(`${BASE_URL}/lawService.do`);
  url.searchParams.set("OC", oc);
  url.searchParams.set("target", "thdCmp");
  url.searchParams.set("type", "XML");
  url.searchParams.set("MST", String(id));
  url.searchParams.set("knd", String(knd));
  const data = await fetchXml(url.toString());

  const root = data.ThdCmpLawXService as Record<string, unknown> | undefined;
  if (!root) throw new Error("3단비교 정보를 찾을 수 없습니다");

  const basic = root["기본정보"] as Record<string, unknown> || {};

  // 삼단비교 내용을 텍스트로 변환
  function formatArticles(section: unknown): string {
    if (!section) return "";
    const articles = ensureArray((section as Record<string, unknown>)["법률조문"] as Record<string, unknown>[]);
    return articles.map((a) => {
      const parts: string[] = [];
      const joNo = str(a.조번호);
      const title = str(a.조제목);
      const content = stripHtmlTags(str(a.조내용));
      parts.push(`제${joNo}조${title ? ` (${title})` : ""}`);
      if (content) parts.push(content);

      // 시행규칙조문
      const ruleArticles = a["시행규칙조문목록"] as Record<string, unknown> | undefined;
      if (ruleArticles) {
        const rules = ensureArray(ruleArticles["시행규칙조문"] as Record<string, unknown>[]);
        for (const r of rules) {
          parts.push(`  [시행규칙] 제${str(r.조번호)}조${str(r.조제목) ? ` (${str(r.조제목)})` : ""}`);
          const rc = stripHtmlTags(str(r.조내용));
          if (rc) parts.push(`  ${rc}`);
        }
      }

      // 위임행정규칙
      const delegated = a["위임행정규칙목록"] as Record<string, unknown> | undefined;
      if (delegated) {
        const dRules = ensureArray(delegated["위임행정규칙"] as Record<string, unknown>[]);
        for (const d of dRules) {
          parts.push(`  [위임행정규칙] ${str(d.위임행정규칙명)} 제${str(d.위임행정규칙조번호)}조`);
        }
      }

      return parts.join("\n");
    }).join("\n\n");
  }

  const contentKey = knd === 1 ? "인용조문삼단비교" : "위임조문삼단비교";
  const contentText = formatArticles(root[contentKey]);

  return {
    basicInfo: {
      lawId: str(basic.법령ID),
      decreeId: str(basic.시행령ID),
      ruleId: str(basic.시행규칙ID),
      lawName: str(basic.법령명),
      decreeName: str(basic.시행령명),
      ruleName: str(basic.시행규칙명),
      comparisonExists: str(basic.삼단비교존재여부),
    },
    content: contentText,
  };
}

// =========================================================
// 법령 변경이력 (lsHstInf)
// =========================================================

export async function searchLawChangeHistory(
  oc: string,
  params: LawChangeHistoryParams
): Promise<SearchResult<LawChangeHistoryListItem>> {
  const url = new URL(`${BASE_URL}/lawSearch.do`);
  url.searchParams.set("OC", oc);
  url.searchParams.set("target", "lsHstInf");
  url.searchParams.set("type", "XML");
  url.searchParams.set("regDt", params.regDt);
  if (params.display) url.searchParams.set("display", String(params.display));
  if (params.page) url.searchParams.set("page", String(params.page));

  const data = await fetchXml(url.toString());

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
      lawId: str(raw.법령ID),
      promulgationDate: str(raw.공포일자),
      promulgationNumber: str(raw.공포번호),
      amendmentType: str(raw.제개정구분명),
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
// 행정규칙 신구법비교 (admrulOldAndNew)
// =========================================================

export async function searchAdminRuleOldNew(
  oc: string,
  params: SearchParams
): Promise<SearchResult<AdminRuleOldNewListItem>> {
  const url = buildSearchUrl(oc, "admrulOldAndNew", params);
  const data = await fetchXml(url);

  const root = data.OldAndNewLawSearch as Record<string, unknown> | undefined;
  if (!root) return { totalCount: 0, currentPage: params.page || 1, items: [] };

  const rawList = ensureArray(root.oldAndNew as Record<string, unknown>[]);
  return {
    totalCount: num(root.totalCnt),
    currentPage: num(root.page) || params.page || 1,
    items: rawList.map((raw) => ({
      id: num(raw.신구법일련번호),
      currentHistoryCode: str(raw.현행연혁코드),
      ruleName: str(raw.신구법명),
      ruleId: str(raw.신구법ID),
      issuanceDate: str(raw.발령일자),
      issuanceNumber: str(raw.발령번호),
      amendmentType: str(raw.제개정구분명),
      departmentCode: str(raw.소관부처코드),
      departmentName: str(raw.소관부처명),
      lawType: str(raw.법령구분명),
      enforcementDate: str(raw.시행일자),
      detailLink: str(raw.신구법상세링크),
    })),
  };
}

export async function getAdminRuleOldNewDetail(
  oc: string,
  id: number
): Promise<AdminRuleOldNewDetail> {
  const url = buildDetailUrl(oc, "admrulOldAndNew", "ID", id);
  const data = await fetchXml(url);

  const root = data.OldAndNewService as Record<string, unknown> | undefined;
  if (!root) throw new Error("행정규칙 신구법비교 정보를 찾을 수 없습니다");

  const oldInfo = root["구조문_기본정보"] as Record<string, unknown> || {};
  const newInfo = root["신조문_기본정보"] as Record<string, unknown> || {};

  return {
    oldBasicInfo: {
      ruleId: str(oldInfo.행정규칙ID || oldInfo.신구법ID),
      ruleSerialNumber: num(oldInfo.행정규칙일련번호 || oldInfo.신구법일련번호),
      enforcementDate: str(oldInfo.시행일자),
      issuanceDate: str(oldInfo.발령일자),
      issuanceNumber: str(oldInfo.발령번호),
      isCurrent: str(oldInfo.현행여부),
      ruleName: str(oldInfo.행정규칙명 || oldInfo.신구법명),
    },
    newBasicInfo: {
      ruleId: str(newInfo.행정규칙ID || newInfo.신구법ID),
      ruleSerialNumber: num(newInfo.행정규칙일련번호 || newInfo.신구법일련번호),
      enforcementDate: str(newInfo.시행일자),
      issuanceDate: str(newInfo.발령일자),
      issuanceNumber: str(newInfo.발령번호),
      isCurrent: str(newInfo.현행여부),
      ruleName: str(newInfo.행정규칙명 || newInfo.신구법명),
    },
    oldArticles: extractArticles(root["구조문목록"]),
    newArticles: extractArticles(root["신조문목록"]),
  };
}
