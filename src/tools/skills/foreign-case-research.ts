/**
 * Skill: foreign_case_research — 해외 판례 리서치 (미국 + 독일)
 *
 * - search_us_cases / get_us_case_detail (CourtListener)
 * - search_de_cases / get_de_case_detail (OpenLegalData)
 *
 * 환경변수 게이팅:
 * - COURTLISTENER_API_TOKEN → enableUS=true (미국 액션 활성)
 * - OPENLEGALDATA_API_TOKEN 또는 FOREIGN_CASE_ENABLED=true → enableDE=true (독일 액션 활성)
 *
 * 본문은 원문 언어로 제공 (번역 없음). [원문: 영어] / [원문: 독일어] 마커 표기.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { searchUSCases, getUSCaseDetail } from "../../courtlistener-api.js";
import { searchDECases, getDECaseDetail } from "../../openlegaldata-api.js";
import {
  errorResponse,
  truncate,
  truncateWindow,
  MAX_CONTENT_LENGTH,
} from "../../shared.js";
import { createDispatcher, requireParam, type SkillResult } from "./_shared.js";

type ForeignCaseAction =
  | "search_us_cases"
  | "get_us_case_detail"
  | "search_de_cases"
  | "get_de_case_detail";

export interface ForeignCaseResearchOptions {
  courtlistenerApiToken?: string;
  openLegalDataApiToken?: string;
  enableUS?: boolean;
  enableDE?: boolean;
}

type ForeignCaseParams = {
  action: string;
  query?: string;
  page?: number;
  display?: number;
  opinion_id?: string;
  de_case_id?: string;
  court?: string;
  date_from?: string;
  date_to?: string;
  /** 본문 윈도우 시작 위치 (긴 판례 후속 페이지 조회용). 기본 0. */
  offset?: number;
};

/**
 * 긴 본문을 8000자 윈도우로 자르고 다음 호출 안내 문자열 추가.
 * windowStart 1-base 표기 (사용자 가독성).
 */
function buildBodyWindow(
  body: string,
  offset: number,
  action: string,
  idLabel: string,
  idValue: string,
): string {
  if (!body) return "(본문 없음)";
  const win = truncateWindow(body, {
    max: MAX_CONTENT_LENGTH,
    offset,
  });
  const startDisplay = win.windowStart + 1;
  const header = `--- 본문 (${startDisplay.toLocaleString()}~${win.windowEnd.toLocaleString()}자 / 총 ${win.totalLength.toLocaleString()}자) ---`;
  const lines = [header, win.text];
  if (win.hasMore) {
    lines.push(
      "",
      `--- 이어서 보기: ${action}에 ${idLabel}="${idValue}", offset=${win.windowEnd} 전달 ---`,
    );
  }
  return lines.join("\n");
}

const US_ACTIONS = new Set<string>([
  "search_us_cases",
  "get_us_case_detail",
]);
const DE_ACTIONS = new Set<string>([
  "search_de_cases",
  "get_de_case_detail",
]);

// ---------------------------------------------------------------------------
// US handlers
// ---------------------------------------------------------------------------

function handleSearchUSCases(token?: string) {
  return async (p: ForeignCaseParams): Promise<SkillResult> => {
    const err = requireParam(p as Record<string, unknown>, "query", "search_us_cases");
    if (err) return err;

    try {
      const result = await searchUSCases(
        {
          query: p.query!,
          page: p.page,
          pageSize: p.display,
          court: p.court,
          dateFiledAfter: p.date_from,
          dateFiledBefore: p.date_to,
        },
        token,
      );

      if (!result.results || result.results.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: `"${p.query}" 미국 판례 검색 결과가 없습니다.`,
            },
          ],
        };
      }

      const lines = result.results.map((c, i) => {
        const id = c.cluster_id;
        const citation = (c.citation && c.citation.length > 0)
          ? c.citation.join(", ")
          : "";
        const parts = [
          `${i + 1}. [${id}] ${c.caseName}`,
          citation ? `   인용: ${citation}` : "",
          `   법원: ${c.court}${c.court_id ? ` (${c.court_id})` : ""}`,
          c.dateFiled ? `   판결일: ${c.dateFiled}` : "",
          c.docketNumber ? `   사건번호: ${c.docketNumber}` : "",
        ].filter(Boolean);
        return parts.join("\n");
      });

      const opinionHint = result.results
        .map((c) => c.opinions?.[0]?.id)
        .find((x): x is number => typeof x === "number");

      const output = [
        `## 미국 판례 검색 결과 [원문: 영어]`,
        ``,
        `검색어: "${p.query}"`,
        `총 ${result.count.toLocaleString()}건${p.page ? ` (${p.page}페이지)` : " (1페이지)"}`,
        ``,
        ...lines,
        ``,
        `---`,
        `상세 조회: get_us_case_detail에 opinion_id를 전달하세요${opinionHint !== undefined ? ` (예: opinion_id="${opinionHint}")` : ""}.`,
      ].join("\n");

      return { content: [{ type: "text", text: truncate(output) }] };
    } catch (e) {
      return errorResponse("미국 판례 검색", e);
    }
  };
}

function handleGetUSCaseDetail(token?: string) {
  return async (p: ForeignCaseParams): Promise<SkillResult> => {
    const err = requireParam(
      p as Record<string, unknown>,
      "opinion_id",
      "get_us_case_detail",
    );
    if (err) return err;

    try {
      const d = await getUSCaseDetail(p.opinion_id!, token);
      const body =
        d.plain_text ||
        d.html_lawbox ||
        d.html_columbia ||
        d.html ||
        "";

      const offset = Math.max(0, p.offset ?? 0);
      const window = buildBodyWindow(
        body,
        offset,
        "get_us_case_detail",
        "opinion_id",
        p.opinion_id!,
      );

      const output = [
        `## 미국 판례 상세 [원문: 영어]`,
        ``,
        `Opinion ID: ${d.id}`,
        d.cluster_id !== undefined ? `Cluster ID: ${d.cluster_id}` : "",
        d.type ? `유형: ${d.type}` : "",
        d.date_created ? `등록일: ${d.date_created}` : "",
        d.download_url ? `PDF: ${d.download_url}` : "",
        ``,
        window,
      ]
        .filter(Boolean)
        .join("\n");

      return { content: [{ type: "text", text: output }] };
    } catch (e) {
      return errorResponse("미국 판례 상세 조회", e);
    }
  };
}

// ---------------------------------------------------------------------------
// DE handlers
// ---------------------------------------------------------------------------

function handleSearchDECases(token?: string) {
  return async (p: ForeignCaseParams): Promise<SkillResult> => {
    const err = requireParam(p as Record<string, unknown>, "query", "search_de_cases");
    if (err) return err;

    try {
      const result = await searchDECases(
        {
          query: p.query!,
          page: p.page,
          pageSize: p.display,
          court: p.court,
          dateFrom: p.date_from,
          dateTo: p.date_to,
        },
        token,
      );

      if (!result.results || result.results.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: `"${p.query}" 독일 판례 검색 결과가 없습니다.`,
            },
          ],
        };
      }

      const lines = result.results.map((c, i) => {
        const parts = [
          `${i + 1}. [${c.id}] ${c.court?.name ?? "(법원 미상)"}`,
          `   사건번호(Aktenzeichen): ${c.file_number}`,
          c.type ? `   유형: ${c.type}` : "",
          c.date ? `   판결일: ${c.date}` : "",
          c.ecli ? `   ECLI: ${c.ecli}` : "",
          c.court?.level_of_appeal
            ? `   심급: ${c.court.level_of_appeal}`
            : "",
        ].filter(Boolean);
        return parts.join("\n");
      });

      const idHint = result.results[0]?.id;

      const output = [
        `## 독일 판례 검색 결과 [원문: 독일어]`,
        ``,
        `검색어: "${p.query}"`,
        `총 ${result.count.toLocaleString()}건${p.page ? ` (${p.page}페이지)` : " (1페이지)"}`,
        ``,
        ...lines,
        ``,
        `---`,
        `상세 조회: get_de_case_detail에 de_case_id를 전달하세요${idHint !== undefined ? ` (예: de_case_id="${idHint}")` : ""}. 본문은 독일어 원문으로 제공됩니다.`,
      ].join("\n");

      return { content: [{ type: "text", text: truncate(output) }] };
    } catch (e) {
      return errorResponse("독일 판례 검색", e);
    }
  };
}

function handleGetDECaseDetail(token?: string) {
  return async (p: ForeignCaseParams): Promise<SkillResult> => {
    const err = requireParam(
      p as Record<string, unknown>,
      "de_case_id",
      "get_de_case_detail",
    );
    if (err) return err;

    try {
      const d = await getDECaseDetail(p.de_case_id!, token);
      const body = d.content || "";

      const offset = Math.max(0, p.offset ?? 0);
      const window = buildBodyWindow(
        body,
        offset,
        "get_de_case_detail",
        "de_case_id",
        p.de_case_id!,
      );

      const output = [
        `## 독일 판례 상세 [원문: 독일어]`,
        ``,
        `Case ID: ${d.id}`,
        `법원: ${d.court?.name ?? "(법원 미상)"}`,
        `사건번호(Aktenzeichen): ${d.file_number}`,
        d.type ? `유형: ${d.type}` : "",
        d.date ? `판결일: ${d.date}` : "",
        d.ecli ? `ECLI: ${d.ecli}` : "",
        d.source_url ? `원문 URL: ${d.source_url}` : "",
        ``,
        `${window} (독일어 원문, 번역 미제공)`,
      ]
        .filter(Boolean)
        .join("\n");

      return { content: [{ type: "text", text: output }] };
    } catch (e) {
      return errorResponse("독일 판례 상세 조회", e);
    }
  };
}

// ---------------------------------------------------------------------------
// Handler factory
// ---------------------------------------------------------------------------

export function createForeignCaseResearchHandler(
  options: ForeignCaseResearchOptions,
) {
  const enableUS = options.enableUS ?? false;
  const enableDE = options.enableDE ?? false;
  const clToken = options.courtlistenerApiToken;
  const oldToken = options.openLegalDataApiToken;

  // 활성 핸들러 등록
  const handlers: Record<string, (p: ForeignCaseParams) => Promise<SkillResult>> = {};
  if (enableUS) {
    handlers.search_us_cases = handleSearchUSCases(clToken);
    handlers.get_us_case_detail = handleGetUSCaseDetail(clToken);
  }
  if (enableDE) {
    handlers.search_de_cases = handleSearchDECases(oldToken);
    handlers.get_de_case_detail = handleGetDECaseDetail(oldToken);
  }

  const dispatch = createDispatcher<ForeignCaseParams>(
    "foreign_case_research",
    handlers,
  );

  return async (p: ForeignCaseParams): Promise<SkillResult> => {
    // 비활성 소스 액션 → 친절한 한글 안내
    if (US_ACTIONS.has(p.action) && !enableUS) {
      return {
        content: [
          {
            type: "text",
            text: `미국 판례 검색이 비활성화되어 있습니다. COURTLISTENER_API_TOKEN을 설정하세요.`,
          },
        ],
        isError: true,
      };
    }
    if (DE_ACTIONS.has(p.action) && !enableDE) {
      return {
        content: [
          {
            type: "text",
            text: `독일 판례 검색이 비활성화되어 있습니다. OPENLEGALDATA_API_TOKEN을 설정하거나 FOREIGN_CASE_ENABLED=true로 활성화하세요.`,
          },
        ],
        isError: true,
      };
    }
    return dispatch(p);
  };
}

// ---------------------------------------------------------------------------
// MCP server registration
// ---------------------------------------------------------------------------

export function registerForeignCaseResearch(
  server: McpServer,
  options: ForeignCaseResearchOptions,
): void {
  const handler = createForeignCaseResearchHandler(options);
  const enableUS = options.enableUS ?? false;
  const enableDE = options.enableDE ?? false;

  const availableActions: ForeignCaseAction[] = [];
  if (enableUS) {
    availableActions.push("search_us_cases", "get_us_case_detail");
  }
  if (enableDE) {
    availableActions.push("search_de_cases", "get_de_case_detail");
  }

  // 활성 액션이 없으면 등록을 건너뛰는 경우는 호출자(index.ts)가 처리하지만,
  // 안전을 위해 최소 하나의 액션이 보장되어야 zod enum이 비지 않는다.
  if (availableActions.length === 0) return;

  const description = [
    "해외 판례 리서치 — CourtListener (미국) + OpenLegalData (독일)",
    "본문은 원문 언어 그대로 제공됩니다 (영어/독일어 — 번역 미제공). 메타데이터 라벨은 한글.",
    "주요 미국 연방법원 슬러그: scotus, ca1-ca11, cadc, cafc, dcd",
  ].join("\n");

  server.tool(
    "foreign_case_research",
    description,
    {
      action: z.enum(availableActions as unknown as [string, ...string[]]).describe(
        "search_us_cases=미국 판례 검색(CourtListener) | get_us_case_detail=미국 판례 상세(opinion_id 필수) | search_de_cases=독일 판례 검색(OpenLegalData) [원문: 독일어] | get_de_case_detail=독일 판례 상세(de_case_id 필수) [원문: 독일어]",
      ),
      query: z.string().optional().describe("검색어"),
      page: z.number().optional().describe("페이지 번호"),
      display: z.number().optional().describe("페이지당 결과 수"),
      opinion_id: z
        .string()
        .optional()
        .describe("CourtListener opinion ID (get_us_case_detail에서 사용)"),
      de_case_id: z
        .string()
        .optional()
        .describe("OpenLegalData case ID (get_de_case_detail에서 사용)"),
      court: z
        .string()
        .optional()
        .describe(
          "법원 슬러그 (미국 예: 'scotus','ca1' / 독일 예: 'bgh'). search_*에서 사용",
        ),
      date_from: z
        .string()
        .optional()
        .describe("검색 시작일 YYYY-MM-DD"),
      date_to: z
        .string()
        .optional()
        .describe("검색 종료일 YYYY-MM-DD"),
      offset: z
        .number()
        .optional()
        .describe(
          "본문 윈도우 시작 위치 (긴 판례 후속 페이지 조회용, 기본 0). get_us_case_detail / get_de_case_detail에서 사용",
        ),
    },
    async (params) => handler(params as ForeignCaseParams),
  );
}
