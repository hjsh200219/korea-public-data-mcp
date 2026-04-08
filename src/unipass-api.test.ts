import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  buildUnipassUrl,
  parseUnipassXml,
  getCargoTracking,
  getContainerInfo,
  verifyImportDeclaration,
  searchHsCode,
  getTariffRate,
  getCustomsExchangeRates,
  searchCompany,
  searchBroker,
  getInspectionInfo,
  getArrivalReport,
  searchAnimalPlantCompany,
  getBondedAreaStorage,
  getTaxPaymentInfo,
  getExportPerformance,
  getImportRequirement,
  getShedInfo,
  getForwarderList,
  getForwarderDetail,
  getAirlineList,
  getAirlineDetail,
  getOverseasSupplier,
  getBrokerDetail,
  getSimpleDrawbackRate,
  getSimpleDrawbackCompany,
  getExportPeriodShortTarget,
  getStatisticsCode,
  getBondedTransportVehicle,
  getPortEntryExit,
  getSingleWindowHistory,
  getShipCompanyList,
  getShipCompanyDetail,
  getCustomsCheckItems,
  getPostalCustoms,
  getAttachmentSubmitStatus,
  getReimportExportBalance,
  verifyExportDeclaration,
  getExportByVehicle,
  getPostalClearance,
  getUnloadingDeclarations,
  getSeaDeparturePermit,
  getAirDeparturePermit,
  getReexportDutyFreeBalance,
  getHsCodeNavigation,
  getAirArrivalReport,
  getReexportDeadline,
  getReexportCompletion,
  getBondedRelease,
  getCollateralRelease,
  getEcommerceExportLoad,
  getDeclarationCorrection,
  getLoadingInspection,
  getBondedTransportInfo,
} from "./unipass-api.js";

// --- buildUnipassUrl ---

describe("buildUnipassUrl", () => {
  it("buildUnipassUrl_apiKey와path_올바른URL생성", () => {
    const keys = { "001": "testkey123" };
    const url = buildUnipassUrl(keys, "001", "/cargCsclPrgsInfoQry", {
      mblNo: "BL123",
    });

    expect(url).toContain("https://unipass.customs.go.kr:38010/ext/rest/cargCsclPrgsInfoQry");
    expect(url).toContain("crkyCn=testkey123");
    expect(url).toContain("mblNo=BL123");
  });

  it("buildUnipassUrl_키없는API_에러발생", () => {
    const keys = { "001": "key" };
    expect(() => buildUnipassUrl(keys, "999", "/path")).toThrow(
      "UNIPASS_KEY_API999"
    );
  });

  it("buildUnipassUrl_파라미터없이_기본URL생성", () => {
    const keys = { "012": "ratekey" };
    const url = buildUnipassUrl(keys, "012", "/trifFxrtInfoQry");

    expect(url).toContain("/trifFxrtInfoQry");
    expect(url).toContain("crkyCn=ratekey");
  });
});

// --- parseUnipassXml ---

describe("parseUnipassXml", () => {
  it("parseUnipassXml_유효한XML_객체반환", () => {
    const xml = `<root><item><name>test</name></item></root>`;
    const result = parseUnipassXml(xml);
    expect(result).toHaveProperty("root");
  });

  it("parseUnipassXml_잘못된XML_에러발생", () => {
    expect(() => parseUnipassXml("<invalid><unclosed>")).toThrow();
  });
});

// --- API 함수들 (fetch mock) ---

const VALID_KEYS: Record<string, string> = {
  "001": "k001",
  "002": "k002",
  "003": "k003",
  "004": "k004",
  "005": "k005",
  "006": "k006",
  "007": "k007",
  "008": "k008",
  "009": "k009",
  "010": "k010",
  "011": "k011",
  "012": "k012",
  "013": "k013",
  "014": "k014",
  "015": "k015",
  "016": "k016",
  "017": "k017",
  "018": "k018",
  "019": "k019",
  "020": "k020",
  "021": "k021",
  "022": "k022",
  "023": "k023",
  "024": "k024",
  "025": "k025",
  "026": "k026",
  "027": "k027",
  "029": "k029",
  "030": "k030",
  "031": "k031",
  "032": "k032",
  "033": "k033",
  "034": "k034",
  "035": "k035",
  "036": "k036",
  "037": "k037",
  "038": "k038",
  "039": "k039",
  "040": "k040",
  "042": "k042",
  "043": "k043",
  "044": "k044",
  "045": "k045",
  "046": "k046",
  "047": "k047",
  "048": "k048",
  "049": "k049",
  "050": "k050",
  "051": "k051",
  "052": "k052",
  "053": "k053",
  "054": "k054",
};

beforeEach(() => {
  vi.restoreAllMocks();
});

function mockFetchXml(xml: string) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(xml),
    })
  );
}

function mockFetchError() {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockRejectedValue(new Error("network"))
  );
}

// --- getCargoTracking (API001) ---

describe("getCargoTracking", () => {
  it("getCargoTracking_정상응답_결과배열반환", async () => {
    mockFetchXml(`
      <cargCsclPrgsInfoQryRtnVo>
        <ntceInfo><resultCode>00</resultCode></ntceInfo>
        <cargCsclPrgsInfoQryVo>
          <cargMtNo>CM001</cargMtNo>
          <prgsStts>반입</prgsStts>
          <prgsSttsCd>01</prgsSttsCd>
          <csclPrgsDate>20260401</csclPrgsDate>
        </cargCsclPrgsInfoQryVo>
      </cargCsclPrgsInfoQryRtnVo>
    `);

    const result = await getCargoTracking(VALID_KEYS, "BL123");
    expect(result).toHaveLength(1);
    expect(result[0].cargMtNo).toBe("CM001");
    expect(result[0].prgsStts).toBe("반입");
  });

  it("getCargoTracking_네트워크에러_throw", async () => {
    mockFetchError();
    await expect(getCargoTracking(VALID_KEYS, "BL123")).rejects.toThrow("UNI-PASS");
  });
});

// --- getContainerInfo (API020) ---

describe("getContainerInfo", () => {
  it("getContainerInfo_정상응답_컨테이너목록반환", async () => {
    mockFetchXml(`
      <cntrQryBrkdQryRtnVo>
        <ntceInfo><resultCode>00</resultCode></ntceInfo>
        <cntrQryBrkdQryRsltVo>
          <cntrNo>ABCD1234567</cntrNo>
          <cntrSzCd>40</cntrSzCd>
          <sealNo>SEAL001</sealNo>
        </cntrQryBrkdQryRsltVo>
      </cntrQryBrkdQryRtnVo>
    `);

    const result = await getContainerInfo(VALID_KEYS, "BL123");
    expect(result).toHaveLength(1);
    expect(result[0].cntrNo).toBe("ABCD1234567");
  });
});

// --- verifyImportDeclaration (API022) ---

describe("verifyImportDeclaration", () => {
  it("verifyImportDeclaration_정상응답_신고정보반환", async () => {
    mockFetchXml(`
      <impDclrCrfnVrfcQryRtnVo>
        <ntceInfo><resultCode>00</resultCode></ntceInfo>
        <impDclrCrfnVrfcQryRsltVo>
          <dclrNo>12345678901234</dclrNo>
          <dclrDt>20260401</dclrDt>
          <dclrSttsCd>02</dclrSttsCd>
          <dclrSttsNm>수리</dclrSttsNm>
          <blNo>BL001</blNo>
          <trdnNm>테스트무역</trdnNm>
          <hsSgn>0201100000</hsSgn>
          <wght>1000</wght>
          <gcnt>10</gcnt>
        </impDclrCrfnVrfcQryRsltVo>
      </impDclrCrfnVrfcQryRtnVo>
    `);

    const result = await verifyImportDeclaration(VALID_KEYS, "12345678901234");
    expect(result).not.toBeNull();
    expect(result!.dclrNo).toBe("12345678901234");
    expect(result!.trdnNm).toBe("테스트무역");
  });

  it("verifyImportDeclaration_에러코드_null반환", async () => {
    mockFetchXml(`
      <impDclrCrfnVrfcQryRtnVo>
        <ntceInfo><resultCode>99</resultCode></ntceInfo>
      </impDclrCrfnVrfcQryRtnVo>
    `);
    const result = await verifyImportDeclaration(VALID_KEYS, "BAD");
    expect(result).toBeNull();
  });
});

// --- searchHsCode (API018) ---

describe("searchHsCode", () => {
  it("searchHsCode_정상응답_HS코드목록반환", async () => {
    mockFetchXml(`
      <hsSgnSrchRtnVo>
        <ntceInfo><resultCode>00</resultCode></ntceInfo>
        <hsSgnSrchRsltVo>
          <hsSgn>0201100000</hsSgn>
          <korePrnm>소의 도체와 이분도체(신선 또는 냉장한 것)</korePrnm>
          <englPrnm>Carcasses and half-carcasses</englPrnm>
          <txrt>40</txrt>
          <txtpSgn>A</txtpSgn>
          <wghtUt>KG</wghtUt>
        </hsSgnSrchRsltVo>
      </hsSgnSrchRtnVo>
    `);

    const result = await searchHsCode(VALID_KEYS, "0201");
    expect(result).toHaveLength(1);
    expect(result[0].hsSgn).toBe("0201100000");
    expect(result[0].korePrnm).toContain("소의 도체");
  });
});

// --- getTariffRate (API030) ---

describe("getTariffRate", () => {
  it("getTariffRate_정상응답_관세율목록반환", async () => {
    mockFetchXml(`
      <trrtQryRtnVo>
        <ntceInfo><resultCode>00</resultCode></ntceInfo>
        <trrtQryRsltVo>
          <hsSgn>0201100000</hsSgn>
          <trrt>40</trrt>
          <trrtTpcd>A</trrtTpcd>
          <trrtTpNm>기본세율</trrtTpNm>
          <aplyStrtDt>20260101</aplyStrtDt>
          <aplyEndDt>20261231</aplyEndDt>
        </trrtQryRsltVo>
      </trrtQryRtnVo>
    `);

    const result = await getTariffRate(VALID_KEYS, "0201100000");
    expect(result).toHaveLength(1);
    expect(result[0].trrt).toBe("40");
    expect(result[0].trrtTpNm).toBe("기본세율");
  });

  it("getTariffRate_결과없음_빈배열반환", async () => {
    mockFetchXml(`
      <trrtQryRtnVo>
        <ntceInfo><resultCode>99</resultCode></ntceInfo>
      </trrtQryRtnVo>
    `);
    const result = await getTariffRate(VALID_KEYS, "BAD");
    expect(result).toHaveLength(0);
  });
});

// --- getCustomsExchangeRates (API012) ---

describe("getCustomsExchangeRates", () => {
  it("getCustomsExchangeRates_정상응답_환율목록반환", async () => {
    mockFetchXml(`
      <trifFxrtInfoQryRtnVo>
        <ntceInfo><resultCode>00</resultCode></ntceInfo>
        <trifFxrtInfoQryRsltVo>
          <currSgn>USD</currSgn>
          <fxrt>1350.00</fxrt>
          <aplyBgnDt>20260401</aplyBgnDt>
          <mtryUtNm>US Dollar</mtryUtNm>
          <cntySgn>US</cntySgn>
          <imexTp>1</imexTp>
        </trifFxrtInfoQryRsltVo>
      </trifFxrtInfoQryRtnVo>
    `);

    const result = await getCustomsExchangeRates(VALID_KEYS);
    expect(result.rates).toHaveLength(1);
    expect(result.rates[0].currSgn).toBe("USD");
    expect(result.rates[0].fxrt).toBe("1350.00");
    expect(result.rates[0].mtryUtNm).toBe("US Dollar");
    expect(result.isFallback).toBe(false);
  });
});

// --- searchCompany (API010) ---

describe("searchCompany", () => {
  it("searchCompany_정상응답_업체목록반환", async () => {
    mockFetchXml(`
      <ecmQryRtnVo>
        <ntceInfo><resultCode>00</resultCode></ntceInfo>
        <ecmQryRsltVo>
          <ecm>테스트무역1901011</ecm>
          <conmNm>테스트무역(주)</conmNm>
          <bsnsNo>1234567890</bsnsNo>
          <rppnNm>홍길동</rppnNm>
          <bslcBscsAddr>서울시 강남구</bslcBscsAddr>
          <rprsTelno>02-1234-5678</rprsTelno>
          <useYn>Y</useYn>
        </ecmQryRsltVo>
      </ecmQryRtnVo>
    `);

    const result = await searchCompany(VALID_KEYS, "테스트무역");
    expect(result).toHaveLength(1);
    expect(result[0].conmNm).toBe("테스트무역(주)");
    expect(result[0].ecm).toBe("테스트무역1901011");
  });
});

// --- searchBroker (API013) ---

describe("searchBroker", () => {
  it("searchBroker_정상응답_관세사목록반환", async () => {
    mockFetchXml(`
      <lcaLstInfoQryRtnVo>
        <ntceInfo><resultCode>00</resultCode></ntceInfo>
        <lcaLstInfoQryRsltVo>
          <lcaSgn>66964</lcaSgn>
          <lcaNm>홍길동</lcaNm>
          <cstmSgn>082</cstmSgn>
          <cstmNm>전주세관</cstmNm>
        </lcaLstInfoQryRsltVo>
      </lcaLstInfoQryRtnVo>
    `);

    const result = await searchBroker(VALID_KEYS, "홍길동");
    expect(result).toHaveLength(1);
    expect(result[0].lcaNm).toBe("홍길동");
    expect(result[0].cstmNm).toBe("전주세관");
  });
});

// --- getInspectionInfo (API004) ---

describe("getInspectionInfo", () => {
  it("정상응답_검사검역결과반환", async () => {
    mockFetchXml(`
      <xtrnUserInscQuanBrkdQryRtnVo>
        <ntceInfo><resultCode>00</resultCode></ntceInfo>
        <xtrnUserInscQuanBrkdQryRsltVo>
          <inqrRsltCd>01</inqrRsltCd>
          <inqrRsltNm>합격</inqrRsltNm>
          <inqrDt>20260401</inqrDt>
        </xtrnUserInscQuanBrkdQryRsltVo>
      </xtrnUserInscQuanBrkdQryRtnVo>
    `);

    const result = await getInspectionInfo(VALID_KEYS, "BL123");
    expect(result).toHaveLength(1);
    expect(result[0].inqrRsltNm).toBe("합격");
    expect(result[0].inqrDt).toBe("20260401");
  });

  it("네트워크에러_throw", async () => {
    mockFetchError();
    await expect(getInspectionInfo(VALID_KEYS, "BL123")).rejects.toThrow("UNI-PASS");
  });
});

// --- getArrivalReport (API021) ---

describe("getArrivalReport", () => {
  it("정상응답_입항보고반환", async () => {
    mockFetchXml(`
      <etprRprtQryBrkdQryRtnVo>
        <ntceInfo><resultCode>00</resultCode></ntceInfo>
        <etprRprtQryBrkdQryRsltVo>
          <vydfNm>HANJIN BUSAN</vydfNm>
          <etprCstm>부산세관</etprCstm>
          <etprDt>20260401</etprDt>
          <msrm>MBLTEST001</msrm>
        </etprRprtQryBrkdQryRsltVo>
      </etprRprtQryBrkdQryRtnVo>
    `);

    const result = await getArrivalReport(VALID_KEYS, "BL123");
    expect(result).toHaveLength(1);
    expect(result[0].vydfNm).toBe("HANJIN BUSAN");
    expect(result[0].etprCstm).toBe("부산세관");
  });

  it("에러코드_빈배열반환", async () => {
    mockFetchXml(`
      <etprRprtQryBrkdQryRtnVo>
        <ntceInfo><resultCode>99</resultCode></ntceInfo>
      </etprRprtQryBrkdQryRtnVo>
    `);
    const result = await getArrivalReport(VALID_KEYS, "BAD");
    expect(result).toEqual([]);
  });
});

// --- searchAnimalPlantCompany (API033) ---

describe("searchAnimalPlantCompany", () => {
  it("정상응답_업체목록반환", async () => {
    mockFetchXml(`
      <alspEntsCdQryRtnVo>
        <ntceInfo><resultCode>00</resultCode></ntceInfo>
        <alspEntsCdQryRsltVo>
          <bsntNm>테스트축산</bsntNm>
          <bsntCd>AP001</bsntCd>
          <bsntAddr>경기도 이천시</bsntAddr>
        </alspEntsCdQryRsltVo>
      </alspEntsCdQryRtnVo>
    `);

    const result = await searchAnimalPlantCompany(VALID_KEYS, "테스트축산");
    expect(result).toHaveLength(1);
    expect(result[0].bsntNm).toBe("테스트축산");
    expect(result[0].bsntCd).toBe("AP001");
  });

  it("네트워크에러_throw", async () => {
    mockFetchError();
    await expect(searchAnimalPlantCompany(VALID_KEYS, "테스트")).rejects.toThrow("UNI-PASS");
  });
});

// --- getBondedAreaStorage (API047) ---

describe("getBondedAreaStorage", () => {
  it("정상응답_장치기간반환", async () => {
    mockFetchXml(`
      <bdgdFccmShedQryRtnVo>
        <ntceInfo><resultCode>00</resultCode></ntceInfo>
        <bdgdFccmShedQryRsltVo>
          <cargMtNo>CM00001</cargMtNo>
          <strgBgnDt>20260401</strgBgnDt>
          <strgPridExpnDt>20260501</strgPridExpnDt>
          <bndAreaNm>부산신항CY</bndAreaNm>
        </bdgdFccmShedQryRsltVo>
      </bdgdFccmShedQryRtnVo>
    `);

    const result = await getBondedAreaStorage(VALID_KEYS, "CM00001");
    expect(result).toHaveLength(1);
    expect(result[0].bndAreaNm).toBe("부산신항CY");
    expect(result[0].strgPridExpnDt).toBe("20260501");
  });

  it("에러코드_빈배열반환", async () => {
    mockFetchXml(`
      <bdgdFccmShedQryRtnVo>
        <ntceInfo><resultCode>99</resultCode></ntceInfo>
      </bdgdFccmShedQryRtnVo>
    `);
    const result = await getBondedAreaStorage(VALID_KEYS, "BAD");
    expect(result).toEqual([]);
  });
});

// --- getTaxPaymentInfo (API049) ---

describe("getTaxPaymentInfo", () => {
  it("정상응답_납부정보반환", async () => {
    mockFetchXml(`
      <taxMgQryRtnVo>
        <ntceInfo><resultCode>00</resultCode></ntceInfo>
        <taxMgPayYnAndPayDtInfoQryRsltVo>
          <dclrNo>12345678901234</dclrNo>
          <txpymDt>20260405</txpymDt>
          <txpymYn>Y</txpymYn>
          <txpymAmt>1500000</txpymAmt>
        </taxMgPayYnAndPayDtInfoQryRsltVo>
      </taxMgQryRtnVo>
    `);

    const result = await getTaxPaymentInfo(VALID_KEYS, "12345678901234");
    expect(result).toHaveLength(1);
    expect(result[0].txpymYn).toBe("Y");
    expect(result[0].txpymAmt).toBe("1500000");
  });

  it("네트워크에러_throw", async () => {
    mockFetchError();
    await expect(getTaxPaymentInfo(VALID_KEYS, "BAD")).rejects.toThrow("UNI-PASS");
  });
});

// --- getExportPerformance (API002) ---

describe("getExportPerformance", () => {
  it("getExportPerformance_정상응답_결과반환", async () => {
    mockFetchXml(`
      <expDclrNoPrExpFfmnBrkdQryRtnVo>
        <ntceInfo><resultCode>00</resultCode></ntceInfo>
        <expDclrNoPrExpFfmnBrkdQryRsltVo>
          <shpmCmplYn>Y</shpmCmplYn>
          <expDclrNo>E2026001</expDclrNo>
          <sanm>TEST PRODUCT</sanm>
        </expDclrNoPrExpFfmnBrkdQryRsltVo>
      </expDclrNoPrExpFfmnBrkdQryRtnVo>
    `);
    const result = await getExportPerformance(VALID_KEYS, "E2026001");
    expect(result).not.toBeNull();
    expect(result!.shpmCmplYn).toBe("Y");
    expect(result!.expDclrNo).toBe("E2026001");
  });
});

// --- getImportRequirement (API003) ---

describe("getImportRequirement", () => {
  it("getImportRequirement_정상응답_결과반환", async () => {
    mockFetchXml(`
      <xtrnUserReqApreBrkdQryRtnVo>
        <ntceInfo><resultCode>00</resultCode></ntceInfo>
        <xtrnUserImpReqApreBrkdQryRsltVo>
          <reqApreNo>REQ001</reqApreNo>
          <relaFrmlNm>식품안전</relaFrmlNm>
        </xtrnUserImpReqApreBrkdQryRsltVo>
      </xtrnUserReqApreBrkdQryRtnVo>
    `);
    const result = await getImportRequirement(VALID_KEYS, "REQ001", "1");
    expect(result).not.toBeNull();
    expect(result!.reqApreNo).toBe("REQ001");
  });
});

// --- getShedInfo (API005) ---

describe("getShedInfo", () => {
  it("getShedInfo_정상응답_결과반환", async () => {
    mockFetchXml(`
      <shedInfoQryRtnVo>
        <ntceInfo><resultCode>00</resultCode></ntceInfo>
        <shedInfoQryRsltVo>
          <snarSgn>SH001</snarSgn>
          <snarNm>부산항CY</snarNm>
        </shedInfoQryRsltVo>
      </shedInfoQryRtnVo>
    `);
    const result = await getShedInfo(VALID_KEYS, { jrsdCstmCd: "020" });
    expect(result).toHaveLength(1);
    expect(result[0].snarSgn).toBe("SH001");
  });
});

// --- getForwarderList (API006) ---

describe("getForwarderList", () => {
  it("getForwarderList_정상응답_결과반환", async () => {
    mockFetchXml(`
      <frwrLstQryRtnVo>
        <ntceInfo><resultCode>00</resultCode></ntceInfo>
        <frwrLstQryRsltVo>
          <frwrSgn>FW001</frwrSgn>
          <frwrKoreNm>한진포워딩</frwrKoreNm>
        </frwrLstQryRsltVo>
      </frwrLstQryRtnVo>
    `);
    const result = await getForwarderList(VALID_KEYS, "한진");
    expect(result).toHaveLength(1);
    expect(result[0].frwrSgn).toBe("FW001");
  });
});

// --- getForwarderDetail (API007) ---

describe("getForwarderDetail", () => {
  it("getForwarderDetail_정상응답_결과반환", async () => {
    mockFetchXml(`
      <frwrBrkdQryRtnVo>
        <ntceInfo><resultCode>00</resultCode></ntceInfo>
        <frwrBrkdQryRsltVo>
          <frwrSgn>FW001</frwrSgn>
          <koreConmNm>한진포워딩</koreConmNm>
          <telNo>02-1234-5678</telNo>
        </frwrBrkdQryRsltVo>
      </frwrBrkdQryRtnVo>
    `);
    const result = await getForwarderDetail(VALID_KEYS, "FW001");
    expect(result).not.toBeNull();
    expect(result!.koreConmNm).toBe("한진포워딩");
  });
});

// --- getAirlineList (API008) ---

describe("getAirlineList", () => {
  it("getAirlineList_정상응답_결과반환", async () => {
    mockFetchXml(`
      <flcoLstQryRtnVo>
        <ntceInfo><resultCode>00</resultCode></ntceInfo>
        <flcoLstQryRsltVo>
          <flcoSgn>KE</flcoSgn>
          <flcoKoreNm>대한항공</flcoKoreNm>
        </flcoLstQryRsltVo>
      </flcoLstQryRtnVo>
    `);
    const result = await getAirlineList(VALID_KEYS, "대한");
    expect(result).toHaveLength(1);
    expect(result[0].flcoSgn).toBe("KE");
  });
});

// --- getAirlineDetail (API009) ---

describe("getAirlineDetail", () => {
  it("getAirlineDetail_정상응답_결과반환", async () => {
    mockFetchXml(`
      <flcoBrkdQryRtnVo>
        <ntceInfo><resultCode>00</resultCode></ntceInfo>
        <flcoBrkdQryRsltVo>
          <flcoEnglSgn>KE</flcoEnglSgn>
          <flcoKoreConm>대한항공</flcoKoreConm>
          <cntyNm>한국</cntyNm>
        </flcoBrkdQryRsltVo>
      </flcoBrkdQryRtnVo>
    `);
    const result = await getAirlineDetail(VALID_KEYS, "KE");
    expect(result).not.toBeNull();
    expect(result!.flcoKoreConm).toBe("대한항공");
  });
});

// --- getOverseasSupplier (API011) ---

describe("getOverseasSupplier", () => {
  it("getOverseasSupplier_정상응답_결과반환", async () => {
    mockFetchXml(`
      <ovrsSplrSgnQryRtnVo>
        <ntceInfo><resultCode>00</resultCode></ntceInfo>
        <ovrsSplrSgnQryRsltVo>
          <ovrsSplrSgn>OS001</ovrsSplrSgn>
          <splrConm>APPLE INC</splrConm>
          <englCntyNm>USA</englCntyNm>
        </ovrsSplrSgnQryRsltVo>
      </ovrsSplrSgnQryRtnVo>
    `);
    const result = await getOverseasSupplier(VALID_KEYS, "US", "APPLE");
    expect(result).toHaveLength(1);
    expect(result[0].ovrsSplrSgn).toBe("OS001");
  });
});

// --- getBrokerDetail (API014) ---

describe("getBrokerDetail", () => {
  it("getBrokerDetail_정상응답_결과반환", async () => {
    mockFetchXml(`
      <lcaBrkdQryRtnVo>
        <ntceInfo><resultCode>00</resultCode></ntceInfo>
        <lcaBrkdQryRsltVo>
          <lcaSgn>LC001</lcaSgn>
          <lcaConm>ABC관세법인</lcaConm>
          <jrsdCstmNm>서울세관</jrsdCstmNm>
        </lcaBrkdQryRsltVo>
      </lcaBrkdQryRtnVo>
    `);
    const result = await getBrokerDetail(VALID_KEYS, "LC001");
    expect(result).not.toBeNull();
    expect(result!.lcaConm).toBe("ABC관세법인");
  });
});

// --- getSimpleDrawbackRate (API015) ---

describe("getSimpleDrawbackRate", () => {
  it("getSimpleDrawbackRate_정상응답_결과반환", async () => {
    mockFetchXml(`
      <simlXamrttXtrnUserQryRtnVo>
        <ntceInfo><resultCode>00</resultCode></ntceInfo>
        <simlXamrttXtrnUserQryRsltVo>
          <hs10>0201100000</hs10>
          <prutDrwbWncrAmt>500</prutDrwbWncrAmt>
        </simlXamrttXtrnUserQryRsltVo>
      </simlXamrttXtrnUserQryRtnVo>
    `);
    const result = await getSimpleDrawbackRate(VALID_KEYS, { baseDt: "20260401" });
    expect(result).toHaveLength(1);
    expect(result[0].hs10).toBe("0201100000");
  });
});

// --- getSimpleDrawbackCompany (API016) ---

describe("getSimpleDrawbackCompany", () => {
  it("getSimpleDrawbackCompany_정상응답_결과반환", async () => {
    mockFetchXml(`
      <simlFxamtAplyNnaplyEntsQryRtnVo>
        <ntceInfo><resultCode>00</resultCode></ntceInfo>
        <simlFxamtAplyNnaplyEntsQryRsltVo>
          <conm>테스트무역</conm>
          <rgsrCstmNm>서울세관</rgsrCstmNm>
        </simlFxamtAplyNnaplyEntsQryRsltVo>
      </simlFxamtAplyNnaplyEntsQryRtnVo>
    `);
    const result = await getSimpleDrawbackCompany(VALID_KEYS, "1234567890");
    expect(result).not.toBeNull();
    expect(result!.conm).toBe("테스트무역");
  });
});

// --- getExportPeriodShortTarget (API017) ---

describe("getExportPeriodShortTarget", () => {
  it("getExportPeriodShortTarget_정상응답_결과반환", async () => {
    mockFetchXml(`
      <expFfmnPridShrtTrgtPrlstQryRtnVo>
        <ntceInfo><resultCode>00</resultCode></ntceInfo>
        <expFfmnPridShrtTrgtPrlstQryRsltVo>
          <hsSgn>0201100000</hsSgn>
          <prnm>쇠고기</prnm>
        </expFfmnPridShrtTrgtPrlstQryRsltVo>
      </expFfmnPridShrtTrgtPrlstQryRtnVo>
    `);
    const result = await getExportPeriodShortTarget(VALID_KEYS, "0201");
    expect(result).toHaveLength(1);
    expect(result[0].prnm).toBe("쇠고기");
  });
});

// --- getStatisticsCode (API019) ---

describe("getStatisticsCode", () => {
  it("getStatisticsCode_정상응답_결과반환", async () => {
    mockFetchXml(`
      <statsSgnQryRtnVo>
        <ntceInfo><resultCode>00</resultCode></ntceInfo>
        <statsSgnQryVo>
          <statsSgn>UNIT001</statsSgn>
          <koreAbrt>킬로그램</koreAbrt>
        </statsSgnQryVo>
      </statsSgnQryRtnVo>
    `);
    const result = await getStatisticsCode(VALID_KEYS, { statsSgnTp: "1" });
    expect(result).toHaveLength(1);
    expect(result[0].statsSgn).toBe("UNIT001");
  });
});

// --- getBondedTransportVehicle (API023) ---

describe("getBondedTransportVehicle", () => {
  it("getBondedTransportVehicle_정상응답_결과반환", async () => {
    mockFetchXml(`
      <btcoVhclQryRtnVo>
        <ntceInfo><resultCode>00</resultCode></ntceInfo>
        <btcoVhclQryRsltVo>
          <btcoSgn>BT001</btcoSgn>
          <vhclNoSanm>12가3456</vhclNoSanm>
          <useYn>Y</useYn>
        </btcoVhclQryRsltVo>
      </btcoVhclQryRtnVo>
    `);
    const result = await getBondedTransportVehicle(VALID_KEYS, { btcoSgn: "BT001" });
    expect(result).toHaveLength(1);
    expect(result[0].vhclNoSanm).toBe("12가3456");
  });
});

// --- getPortEntryExit (API024) ---

describe("getPortEntryExit", () => {
  it("getPortEntryExit_정상응답_결과반환", async () => {
    mockFetchXml(`
      <ioprRprtBrkdQryRtnVo>
        <ntceInfo><resultCode>00</resultCode></ntceInfo>
        <etprRprtQryBrkdQryVo>
          <shipFlgtNm>HANJIN BUSAN</shipFlgtNm>
          <cstmNm>부산세관</cstmNm>
          <etprDttm>20260401120000</etprDttm>
        </etprRprtQryBrkdQryVo>
      </ioprRprtBrkdQryRtnVo>
    `);
    const result = await getPortEntryExit(VALID_KEYS, { shipCallImoNo: "IMO123", seaFlghIoprTpcd: "1" });
    expect(result).toHaveLength(1);
    expect(result[0].shipFlgtNm).toBe("HANJIN BUSAN");
  });
});

// --- getSingleWindowHistory (API025) ---

describe("getSingleWindowHistory", () => {
  it("getSingleWindowHistory_정상응답_결과반환", async () => {
    mockFetchXml(`
      <apfmPrcsStusQryRtnVo>
        <ntceInfo><resultCode>00</resultCode></ntceInfo>
        <apfmPrcsStusQryVo>
          <reqRqstNo>RQ001</reqRqstNo>
          <elctDocNm>수입신고</elctDocNm>
        </apfmPrcsStusQryVo>
      </apfmPrcsStusQryRtnVo>
    `);
    const result = await getSingleWindowHistory(VALID_KEYS, "RQ001");
    expect(result).toHaveLength(1);
    expect(result[0].reqRqstNo).toBe("RQ001");
  });
});

// --- getShipCompanyList (API026) ---

describe("getShipCompanyList", () => {
  it("getShipCompanyList_정상응답_결과반환", async () => {
    mockFetchXml(`
      <shipCoLstQryRtnVo>
        <ntceInfo><resultCode>00</resultCode></ntceInfo>
        <shipCoLstQryRsltVo>
          <shipCoSgn>SC001</shipCoSgn>
          <shipCoKoreNm>한진해운</shipCoKoreNm>
        </shipCoLstQryRsltVo>
      </shipCoLstQryRtnVo>
    `);
    const result = await getShipCompanyList(VALID_KEYS, "한진");
    expect(result).toHaveLength(1);
    expect(result[0].shipCoSgn).toBe("SC001");
  });
});

// --- getShipCompanyDetail (API027) ---

describe("getShipCompanyDetail", () => {
  it("getShipCompanyDetail_정상응답_결과반환", async () => {
    mockFetchXml(`
      <shipCoBrkdQryRtnVo>
        <ntceInfo><resultCode>00</resultCode></ntceInfo>
        <shipCoBrkdQryRsltVo>
          <shipAgncNm>한진해운</shipAgncNm>
          <cntyNm>한국</cntyNm>
          <brno>1234567890</brno>
        </shipCoBrkdQryRsltVo>
      </shipCoBrkdQryRtnVo>
    `);
    const result = await getShipCompanyDetail(VALID_KEYS, "SC001");
    expect(result).not.toBeNull();
    expect(result!.shipAgncNm).toBe("한진해운");
  });
});

// --- getCustomsCheckItems (API029) ---

describe("getCustomsCheckItems", () => {
  it("getCustomsCheckItems_정상응답_결과반환", async () => {
    mockFetchXml(`
      <CcctLworCdQryRtnVo>
        <ntceInfo><resultCode>00</resultCode></ntceInfo>
        <CcctLworCdQryRsltVo>
          <hsSgn>0201100000</hsSgn>
          <dcerCfrmLworNm>축산물위생관리법</dcerCfrmLworNm>
        </CcctLworCdQryRsltVo>
      </CcctLworCdQryRtnVo>
    `);
    const result = await getCustomsCheckItems(VALID_KEYS, "0201", "1");
    expect(result).toHaveLength(1);
    expect(result[0].dcerCfrmLworNm).toBe("축산물위생관리법");
  });
});

// --- getPostalCustoms (API031) ---

describe("getPostalCustoms", () => {
  it("getPostalCustoms_정상응답_결과반환", async () => {
    mockFetchXml(`
      <psnoPrJrsdCstmQryRtnVo>
        <ntceInfo><resultCode>00</resultCode></ntceInfo>
        <psnoPrJrsdCstmQryRsltVoList>
          <jrsdCstmSgn>020</jrsdCstmSgn>
          <jrsdCstmSgnNm>서울세관</jrsdCstmSgnNm>
        </psnoPrJrsdCstmQryRsltVoList>
      </psnoPrJrsdCstmQryRtnVo>
    `);
    const result = await getPostalCustoms(VALID_KEYS, "06100");
    expect(result).toHaveLength(1);
    expect(result[0].jrsdCstmSgnNm).toBe("서울세관");
  });
});

// --- getAttachmentSubmitStatus (API032) ---

describe("getAttachmentSubmitStatus", () => {
  it("getAttachmentSubmitStatus_정상응답_결과반환", async () => {
    mockFetchXml(`
      <expImpAffcSbmtInfoQryRtnVo>
        <ntceInfo><resultCode>00</resultCode></ntceInfo>
        <expImpAffcSbmtInfoQryRsltVoList>
          <dcshSbmtNo>DS001</dcshSbmtNo>
          <attchSbmtYn>Y</attchSbmtYn>
          <elctDocNm>원산지증명서</elctDocNm>
        </expImpAffcSbmtInfoQryRsltVoList>
      </expImpAffcSbmtInfoQryRtnVo>
    `);
    const result = await getAttachmentSubmitStatus(VALID_KEYS, "01", "DS001");
    expect(result).toHaveLength(1);
    expect(result[0].attchSbmtYn).toBe("Y");
  });
});

// --- getReimportExportBalance (API034) ---

describe("getReimportExportBalance", () => {
  it("getReimportExportBalance_정상응답_결과반환", async () => {
    mockFetchXml(`
      <expCmdtRsqtyInfoQryRtnVo>
        <ntceInfo><resultCode>00</resultCode></ntceInfo>
        <expCmdtRsqtyVoRsltVo>
          <stsz>1000</stsz>
          <rsqty>500</rsqty>
          <drwbYn>Y</drwbYn>
        </expCmdtRsqtyVoRsltVo>
      </expCmdtRsqtyInfoQryRtnVo>
    `);
    const result = await getReimportExportBalance(VALID_KEYS, { expDclrNo: "ED001", expDclrLnNo: "1" });
    expect(result).toHaveLength(1);
    expect(result[0].rsqty).toBe("500");
  });
});

// --- verifyExportDeclaration (API035) ---

describe("verifyExportDeclaration", () => {
  it("verifyExportDeclaration_정상응답_결과반환", async () => {
    mockFetchXml(`
      <expDclrCrfnVrfcQryRsltVo>
        <tCnt>1</tCnt>
        <vrfcRsltCn>일치</vrfcRsltCn>
      </expDclrCrfnVrfcQryRsltVo>
    `);
    const result = await verifyExportDeclaration(VALID_KEYS, {
      expDclrCrfnPblsNo: "P001", expDclrNo: "E001", txprBrno: "1234567890",
      orcyCntyCd: "US", prnm: "TEST", ntwg: "100",
    });
    expect(result).not.toBeNull();
    expect(result!.vrfcRsltCn).toBe("일치");
  });
});

// --- getExportByVehicle (API036) ---

describe("getExportByVehicle", () => {
  it("getExportByVehicle_정상응답_결과반환", async () => {
    mockFetchXml(`
      <expFfmnBrkdCbnoQryRtnVo>
        <ntceInfo><resultCode>00</resultCode></ntceInfo>
        <expFfmnBrkdCbnoQryRsltVo>
          <cbno>VIN123456</cbno>
          <expDclrNo>ED001</expDclrNo>
          <vhclPrgsStts>수출이행</vhclPrgsStts>
        </expFfmnBrkdCbnoQryRsltVo>
      </expFfmnBrkdCbnoQryRtnVo>
    `);
    const result = await getExportByVehicle(VALID_KEYS, { cbno: "VIN123456" });
    expect(result).toHaveLength(1);
    expect(result[0].cbno).toBe("VIN123456");
  });
});

// --- getPostalClearance (API037) ---

describe("getPostalClearance", () => {
  it("getPostalClearance_정상응답_결과반환", async () => {
    mockFetchXml(`
      <psmtCsclPrgsInfoQryRtnVo>
        <ntceInfo><resultCode>00</resultCode></ntceInfo>
        <psmtCsclPrgsInfoQryRsltVo>
          <psmtNo>EMS123</psmtNo>
          <psmtKcd>E</psmtKcd>
          <sendCntyCdNm>미국</sendCntyCdNm>
        </psmtCsclPrgsInfoQryRsltVo>
      </psmtCsclPrgsInfoQryRtnVo>
    `);
    const result = await getPostalClearance(VALID_KEYS, "E", "EMS123");
    expect(result).not.toBeNull();
    expect(result!.psmtNo).toBe("EMS123");
  });
});

// --- getUnloadingDeclarations (API038) ---

describe("getUnloadingDeclarations", () => {
  it("getUnloadingDeclarations_정상응답_결과반환", async () => {
    mockFetchXml(`
      <seaUlvsDclrInfoQryRtnVo>
        <ntceInfo><resultCode>00</resultCode></ntceInfo>
        <seaUlvsDclrInfoQryRsltVo>
          <mrn>MRN001</mrn>
          <shipNm>HANJIN BUSAN</shipNm>
          <ulvsUnairPrcsNm>하선신고</ulvsUnairPrcsNm>
        </seaUlvsDclrInfoQryRsltVo>
      </seaUlvsDclrInfoQryRtnVo>
    `);
    const result = await getUnloadingDeclarations(VALID_KEYS, "20260401", "020");
    expect(result).toHaveLength(1);
    expect(result[0].mrn).toBe("MRN001");
  });
});

// --- getSeaDeparturePermit (API039) ---

describe("getSeaDeparturePermit", () => {
  it("getSeaDeparturePermit_정상응답_결과반환", async () => {
    mockFetchXml(`
      <tkofWrprQryRsltVo>
        <shipFlgtNm>HANJIN BUSAN</shipFlgtNm>
        <tkofDttm>20260401120000</tkofDttm>
      </tkofWrprQryRsltVo>
    `);
    const result = await getSeaDeparturePermit(VALID_KEYS, { ioprSbmtNo: "IO001" });
    expect(result).not.toBeNull();
    expect(result!.shipFlgtNm).toBe("HANJIN BUSAN");
  });
});

// --- getAirDeparturePermit (API040) ---

describe("getAirDeparturePermit", () => {
  it("getAirDeparturePermit_정상응답_결과반환", async () => {
    mockFetchXml(`
      <tkofFlghIoprRsltVo>
        <shipFlgtNm>KE001</shipFlgtNm>
        <airRgsrNo>AIR001</airRgsrNo>
      </tkofFlghIoprRsltVo>
    `);
    const result = await getAirDeparturePermit(VALID_KEYS, { ioprSbmtNo: "IO002" });
    expect(result).not.toBeNull();
    expect(result!.shipFlgtNm).toBe("KE001");
  });
});

// --- getReexportDutyFreeBalance (API042) ---

describe("getReexportDutyFreeBalance", () => {
  it("getReexportDutyFreeBalance_정상응답_결과반환", async () => {
    mockFetchXml(`
      <reexpTxfrFfmnRsqtyQryRtnVo>
        <ntceInfo><resultCode>00</resultCode></ntceInfo>
        <reexpTxfrFfmnRsqtyQryRsltVo>
          <impDclrNo>ID001</impDclrNo>
          <lnNo>1</lnNo>
          <qtyRsqty>50</qtyRsqty>
        </reexpTxfrFfmnRsqtyQryRsltVo>
      </reexpTxfrFfmnRsqtyQryRtnVo>
    `);
    const result = await getReexportDutyFreeBalance(VALID_KEYS, "ID001");
    expect(result).toHaveLength(1);
    expect(result[0].qtyRsqty).toBe("50");
  });
});

// --- getHsCodeNavigation (API043) ---

describe("getHsCodeNavigation", () => {
  it("getHsCodeNavigation_정상응답_결과반환", async () => {
    mockFetchXml(`
      <cmtrStatsQryRtnVo>
        <ntceInfo><resultCode>00</resultCode></ntceInfo>
        <cmtrStatsQryRsltVo>
          <hs10Sgn>0201100000</hs10Sgn>
          <prlstNm>쇠고기</prlstNm>
        </cmtrStatsQryRsltVo>
      </cmtrStatsQryRtnVo>
    `);
    const result = await getHsCodeNavigation(VALID_KEYS, "0201");
    expect(result).toHaveLength(1);
    expect(result[0].hs10Sgn).toBe("0201100000");
  });
});

// --- getAirArrivalReport (API044) ---

describe("getAirArrivalReport", () => {
  it("getAirArrivalReport_정상응답_결과반환", async () => {
    mockFetchXml(`
      <flghEtprRprtBrkdQryRtnVo>
        <ntceInfo><resultCode>00</resultCode></ntceInfo>
        <flghEtprRprtBrkdQryVo>
          <shipFlgtNm>KE001</shipFlgtNm>
          <cstmSgn>020</cstmSgn>
          <etprDttm>20260401120000</etprDttm>
        </flghEtprRprtBrkdQryVo>
      </flghEtprRprtBrkdQryRtnVo>
    `);
    const result = await getAirArrivalReport(VALID_KEYS, { shipFlgtNm: "KE001" });
    expect(result).toHaveLength(1);
    expect(result[0].shipFlgtNm).toBe("KE001");
  });
});

// --- getReexportDeadline (API045) ---

describe("getReexportDeadline", () => {
  it("getReexportDeadline_정상응답_결과반환", async () => {
    mockFetchXml(`
      <reepCndtImpFfmnTmlmInfoQryRtnVo>
        <ntceInfo><resultCode>00</resultCode></ntceInfo>
        <reepCndtImpFfmnTmlmInfoQryRsltVo>
          <xtnsDt>20270401</xtnsDt>
        </reepCndtImpFfmnTmlmInfoQryRsltVo>
      </reepCndtImpFfmnTmlmInfoQryRtnVo>
    `);
    const result = await getReexportDeadline(VALID_KEYS, "ID001", "1");
    expect(result).not.toBeNull();
    expect(result!.xtnsDt).toBe("20270401");
  });
});

// --- getReexportCompletion (API046) ---

describe("getReexportCompletion", () => {
  it("getReexportCompletion_정상응답_결과반환", async () => {
    mockFetchXml(`
      <reexpFfmnCmplRprtPrcsInfoQryRtnVo>
        <ntceInfo><resultCode>00</resultCode></ntceInfo>
        <reexpFfmnCmplRprtPrcsInfoQryRsltVo>
          <reexpFffmnPrcsStcd>02</reexpFffmnPrcsStcd>
          <reexpFfmnLastEnfrDt>20270401</reexpFfmnLastEnfrDt>
        </reexpFfmnCmplRprtPrcsInfoQryRsltVo>
      </reexpFfmnCmplRprtPrcsInfoQryRtnVo>
    `);
    const result = await getReexportCompletion(VALID_KEYS, "ID001", "1");
    expect(result).not.toBeNull();
    expect(result!.reexpFfmnLastEnfrDt).toBe("20270401");
  });
});

// --- getBondedRelease (API048) ---

describe("getBondedRelease", () => {
  it("getBondedRelease_정상응답_결과반환", async () => {
    mockFetchXml(`
      <impCmdtSnarRlseDclrQryRtnVo>
        <ntceInfo><resultCode>00</resultCode></ntceInfo>
        <impCmdtSnarRlseDclrYnRsltVo>
          <rlbrDt>20260405</rlbrDt>
          <rlbrYn>Y</rlbrYn>
        </impCmdtSnarRlseDclrYnRsltVo>
      </impCmdtSnarRlseDclrQryRtnVo>
    `);
    const result = await getBondedRelease(VALID_KEYS, "1234567890");
    expect(result).not.toBeNull();
    expect(result!.rlbrYn).toBe("Y");
  });
});

// --- getCollateralRelease (API050) ---

describe("getCollateralRelease", () => {
  it("getCollateralRelease_정상응답_결과반환", async () => {
    mockFetchXml(`
      <taxMgQryRtnVo>
        <ntceInfo><resultCode>00</resultCode></ntceInfo>
        <taxMgReleRqstPrcsStusInfoQryRsltVo>
          <mgPrcsStcdNm>해제완료</mgPrcsStcdNm>
          <mgAprvDt>20260405</mgAprvDt>
        </taxMgReleRqstPrcsStusInfoQryRsltVo>
      </taxMgQryRtnVo>
    `);
    const result = await getCollateralRelease(VALID_KEYS, "ID001");
    expect(result).not.toBeNull();
    expect(result!.mgPrcsStcdNm).toBe("해제완료");
  });
});

// --- getEcommerceExportLoad (API051) ---

describe("getEcommerceExportLoad", () => {
  it("getEcommerceExportLoad_정상응답_결과반환", async () => {
    mockFetchXml(`
      <elcmExpLoadInfoQryRtnVo>
        <ntceInfo><resultCode>00</resultCode></ntceInfo>
        <elcmExpLoadInfoQryRsltVo>
          <loadCmplYn>Y</loadCmplYn>
        </elcmExpLoadInfoQryRsltVo>
      </elcmExpLoadInfoQryRtnVo>
    `);
    const result = await getEcommerceExportLoad(VALID_KEYS, "EC001");
    expect(result).not.toBeNull();
    expect(result!.loadCmplYn).toBe("Y");
  });
});

// --- getDeclarationCorrection (API052) ---

describe("getDeclarationCorrection", () => {
  it("getDeclarationCorrection_정상응답_결과반환", async () => {
    mockFetchXml(`
      <mdfyPrcsSttsBrkdQryRtnVo>
        <ntceInfo><resultCode>00</resultCode></ntceInfo>
        <mdfyPrcsSttsBrkdQryRsltVoLst>
          <mdfyRqstPrcsStcd>02</mdfyRqstPrcsStcd>
          <mdfyRqstPrcsStcdNm>처리완료</mdfyRqstPrcsStcdNm>
        </mdfyPrcsSttsBrkdQryRsltVoLst>
      </mdfyPrcsSttsBrkdQryRtnVo>
    `);
    const result = await getDeclarationCorrection(VALID_KEYS, {
      dcshSbmtNo: "DS001", imexTpcd: "1", mdfyRqstDgcnt: "1",
    });
    expect(result).not.toBeNull();
    expect(result!.mdfyRqstPrcsStcdNm).toBe("처리완료");
  });
});

// --- getLoadingInspection (API053) ---

describe("getLoadingInspection", () => {
  it("getLoadingInspection_정상응답_결과반환", async () => {
    mockFetchXml(`
      <expLdpInscInfoQryRtnVo>
        <ntceInfo><resultCode>00</resultCode></ntceInfo>
        <expLdpInscInfoQryRsltVo>
          <expInscTrgtYn>Y</expInscTrgtYn>
          <expInscCmplYn>N</expInscCmplYn>
        </expLdpInscInfoQryRsltVo>
      </expLdpInscInfoQryRtnVo>
    `);
    const result = await getLoadingInspection(VALID_KEYS, "ED001");
    expect(result).not.toBeNull();
    expect(result!.expInscTrgtYn).toBe("Y");
  });
});

// --- getBondedTransportInfo (API054) ---

describe("getBondedTransportInfo", () => {
  it("getBondedTransportInfo_정상응답_결과반환", async () => {
    mockFetchXml(`
      <trnpMethAlocPrngApiInfoQryRtnVo>
        <ntceInfo><resultCode>00</resultCode></ntceInfo>
        <trnpMethAlocPrngApiInfoQryRsltVo>
          <alocPrngDclrNo>AP001</alocPrngDclrNo>
          <cntrNo>CNTR001</cntrNo>
        </trnpMethAlocPrngApiInfoQryRsltVo>
      </trnpMethAlocPrngApiInfoQryRtnVo>
    `);
    const result = await getBondedTransportInfo(VALID_KEYS, { qryStrtDt: "20260401", qryEndDt: "20260430" });
    expect(result).toHaveLength(1);
    expect(result[0].alocPrngDclrNo).toBe("AP001");
  });
});
