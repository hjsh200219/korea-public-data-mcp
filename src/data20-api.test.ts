/**
 * data20-api 테스트 — 약국/병원(XML), JSON API, 사업자 진위·상태(POST)
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
  searchRareMedicine,
  searchHealthFood,
  searchBioEquivalence,
  searchMedicinePatent,
  verifyBusiness,
  checkBusinessStatus,
  searchOnbidPbancCltrDetail,
  searchOnbidPbancList,
} from "./data20-api.js";

const SERVICE_KEY = "test-service-key-123";

function jsonResponse(body: Record<string, unknown>, ok = true, status = 200) {
  return {
    ok,
    status,
    json: async () => body,
  };
}

/** 공공데이터 XML 성공 래퍼 — items 안에 item XML 조각 삽입 */
function xmlResponseWithItems(itemInnerXml: string) {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<response>
  <header><resultCode>00</resultCode><resultMsg>NORMAL</resultMsg></header>
  <body>
    <totalCount>1</totalCount>
    <pageNo>1</pageNo>
    <numOfRows>10</numOfRows>
    <items>${itemInnerXml}</items>
  </body>
</response>`;
  return {
    ok: true,
    status: 200,
    text: async () => xml,
  };
}

beforeEach(() => {
  fetchWithRetry.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// --- 약국 (XML) ---

describe("searchPharmacy", () => {
  it("정상응답_약국목록반환", async () => {
    const itemXml = `<item>
      <yadmNm>행복약국</yadmNm>
      <addr>서울시 강남구</addr>
      <telno>02-1234-5678</telno>
      <sidoCdNm>서울</sidoCdNm>
      <sgguCdNm>강남구</sgguCdNm>
      <emdongNm>역삼동</emdongNm>
      <postNo>06234</postNo>
      <clCdNm>약국</clCdNm>
      <XPos>127.0</XPos>
      <YPos>37.5</YPos>
    </item>`;
    fetchWithRetry.mockResolvedValueOnce(xmlResponseWithItems(itemXml));

    const result = await searchPharmacy(SERVICE_KEY, { Q0: "서울", QN: "행복" });

    expect(result.totalCount).toBe(1);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].yadmNm).toBe("행복약국");
    const url = fetchWithRetry.mock.calls[0][0] as string;
    expect(url).toContain("pharmacyInfoService/getParmacyBasisList");
    expect(url).toContain("serviceKey=test-service-key-123");
    expect(url).toContain("Q0=");
  });

  it("단일item_배열로정규화", async () => {
    fetchWithRetry.mockResolvedValueOnce(
      xmlResponseWithItems(
        "<item><yadmNm>단일</yadmNm><addr>a</addr><telno>t</telno><sidoCdNm>s</sidoCdNm><sgguCdNm>g</sgguCdNm><emdongNm>e</emdongNm><postNo>p</postNo><clCdNm>c</clCdNm><XPos>1</XPos><YPos>2</YPos></item>",
      ),
    );

    const result = await searchPharmacy(SERVICE_KEY, {});
    expect(result.items).toHaveLength(1);
    expect(result.items[0].yadmNm).toBe("단일");
  });

  it("API오류코드_예외", async () => {
    const xml = `<?xml version="1.0"?><response><header><resultCode>30</resultCode><resultMsg>키오류</resultMsg></header><body/></response>`;
    fetchWithRetry.mockResolvedValueOnce({ ok: true, status: 200, text: async () => xml });

    await expect(searchPharmacy(SERVICE_KEY, {})).rejects.toThrow(/등록되지 않은 서비스 키/);
  });

  it("HTTP오류_예외", async () => {
    fetchWithRetry.mockResolvedValueOnce({ ok: false, status: 503, text: async () => "" });

    await expect(searchPharmacy(SERVICE_KEY, {})).rejects.toThrow(/HTTP 503/);
  });
});

// --- 병원 (XML) ---

describe("searchHospital", () => {
  it("정상응답_병원목록반환", async () => {
    const itemXml = `<item>
      <yadmNm>테스트병원</yadmNm>
      <addr>경기 수원</addr>
      <telno>031-111-2222</telno>
      <sidoCdNm>경기</sidoCdNm>
      <sgguCdNm>수원시</sgguCdNm>
      <emdongNm>팔달구</emdongNm>
      <postNo>16200</postNo>
      <clCd>01</clCd>
      <clCdNm>상급종합</clCdNm>
      <dgsbjtCdNm>내과</dgsbjtCdNm>
      <XPos>127.1</XPos>
      <YPos>37.2</YPos>
      <hospUrl>http://example.com</hospUrl>
      <estbDd>20000101</estbDd>
      <drTotCnt>10</drTotCnt>
    </item>`;
    fetchWithRetry.mockResolvedValueOnce(xmlResponseWithItems(itemXml));

    const result = await searchHospital(SERVICE_KEY, { yadmNm: "테스트", sidoCd: "11" });

    expect(result.items[0].yadmNm).toBe("테스트병원");
    expect(result.items[0].clCdNm).toBe("상급종합");
    const url = fetchWithRetry.mock.calls[0][0] as string;
    expect(url).toContain("hospInfoServicev2/getHospBasisList");
    expect(url).toContain("yadmNm=");
  });
});

// --- 희귀의약품 (JSON) ---

describe("searchRareMedicine", () => {
  it("정상응답_목록반환", async () => {
    const row = {
      PRODT_NAME: "희귀약",
      MANUF_NAME: "제약",
      MANUFPLACE_NAME: "국내",
      TARGET_DISEASE: "희귀질환",
      GOODS_NAME: "상품",
      APPOINT_DATE: "20240101",
      DEVSTEP_YN: "Y",
      RARITY_DRUG_APPOINT_NO: "R1",
    };
    fetchWithRetry.mockResolvedValueOnce(
      jsonResponse({
        response: {
          header: { resultCode: "00", resultMsg: "OK" },
          body: {
            items: { item: [row] },
            totalCount: 1,
            pageNo: 1,
            numOfRows: 10,
          },
        },
      }),
    );

    const result = await searchRareMedicine(SERVICE_KEY, { item_name: "희귀" });
    expect(result.items).toEqual([row]);
    expect(fetchWithRetry.mock.calls[0][0] as string).toContain("RareMdcinInfoService02");
  });
});

// --- 건강식품 (JSON) ---

describe("searchHealthFood", () => {
  it("정상응답_목록반환", async () => {
    const row = {
      PRDUCT: "비타민",
      ENTRPS: "건강회사",
      STTEMNT_NO: "S1",
      REGIST_DT: "20230101",
      DISTB_PD: "2년",
      MAIN_FNCTN: "영양",
      SRV_USE: "성인",
      INTAKE_HINT1: "1일1회",
    };
    fetchWithRetry.mockResolvedValueOnce(
      jsonResponse({
        response: {
          header: { resultCode: "00" },
          body: {
            items: { item: [row] },
            totalCount: 1,
            pageNo: 1,
            numOfRows: 10,
          },
        },
      }),
    );

    const result = await searchHealthFood(SERVICE_KEY, { prdlst_nm: "비타민" });
    expect(result.items[0].PRDUCT).toBe("비타민");
    expect(fetchWithRetry.mock.calls[0][0] as string).toContain("HtfsInfoService03");
  });
});

// --- 생동성인정품목 ---

describe("searchBioEquivalence", () => {
  it("정상응답_제품목록반환", async () => {
    fetchWithRetry.mockResolvedValueOnce(
      jsonResponse({
        header: { resultCode: "00", resultMsg: "NORMAL SERVICE" },
        body: {
          totalCount: 2,
          pageNo: 1,
          numOfRows: 10,
          items: [
            {
              ITEM_SEQ: "200000001",
              ITEM_NAME: "테스트정",
              ENTP_NAME: "테스트제약",
              INGR_KOR_NAME: "테스트성분",
              INGR_QTY: "100mg",
              SHAPE_CODE_NAME: "정제",
              BIOEQ_PRODT_NOTICE_DATE: "20240101",
            },
            {
              ITEM_SEQ: "200000002",
              ITEM_NAME: "샘플캡슐",
              ENTP_NAME: "샘플제약",
              INGR_KOR_NAME: "샘플성분",
              INGR_QTY: "50mg",
              SHAPE_CODE_NAME: "캡슐",
              BIOEQ_PRODT_NOTICE_DATE: "20240201",
            },
          ],
        },
      }),
    );

    const result = await searchBioEquivalence(SERVICE_KEY, { item_name: "테스트" });

    expect(result.totalCount).toBe(2);
    expect(result.items).toHaveLength(2);
    expect(result.items[0].ITEM_NAME).toBe("테스트정");
    expect(result.items[0].ENTP_NAME).toBe("테스트제약");
  });

  it("데이터없음_빈배열반환", async () => {
    fetchWithRetry.mockResolvedValueOnce(
      jsonResponse({
        header: { resultCode: "00", resultMsg: "NORMAL SERVICE" },
        body: { totalCount: 0, pageNo: 1, numOfRows: 10, items: [] },
      }),
    );

    const result = await searchBioEquivalence(SERVICE_KEY, {});
    expect(result.items).toHaveLength(0);
    expect(result.totalCount).toBe(0);
  });

  it("API오류_에러throw", async () => {
    fetchWithRetry.mockResolvedValueOnce(
      jsonResponse({
        header: { resultCode: "30", resultMsg: "등록되지 않은 서비스 키" },
        body: null,
      }),
    );

    await expect(searchBioEquivalence(SERVICE_KEY, {})).rejects.toThrow("등록되지 않은 서비스 키");
  });

  it("HTTP오류_에러throw", async () => {
    fetchWithRetry.mockResolvedValueOnce(jsonResponse({}, false, 500));

    await expect(searchBioEquivalence(SERVICE_KEY, {})).rejects.toThrow("HTTP 500");
  });

  it("URL에_serviceKey_포함", async () => {
    fetchWithRetry.mockResolvedValueOnce(
      jsonResponse({
        header: { resultCode: "00" },
        body: { totalCount: 0, pageNo: 1, numOfRows: 10, items: [] },
      }),
    );

    await searchBioEquivalence(SERVICE_KEY, { item_name: "발사르탄" });

    const calledUrl = fetchWithRetry.mock.calls[0][0] as string;
    expect(calledUrl).toContain("serviceKey=test-service-key-123");
    expect(calledUrl).toContain("MdcBioEqInfoService01");
    expect(calledUrl).toContain("item_name=%EB%B0%9C%EC%82%AC%EB%A5%B4%ED%83%84");
  });
});

// --- 의약품 특허정보 ---

describe("searchMedicinePatent", () => {
  it("정상응답_특허목록반환", async () => {
    fetchWithRetry.mockResolvedValueOnce(
      jsonResponse({
        header: { resultCode: "00", resultMsg: "NORMAL SERVICE" },
        body: {
          totalCount: 1,
          pageNo: 1,
          numOfRows: 10,
          items: [
            {
              ITEM_SEQ: "300000001",
              ITEM_NAME: "오로살탄정",
              ITEM_ENG_NAME: "Orosartan tablet",
              ENTP_NAME: "동아제약",
              INGR_KOR_NAME: "발사르탄",
              INGR_ENG_NAME: "Valsartan",
              PATENT_NO: "10-1234567",
              PATENT_DATE: "20150101",
              PATENT_EXPIRY_DATE: "20350101",
              DOSAGE_FORM: "정제",
            },
          ],
        },
      }),
    );

    const result = await searchMedicinePatent(SERVICE_KEY, {
      item_name: "오로살탄",
      ingr_name: "발사르탄",
    });

    expect(result.totalCount).toBe(1);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].ITEM_NAME).toBe("오로살탄정");
    expect(result.items[0].PATENT_NO).toBe("10-1234567");
    expect(result.items[0].INGR_ENG_NAME).toBe("Valsartan");
  });

  it("DOMESTIC_필드만있을때_PATENT필드로정규화", async () => {
    fetchWithRetry.mockResolvedValueOnce(
      jsonResponse({
        response: {
          header: { resultCode: "00" },
          body: {
            items: {
              item: [{
                ITEM_SEQ: "201602112",
                ITEM_NAME: "엔트레스토필름코팅정",
                ITEM_ENG_NAME: "Entresto film-coated tablets",
                ENTP_NAME: "한국노바티스(주)",
                INGR_NAME: "사쿠비트릴·발사르탄나트륨염수화물",
                INGR_ENG_NAME: "sacubitril/valsartan",
                DOMESTIC_PATENT_NO: "10-0984939",
                DOMESTIC_END_DATE: "2024-04-04",
                PMS_END_DATE: "-",
                SHAPE: "필름코팅정",
              }],
            },
            totalCount: 1,
            pageNo: 1,
            numOfRows: 10,
          },
        },
      }),
    );

    const result = await searchMedicinePatent(SERVICE_KEY, { item_name: "발사르탄" });

    expect(result.items[0].PATENT_NO).toBe("10-0984939");
    expect(result.items[0].PATENT_EXPIRY_DATE).toBe("2024-04-04");
    expect(result.items[0].INGR_KOR_NAME).toBe("사쿠비트릴·발사르탄나트륨염수화물");
    expect(result.items[0].DOSAGE_FORM).toBe("필름코팅정");
  });

  it("여러검색조건_URL파라미터포함", async () => {
    fetchWithRetry.mockResolvedValueOnce(
      jsonResponse({
        header: { resultCode: "00" },
        body: { totalCount: 0, pageNo: 1, numOfRows: 10, items: [] },
      }),
    );

    await searchMedicinePatent(SERVICE_KEY, {
      ingr_eng_name: "Valsartan",
      item_eng_name: "Orosartan",
      pageNo: 2,
      numOfRows: 20,
    });

    const calledUrl = fetchWithRetry.mock.calls[0][0] as string;
    expect(calledUrl).toContain("MdcinPatentInfoService2");
    expect(calledUrl).toContain("ingr_eng_name=Valsartan");
    expect(calledUrl).toContain("item_eng_name=Orosartan");
    expect(calledUrl).toContain("pageNo=2");
    expect(calledUrl).toContain("numOfRows=20");
  });

  it("데이터없음_빈배열반환", async () => {
    fetchWithRetry.mockResolvedValueOnce(
      jsonResponse({
        header: { resultCode: "00" },
        body: { totalCount: 0, pageNo: 1, numOfRows: 10, items: [] },
      }),
    );

    const result = await searchMedicinePatent(SERVICE_KEY, {});
    expect(result.items).toHaveLength(0);
  });

  it("API오류_에러throw", async () => {
    fetchWithRetry.mockResolvedValueOnce(
      jsonResponse({
        header: { resultCode: "22", resultMsg: "일일 요청 한도 초과" },
        body: null,
      }),
    );

    await expect(searchMedicinePatent(SERVICE_KEY, {})).rejects.toThrow("일일 요청 한도 초과");
  });
});

// --- 온비드 공고물건상세 (B010003 JSON) ---

describe("searchOnbidPbancCltrDetail", () => {
  it("정상응답_목록반환_URL에getPbancCltrInf2", async () => {
    const row = { CLTR_NO: "123", CLTR_NM: "테스트물건", APSL_ASES_AVG_AMT: "100000000" };
    fetchWithRetry.mockResolvedValueOnce(
      jsonResponse({
        response: {
          header: { resultCode: "00", resultMsg: "OK" },
          body: {
            items: { item: [row] },
            totalCount: 1,
            pageNo: 1,
            numOfRows: 10,
          },
        },
      }),
    );

    const result = await searchOnbidPbancCltrDetail(SERVICE_KEY, { pbancMngNo: "202406-21411-00" });

    expect(result.items).toEqual([row]);
    const url = fetchWithRetry.mock.calls[0][0] as string;
    expect(url).toContain("B010003/OnbidPbancCltrDtlSrvc2/getPbancCltrInf2");
    expect(url).toContain("pbancMngNo=202406-21411-00");
    expect(url).toContain("resultType=json");
  });
});

describe("searchOnbidPbancList", () => {
  it("정상응답_추가query병합_URL에getPbancList2", async () => {
    const row = { PBANC_MNG_NO: "202406-21411-00", PBANC_NM: "테스트공고" };
    fetchWithRetry.mockResolvedValueOnce(
      jsonResponse({
        response: {
          header: { resultCode: "00", resultMsg: "OK" },
          body: {
            items: { item: [row] },
            totalCount: 1,
            pageNo: 1,
            numOfRows: 10,
          },
        },
      }),
    );

    const result = await searchOnbidPbancList(SERVICE_KEY, {
      pageNo: 2,
      numOfRows: 5,
      query: { foo: "bar" },
    });

    expect(result.items).toEqual([row]);
    const url = fetchWithRetry.mock.calls[0][0] as string;
    expect(url).toContain("B010003/OnbidPbancListSrvc2/getPbancList2");
    expect(url).toContain("pageNo=2");
    expect(url).toContain("numOfRows=5");
    expect(url).toContain("foo=bar");
    expect(url).toContain("resultType=json");
  });
});

// --- 사업자등록 진위확인 (POST, odcloud) ---

describe("verifyBusiness", () => {
  it("정상응답_data배열반환", async () => {
    const payload = [{ b_no: "1234567890", start_dt: "20000101", p_nm: "홍길동" }];
    const apiRow = {
      b_no: "1234567890",
      valid: "01",
      valid_msg: "유효",
      request_param: {},
      status: {},
    };
    fetchWithRetry.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ data: [apiRow], status_code: "OK" }),
    });

    const result = await verifyBusiness(SERVICE_KEY, payload);

    expect(result).toEqual([apiRow]);
    const url = fetchWithRetry.mock.calls[0][0] as string;
    expect(url).toContain("api.odcloud.kr/api/nts-businessman/v1/validate");
    expect(url).toContain("serviceKey=");
    const opts = fetchWithRetry.mock.calls[0][1] as { init?: RequestInit };
    expect(opts.init?.method).toBe("POST");
    expect(opts.init?.body).toBe(JSON.stringify({ businesses: payload }));
  });

  it("status_code비OK_예외", async () => {
    fetchWithRetry.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status_code: "ERROR", data: [] }),
    });

    await expect(verifyBusiness(SERVICE_KEY, [])).rejects.toThrow(/진위확인 오류/);
  });

  it("HTTP오류_예외", async () => {
    fetchWithRetry.mockResolvedValueOnce({ ok: false, status: 400, json: async () => ({}) });

    await expect(verifyBusiness(SERVICE_KEY, [])).rejects.toThrow(/HTTP 400/);
  });
});

// --- 사업자등록 상태조회 (POST) ---

describe("checkBusinessStatus", () => {
  it("정상응답_data배열반환", async () => {
    const numbers = ["1234567890"];
    const apiRow = {
      b_no: "1234567890",
      b_stt: "계속사업자",
      b_stt_cd: "01",
      tax_type: "일반",
      tax_type_cd: "01",
      end_dt: "",
      utcc_yn: "N",
      tax_type_change_dt: "",
      invoice_apply_dt: "",
    };
    fetchWithRetry.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [apiRow], status_code: "OK" }),
    });

    const result = await checkBusinessStatus(SERVICE_KEY, numbers);

    expect(result).toEqual([apiRow]);
    const url = fetchWithRetry.mock.calls[0][0] as string;
    expect(url).toContain("api.odcloud.kr/api/nts-businessman/v1/status");
    const opts = fetchWithRetry.mock.calls[0][1] as { init?: RequestInit };
    expect(opts.init?.body).toBe(JSON.stringify({ b_no: numbers }));
  });

  it("status_code비OK_예외", async () => {
    fetchWithRetry.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status_code: "FAIL" }),
    });

    await expect(checkBusinessStatus(SERVICE_KEY, ["1"])).rejects.toThrow(/상태조회 오류/);
  });
});
