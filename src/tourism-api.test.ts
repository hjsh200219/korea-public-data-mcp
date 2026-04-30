/**
 * tourism-api 테스트 — 한국관광공사 KorService2
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { fetchWithRetry } = vi.hoisted(() => ({
  fetchWithRetry: vi.fn(),
}));

vi.mock("./http-client.js", () => ({
  fetchWithRetry,
}));

import {
  getAreaCode,
  getCategoryCode,
  searchAreaBased,
  searchKeyword,
  searchLocationBased,
  searchFestival,
  searchStay,
  getDetailCommon,
  getDetailIntro,
  getDetailInfo,
  getDetailImage,
  getAreaBasedSync,
  getLdongCode,
  getLclsSystmCode,
} from "./tourism-api.js";

const SERVICE_KEY = "test-tourism-key";

function jsonOk(body: Record<string, unknown>) {
  return { ok: true, status: 200, json: async () => body };
}

function tourismResponse(items: unknown[], totalCount = items.length) {
  return jsonOk({
    response: {
      header: { resultCode: "0000", resultMsg: "OK" },
      body: {
        items: { item: items },
        totalCount,
        pageNo: 1,
        numOfRows: 10,
      },
    },
  });
}

function emptyResponse() {
  return jsonOk({
    response: {
      header: { resultCode: "0000", resultMsg: "OK" },
      body: { items: "", totalCount: 0, pageNo: 1, numOfRows: 10 },
    },
  });
}

beforeEach(() => fetchWithRetry.mockReset());
afterEach(() => vi.restoreAllMocks());

// --- getAreaCode ---

describe("getAreaCode", () => {
  it("시도목록_반환", async () => {
    fetchWithRetry.mockResolvedValueOnce(
      tourismResponse([{ rnum: 1, code: "1", name: "서울" }]),
    );
    const result = await getAreaCode(SERVICE_KEY, {});
    expect(result.items).toHaveLength(1);
    expect(result.items[0].name).toBe("서울");
    const url = fetchWithRetry.mock.calls[0][0] as string;
    expect(url).toContain("areaCode2");
    expect(url).toContain("serviceKey=test-tourism-key");
  });

  it("시군구목록_areaCode파라미터포함", async () => {
    fetchWithRetry.mockResolvedValueOnce(
      tourismResponse([{ rnum: 1, code: "1", name: "강남구" }]),
    );
    await getAreaCode(SERVICE_KEY, { areaCode: "1" });
    const url = fetchWithRetry.mock.calls[0][0] as string;
    expect(url).toContain("areaCode=1");
  });

  it("빈결과_빈배열반환", async () => {
    fetchWithRetry.mockResolvedValueOnce(emptyResponse());
    const result = await getAreaCode(SERVICE_KEY, {});
    expect(result.items).toHaveLength(0);
  });

  it("HTTP오류_예외", async () => {
    fetchWithRetry.mockResolvedValueOnce({ ok: false, status: 503, json: async () => ({}) });
    await expect(getAreaCode(SERVICE_KEY, {})).rejects.toThrow(/HTTP 503/);
  });
});

// --- getCategoryCode ---

describe("getCategoryCode", () => {
  it("대분류코드목록_반환", async () => {
    fetchWithRetry.mockResolvedValueOnce(
      tourismResponse([{ code: "A01", name: "자연" }]),
    );
    const result = await getCategoryCode(SERVICE_KEY, {});
    expect(result.items[0].code).toBe("A01");
    const url = fetchWithRetry.mock.calls[0][0] as string;
    expect(url).toContain("categoryCode2");
  });

  it("cat1지정시_URL포함", async () => {
    fetchWithRetry.mockResolvedValueOnce(tourismResponse([]));
    await getCategoryCode(SERVICE_KEY, { cat1: "A01" });
    const url = fetchWithRetry.mock.calls[0][0] as string;
    expect(url).toContain("cat1=A01");
  });
});

// --- searchAreaBased ---

describe("searchAreaBased", () => {
  it("지역기반검색_목록반환", async () => {
    const item = {
      contentid: "126508",
      contenttypeid: "12",
      title: "경복궁",
      addr1: "서울특별시 종로구",
      areacode: "1",
      cat1: "A02",
      cat2: "A0201",
      cat3: "A020101",
    };
    fetchWithRetry.mockResolvedValueOnce(tourismResponse([item]));
    const result = await searchAreaBased(SERVICE_KEY, { areaCode: "1" });
    expect(result.items[0].title).toBe("경복궁");
    const url = fetchWithRetry.mock.calls[0][0] as string;
    expect(url).toContain("areaBasedList2");
    expect(url).toContain("areaCode=1");
  });

  it("단일item_배열정규화", async () => {
    const item = { contentid: "1", contenttypeid: "12", title: "단일", addr1: "", areacode: "1", cat1: "A", cat2: "A0", cat3: "A00" };
    fetchWithRetry.mockResolvedValueOnce(tourismResponse([item]));
    const result = await searchAreaBased(SERVICE_KEY, {});
    expect(Array.isArray(result.items)).toBe(true);
  });
});

// --- searchKeyword ---

describe("searchKeyword", () => {
  it("키워드검색_결과반환", async () => {
    fetchWithRetry.mockResolvedValueOnce(
      tourismResponse([{ contentid: "1", contenttypeid: "12", title: "남산타워", addr1: "서울", areacode: "1", cat1: "A", cat2: "A0", cat3: "A00" }]),
    );
    const result = await searchKeyword(SERVICE_KEY, { keyword: "남산" });
    expect(result.items[0].title).toBe("남산타워");
    const url = fetchWithRetry.mock.calls[0][0] as string;
    expect(url).toContain("searchKeyword2");
    expect(url).toContain("keyword=");
  });
});

// --- searchLocationBased ---

describe("searchLocationBased", () => {
  it("위치기반검색_mapXY포함", async () => {
    fetchWithRetry.mockResolvedValueOnce(
      tourismResponse([{ contentid: "2", contenttypeid: "15", title: "축제A", addr1: "서울", areacode: "1", dist: "500" }]),
    );
    const result = await searchLocationBased(SERVICE_KEY, { mapX: "126.9", mapY: "37.5", radius: "1000" });
    expect(result.items[0].dist).toBe("500");
    const url = fetchWithRetry.mock.calls[0][0] as string;
    expect(url).toContain("locationBasedList2");
    expect(url).toContain("mapX=126.9");
    expect(url).toContain("radius=1000");
  });
});

// --- searchFestival ---

describe("searchFestival", () => {
  it("축제검색_날짜파라미터포함", async () => {
    fetchWithRetry.mockResolvedValueOnce(
      tourismResponse([{ contentid: "3", contenttypeid: "15", title: "벚꽃축제", addr1: "서울", areacode: "1", eventstartdate: "20250401", eventenddate: "20250430" }]),
    );
    const result = await searchFestival(SERVICE_KEY, { eventStartDate: "20250401" });
    expect(result.items[0].title).toBe("벚꽃축제");
    const url = fetchWithRetry.mock.calls[0][0] as string;
    expect(url).toContain("searchFestival2");
    expect(url).toContain("eventStartDate=20250401");
  });
});

// --- searchStay ---

describe("searchStay", () => {
  it("숙박검색_URL확인", async () => {
    fetchWithRetry.mockResolvedValueOnce(
      tourismResponse([{ contentid: "4", contenttypeid: "32", title: "그랜드호텔", addr1: "서울", areacode: "1" }]),
    );
    const result = await searchStay(SERVICE_KEY, { areaCode: "1" });
    expect(result.items[0].title).toBe("그랜드호텔");
    const url = fetchWithRetry.mock.calls[0][0] as string;
    expect(url).toContain("searchStay2");
  });
});

// --- getDetailCommon ---

describe("getDetailCommon", () => {
  it("공통정보조회_단일item반환", async () => {
    fetchWithRetry.mockResolvedValueOnce(
      tourismResponse([{ contentid: "126508", contenttypeid: "12", title: "경복궁", createdtime: "20240101", modifiedtime: "20240101", overview: "조선시대 궁궐" }]),
    );
    const result = await getDetailCommon(SERVICE_KEY, { contentId: "126508" });
    expect(result.items[0].overview).toBe("조선시대 궁궐");
    const url = fetchWithRetry.mock.calls[0][0] as string;
    expect(url).toContain("detailCommon2");
    expect(url).toContain("contentId=126508");
  });
});

// --- getDetailIntro ---

describe("getDetailIntro", () => {
  it("소개정보조회_URL확인", async () => {
    fetchWithRetry.mockResolvedValueOnce(
      tourismResponse([{ contentid: "126508", contenttypeid: "12" }]),
    );
    await getDetailIntro(SERVICE_KEY, { contentId: "126508", contentTypeId: "12" });
    const url = fetchWithRetry.mock.calls[0][0] as string;
    expect(url).toContain("detailIntro2");
    expect(url).toContain("contentId=126508");
    expect(url).toContain("contentTypeId=12");
  });
});

// --- getDetailInfo ---

describe("getDetailInfo", () => {
  it("반복정보조회_URL확인", async () => {
    fetchWithRetry.mockResolvedValueOnce(
      tourismResponse([{ contentid: "126508", contenttypeid: "12", serialnum: "1", infoname: "체험안내", infotext: "체험가능" }]),
    );
    const result = await getDetailInfo(SERVICE_KEY, { contentId: "126508", contentTypeId: "12" });
    expect(result.items[0].infoname).toBe("체험안내");
    const url = fetchWithRetry.mock.calls[0][0] as string;
    expect(url).toContain("detailInfo2");
  });
});

// --- getDetailImage ---

describe("getDetailImage", () => {
  it("이미지정보조회_URL확인", async () => {
    fetchWithRetry.mockResolvedValueOnce(
      tourismResponse([{ contentid: "126508", imgname: "경복궁1", originimgurl: "http://img.url/1.jpg", smallimageurl: "http://img.url/s1.jpg", serialnum: "1" }]),
    );
    const result = await getDetailImage(SERVICE_KEY, { contentId: "126508" });
    expect(result.items[0].originimgurl).toContain("http");
    const url = fetchWithRetry.mock.calls[0][0] as string;
    expect(url).toContain("detailImage2");
    expect(url).toContain("contentId=126508");
  });
});

// --- getAreaBasedSync ---

describe("getAreaBasedSync", () => {
  it("동기화목록조회_URL확인", async () => {
    fetchWithRetry.mockResolvedValueOnce(
      tourismResponse([{ contentid: "1", contenttypeid: "12", title: "A", createdtime: "20240101", modifiedtime: "20240101" }]),
    );
    await getAreaBasedSync(SERVICE_KEY, { areaCode: "1" });
    const url = fetchWithRetry.mock.calls[0][0] as string;
    expect(url).toContain("areaBasedSyncList2");
  });
});

// --- getLdongCode ---

describe("getLdongCode", () => {
  it("법정동코드조회_URL확인", async () => {
    fetchWithRetry.mockResolvedValueOnce(
      tourismResponse([{ code: "1100000000", name: "서울특별시" }]),
    );
    await getLdongCode(SERVICE_KEY, {});
    const url = fetchWithRetry.mock.calls[0][0] as string;
    expect(url).toContain("ldongCode2");
  });
});

// --- getLclsSystmCode ---

describe("getLclsSystmCode", () => {
  it("관광타입소분류코드_URL확인", async () => {
    fetchWithRetry.mockResolvedValueOnce(
      tourismResponse([{ code: "A01", name: "자연관광지" }]),
    );
    await getLclsSystmCode(SERVICE_KEY, {});
    const url = fetchWithRetry.mock.calls[0][0] as string;
    expect(url).toContain("lclsSystmCode2");
  });
});

// --- 에러처리 공통 ---

describe("에러처리", () => {
  it("API오류코드_예외", async () => {
    fetchWithRetry.mockResolvedValueOnce(jsonOk({
      response: {
        header: { resultCode: "0010", resultMsg: "잘못된 요청 파라미터 오류" },
        body: null,
      },
    }));
    await expect(getAreaCode(SERVICE_KEY, {})).rejects.toThrow(/파라미터/);
  });

  it("서비스키오류_예외", async () => {
    fetchWithRetry.mockResolvedValueOnce(jsonOk({
      response: {
        header: { resultCode: "0030", resultMsg: "등록되지 않은 서비스키" },
        body: null,
      },
    }));
    await expect(searchKeyword(SERVICE_KEY, { keyword: "서울" })).rejects.toThrow(/서비스키/);
  });
});
