import { describe, it, expect, vi, beforeEach } from "vitest";

const { askGov24Ai } = vi.hoisted(() => ({
  askGov24Ai: vi.fn(),
}));

vi.mock("../../gov24-ai-api.js", () => ({
  askGov24Ai,
}));

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerGov24Ai } from "./gov24-ai.js";
import type { Gov24AiResult } from "../../gov24-ai-types.js";

const DISCLAIMER = "법적 효력이 없으며";

/** 등록된 콜백을 캡처해 직접 호출 */
function captureCallback(): (params: unknown) => Promise<{
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
}> {
  let cb: ((p: unknown) => Promise<unknown>) | undefined;
  const fakeServer = {
    registerTool: (_name: string, _cfg: unknown, callback: (p: unknown) => Promise<unknown>) => {
      cb = callback;
    },
  } as unknown as McpServer;
  registerGov24Ai(fakeServer);
  if (!cb) throw new Error("callback not registered");
  return cb as never;
}

function fullResult(overrides: Partial<Gov24AiResult> = {}): Gov24AiResult {
  return {
    answer: "주민등록등본은 세대 전체 정보입니다.",
    confidence: 100,
    confidenceLevel: "높음",
    summary: "Q\nA",
    anstyp: "OK",
    references: [
      {
        title: "주민등록표 등본 발급",
        serviceName: "주민등록표 등본(초본) 발급",
        managingOrgName: "행정안전부",
        legalBasis: "주민등록법 제29조",
        feeDetail: "1통(400원)",
        applicationChannel: "방문, 인터넷",
        inquiryContact: "044-205-3144",
      },
    ],
    links: [
      { url: "https://www.gov.kr/notice1", title: "주민등록표 등본 발급", managingOrgName: "행정안전부" },
    ],
    traceId: "t1",
    remainingQuestions: 49,
    ...overrides,
  };
}

describe("gov24_ai skill", () => {
  beforeEach(() => {
    askGov24Ai.mockReset();
  });

  it("ask_답변_신뢰도_링크_면책_렌더", async () => {
    askGov24Ai.mockResolvedValue(fullResult());
    const cb = captureCallback();
    const res = await cb({ action: "ask", question: "주민등록등본과 초본의 차이" });
    const text = res.content[0].text;
    expect(text).toContain("세대 전체");
    expect(text).toContain("신뢰도: 100 (높음)");
    expect(text).toContain("gov.kr/notice1");
    expect(text).toContain("사무명: 주민등록표 등본(초본) 발급");
    expect(text).toContain("문의처: 044-205-3144");
    expect(text).toContain(DISCLAIMER);
    expect(text).toContain("남은 질문 횟수: 49");
    expect(res.isError).toBeFalsy();
  });

  it("question_누락_isError", async () => {
    const cb = captureCallback();
    const res = await cb({ action: "ask" });
    expect(res.isError).toBe(true);
    expect(res.content[0].text).toContain("question");
    expect(askGov24Ai).not.toHaveBeenCalled();
  });

  it("unknown_action_isError", async () => {
    const cb = captureCallback();
    const res = await cb({ action: "bogus", question: "q" });
    expect(res.isError).toBe(true);
    expect(res.content[0].text).toContain("알 수 없는 action");
  });

  // REQUIRED: refused-answer(anstyp != OK)도 면책 포함
  it("refused_answer_anstyp_non_OK_면책_포함", async () => {
    askGov24Ai.mockResolvedValue(
      fullResult({ anstyp: "GUARDRAIL", confidence: 0, confidenceLevel: "낮음" }),
    );
    const cb = captureCallback();
    const res = await cb({ action: "ask", question: "민감한질문" });
    const text = res.content[0].text;
    expect(text).toContain("답변 유형: GUARDRAIL");
    expect(text).toContain(DISCLAIMER);
  });

  it("empty_references_no_links_답변_면책만", async () => {
    askGov24Ai.mockResolvedValue(
      fullResult({ references: [], links: [], remainingQuestions: undefined }),
    );
    const cb = captureCallback();
    const res = await cb({ action: "ask", question: "q" });
    const text = res.content[0].text;
    expect(text).toContain("세대 전체");
    expect(text).toContain(DISCLAIMER);
    expect(text).not.toContain("[출처]");
    expect(text).not.toContain("[공식 안내");
    expect(text).not.toContain("남은 질문 횟수");
  });

  it("빈_답변_스키마드리프트_경고_면책_포함", async () => {
    askGov24Ai.mockResolvedValue(fullResult({ answer: "" }));
    const cb = captureCallback();
    const res = await cb({ action: "ask", question: "q" });
    const text = res.content[0].text;
    expect(text).toContain("답변 본문을 추출하지 못했습니다");
    expect(text).toContain("응답 형식이 변경");
    expect(text).toContain(DISCLAIMER);
    expect(text).not.toContain("(답변 없음)");
  });

  it("confidence_null_신뢰도라인_생략", async () => {
    askGov24Ai.mockResolvedValue(fullResult({ confidence: null, confidenceLevel: null }));
    const cb = captureCallback();
    const res = await cb({ action: "ask", question: "q" });
    expect(res.content[0].text).not.toContain("신뢰도:");
    expect(res.content[0].text).toContain(DISCLAIMER);
  });

  it("api_에러_errorResponse", async () => {
    askGov24Ai.mockRejectedValue(new Error("정부24 AI 검색 API 오류: HTTP 503"));
    const cb = captureCallback();
    const res = await cb({ action: "ask", question: "q" });
    expect(res.isError).toBe(true);
    expect(res.content[0].text).toContain("정부24 AI 검색 오류");
  });

  it("location_mode_api로_전달", async () => {
    askGov24Ai.mockResolvedValue(fullResult());
    const cb = captureCallback();
    await cb({ action: "ask", question: "여권", location: "서울특별시", mode: "normal" });
    expect(askGov24Ai).toHaveBeenCalledWith("여권", "서울특별시", { mode: "normal" });
  });
});
