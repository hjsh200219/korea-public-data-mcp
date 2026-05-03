/**
 * Skill: legal_research — 법령 리서치 통합 도구
 * 기존 도구: search_laws, get_law_detail, search_admin_rules, get_admin_rule_detail,
 *   search_ordinances, get_ordinance_detail, search_treaties, get_treaty_detail,
 *   search_legal_terms, get_legal_term_detail, search_english_laws, get_english_law_detail,
 *   search_attached_forms, search_law_abbreviations, get_law_article_sub,
 *   search_ai_legal_terms, search_linked_ordinances
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  searchLaws, getLawDetail,
  searchAdminRules, getAdminRuleDetail,
  searchOrdinances, getOrdinanceDetail,
  searchTreaties, getTreatyDetail,
  searchLegalTerms, getLegalTermDetail,
  searchEnglishLaws, getEnglishLawDetail,
  searchAttachedForms, searchLawAbbreviations,
  getLawArticleSub, searchAILegalTerms, searchLinkedOrdinances,
} from "../../law-api.js";
import { errorResponse, truncate } from "../../shared.js";
import { createDispatcher, requireParam, emptyResultMessage, type SkillResult, registerSkillTool } from "./_shared.js";

const ACTIONS = [
  "search_laws",
  "get_law_detail",
  "search_admin_rules",
  "get_admin_rule_detail",
  "search_ordinances",
  "get_ordinance_detail",
  "search_treaties",
  "get_treaty_detail",
  "search_legal_terms",
  "get_legal_term_detail",
  "search_english_laws",
  "get_english_law_detail",
  "search_attached_forms",
  "search_law_abbreviations",
  "get_law_article_sub",
  "search_ai_legal_terms",
  "search_linked_ordinances",
] as const;

type LegalParams = {
  action: string;
  query?: string;
  page?: number;
  display?: number;
  search_type?: string;
  law_id?: number;
  admrul_id?: number;
  ordin_id?: number;
  treaty_id?: number;
  term_id?: string;
  form_type?: string;
  article?: string;
  paragraph?: string;
  clause?: string;
  subclause?: string;
};

function handleSearchLaws(oc: string) {
  return async (p: LegalParams): Promise<SkillResult> => {
    const err = requireParam(p as Record<string, unknown>, "query", "search_laws");
    if (err) return err;
    try {
      const result = await searchLaws(oc, {
        query: p.query!,
        page: p.page ?? 1,
        display: p.display ?? 20,
        search: p.search_type === "full_text" ? 2 : 1,
      });

      if (result.items.length === 0) {
        return emptyResultMessage("법령 검색", { query: p.query }, "검색어의 띄어쓰기를 조정하거나 약칭(예: 민법, 상법)으로 검색해 보세요. 법제처 API는 일시 점검(새벽 시간대)일 수 있습니다.");
      }

      const listText = result.items
        .map((l, i) =>
          `${i + 1}. [${l.id}] ${l.lawName}${l.lawAbbreviation ? ` (${l.lawAbbreviation})` : ""}\n   ${l.lawType} | 소관: ${l.departmentName} | 시행: ${l.enforcementDate} | ${l.amendmentType}`
        )
        .join("\n\n");

      return {
        content: [{
          type: "text",
          text: `## 법령 검색 결과\n\n검색어: "${p.query}"\n총 ${result.totalCount}건 (${result.currentPage}페이지)\n\n${listText}\n\n---\n상세 조회: get_law_detail에 법령일련번호([ ] 안의 숫자)를 전달하세요.`,
        }],
      };
    } catch (error) {
      return errorResponse("법령 검색", error);
    }
  };
}

function handleGetLawDetail(oc: string) {
  return async (p: LegalParams): Promise<SkillResult> => {
    const err = requireParam(p as Record<string, unknown>, "law_id", "get_law_detail");
    if (err) return err;
    try {
      const d = await getLawDetail(oc, p.law_id!);

      const parts: string[] = [
        `## ${d.lawName}`,
        "",
        `- **법령ID**: ${d.lawId}`,
        `- **법종구분**: ${d.lawType}`,
        `- **소관부처**: ${d.departmentName}`,
        `- **공포일자**: ${d.promulgationDate}`,
        `- **시행일자**: ${d.enforcementDate}`,
        `- **제개정구분**: ${d.amendmentType}`,
      ];

      if (d.articles.length > 0) {
        parts.push("", "### 조문");
        for (const a of d.articles) {
          const title = a.articleTitle ? ` (${a.articleTitle})` : "";
          parts.push("", `**제${a.articleNumber}조${title}**`, "", a.articleContent);
        }
      }

      return { content: [{ type: "text", text: truncate(parts.join("\n")) }] };
    } catch (error) {
      return errorResponse("법령 상세 조회", error);
    }
  };
}

function handleSearchAdminRules(oc: string) {
  return async (p: LegalParams): Promise<SkillResult> => {
    const err = requireParam(p as Record<string, unknown>, "query", "search_admin_rules");
    if (err) return err;
    try {
      const result = await searchAdminRules(oc, {
        query: p.query!,
        page: p.page ?? 1,
        display: p.display ?? 20,
      });

      if (result.items.length === 0) {
        return emptyResultMessage("행정규칙 검색", { query: p.query }, "행정규칙명(고시, 훈령, 예규 등)을 포함하여 검색해 보세요.");
      }

      const listText = result.items
        .map((r, i) =>
          `${i + 1}. [${r.id}] ${r.ruleName}\n   종류: ${r.ruleType} | 발령: ${r.issuanceDate} | ${r.amendmentType} | ${r.currentHistoryType}`
        )
        .join("\n\n");

      return {
        content: [{
          type: "text",
          text: `## 행정규칙 검색 결과\n\n검색어: "${p.query}"\n총 ${result.totalCount}건 (${result.currentPage}페이지)\n\n${listText}\n\n---\n상세 조회: get_admin_rule_detail에 일련번호([ ] 안의 숫자)를 전달하세요.`,
        }],
      };
    } catch (error) {
      return errorResponse("행정규칙 검색", error);
    }
  };
}

function handleGetAdminRuleDetail(oc: string) {
  return async (p: LegalParams): Promise<SkillResult> => {
    const err = requireParam(p as Record<string, unknown>, "admrul_id", "get_admin_rule_detail");
    if (err) return err;
    try {
      const d = await getAdminRuleDetail(oc, p.admrul_id!);

      const parts: string[] = [
        `## ${d.ruleName}`,
        "",
        `- **종류**: ${d.ruleType}`,
        `- **발령일자**: ${d.issuanceDate}`,
        `- **발령번호**: ${d.issuanceNumber}`,
        `- **소관부처**: ${d.departmentName}`,
        `- **제개정구분**: ${d.amendmentType}`,
      ];

      if (d.content) parts.push("", "### 내용", "", truncate(d.content));

      return { content: [{ type: "text", text: parts.join("\n") }] };
    } catch (error) {
      return errorResponse("행정규칙 상세 조회", error);
    }
  };
}

function handleSearchOrdinances(oc: string) {
  return async (p: LegalParams): Promise<SkillResult> => {
    const err = requireParam(p as Record<string, unknown>, "query", "search_ordinances");
    if (err) return err;
    try {
      const result = await searchOrdinances(oc, {
        query: p.query!,
        page: p.page ?? 1,
        display: p.display ?? 20,
        search: p.search_type === "full_text" ? 2 : 1,
      });

      if (result.items.length === 0) {
        return emptyResultMessage("자치법규 검색", { query: p.query }, "자치단체명(서울특별시, 경기도 등)이나 조례명 키워드로 검색해 보세요.");
      }

      const listText = result.items
        .map((o, i) =>
          `${i + 1}. [${o.id}] ${o.ordinanceName}\n   ${o.ordinanceType} | ${o.localGovName} | 시행: ${o.enforcementDate} | ${o.amendmentType}`
        )
        .join("\n\n");

      return {
        content: [{
          type: "text",
          text: `## 자치법규 검색 결과\n\n검색어: "${p.query}"\n총 ${result.totalCount}건 (${result.currentPage}페이지)\n\n${listText}\n\n---\n상세 조회: get_ordinance_detail에 일련번호([ ] 안의 숫자)를 전달하세요.`,
        }],
      };
    } catch (error) {
      return errorResponse("자치법규 검색", error);
    }
  };
}

function handleGetOrdinanceDetail(oc: string) {
  return async (p: LegalParams): Promise<SkillResult> => {
    const err = requireParam(p as Record<string, unknown>, "ordin_id", "get_ordinance_detail");
    if (err) return err;
    try {
      const d = await getOrdinanceDetail(oc, p.ordin_id!);

      const parts: string[] = [
        `## ${d.ordinanceName}`,
        "",
        `- **자치법규ID**: ${d.ordinanceId}`,
        `- **지자체**: ${d.localGovName}`,
        `- **공포일자**: ${d.promulgationDate}`,
        `- **시행일자**: ${d.enforcementDate}`,
      ];

      if (d.articles.length > 0) {
        parts.push("", "### 조문");
        for (const a of d.articles) {
          const title = a.articleTitle ? ` (${a.articleTitle})` : "";
          parts.push("", `**제${a.articleNumber}조${title}**`, "", a.articleContent);
        }
      }

      return { content: [{ type: "text", text: truncate(parts.join("\n")) }] };
    } catch (error) {
      return errorResponse("자치법규 상세 조회", error);
    }
  };
}

function handleSearchTreaties(oc: string) {
  return async (p: LegalParams): Promise<SkillResult> => {
    const err = requireParam(p as Record<string, unknown>, "query", "search_treaties");
    if (err) return err;
    try {
      const result = await searchTreaties(oc, {
        query: p.query!,
        page: p.page ?? 1,
        display: p.display ?? 20,
      });

      if (result.items.length === 0) {
        return { content: [{ type: "text", text: `"${p.query}" 조약 검색 결과가 없습니다.` }] };
      }

      const listText = result.items
        .map((t, i) =>
          `${i + 1}. [${t.id}] ${t.treatyName}\n   ${t.treatyType} | 발효: ${t.effectiveDate} | 서명: ${t.signDate} | 조약번호: ${t.treatyNumber}`
        )
        .join("\n\n");

      return {
        content: [{
          type: "text",
          text: `## 조약 검색 결과\n\n검색어: "${p.query}"\n총 ${result.totalCount}건 (${result.currentPage}페이지)\n\n${listText}\n\n---\n상세 조회: get_treaty_detail에 조약일련번호([ ] 안의 숫자)를 전달하세요.`,
        }],
      };
    } catch (error) {
      return errorResponse("조약 검색", error);
    }
  };
}

function handleGetTreatyDetail(oc: string) {
  return async (p: LegalParams): Promise<SkillResult> => {
    const err = requireParam(p as Record<string, unknown>, "treaty_id", "get_treaty_detail");
    if (err) return err;
    try {
      const d = await getTreatyDetail(oc, p.treaty_id!);

      const parts: string[] = [
        `## ${d.treatyNameKo}`,
        "",
        `- **영문명**: ${d.treatyNameEn}`,
        `- **조약번호**: ${d.treatyNumber}`,
        `- **발효일**: ${d.effectiveDate}`,
        `- **서명일**: ${d.signDate}`,
        `- **체결국**: ${d.counterpartyCountry}`,
        `- **분야**: ${d.treatyField}`,
      ];

      if (d.content) parts.push("", "### 조약내용", "", truncate(d.content));

      return { content: [{ type: "text", text: parts.join("\n") }] };
    } catch (error) {
      return errorResponse("조약 상세 조회", error);
    }
  };
}

function handleSearchLegalTerms(oc: string) {
  return async (p: LegalParams): Promise<SkillResult> => {
    const err = requireParam(p as Record<string, unknown>, "query", "search_legal_terms");
    if (err) return err;
    try {
      const result = await searchLegalTerms(oc, {
        query: p.query!,
        page: p.page ?? 1,
        display: p.display ?? 20,
      });

      if (result.items.length === 0) {
        return { content: [{ type: "text", text: `"${p.query}" 법령용어 검색 결과가 없습니다.` }] };
      }

      const listText = result.items
        .map((t, i) => `${i + 1}. [${t.id}] ${t.termName}`)
        .join("\n");

      return {
        content: [{
          type: "text",
          text: `## 법령용어 검색 결과\n\n검색어: "${p.query}"\n총 ${result.totalCount}건 (${result.currentPage}페이지)\n\n${listText}\n\n---\n상세 조회: get_legal_term_detail에 법령용어ID([ ] 안의 숫자)를 전달하세요.`,
        }],
      };
    } catch (error) {
      return errorResponse("법령용어 검색", error);
    }
  };
}

function handleGetLegalTermDetail(oc: string) {
  return async (p: LegalParams): Promise<SkillResult> => {
    const err = requireParam(p as Record<string, unknown>, "term_id", "get_legal_term_detail");
    if (err) return err;
    try {
      const d = await getLegalTermDetail(oc, p.term_id!);

      const parts: string[] = [
        `## ${d.termName}`,
        "",
      ];

      if (d.termNameHanja && d.termNameHanja !== d.termName)
        parts.push(`- **한자**: ${d.termNameHanja}`);
      if (d.source) parts.push(`- **출처**: ${d.source}`);
      if (d.definition) parts.push("", "### 정의", "", d.definition);

      return { content: [{ type: "text", text: parts.join("\n") }] };
    } catch (error) {
      return errorResponse("법령용어 상세 조회", error);
    }
  };
}

function handleSearchEnglishLaws(oc: string) {
  return async (p: LegalParams): Promise<SkillResult> => {
    const err = requireParam(p as Record<string, unknown>, "query", "search_english_laws");
    if (err) return err;
    try {
      const result = await searchEnglishLaws(oc, {
        query: p.query!,
        page: p.page ?? 1,
        display: p.display ?? 20,
      });

      if (result.items.length === 0) {
        return { content: [{ type: "text", text: `"${p.query}" 영문법령 검색 결과가 없습니다.` }] };
      }

      const listText = result.items
        .map((l, i) =>
          `${i + 1}. [${l.id}] ${l.lawNameKo}\n   EN: ${l.lawNameEn}\n   ${l.lawType} | 소관: ${l.departmentName} | 시행: ${l.enforcementDate}`
        )
        .join("\n\n");

      return {
        content: [{
          type: "text",
          text: `## 영문법령 검색 결과\n\n검색어: "${p.query}"\n총 ${result.totalCount}건 (${result.currentPage}페이지)\n\n${listText}\n\n---\n상세 조회: get_english_law_detail에 법령일련번호([ ] 안의 숫자)를 전달하세요.`,
        }],
      };
    } catch (error) {
      return errorResponse("영문법령 검색", error);
    }
  };
}

function handleGetEnglishLawDetail(oc: string) {
  return async (p: LegalParams): Promise<SkillResult> => {
    const err = requireParam(p as Record<string, unknown>, "law_id", "get_english_law_detail");
    if (err) return err;
    try {
      const d = await getEnglishLawDetail(oc, p.law_id!);

      const parts: string[] = [
        `## ${d.lawNameEn}`,
        "",
        `- **Law ID**: ${d.lawId}`,
        `- **Promulgation Date**: ${d.promulgationDate}`,
        `- **Promulgation Number**: ${d.promulgationNumber}`,
      ];

      if (d.articles.length > 0) {
        parts.push("", "### Articles");
        for (const a of d.articles) {
          const title = a.articleTitle ? ` (${a.articleTitle})` : "";
          parts.push("", `**Article ${a.articleNumber}${title}**`, "", a.articleContent);
        }
      }

      return { content: [{ type: "text", text: truncate(parts.join("\n")) }] };
    } catch (error) {
      return errorResponse("영문법령 상세 조회", error);
    }
  };
}

function handleSearchAttachedForms(oc: string) {
  return async (p: LegalParams): Promise<SkillResult> => {
    const err = requireParam(p as Record<string, unknown>, "query", "search_attached_forms");
    if (err) return err;
    try {
      const kndMap: Record<string, number | undefined> = {
        all: undefined, table: 1, form: 2, annex: 3, other: 4, unclassified: 5,
      };
      const result = await searchAttachedForms(oc, {
        query: p.query!,
        page: p.page ?? 1,
        display: p.display ?? 20,
        knd: kndMap[p.form_type ?? "all"] as 1 | 2 | 3 | 4 | 5 | undefined,
      });

      if (result.items.length === 0) {
        return { content: [{ type: "text", text: `"${p.query}" 별표서식 검색 결과가 없습니다.` }] };
      }

      const listText = result.items
        .map((f, i) =>
          `${i + 1}. [${f.id}] ${f.formName}\n   관련법령: ${f.relatedLawName} | 종류: ${f.formType} | 공포: ${f.promulgationDate}`
        )
        .join("\n\n");

      return {
        content: [{
          type: "text",
          text: `## 별표서식 검색 결과\n\n검색어: "${p.query}"\n총 ${result.totalCount}건 (${result.currentPage}페이지)\n\n${listText}`,
        }],
      };
    } catch (error) {
      return errorResponse("별표서식 검색", error);
    }
  };
}

function handleSearchLawAbbreviations(oc: string) {
  return async (p: LegalParams): Promise<SkillResult> => {
    try {
      const result = await searchLawAbbreviations(oc, {
        query: p.query || "",
        page: p.page ?? 1,
        display: p.display ?? 20,
      });

      if (result.items.length === 0) {
        return { content: [{ type: "text", text: `법령 약칭 검색 결과가 없습니다.` }] };
      }

      const listText = result.items
        .map((l, i) =>
          `${i + 1}. [${l.id}] ${l.lawName} → **${l.abbreviation}**\n   ${l.lawType} | 소관: ${l.departmentName} | 시행: ${l.enforcementDate}`
        )
        .join("\n\n");

      return {
        content: [{
          type: "text",
          text: `## 법령 약칭 검색 결과\n\n총 ${result.totalCount}건 (${result.currentPage}페이지)\n\n${listText}`,
        }],
      };
    } catch (error) {
      return errorResponse("법령 약칭 검색", error);
    }
  };
}

function handleGetLawArticleSub(oc: string) {
  return async (p: LegalParams): Promise<SkillResult> => {
    const err1 = requireParam(p as Record<string, unknown>, "law_id", "get_law_article_sub");
    if (err1) return err1;
    const err2 = requireParam(p as Record<string, unknown>, "article", "get_law_article_sub");
    if (err2) return err2;
    try {
      const d = await getLawArticleSub(oc, {
        lawId: p.law_id!,
        jo: p.article!,
        hang: p.paragraph,
        ho: p.clause,
        mok: p.subclause,
      });

      const parts: string[] = [
        `## ${d.lawNameKo}`,
        "",
        `- **법종구분**: ${d.lawTypeName}`,
        `- **소관부처**: ${d.departmentName}`,
        `- **시행일자**: ${d.enforcementDate}`,
      ];

      if (d.articleContent) {
        parts.push("", `### 제${d.articleNumber}조`, "", d.articleContent);
      }
      if (d.paragraphContent) {
        parts.push("", `#### 제${d.paragraphNumber}항`, "", d.paragraphContent);
      }
      if (d.clauseContent) {
        parts.push("", `##### 제${d.clauseNumber}호`, "", d.clauseContent);
      }
      if (d.subclauseContent) {
        parts.push("", `###### ${d.subclauseNumber}목`, "", d.subclauseContent);
      }

      return { content: [{ type: "text", text: parts.join("\n") }] };
    } catch (error) {
      return errorResponse("조항호목 조회", error);
    }
  };
}

function handleSearchAILegalTerms(oc: string) {
  return async (p: LegalParams): Promise<SkillResult> => {
    const err = requireParam(p as Record<string, unknown>, "query", "search_ai_legal_terms");
    if (err) return err;
    try {
      const result = await searchAILegalTerms(oc, {
        query: p.query!,
        page: p.page ?? 1,
        display: p.display ?? 20,
      });

      if (result.items.length === 0) {
        return { content: [{ type: "text", text: `"${p.query}" 지식베이스 법령용어 검색 결과가 없습니다.` }] };
      }

      const listText = result.items
        .map((t, i) =>
          `${i + 1}. **${t.termName}**\n   동음이의어: ${t.homonymExists || "N"}${t.remarks ? ` | 비고: ${t.remarks}` : ""}`
        )
        .join("\n\n");

      return {
        content: [{
          type: "text",
          text: `## 지식베이스 법령용어 검색 결과\n\n검색어: "${p.query}"\n총 ${result.totalCount}건\n\n${listText}`,
        }],
      };
    } catch (error) {
      return errorResponse("지식베이스 법령용어 검색", error);
    }
  };
}

function handleSearchLinkedOrdinances(oc: string) {
  return async (p: LegalParams): Promise<SkillResult> => {
    const err = requireParam(p as Record<string, unknown>, "query", "search_linked_ordinances");
    if (err) return err;
    try {
      const result = await searchLinkedOrdinances(oc, {
        query: p.query!,
        page: p.page ?? 1,
        display: p.display ?? 20,
      });

      if (result.items.length === 0) {
        return { content: [{ type: "text", text: `"${p.query}" 연계 조례 검색 결과가 없습니다.` }] };
      }

      const listText = result.items
        .map((o, i) =>
          `${i + 1}. [${o.id}] ${o.ordinanceName}\n   ${o.ordinanceType} | ${o.amendmentType} | 시행: ${o.enforcementDate}`
        )
        .join("\n\n");

      return {
        content: [{
          type: "text",
          text: `## 연계 조례 검색 결과\n\n검색어: "${p.query}"\n총 ${result.totalCount}건 (${result.currentPage}페이지)\n\n${listText}`,
        }],
      };
    } catch (error) {
      return errorResponse("연계 조례 검색", error);
    }
  };
}

export function createLegalResearchHandler(lawApiOc: string) {
  return createDispatcher<LegalParams>("legal_research", {
    search_laws: handleSearchLaws(lawApiOc),
    get_law_detail: handleGetLawDetail(lawApiOc),
    search_admin_rules: handleSearchAdminRules(lawApiOc),
    get_admin_rule_detail: handleGetAdminRuleDetail(lawApiOc),
    search_ordinances: handleSearchOrdinances(lawApiOc),
    get_ordinance_detail: handleGetOrdinanceDetail(lawApiOc),
    search_treaties: handleSearchTreaties(lawApiOc),
    get_treaty_detail: handleGetTreatyDetail(lawApiOc),
    search_legal_terms: handleSearchLegalTerms(lawApiOc),
    get_legal_term_detail: handleGetLegalTermDetail(lawApiOc),
    search_english_laws: handleSearchEnglishLaws(lawApiOc),
    get_english_law_detail: handleGetEnglishLawDetail(lawApiOc),
    search_attached_forms: handleSearchAttachedForms(lawApiOc),
    search_law_abbreviations: handleSearchLawAbbreviations(lawApiOc),
    get_law_article_sub: handleGetLawArticleSub(lawApiOc),
    search_ai_legal_terms: handleSearchAILegalTerms(lawApiOc),
    search_linked_ordinances: handleSearchLinkedOrdinances(lawApiOc),
  });
}

export function registerLegalResearch(
  server: McpServer,
  lawApiOc: string,
): void {
  const handler = createLegalResearchHandler(lawApiOc);

  registerSkillTool(server, {
    name: "legal_research",
    title: "Legal Research / 법령 리서치",
    description: "Legal Research — search and retrieve Korean statutes, enforcement decrees, administrative rules, municipal ordinances, treaties, legal terms, English translations, and annexes. / 법령 리서치 — 법률·시행령·행정규칙·자치법규·조약·법령용어·영문법령·별표서식 등을 검색/조회하는 통합 도구",
    inputSchema: {
      action: z.enum(ACTIONS).describe(
        "search_laws=법령검색 | get_law_detail=법령상세(law_id) | search_admin_rules=행정규칙검색 | get_admin_rule_detail=행정규칙상세(admrul_id) | search_ordinances=자치법규검색 | get_ordinance_detail=자치법규상세(ordin_id) | search_treaties=조약검색 | get_treaty_detail=조약상세(treaty_id) | search_legal_terms=법령용어검색 | get_legal_term_detail=법령용어상세(term_id) | search_english_laws=영문법령검색 | get_english_law_detail=영문법령상세(law_id) | search_attached_forms=별표서식검색 | search_law_abbreviations=법령약칭검색 | get_law_article_sub=조항호목조회(law_id+article) | search_ai_legal_terms=지식베이스법령용어검색 | search_linked_ordinances=연계조례검색",
      ),
      query: z.string().optional().describe("검색어 (대부분의 search_* action에서 사용)"),
      page: z.number().optional().describe("페이지 번호 (검색 action에서 사용)"),
      display: z.number().optional().describe("페이지당 결과 수 (검색 action에서 사용)"),
      search_type: z.enum(["law_name", "full_text", "ordinance_name", "case_name"]).optional()
        .describe("검색 범위 (search_laws, search_ordinances에서 사용)"),
      law_id: z.number().optional().describe("법령/영문법령 일련번호 (get_law_detail, get_english_law_detail, get_law_article_sub에서 사용)"),
      admrul_id: z.number().optional().describe("행정규칙 일련번호 (get_admin_rule_detail에서 사용)"),
      ordin_id: z.number().optional().describe("자치법규 일련번호 (get_ordinance_detail에서 사용)"),
      treaty_id: z.number().optional().describe("조약 일련번호 (get_treaty_detail에서 사용)"),
      term_id: z.string().optional().describe("법령용어 ID (get_legal_term_detail에서 사용)"),
      form_type: z.enum(["all", "table", "form", "annex", "other", "unclassified"]).optional()
        .describe("별표서식 종류 (search_attached_forms에서 사용)"),
      article: z.string().optional().describe("조번호 6자리 (get_law_article_sub에서 사용, 예: '000100'은 제1조)"),
      paragraph: z.string().optional().describe("항번호 6자리 (get_law_article_sub에서 사용)"),
      clause: z.string().optional().describe("호번호 6자리 (get_law_article_sub에서 사용)"),
      subclause: z.string().optional().describe("목번호 (get_law_article_sub에서 사용, 예: '가')"),
    },
    callback: async (params) => handler(params as LegalParams),
  });
}
