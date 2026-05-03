/**
 * Skill: product_review — YouTube 리뷰 + 쿠팡 구매 링크
 * youtube.md에서 채널 목록을 동적 로드하여 리뷰 자막 추출 + 쿠팡 상품 검색
 */
import fs from "node:fs/promises";
import path from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  parseYoutubeMdChannels,
  resolveChannelHandles,
  getChannelVideos,
  getTranscript,
  cleanTranscriptText,
} from "../../youtube-api.js";
import { searchCoupangProducts } from "../../coupang-api.js";
import { errorResponse, truncate } from "../../shared.js";
import {
  createDispatcher,
  requireParam,
  emptyResultMessage,
  registerSkillTool,
  type SkillResult,
} from "./_shared.js";

const COUPANG_DISCLOSURE =
  "※ 이 링크는 쿠팡 파트너스 활동의 일환으로 수수료를 제공받을 수 있습니다.";
const YOUTUBE_MD_PATH = path.resolve(process.cwd(), "youtube.md");

type ReviewParams = {
  action: string;
  query?: string;
  max_videos?: number;
  max_results?: number;
};

function handleCoupangSearch(
  coupangAccessKey: string | undefined,
  coupangSecretKey: string | undefined,
) {
  return async (p: ReviewParams): Promise<SkillResult> => {
    const err = requireParam(p as Record<string, unknown>, "query", "coupang_search");
    if (err) return err;

    if (!coupangAccessKey || !coupangSecretKey) {
      return {
        content: [
          {
            type: "text",
            text: "쿠팡 파트너스 API 키가 설정되지 않았습니다. COUPANG_ACCESS_KEY, COUPANG_SECRET_KEY를 설정하세요.",
          },
        ],
        isError: true,
      };
    }

    try {
      const result = await searchCoupangProducts(
        p.query!,
        coupangAccessKey,
        coupangSecretKey,
        p.max_results ?? 10,
      );

      if (result.products.length === 0) {
        return emptyResultMessage("쿠팡 상품", { query: p.query });
      }

      const lines = result.products.map((prod, i) => {
        const tags = [
          prod.isRocket ? "로켓배송" : "",
          prod.isFreeShipping ? "무료배송" : "",
        ]
          .filter(Boolean)
          .join(" ");
        return `${i + 1}. ${prod.productName}\n   가격: ${prod.productPrice.toLocaleString()}원${tags ? " [" + tags + "]" : ""}\n   ${prod.productUrl}`;
      });

      const text = [
        `[쿠팡] "${p.query}" 검색결과 ${result.products.length}건\n`,
        ...lines,
        "",
        COUPANG_DISCLOSURE,
      ].join("\n");

      return { content: [{ type: "text", text: truncate(text) }] };
    } catch (error) {
      return errorResponse("쿠팡 상품 검색", error);
    }
  };
}

function handleFullReview(
  youtubeApiKey: string,
  coupangAccessKey: string | undefined,
  coupangSecretKey: string | undefined,
) {
  const findReviewsFn = makeFindReviewsHandler(youtubeApiKey);
  const coupangFn = handleCoupangSearch(coupangAccessKey, coupangSecretKey);

  return async (p: ReviewParams): Promise<SkillResult> => {
    const err = requireParam(p as Record<string, unknown>, "query", "full_review");
    if (err) return err;

    const [reviewResult, coupangResult] = await Promise.all([
      findReviewsFn(p),
      coupangFn(p),
    ]);

    const parts: string[] = [];

    if (!reviewResult.isError) {
      parts.push(reviewResult.content[0].text);
    }
    if (!coupangResult.isError) {
      parts.push(coupangResult.content[0].text);
    }

    if (parts.length === 0) {
      return {
        content: [{ type: "text", text: "리뷰 및 상품 정보를 가져올 수 없습니다." }],
        isError: true,
      };
    }

    return { content: [{ type: "text", text: truncate(parts.join("\n\n---\n\n")) }] };
  };
}

function makeFindReviewsHandler(youtubeApiKey: string) {
  return async (p: ReviewParams): Promise<SkillResult> => {
    const err = requireParam(p as Record<string, unknown>, "query", "find_reviews");
    if (err) return err;

    const maxVideos = p.max_videos ?? 3;

    try {
      const mdContent = await fs.readFile(YOUTUBE_MD_PATH, "utf-8").catch(() => "");
      const handles = parseYoutubeMdChannels(mdContent);

      if (handles.length === 0) {
        return emptyResultMessage("YouTube 리뷰 채널");
      }

      const channels = await resolveChannelHandles(youtubeApiKey, handles);

      if (channels.length === 0) {
        return emptyResultMessage("YouTube 리뷰 채널");
      }

      const videoLists = await Promise.all(
        channels.map((ch) =>
          getChannelVideos(youtubeApiKey, ch.channelId, maxVideos).catch(
            () => [] as { videoId: string; title: string; publishedAt: string }[],
          ),
        ),
      );

      const query = p.query!.toLowerCase();
      const matched: { videoId: string; title: string; channelHandle: string }[] = [];
      for (let i = 0; i < channels.length; i++) {
        for (const v of videoLists[i]) {
          if (v.title.toLowerCase().includes(query)) {
            matched.push({ videoId: v.videoId, title: v.title, channelHandle: channels[i].handle });
          }
        }
      }

      if (matched.length === 0) {
        return emptyResultMessage("YouTube 리뷰", { query: p.query });
      }

      const transcriptResults = await Promise.allSettled(
        matched.map((v) => getTranscript(`https://youtube.com/watch?v=${v.videoId}`)),
      );

      const sections: string[] = [`[YouTube 리뷰] 검색어: "${p.query}"\n`];
      for (let i = 0; i < matched.length; i++) {
        const r = transcriptResults[i];
        const v = matched[i];
        if (r.status === "fulfilled") {
          const text = cleanTranscriptText(r.value.fullText);
          sections.push(
            `--- ${v.title} (${v.channelHandle})\nhttps://youtube.com/watch?v=${v.videoId}\n${text}\n`,
          );
        }
      }

      if (sections.length === 1) {
        return emptyResultMessage("YouTube 리뷰 자막", { query: p.query });
      }

      sections.push("\n위 자막을 바탕으로 장단점을 정리해주세요.");
      return { content: [{ type: "text", text: truncate(sections.join("\n")) }] };
    } catch (error) {
      return errorResponse("YouTube 리뷰 검색", error);
    }
  };
}

export function createProductReviewHandler(
  youtubeApiKey: string | undefined,
  coupangAccessKey: string | undefined,
  coupangSecretKey: string | undefined,
) {
  // find_reviews / full_review 는 YouTube 키 필수
  const findReviewsHandler = youtubeApiKey
    ? makeFindReviewsHandler(youtubeApiKey)
    : async (_p: ReviewParams): Promise<SkillResult> => ({
        content: [{ type: "text", text: "find_reviews action은 YOUTUBE_API_KEY가 필요합니다." }],
        isError: true,
      });

  const fullReviewHandler = youtubeApiKey
    ? handleFullReview(youtubeApiKey, coupangAccessKey, coupangSecretKey)
    : async (_p: ReviewParams): Promise<SkillResult> => ({
        content: [{ type: "text", text: "full_review action은 YOUTUBE_API_KEY가 필요합니다." }],
        isError: true,
      });

  return createDispatcher<ReviewParams>("product_review", {
    find_reviews: findReviewsHandler,
    coupang_search: handleCoupangSearch(coupangAccessKey, coupangSecretKey),
    full_review: fullReviewHandler,
  });
}

const ACTIONS = ["find_reviews", "coupang_search", "full_review"] as const;

export function registerProductReviewSkill(
  server: McpServer,
  youtubeApiKey: string | undefined,
  coupangAccessKey: string | undefined,
  coupangSecretKey: string | undefined,
): void {
  if (!youtubeApiKey) return; // YouTube 키 없으면 전체 스킵

  const handler = createProductReviewHandler(youtubeApiKey, coupangAccessKey, coupangSecretKey);

  registerSkillTool(server, {
    name: "product_review",
    title: "Product Review / 제품 리뷰",
    description: "Product Review — extract YouTube review captions and search Coupang products. Based on youtube.md channel list. Actions: find_reviews=YouTube captions | coupang_search=Coupang product search | full_review=combined. / YouTube 리뷰 자막 추출 + 쿠팡 상품 검색. youtube.md 채널 목록 기반.",
    inputSchema: {
      action: z.enum(ACTIONS).describe(
        "find_reviews=YouTube채널에서리뷰자막추출(query필수) | coupang_search=쿠팡상품검색(query필수) | full_review=리뷰+상품통합(query필수)",
      ),
      query: z.string().optional().describe("검색 키워드 (필수)"),
      max_videos: z.number().optional().describe("채널당 최대 영상 수 (기본: 3)"),
      max_results: z.number().optional().describe("쿠팡 최대 상품 수 (기본: 10)"),
    },
    callback: async (params) => handler(params as ReviewParams),
  });
}
