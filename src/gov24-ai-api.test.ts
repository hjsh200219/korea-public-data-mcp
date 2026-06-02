import { describe, it, expect, vi, beforeEach } from "vitest";

const { fetchWithRetry } = vi.hoisted(() => ({
  fetchWithRetry: vi.fn(),
}));

vi.mock("./http-client.js", () => ({
  fetchWithRetry,
}));

import { parseSseText, askGov24Ai } from "./gov24-ai-api.js";

// ---------------------------------------------------------------------------
// 정적 SSE fixture — 캡처한 실제 응답 구조 (주민등록등본/초본 차이)
// ---------------------------------------------------------------------------
const FIXTURE = [
  `event:meta\ndata:{"cnvrsDtlSn":"24775752","cnvrsId":"abc"}`,
  `data:{"step":"RECEIVE"}`,
  `data:{"event_status":"CHUNK","content":"주민등록"}`,
  `data:{"event_status":"CHUNK","content":"등본은 "}`,
  `data:{"event_status":"CHUNK","content":"세대 전체"}`,
  `data:{"event_status":"CHUNK","content":" 정보입니다."}`,
  `data:{"anstyp":"OK"}`,
  `data:{"trace_id":"trace-123","query":"주민등록등본과 초본의 차이","stream_chunks":168}`,
  `event:meta\ndata:{"content_references":[{"references":[{"title":"20260307_1310000-0015","filename":"f.json","docId":"doc1","rank":1,"searchScore":0.03,"rerankScore":1.0,"sourceInfo":{"additionalInfo":{"service_name":"주민등록표 등본(초본) 발급","managing_org_name":"행정안전부","legal_basis":"1. 주민등록법(제29조)","fee_detail":"1통(400원)","application_channel":"방문, 인터넷, 무인발급기","inquiry_contact":"044-205-3144","notice":"https://www.gov.kr/notice1"}}}]}],"confidence":100,"confidence_level":"높음","summary":"Q: 주민등록등본과 초본의 차이\\nA: 등본은 세대 전체, 초본은 개인 정보."}`,
  `data:{"confidence":100,"confidence_level":"높음"}`,
  `data:{"links":[{"url":"https://www.gov.kr/notice1","title":"주민등록표 등본(초본) 발급","service_id":"1310000-0015","managing_org_name":"행정안전부","no":0}]}`,
  `event:usage\ndata:{"remainingQuestions":49}`,
  `data:{"status":{"type":"status","message":"처리 완료","code":"OK","ok":true}}`,
  `event:timing\ndata:{"message":"[DONE]","elapsedTime":1666}`,
  `data:[DONE]`,
].join("\n\n");

// ---------------------------------------------------------------------------
// Format B fixture — 엔드포인트가 요청마다 번갈아 쓰는 두 번째 스키마.
// 답변이 {"stream":"..."} 조각으로 오고, trace_id는 metadata에 중첩됨.
// (라이브 검증: 동일 쿼리가 요청마다 Format A/B 사이를 오감)
// ---------------------------------------------------------------------------
const FIXTURE_B = [
  `data:{"step":"GENERATE"}`,
  `data:{"stream": "\\n## 주민등록"}`,
  `data:{"stream": "등본과 "}`,
  `data:{"stream": "초본의 차이"}`,
  `data:{"metadata": {"query_type":"ADMIN","trace_id":"meta-trace-9","query":"주민등록등본과 초본의 차이"}}`,
  `data:{"links":[{"url":"https://www.gov.kr/b1","title":"주민등록표 등본 발급","managing_org_name":"행정안전부"}]}`,
  `event:usage\ndata:{"remainingQuestions":48}`,
  `data:{"status":{"type":"status","code":"OK","ok":true}}`,
  `event:timing\ndata:{"message":"[DONE]","elapsedTime":5463}`,
  `data:[DONE]`,
].join("\n\n");

/** ReadableStream을 UTF-8 바이트 청크들로 구성 */
function streamFromChunks(chunks: Uint8Array[]) {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const c of chunks) controller.enqueue(c);
      controller.close();
    },
  });
}

function mockStreamResponse(stream: ReadableStream<Uint8Array>, ok = true, status = 200) {
  return { ok, status, body: stream } as unknown as Response;
}

describe("gov24-ai-api parseSseText", () => {
  it("answer_CHUNK_이어붙임", () => {
    const r = parseSseText(FIXTURE);
    expect(r.answer).toBe("주민등록등본은 세대 전체 정보입니다.");
  });

  it("confidence_summary_traceId_remainingQuestions_파싱", () => {
    const r = parseSseText(FIXTURE);
    expect(r.confidence).toBe(100);
    expect(r.confidenceLevel).toBe("높음");
    expect(r.summary).toContain("등본은 세대 전체");
    expect(r.traceId).toBe("trace-123");
    expect(r.remainingQuestions).toBe(49);
    expect(r.anstyp).toBe("OK");
  });

  it("references_trim_상위필드_추출", () => {
    const r = parseSseText(FIXTURE);
    expect(r.references).toHaveLength(1);
    const ref = r.references[0];
    expect(ref.title).toBe("20260307_1310000-0015");
    expect(ref.serviceName).toBe("주민등록표 등본(초본) 발급");
    expect(ref.managingOrgName).toBe("행정안전부");
    expect(ref.legalBasis).toContain("주민등록법");
    expect(ref.feeDetail).toBe("1통(400원)");
    expect(ref.applicationChannel).toBe("방문, 인터넷, 무인발급기");
    expect(ref.inquiryContact).toBe("044-205-3144");
    expect(ref.noticeUrl).toBe("https://www.gov.kr/notice1");
    expect(ref.rank).toBe(1);
  });

  it("links_공식gov.kr_파싱", () => {
    const r = parseSseText(FIXTURE);
    expect(r.links).toHaveLength(1);
    expect(r.links[0].url).toBe("https://www.gov.kr/notice1");
    expect(r.links[0].title).toBe("주민등록표 등본(초본) 발급");
    expect(r.links[0].serviceId).toBe("1310000-0015");
    expect(r.links[0].managingOrgName).toBe("행정안전부");
  });

  it("references_상위3개로_trim", () => {
    const refs = Array.from({ length: 5 }, (_, i) => ({
      title: `ref-${i}`,
      sourceInfo: { additionalInfo: { service_name: `svc-${i}` } },
    }));
    const raw = `data:${JSON.stringify({ content_references: [{ references: refs }] })}`;
    const r = parseSseText(raw);
    expect(r.references).toHaveLength(3);
    expect(r.references[2].title).toBe("ref-2");
  });

  it("긴_필드_300자_cap", () => {
    const long = "가".repeat(500);
    const raw = `data:${JSON.stringify({
      content_references: [{ references: [{ title: "t", sourceInfo: { additionalInfo: { legal_basis: long } } }] }],
    })}`;
    const r = parseSseText(raw);
    expect(r.references[0].legalBasis).toHaveLength(300);
  });

  it("anstyp_non_OK_플래그_답변유지", () => {
    const raw = [
      `data:{"event_status":"CHUNK","content":"답변불가"}`,
      `data:{"anstyp":"GUARDRAIL"}`,
    ].join("\n\n");
    const r = parseSseText(raw);
    expect(r.anstyp).toBe("GUARDRAIL");
    expect(r.answer).toBe("답변불가");
  });

  it("빈_references_빈배열_no_throw", () => {
    const raw = `data:{"event_status":"CHUNK","content":"hi"}\n\ndata:[DONE]`;
    const r = parseSseText(raw);
    expect(r.references).toEqual([]);
    expect(r.links).toEqual([]);
    expect(r.answer).toBe("hi");
  });

  it("Format_B_stream_조각_답변_복원", () => {
    const r = parseSseText(FIXTURE_B);
    expect(r.answer).toBe("\n## 주민등록등본과 초본의 차이");
    expect(r.traceId).toBe("meta-trace-9");
    expect(r.remainingQuestions).toBe(48);
    expect(r.links).toHaveLength(1);
    expect(r.links[0].url).toBe("https://www.gov.kr/b1");
  });

  it("DONE_빈블록_잘못된JSON_무시", () => {
    const raw = [
      `data:[DONE]`,
      ``,
      `data:not-json{`,
      `event:meta`,
      `data:{"event_status":"CHUNK","content":"ok"}`,
    ].join("\n\n");
    const r = parseSseText(raw);
    expect(r.answer).toBe("ok");
  });
});

describe("gov24-ai-api askGov24Ai", () => {
  beforeEach(() => {
    fetchWithRetry.mockReset();
  });

  it("성공_스트림_파싱_결과반환", async () => {
    const bytes = new TextEncoder().encode(FIXTURE);
    fetchWithRetry.mockResolvedValue(mockStreamResponse(streamFromChunks([bytes])));

    const r = await askGov24Ai("주민등록등본과 초본의 차이", "경기도 하남시");
    expect(r.answer).toBe("주민등록등본은 세대 전체 정보입니다.");
    expect(r.confidence).toBe(100);
    expect(r.links).toHaveLength(1);
    expect(fetchWithRetry).toHaveBeenCalledTimes(1);
  });

  it("Format_B_스트림_end_to_end_답변복원", async () => {
    const bytes = new TextEncoder().encode(FIXTURE_B);
    fetchWithRetry.mockResolvedValue(mockStreamResponse(streamFromChunks([bytes])));
    const r = await askGov24Ai("주민등록등본과 초본의 차이");
    expect(r.answer).toContain("주민등록등본과 초본의 차이");
    expect(r.answer.length).toBeGreaterThan(0);
    expect(r.traceId).toBe("meta-trace-9");
  });

  it("body_cnvrsId_question_location_mode_구성", async () => {
    const bytes = new TextEncoder().encode(`data:[DONE]`);
    fetchWithRetry.mockResolvedValue(mockStreamResponse(streamFromChunks([bytes])));

    await askGov24Ai("여권 발급", "서울특별시");
    const callArgs = fetchWithRetry.mock.calls[0];
    const init = callArgs[1].init;
    const sent = JSON.parse(init.body);
    expect(sent.cnvrsQstnCn).toBe("여권 발급");
    expect(sent.location).toBe("서울특별시");
    expect(sent.mode).toBe("normal");
    expect(typeof sent.cnvrsId).toBe("string");
    expect(init.method).toBe("POST");
    expect(callArgs[1].maxRetries).toBe(0);
    expect(callArgs[1].timeoutMs).toBe(30000);
  });

  it("location_생략시_빈문자열", async () => {
    const bytes = new TextEncoder().encode(`data:[DONE]`);
    fetchWithRetry.mockResolvedValue(mockStreamResponse(streamFromChunks([bytes])));
    await askGov24Ai("질문만");
    const sent = JSON.parse(fetchWithRetry.mock.calls[0][1].init.body);
    expect(sent.location).toBe("");
  });

  // REQUIRED: 멀티바이트 split — 3바이트 한글 "민"(EB AF BC)을 EB AF / BC 로 분할
  it("멀티바이트_경계_split_마지막글자_무손실", async () => {
    const full = `data:{"event_status":"CHUNK","content":"주민"}\n\ndata:[DONE]`;
    const bytes = new TextEncoder().encode(full);
    // "민" = EB AF BC. 문자열에서 "민"의 시작 바이트 위치를 찾아 그 중간에서 split.
    const minIdx = bytes.indexOf(0xeb, bytes.indexOf(0xeb) + 1); // 2번째 한글(민)의 EB
    const splitAt = minIdx + 2; // EB AF 다음, BC 앞
    const part1 = bytes.slice(0, splitAt);
    const part2 = bytes.slice(splitAt);
    fetchWithRetry.mockResolvedValue(mockStreamResponse(streamFromChunks([part1, part2])));

    const r = await askGov24Ai("q");
    expect(r.answer).toBe("주민"); // 마지막 "민"이 깨지지 않음
  });

  // REQUIRED: mid-stream-abort — 부분 이벤트 후 능동 reject (passive stall 아님)
  it("mid_stream_abort_한글_에러_surface", async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(`data:{"event_status":"CHUNK","content":"부분`));
        controller.error(new DOMException("The operation timed out.", "AbortError"));
      },
    });
    fetchWithRetry.mockResolvedValue(mockStreamResponse(stream));

    await expect(askGov24Ai("q")).rejects.toThrow(/정부24 AI 검색 스트림 오류/);
  });

  it("non_200_한글_에러_throw", async () => {
    fetchWithRetry.mockResolvedValue({ ok: false, status: 503, body: null } as unknown as Response);
    await expect(askGov24Ai("q")).rejects.toThrow(/정부24 AI 검색 API 오류: HTTP 503/);
  });

  it("body_없음_한글_에러_throw", async () => {
    fetchWithRetry.mockResolvedValue({ ok: true, status: 200, body: null } as unknown as Response);
    await expect(askGov24Ai("q")).rejects.toThrow(/응답 본문이 비어/);
  });
});
