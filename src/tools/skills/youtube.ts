/**
 * Skill: youtube — YouTube 자막 추출·요약 + Data API v3 (메타데이터·검색·댓글)
 * 자막(get_transcript, summarize)은 API 키 없이 동작.
 * 메타데이터·검색·댓글은 YOUTUBE_API_KEY 필요.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  getTranscript, formatTranscriptWithTimestamps, cleanTranscriptText,
  getVideoMetadata, searchVideos, getVideoComments,
} from "../../youtube-api.js";
import { errorResponse, truncate } from "../../shared.js";
import { createDispatcher, requireParam, type SkillResult } from "./_shared.js";

/** API 키 없이 사용 가능한 actions */
const BASE_ACTIONS = ["get_transcript", "summarize"] as const;
/** API 키 필요한 actions */
const DATA_ACTIONS = ["video_info", "search", "comments"] as const;

type AllAction = (typeof BASE_ACTIONS)[number] | (typeof DATA_ACTIONS)[number];

type YoutubeParams = {
  action: string;
  url?: string;
  query?: string;
  lang?: string;
  max_results?: number;
};

function needsApiKey(action: string): boolean {
  return (DATA_ACTIONS as readonly string[]).includes(action);
}

function handleGetTranscript() {
  return async (p: YoutubeParams): Promise<SkillResult> => {
    const err = requireParam(p as Record<string, unknown>, "url", "get_transcript");
    if (err) return err;

    try {
      const result = await getTranscript(p.url!, p.lang);
      const timestamped = formatTranscriptWithTimestamps(result.segments);
      const output = [
        `영상 ID: ${result.videoId}`,
        `언어: ${result.language}`,
        `세그먼트 수: ${result.segmentCount}`,
        "",
        "--- 자막 (타임스탬프 포함) ---",
        timestamped,
      ].join("\n");

      return { content: [{ type: "text", text: truncate(output) }] };
    } catch (e) {
      return errorResponse("YouTube 자막 추출", e);
    }
  };
}

function handleSummarize() {
  return async (p: YoutubeParams): Promise<SkillResult> => {
    const err = requireParam(p as Record<string, unknown>, "url", "summarize");
    if (err) return err;

    try {
      const result = await getTranscript(p.url!, p.lang);
      const cleaned = cleanTranscriptText(result.fullText);
      const output = [
        `영상 ID: ${result.videoId}`,
        `언어: ${result.language}`,
        `세그먼트 수: ${result.segmentCount}`,
        `원문 길이: ${result.fullText.length}자 → 정리 후: ${cleaned.length}자`,
        "",
        "--- 전체 자막 텍스트 (필러/중복 제거) ---",
        cleaned,
        "",
        "---",
        "위 자막 내용을 바탕으로 핵심 내용을 요약해주세요.",
      ].join("\n");

      return { content: [{ type: "text", text: output }] };
    } catch (e) {
      return errorResponse("YouTube 자막 요약", e);
    }
  };
}

function handleVideoInfo(apiKey: string) {
  return async (p: YoutubeParams): Promise<SkillResult> => {
    const err = requireParam(p as Record<string, unknown>, "url", "video_info");
    if (err) return err;

    try {
      const meta = await getVideoMetadata(apiKey, p.url!);
      const output = [
        `제목: ${meta.title}`,
        `채널: ${meta.channelTitle}`,
        `게시일: ${meta.publishedAt}`,
        `재생시간: ${meta.duration}`,
        `조회수: ${meta.viewCount.toLocaleString()}`,
        `좋아요: ${meta.likeCount.toLocaleString()}`,
        `댓글수: ${meta.commentCount.toLocaleString()}`,
        meta.tags?.length ? `태그: ${meta.tags.join(", ")}` : "",
        "",
        "--- 설명 ---",
        meta.description,
      ].filter(Boolean).join("\n");

      return { content: [{ type: "text", text: truncate(output) }] };
    } catch (e) {
      return errorResponse("YouTube 영상 정보", e);
    }
  };
}

function handleSearch(apiKey: string) {
  return async (p: YoutubeParams): Promise<SkillResult> => {
    const err = requireParam(p as Record<string, unknown>, "query", "search");
    if (err) return err;

    try {
      const result = await searchVideos(apiKey, p.query!, { maxResults: p.max_results ?? 5 });
      const lines = result.items.map((item, i) => [
        `${i + 1}. ${item.title}`,
        `   채널: ${item.channelTitle}`,
        `   게시일: ${item.publishedAt}`,
        `   ID: ${item.videoId}`,
        `   https://youtube.com/watch?v=${item.videoId}`,
      ].join("\n"));

      const output = [
        `검색어: "${result.query}"`,
        `전체 결과: ${result.totalResults.toLocaleString()}건`,
        "",
        ...lines,
      ].join("\n");

      return { content: [{ type: "text", text: truncate(output) }] };
    } catch (e) {
      return errorResponse("YouTube 검색", e);
    }
  };
}

function handleComments(apiKey: string) {
  return async (p: YoutubeParams): Promise<SkillResult> => {
    const err = requireParam(p as Record<string, unknown>, "url", "comments");
    if (err) return err;

    try {
      const result = await getVideoComments(apiKey, p.url!, p.max_results ?? 20);
      const lines = result.items.map((c, i) =>
        `${i + 1}. [${c.author}] (좋아요 ${c.likeCount}) ${c.text}`,
      );

      const output = [
        `영상 ID: ${result.videoId}`,
        `댓글 수: ${result.totalResults}건`,
        "",
        ...lines,
      ].join("\n");

      return { content: [{ type: "text", text: truncate(output) }] };
    } catch (e) {
      return errorResponse("YouTube 댓글", e);
    }
  };
}

export function registerYoutube(server: McpServer, apiKey?: string): void {
  const availableActions: AllAction[] = [...BASE_ACTIONS];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handlers: Record<string, any> = {
    get_transcript: handleGetTranscript(),
    summarize: handleSummarize(),
  };

  if (apiKey) {
    availableActions.push(...DATA_ACTIONS);
    handlers.video_info = handleVideoInfo(apiKey);
    handlers.search = handleSearch(apiKey);
    handlers.comments = handleComments(apiKey);
  }

  const noKeyGuard = (p: YoutubeParams): SkillResult | null => {
    if (!apiKey && needsApiKey(p.action)) {
      return {
        content: [{ type: "text", text: `"${p.action}" action은 YOUTUBE_API_KEY가 필요합니다.` }],
        isError: true,
      };
    }
    return null;
  };

  const dispatch = createDispatcher<YoutubeParams>("youtube", handlers);

  const actionDescriptions = [
    "- get_transcript: 자막을 타임스탬프와 함께 추출",
    "- summarize: 자막 추출 후 요약 요청 (Claude가 요약)",
    ...(apiKey ? [
      "- video_info: 영상 메타데이터 (제목, 조회수, 좋아요 등)",
      "- search: 키워드로 영상 검색",
      "- comments: 영상 댓글 조회",
    ] : []),
  ];

  server.tool(
    "youtube",
    `YouTube 자막 추출·요약${apiKey ? " + 영상정보·검색·댓글" : ""}. Actions: ${availableActions.join(", ")}\n${actionDescriptions.join("\n")}`,
    {
      action: z.enum(availableActions as unknown as [string, ...string[]]).describe("수행할 작업"),
      url: z.string().optional().describe("YouTube URL 또는 영상 ID (get_transcript, summarize, video_info, comments에 필요)"),
      query: z.string().optional().describe("검색 키워드 (search action에 필요)"),
      lang: z.string().optional().describe("자막 언어 코드 (기본: ko). 예: ko, en, ja"),
      max_results: z.number().optional().describe("검색/댓글 최대 결과 수 (기본: 5/20)"),
    },
    async (params) => {
      const p = params as YoutubeParams;
      const guard = noKeyGuard(p);
      if (guard) return guard;
      return dispatch(p);
    },
  );
}
