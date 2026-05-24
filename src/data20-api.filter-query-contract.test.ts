/**
 * 공공데이터포털(data20) 클라이언트 계약: 검색·필터 인자가 HTTP 요청 쿼리스트링에 포함되는지 검증합니다.
 * 원격 기관 API가 해당 파라미터를 존중하는지는 이 테스트 범위가 아닙니다(라이브 검증은 별도).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { fetchWithRetry } = vi.hoisted(() => ({
  fetchWithRetry: vi.fn(),
}));

vi.mock("./http-client.js", () => ({
  fetchWithRetry,
}));

import {
  searchPharmacy,
  searchHospital,
  searchStockDividend,
  searchRareMedicine,
  searchHealthFood,
  searchBioEquivalence,
  searchMedicinePatent,
  searchOnbidPbancCltrDetail,
  searchOnbidPbancList,
} from "./data20-api.js";

const KEY = "contract-test-key";

function xmlOk(itemInner: string) {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<response>
  <header><resultCode>00</resultCode><resultMsg>OK</resultMsg></header>
  <body>
    <totalCount>1</totalCount><pageNo>1</pageNo><numOfRows>10</numOfRows>
    <items>${itemInner}</items>
  </body>
</response>`;
  return { ok: true, status: 200, text: async () => xml };
}

function jsonOk() {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      response: {
        header: { resultCode: "00" },
        body: {
          items: { item: { PRDUCT: "x", ENTRPS: "", STTEMNT_NO: "", REGIST_DT: "", DISTB_PD: "", MAIN_FNCTN: "", SRV_USE: "", INTAKE_HINT1: "" } },
          totalCount: 1,
          pageNo: 1,
          numOfRows: 10,
        },
      },
    }),
  };
}

function firstUrl(): URL {
  const raw = fetchWithRetry.mock.calls[0][0] as string;
  return new URL(raw);
}

beforeEach(() => {
  fetchWithRetry.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("data20-api 검색 필터 → 요청 URL 쿼리 계약", () => {
  it("searchPharmacy_Q0_Q1_QN_QT_전달", async () => {
    fetchWithRetry.mockResolvedValueOnce(
      xmlOk("<item><yadmNm>a</yadmNm><addr>x</addr><telno>t</telno><sidoCdNm>s</sidoCdNm><sgguCdNm>g</sgguCdNm><emdongNm>e</emdongNm><postNo>p</postNo><clCdNm>c</clCdNm><XPos>1</XPos><YPos>2</YPos></item>"),
    );
    await searchPharmacy(KEY, { Q0: "서울", Q1: "강남구", QN: "행복약국", QT: "2" });
    const u = firstUrl();
    expect(u.searchParams.get("Q0")).toBe("서울");
    expect(u.searchParams.get("Q1")).toBe("강남구");
    expect(u.searchParams.get("QN")).toBe("행복약국");
    expect(u.searchParams.get("QT")).toBe("2");
  });

  it("searchPharmacy_raw_sidoCd_sgguCd_전달", async () => {
    fetchWithRetry.mockResolvedValueOnce(
      xmlOk("<item><yadmNm>a</yadmNm><addr>x</addr><telno>t</telno><sidoCdNm>경기</sidoCdNm><sgguCdNm>하남시</sgguCdNm><emdongNm>e</emdongNm><postNo>p</postNo><clCdNm>c</clCdNm><XPos>1</XPos><YPos>2</YPos></item>"),
    );
    await searchPharmacy(KEY, { sidoCd: "310000", sgguCd: "311300" });
    const u = firstUrl();
    expect(u.searchParams.get("sidoCd")).toBe("310000");
    expect(u.searchParams.get("sgguCd")).toBe("311300");
  });

  it("searchHospital_지역·기관명_전달", async () => {
    fetchWithRetry.mockResolvedValueOnce(
      xmlOk("<item><yadmNm>h</yadmNm><addr>a</addr><telno>t</telno><clCdNm>c</clCdNm><dgsbjtCdNm>d</dgsbjtCdNm><drTotCnt>1</drTotCnt></item>"),
    );
    await searchHospital(KEY, {
      yadmNm: "서울대병원",
      sidoCd: "110000",
      sgguCd: "110016",
      clCd: "01",
      dgsbjtCd: "14",
      xPos: "126.9",
      yPos: "37.5",
      radius: "3000",
    });
    const u = firstUrl();
    expect(u.searchParams.get("yadmNm")).toBe("서울대병원");
    expect(u.searchParams.get("sidoCd")).toBe("110000");
    expect(u.searchParams.get("sgguCd")).toBe("110016");
    expect(u.searchParams.get("clCd")).toBe("01");
    expect(u.searchParams.get("dgsbjtCd")).toBe("14");
    expect(u.searchParams.get("xPos")).toBe("126.9");
    expect(u.searchParams.get("yPos")).toBe("37.5");
    expect(u.searchParams.get("radius")).toBe("3000");
  });

  it("searchStockDividend_회사명·기준일·법인등록번호_전달", async () => {
    fetchWithRetry.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        response: {
          header: { resultCode: "00" },
          body: { items: { item: [] }, totalCount: 0, pageNo: 1, numOfRows: 10 },
        },
      }),
    });
    await searchStockDividend(KEY, {
      basDt: "20240101",
      stckIssuCmpyNm: "삼성",
      crno: "110111",
    });
    const u = firstUrl();
    expect(u.searchParams.get("resultType")).toBe("json");
    expect(u.searchParams.get("basDt")).toBe("20240101");
    expect(u.searchParams.get("stckIssuCmpyNm")).toBe("삼성");
    expect(u.searchParams.get("crno")).toBe("110111");
  });

  it("searchRareMedicine_item_name_entp_name_전달", async () => {
    fetchWithRetry.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        response: {
          header: { resultCode: "00" },
          body: { items: { item: [] }, totalCount: 0, pageNo: 1, numOfRows: 10 },
        },
      }),
    });
    await searchRareMedicine(KEY, { item_name: "희귀약", entp_name: "제약" });
    const u = firstUrl();
    expect(u.searchParams.get("type")).toBe("json");
    expect(u.searchParams.get("item_name")).toBe("희귀약");
    expect(u.searchParams.get("entp_name")).toBe("제약");
  });

  it("searchRareMedicine_item_name빈값_쿼리에서제외", async () => {
    fetchWithRetry.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        response: {
          header: { resultCode: "00" },
          body: { items: { item: [] }, totalCount: 0, pageNo: 1, numOfRows: 10 },
        },
      }),
    });
    await searchRareMedicine(KEY, { item_name: "", entp_name: "업체만" });
    const u = firstUrl();
    expect(u.searchParams.has("item_name")).toBe(false);
    expect(u.searchParams.get("entp_name")).toBe("업체만");
  });

  it("searchHealthFood_prdlst_nm과PRDLST_NM_동시전달", async () => {
    fetchWithRetry.mockResolvedValueOnce(jsonOk());
    await searchHealthFood(KEY, { prdlst_nm: "비타민" });
    const u = firstUrl();
    expect(u.searchParams.get("prdlst_nm")).toBe("비타민");
    expect(u.searchParams.get("PRDLST_NM")).toBe("비타민");
  });

  it("searchHealthFood_제품명없음_이름파라미터_미포함", async () => {
    fetchWithRetry.mockResolvedValueOnce(jsonOk());
    await searchHealthFood(KEY, {});
    const u = firstUrl();
    expect(u.searchParams.has("prdlst_nm")).toBe(false);
    expect(u.searchParams.has("PRDLST_NM")).toBe(false);
  });

  it("searchBioEquivalence_item_name_전달", async () => {
    fetchWithRetry.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        response: {
          header: { resultCode: "00" },
          body: { items: { item: [] }, totalCount: 0, pageNo: 1, numOfRows: 10 },
        },
      }),
    });
    await searchBioEquivalence(KEY, { item_name: "생동성" });
    const u = firstUrl();
    expect(u.searchParams.get("item_name")).toBe("생동성");
  });

  it("searchMedicinePatent_네가지이름필드_전달", async () => {
    fetchWithRetry.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        response: {
          header: { resultCode: "00" },
          body: { items: { item: [] }, totalCount: 0, pageNo: 1, numOfRows: 10 },
        },
      }),
    });
    await searchMedicinePatent(KEY, {
      item_name: "아스피린",
      item_eng_name: "aspirin",
      ingr_name: "살리실산",
      ingr_eng_name: "salicylic",
    });
    const u = firstUrl();
    expect(u.searchParams.get("item_name")).toBe("아스피린");
    expect(u.searchParams.get("item_eng_name")).toBe("aspirin");
    expect(u.searchParams.get("ingr_name")).toBe("살리실산");
    expect(u.searchParams.get("ingr_eng_name")).toBe("salicylic");
  });

  it("searchOnbidPbancCltrDetail_pbancMngNo_전달", async () => {
    fetchWithRetry.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        response: {
          header: { resultCode: "00" },
          body: { items: { item: [] }, totalCount: 0, pageNo: 1, numOfRows: 10 },
        },
      }),
    });
    await searchOnbidPbancCltrDetail(KEY, { pbancMngNo: "202406-21411-00" });
    const u = firstUrl();
    expect(u.searchParams.get("pbancMngNo")).toBe("202406-21411-00");
    expect(u.searchParams.get("resultType")).toBe("json");
  });

  it("searchOnbidPbancList_query객체_쿼리에병합", async () => {
    fetchWithRetry.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        response: {
          header: { resultCode: "00" },
          body: { items: { item: [] }, totalCount: 0, pageNo: 1, numOfRows: 5 },
        },
      }),
    });
    await searchOnbidPbancList(KEY, {
      pageNo: 2,
      numOfRows: 5,
      query: { onbidPbancNm: "토지", cltrTypeCd: "01" },
    });
    const u = firstUrl();
    expect(u.searchParams.get("pageNo")).toBe("2");
    expect(u.searchParams.get("numOfRows")).toBe("5");
    expect(u.searchParams.get("onbidPbancNm")).toBe("토지");
    expect(u.searchParams.get("cltrTypeCd")).toBe("01");
  });
});
