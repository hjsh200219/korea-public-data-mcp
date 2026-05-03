/**
 * Skill: foreign_case_research — 해외 판례 리서치 (미국 + 독일)
 *
 * - search_us_cases / get_us_case_detail (CourtListener, cursor 페이지네이션, 정규화 도메인 타입)
 * - search_de_cases / get_de_case_detail (OpenLegalData, page 페이지네이션, raw 타입)
 *
 * 환경변수 게이팅:
 * - COURTLISTENER_API_TOKEN → enableUS=true (미국 액션 활성)
 * - OPENLEGALDATA_API_TOKEN 또는 FOREIGN_CASE_ENABLED=true → enableDE=true (독일 액션 활성)
 *
 * 본문은 원문 언어로 제공 (번역 없음). [원문: 영어] / [원문: 독일어] 마커 표기.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createCourtListenerClient } from "../../courtlistener-api.js";
import type {
  CourtListenerClient,
  Jurisdiction,
  PrecedentialStatus,
} from "../../courtlistener-types.js";
import {
  JURISDICTION_VALUES,
  PRECEDENTIAL_STATUS_VALUES,
} from "../../courtlistener-types.js";
import { searchDECases, getDECaseDetail } from "../../openlegaldata-api.js";
import {
  errorResponse,
  truncate,
  truncateWindow,
  MAX_CONTENT_LENGTH,
} from "../../shared.js";
import { createDispatcher, requireParam, registerSkillTool, type SkillResult } from "./_shared.js";

type ForeignCaseAction =
  | "search_us_cases"
  | "get_us_case_detail"
  | "search_de_cases"
  | "get_de_case_detail";

interface ForeignCaseResearchOptions {
  courtlistenerApiToken?: string;
  openLegalDataApiToken?: string;
  enableUS?: boolean;
  enableDE?: boolean;
}

type ForeignCaseParams = {
  action: string;
  query?: string;
  /** US: cursor 페이지네이션 토큰 (CourtListener v4 native) */
  cursor?: string;
  /** DE: 페이지 번호 (1-base). US는 cursor 사용 (page는 무시). */
  page?: number;
  /** 페이지당 결과 수 */
  display?: number;
  /** US: opinion ID (문자열로 받아 숫자 파싱). */
  opinion_id?: string;
  /** DE: case ID (OpenLegalData) */
  de_case_id?: string;
  /** 법원 슬러그 (US: scotus, ca9 등 / DE: bgh 등) */
  court?: string;
  date_from?: string;
  date_to?: string;
  /** US: 관할 필터 */
  jurisdiction?: Jurisdiction;
  /** US: 선판례 상태 필터 */
  precedential_status?: PrecedentialStatus;
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
// US handlers — 정규화 도메인 타입 + cursor 페이지네이션
// ---------------------------------------------------------------------------

function handleSearchUSCases(client: CourtListenerClient) {
  return async (p: ForeignCaseParams): Promise<SkillResult> => {
    const err = requireParam(p as Record<string, unknown>, "query", "search_us_cases");
    if (err) return err;

    try {
      const result = await client.searchOpinions({
        query: p.query!,
        cursor: p.cursor,
        pageSize: p.display,
        jurisdiction: p.jurisdiction,
        court: p.court,
        dateFrom: p.date_from,
        dateTo: p.date_to,
        precedentialStatus: p.precedential_status,
      });

      if (result.items.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: `"${p.query}" 미국 판례 검색 결과가 없습니다.`,
            },
          ],
        };
      }

      const lines = result.items.map((c, i) => {
        const parts = [
          `${i + 1}. [${c.id}] ${c.caseName}`,
          c.citation ? `   인용: ${c.citation}` : "",
          `   법원: ${c.court}${c.courtSlug ? ` (${c.courtSlug})` : ""}`,
          c.decisionDate ? `   판결일: ${c.decisionDate}` : "",
          c.precedentialStatus ? `   상태: ${c.precedentialStatus}` : "",
          c.snippet ? `   요약: ${truncate(c.snippet, 300)}` : "",
        ].filter(Boolean);
        return parts.join("\n");
      });

      const totalLine =
        typeof result.totalCount === "number"
          ? `총 ${result.totalCount.toLocaleString()}건`
          : `${result.items.length}건`;

      const opinionHint = result.items[0]?.id;
      const tail: string[] = [
        `상세 조회: get_us_case_detail에 opinion_id를 전달하세요${opinionHint !== undefined ? ` (예: opinion_id="${opinionHint}")` : ""}.`,
      ];
      if (result.nextCursor) {
        tail.push(`다음 페이지: cursor="${result.nextCursor}"`);
      }

      const output = [
        `## 미국 판례 검색 결과 [원문: 영어]`,
        ``,
        `검색어: "${p.query}"`,
        totalLine,
        ``,
        ...lines,
        ``,
        `---`,
        ...tail,
      ].join("\n");

      return { content: [{ type: "text", text: truncate(output) }] };
    } catch (e) {
      return errorResponse("미국 판례 검색", e);
    }
  };
}

function handleGetUSCaseDetail(client: CourtListenerClient) {
  return async (p: ForeignCaseParams): Promise<SkillResult> => {
    const err = requireParam(
      p as Record<string, unknown>,
      "opinion_id",
      "get_us_case_detail",
    );
    if (err) return err;

    const opinionId = Number(p.opinion_id);
    if (!Number.isFinite(opinionId) || opinionId <= 0) {
      return {
        content: [
          {
            type: "text",
            text: `opinion_id는 양의 정수여야 합니다 (받은 값: "${p.opinion_id}").`,
          },
        ],
        isError: true,
      };
    }

    try {
      // includeCluster=true 로 케이스명/법원/날짜 등 메타까지 풍부하게 반환.
      const d = await client.getOpinion(opinionId, { includeCluster: true });
      const body = d.plainText;

      const offset = Math.max(0, p.offset ?? 0);
      const window = buildBodyWindow(
        body,
        offset,
        "get_us_case_detail",
        "opinion_id",
        p.opinion_id!,
      );

      const meta = [
        `Opinion ID: ${d.id}`,
        d.clusterId ? `Cluster ID: ${d.clusterId}` : "",
        d.caseName ? `케이스명: ${d.caseName}` : "",
        d.citation ? `인용: ${d.citation}` : "",
        d.decisionDate ? `판결일: ${d.decisionDate}` : "",
        d.court ? `법원: ${d.court}${d.courtSlug ? ` (${d.courtSlug})` : ""}` : "",
        d.precedentialStatus ? `상태: ${d.precedentialStatus}` : "",
        d.judges ? `재판관: ${d.judges}` : "",
        d.absoluteUrl ? `URL: ${d.absoluteUrl}` : "",
      ].filter(Boolean);

      const output = [
        `## 미국 판례 상세 [원문: 영어]`,
        ``,
        ...meta,
        ``,
        window,
      ].join("\n");

      return { content: [{ type: "text", text: output }] };
    } catch (e) {
      return errorResponse("미국 판례 상세 조회", e);
    }
  };
}

// ---------------------------------------------------------------------------
// DE handlers — OpenLegalData (raw 타입, page 페이지네이션) — 변경 없음
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
  const oldToken = options.openLegalDataApiToken;

  // CourtListener 클라이언트는 enableUS 일 때만 생성. 토큰은 옵션 (익명 모드 가능하지만 게이팅 정책상 토큰 필수).
  const usClient = enableUS
    ? createCourtListenerClient({ token: options.courtlistenerApiToken })
    : null;

  const handlers: Record<string, (p: ForeignCaseParams) => Promise<SkillResult>> = {};
  if (usClient) {
    handlers.search_us_cases = handleSearchUSCases(usClient);
    handlers.get_us_case_detail = handleGetUSCaseDetail(usClient);
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
    "Foreign Case Research — CourtListener (US, cursor pagination) + OpenLegalData (Germany, page pagination).",
    "Full text is provided in the original language (English/German — no translation). Metadata labels in Korean.",
    "Key US federal court slugs: scotus, ca1–ca11, cadc, cafc, dcd",
    "/ 해외 판례 리서치 — CourtListener (미국) + OpenLegalData (독일). 본문은 원문 언어 그대로 제공됩니다.",
  ].join("\n");

  registerSkillTool(server, {
    name: "foreign_case_research",
    title: "Foreign Case Research / 해외 판례 조사",
    description,
    inputSchema: {
      action: z.enum(availableActions as unknown as [string, ...string[]]).describe(
        "search_us_cases=미국 판례 검색(CourtListener, cursor) | get_us_case_detail=미국 판례 상세(opinion_id 필수) | search_de_cases=독일 판례 검색(OpenLegalData, page) [원문: 독일어] | get_de_case_detail=독일 판례 상세(de_case_id 필수) [원문: 독일어]",
      ),
      query: z.string().optional().describe("검색어"),
      cursor: z
        .string()
        .optional()
        .describe("US 전용 — CourtListener v4 cursor 토큰 (search_us_cases 후속 페이지)"),
      page: z.number().optional().describe("DE 페이지 번호 (search_de_cases). US는 cursor 사용"),
      display: z.number().optional().describe("페이지당 결과 수 (US 최대 100)"),
      opinion_id: z
        .string()
        .optional()
        .describe("CourtListener opinion ID (get_us_case_detail에서 사용; 정수 문자열)"),
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
      jurisdiction: z
        .enum(JURISDICTION_VALUES)
        .optional()
        .describe("US 전용 관할 필터 (us-federal | us-state | us-scotus)"),
      precedential_status: z
        .enum(PRECEDENTIAL_STATUS_VALUES)
        .optional()
        .describe("US 전용 선판례 상태 필터"),
      offset: z
        .number()
        .optional()
        .describe(
          "본문 윈도우 시작 위치 (긴 판례 후속 페이지 조회용, 기본 0). get_us_case_detail / get_de_case_detail에서 사용",
        ),
    },
    callback: async (params) => handler(params as ForeignCaseParams),
  });
}
