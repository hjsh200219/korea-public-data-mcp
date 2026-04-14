/**
 * YouTube 자막 추출 + Data API v3 클라이언트
 * - youtube-transcript: 자막 텍스트 추출 (API 키 불필요)
 * - YouTube Data API v3: 메타데이터, 검색, 댓글 (API 키 필요)
 */

import { YoutubeTranscript } from "youtube-transcript";
import type {
  TranscriptResult, TranscriptSegment,
  VideoMetadata, SearchResult, SearchResultItem,
  CommentsResult, CommentItem,
} from "./youtube-types.js";

const YT_API_BASE = "https://www.googleapis.com/youtube/v3";
const TIMEOUT_MS = 15000;

/**
 * YouTube URL 또는 ID에서 videoId 추출
 * 지원 형식: 전체 URL, 단축 URL, 순수 ID
 */
export function extractVideoId(input: string): string {
  const trimmed = input.trim();

  // youtu.be/VIDEO_ID
  const shortMatch = trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (shortMatch) return shortMatch[1];

  // youtube.com/watch?v=VIDEO_ID
  const longMatch = trimmed.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (longMatch) return longMatch[1];

  // youtube.com/embed/VIDEO_ID
  const embedMatch = trimmed.match(/\/embed\/([a-zA-Z0-9_-]{11})/);
  if (embedMatch) return embedMatch[1];

  // 순수 11자 ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;

  throw new Error(`유효한 YouTube URL 또는 ID가 아닙니다: ${input}`);
}

/** 밀리초 → "MM:SS" 포맷 */
function formatTimestamp(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

/**
 * YouTube 영상 자막 추출
 */
export async function getTranscript(
  urlOrId: string,
  lang?: string,
): Promise<TranscriptResult> {
  const videoId = extractVideoId(urlOrId);

  const raw = await YoutubeTranscript.fetchTranscript(videoId, {
    lang: lang ?? "ko",
  });

  if (!raw || raw.length === 0) {
    throw new Error("자막을 찾을 수 없습니다. 자막이 비활성화되었거나 없는 영상입니다.");
  }

  const segments: TranscriptSegment[] = raw.map((item) => ({
    text: item.text,
    offset: item.offset,
    duration: item.duration,
    lang: lang ?? "ko",
  }));

  const fullText = segments.map((s) => s.text).join(" ");

  return {
    videoId,
    segments,
    fullText,
    language: lang ?? "ko",
    segmentCount: segments.length,
  };
}

/**
 * 타임스탬프 포함 자막 포맷팅
 */
export function formatTranscriptWithTimestamps(
  segments: TranscriptSegment[],
): string {
  return segments
    .map((s) => `[${formatTimestamp(s.offset)}] ${s.text}`)
    .join("\n");
}

// ─── YouTube Data API v3 ───

/** Data API 응답 공통 구조 */
interface YtApiResponse {
  items?: Record<string, unknown>[];
  pageInfo?: { totalResults?: number };
}

/** ISO 8601 duration (PT1H2M3S) → 사람이 읽을 수 있는 형식 */
function parseDuration(iso: string): string {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return iso;
  const h = m[1] ? `${m[1]}시간 ` : "";
  const min = m[2] ? `${m[2]}분 ` : "";
  const sec = m[3] ? `${m[3]}초` : "";
  return (h + min + sec).trim() || "0초";
}

/** 중첩 객체에서 안전하게 값 추출 */
function pick(obj: Record<string, unknown>, key: string): unknown {
  return obj[key];
}

function pickStr(obj: Record<string, unknown>, key: string): string {
  return String(obj[key] ?? "");
}

function pickNum(obj: Record<string, unknown>, key: string): number {
  return Number(obj[key] ?? 0);
}

function pickObj(obj: Record<string, unknown>, key: string): Record<string, unknown> {
  return (obj[key] ?? {}) as Record<string, unknown>;
}

/** Data API 공통 fetch */
async function ytApiFetch(path: string, apiKey: string, params: Record<string, string>): Promise<YtApiResponse> {
  const qs = new URLSearchParams({ ...params, key: apiKey });
  const res = await fetch(`${YT_API_BASE}/${path}?${qs}`, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`YouTube API 오류 (${res.status}): ${body.slice(0, 200)}`);
  }
  return res.json() as Promise<YtApiResponse>;
}

/**
 * 영상 메타데이터 조회
 */
export async function getVideoMetadata(
  apiKey: string,
  urlOrId: string,
): Promise<VideoMetadata> {
  const videoId = extractVideoId(urlOrId);
  const data = await ytApiFetch("videos", apiKey, {
    part: "snippet,statistics,contentDetails",
    id: videoId,
  });

  const items = data.items;
  if (!items || items.length === 0) {
    throw new Error(`영상을 찾을 수 없습니다: ${videoId}`);
  }

  const item = items[0];
  const s = pickObj(item, "snippet");
  const st = pickObj(item, "statistics");
  const cd = pickObj(item, "contentDetails");
  const thumbnails = pickObj(s, "thumbnails");
  const highThumb = pickObj(thumbnails, "high");
  const defaultThumb = pickObj(thumbnails, "default");
  return {
    videoId,
    title: pickStr(s, "title"),
    description: pickStr(s, "description"),
    channelTitle: pickStr(s, "channelTitle"),
    channelId: pickStr(s, "channelId"),
    publishedAt: pickStr(s, "publishedAt"),
    tags: pick(s, "tags") as string[] | undefined,
    viewCount: pickNum(st, "viewCount"),
    likeCount: pickNum(st, "likeCount"),
    commentCount: pickNum(st, "commentCount"),
    duration: parseDuration(pickStr(cd, "duration")),
    thumbnailUrl: pickStr(highThumb, "url") || pickStr(defaultThumb, "url"),
  };
}

/**
 * 영상 검색
 */
export async function searchVideos(
  apiKey: string,
  query: string,
  maxResults = 5,
): Promise<SearchResult> {
  const data = await ytApiFetch("search", apiKey, {
    part: "snippet",
    type: "video",
    q: query,
    maxResults: String(Math.min(maxResults, 20)),
  });

  const items: SearchResultItem[] = (data.items ?? []).map((item) => {
    const id = pickObj(item, "id");
    const snippet = pickObj(item, "snippet");
    const thumbnails = pickObj(snippet, "thumbnails");
    const highThumb = pickObj(thumbnails, "high");
    return {
      videoId: pickStr(id, "videoId"),
      title: pickStr(snippet, "title"),
      description: pickStr(snippet, "description"),
      channelTitle: pickStr(snippet, "channelTitle"),
      publishedAt: pickStr(snippet, "publishedAt"),
      thumbnailUrl: pickStr(highThumb, "url"),
    };
  });

  return {
    query,
    totalResults: data.pageInfo?.totalResults ?? items.length,
    items,
  };
}

/**
 * 영상 댓글 조회
 */
export async function getVideoComments(
  apiKey: string,
  urlOrId: string,
  maxResults = 20,
): Promise<CommentsResult> {
  const videoId = extractVideoId(urlOrId);
  const data = await ytApiFetch("commentThreads", apiKey, {
    part: "snippet",
    videoId,
    maxResults: String(Math.min(maxResults, 100)),
    order: "relevance",
  });

  const items: CommentItem[] = (data.items ?? []).map((item) => {
    const threadSnippet = pickObj(item, "snippet");
    const topComment = pickObj(threadSnippet, "topLevelComment");
    const c = pickObj(topComment, "snippet");
    return {
      author: pickStr(c, "authorDisplayName"),
      text: pickStr(c, "textDisplay"),
      likeCount: pickNum(c, "likeCount"),
      publishedAt: pickStr(c, "publishedAt"),
    };
  });

  return {
    videoId,
    totalResults: data.pageInfo?.totalResults ?? items.length,
    items,
  };
}
