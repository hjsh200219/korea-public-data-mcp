/**
 * 정부24 plus AI 검색(beta) — 데이터 액세스 클라이언트
 *
 * 비공식 reverse-engineered 엔드포인트: `POST /ai/search_beta/api/fabrix/chat`.
 * - 익명 호출 (쿠키 0개 cold POST → 200; 서버가 세션 쿠키 자체 발급). API key·로그인 불필요.
 * - 응답: text/event-stream (SSE). CHUNK content 이어붙여 답변, 2번째 event:meta에
 *   content_references(RAG 출처) + confidence + summary, links 이벤트에 공식 gov.kr URL.
 *
 * buffer-all 설계: 읽기 루프는 디코드+버퍼 append만, 루프 후 parseSseText(buffer) 1회.
 * parseSseText는 프로덕션 경로(askGov24Ai가 호출) + 테스트 seam.
 */

import crypto from "node:crypto";
import { fetchWithRetry } from "./http-client.js";
import type {
  Gov24AiResult,
  Gov24AiReference,
  Gov24AiLink,
} from "./gov24-ai-types.js";

const URL = "https://plus.gov.kr/ai/search_beta/api/fabrix/chat";
const TIMEOUT_MS = 30_000;
const MAX_REFERENCES = 3;
const FIELD_CAP = 300;

/** 브라우저 위장 헤더 — cold 요청이 200을 받기 위해 필요 */
function browserHeaders(cnvrsId: string): Record<string, string> {
  return {
    "content-type": "application/json",
    accept: "*/*",
    origin: "https://plus.gov.kr",
    referer: `https://plus.gov.kr/ai/search_beta/chat/${cnvrsId}`,
    "user-agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36",
  };
}

function cap(s: unknown, max = FIELD_CAP): string | undefined {
  if (typeof s !== "string" || s.length === 0) return undefined;
  return s.length <= max ? s : s.slice(0, max);
}

/** SSE 블록의 data: 라인을 모아 JSON 파싱 (멀티라인 data 지원) */
function extractData(block: string): unknown | null {
  let dataStr = "";
  for (const line of block.split("\n")) {
    if (line.startsWith("data:")) dataStr += line.slice(5).trim();
  }
  if (!dataStr || dataStr === "[DONE]") return null;
  try {
    return JSON.parse(dataStr);
  } catch {
    return null;
  }
}

interface RawReference {
  title?: string;
  filename?: string;
  docId?: string;
  rank?: number;
  searchScore?: number;
  rerankScore?: number;
  sourceInfo?: { additionalInfo?: Record<string, unknown> };
}

function trimReference(ref: RawReference): Gov24AiReference {
  const ai = ref.sourceInfo?.additionalInfo ?? {};
  return {
    title: typeof ref.title === "string" ? ref.title : "",
    filename: ref.filename,
    docId: ref.docId,
    rank: ref.rank,
    searchScore: ref.searchScore,
    rerankScore: ref.rerankScore,
    serviceName: cap(ai.service_name),
    managingOrgName: cap(ai.managing_org_name, 100),
    legalBasis: cap(ai.legal_basis),
    feeDetail: cap(ai.fee_detail),
    applicationChannel: cap(ai.application_channel, 100),
    inquiryContact: cap(ai.inquiry_contact, 60),
    noticeUrl: typeof ai.notice === "string" ? ai.notice : undefined,
  };
}

/**
 * 전체 버퍼된 SSE 텍스트를 1회 파싱하는 순수 함수 (프로덕션 경로 + 테스트 seam).
 * 네트워크 의존 없음.
 */
export function parseSseText(raw: string): Gov24AiResult {
  const result: Gov24AiResult = {
    answer: "",
    confidence: null,
    confidenceLevel: null,
    summary: null,
    anstyp: null,
    references: [],
    links: [],
  };

  for (const block of raw.split("\n\n")) {
    const d = extractData(block);
    if (d === null || typeof d !== "object") continue;
    const obj = d as Record<string, unknown>;

    // 답변 텍스트 조각 — 엔드포인트가 요청마다 두 스키마를 번갈아 사용:
    //  A) {"event_status":"CHUNK","content":"..."}
    //  B) {"stream":"..."}  (동일 응답에 둘 중 하나만 등장)
    if (obj.event_status === "CHUNK" && typeof obj.content === "string") {
      result.answer += obj.content;
    }
    if (typeof obj.stream === "string") {
      result.answer += obj.stream;
    }
    // 답변 유형 마커
    if (typeof obj.anstyp === "string") result.anstyp = obj.anstyp;
    // 신뢰도
    if (typeof obj.confidence === "number") result.confidence = obj.confidence;
    if (typeof obj.confidence_level === "string") {
      result.confidenceLevel = obj.confidence_level;
    }
    // 진단 — Format A는 top-level trace_id, Format B는 metadata.trace_id 중첩
    if (typeof obj.trace_id === "string") result.traceId = obj.trace_id;
    if (obj.metadata && typeof obj.metadata === "object") {
      const meta = obj.metadata as Record<string, unknown>;
      if (typeof meta.trace_id === "string") result.traceId = meta.trace_id;
    }
    // 잔여 질문
    if (typeof obj.remainingQuestions === "number") {
      result.remainingQuestions = obj.remainingQuestions;
    }
    // 요약
    if (typeof obj.summary === "string") result.summary = obj.summary;
    // 공식 링크
    if (Array.isArray(obj.links)) {
      result.links = (obj.links as Record<string, unknown>[]).map((l): Gov24AiLink => ({
        url: typeof l.url === "string" ? l.url : "",
        title: typeof l.title === "string" ? l.title : "",
        serviceId: typeof l.service_id === "string" ? l.service_id : undefined,
        managingOrgName:
          typeof l.managing_org_name === "string" ? l.managing_org_name : undefined,
      }));
    }
    // RAG 출처 (2번째 event:meta)
    if (Array.isArray(obj.content_references)) {
      for (const cr of obj.content_references as Record<string, unknown>[]) {
        const refs = Array.isArray(cr.references) ? (cr.references as RawReference[]) : [];
        for (const ref of refs) {
          if (result.references.length >= MAX_REFERENCES) break;
          result.references.push(trimReference(ref));
        }
      }
    }
  }

  return result;
}

interface AskOptions {
  mode?: string;
}

/**
 * 정부24 plus AI에 자연어 질문 → 구조화된 답변/출처/링크 반환.
 * 익명 cold 요청 (cnvrsId마다 새 서버 세션 발급).
 *
 * maxRetries:0 — header-phase only; mid-stream stalls not retried
 * (abort surfaces at reader.read, outside fetchWithRetry). cold-per-call
 * 남용 우려로 transient 실패 시 재-POST 안 함.
 */
export async function askGov24Ai(
  question: string,
  location?: string,
  opts?: AskOptions,
): Promise<Gov24AiResult> {
  const cnvrsId = crypto.randomUUID();
  const body = JSON.stringify({
    cnvrsId,
    cnvrsQstnCn: question,
    location: location ?? "",
    mode: opts?.mode ?? "normal",
  });

  const res = await fetchWithRetry(URL, {
    timeoutMs: TIMEOUT_MS,
    maxRetries: 0,
    init: {
      method: "POST",
      headers: browserHeaders(cnvrsId),
      body,
    },
  });

  if (!res.ok) {
    throw new Error(`정부24 AI 검색 API 오류: HTTP ${res.status}`);
  }
  if (!res.body) {
    throw new Error("정부24 AI 검색 응답 본문이 비어 있습니다.");
  }

  // buffer-all: 루프는 디코드+append만, 이벤트 라우팅은 parseSseText 1회.
  const reader = res.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
    }
    // 마지막 멀티바이트 경계 flush (한글 끝글자 보존)
    buffer += decoder.decode();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`정부24 AI 검색 스트림 오류: ${msg}`, { cause: err });
  }

  return parseSseText(buffer);
}
