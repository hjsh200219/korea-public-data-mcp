/**
 * E2E: REST API 사용자 필터 → 외부 HTTP 요청 URL 반영 검증
 *
 * Express 라우트에서 받은 쿼리가 각 API 클라이언트의 fetch URL(쿼리스트링)에
 * 기대한 키/값으로 전달되는지 supertest + fetch 모킹으로 검증한다.
 * (원격 기관이 필터를 실제로 적용하는지는 별도 라이브 통합 테스트 영역.)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import express from "express";
import { createApiRouter } from "../api-routes.js";
import type { ServerConfig } from "../config.js";
import { resetThrottleState } from "../http-client.js";

const USD_EXIM_RAW = {
  result: 1,
  cur_unit: "USD",
  deal_bas_r: "1,362",
  cur_nm: "미국 달러",
  ttb: "",
  tts: "",
  bkpr: "",
  yy_efee_r: "",
  ten_dd_efee_r: "",
  kftc_bkpr: "",
  kftc_deal_bas_r: "",
};

const FULL_CONFIG: ServerConfig = {
  lawApiOc: "test-oc",
  dartApiKey: "test-dart",
  data20ServiceKey: "test-data20",
  unipassApiKeys: {
    "015": "unipass-key-015",
    "019": "unipass-key-019",
  },
  eximApiKey: "test-exim",
  mafraApiKey: "test-mafra",
  finlifeApiKey: "test-finlife@content2@",
};

const DATA20_JSON_OK = {
  response: {
    header: { resultCode: "00" },
    body: { totalCount: 0, pageNo: 1, numOfRows: 10, items: {} },
  },
};

const DATA20_XML_OK = `<?xml version="1.0" encoding="UTF-8"?>
<response>
  <header><resultCode>00</resultCode></header>
  <body><totalCount>0</totalCount><pageNo>1</pageNo><numOfRows>10</numOfRows></body>
</response>`;

const UNIPASS_SIMPLE_DRAWBACK_XML = `
<simlXamrttXtrnUserQryRtnVo>
  <ntceInfo><resultCode>00</resultCode></ntceInfo>
  <simlXamrttXtrnUserQryRsltVo>
    <hs10>0201100000</hs10>
    <prutDrwbWncrAmt>500</prutDrwbWncrAmt>
  </simlXamrttXtrnUserQryRsltVo>
</simlXamrttXtrnUserQryRtnVo>`;

const UNIPASS_STATS_XML = `
<statsSgnQryRtnVo>
  <ntceInfo><resultCode>00</resultCode></ntceInfo>
  <statsSgnQryVo>
    <statsSgn>01</statsSgn>
    <koreAbrt>테스트</koreAbrt>
  </statsSgnQryVo>
</statsSgnQryRtnVo>`;

const MAFRA_XML_OK = `<?xml version="1.0"?>
<response><code>INFO-000</code><message>정상</message><totalCnt>0</totalCnt></response>`;

const FINLIFE_JSON_OK = {
  result: {
    err_cd: "000",
    total_count: 0,
    now_page_no: 1,
    max_page_no: 1,
    baseList: [],
    optionList: [],
  },
};

function createTestApp(config: ServerConfig = FULL_CONFIG) {
  const app = express();
  app.use(express.json());
  app.use("/api", createApiRouter(config));
  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    res.status(500).json({ error: err.message });
  });
  return app;
}

async function getRequest(app: express.Express, path: string) {
  const { default: supertest } = await import("supertest");
  return supertest(app).get(path);
}

function firstFetchUrl(): string {
  const mock = globalThis.fetch as ReturnType<typeof vi.fn>;
  expect(mock).toHaveBeenCalled();
  const first = mock.mock.calls[0][0];
  return typeof first === "string" ? first : (first as Request).url;
}

/** fetch를 URL 패턴별로 응답하도록 설정 */
function installSmartFetchMock(): void {
  globalThis.fetch = vi.fn().mockImplementation((input: RequestInfo) => {
    const url = typeof input === "string" ? input : input.url;

    if (url.includes("opendart.fss.or.kr")) {
      return Promise.resolve(
        new Response(JSON.stringify({ status: "000", list: [], total_count: 0 }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
    }

    if (url.includes("apis.data.go.kr") && url.includes("json")) {
      return Promise.resolve(
        new Response(JSON.stringify(DATA20_JSON_OK), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
    }

    if (url.includes("apis.data.go.kr") && (url.includes("xml") || url.includes("pharmacy") || url.includes("hosp"))) {
      return Promise.resolve(
        new Response(DATA20_XML_OK, {
          status: 200,
          headers: { "Content-Type": "application/xml" },
        }),
      );
    }

    if (url.includes("B551182")) {
      return Promise.resolve(
        new Response(DATA20_XML_OK, {
          status: 200,
          headers: { "Content-Type": "application/xml" },
        }),
      );
    }

    if (url.includes("unipass.customs.go.kr")) {
      const body = url.includes("statsSgnQry") ? UNIPASS_STATS_XML : UNIPASS_SIMPLE_DRAWBACK_XML;
      return Promise.resolve(
        new Response(body, {
          status: 200,
          headers: { "Content-Type": "application/xml" },
        }),
      );
    }

    if (url.includes("koreaexim.go.kr")) {
      return Promise.resolve(
        new Response(JSON.stringify([USD_EXIM_RAW]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
    }

    if (url.includes("211.237.50.150")) {
      return Promise.resolve(
        new Response(MAFRA_XML_OK, {
          status: 200,
          headers: { "Content-Type": "application/xml" },
        }),
      );
    }

    if (url.includes("finlife.fss.or.kr")) {
      return Promise.resolve(
        new Response(JSON.stringify(FINLIFE_JSON_OK), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
    }

    if (url.includes("lawSearch.do")) {
      const body = url.includes("target=prec") || url.includes("target%3Dprec")
        ? "<PrecSearch><totalCnt>0</totalCnt></PrecSearch>"
        : "<LawSearch><totalCnt>0</totalCnt></LawSearch>";
      return Promise.resolve(
        new Response(body, {
          status: 200,
          headers: { "Content-Type": "application/xml" },
        }),
      );
    }

    if (url.includes("law.go.kr") || url.includes("lsRlt")) {
      return Promise.resolve(
        new Response("<LawSearch><totalCnt>0</totalCnt></LawSearch>", {
          status: 200,
          headers: { "Content-Type": "application/xml" },
        }),
      );
    }

    return Promise.resolve(new Response("not mocked", { status: 500 }));
  }) as typeof fetch;
}

describe("REST API E2E — 사용자 필터가 상위 요청 URL에 반영됨", () => {
  let fakeNow = 1_704_000_000_000;

  beforeEach(() => {
    vi.restoreAllMocks();
    resetThrottleState();
    fakeNow += 5000;
    vi.spyOn(Date, "now").mockImplementation(() => {
      fakeNow += 2000;
      return fakeNow;
    });
    installSmartFetchMock();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    resetThrottleState();
  });

  describe("법제처", () => {
    it("판례 date_from·date_to·court → prncYd·org", async () => {
      const app = createTestApp();
      const res = await getRequest(
        app,
        "/api/search/cases?query=계약&date_from=20200101&date_to=20201231&court=대법원",
      );
      expect(res.status).toBe(200);
      const url = decodeURIComponent(firstFetchUrl());
      expect(url).toContain("prncYd=20200101~20201231");
      expect(url).toContain("org=대법원");
    });

    it("법령 search_type=full_text → search=2", async () => {
      const app = createTestApp();
      const res = await getRequest(app, "/api/search/laws?query=민법&search_type=full_text");
      expect(res.status).toBe(200);
      const url = firstFetchUrl();
      expect(url).toContain("search=2");
    });
  });

  describe("DART", () => {
    it("공시 pblntf_ty·기간 → list.json 쿼리에 포함", async () => {
      const app = createTestApp();
      const res = await getRequest(
        app,
        "/api/dart/disclosures?bgn_de=20240101&end_de=20241231&pblntf_ty=A",
      );
      expect(res.status).toBe(200);
      const url = firstFetchUrl();
      expect(url).toContain("bgn_de=20240101");
      expect(url).toContain("end_de=20241231");
      expect(url).toContain("pblntf_ty=A");
    });
  });

  describe("공공데이터포털 data20", () => {
    it("약국 Q0·Q1", async () => {
      const app = createTestApp();
      const res = await getRequest(app, "/api/data20/pharmacy?Q0=서울&Q1=강남");
      expect(res.status).toBe(200);
      const url = decodeURIComponent(firstFetchUrl());
      expect(url).toContain("Q0=서울");
      expect(url).toContain("Q1=강남");
    });

    it("병원 yadmNm·sidoCd", async () => {
      const app = createTestApp();
      const res = await getRequest(app, "/api/data20/hospital?yadmNm=서울대&sidoCd=11");
      expect(res.status).toBe(200);
      const url = decodeURIComponent(firstFetchUrl());
      expect(url).toContain("yadmNm=서울대");
      expect(url).toContain("sidoCd=11");
    });

    it("배당 basDt·stckIssuCmpyNm", async () => {
      const app = createTestApp();
      const res = await getRequest(
        app,
        "/api/data20/stock-dividend?basDt=20240102&stckIssuCmpyNm=삼성",
      );
      expect(res.status).toBe(200);
      const url = decodeURIComponent(firstFetchUrl());
      expect(url).toContain("basDt=20240102");
      expect(url).toContain("stckIssuCmpyNm=삼성");
    });

    it("희귀의약품 item_name·entp_name", async () => {
      const app = createTestApp();
      const res = await getRequest(app, "/api/data20/rare-medicine?item_name=약품A&entp_name=제약");
      expect(res.status).toBe(200);
      const url = decodeURIComponent(firstFetchUrl());
      expect(url).toContain("item_name=약품A");
      expect(url).toContain("entp_name=제약");
    });

    it("건강식품 prdlst_nm → prdlst_nm·PRDLST_NM", async () => {
      const app = createTestApp();
      const res = await getRequest(app, "/api/data20/health-food?prdlst_nm=비타민");
      expect(res.status).toBe(200);
      const url = decodeURIComponent(firstFetchUrl());
      expect(url).toContain("prdlst_nm=비타민");
      expect(url).toContain("PRDLST_NM=비타민");
    });

    it("생동성 item_name", async () => {
      const app = createTestApp();
      const res = await getRequest(app, "/api/data20/bio-equivalence?item_name=테스트");
      expect(res.status).toBe(200);
      const url = decodeURIComponent(firstFetchUrl());
      expect(url).toContain("item_name=테스트");
    });

    it("의약품특허 복수 필터", async () => {
      const app = createTestApp();
      const res = await getRequest(
        app,
        "/api/data20/medicine-patent?item_name=한글&item_eng_name=Eng&ingr_name=성분&ingr_eng_name=Ingr",
      );
      expect(res.status).toBe(200);
      const url = decodeURIComponent(firstFetchUrl());
      expect(url).toContain("item_name=한글");
      expect(url).toContain("item_eng_name=Eng");
      expect(url).toContain("ingr_name=성분");
      expect(url).toContain("ingr_eng_name=Ingr");
    });

    it("온비드 물건상세 pbancMngNo", async () => {
      const app = createTestApp();
      const res = await getRequest(app, "/api/data20/onbid-pbanc-cltr-detail?pbancMngNo=PBANC-001");
      expect(res.status).toBe(200);
      const url = firstFetchUrl();
      expect(url).toContain("pbancMngNo=PBANC-001");
    });

    it("온비드 공고목록 사용자 정의 쿼리 키 전달", async () => {
      const app = createTestApp();
      const res = await getRequest(app, "/api/data20/onbid-pbanc-list?CLTR_NM=사무실&pageNo=1");
      expect(res.status).toBe(200);
      const url = decodeURIComponent(firstFetchUrl());
      expect(url).toContain("CLTR_NM=사무실");
    });
  });

  describe("UNI-PASS", () => {
    it("간이환급율 base_date·hs_code → baseDt·hsSgn", async () => {
      const app = createTestApp();
      const res = await getRequest(app, "/api/unipass/simple-drawback?base_date=20260401&hs_code=0201100000");
      expect(res.status).toBe(200);
      const url = firstFetchUrl();
      expect(url).toContain("baseDt=20260401");
      expect(url).toContain("hsSgn=0201100000");
    });

    it("통계부호 code_type·value_name", async () => {
      const app = createTestApp();
      const res = await getRequest(app, "/api/unipass/statistics-code?code_type=HS10&value_name=쇠고기");
      expect(res.status).toBe(200);
      const url = decodeURIComponent(firstFetchUrl());
      expect(url).toContain("statsSgnTp=HS10");
      expect(url).toContain("cdValtValNm=쇠고기");
    });
  });

  describe("수출입은행", () => {
    it("환율 date → searchdate", async () => {
      const app = createTestApp();
      const res = await getRequest(app, "/api/exim/exchange-rate?date=20260403");
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      const url = firstFetchUrl();
      expect(url).toContain("searchdate=20260403");
    });
  });

  describe("농림축산식품부", () => {
    it("수입축산물 import_date·product_code·bl_no", async () => {
      const app = createTestApp();
      const res = await getRequest(
        app,
        "/api/mafra/import-meat?import_date=20240115&product_code=PC01&bl_no=BL123",
      );
      expect(res.status).toBe(200);
      const url = firstFetchUrl();
      expect(url).toContain("IMPORT_DE=20240115");
      expect(url).toContain("PRDLST_CD=PC01");
      expect(url).toContain("BL_NO=BL123");
    });
  });

  describe("금융감독원 FINLIFE", () => {
    it("금융회사 top_fin_grp_no·fin_co_no", async () => {
      const app = createTestApp();
      const res = await getRequest(app, "/api/finlife/companies?top_fin_grp_no=020000&fin_co_no=0010000");
      expect(res.status).toBe(200);
      const url = firstFetchUrl();
      expect(url).toContain("topFinGrpNo=020000");
      expect(url).toContain("finCoNo=0010000");
    });
  });

  describe("금융위 보험", () => {
    it("실손 cmpy_nm·bas_dt", async () => {
      const app = createTestApp();
      const res = await getRequest(
        app,
        "/api/insurance/medical-reimbursement?cmpy_nm=삼성화재&bas_dt=20240101",
      );
      expect(res.status).toBe(200);
      const url = decodeURIComponent(firstFetchUrl());
      expect(url).toContain("cmpyNm=삼성화재");
      expect(url).toContain("basDt=20240101");
    });
  });
});
