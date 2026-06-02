/**
 * Skill: gov24_ai — 정부24 plus AI 검색(beta) 민원 질의응답
 *
 * 비공식 reverse-engineered RAG 챗봇. 자연어 민원 질문 → AI 답변 + 공식 gov.kr 출처.
 * GOV24_AI_ENABLED=true 일 때만 등록 (config 게이트). public_data(dataset 검색)와 구별.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { askGov24Ai } from "../../gov24-ai-api.js";
import type { Gov24AiResult } from "../../gov24-ai-types.js";
import { errorResponse, truncate } from "../../shared.js";
import {
  createDispatcher,
  requireParam,
  registerSkillTool,
  type SkillResult,
} from "./_shared.js";

const DISCLAIMER =
  "※ 본 답변은 정부24 AI(beta)가 생성한 참고용 정보입니다. 법적 효력이 없으며, 정확한 내용은 위 공식 gov.kr 링크/소관기관으로 확인하세요.";

type Gov24Params = {
  action: string;
  question?: string;
  location?: string;
  mode?: string;
};

/** 구조화 결과 → Korean MCP 텍스트 (면책 항상 포함) */
function renderResult(result: Gov24AiResult): string {
  const parts: string[] = [];

  // 답변이 비어 있으면 fail-loud: 정상 빈 답변이 아니라 SSE 스키마 변경(드리프트)
  // 가능성을 명시한다. (beta 엔드포인트가 응답마다 answer 스키마를 바꾸므로)
  const answer = result.answer.trim();
  if (answer) {
    parts.push(answer);
  } else {
    parts.push(
      "⚠️ 답변 본문을 추출하지 못했습니다. 정부24 AI(beta) 응답 형식이 변경되었을 수 있습니다. 아래 공식 gov.kr 링크를 직접 확인하세요.",
    );
  }

  if (result.anstyp && result.anstyp !== "OK") {
    parts.push(`⚠️ 답변 유형: ${result.anstyp} (정상 답변이 아닐 수 있습니다)`);
  }

  if (result.confidence !== null) {
    const level = result.confidenceLevel ? ` (${result.confidenceLevel})` : "";
    parts.push(`신뢰도: ${result.confidence}${level}`);
  }

  if (result.references.length > 0) {
    const refLines = result.references.map((ref, i) => {
      const fields = [
        ref.serviceName && `사무명: ${ref.serviceName}`,
        ref.managingOrgName && `소관기관: ${ref.managingOrgName}`,
        ref.legalBasis && `법적근거: ${ref.legalBasis}`,
        ref.feeDetail && `수수료: ${ref.feeDetail}`,
        ref.applicationChannel && `신청방법: ${ref.applicationChannel}`,
        ref.inquiryContact && `문의처: ${ref.inquiryContact}`,
      ].filter(Boolean);
      return `${i + 1}. ${ref.title}\n   ${fields.join("\n   ")}`;
    });
    parts.push(`[출처]\n${refLines.join("\n")}`);
  }

  if (result.links.length > 0) {
    const linkLines = result.links.map(
      (l) => `- ${l.title}${l.managingOrgName ? ` (${l.managingOrgName})` : ""}\n  ${l.url}`,
    );
    parts.push(`[공식 안내(gov.kr)]\n${linkLines.join("\n")}`);
  }

  parts.push(DISCLAIMER);

  if (typeof result.remainingQuestions === "number") {
    parts.push(`남은 질문 횟수: ${result.remainingQuestions}`);
  }

  return parts.join("\n\n");
}

function handleAsk() {
  return async (p: Gov24Params): Promise<SkillResult> => {
    const err = requireParam(p as Record<string, unknown>, "question", "ask");
    if (err) return err;

    try {
      const result = await askGov24Ai(p.question!, p.location, { mode: p.mode });
      return { content: [{ type: "text", text: truncate(renderResult(result)) }] };
    } catch (error) {
      return errorResponse("정부24 AI 검색", error);
    }
  };
}

const ACTIONS = ["ask"] as const;

export function registerGov24Ai(server: McpServer): void {
  const handler = createDispatcher<Gov24Params>("gov24_ai", {
    ask: handleAsk(),
  });

  registerSkillTool(server, {
    name: "gov24_ai",
    title: "Gov24 AI Civil-Service Q&A / 정부24 AI 민원 질의응답",
    description:
      "Ask the Korean government's plus.gov.kr AI a natural-language question about civil-service (민원) procedures and get an AI-generated answer with official gov.kr source links. This is a RAG chatbot over civil-service guidance docs, NOT a structured dataset search (use public_data for datasets). Warning: Do not include personal identifying information (resident registration number, address, phone) in your question — queries are sent to an external server (plus.gov.kr). / 정부24 plus AI에 민원 절차를 자연어로 질문하면 공식 gov.kr 출처와 함께 AI 답변을 받습니다. 민원 안내 문서 기반 RAG 챗봇이며 dataset 검색이 아닙니다(데이터셋은 public_data 사용). 주의: 주민등록번호·주소·전화번호 등 개인정보를 질문에 포함하지 마세요. 질문 내용이 외부 서버(plus.gov.kr)로 전송됩니다.",
    inputSchema: {
      action: z.enum(ACTIONS).describe("ask=민원 질문에 AI 답변 (question 필수)"),
      question: z.string().optional().describe("민원 질문 (필수). 개인정보 포함 금지."),
      location: z.string().optional().describe("지역 '시도 시군구' (예: 경기도 하남시). 선택."),
      mode: z.string().optional().describe("검색 모드 (기본: normal)"),
    },
    callback: async (params) => handler(params as Gov24Params),
  });
}
