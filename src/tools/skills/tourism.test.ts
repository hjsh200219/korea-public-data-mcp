/**
 * tourism skill 테스트 — public_data 확장 액션
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../tourism-api.js", () => ({
  getAreaCode: vi.fn(),
  getCategoryCode: vi.fn(),
  searchAreaBased: vi.fn(),
  searchKeyword: vi.fn(),
  searchLocationBased: vi.fn(),
  searchFestival: vi.fn(),
  searchStay: vi.fn(),
  getDetailCommon: vi.fn(),
  getDetailIntro: vi.fn(),
  getDetailInfo: vi.fn(),
  getDetailImage: vi.fn(),
  getAreaBasedSync: vi.fn(),
  getLdongCode: vi.fn(),
  getLclsSystmCode: vi.fn(),
}));

import {
  getAreaCode, getCategoryCode,
  searchAreaBased, searchKeyword, searchLocationBased,
  searchFestival, searchStay,
  getDetailCommon, getDetailIntro, getDetailInfo, getDetailImage,
  getAreaBasedSync, getLdongCode, getLclsSystmCode,
} from "../../tourism-api.js";
import { createTourismHandler } from "./tourism.js";

const MOCK_KEY = "test-tourism-key";

function makeResult<T>(items: T[]) {
  return { items, totalCount: items.length, pageNo: 1, numOfRows: 10 };
}

describe("tourism skill", () => {
  let handler: ReturnType<typeof createTourismHandler>;

  beforeEach(() => {
    vi.clearAllMocks();
    handler = createTourismHandler(MOCK_KEY);
  });

  it("알수없는action_isError반환", async () => {
    const result = await handler({ action: "nonexistent" } as any);
    expect(result.isError).toBe(true);
  });

  // --- search_tourism_area ---

  it("search_tourism_area_지역목록반환", async () => {
    vi.mocked(searchAreaBased).mockResolvedValue(makeResult([
      { contentid: "1", contenttypeid: "12", title: "경복궁", addr1: "서울 종로구", areacode: "1", cat1: "A", cat2: "A0", cat3: "A00" },
    ]) as any);

    const result = await handler({ action: "search_tourism_area", areaCode: "1" });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("관광정보");
    expect(result.content[0].text).toContain("경복궁");
    expect(searchAreaBased).toHaveBeenCalledWith(MOCK_KEY, expect.objectContaining({ areaCode: "1" }));
  });

  it("search_tourism_area_빈결과", async () => {
    vi.mocked(searchAreaBased).mockResolvedValue(makeResult([]) as any);
    const result = await handler({ action: "search_tourism_area" });
    expect(result.content[0].text).toContain("없");
  });

  it("search_tourism_area_API예외_isError", async () => {
    vi.mocked(searchAreaBased).mockRejectedValue(new Error("timeout"));
    const result = await handler({ action: "search_tourism_area" });
    expect(result.isError).toBe(true);
  });

  // --- search_tourism_keyword ---

  it("search_tourism_keyword_keyword필수", async () => {
    const result = await handler({ action: "search_tourism_keyword" } as any);
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("keyword");
  });

  it("search_tourism_keyword_결과반환", async () => {
    vi.mocked(searchKeyword).mockResolvedValue(makeResult([
      { contentid: "2", contenttypeid: "12", title: "남산타워", addr1: "서울", areacode: "1", cat1: "A", cat2: "A0", cat3: "A00" },
    ]) as any);

    const result = await handler({ action: "search_tourism_keyword", keyword: "남산" });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("남산타워");
    expect(searchKeyword).toHaveBeenCalledWith(MOCK_KEY, expect.objectContaining({ keyword: "남산" }));
  });

  // --- search_tourism_location ---

  it("search_tourism_location_mapX_Y_radius_필수", async () => {
    const r1 = await handler({ action: "search_tourism_location" } as any);
    expect(r1.isError).toBe(true);

    const r2 = await handler({ action: "search_tourism_location", mapX: "126.9" } as any);
    expect(r2.isError).toBe(true);
  });

  it("search_tourism_location_결과반환", async () => {
    vi.mocked(searchLocationBased).mockResolvedValue(makeResult([
      { contentid: "3", contenttypeid: "15", title: "축제A", addr1: "서울", areacode: "1", dist: "300" },
    ]) as any);

    const result = await handler({ action: "search_tourism_location", mapX: "126.9", mapY: "37.5", radius: "1000" });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("축제A");
    expect(result.content[0].text).toContain("300");
    expect(searchLocationBased).toHaveBeenCalledWith(MOCK_KEY, expect.objectContaining({ mapX: "126.9", radius: "1000" }));
  });

  // --- search_tourism_festival ---

  it("search_tourism_festival_eventStartDate_필수", async () => {
    const result = await handler({ action: "search_tourism_festival" } as any);
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("eventStartDate");
  });

  it("search_tourism_festival_결과반환", async () => {
    vi.mocked(searchFestival).mockResolvedValue(makeResult([
      { contentid: "4", contenttypeid: "15", title: "벚꽃축제", addr1: "서울", areacode: "1", eventstartdate: "20250401", eventenddate: "20250430" },
    ]) as any);

    const result = await handler({ action: "search_tourism_festival", eventStartDate: "20250401" });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("벚꽃축제");
    expect(result.content[0].text).toContain("20250401");
  });

  // --- search_tourism_stay ---

  it("search_tourism_stay_결과반환", async () => {
    vi.mocked(searchStay).mockResolvedValue(makeResult([
      { contentid: "5", contenttypeid: "32", title: "그랜드호텔", addr1: "서울", areacode: "1" },
    ]) as any);

    const result = await handler({ action: "search_tourism_stay", areaCode: "1" });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("그랜드호텔");
    expect(searchStay).toHaveBeenCalledWith(MOCK_KEY, expect.objectContaining({ areaCode: "1" }));
  });

  // --- get_tourism_detail ---

  it("get_tourism_detail_contentId_필수", async () => {
    const result = await handler({ action: "get_tourism_detail" } as any);
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("contentId");
  });

  it("get_tourism_detail_common_기본값", async () => {
    vi.mocked(getDetailCommon).mockResolvedValue(makeResult([
      { contentid: "126508", contenttypeid: "12", title: "경복궁", createdtime: "20240101", modifiedtime: "20240101", overview: "조선시대 궁궐" },
    ]) as any);

    const result = await handler({ action: "get_tourism_detail", contentId: "126508" });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("경복궁");
    expect(result.content[0].text).toContain("조선시대 궁궐");
    expect(getDetailCommon).toHaveBeenCalledWith(MOCK_KEY, expect.objectContaining({ contentId: "126508" }));
  });

  it("get_tourism_detail_intro", async () => {
    vi.mocked(getDetailIntro).mockResolvedValue(makeResult([
      { contentid: "126508", contenttypeid: "12", usetime: "09:00~18:00" },
    ]) as any);

    const result = await handler({ action: "get_tourism_detail", contentId: "126508", detailType: "intro", contentTypeId: "12" });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("126508");
    expect(getDetailIntro).toHaveBeenCalled();
  });

  it("get_tourism_detail_info", async () => {
    vi.mocked(getDetailInfo).mockResolvedValue(makeResult([
      { contentid: "126508", contenttypeid: "12", serialnum: "1", infoname: "체험", infotext: "가능" },
    ]) as any);

    const result = await handler({ action: "get_tourism_detail", contentId: "126508", detailType: "info", contentTypeId: "12" });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("체험");
    expect(getDetailInfo).toHaveBeenCalled();
  });

  it("get_tourism_detail_image", async () => {
    vi.mocked(getDetailImage).mockResolvedValue(makeResult([
      { contentid: "126508", imgname: "img1", originimgurl: "http://img.url/1.jpg", smallimageurl: "http://img.url/s1.jpg", serialnum: "1" },
    ]) as any);

    const result = await handler({ action: "get_tourism_detail", contentId: "126508", detailType: "image" });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("http://img.url/1.jpg");
    expect(getDetailImage).toHaveBeenCalled();
  });

  // --- get_tourism_codes ---

  it("get_tourism_codes_area_지역코드반환", async () => {
    vi.mocked(getAreaCode).mockResolvedValue(makeResult([
      { rnum: 1, code: "1", name: "서울" },
    ]) as any);

    const result = await handler({ action: "get_tourism_codes", codeType: "area" });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("서울");
    expect(getAreaCode).toHaveBeenCalled();
  });

  it("get_tourism_codes_category_분류코드반환", async () => {
    vi.mocked(getCategoryCode).mockResolvedValue(makeResult([
      { code: "A01", name: "자연" },
    ]) as any);

    const result = await handler({ action: "get_tourism_codes", codeType: "category" });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("A01");
  });

  it("get_tourism_codes_sync_동기화목록반환", async () => {
    vi.mocked(getAreaBasedSync).mockResolvedValue(makeResult([
      { contentid: "1", contenttypeid: "12", title: "A", createdtime: "20240101", modifiedtime: "20240101" },
    ]) as any);

    const result = await handler({ action: "get_tourism_codes", codeType: "sync" });
    expect(result.isError).toBeUndefined();
    expect(getAreaBasedSync).toHaveBeenCalled();
  });

  it("get_tourism_codes_ldong_법정동코드반환", async () => {
    vi.mocked(getLdongCode).mockResolvedValue(makeResult([
      { code: "1100000000", name: "서울특별시" },
    ]) as any);

    const result = await handler({ action: "get_tourism_codes", codeType: "ldong" });
    expect(result.isError).toBeUndefined();
    expect(getLdongCode).toHaveBeenCalled();
  });

  it("get_tourism_codes_lclssystm_소분류코드반환", async () => {
    vi.mocked(getLclsSystmCode).mockResolvedValue(makeResult([
      { code: "A01", name: "자연관광지" },
    ]) as any);

    const result = await handler({ action: "get_tourism_codes", codeType: "lclssystm" });
    expect(result.isError).toBeUndefined();
    expect(getLclsSystmCode).toHaveBeenCalled();
  });

  it("get_tourism_codes_codeType_기본값_area", async () => {
    vi.mocked(getAreaCode).mockResolvedValue(makeResult([{ rnum: 1, code: "1", name: "서울" }]) as any);
    const result = await handler({ action: "get_tourism_codes" });
    expect(result.isError).toBeUndefined();
    expect(getAreaCode).toHaveBeenCalled();
  });
});
