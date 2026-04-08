/**
 * 법제처 API — 법령/행정규칙/자치법규/조약/법령용어/영문법령 상세 + 조항호목
 */

import type {
  LawDetail,
  AdminRuleDetail,
  OrdinanceDetail,
  TreatyDetail,
  LegalTermDetail,
  ElawDetail,
  LawArticleSubParams,
  LawArticleSubDetail,
} from "../law-types.js";
import {
  fetchXml,
  buildDetailUrl,
  BASE_URL,
  str,
  num,
  ensureArray,
  stripHtmlTags,
} from "./helpers.js";

// =========================================================
// 법령 (law) — 상세
// =========================================================

export async function getLawDetail(
  oc: string,
  id: number
): Promise<LawDetail> {
  const url = buildDetailUrl(oc, "law", "MST", id);
  const data = await fetchXml(url);

  const root = data["법령"] as Record<string, unknown> | undefined;
  if (!root) throw new Error("법령을 찾을 수 없습니다");

  const basic = root["기본정보"] as Record<string, unknown> || {};
  const articleWrapper = ensureArray(root["조문"] as Record<string, unknown>[])[0] as Record<string, unknown> | undefined;

  const rawArticles = articleWrapper
    ? ensureArray(articleWrapper["조문단위"] as Record<string, unknown>[])
    : [];

  return {
    lawId: str(basic["법령ID"]),
    lawName: str(basic["법령명_한글"]),
    lawType: str(basic["법종구분"]),
    departmentName: str(basic["소관부처"]),
    enforcementDate: str(basic["시행일자"]),
    promulgationDate: str(basic["공포일자"]),
    promulgationNumber: str(basic["공포번호"]),
    amendmentType: str(basic["제개정구분"]),
    articles: rawArticles
      .filter((a) => str(a["조문여부"]) === "조문")
      .map((a) => ({
        articleNumber: str(a["조문번호"]),
        articleTitle: str(a["조문제목"]),
        articleContent: stripHtmlTags(str(a["조문내용"])),
      })),
  };
}

// =========================================================
// 행정규칙 (admrul) — 상세
// =========================================================

export async function getAdminRuleDetail(
  oc: string,
  id: number
): Promise<AdminRuleDetail> {
  const url = buildDetailUrl(oc, "admrul", "ID", id);
  const data = await fetchXml(url);

  const root = data.AdmRulService as Record<string, unknown> | undefined;
  if (!root) throw new Error("행정규칙을 찾을 수 없습니다");

  const basic = root["행정규칙기본정보"] as Record<string, unknown> || root;

  return {
    id: num(basic.행정규칙일련번호),
    ruleName: str(basic.행정규칙명),
    ruleType: str(basic.행정규칙종류),
    issuanceDate: str(basic.발령일자),
    issuanceNumber: str(basic.발령번호),
    departmentName: str(basic.소관부처명),
    amendmentType: str(basic.제개정구분명),
    content: stripHtmlTags(str(root.조문내용)),
  };
}

// =========================================================
// 자치법규 (ordin) — 상세
// =========================================================

export async function getOrdinanceDetail(
  oc: string,
  id: number
): Promise<OrdinanceDetail> {
  const url = buildDetailUrl(oc, "ordin", "MST", id);
  const data = await fetchXml(url);

  const root = data.LawService as Record<string, unknown> | undefined;
  if (!root) throw new Error("자치법규를 찾을 수 없습니다");

  const basic = root["자치법규기본정보"] as Record<string, unknown> || {};
  const articleWrapper = ensureArray(root["조문"] as Record<string, unknown>[])[0] as Record<string, unknown> | undefined;

  const rawArticles = articleWrapper
    ? ensureArray(articleWrapper["조"] as Record<string, unknown>[])
    : [];

  return {
    ordinanceId: str(basic["자치법규ID"]),
    ordinanceName: str(basic["자치법규명"]),
    localGovName: str(basic["지자체기관명"]),
    promulgationDate: str(basic["공포일자"]),
    enforcementDate: str(basic["시행일자"]),
    articles: rawArticles.map((a) => ({
      articleNumber: str(a["조문번호"]),
      articleTitle: str(a["조제목"]),
      articleContent: stripHtmlTags(str(a["조내용"])),
    })),
  };
}

// =========================================================
// 조약 (trty) — 상세
// =========================================================

export async function getTreatyDetail(
  oc: string,
  id: number
): Promise<TreatyDetail> {
  const url = buildDetailUrl(oc, "trty", "ID", id);
  const data = await fetchXml(url);

  const root = data.BothTrtyService as Record<string, unknown> | undefined;
  if (!root) throw new Error("조약을 찾을 수 없습니다");

  const basic = root["조약기본정보"] as Record<string, unknown> || {};
  const extra = root["추가정보"] as Record<string, unknown> || {};
  const contentWrapper = root["조약내용"] as Record<string, unknown> | undefined;
  const contentText = contentWrapper
    ? str((contentWrapper as Record<string, unknown>)["조약내용"])
    : "";

  return {
    id: num(basic.조약일련번호),
    treatyNameKo: str(basic["조약명_한글"]),
    treatyNameEn: str(basic["조약명_영문"]),
    effectiveDate: str(basic.발효일자),
    signDate: str(basic.서명일자),
    treatyNumber: str(basic.조약번호),
    counterpartyCountry: str(extra.체결대상국가한글 || extra.체결대상국가),
    treatyField: str(extra.양자조약분야명),
    content: stripHtmlTags(contentText),
  };
}

// =========================================================
// 법령용어 (lstrm) — 상세
// =========================================================

export async function getLegalTermDetail(
  oc: string,
  id: string
): Promise<LegalTermDetail> {
  const url = buildDetailUrl(oc, "lstrm", "trmSeqs", id);
  const data = await fetchXml(url);

  const root = data.LsTrmService as Record<string, unknown> | undefined;
  if (!root) throw new Error("법령용어를 찾을 수 없습니다");

  return {
    id: str(root.법령용어일련번호 || root.법령용어ID),
    termName: str(root["법령용어명_한글"] || root.법령용어명),
    termNameHanja: str(root["법령용어명_한자"]),
    definition: stripHtmlTags(str(root.법령용어정의)),
    source: str(root.출처),
  };
}

// =========================================================
// 영문법령 (elaw) — 상세
// =========================================================

export async function getEnglishLawDetail(
  oc: string,
  id: number
): Promise<ElawDetail> {
  const url = buildDetailUrl(oc, "elaw", "MST", id);
  const data = await fetchXml(url);

  const root = data.Law as Record<string, unknown> | undefined;
  if (!root) throw new Error("영문법령을 찾을 수 없습니다");

  const infSection = root.InfSection as Record<string, unknown> || {};
  const joSection = root.JoSection as Record<string, unknown> | undefined;

  const rawArticles = joSection
    ? ensureArray(joSection.Jo as Record<string, unknown>[])
    : [];

  return {
    lawId: str(infSection.lsId),
    lawNameEn: str(infSection.lsNmEng),
    promulgationDate: str(infSection.ancYd),
    promulgationNumber: str(infSection.ancNo),
    articles: rawArticles
      .filter((a) => str(a.joYn) === "조문" || str(a.joCts))
      .map((a) => ({
        articleNumber: str(a.joNo),
        articleBranchNumber: str(a.joBrNo),
        articleTitle: str(a.joTtl),
        articleContent: stripHtmlTags(str(a.joCts)),
      })),
  };
}

// =========================================================
// 조항호목 (lawjosub)
// =========================================================

export async function getLawArticleSub(
  oc: string,
  params: LawArticleSubParams
): Promise<LawArticleSubDetail> {
  const url = new URL(`${BASE_URL}/lawService.do`);
  url.searchParams.set("OC", oc);
  url.searchParams.set("target", "lawjosub");
  url.searchParams.set("type", "XML");
  url.searchParams.set("MST", String(params.lawId));
  url.searchParams.set("JO", params.jo);
  if (params.hang) url.searchParams.set("HANG", params.hang);
  if (params.ho) url.searchParams.set("HO", params.ho);
  if (params.mok) url.searchParams.set("MOK", params.mok);

  const data = await fetchXml(url.toString());

  // 루트 엘리먼트는 법령 또는 Law
  const root = (data["법령"] || data.Law || data.lawjosub) as Record<string, unknown> | undefined;
  if (!root) throw new Error("조항호목 정보를 찾을 수 없습니다");

  return {
    lawKey: str(root.법령키),
    lawId: str(root.법령ID),
    promulgationDate: str(root.공포일자),
    promulgationNumber: str(root.공포번호),
    language: str(root.언어),
    lawNameKo: str(root["법령명_한글"]),
    lawNameHanja: str(root["법령명_한자"]),
    lawTypeCode: str(root.법종구분코드),
    lawTypeName: str(root.법종구분명),
    departmentName: str(root.소관부처),
    enforcementDate: str(root.시행일자),
    articleNumber: str(root.조문번호),
    articleContent: stripHtmlTags(str(root.조문내용)),
    paragraphNumber: str(root.항번호),
    paragraphContent: stripHtmlTags(str(root.항내용)),
    clauseNumber: str(root.호번호),
    clauseContent: stripHtmlTags(str(root.호내용)),
    subclauseNumber: str(root.목번호),
    subclauseContent: stripHtmlTags(str(root.목내용)),
  };
}
