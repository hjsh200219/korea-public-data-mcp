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
  youtubeTranscriptMetrics,
  isServerBlockedTranscript,
  serverTranscriptUnavailableMessage,
  transcriptFailureReason,
} from "../../youtube-transcript-status.js";
import {
  createDispatcher,
  requireParam,
  emptyResultMessage,
  registerSkillTool,
  type SkillResult,
} from "./_shared.js";

/** 쿼리 토큰(공백 분리) 중 하나라도 제목 또는 설명에 포함되면 true */
function matchesQuery(title: string, description: string, query: string): boolean {
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  const haystack = (title + " " + description).toLowerCase();
  return tokens.some((t) => haystack.includes(t));
}

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

    // 실패한 파트도 버리지 않고 사유를 그대로 싣는다. 예전에는 isError 파트를 통째로
    // 버려서 «왜 리뷰가 없는지» 가 사라졌고, 서버 고장·설정 누락이 «리뷰 없음» 으로
    // 둔갑했다(2026-09-20 실측: 채널 목록 미배포가 「검색 결과가 없습니다」로 나갔다).
    const parts: string[] = [];
    let okCount = 0;
    for (const r of [reviewResult, coupangResult]) {
      const text = r.content[0]?.text;
      if (!text) continue;
      parts.push(text);
      if (!r.isError) okCount++;
    }

    if (parts.length === 0) {
      return {
        content: [{ type: "text", text: "리뷰 및 상품 정보를 가져올 수 없습니다." }],
        isError: true,
      };
    }

    // 한쪽이라도 성공하면 축소 성공이다. 둘 다 실패면 사유를 보여 주되 오류로 낸다.
    const merged = { content: [{ type: "text" as const, text: truncate(parts.join("\n\n---\n\n")) }] };
    return okCount === 0 ? { ...merged, isError: true } : merged;
  };
}

function makeFindReviewsHandler(youtubeApiKey: string) {
  return async (p: ReviewParams): Promise<SkillResult> => {
    const err = requireParam(p as Record<string, unknown>, "query", "find_reviews");
    if (err) return err;

    const maxVideos = p.max_videos ?? 3;

    try {
      // 파일 부재와 «채널이 0개인 파일» 은 다른 사건이다. 예전에는 둘 다 빈 문자열로
      // 뭉개져 «검색 결과가 없습니다» 로 나갔고, 그래서 Dockerfile 의 COPY 누락이
      // 3개월 넘게 정상적 빈 결과로 보였다(2026-09-20 실측).
      let mdContent = "";
      let mdMissing = false;
      try {
        mdContent = await fs.readFile(YOUTUBE_MD_PATH, "utf-8");
      } catch {
        mdMissing = true;
      }
      const handles = parseYoutubeMdChannels(mdContent);

      if (mdMissing || handles.length === 0) {
        const why = mdMissing
          ? `채널 목록 파일을 찾지 못했습니다 (${YOUTUBE_MD_PATH}). 배포에 포함되지 않았을 수 있습니다.`
          : "채널 목록 파일에 채널이 하나도 없습니다.";
        return {
          content: [{
            type: "text" as const,
            text: `[CONFIG_MISSING] YouTube 리뷰 채널 설정을 읽지 못했습니다.\n${why}\n` +
              "이것은 «리뷰가 없음» 이 아니라 서버 설정 문제입니다.",
          }],
          isError: true,
        };
      }

      const channels = await resolveChannelHandles(youtubeApiKey, handles);

      if (channels.length === 0) {
        return emptyResultMessage("YouTube 리뷰 채널");
      }

      const videoLists = await Promise.all(
        channels.map((ch) =>
          getChannelVideos(youtubeApiKey, ch.channelId, maxVideos).catch(
            () => [] as { videoId: string; title: string; description: string; channelTitle: string; publishedAt: string; thumbnailUrl: string }[],
          ),
        ),
      );

      const matched: { videoId: string; title: string; channelHandle: string }[] = [];
      for (let i = 0; i < channels.length; i++) {
        for (const v of videoLists[i]) {
          if (matchesQuery(v.title, v.description ?? "", p.query!)) {
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

      // 찾은 영상의 제목·URL·채널은 자막과 무관하게 이미 손에 쥐고 있다 — 자막이 전멸해도
      // 버리지 않는다. 예전에는 전멸 시 emptyResultMessage로 «검색 결과가 없습니다»만 돌려줘
      // 서버 고장(봇 차단)이 «이 제품 리뷰가 없음»으로 둔갑했다(설계 §3.2 «조용한 오보»).
      const sections: string[] = [];
      let okCount = 0;
      let blockedReason: string | null = null;
      let firstFailReason: string | null = null;

      for (let i = 0; i < matched.length; i++) {
        const r = transcriptResults[i];
        const v = matched[i];
        const head = `--- ${v.title} (${v.channelHandle})\nhttps://youtube.com/watch?v=${v.videoId}`;
        if (r.status === "fulfilled") {
          okCount++;
          sections.push(`${head}\n${cleanTranscriptText(r.value.fullText)}\n`);
          continue;
        }
        const reason = transcriptFailureReason(r.reason);
        firstFailReason ??= reason;
        if (blockedReason === null && isServerBlockedTranscript(r.reason)) blockedReason = reason;
        sections.push(`${head}\n(자막 없음 — 사유: ${reason})\n`);
      }

      // 계측은 영상 단위가 아니라 요청 단위 1건 (설계 §4.2).
      youtubeTranscriptMetrics.record(
        "product_review",
        okCount > 0,
        okCount > 0 ? undefined : (blockedReason ?? firstFailReason ?? "OTHER"),
      );

      const header = `[YouTube 리뷰] 검색어: "${p.query}" — 매칭 영상 ${matched.length}건 · 자막 확보 ${okCount}건\n`;

      if (okCount > 0) {
        sections.push("\n위 자막을 바탕으로 장단점을 정리해주세요.");
      } else if (blockedReason) {
        // 서버 차단이라 로컬에서는 뽑힌다 — 고정 코드와 대안을 함께 낸다.
        sections.push(`\n${serverTranscriptUnavailableMessage(blockedReason)}`);
        sections.push(
          "\n위 영상 목록은 실제 검색 결과입니다 — «해당 제품 리뷰가 없음»이 아니라 «서버가 자막을 못 가져옴»입니다.",
        );
      } else {
        // 자막이 실제로 없는 영상들 — 차단 안내를 붙이면 그것이 또 다른 오보가 된다.
        sections.push(
          `\n자막을 가져온 영상이 없습니다 (사유: ${firstFailReason ?? "OTHER"}). 위 영상 목록은 실제 검색 결과입니다.`,
        );
      }

      // isError를 세우지 않는 이유: 영상 검색까지는 성공한 «축소 동작»이고, full_review가
      // isError인 파트를 버리므로(112-133행) 세우면 쿠팡 응답에서 영상 목록이 통째로 사라진다.
      // 대신 본문이 고정 코드로 고장을 명시해 빈 결과와 구분된다(설계 §4.1 1-2·1-3).
      return { content: [{ type: "text", text: truncate(header + sections.join("\n")) }] };
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
    title: "Product Review (YouTube + Coupang) / 제품 리뷰 (유튜브+쿠팡)",
    description: "YouTube product review search + Coupang purchase links. Use full_review to get BOTH YouTube review captions AND Coupang product links together. Use find_reviews for YouTube-only review search. Use coupang_search for Coupang-only product search. / 유튜브 제품 리뷰 검색 + 쿠팡 구매 링크. 유튜브 리뷰를 찾을 때는 이 도구를 사용하세요. full_review=유튜브리뷰+쿠팡링크 통합 | find_reviews=유튜브리뷰만 | coupang_search=쿠팡상품만.",
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
