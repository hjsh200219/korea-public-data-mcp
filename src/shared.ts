/**
 * 공유 유틸리티 — MCP 도구 핸들러 공통 함수
 */

export const MAX_CONTENT_LENGTH = 8000;

export function truncate(text: string, max = MAX_CONTENT_LENGTH): string {
  if (text.length <= max) return text;
  return text.substring(0, max) + "\n\n... (내용이 길어 일부만 표시)";
}

/**
 * offset 기반 본문 윈도우 추출.
 * 큰 본문(판례 의견서 등)을 여러 호출로 나눠 가져올 때 사용.
 *
 * 단순 substring보다 메타데이터가 많아: hasMore/totalLength로 LLM이
 * 다음 호출을 판단하고, windowStart/windowEnd로 사용자에게 위치를 보여줄 수 있다.
 */
export interface TruncateWindowOptions {
  max?: number;
  offset?: number;
}

export interface TruncateWindowResult {
  text: string;
  totalLength: number;
  windowStart: number;
  windowEnd: number;
  hasMore: boolean;
}

export function truncateWindow(
  text: string,
  options: TruncateWindowOptions = {},
): TruncateWindowResult {
  const total = text.length;
  const max = Math.max(1, options.max ?? MAX_CONTENT_LENGTH);
  const start = Math.min(Math.max(0, options.offset ?? 0), total);
  const end = Math.min(start + max, total);
  return {
    text: text.substring(start, end),
    totalLength: total,
    windowStart: start,
    windowEnd: end,
    hasMore: end < total,
  };
}

export function errorResponse(label: string, error: unknown) {
  const message = error instanceof Error ? error.message : "알 수 없는 오류";
  return {
    content: [{ type: "text" as const, text: `${label} 오류: ${message}` }],
    isError: true,
  };
}

/** HTML 태그·엔티티 제거. 도메인 비종속 공유 유틸. */
export function stripHtmlTags(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&middot;/g, "·")
    .replace(/&hellip;/g, "…")
    .replace(/&#\d+;/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
