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

  // 조문내용은 반복 태그(여러 조). 단일/배열 모두 처리하여 줄바꿈으로 합친다.
  const articleNodes = ensureArray(root["조문내용"] as unknown);
  const content = articleNodes
    .map((node) => stripHtmlTags(str(node)))
    .filter(Boolean)
    .join("\n\n");

  return {
    id: num(basic.행정규칙일련번호),
    ruleName: str(basic.행정규칙명),
    ruleType: str(basic.행정규칙종류),
    issuanceDate: str(basic.발령일자),
    issuanceNumber: str(basic.발령번호),
    departmentName: str(basic.소관부처명),
    amendmentType: str(basic.제개정구분명),
    content,
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

  // 양자조약은 BothTrtyService, 다자조약은 MultTrtyService 루트를 사용한다.
  const root = (data.BothTrtyService || data.MultTrtyService) as Record<string, unknown> | undefined;
  if (!root) throw new Error("조약을 찾을 수 없습니다");

  const basic = root["조약기본정보"] as Record<string, unknown> || {};
  const extra = root["추가정보"] as Record<string, unknown> || {};
  const contentWrapper = root["조약내용"] as Record<string, unknown> | undefined;
  // 다자조약 응답은 조약내용 래퍼 안에 같은 이름의 자식이 1개 또는 다수로 들어온다.
  const innerNodes = contentWrapper
    ? ensureArray((contentWrapper as Record<string, unknown>)["조약내용"] as unknown)
    : [];
  const contentText = innerNodes.length > 0
    ? innerNodes.map((n) => stripHtmlTags(str(n))).filter(Boolean).join("\n\n")
    : stripHtmlTags(str(contentWrapper));

  return {
    id: num(basic.조약일련번호),
    treatyNameKo: str(basic["조약명_한글"]),
    treatyNameEn: str(basic["조약명_영문"]),
    effectiveDate: str(basic.발효일자),
    signDate: str(basic.서명일자),
    treatyNumber: str(basic.조약번호),
    counterpartyCountry: str(extra.체결대상국가한글 || extra.체결대상국가),
    treatyField: str(extra.양자조약분야명) || str(extra.다자조약분야명),
    content: contentText,
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
    // joYn=Y 만 조문(章/CHAPTER 헤더 등 N 항목 제외).
    articles: rawArticles
      .filter((a) => str(a.joYn) === "Y")
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

  // 루트: 법령(국문) / Law(영문)
  const root = (data["법령"] || data.Law || data.lawjosub) as Record<string, unknown> | undefined;
  if (!root) throw new Error("조항호목 정보를 찾을 수 없습니다");

  const basic = (root["기본정보"] as Record<string, unknown>) || root;
  const lawTypeNode = basic["법종구분"];
  const lawTypeName = typeof lawTypeNode === "object" && lawTypeNode !== null
    ? str((lawTypeNode as Record<string, unknown>)["#text"])
    : str(lawTypeNode);
  const lawTypeCode = typeof lawTypeNode === "object" && lawTypeNode !== null
    ? str((lawTypeNode as Record<string, unknown>)["@_법종구분코드"])
    : str(basic["법종구분코드"]);
  const deptNode = basic["소관부처"];
  const departmentName = typeof deptNode === "object" && deptNode !== null
    ? str((deptNode as Record<string, unknown>)["#text"])
    : str(deptNode);

  const articleWrapper = ensureArray(root["조문"] as Record<string, unknown>[])[0] as Record<string, unknown> | undefined;
  const units = articleWrapper
    ? ensureArray(articleWrapper["조문단위"] as Record<string, unknown>[])
    : [];

  // 조문여부=조문 인 항목만 본문 대상. 없으면 첫 항목.
  const bodyUnits = units.filter((u) => str(u["조문여부"]) === "조문");
  const primary = (bodyUnits[0] || units[0] || {}) as Record<string, unknown>;

  const articleNumber = str(primary["조문번호"]);
  const articleTitle = stripHtmlTags(str(primary["조문제목"]));
  const articleHeader = stripHtmlTags(str(primary["조문내용"]));

  // 항번호/호번호/목번호는 통상 항내용/호내용/목내용 안에 마커가 이미 포함되어 있음.
  // 마커가 본문에 누락된 경우에만 접두로 붙여 중복을 피한다.
  const prefixIfMissing = (marker: string, content: string): string => {
    const m = marker.trim();
    if (!m) return content;
    if (!content) return m;
    return content.startsWith(m) ? content : `${m} ${content}`;
  };

  const paragraphs = ensureArray(primary["항"] as Record<string, unknown>[]);
  const renderedParagraphs = paragraphs
    .map((para) => {
      const pNum = stripHtmlTags(str(para["항번호"]));
      const pContent = stripHtmlTags(str(para["항내용"]));
      const paraLine = prefixIfMissing(pNum, pContent);
      const clauses = ensureArray(para["호"] as Record<string, unknown>[]);
      const renderedClauses = clauses
        .map((c) => {
          const cNum = stripHtmlTags(str(c["호번호"]));
          const cContent = stripHtmlTags(str(c["호내용"]));
          const clauseLine = `  ${prefixIfMissing(cNum, cContent)}`.trimEnd();
          const subclauses = ensureArray(c["목"] as Record<string, unknown>[]);
          const renderedSubs = subclauses
            .map((m) => {
              const mNum = stripHtmlTags(str(m["목번호"]));
              const mContent = stripHtmlTags(str(m["목내용"]));
              return `    ${prefixIfMissing(mNum, mContent)}`.trimEnd();
            })
            .join("\n");
          return [clauseLine, renderedSubs].filter(Boolean).join("\n");
        })
        .join("\n");
      return [paraLine, renderedClauses].filter(Boolean).join("\n");
    })
    .filter(Boolean)
    .join("\n");

  const articleContent = [articleHeader, renderedParagraphs].filter(Boolean).join("\n");

  return {
    lawKey: str(root["@_법령키"]) || str(basic["법령키"]),
    lawId: str(basic["법령ID"]),
    promulgationDate: str(basic["공포일자"]),
    promulgationNumber: str(basic["공포번호"]),
    language: str(basic["언어"]),
    lawNameKo: str(basic["법령명_한글"]),
    lawNameHanja: str(basic["법령명_한자"]),
    lawTypeCode,
    lawTypeName,
    departmentName,
    enforcementDate: str(basic["시행일자"]),
    articleNumber,
    articleTitle,
    articleContent,
  };
}
