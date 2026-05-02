import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../youtube-api.js", () => ({
  parseYoutubeMdChannels: vi.fn(),
  resolveChannelHandles: vi.fn(),
  getChannelVideos: vi.fn(),
  getTranscript: vi.fn(),
  cleanTranscriptText: vi.fn((s: string) => s),
}));

vi.mock("../../coupang-api.js", () => ({
  searchCoupangProducts: vi.fn(),
  _resetCoupangCache: vi.fn(),
}));

import {
  parseYoutubeMdChannels,
  resolveChannelHandles,
  getChannelVideos,
  getTranscript,
  cleanTranscriptText,
} from "../../youtube-api.js";
import { searchCoupangProducts } from "../../coupang-api.js";
import { createProductReviewHandler } from "./product-review.js";

describe("product_review 스킬", () => {
  const YOUTUBE_KEY = "yt-key";
  const COUPANG_ACCESS = "ca-key";
  const COUPANG_SECRET = "cs-key";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 1. find_reviews — query 필수
  it("find_reviews_query필수", async () => {
    const handler = createProductReviewHandler(YOUTUBE_KEY, COUPANG_ACCESS, COUPANG_SECRET);
    const result = await handler({ action: "find_reviews" } as any);
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("query");
  });

  // 2. find_reviews — YouTube 키 없음
  it("find_reviews_YouTube키없음_스킵", async () => {
    const handler = createProductReviewHandler(undefined, COUPANG_ACCESS, COUPANG_SECRET);
    const result = await handler({ action: "find_reviews", query: "에어팟" } as any);
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("YOUTUBE_API_KEY");
  });

  // 3. find_reviews — 채널 없음 → 빈 결과
  it("find_reviews_채널없음_빈결과", async () => {
    vi.mocked(parseYoutubeMdChannels).mockReturnValue([]);
    vi.mocked(resolveChannelHandles).mockResolvedValue([]);
    const handler = createProductReviewHandler(YOUTUBE_KEY, COUPANG_ACCESS, COUPANG_SECRET);
    const result = await handler({ action: "find_reviews", query: "에어팟" } as any);
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("없습니다");
  });

  // 4. find_reviews — 정상 동작
  it("find_reviews_정상동작", async () => {
    vi.mocked(parseYoutubeMdChannels).mockReturnValue(["@TestChannel"]);
    vi.mocked(resolveChannelHandles).mockResolvedValue([
      { handle: "@TestChannel", channelId: "UC123" },
    ]);
    vi.mocked(getChannelVideos).mockResolvedValue([
      { videoId: "vid1", title: "에어팟 리뷰 솔직후기", publishedAt: "2024-01-01" },
    ]);
    vi.mocked(getTranscript).mockResolvedValue({
      videoId: "vid1",
      language: "ko",
      segmentCount: 10,
      fullText: "에어팟 음질이 좋습니다",
      segments: [],
    });
    vi.mocked(cleanTranscriptText).mockReturnValue("에어팟 음질이 좋습니다");

    const handler = createProductReviewHandler(YOUTUBE_KEY, COUPANG_ACCESS, COUPANG_SECRET);
    const result = await handler({ action: "find_reviews", query: "에어팟" } as any);
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("에어팟");
    expect(result.content[0].text).toContain("vid1");
  });

  // 5. coupang_search — query 필수
  it("coupang_search_query필수", async () => {
    const handler = createProductReviewHandler(YOUTUBE_KEY, COUPANG_ACCESS, COUPANG_SECRET);
    const result = await handler({ action: "coupang_search" } as any);
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("query");
  });

  // 6. coupang_search — 키 없음 → 친절한 에러
  it("coupang_search_키없음_친절에러", async () => {
    const handler = createProductReviewHandler(YOUTUBE_KEY, undefined, undefined);
    const result = await handler({ action: "coupang_search", query: "에어팟" } as any);
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("COUPANG");
  });

  // 7. coupang_search — 정상 동작
  it("coupang_search_정상동작", async () => {
    vi.mocked(searchCoupangProducts).mockResolvedValue({
      query: "에어팟",
      cached: false,
      products: [
        {
          productId: 1,
          productName: "Apple AirPods Pro",
          productPrice: 299000,
          productImage: "https://img.example.com/1.jpg",
          productUrl: "https://coupang.com/vp/products/1",
          isRocket: true,
          isFreeShipping: true,
        },
      ],
    });

    const handler = createProductReviewHandler(YOUTUBE_KEY, COUPANG_ACCESS, COUPANG_SECRET);
    const result = await handler({ action: "coupang_search", query: "에어팟" } as any);
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("AirPods");
    expect(result.content[0].text).toContain("파트너스");
  });

  // 8. full_review — 정상 동작 (YouTube + 쿠팡 결합)
  it("full_review_정상동작", async () => {
    vi.mocked(parseYoutubeMdChannels).mockReturnValue(["@TestChannel"]);
    vi.mocked(resolveChannelHandles).mockResolvedValue([
      { handle: "@TestChannel", channelId: "UC123" },
    ]);
    vi.mocked(getChannelVideos).mockResolvedValue([
      { videoId: "vid1", title: "에어팟 리뷰", publishedAt: "2024-01-01" },
    ]);
    vi.mocked(getTranscript).mockResolvedValue({
      videoId: "vid1",
      language: "ko",
      segmentCount: 5,
      fullText: "좋은 제품",
      segments: [],
    });
    vi.mocked(cleanTranscriptText).mockReturnValue("좋은 제품");
    vi.mocked(searchCoupangProducts).mockResolvedValue({
      query: "에어팟",
      cached: false,
      products: [
        {
          productId: 2,
          productName: "AirPods 4세대",
          productPrice: 199000,
          productImage: "https://img.example.com/2.jpg",
          productUrl: "https://coupang.com/vp/products/2",
          isRocket: false,
          isFreeShipping: true,
        },
      ],
    });

    const handler = createProductReviewHandler(YOUTUBE_KEY, COUPANG_ACCESS, COUPANG_SECRET);
    const result = await handler({ action: "full_review", query: "에어팟" } as any);
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("에어팟");
    expect(result.content[0].text).toContain("AirPods");
  });

  // 9. full_review — 부분 실패 허용 (일부 자막 실패해도 결과 반환)
  it("full_review_부분실패허용", async () => {
    vi.mocked(parseYoutubeMdChannels).mockReturnValue(["@TestChannel"]);
    vi.mocked(resolveChannelHandles).mockResolvedValue([
      { handle: "@TestChannel", channelId: "UC123" },
    ]);
    vi.mocked(getChannelVideos).mockResolvedValue([
      { videoId: "vid1", title: "에어팟 리뷰 1", publishedAt: "2024-01-01" },
      { videoId: "vid2", title: "에어팟 리뷰 2", publishedAt: "2024-01-02" },
    ]);
    vi.mocked(getTranscript)
      .mockResolvedValueOnce({
        videoId: "vid1",
        language: "ko",
        segmentCount: 5,
        fullText: "좋은 제품",
        segments: [],
      })
      .mockRejectedValueOnce(new Error("자막 없음"));
    vi.mocked(cleanTranscriptText).mockReturnValue("좋은 제품");
    vi.mocked(searchCoupangProducts).mockResolvedValue({
      query: "에어팟",
      cached: false,
      products: [],
    });

    const handler = createProductReviewHandler(YOUTUBE_KEY, COUPANG_ACCESS, COUPANG_SECRET);
    const result = await handler({ action: "full_review", query: "에어팟" } as any);
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("vid1");
  });

  // 10. unknown action
  it("unknown_action_에러", async () => {
    const handler = createProductReviewHandler(YOUTUBE_KEY, COUPANG_ACCESS, COUPANG_SECRET);
    const result = await handler({ action: "unknown_action" } as any);
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("알 수 없는 action");
  });
});
