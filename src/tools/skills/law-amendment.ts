/**
 * Skill: law_amendment — 법령 개정 비교 통합 도구
 * 기존 도구: search_old_new_law, get_old_new_law_detail,
 *   search_law_system, get_law_system_detail,
 *   search_three_way_comp, get_three_way_comp_detail,
 *   search_law_change_history,
 *   search_admin_rule_old_new, get_admin_rule_old_new_detail
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  searchOldNewLaw, getOldNewLawDetail,
  searchLawSystem, getLawSystemDetail,
  searchThreeWayComp, getThreeWayCompDetail,
  searchLawChangeHistory,
  searchAdminRuleOldNew, getAdminRuleOldNewDetail,
} from "../../law-api.js";
import { errorResponse, truncate } from "../../shared.js";
import { createDispatcher, requireParam, type SkillResult, registerSkillTool } from "./_shared.js";

const ACTIONS = [
  "search_old_new_law",
  "get_old_new_law_detail",
  "search_law_system",
  "get_law_system_detail",
  "search_three_way_comp",
  "get_three_way_comp_detail",
  "search_law_change_history",
  "search_admin_rule_old_new",
  "get_admin_rule_old_new_detail",
] as const;

type LawAmendmentParams = {
  action: string;
  query?: string;
  page?: number;
  display?: number;
  law_id?: number;
  oldnew_id?: number;
  comparison_type?: "citation" | "delegation";
  date?: string;
};

function handleSearchOldNewLaw(lawApiOc: string) {
  return async (p: LawAmendmentParams): Promise<SkillResult> => {
    const err = requireParam(p as Record<string, unknown>, "query", "search_old_new_law");
    if (err) return err;
    try {
      const result = await searchOldNewLaw(lawApiOc, {
        query: p.query!,
        page: p.page ?? 1,
        display: p.display ?? 20,
      });

      if (result.items.length === 0) {
        return { content: [{ type: "text", text: `"${p.query}" 신구법비교 검색 결과가 없습니다.` }] };
      }

      const listText = result.items
        .map((l, i) =>
          `${i + 1}. [${l.id}] ${l.lawName}\n   ${l.lawType} | ${l.amendmentType} | 공포: ${l.promulgationDate} | 시행: ${l.enforcementDate}\n   소관: ${l.departmentName}`)
        .join("\n\n");

      return {
        content: [{
          type: "text",
          text: `## 신구법비교 검색 결과\n\n검색어: "${p.query}"\n총 ${result.totalCount}건 (${result.currentPage}페이지)\n\n${listText}\n\n---\n상세 조회: get_old_new_law_detail에 일련번호([ ] 안의 숫자)를 전달하세요.`,
        }],
      };
    } catch (error) {
      return errorResponse("신구법비교 검색", error);
    }
  };
}

function handleGetOldNewLawDetail(lawApiOc: string) {
  return async (p: LawAmendmentParams): Promise<SkillResult> => {
    const err = requireParam(p as Record<string, unknown>, "oldnew_id", "get_old_new_law_detail");
    if (err) return err;
    try {
      const d = await getOldNewLawDetail(lawApiOc, p.oldnew_id!);

      const parts: string[] = [
        `## 신구법비교: ${d.newBasicInfo.lawName}`,
        "",
        "### 구법 (개정 전)",
        `- **법령명**: ${d.oldBasicInfo.lawName}`,
        `- **시행일자**: ${d.oldBasicInfo.enforcementDate}`,
        `- **공포일자**: ${d.oldBasicInfo.promulgationDate}`,
        `- **제개정구분**: ${d.oldBasicInfo.amendmentType}`,
      ];

      if (d.oldArticles) parts.push("", "#### 구조문", "", truncate(d.oldArticles, 3000));

      parts.push(
        "",
        "### 신법 (개정 후)",
        `- **법령명**: ${d.newBasicInfo.lawName}`,
        `- **시행일자**: ${d.newBasicInfo.enforcementDate}`,
        `- **공포일자**: ${d.newBasicInfo.promulgationDate}`,
        `- **제개정구분**: ${d.newBasicInfo.amendmentType}`,
      );

      if (d.newArticles) parts.push("", "#### 신조문", "", truncate(d.newArticles, 3000));

      return { content: [{ type: "text", text: parts.join("\n") }] };
    } catch (error) {
      return errorResponse("신구법비교 상세 조회", error);
    }
  };
}

function handleSearchLawSystem(lawApiOc: string) {
  return async (p: LawAmendmentParams): Promise<SkillResult> => {
    const err = requireParam(p as Record<string, unknown>, "query", "search_law_system");
    if (err) return err;
    try {
      const result = await searchLawSystem(lawApiOc, {
        query: p.query!,
        page: p.page ?? 1,
        display: p.display ?? 20,
      });

      if (result.items.length === 0) {
        return { content: [{ type: "text", text: `"${p.query}" 법령 체계도 검색 결과가 없습니다.` }] };
      }

      const listText = result.items
        .map((l, i) =>
          `${i + 1}. [${l.id}] ${l.lawName}\n   ${l.lawType} | 소관: ${l.departmentName} | 시행: ${l.enforcementDate}`)
        .join("\n\n");

      return {
        content: [{
          type: "text",
          text: `## 법령 체계도 검색 결과\n\n검색어: "${p.query}"\n총 ${result.totalCount}건 (${result.currentPage}페이지)\n\n${listText}\n\n---\n상세 조회: get_law_system_detail에 법령일련번호([ ] 안의 숫자)를 전달하세요.`,
        }],
      };
    } catch (error) {
      return errorResponse("법령 체계도 검색", error);
    }
  };
}

function handleGetLawSystemDetail(lawApiOc: string) {
  return async (p: LawAmendmentParams): Promise<SkillResult> => {
    const err = requireParam(p as Record<string, unknown>, "law_id", "get_law_system_detail");
    if (err) return err;
    try {
      const d = await getLawSystemDetail(lawApiOc, p.law_id!);

      const parts: string[] = [
        `## 법령 체계도: ${d.basicInfo.lawName}`,
        "",
        `- **법령ID**: ${d.basicInfo.lawId}`,
        `- **법종구분**: ${d.basicInfo.lawType}`,
        `- **시행일자**: ${d.basicInfo.enforcementDate}`,
        `- **공포일자**: ${d.basicInfo.promulgationDate}`,
      ];

      if (d.hierarchy) parts.push("", "### 상하위법 체계", "", truncate(d.hierarchy));

      return { content: [{ type: "text", text: parts.join("\n") }] };
    } catch (error) {
      return errorResponse("법령 체계도 상세 조회", error);
    }
  };
}

function handleSearchThreeWayComp(lawApiOc: string) {
  return async (p: LawAmendmentParams): Promise<SkillResult> => {
    const err = requireParam(p as Record<string, unknown>, "query", "search_three_way_comp");
    if (err) return err;
    try {
      const result = await searchThreeWayComp(lawApiOc, {
        query: p.query!,
        page: p.page ?? 1,
        display: p.display ?? 20,
      });

      if (result.items.length === 0) {
        return { content: [{ type: "text", text: `"${p.query}" 3단비교 검색 결과가 없습니다.` }] };
      }

      const listText = result.items
        .map((l, i) =>
          `${i + 1}. [${l.id}] ${l.lawName}\n   ${l.lawType} | 소관: ${l.departmentName} | 시행: ${l.enforcementDate}`)
        .join("\n\n");

      return {
        content: [{
          type: "text",
          text: `## 3단비교 검색 결과\n\n검색어: "${p.query}"\n총 ${result.totalCount}건 (${result.currentPage}페이지)\n\n${listText}\n\n---\n상세 조회: get_three_way_comp_detail에 일련번호([ ] 안의 숫자)를 전달하세요.`,
        }],
      };
    } catch (error) {
      return errorResponse("3단비교 검색", error);
    }
  };
}

function handleGetThreeWayCompDetail(lawApiOc: string) {
  return async (p: LawAmendmentParams): Promise<SkillResult> => {
    const err = requireParam(p as Record<string, unknown>, "law_id", "get_three_way_comp_detail");
    if (err) return err;
    try {
      const knd = p.comparison_type === "delegation" ? 2 : 1;
      const d = await getThreeWayCompDetail(lawApiOc, p.law_id!, knd as 1 | 2);

      const typeLabel = knd === 1 ? "인용조문" : "위임조문";
      const parts: string[] = [
        `## 3단비교 (${typeLabel}): ${d.basicInfo.lawName}`,
        "",
      ];

      if (d.basicInfo.decreeName) parts.push(`- **시행령**: ${d.basicInfo.decreeName}`);
      if (d.basicInfo.ruleName) parts.push(`- **시행규칙**: ${d.basicInfo.ruleName}`);
      parts.push(`- **삼단비교 존재 여부**: ${d.basicInfo.comparisonExists}`);

      if (d.content) parts.push("", `### ${typeLabel} 삼단비교`, "", truncate(d.content));

      return { content: [{ type: "text", text: parts.join("\n") }] };
    } catch (error) {
      return errorResponse("3단비교 상세 조회", error);
    }
  };
}

function handleSearchLawChangeHistory(lawApiOc: string) {
  return async (p: LawAmendmentParams): Promise<SkillResult> => {
    const err = requireParam(p as Record<string, unknown>, "date", "search_law_change_history");
    if (err) return err;
    try {
      const result = await searchLawChangeHistory(lawApiOc, {
        regDt: p.date!,
        page: p.page ?? 1,
        display: p.display ?? 20,
      });

      if (result.items.length === 0) {
        return { content: [{ type: "text", text: `${p.date} 일자에 변경된 법령이 없습니다.` }] };
      }

      const listText = result.items
        .map((l, i) =>
          `${i + 1}. [${l.id}] ${l.lawName}\n   ${l.lawType} | ${l.amendmentType} | 공포: ${l.promulgationDate} | 시행: ${l.enforcementDate} | 소관: ${l.departmentName}`)
        .join("\n\n");

      return {
        content: [{
          type: "text",
          text: `## 법령 변경이력 (${p.date})\n\n총 ${result.totalCount}건 (${result.currentPage}페이지)\n\n${listText}`,
        }],
      };
    } catch (error) {
      return errorResponse("법령 변경이력 조회", error);
    }
  };
}

function handleSearchAdminRuleOldNew(lawApiOc: string) {
  return async (p: LawAmendmentParams): Promise<SkillResult> => {
    const err = requireParam(p as Record<string, unknown>, "query", "search_admin_rule_old_new");
    if (err) return err;
    try {
      const result = await searchAdminRuleOldNew(lawApiOc, {
        query: p.query!,
        page: p.page ?? 1,
        display: p.display ?? 20,
      });

      if (result.items.length === 0) {
        return { content: [{ type: "text", text: `"${p.query}" 행정규칙 신구법비교 검색 결과가 없습니다.` }] };
      }

      const listText = result.items
        .map((r, i) =>
          `${i + 1}. [${r.id}] ${r.ruleName}\n   ${r.lawType} | ${r.amendmentType} | 발령: ${r.issuanceDate} | 시행: ${r.enforcementDate}\n   소관: ${r.departmentName}`)
        .join("\n\n");

      return {
        content: [{
          type: "text",
          text: `## 행정규칙 신구법비교 검색 결과\n\n검색어: "${p.query}"\n총 ${result.totalCount}건 (${result.currentPage}페이지)\n\n${listText}\n\n---\n상세 조회: get_admin_rule_old_new_detail에 일련번호([ ] 안의 숫자)를 전달하세요.`,
        }],
      };
    } catch (error) {
      return errorResponse("행정규칙 신구법비교 검색", error);
    }
  };
}

function handleGetAdminRuleOldNewDetail(lawApiOc: string) {
  return async (p: LawAmendmentParams): Promise<SkillResult> => {
    const err = requireParam(p as Record<string, unknown>, "oldnew_id", "get_admin_rule_old_new_detail");
    if (err) return err;
    try {
      const d = await getAdminRuleOldNewDetail(lawApiOc, p.oldnew_id!);

      const parts: string[] = [
        `## 행정규칙 신구법비교: ${d.newBasicInfo.ruleName}`,
        "",
        "### 구법 (개정 전)",
        `- **행정규칙명**: ${d.oldBasicInfo.ruleName}`,
        `- **시행일자**: ${d.oldBasicInfo.enforcementDate}`,
        `- **발령일자**: ${d.oldBasicInfo.issuanceDate}`,
      ];

      if (d.oldArticles) parts.push("", "#### 구조문", "", truncate(d.oldArticles, 3000));

      parts.push(
        "",
        "### 신법 (개정 후)",
        `- **행정규칙명**: ${d.newBasicInfo.ruleName}`,
        `- **시행일자**: ${d.newBasicInfo.enforcementDate}`,
        `- **발령일자**: ${d.newBasicInfo.issuanceDate}`,
      );

      if (d.newArticles) parts.push("", "#### 신조문", "", truncate(d.newArticles, 3000));

      return { content: [{ type: "text", text: parts.join("\n") }] };
    } catch (error) {
      return errorResponse("행정규칙 신구법비교 상세 조회", error);
    }
  };
}

export function createLawAmendmentHandler(lawApiOc: string) {
  return createDispatcher<LawAmendmentParams>("law_amendment", {
    search_old_new_law: handleSearchOldNewLaw(lawApiOc),
    get_old_new_law_detail: handleGetOldNewLawDetail(lawApiOc),
    search_law_system: handleSearchLawSystem(lawApiOc),
    get_law_system_detail: handleGetLawSystemDetail(lawApiOc),
    search_three_way_comp: handleSearchThreeWayComp(lawApiOc),
    get_three_way_comp_detail: handleGetThreeWayCompDetail(lawApiOc),
    search_law_change_history: handleSearchLawChangeHistory(lawApiOc),
    search_admin_rule_old_new: handleSearchAdminRuleOldNew(lawApiOc),
    get_admin_rule_old_new_detail: handleGetAdminRuleOldNewDetail(lawApiOc),
  });
}

export function registerLawAmendment(
  server: McpServer,
  lawApiOc: string,
): void {
  const handler = createLawAmendmentHandler(lawApiOc);

  registerSkillTool(server, {
    name: "law_amendment",
    title: "법령 개정 비교",
    description: "법령 개정 비교 — 신구법비교, 법령 체계도, 3단비교, 변경이력, 행정규칙 신구법비교를 검색/조회하는 통합 도구",
    inputSchema: {
      action: z.enum(ACTIONS).describe(
        "search_old_new_law=신구법비교검색 | get_old_new_law_detail=신구법비교상세(law_id필수) | search_law_system=법령체계도검색 | get_law_system_detail=법령체계도상세(law_id필수) | search_three_way_comp=3단비교검색 | get_three_way_comp_detail=3단비교상세(law_id필수) | search_law_change_history=법령변경이력(law_id필수) | search_admin_rule_old_new=행정규칙신구법비교검색 | get_admin_rule_old_new_detail=행정규칙신구법비교상세(oldnew_id필수)",
      ),
      query: z.string().optional().describe("검색어 (search 계열 action에서 사용)"),
      page: z.number().optional().describe("페이지 번호"),
      display: z.number().optional().describe("페이지당 결과 수"),
      law_id: z.number().optional().describe("법령 일련번호 (get_law_system_detail, get_three_way_comp_detail에서 사용)"),
      oldnew_id: z.number().optional().describe("신구법 일련번호 (get_old_new_law_detail, get_admin_rule_old_new_detail에서 사용)"),
      comparison_type: z.enum(["citation", "delegation"]).optional().describe("비교 유형 (get_three_way_comp_detail에서 사용)"),
      date: z.string().optional().describe("변경 일자 YYYYMMDD (search_law_change_history에서 사용)"),
    },
    callback: async (params) => handler(params as LawAmendmentParams),
  });
}
