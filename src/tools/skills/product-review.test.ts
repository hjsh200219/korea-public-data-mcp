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
import { SERVER_TRANSCRIPT_UNAVAILABLE, youtubeTranscriptMetrics } from "../../youtube-transcript-status.js";
import { TranscriptError, TranscriptErrorCode } from "../../youtube-types.js";

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
  it("find_reviews_채널목록비었음_설정문제로보고한다", async () => {
    // 채널이 0개인 것은 «이 제품 리뷰가 없음» 이 아니라 서버 설정 문제다.
    // 빈 결과로 뭉개면 배포 누락이 정상적 빈 결과로 보인다 — 2026-09-20 실측에서
    // Dockerfile 의 COPY 누락이 「검색 결과가 없습니다」로 3개월 넘게 가려져 있었다.
    vi.mocked(parseYoutubeMdChannels).mockReturnValue([]);
    vi.mocked(resolveChannelHandles).mockResolvedValue([]);
    const handler = createProductReviewHandler(YOUTUBE_KEY, COUPANG_ACCESS, COUPANG_SECRET);
    const result = await handler({ action: "find_reviews", query: "에어팟" } as any);
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("CONFIG_MISSING");
    expect(result.content[0].text).toContain("설정");
  });

  it("full_review_채널설정문제_쿠팡과사유를함께반환한다", async () => {
    // 실패한 파트를 버리면 «왜 리뷰가 없는지» 가 사라져 설정 문제가 «리뷰 없음» 으로
    // 둔갑한다. 쿠팡이 살아 있으면 축소 성공이어야 하고, 사유는 본문에 남아야 한다.
    vi.mocked(parseYoutubeMdChannels).mockReturnValue([]);
    vi.mocked(resolveChannelHandles).mockResolvedValue([]);
    vi.mocked(searchCoupangProducts).mockResolvedValue({
      products: [{
        productName: "에어팟 프로", productPrice: 299000,
        productUrl: "https://link.coupang.com/x", productImage: "https://img/x.jpg",
        isRocket: true, isFreeShipping: true,
      }],
    } as any);
    const handler = createProductReviewHandler(YOUTUBE_KEY, COUPANG_ACCESS, COUPANG_SECRET);
    const result = await handler({ action: "full_review", query: "에어팟" } as any);
    expect(result.isError).toBeUndefined();          // 쿠팡이 살아 있으므로 축소 성공
    expect(result.content[0].text).toContain("CONFIG_MISSING");  // 사유가 사라지지 않는다
    expect(result.content[0].text).toContain("에어팟 프로");        // 쿠팡 결과도 함께
  });

  // 4. find_reviews — 정상 동작
  it("find_reviews_정상동작", async () => {
    vi.mocked(parseYoutubeMdChannels).mockReturnValue(["@TestChannel"]);
    vi.mocked(resolveChannelHandles).mockResolvedValue([
      { handle: "@TestChannel", channelId: "UC123", title: "TestChannel" },
    ]);
    vi.mocked(getChannelVideos).mockResolvedValue([
      { videoId: "vid1", title: "에어팟 리뷰 솔직후기", publishedAt: "2024-01-01", description: "", channelTitle: "TestChannel", thumbnailUrl: "" },
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
      { handle: "@TestChannel", channelId: "UC123", title: "TestChannel" },
    ]);
    vi.mocked(getChannelVideos).mockResolvedValue([
      { videoId: "vid1", title: "에어팟 리뷰", publishedAt: "2024-01-01", description: "", channelTitle: "TestChannel", thumbnailUrl: "" },
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
      { handle: "@TestChannel", channelId: "UC123", title: "TestChannel" },
    ]);
    vi.mocked(getChannelVideos).mockResolvedValue([
      { videoId: "vid1", title: "에어팟 리뷰 1", publishedAt: "2024-01-01", description: "", channelTitle: "TestChannel", thumbnailUrl: "" },
      { videoId: "vid2", title: "에어팟 리뷰 2", publishedAt: "2024-01-02", description: "", channelTitle: "TestChannel", thumbnailUrl: "" },
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

  // 11. find_reviews — description에만 쿼리가 있어도 매칭
  it("find_reviews_description매칭", async () => {
    vi.mocked(parseYoutubeMdChannels).mockReturnValue(["@TestChannel"]);
    vi.mocked(resolveChannelHandles).mockResolvedValue([
      { handle: "@TestChannel", channelId: "UC123", title: "TestChannel" },
    ]);
    vi.mocked(getChannelVideos).mockResolvedValue([
      {
        videoId: "vid1",
        title: "이번 주 구매한 것들", // 제목에 "마우스" 없음
        description: "오늘은 무선 마우스를 구매했어요", // description에만 있음
        publishedAt: "2024-01-01",
        channelTitle: "TestChannel",
        thumbnailUrl: "",
      },
    ]);
    vi.mocked(getTranscript).mockResolvedValue({
      videoId: "vid1",
      language: "ko",
      segmentCount: 5,
      fullText: "마우스 리뷰입니다",
      segments: [],
    });
    vi.mocked(cleanTranscriptText).mockReturnValue("마우스 리뷰입니다");

    const handler = createProductReviewHandler(YOUTUBE_KEY, COUPANG_ACCESS, COUPANG_SECRET);
    const result = await handler({ action: "find_reviews", query: "마우스" } as any);
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("vid1");
  });

  // ─── 자막 전멸 시 «조용한 오보» 회귀 방지 (설계 2026-09-20 §3.2) ───

  /** 영상 1건이 매칭되도록 채널·영상 목록 mock을 깔아둔다 */
  function mockOneMatchedVideo() {
    vi.mocked(parseYoutubeMdChannels).mockReturnValue(["@ITSub"]);
    vi.mocked(resolveChannelHandles).mockResolvedValue([
      { handle: "@ITSub", channelId: "UC123", title: "잇섭" },
    ]);
    vi.mocked(getChannelVideos).mockResolvedValue([
      {
        videoId: "vid1",
        title: "에어팟 프로 3 솔직 리뷰",
        description: "",
        publishedAt: "2026-09-01",
        channelTitle: "잇섭",
        thumbnailUrl: "",
      },
    ]);
  }

  // 12. AC2 — 자막이 전멸해도 찾은 영상을 버리지 않는다
  it("find_reviews_자막전멸_영상메타데이터는반드시반환", async () => {
    mockOneMatchedVideo();
    vi.mocked(getTranscript).mockRejectedValue(
      new TranscriptError("봇 차단", TranscriptErrorCode.BOT_DETECTED),
    );

    const handler = createProductReviewHandler(YOUTUBE_KEY, COUPANG_ACCESS, COUPANG_SECRET);
    const result = await handler({ action: "find_reviews", query: "에어팟" } as any);
    const text = result.content[0].text;

    // 제목·URL·채널이 살아 있어야 한다
    expect(text).toContain("에어팟 프로 3 솔직 리뷰");
    expect(text).toContain("https://youtube.com/watch?v=vid1");
    expect(text).toContain("@ITSub");
    // 고장을 고장이라고 말한다
    expect(text).toContain(SERVER_TRANSCRIPT_UNAVAILABLE);
    expect(text).toContain(TranscriptErrorCode.BOT_DETECTED);
    // «검색 결과가 없습니다» 단독 오보로 되돌아가면 FAIL
    expect(text).not.toMatch(/^YouTube 리뷰 자막 검색 결과가 없습니다/);
  });

  // 13. AC3 — full_review는 쿠팡 + 영상 메타데이터를 함께 반환하고 전체 실패로 떨어지지 않는다
  it("full_review_자막전멸_쿠팡과영상을함께반환", async () => {
    mockOneMatchedVideo();
    vi.mocked(getTranscript).mockRejectedValue(
      new TranscriptError("봇 차단", TranscriptErrorCode.BOT_DETECTED),
    );
    vi.mocked(searchCoupangProducts).mockResolvedValue({
      query: "에어팟",
      cached: false,
      products: [
        {
          productId: 3,
          productName: "Apple 에어팟 프로 3",
          productPrice: 359000,
          productImage: "https://img.example.com/3.jpg",
          productUrl: "https://coupang.com/vp/products/3",
          isRocket: true,
          isFreeShipping: true,
        },
      ],
    });

    const handler = createProductReviewHandler(YOUTUBE_KEY, COUPANG_ACCESS, COUPANG_SECRET);
    const result = await handler({ action: "full_review", query: "에어팟" } as any);
    const text = result.content[0].text;

    expect(result.isError).toBeUndefined();
    expect(text).toContain("https://coupang.com/vp/products/3"); // 쿠팡 링크 ≥1
    expect(text).toContain("https://youtube.com/watch?v=vid1"); // 영상 ≥1
    expect(text).toContain(SERVER_TRANSCRIPT_UNAVAILABLE); // 자막 불가 사유
  });

  // 14. 자막이 실제로 없는 영상에 서버 차단 안내를 붙이면 그것도 오보다
  it("find_reviews_자막없는영상_서버차단으로오보하지않음", async () => {
    mockOneMatchedVideo();
    vi.mocked(getTranscript).mockRejectedValue(
      new TranscriptError("자막 없음", TranscriptErrorCode.NO_SUBTITLES),
    );

    const handler = createProductReviewHandler(YOUTUBE_KEY, COUPANG_ACCESS, COUPANG_SECRET);
    const result = await handler({ action: "find_reviews", query: "에어팟" } as any);
    const text = result.content[0].text;

    expect(text).toContain("https://youtube.com/watch?v=vid1");
    expect(text).toContain(TranscriptErrorCode.NO_SUBTITLES);
    expect(text).not.toContain(SERVER_TRANSCRIPT_UNAVAILABLE);
  });

  // 15. 계측은 영상 단위가 아니라 요청 단위 1건
  it("find_reviews_계측은요청단위1건", async () => {
    mockOneMatchedVideo();
    vi.mocked(getChannelVideos).mockResolvedValue([
      { videoId: "vid1", title: "에어팟 리뷰 1", description: "", publishedAt: "2026-09-01", channelTitle: "잇섭", thumbnailUrl: "" },
      { videoId: "vid2", title: "에어팟 리뷰 2", description: "", publishedAt: "2026-09-02", channelTitle: "잇섭", thumbnailUrl: "" },
    ]);
    vi.mocked(getTranscript).mockRejectedValue(
      new TranscriptError("봇 차단", TranscriptErrorCode.BOT_DETECTED),
    );

    const before = youtubeTranscriptMetrics.snapshot().product_review;
    const handler = createProductReviewHandler(YOUTUBE_KEY, COUPANG_ACCESS, COUPANG_SECRET);
    await handler({ action: "find_reviews", query: "에어팟" } as any);
    const after = youtubeTranscriptMetrics.snapshot().product_review;

    expect(after.fail).toBe(before.fail + 1); // 영상 2건이어도 1건
    expect(after.byReason[TranscriptErrorCode.BOT_DETECTED] ?? 0)
      .toBe((before.byReason[TranscriptErrorCode.BOT_DETECTED] ?? 0) + 1);
  });
});
