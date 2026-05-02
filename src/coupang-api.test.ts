import { describe, it, expect, vi, beforeEach } from "vitest";

const { fetchWithRetry } = vi.hoisted(() => ({
  fetchWithRetry: vi.fn(),
}));

vi.mock("./http-client.js", () => ({
  fetchWithRetry,
}));

import {
  formatCoupangDate,
  buildCoupangAuthHeader,
  searchCoupangProducts,
  _resetCoupangCache,
} from "./coupang-api.js";

function mockJsonResponse(payload: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    headers: { get: () => null },
    json: async () => payload,
  } as any;
}

describe("coupang-api", () => {
  beforeEach(() => {
    fetchWithRetry.mockReset();
    _resetCoupangCache();
  });

  // 1. formatCoupangDate
  it("formatCoupangDate_ISO를_쿠팡포맷으로_변환", () => {
    const d = new Date("2026-05-02T10:30:45.123Z");
    expect(formatCoupangDate(d)).toBe("260502T103045Z");
  });

  // 2. buildCoupangAuthHeader HMAC fixture
  it("buildCoupangAuthHeader_HMAC_서명_검증", () => {
    const now = new Date("2026-05-02T10:30:45.123Z");
    const header = buildCoupangAuthHeader(
      "GET",
      "/v2/providers/affiliate_open_api/apis/openapi/products/search",
      "keyword=%EC%97%90%EC%96%B4%ED%94%84%EB%9D%BC%EC%9D%B4%EC%96%B4&limit=10",
      "TEST_ACCESS",
      "TEST_SECRET",
      now,
    );
    expect(header).toContain("3f931eb5d60ab886be43a14c028355a8e72c878ac273142860d5dd84476fe025");
    expect(header).toContain("access-key=TEST_ACCESS");
    expect(header).toContain("signed-date=260502T103045Z");
    expect(header).toContain("algorithm=HmacSHA256");
  });

  // 3. searchCoupangProducts 성공
  it("searchCoupangProducts_성공_상품반환", async () => {
    const productData = [
      {
        productId: 1,
        productName: "에어프라이어",
        productPrice: 59000,
        productImage: "https://image.coupang.com/1.jpg",
        productUrl: "https://link.coupang.com/1",
        isRocket: true,
        isFreeShipping: true,
      },
    ];
    fetchWithRetry.mockResolvedValue(
      mockJsonResponse({ rCode: "0", data: { productData } }),
    );

    const result = await searchCoupangProducts("에어프라이어", "ACCESS", "SECRET", 10);
    expect(result.query).toBe("에어프라이어");
    expect(result.products).toHaveLength(1);
    expect(result.products[0].productName).toBe("에어프라이어");
    expect(result.cached).toBe(false);
    expect(fetchWithRetry).toHaveBeenCalledTimes(1);
  });

  // 4. 키 미설정 에러
  it("searchCoupangProducts_키미설정_에러", async () => {
    await expect(
      searchCoupangProducts("에어프라이어", undefined, undefined),
    ).rejects.toThrow(/쿠팡 파트너스 API 키가 설정되지 않았습니다/);
  });

  // 5. 캐시 히트 — fetch 1회만 호출
  it("searchCoupangProducts_캐시히트_fetch1회", async () => {
    fetchWithRetry.mockResolvedValue(
      mockJsonResponse({ rCode: "0", data: { productData: [] } }),
    );

    await searchCoupangProducts("노트북", "ACCESS", "SECRET");
    const second = await searchCoupangProducts("노트북", "ACCESS", "SECRET");
    expect(second.cached).toBe(true);
    expect(fetchWithRetry).toHaveBeenCalledTimes(1);
  });

  // 6. 429 에러 (maxRetries 소진 후 응답으로 받은 경우)
  it("searchCoupangProducts_429_에러메시지", async () => {
    fetchWithRetry.mockResolvedValue(
      mockJsonResponse({}, false, 429),
    );

    await expect(
      searchCoupangProducts("에어프라이어", "ACCESS", "SECRET"),
    ).rejects.toThrow(/쿠팡 API 호출 한도 초과/);
  });

  // 7. _resetCoupangCache 캐시 클리어
  it("_resetCoupangCache_캐시초기화_후_재요청", async () => {
    fetchWithRetry.mockResolvedValue(
      mockJsonResponse({ rCode: "0", data: { productData: [] } }),
    );

    await searchCoupangProducts("청소기", "ACCESS", "SECRET");
    _resetCoupangCache();
    await searchCoupangProducts("청소기", "ACCESS", "SECRET");
    expect(fetchWithRetry).toHaveBeenCalledTimes(2);
  });

  // 8. productData 매핑 검증
  it("searchCoupangProducts_productData_필드매핑", async () => {
    const raw = {
      productId: 42,
      productName: "테스트상품",
      productPrice: 12000,
      productImage: "https://img/test.jpg",
      productUrl: "https://link/test",
      isRocket: false,
      isFreeShipping: true,
    };
    fetchWithRetry.mockResolvedValue(
      mockJsonResponse({ rCode: "0", data: { productData: [raw] } }),
    );

    const result = await searchCoupangProducts("테스트", "A", "S");
    const p = result.products[0];
    expect(p.productId).toBe(42);
    expect(p.productName).toBe("테스트상품");
    expect(p.productPrice).toBe(12000);
    expect(p.productImage).toBe("https://img/test.jpg");
    expect(p.productUrl).toBe("https://link/test");
    expect(p.isRocket).toBe(false);
    expect(p.isFreeShipping).toBe(true);
  });
});
