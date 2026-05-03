/**
 * Skill: case_research — 판례·결정례 리서치 통합 도구
 * 기존 도구: search_cases, get_case_detail, search_constitutional,
 *   get_constitutional_detail, search_interpretations, get_interpretation_detail,
 *   search_committee_decisions, get_committee_decision_detail,
 *   search_admin_appeals, get_admin_appeal_detail
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  searchCases, getCaseDetail,
  searchConstitutional, getConstitutionalDetail,
  searchInterpretations, getInterpretationDetail,
  searchCommitteeDecisions, getCommitteeDecisionDetail, getCommitteeName,
  searchAdminAppeals, getAdminAppealDetail,
} from "../../law-api.js";
import { errorResponse, truncate } from "../../shared.js";
import { createDispatcher, requireParam, type SkillResult, registerSkillTool } from "./_shared.js";

const ACTIONS = [
  "search_cases",
  "get_case_detail",
  "search_constitutional",
  "get_constitutional_detail",
  "search_interpretations",
  "get_interpretation_detail",
  "search_committee_decisions",
  "get_committee_decision_detail",
  "search_admin_appeals",
  "get_admin_appeal_detail",
] as const;

const COMMITTEE_VALUES = [
  "ftc", "acr", "fsc", "nlrc", "kcc", "oclt", "nhrck", "eiac", "ecc", "sfc", "iaciac",
] as const;

type CaseResearchParams = {
  action: string;
  query?: string;
  page?: number;
  display?: number;
  search_type?: string;
  date_from?: string;
  date_to?: string;
  court?: string;
  case_id?: number;
  detc_id?: number;
  expc_id?: number;
  decc_id?: number;
  committee?: string;
  decision_id?: number;
  sections?: string[];
};

function handleSearchCases(oc: string) {
  return async (p: CaseResearchParams): Promise<SkillResult> => {
    const err = requireParam(p as Record<string, unknown>, "query", "search_cases");
    if (err) return err;
    try {
      const courtMap: Record<string, string> = { supreme: "400201", lower: "400202", all: "" };
      const result = await searchCases(oc, {
        query: p.query!,
        page: p.page ?? 1,
        display: p.display ?? 20,
        search: p.search_type === "case_name" ? 1 : 2,
        dateFrom: p.date_from,
        dateTo: p.date_to,
        court: courtMap[p.court ?? "all"],
      });

      if (result.items.length === 0) {
        return { content: [{ type: "text", text: `"${p.query}" 판례 검색 결과가 없습니다.` }] };
      }

      const listText = result.items
        .map((c, i) =>
          `${i + 1}. [${c.id}] ${c.caseName}\n   사건번호: ${c.caseNumber}\n   법원: ${c.courtName} | 선고일: ${c.decisionDate} | 선고: ${c.verdict}\n   사건종류: ${c.caseType} | 판결유형: ${c.verdictType}`)
        .join("\n\n");

      return {
        content: [{
          type: "text",
          text: `## 판례 검색 결과\n\n검색어: "${p.query}"\n총 ${result.totalCount}건 (${result.currentPage}페이지)\n\n${listText}\n\n---\n상세 조회: get_case_detail에 판례 ID([ ] 안의 숫자)를 전달하세요.`,
        }],
      };
    } catch (error) {
      return errorResponse("판례 검색", error);
    }
  };
}

function handleGetCaseDetail(oc: string) {
  return async (p: CaseResearchParams): Promise<SkillResult> => {
    const err = requireParam(p as Record<string, unknown>, "case_id", "get_case_detail");
    if (err) return err;
    try {
      const d = await getCaseDetail(oc, p.case_id!);
      const sections = p.sections ?? ["all"];
      const showAll = sections.includes("all");

      const parts: string[] = [
        `## ${d.caseName}`,
        "",
        `- **사건번호**: ${d.caseNumber}`,
        `- **법원**: ${d.courtName}`,
        `- **선고일**: ${d.decisionDate}`,
        `- **선고**: ${d.verdict}`,
        `- **사건종류**: ${d.caseType}`,
        `- **판결유형**: ${d.verdictType}`,
      ];

      if ((showAll || sections.includes("holdings")) && d.holdings)
        parts.push("", "### 판시사항", "", d.holdings);
      if ((showAll || sections.includes("summary")) && d.summary)
        parts.push("", "### 판결요지", "", d.summary);
      if ((showAll || sections.includes("reference_laws")) && d.referenceLaws)
        parts.push("", "### 참조조문", "", d.referenceLaws);
      if ((showAll || sections.includes("reference_cases")) && d.referenceCases)
        parts.push("", "### 참조판례", "", d.referenceCases);
      if ((showAll || sections.includes("content")) && d.content)
        parts.push("", "### 판례내용", "", truncate(d.content));

      return { content: [{ type: "text", text: parts.join("\n") }] };
    } catch (error) {
      return errorResponse("판례 상세 조회", error);
    }
  };
}

function handleSearchConstitutional(oc: string) {
  return async (p: CaseResearchParams): Promise<SkillResult> => {
    const err = requireParam(p as Record<string, unknown>, "query", "search_constitutional");
    if (err) return err;
    try {
      const result = await searchConstitutional(oc, {
        query: p.query!,
        page: p.page ?? 1,
        display: p.display ?? 20,
      });

      if (result.items.length === 0) {
        return { content: [{ type: "text", text: `"${p.query}" 헌재결정례 검색 결과가 없습니다.` }] };
      }

      const listText = result.items
        .map((c, i) =>
          `${i + 1}. [${c.id}] ${c.caseName}\n   사건번호: ${c.caseNumber} | 종국일: ${c.conclusionDate}`)
        .join("\n\n");

      return {
        content: [{
          type: "text",
          text: `## 헌재결정례 검색 결과\n\n검색어: "${p.query}"\n총 ${result.totalCount}건 (${result.currentPage}페이지)\n\n${listText}\n\n---\n상세 조회: get_constitutional_detail에 일련번호([ ] 안의 숫자)를 전달하세요.`,
        }],
      };
    } catch (error) {
      return errorResponse("헌재결정례 검색", error);
    }
  };
}

function handleGetConstitutionalDetail(oc: string) {
  return async (p: CaseResearchParams): Promise<SkillResult> => {
    const err = requireParam(p as Record<string, unknown>, "detc_id", "get_constitutional_detail");
    if (err) return err;
    try {
      const d = await getConstitutionalDetail(oc, p.detc_id!);
      const sections = p.sections ?? ["holdings", "decision_summary"];
      const showAll = sections.includes("all");

      const parts: string[] = [
        `## ${d.caseName}`,
        "",
        `- **사건번호**: ${d.caseNumber}`,
        `- **종국일**: ${d.conclusionDate}`,
        `- **사건종류**: ${d.caseType}`,
      ];

      if ((showAll || sections.includes("holdings")) && d.holdings)
        parts.push("", "### 판시사항", "", d.holdings);
      if ((showAll || sections.includes("decision_summary")) && d.decisionSummary)
        parts.push("", "### 결정요지", "", d.decisionSummary);
      if ((showAll || sections.includes("full_text")) && d.fullText)
        parts.push("", "### 전문", "", truncate(d.fullText));
      if ((showAll || sections.includes("reference_laws")) && d.referenceLaws)
        parts.push("", "### 참조조문", "", d.referenceLaws);
      if ((showAll || sections.includes("reference_cases")) && d.referenceCases)
        parts.push("", "### 참조판례", "", d.referenceCases);

      return { content: [{ type: "text", text: parts.join("\n") }] };
    } catch (error) {
      return errorResponse("헌재결정례 상세 조회", error);
    }
  };
}

function handleSearchInterpretations(oc: string) {
  return async (p: CaseResearchParams): Promise<SkillResult> => {
    const err = requireParam(p as Record<string, unknown>, "query", "search_interpretations");
    if (err) return err;
    try {
      const result = await searchInterpretations(oc, {
        query: p.query!,
        page: p.page ?? 1,
        display: p.display ?? 20,
      });

      if (result.items.length === 0) {
        return { content: [{ type: "text", text: `"${p.query}" 법령해석례 검색 결과가 없습니다.` }] };
      }

      const listText = result.items
        .map((e, i) =>
          `${i + 1}. [${e.id}] ${e.title}\n   안건번호: ${e.caseNumber} | 질의: ${e.inquiryOrg} | 회신: ${e.replyOrg} (${e.replyDate})`)
        .join("\n\n");

      return {
        content: [{
          type: "text",
          text: `## 법령해석례 검색 결과\n\n검색어: "${p.query}"\n총 ${result.totalCount}건 (${result.currentPage}페이지)\n\n${listText}\n\n---\n상세 조회: get_interpretation_detail에 일련번호([ ] 안의 숫자)를 전달하세요.`,
        }],
      };
    } catch (error) {
      return errorResponse("법령해석례 검색", error);
    }
  };
}

function handleGetInterpretationDetail(oc: string) {
  return async (p: CaseResearchParams): Promise<SkillResult> => {
    const err = requireParam(p as Record<string, unknown>, "expc_id", "get_interpretation_detail");
    if (err) return err;
    try {
      const d = await getInterpretationDetail(oc, p.expc_id!);

      const parts: string[] = [
        `## ${d.title}`,
        "",
        `- **안건번호**: ${d.caseNumber}`,
        `- **해석일자**: ${d.interpretationDate}`,
        `- **해석기관**: ${d.interpretationOrg}`,
        `- **질의기관**: ${d.inquiryOrg}`,
      ];

      if (d.inquirySummary) parts.push("", "### 질의요지", "", d.inquirySummary);
      if (d.reply) parts.push("", "### 회답", "", d.reply);
      if (d.reason) parts.push("", "### 이유", "", truncate(d.reason));

      return { content: [{ type: "text", text: parts.join("\n") }] };
    } catch (error) {
      return errorResponse("법령해석례 상세 조회", error);
    }
  };
}

function handleSearchCommitteeDecisions(oc: string) {
  return async (p: CaseResearchParams): Promise<SkillResult> => {
    const err = requireParam(p as Record<string, unknown>, "committee", "search_committee_decisions");
    if (err) return err;
    try {
      const committeeName = getCommitteeName(p.committee!);
      const result = await searchCommitteeDecisions(oc, p.committee!, {
        query: p.query || "",
        page: p.page ?? 1,
        display: p.display ?? 20,
      });

      if (result.items.length === 0) {
        return { content: [{ type: "text", text: `${committeeName} 결정문 검색 결과가 없습니다.` }] };
      }

      const listText = result.items
        .map((d, i) =>
          `${i + 1}. [${d.id}] ${d.title}\n   ${d.caseNumber ? `번호: ${d.caseNumber} | ` : ""}${d.decisionDate ? `일자: ${d.decisionDate}` : ""}`)
        .join("\n\n");

      return {
        content: [{
          type: "text",
          text: `## ${committeeName} 결정문 검색 결과\n\n${p.query ? `검색어: "${p.query}"\n` : ""}총 ${result.totalCount}건 (${result.currentPage}페이지)\n\n${listText}\n\n---\n상세 조회: get_committee_decision_detail에 committee="${p.committee}"와 결정문일련번호([ ] 안의 숫자)를 전달하세요.`,
        }],
      };
    } catch (error) {
      return errorResponse("위원회 결정문 검색", error);
    }
  };
}

function handleGetCommitteeDecisionDetail(oc: string) {
  return async (p: CaseResearchParams): Promise<SkillResult> => {
    const errC = requireParam(p as Record<string, unknown>, "committee", "get_committee_decision_detail");
    if (errC) return errC;
    const errD = requireParam(p as Record<string, unknown>, "decision_id", "get_committee_decision_detail");
    if (errD) return errD;
    try {
      const committeeName = getCommitteeName(p.committee!);
      const d = await getCommitteeDecisionDetail(oc, p.committee!, p.decision_id!);

      const parts: string[] = [
        `## ${d.title || `${committeeName} 결정문`}`,
        "",
        `- **위원회**: ${d.agencyName || committeeName}`,
      ];

      if (d.caseNumber) parts.push(`- **사건/안건번호**: ${d.caseNumber}`);
      if (d.decisionDate) parts.push(`- **결정/의결일**: ${d.decisionDate}`);

      for (const [key, val] of Object.entries(d.extras)) {
        parts.push(`- **${key}**: ${val}`);
      }

      if (d.summary) parts.push("", "### 요지/개요", "", d.summary);
      if (d.ruling) parts.push("", "### 주문/조치내용", "", d.ruling);
      if (d.reason) parts.push("", "### 이유", "", truncate(d.reason));

      return { content: [{ type: "text", text: parts.join("\n") }] };
    } catch (error) {
      return errorResponse("위원회 결정문 상세 조회", error);
    }
  };
}

function handleSearchAdminAppeals(oc: string) {
  return async (p: CaseResearchParams): Promise<SkillResult> => {
    const err = requireParam(p as Record<string, unknown>, "query", "search_admin_appeals");
    if (err) return err;
    try {
      const result = await searchAdminAppeals(oc, {
        query: p.query!,
        page: p.page ?? 1,
        display: p.display ?? 20,
      });

      if (result.items.length === 0) {
        return { content: [{ type: "text", text: `"${p.query}" 행정심판례 검색 결과가 없습니다.` }] };
      }

      const listText = result.items
        .map((a, i) =>
          `${i + 1}. [${a.id}] ${a.caseName}\n   사건번호: ${a.caseNumber} | 의결일: ${a.decisionDate} | 재결청: ${a.decisionAgency}\n   재결구분: ${a.decisionType}${a.dispositionAgency ? ` | 처분청: ${a.dispositionAgency}` : ""}`)
        .join("\n\n");

      return {
        content: [{
          type: "text",
          text: `## 행정심판례 검색 결과\n\n검색어: "${p.query}"\n총 ${result.totalCount}건 (${result.currentPage}페이지)\n\n${listText}\n\n---\n상세 조회: get_admin_appeal_detail에 일련번호([ ] 안의 숫자)를 전달하세요.`,
        }],
      };
    } catch (error) {
      return errorResponse("행정심판례 검색", error);
    }
  };
}

function handleGetAdminAppealDetail(oc: string) {
  return async (p: CaseResearchParams): Promise<SkillResult> => {
    const err = requireParam(p as Record<string, unknown>, "decc_id", "get_admin_appeal_detail");
    if (err) return err;
    try {
      const d = await getAdminAppealDetail(oc, p.decc_id!);

      const parts: string[] = [
        `## ${d.caseName}`,
        "",
        `- **사건번호**: ${d.caseNumber}`,
        `- **의결일자**: ${d.decisionDate}`,
        `- **재결청**: ${d.decisionAgency}`,
        `- **재결유형**: ${d.decisionTypeName}`,
      ];

      if (d.dispositionDate) parts.push(`- **처분일자**: ${d.dispositionDate}`);
      if (d.dispositionAgency) parts.push(`- **처분청**: ${d.dispositionAgency}`);
      if (d.summary) parts.push("", "### 재결요지", "", d.summary);
      if (d.claim) parts.push("", "### 청구취지", "", d.claim);
      if (d.ruling) parts.push("", "### 주문", "", d.ruling);
      if (d.reason) parts.push("", "### 이유", "", truncate(d.reason));

      return { content: [{ type: "text", text: parts.join("\n") }] };
    } catch (error) {
      return errorResponse("행정심판례 상세 조회", error);
    }
  };
}

export function createCaseResearchHandler(lawApiOc: string) {
  return createDispatcher<CaseResearchParams>("case_research", {
    search_cases: handleSearchCases(lawApiOc),
    get_case_detail: handleGetCaseDetail(lawApiOc),
    search_constitutional: handleSearchConstitutional(lawApiOc),
    get_constitutional_detail: handleGetConstitutionalDetail(lawApiOc),
    search_interpretations: handleSearchInterpretations(lawApiOc),
    get_interpretation_detail: handleGetInterpretationDetail(lawApiOc),
    search_committee_decisions: handleSearchCommitteeDecisions(lawApiOc),
    get_committee_decision_detail: handleGetCommitteeDecisionDetail(lawApiOc),
    search_admin_appeals: handleSearchAdminAppeals(lawApiOc),
    get_admin_appeal_detail: handleGetAdminAppealDetail(lawApiOc),
  });
}

export function registerCaseResearch(server: McpServer, lawApiOc: string): void {
  const handler = createCaseResearchHandler(lawApiOc);

  registerSkillTool(server, {
    name: "case_research",
    title: "Case Law Research / 판례·결정례 리서치",
    description: "Case Law Research — search Korean Supreme Court rulings, Constitutional Court decisions, statutory interpretations, committee decisions, and administrative appeal rulings. Korean cases only; use foreign_case_research for US/German cases. / 판례·결정례 리서치 — 대법원 판례, 헌재결정례, 법령해석례, 위원회 결정문, 행정심판례 검색/조회. 한국 판례만 검색합니다. 미국/독일 판례는 foreign_case_research를 사용하세요.",
    inputSchema: {
      action: z.enum(ACTIONS).describe(
        "search_cases=판례검색 | get_case_detail=판례상세(case_id필수) | search_constitutional=헌재결정례검색 | get_constitutional_detail=헌재상세(detc_id필수) | search_interpretations=법령해석례검색 | get_interpretation_detail=해석례상세(expc_id필수) | search_committee_decisions=위원회결정문검색(committee필수) | get_committee_decision_detail=결정문상세(decision_id필수) | search_admin_appeals=행정심판례검색 | get_admin_appeal_detail=심판례상세(detc_id필수)",
      ),
      query: z.string().optional().describe("검색어"),
      page: z.number().optional().describe("페이지 번호"),
      display: z.number().optional().describe("페이지당 결과 수"),
      search_type: z.enum(["case_name", "full_text"]).optional().describe("검색 범위 (search_cases에서 사용)"),
      date_from: z.string().optional().describe("검색 시작일 YYYYMMDD (search_cases에서 사용)"),
      date_to: z.string().optional().describe("검색 종료일 YYYYMMDD (search_cases에서 사용)"),
      court: z.enum(["supreme", "lower", "all"]).optional().describe("법원 유형 (search_cases에서 사용)"),
      case_id: z.number().optional().describe("판례 일련번호 (get_case_detail에서 사용)"),
      detc_id: z.number().optional().describe("헌재결정례 일련번호 (get_constitutional_detail에서 사용)"),
      expc_id: z.number().optional().describe("법령해석례 일련번호 (get_interpretation_detail에서 사용)"),
      decc_id: z.number().optional().describe("행정심판례 일련번호 (get_admin_appeal_detail에서 사용)"),
      committee: z.enum(COMMITTEE_VALUES).optional().describe("위원회 코드 (search_committee_decisions, get_committee_decision_detail에서 사용)"),
      decision_id: z.number().optional().describe("결정문 일련번호 (get_committee_decision_detail에서 사용)"),
      sections: z.array(z.string()).optional().describe("조회할 섹션 (get_case_detail, get_constitutional_detail에서 사용)"),
    },
    callback: async (params) => handler(params as CaseResearchParams),
  });
}
