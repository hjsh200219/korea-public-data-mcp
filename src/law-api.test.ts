import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  searchLaws,
  getLawDetail,
  searchCases,
  getCaseDetail,
  searchConstitutional,
  getConstitutionalDetail,
  searchInterpretations,
  getInterpretationDetail,
  searchAdminRules,
  getAdminRuleDetail,
  searchOrdinances,
  getOrdinanceDetail,
  searchTreaties,
  getTreatyDetail,
  searchLegalTerms,
  getLegalTermDetail,
  searchEnglishLaws,
  getEnglishLawDetail,
  getCommitteeName,
  searchCommitteeDecisions,
  getCommitteeDecisionDetail,
  searchAdminAppeals,
  getAdminAppealDetail,
  searchOldNewLaw,
  getOldNewLawDetail,
  searchLawSystem,
  getLawSystemDetail,
  searchThreeWayComp,
  getThreeWayCompDetail,
  searchAttachedForms,
  searchLawAbbreviations,
  searchLawChangeHistory,
  getLawArticleSub,
  searchAILegalTerms,
  searchLinkedOrdinances,
  searchAdminRuleOldNew,
  getAdminRuleOldNewDetail,
} from "./law-api.js";

const OC = "test_oc";

// 모듈 레벨 lastRequestTime이 테스트 간 유지되므로 항상 증가하는 값 사용
let fakeNow = 1_000_000_000;

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(Date, "now").mockImplementation(() => {
    fakeNow += 2000;
    return fakeNow;
  });
});

function mockFetchXml(xml: string) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(xml),
    }),
  );
}

function mockFetchHttpError(status: number) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: false,
      status,
      text: () => Promise.resolve(""),
    }),
  );
}

// =========================================================
// searchLaws (법령 검색)
// =========================================================

describe("searchLaws", () => {
  it("searchLaws_정상XML_법령목록반환", async () => {
    mockFetchXml(`
      <LawSearch>
        <totalCnt>1</totalCnt>
        <page>1</page>
        <law>
          <법령일련번호>100000</법령일련번호>
          <법령명한글>민법</법령명한글>
          <법령약칭명>민법</법령약칭명>
          <법령ID>001234</법령ID>
          <공포일자>19580222</공포일자>
          <공포번호>471</공포번호>
          <제개정구분명>전부개정</제개정구분명>
          <소관부처명>법무부</소관부처명>
          <법령구분명>법률</법령구분명>
          <시행일자>19580222</시행일자>
          <현행연혁코드>현행</현행연혁코드>
          <법령상세링크>/lsInfoP.do?lsiSeq=100000</법령상세링크>
        </law>
      </LawSearch>
    `);

    const result = await searchLaws(OC, { query: "민법" });
    expect(result.totalCount).toBe(1);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].id).toBe(100000);
    expect(result.items[0].lawName).toBe("민법");
    expect(result.items[0].departmentName).toBe("법무부");
    expect(result.items[0].lawType).toBe("법률");
    expect(result.items[0].promulgationDate).toBe("19580222");
  });

  it("searchLaws_복수결과_전부파싱", async () => {
    mockFetchXml(`
      <LawSearch>
        <totalCnt>2</totalCnt>
        <page>1</page>
        <law>
          <법령일련번호>100001</법령일련번호>
          <법령명한글>민법</법령명한글>
          <법령약칭명></법령약칭명>
          <법령ID>001</법령ID>
          <공포일자>19580222</공포일자>
          <공포번호>471</공포번호>
          <제개정구분명>전부개정</제개정구분명>
          <소관부처명>법무부</소관부처명>
          <법령구분명>법률</법령구분명>
          <시행일자>19580222</시행일자>
          <현행연혁코드>현행</현행연혁코드>
          <법령상세링크></법령상세링크>
        </law>
        <law>
          <법령일련번호>100002</법령일련번호>
          <법령명한글>민법시행령</법령명한글>
          <법령약칭명></법령약칭명>
          <법령ID>002</법령ID>
          <공포일자>19600101</공포일자>
          <공포번호>1000</공포번호>
          <제개정구분명>제정</제개정구분명>
          <소관부처명>법무부</소관부처명>
          <법령구분명>대통령령</법령구분명>
          <시행일자>19600101</시행일자>
          <현행연혁코드>현행</현행연혁코드>
          <법령상세링크></법령상세링크>
        </law>
      </LawSearch>
    `);

    const result = await searchLaws(OC, { query: "민법" });
    expect(result.totalCount).toBe(2);
    expect(result.items).toHaveLength(2);
    expect(result.items[0].lawName).toBe("민법");
    expect(result.items[1].lawName).toBe("민법시행령");
    expect(result.items[1].lawType).toBe("대통령령");
  });

  it("searchLaws_빈결과_빈배열반환", async () => {
    mockFetchXml("<LawSearch><totalCnt>0</totalCnt><page>1</page></LawSearch>");

    const result = await searchLaws(OC, { query: "존재하지않는법률xyz" });
    expect(result.totalCount).toBe(0);
    expect(result.items).toHaveLength(0);
    expect(result.currentPage).toBe(1);
  });

  it("searchLaws_루트엘리먼트없음_빈결과반환", async () => {
    mockFetchXml("<OtherRoot><data>test</data></OtherRoot>");

    const result = await searchLaws(OC, { query: "민법" });
    expect(result.totalCount).toBe(0);
    expect(result.items).toHaveLength(0);
  });

  it("searchLaws_URL파라미터_올바른구성", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve("<LawSearch><totalCnt>0</totalCnt></LawSearch>"),
    });
    vi.stubGlobal("fetch", fetchMock);

    await searchLaws(OC, { query: "민법", display: 10, page: 2, sort: "date" });

    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain("OC=test_oc");
    expect(calledUrl).toContain("target=law");
    expect(calledUrl).toContain("type=XML");
    expect(calledUrl).toContain("display=10");
    expect(calledUrl).toContain("page=2");
    expect(calledUrl).toContain("sort=date");
  });

  it("searchLaws_HTTP에러_예외발생", async () => {
    mockFetchHttpError(400);
    await expect(searchLaws(OC, { query: "민법" })).rejects.toThrow("HTTP 400");
  });
});

// =========================================================
// getLawDetail (법령 상세)
// =========================================================

describe("getLawDetail", () => {
  it("getLawDetail_정상XML_법령상세반환", async () => {
    mockFetchXml(`
      <법령>
        <기본정보>
          <법령ID>LAW1234</법령ID>
          <법령명_한글>민법</법령명_한글>
          <법종구분>법률</법종구분>
          <소관부처>법무부</소관부처>
          <시행일자>19580222</시행일자>
          <공포일자>19580222</공포일자>
          <공포번호>471</공포번호>
          <제개정구분>전부개정</제개정구분>
        </기본정보>
        <조문>
          <조문단위>
            <조문여부>조문</조문여부>
            <조문번호>1</조문번호>
            <조문제목>법원</조문제목>
            <조문내용>민사에 관하여 법률에 규정이 없으면 관습법에 의하고 관습법이 없으면 조리에 의한다.</조문내용>
          </조문단위>
          <조문단위>
            <조문여부>조문</조문여부>
            <조문번호>2</조문번호>
            <조문제목>신의성실</조문제목>
            <조문내용>권리의 행사와 의무의 이행은 신의에 좇아 성실히 하여야 한다.</조문내용>
          </조문단위>
        </조문>
      </법령>
    `);

    const result = await getLawDetail(OC, 100000);
    expect(result.lawId).toBe("LAW1234");
    expect(result.lawName).toBe("민법");
    expect(result.lawType).toBe("법률");
    expect(result.departmentName).toBe("법무부");
    expect(result.articles).toHaveLength(2);
    expect(result.articles[0].articleNumber).toBe("1");
    expect(result.articles[0].articleTitle).toBe("법원");
    expect(result.articles[0].articleContent).toContain("민사에 관하여");
    expect(result.articles[1].articleNumber).toBe("2");
  });

  it("getLawDetail_HTML태그포함_스트립처리", async () => {
    mockFetchXml(`
      <법령>
        <기본정보>
          <법령ID>001</법령ID>
          <법령명_한글>테스트법</법령명_한글>
          <법종구분>법률</법종구분>
          <소관부처>법무부</소관부처>
          <시행일자>20260101</시행일자>
          <공포일자>20260101</공포일자>
          <공포번호>1</공포번호>
          <제개정구분>제정</제개정구분>
        </기본정보>
        <조문>
          <조문단위>
            <조문여부>조문</조문여부>
            <조문번호>1</조문번호>
            <조문제목>목적</조문제목>
            <조문내용>&lt;b&gt;이 법은&lt;/b&gt; 테스트를 &lt;br/&gt;목적으로 한다.</조문내용>
          </조문단위>
        </조문>
      </법령>
    `);

    const result = await getLawDetail(OC, 1);
    expect(result.articles[0].articleContent).not.toContain("<b>");
    expect(result.articles[0].articleContent).not.toContain("<br");
    expect(result.articles[0].articleContent).toContain("이 법은");
    expect(result.articles[0].articleContent).toContain("목적으로 한다.");
  });

  it("getLawDetail_조문없음_빈배열반환", async () => {
    mockFetchXml(`
      <법령>
        <기본정보>
          <법령ID>002</법령ID>
          <법령명_한글>부칙법</법령명_한글>
          <법종구분>법률</법종구분>
          <소관부처>법무부</소관부처>
          <시행일자>20260101</시행일자>
          <공포일자>20260101</공포일자>
          <공포번호>2</공포번호>
          <제개정구분>제정</제개정구분>
        </기본정보>
      </법령>
    `);

    const result = await getLawDetail(OC, 2);
    expect(result.lawName).toBe("부칙법");
    expect(result.articles).toHaveLength(0);
  });

  it("getLawDetail_루트없음_예외발생", async () => {
    mockFetchXml("<OtherRoot></OtherRoot>");
    await expect(getLawDetail(OC, 99999)).rejects.toThrow("법령을 찾을 수 없습니다");
  });

  it("getLawDetail_URL에MST파라미터사용", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: () =>
        Promise.resolve(
          "<법령><기본정보><법령ID>1</법령ID><법령명_한글>T</법령명_한글>" +
            "<법종구분></법종구분><소관부처></소관부처><시행일자></시행일자>" +
            "<공포일자></공포일자><공포번호></공포번호><제개정구분></제개정구분>" +
            "</기본정보></법령>",
        ),
    });
    vi.stubGlobal("fetch", fetchMock);

    await getLawDetail(OC, 12345);

    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain("MST=12345");
    expect(calledUrl).toContain("target=law");
    expect(calledUrl).toContain("lawService.do");
  });
});

// =========================================================
// searchCases (판례 검색)
// =========================================================

describe("searchCases", () => {
  it("searchCases_정상XML_판례목록반환", async () => {
    mockFetchXml(`
      <PrecSearch>
        <totalCnt>1</totalCnt>
        <page>1</page>
        <prec>
          <판례일련번호>200000</판례일련번호>
          <사건명>손해배상(기)</사건명>
          <사건번호>2024다12345</사건번호>
          <선고일자>20260101</선고일자>
          <법원명>대법원</법원명>
          <사건종류명>민사</사건종류명>
          <판결유형>판결</판결유형>
          <선고>선고</선고>
          <판례상세링크>/precInfoP.do?precSeq=200000</판례상세링크>
        </prec>
      </PrecSearch>
    `);

    const result = await searchCases(OC, { query: "손해배상" });
    expect(result.totalCount).toBe(1);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].id).toBe(200000);
    expect(result.items[0].caseName).toBe("손해배상(기)");
    expect(result.items[0].caseNumber).toBe("2024다12345");
    expect(result.items[0].courtName).toBe("대법원");
    expect(result.items[0].caseType).toBe("민사");
  });

  it("searchCases_빈결과_빈배열반환", async () => {
    mockFetchXml("<PrecSearch><totalCnt>0</totalCnt><page>1</page></PrecSearch>");

    const result = await searchCases(OC, { query: "없는판례" });
    expect(result.totalCount).toBe(0);
    expect(result.items).toHaveLength(0);
  });

  it("searchCases_날짜범위및법원_URL포함", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve("<PrecSearch><totalCnt>0</totalCnt></PrecSearch>"),
    });
    vi.stubGlobal("fetch", fetchMock);

    await searchCases(OC, {
      query: "손해배상",
      dateFrom: "20250101",
      dateTo: "20260101",
      court: "대법원",
    });

    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain("target=prec");
    const parsedUrl = new URL(calledUrl);
    expect(parsedUrl.searchParams.get("prncYd")).toBe("20250101~20260101");
  });

  it("searchCases_HTTP에러_예외발생", async () => {
    mockFetchHttpError(404);
    await expect(searchCases(OC, { query: "테스트" })).rejects.toThrow("HTTP 404");
  });
});

// =========================================================
// getCaseDetail (판례 상세)
// =========================================================

describe("getCaseDetail", () => {
  it("getCaseDetail_정상XML_판례상세반환", async () => {
    mockFetchXml(`
      <PrecService>
        <판례정보일련번호>200000</판례정보일련번호>
        <사건명>손해배상(기)</사건명>
        <사건번호>2024다12345</사건번호>
        <선고일자>20260101</선고일자>
        <선고>선고</선고>
        <법원명>대법원</법원명>
        <사건종류명>민사</사건종류명>
        <판결유형>판결</판결유형>
        <판시사항>채무불이행으로 인한 손해배상</판시사항>
        <판결요지>원고의 청구를 인용한다</판결요지>
        <참조조문>민법 제750조</참조조문>
        <참조판례>대법원 2020다12345</참조판례>
        <판례내용>주문: 원고 승소</판례내용>
      </PrecService>
    `);

    const result = await getCaseDetail(OC, 200000);
    expect(result.id).toBe(200000);
    expect(result.caseName).toBe("손해배상(기)");
    expect(result.caseNumber).toBe("2024다12345");
    expect(result.courtName).toBe("대법원");
    expect(result.holdings).toContain("채무불이행");
    expect(result.summary).toContain("원고의 청구");
    expect(result.referenceLaws).toContain("민법 제750조");
    expect(result.content).toContain("원고 승소");
  });

  it("getCaseDetail_HTML포함_태그제거", async () => {
    mockFetchXml(`
      <PrecService>
        <판례정보일련번호>1</판례정보일련번호>
        <사건명>테스트</사건명>
        <사건번호>2024다1</사건번호>
        <선고일자>20260101</선고일자>
        <선고>선고</선고>
        <법원명>대법원</법원명>
        <사건종류명>민사</사건종류명>
        <판결유형>판결</판결유형>
        <판시사항>&lt;p&gt;테스트 &lt;b&gt;판시사항&lt;/b&gt;&lt;/p&gt;</판시사항>
        <판결요지></판결요지>
        <참조조문></참조조문>
        <참조판례></참조판례>
        <판례내용></판례내용>
      </PrecService>
    `);

    const result = await getCaseDetail(OC, 1);
    expect(result.holdings).not.toContain("<p>");
    expect(result.holdings).not.toContain("<b>");
    expect(result.holdings).toContain("테스트 판시사항");
  });

  it("getCaseDetail_루트없음_예외발생", async () => {
    mockFetchXml("<OtherRoot></OtherRoot>");
    await expect(getCaseDetail(OC, 99999)).rejects.toThrow("판례를 찾을 수 없습니다");
  });
});

// =========================================================
// searchConstitutional (헌재결정례 검색)
// =========================================================

describe("searchConstitutional", () => {
  it("searchConstitutional_정상XML_헌재목록반환", async () => {
    mockFetchXml(`
      <DetcSearch>
        <totalCnt>1</totalCnt>
        <page>1</page>
        <Detc>
          <헌재결정례일련번호>300000</헌재결정례일련번호>
          <종국일자>20260101</종국일자>
          <사건번호>2024헌바1</사건번호>
          <사건명>민법 제750조 위헌소원</사건명>
          <헌재결정례상세링크>/detcInfoP.do?detcSeq=300000</헌재결정례상세링크>
        </Detc>
      </DetcSearch>
    `);

    const result = await searchConstitutional(OC, { query: "위헌" });
    expect(result.totalCount).toBe(1);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].id).toBe(300000);
    expect(result.items[0].caseName).toContain("위헌소원");
    expect(result.items[0].caseNumber).toBe("2024헌바1");
    expect(result.items[0].conclusionDate).toBe("20260101");
  });

  it("searchConstitutional_빈결과_빈배열반환", async () => {
    mockFetchXml("<DetcSearch><totalCnt>0</totalCnt><page>1</page></DetcSearch>");

    const result = await searchConstitutional(OC, { query: "없는결정례" });
    expect(result.totalCount).toBe(0);
    expect(result.items).toHaveLength(0);
  });

  it("searchConstitutional_루트없음_빈결과반환", async () => {
    mockFetchXml("<Other></Other>");

    const result = await searchConstitutional(OC, { query: "테스트" });
    expect(result.totalCount).toBe(0);
    expect(result.items).toHaveLength(0);
  });

  it("searchConstitutional_HTTP에러_예외발생", async () => {
    mockFetchHttpError(400);
    await expect(searchConstitutional(OC, { query: "테스트" })).rejects.toThrow("HTTP 400");
  });
});

// =========================================================
// searchInterpretations (법령해석례 검색)
// =========================================================

describe("searchInterpretations", () => {
  it("searchInterpretations_정상XML_해석례목록반환", async () => {
    mockFetchXml(`
      <Expc>
        <totalCnt>1</totalCnt>
        <page>1</page>
        <expc>
          <법령해석례일련번호>400000</법령해석례일련번호>
          <안건명>건축법 해석</안건명>
          <안건번호>법제처-2024-001</안건번호>
          <질의기관명>서울시</질의기관명>
          <회신기관명>법제처</회신기관명>
          <회신일자>20260101</회신일자>
          <법령해석례상세링크>/expcInfoP.do?expcSeq=400000</법령해석례상세링크>
        </expc>
      </Expc>
    `);

    const result = await searchInterpretations(OC, { query: "건축법" });
    expect(result.totalCount).toBe(1);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].id).toBe(400000);
    expect(result.items[0].title).toBe("건축법 해석");
    expect(result.items[0].caseNumber).toBe("법제처-2024-001");
    expect(result.items[0].inquiryOrg).toBe("서울시");
    expect(result.items[0].replyOrg).toBe("법제처");
    expect(result.items[0].replyDate).toBe("20260101");
  });

  it("searchInterpretations_빈결과_빈배열반환", async () => {
    mockFetchXml("<Expc><totalCnt>0</totalCnt><page>1</page></Expc>");

    const result = await searchInterpretations(OC, { query: "없는해석례" });
    expect(result.totalCount).toBe(0);
    expect(result.items).toHaveLength(0);
  });

  it("searchInterpretations_루트없음_빈결과반환", async () => {
    mockFetchXml("<Other></Other>");

    const result = await searchInterpretations(OC, { query: "테스트" });
    expect(result.totalCount).toBe(0);
    expect(result.items).toHaveLength(0);
  });
});

// =========================================================
// searchAdminRules (행정규칙 검색)
// =========================================================

describe("searchAdminRules", () => {
  it("searchAdminRules_정상XML_행정규칙목록반환", async () => {
    mockFetchXml(`
      <AdmRulSearch>
        <totalCnt>1</totalCnt>
        <page>1</page>
        <admrul>
          <행정규칙일련번호>500000</행정규칙일련번호>
          <행정규칙명>공무원 복무규정</행정규칙명>
          <행정규칙종류>훈령</행정규칙종류>
          <발령일자>20260101</발령일자>
          <발령번호>100</발령번호>
          <소관부처명>인사혁신처</소관부처명>
          <현행연혁구분>현행</현행연혁구분>
          <제개정구분명>일부개정</제개정구분명>
          <행정규칙ID>ADM001</행정규칙ID>
          <시행일자>20260201</시행일자>
          <행정규칙상세링크>/admRulInfoP.do?admRulSeq=500000</행정규칙상세링크>
        </admrul>
      </AdmRulSearch>
    `);

    const result = await searchAdminRules(OC, { query: "복무" });
    expect(result.totalCount).toBe(1);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].id).toBe(500000);
    expect(result.items[0].ruleName).toBe("공무원 복무규정");
    expect(result.items[0].ruleType).toBe("훈령");
    expect(result.items[0].departmentName).toBe("인사혁신처");
    expect(result.items[0].amendmentType).toBe("일부개정");
  });

  it("searchAdminRules_빈결과_빈배열반환", async () => {
    mockFetchXml("<AdmRulSearch><totalCnt>0</totalCnt><page>1</page></AdmRulSearch>");

    const result = await searchAdminRules(OC, { query: "없는규칙" });
    expect(result.totalCount).toBe(0);
    expect(result.items).toHaveLength(0);
  });

  it("searchAdminRules_URL파라미터_올바른target", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve("<AdmRulSearch><totalCnt>0</totalCnt></AdmRulSearch>"),
    });
    vi.stubGlobal("fetch", fetchMock);

    await searchAdminRules(OC, { query: "테스트", display: 5, page: 3 });

    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain("target=admrul");
    expect(calledUrl).toContain("display=5");
    expect(calledUrl).toContain("page=3");
  });

  it("searchAdminRules_HTTP에러_예외발생", async () => {
    mockFetchHttpError(400);
    await expect(searchAdminRules(OC, { query: "테스트" })).rejects.toThrow("HTTP 400");
  });
});

// =========================================================
// searchLegalTerms (법령용어 검색)
// =========================================================

describe("searchLegalTerms", () => {
  it("searchLegalTerms_정상XML_용어목록반환", async () => {
    mockFetchXml(`
      <LsTrmSearch>
        <totalCnt>1</totalCnt>
        <page>1</page>
        <lstrm>
          <법령용어ID>TRM001</법령용어ID>
          <법령용어명>채무불이행</법령용어명>
          <법령용어상세링크>/lsTrmInfoP.do?trmSeq=TRM001</법령용어상세링크>
        </lstrm>
      </LsTrmSearch>
    `);

    const result = await searchLegalTerms(OC, { query: "채무" });
    expect(result.totalCount).toBe(1);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].id).toBe("TRM001");
    expect(result.items[0].termName).toBe("채무불이행");
  });

  it("searchLegalTerms_빈결과_빈배열반환", async () => {
    mockFetchXml("<LsTrmSearch><totalCnt>0</totalCnt><page>1</page></LsTrmSearch>");

    const result = await searchLegalTerms(OC, { query: "없는용어" });
    expect(result.totalCount).toBe(0);
    expect(result.items).toHaveLength(0);
  });

  it("searchLegalTerms_루트없음_빈결과반환", async () => {
    mockFetchXml("<Other></Other>");

    const result = await searchLegalTerms(OC, { query: "테스트" });
    expect(result.totalCount).toBe(0);
    expect(result.items).toHaveLength(0);
  });

  it("searchLegalTerms_HTTP에러_예외발생", async () => {
    mockFetchHttpError(403);
    await expect(searchLegalTerms(OC, { query: "테스트" })).rejects.toThrow("HTTP 403");
  });
});

// =========================================================
// searchEnglishLaws (영문법령 검색)
// =========================================================

describe("searchEnglishLaws", () => {
  it("searchEnglishLaws_정상XML_영문법령목록반환", async () => {
    mockFetchXml(`
      <LawSearch>
        <totalCnt>1</totalCnt>
        <page>1</page>
        <law>
          <법령일련번호>600000</법령일련번호>
          <법령명한글>민법</법령명한글>
          <법령명영문>Civil Act</법령명영문>
          <법령ID>EL001</법령ID>
          <공포일자>19580222</공포일자>
          <공포번호>471</공포번호>
          <제개정구분명>전부개정</제개정구분명>
          <소관부처명>법무부</소관부처명>
          <법령구분명>법률</법령구분명>
          <시행일자>19580222</시행일자>
          <현행연혁코드>현행</현행연혁코드>
          <법령상세링크>/engLsInfoP.do?lsiSeq=600000</법령상세링크>
        </law>
      </LawSearch>
    `);

    const result = await searchEnglishLaws(OC, { query: "Civil Act" });
    expect(result.totalCount).toBe(1);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].id).toBe(600000);
    expect(result.items[0].lawNameKo).toBe("민법");
    expect(result.items[0].lawNameEn).toBe("Civil Act");
    expect(result.items[0].lawType).toBe("법률");
  });

  it("searchEnglishLaws_빈결과_빈배열반환", async () => {
    mockFetchXml("<LawSearch><totalCnt>0</totalCnt><page>1</page></LawSearch>");

    const result = await searchEnglishLaws(OC, { query: "NonExistentLaw" });
    expect(result.totalCount).toBe(0);
    expect(result.items).toHaveLength(0);
  });

  it("searchEnglishLaws_URL에elaw타겟사용", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve("<LawSearch><totalCnt>0</totalCnt></LawSearch>"),
    });
    vi.stubGlobal("fetch", fetchMock);

    await searchEnglishLaws(OC, { query: "Civil Act" });

    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain("target=elaw");
    expect(calledUrl).toContain("lawSearch.do");
  });

  it("searchEnglishLaws_HTTP에러_예외발생", async () => {
    mockFetchHttpError(400);
    await expect(searchEnglishLaws(OC, { query: "test" })).rejects.toThrow("HTTP 400");
  });
});

// =========================================================
// searchTreaties (조약 검색)
// =========================================================

describe("searchTreaties", () => {
  it("searchTreaties_정상XML_조약목록반환", async () => {
    mockFetchXml(`
      <TrtySearch>
        <totalCnt>1</totalCnt>
        <page>1</page>
        <Trty>
          <조약일련번호>700000</조약일련번호>
          <조약명>대한민국과 미합중국 간의 상호방위조약</조약명>
          <조약구분명>양자조약</조약구분명>
          <발효일자>19541117</발효일자>
          <서명일자>19531001</서명일자>
          <조약번호>34</조약번호>
          <조약상세링크>/trtyInfoP.do?trtySeq=700000</조약상세링크>
        </Trty>
      </TrtySearch>
    `);

    const result = await searchTreaties(OC, { query: "방위조약" });
    expect(result.totalCount).toBe(1);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].id).toBe(700000);
    expect(result.items[0].treatyName).toContain("상호방위조약");
    expect(result.items[0].treatyType).toBe("양자조약");
    expect(result.items[0].effectiveDate).toBe("19541117");
    expect(result.items[0].treatyNumber).toBe("34");
  });

  it("searchTreaties_빈결과_빈배열반환", async () => {
    mockFetchXml("<TrtySearch><totalCnt>0</totalCnt><page>1</page></TrtySearch>");

    const result = await searchTreaties(OC, { query: "없는조약" });
    expect(result.totalCount).toBe(0);
    expect(result.items).toHaveLength(0);
  });

  it("searchTreaties_루트없음_빈결과반환", async () => {
    mockFetchXml("<Other></Other>");

    const result = await searchTreaties(OC, { query: "테스트" });
    expect(result.totalCount).toBe(0);
    expect(result.items).toHaveLength(0);
  });

  it("searchTreaties_네트워크에러_예외발생", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("connection refused")));
    await expect(searchTreaties(OC, { query: "테스트" })).rejects.toThrow("connection refused");
  });
});

// =========================================================
// 추가 export 함수 (상세·기타 API)
// =========================================================

describe("getConstitutionalDetail", () => {
  it("getConstitutionalDetail_정상XML_파싱", async () => {
    mockFetchXml(`
      <DetcService>
        <헌재결정례일련번호>300001</헌재결정례일련번호>
        <종국일자>20260101</종국일자>
        <사건번호>2024헌바1</사건번호>
        <사건명>위헌소원</사건명>
        <사건종류명>위헌</사건종류명>
        <판시사항>판시</판시사항>
        <결정요지>요지</결정요지>
        <전문>전문</전문>
        <참조조문>민법</참조조문>
        <참조판례>대법원</참조판례>
      </DetcService>
    `);
    const r = await getConstitutionalDetail(OC, 300001);
    expect(r.id).toBe(300001);
    expect(r.caseNumber).toBe("2024헌바1");
    expect(r.holdings).toBe("판시");
  });
});

describe("getInterpretationDetail", () => {
  it("getInterpretationDetail_정상XML_파싱", async () => {
    mockFetchXml(`
      <ExpcService>
        <법령해석례일련번호>400001</법령해석례일련번호>
        <안건명>해석안건</안건명>
        <안건번호>법제처-1</안건번호>
        <해석일자>20260201</해석일자>
        <해석기관명>법제처</해석기관명>
        <질의기관명>서울시</질의기관명>
        <질의요지>질의</질의요지>
        <회답>회답본문</회답>
        <이유>이유본문</이유>
      </ExpcService>
    `);
    const r = await getInterpretationDetail(OC, 400001);
    expect(r.id).toBe(400001);
    expect(r.title).toBe("해석안건");
    expect(r.reply).toContain("회답본문");
  });
});

describe("getAdminRuleDetail", () => {
  it("getAdminRuleDetail_정상XML_파싱", async () => {
    mockFetchXml(`
      <AdmRulService>
        <행정규칙기본정보>
          <행정규칙일련번호>500001</행정규칙일련번호>
          <행정규칙명>테스트훈령</행정규칙명>
          <행정규칙종류>훈령</행정규칙종류>
          <발령일자>20260101</발령일자>
          <발령번호>10</발령번호>
          <소관부처명>부처</소관부처명>
          <제개정구분명>제정</제개정구분명>
        </행정규칙기본정보>
        <조문내용>조문본문</조문내용>
      </AdmRulService>
    `);
    const r = await getAdminRuleDetail(OC, 500001);
    expect(r.id).toBe(500001);
    expect(r.ruleName).toBe("테스트훈령");
    expect(r.content).toBe("조문본문");
  });

  it("getAdminRuleDetail_복수조문내용_줄바꿈으로결합", async () => {
    mockFetchXml(`
      <AdmRulService>
        <행정규칙기본정보>
          <행정규칙일련번호>500002</행정규칙일련번호>
          <행정규칙명>다조문훈령</행정규칙명>
        </행정규칙기본정보>
        <조문내용>제1조 목적</조문내용>
        <조문내용>제2조 정의</조문내용>
        <조문내용>제3조 적용</조문내용>
      </AdmRulService>
    `);
    const r = await getAdminRuleDetail(OC, 500002);
    expect(r.content).toBe("제1조 목적\n\n제2조 정의\n\n제3조 적용");
  });
});

describe("searchOrdinances", () => {
  it("searchOrdinances_정상XML_목록반환", async () => {
    mockFetchXml(`
      <OrdinSearch>
        <totalCnt>1</totalCnt>
        <page>1</page>
        <law>
          <자치법규일련번호>600001</자치법규일련번호>
          <자치법규명>서울시 조례</자치법규명>
          <자치법규ID>ORD1</자치법규ID>
          <공포일자>20200101</공포일자>
          <공포번호>1</공포번호>
          <제개정구분명>제정</제개정구분명>
          <지자체기관명>서울시</지자체기관명>
          <자치법규종류>조례</자치법규종류>
          <시행일자>20200201</시행일자>
          <자치법규상세링크>/o</자치법규상세링크>
        </law>
      </OrdinSearch>
    `);
    const r = await searchOrdinances(OC, { query: "조례" });
    expect(r.totalCount).toBe(1);
    expect(r.items[0].ordinanceName).toBe("서울시 조례");
    expect(r.items[0].localGovName).toBe("서울시");
  });
});

describe("getOrdinanceDetail", () => {
  it("getOrdinanceDetail_정상XML_파싱", async () => {
    mockFetchXml(`
      <LawService>
        <자치법규기본정보>
          <자치법규ID>O1</자치법규ID>
          <자치법규명>조례명</자치법규명>
          <지자체기관명>기관</지자체기관명>
          <공포일자>20200101</공포일자>
          <시행일자>20200201</시행일자>
        </자치법규기본정보>
        <조문>
          <조>
            <조문번호>1</조문번호>
            <조제목>제목</조제목>
            <조내용>조내용텍스트</조내용>
          </조>
        </조문>
      </LawService>
    `);
    const r = await getOrdinanceDetail(OC, 600001);
    expect(r.ordinanceId).toBe("O1");
    expect(r.articles).toHaveLength(1);
    expect(r.articles[0].articleContent).toBe("조내용텍스트");
  });
});

describe("getTreatyDetail", () => {
  it("getTreatyDetail_양자조약_BothTrtyService루트", async () => {
    mockFetchXml(`
      <BothTrtyService>
        <조약기본정보>
          <조약일련번호>700001</조약일련번호>
          <조약명_한글>한글조약</조약명_한글>
          <조약명_영문>En Treaty</조약명_영문>
          <발효일자>20000101</발효일자>
          <서명일자>19990101</서명일자>
          <조약번호>99</조약번호>
        </조약기본정보>
        <추가정보>
          <체결대상국가한글>미국</체결대상국가한글>
          <양자조약분야명>경제</양자조약분야명>
        </추가정보>
        <조약내용>
          <조약내용>조약본문</조약내용>
        </조약내용>
      </BothTrtyService>
    `);
    const r = await getTreatyDetail(OC, 700001);
    expect(r.id).toBe(700001);
    expect(r.treatyNameKo).toBe("한글조약");
    expect(r.counterpartyCountry).toBe("미국");
    expect(r.content).toBe("조약본문");
  });

  it("getTreatyDetail_다자조약_MultTrtyService루트", async () => {
    mockFetchXml(`
      <MultTrtyService>
        <조약기본정보>
          <조약일련번호>700002</조약일련번호>
          <조약명_한글>다자조약명</조약명_한글>
          <조약명_영문>Multilateral Treaty</조약명_영문>
          <발효일자>20230601</발효일자>
          <조약번호>2550</조약번호>
        </조약기본정보>
        <추가정보>
          <다자조약분야명>무역/통상/산업</다자조약분야명>
        </추가정보>
        <조약내용>
          <조약내용>다자조약 본문</조약내용>
        </조약내용>
      </MultTrtyService>
    `);
    const r = await getTreatyDetail(OC, 700002);
    expect(r.id).toBe(700002);
    expect(r.treatyNameKo).toBe("다자조약명");
    expect(r.treatyField).toBe("무역/통상/산업");
    expect(r.content).toBe("다자조약 본문");
  });
});

describe("getLegalTermDetail", () => {
  it("getLegalTermDetail_정상XML_파싱", async () => {
    mockFetchXml(`
      <LsTrmService>
        <법령용어일련번호>TSEQ1</법령용어일련번호>
        <법령용어명_한글>용어한글</법령용어명_한글>
        <법령용어명_한자>漢字</법령용어명_한자>
        <법령용어정의>정의본문</법령용어정의>
        <출처>출처</출처>
      </LsTrmService>
    `);
    const r = await getLegalTermDetail(OC, "TSEQ1");
    expect(r.id).toBe("TSEQ1");
    expect(r.termName).toBe("용어한글");
    expect(r.definition).toBe("정의본문");
  });
});

describe("getEnglishLawDetail", () => {
  it("getEnglishLawDetail_joYn=Y_조문_챕터헤더는제외", async () => {
    mockFetchXml(`
      <Law>
        <InfSection>
          <lsId>ELAW1</lsId>
          <lsNmEng>Civil Act</lsNmEng>
          <ancYd>19580222</ancYd>
          <ancNo>471</ancNo>
        </InfSection>
        <JoSection>
          <Jo>
            <joYn>N</joYn>
            <joNo>1</joNo>
            <joTtl></joTtl>
            <joCts>CHAPTER I GENERAL PROVISIONS</joCts>
          </Jo>
          <Jo>
            <joYn>Y</joYn>
            <joNo>1</joNo>
            <joTtl>Article 1 (Purpose)</joTtl>
            <joCts>Article text</joCts>
          </Jo>
          <Jo>
            <joYn>Y</joYn>
            <joNo>2</joNo>
            <joTtl>Article 2 (Definition)</joTtl>
            <joCts>Definition text</joCts>
          </Jo>
        </JoSection>
      </Law>
    `);
    const r = await getEnglishLawDetail(OC, 600000);
    expect(r.lawId).toBe("ELAW1");
    expect(r.lawNameEn).toBe("Civil Act");
    expect(r.articles).toHaveLength(2);
    expect(r.articles[0].articleTitle).toBe("Article 1 (Purpose)");
    expect(r.articles[0].articleContent).toBe("Article text");
    expect(r.articles[1].articleTitle).toBe("Article 2 (Definition)");
  });
});

describe("getCommitteeName", () => {
  it("getCommitteeName_등록위원회_한글명반환", () => {
    expect(getCommitteeName("ftc")).toBe("공정거래위원회");
  });
  it("getCommitteeName_미등록키_그대로반환", () => {
    expect(getCommitteeName("unknown_key")).toBe("unknown_key");
  });
});

describe("searchCommitteeDecisions", () => {
  it("searchCommitteeDecisions_ftc_정상XML", async () => {
    mockFetchXml(`
      <Ftc>
        <totalCnt>1</totalCnt>
        <page>1</page>
        <ftc>
          <결정문일련번호>800001</결정문일련번호>
          <사건명>불공정거래</사건명>
          <사건번호>2024-1</사건번호>
          <결정일자>20260301</결정일자>
          <결정문상세링크>/d</결정문상세링크>
        </ftc>
      </Ftc>
    `);
    const r = await searchCommitteeDecisions(OC, "ftc", { query: "거래" });
    expect(r.items[0].id).toBe(800001);
    expect(r.items[0].title).toBe("불공정거래");
  });
});

describe("getCommitteeDecisionDetail", () => {
  it("getCommitteeDecisionDetail_ftc_정상XML", async () => {
    mockFetchXml(`
      <FtcService>
        <결정문일련번호>800001</결정문일련번호>
        <사건명>상세사건</사건명>
        <사건번호>2024-2</사건번호>
        <기관명>공정위</기관명>
        <결정일자>20260302</결정일자>
        <주문>인용</주문>
        <이유>이유텍스트</이유>
        <결정요지>요지텍스트</결정요지>
        <피심정보>피심</피심정보>
      </FtcService>
    `);
    const r = await getCommitteeDecisionDetail(OC, "ftc", 800001);
    expect(r.id).toBe(800001);
    expect(r.ruling).toBe("인용");
    expect((r.extras as any).피심정보).toBe("피심");
  });
});

describe("searchAdminAppeals", () => {
  it("searchAdminAppeals_정상XML_목록반환", async () => {
    mockFetchXml(`
      <Decc>
        <totalCnt>1</totalCnt>
        <page>1</page>
        <decc>
          <행정심판재결례일련번호>900001</행정심판재결례일련번호>
          <사건명>심판사건</사건명>
          <사건번호>심2024-1</사건번호>
          <처분일자>20250101</처분일자>
          <의결일자>20250201</의결일자>
          <처분청>청A</처분청>
          <재결청>청B</재결청>
          <재결구분명>취소</재결구분명>
          <재결구분코드>1</재결구분코드>
          <행정심판례상세링크>/a</행정심판례상세링크>
        </decc>
      </Decc>
    `);
    const r = await searchAdminAppeals(OC, { query: "심판" });
    expect(r.items[0].caseName).toBe("심판사건");
    expect(r.items[0].dispositionAgency).toBe("청A");
  });
});

describe("getAdminAppealDetail", () => {
  it("getAdminAppealDetail_정상XML_파싱", async () => {
    mockFetchXml(`
      <PrecService>
        <행정심판례일련번호>900001</행정심판례일련번호>
        <사건명>상세심판</사건명>
        <사건번호>심2024-2</사건번호>
        <처분일자>20250102</처분일자>
        <의결일자>20250202</의결일자>
        <처분청>처분</처분청>
        <재결청>재결</재결청>
        <재결례유형명>유형</재결례유형명>
        <주문>기각</주문>
        <청구취지>취지</청구취지>
        <이유>이유</이유>
        <재결요지>요지</재결요지>
      </PrecService>
    `);
    const r = await getAdminAppealDetail(OC, 900001);
    expect(r.ruling).toBe("기각");
    expect(r.summary).toBe("요지");
  });
});

describe("searchOldNewLaw", () => {
  it("searchOldNewLaw_정상XML_목록반환", async () => {
    mockFetchXml(`
      <OldAndNewLawSearch>
        <totalCnt>1</totalCnt>
        <page>1</page>
        <oldAndNew>
          <신구법일련번호>110001</신구법일련번호>
          <현행연혁코드>현행</현행연혁코드>
          <신구법명>신구법</신구법명>
          <신구법ID>ON1</신구법ID>
          <공포일자>20200101</공포일자>
          <공포번호>1</공포번호>
          <제개정구분명>개정</제개정구분명>
          <소관부처코드>1</소관부처코드>
          <소관부처명>부처</소관부처명>
          <법령구분명>법률</법령구분명>
          <시행일자>20200201</시행일자>
          <신구법상세링크>/on</신구법상세링크>
        </oldAndNew>
      </OldAndNewLawSearch>
    `);
    const r = await searchOldNewLaw(OC, { query: "신구" });
    expect(r.items[0].lawName).toBe("신구법");
    expect(r.items[0].lawId).toBe("ON1");
  });
});

describe("getOldNewLawDetail", () => {
  it("getOldNewLawDetail_정상XML_파싱", async () => {
    mockFetchXml(`
      <OldAndNewService>
        <구조문_기본정보>
          <법령ID>OLD1</법령ID>
          <법령일련번호>1</법령일련번호>
          <시행일자>20200101</시행일자>
          <공포일자>20190101</공포일자>
          <공포번호>1</공포번호>
          <현행여부>Y</현행여부>
          <제개정구분명>전부</제개정구분명>
          <법령명>구법</법령명>
          <법종구분>법률</법종구분>
        </구조문_기본정보>
        <신조문_기본정보>
          <법령ID>NEW1</법령ID>
          <법령일련번호>2</법령일련번호>
          <시행일자>20210101</시행일자>
          <공포일자>20200101</공포일자>
          <공포번호>2</공포번호>
          <현행여부>Y</현행여부>
          <제개정구분명>개정</제개정구분명>
          <법령명>신법</법령명>
          <법종구분>법률</법종구분>
        </신조문_기본정보>
        <구조문목록><조문>구조문</조문></구조문목록>
        <신조문목록><조문>신조문</조문></신조문목록>
      </OldAndNewService>
    `);
    const r = await getOldNewLawDetail(OC, 110001);
    expect(r.oldBasicInfo.lawName).toBe("구법");
    expect(r.newBasicInfo.lawName).toBe("신법");
    expect(r.oldArticles).toContain("구조문");
    expect(r.newArticles).toContain("신조문");
  });
});

describe("searchLawSystem", () => {
  it("searchLawSystem_정상XML_목록반환", async () => {
    mockFetchXml(`
      <LsStmdSearch>
        <totalCnt>1</totalCnt>
        <page>1</page>
        <law>
          <법령일련번호>120001</법령일련번호>
          <법령명>체계도법</법령명>
          <법령ID>LS1</법령ID>
          <공포일자>20200101</공포일자>
          <공포번호>1</공포번호>
          <제개정구분명>제정</제개정구분명>
          <소관부처코드>1</소관부처코드>
          <소관부처명>부</소관부처명>
          <법령구분명>법률</법령구분명>
          <시행일자>20200201</시행일자>
          <본문상세링크>/s</본문상세링크>
        </law>
      </LsStmdSearch>
    `);
    const r = await searchLawSystem(OC, { query: "체계" });
    expect(r.items[0].lawName).toBe("체계도법");
  });
});

describe("getLawSystemDetail", () => {
  it("getLawSystemDetail_정상XML_파싱", async () => {
    mockFetchXml(`
      <법령체계도>
        <기본정보>
          <법령ID>L1</법령ID>
          <법령일련번호>120001</법령일련번호>
          <공포일자>20200101</공포일자>
          <공포번호>10</공포번호>
          <법종구분>법률</법종구분>
          <법령명>체계상세</법령명>
          <시행일자>20200201</시행일자>
          <제개정구분>제정</제개정구분>
        </기본정보>
        <상하위법></상하위법>
      </법령체계도>
    `);
    const r = await getLawSystemDetail(OC, 120001);
    expect(r.basicInfo.lawName).toBe("체계상세");
    expect(r.basicInfo.lawId).toBe("L1");
  });
});

describe("searchThreeWayComp", () => {
  it("searchThreeWayComp_정상XML_목록반환", async () => {
    mockFetchXml(`
      <thdCmpLawSearch>
        <totalCnt>1</totalCnt>
        <page>1</page>
        <thdCmp>
          <삼단비교일련번호>130001</삼단비교일련번호>
          <법령명한글>삼단법</법령명한글>
          <법령ID>T1</법령ID>
          <공포일자>20200101</공포일자>
          <공포번호>1</공포번호>
          <제개정구분명>제정</제개정구분명>
          <소관부처코드>1</소관부처코드>
          <소관부처명>부</소관부처명>
          <법령구분명>법률</법령구분명>
          <시행일자>20200201</시행일자>
          <인용조문_삼단비교상세링크>/c1</인용조문_삼단비교상세링크>
          <위임조문_삼단비교상세링크>/c2</위임조문_삼단비교상세링크>
        </thdCmp>
      </thdCmpLawSearch>
    `);
    const r = await searchThreeWayComp(OC, { query: "삼단" });
    expect(r.items[0].lawName).toBe("삼단법");
    expect(r.items[0].citationLink).toBe("/c1");
  });
});

describe("getThreeWayCompDetail", () => {
  it("getThreeWayCompDetail_정상XML_파싱", async () => {
    mockFetchXml(`
      <ThdCmpLawXService>
        <기본정보>
          <법령ID>A</법령ID>
          <시행령ID>B</시행령ID>
          <시행규칙ID>C</시행규칙ID>
          <법령명>법</법령명>
          <시행령명>령</시행령명>
          <시행규칙명>칙</시행규칙명>
          <삼단비교존재여부>Y</삼단비교존재여부>
        </기본정보>
        <인용조문삼단비교>
          <법률조문>
            <조번호>1</조번호>
            <조제목>제목</조제목>
            <조내용>본문</조내용>
          </법률조문>
        </인용조문삼단비교>
      </ThdCmpLawXService>
    `);
    const r = await getThreeWayCompDetail(OC, 130001, 1);
    expect(r.basicInfo.lawName).toBe("법");
    expect(r.content).toContain("제1조");
    expect(r.content).toContain("본문");
  });
});

describe("searchAttachedForms", () => {
  it("searchAttachedForms_정상XML_목록반환", async () => {
    mockFetchXml(`
      <licBylSearch>
        <totalCnt>1</totalCnt>
        <page>1</page>
        <licbyl>
          <별표일련번호>140001</별표일련번호>
          <관련법령일련번호>140000</관련법령일련번호>
          <별표명>별표1</별표명>
          <관련법령명>관련법</관련법령명>
          <별표번호>1</별표번호>
          <별표종류>별표</별표종류>
          <소관부처명>부</소관부처명>
          <공포일자>20200101</공포일자>
          <제개정구분명>제정</제개정구분명>
          <법령종류>법률</법령종류>
          <별표서식파일링크>/f</별표서식파일링크>
          <별표법령상세링크>/d</별표법령상세링크>
        </licbyl>
      </licBylSearch>
    `);
    const r = await searchAttachedForms(OC, { query: "별표" });
    expect(r.items[0].formName).toBe("별표1");
  });
});

describe("searchLawAbbreviations", () => {
  it("searchLawAbbreviations_정상XML_목록반환", async () => {
    mockFetchXml(`
      <LawSearch>
        <totalCnt>1</totalCnt>
        <page>1</page>
        <law>
          <법령일련번호>150001</법령일련번호>
          <현행연혁코드>현행</현행연혁코드>
          <법령명한글>상법</법령명한글>
          <법령약칭명>상</법령약칭명>
          <법령ID>COM</법령ID>
          <공포일자>20200101</공포일자>
          <공포번호>1</공포번호>
          <제개정구분명>제정</제개정구분명>
          <등록일>20200102</등록일>
          <소관부처코드>1</소관부처코드>
          <소관부처명>부</소관부처명>
          <법령구분명>법률</법령구분명>
          <시행일자>20200201</시행일자>
          <자법타법여부>자법</자법타법여부>
          <법령상세링크>/l</법령상세링크>
        </law>
      </LawSearch>
    `);
    const r = await searchLawAbbreviations(OC, { query: "상법" });
    expect(r.items[0].abbreviation).toBe("상");
  });
});

describe("searchLawChangeHistory", () => {
  it("searchLawChangeHistory_정상XML_목록반환", async () => {
    mockFetchXml(`
      <LawSearch>
        <totalCnt>1</totalCnt>
        <page>1</page>
        <law>
          <법령일련번호>160001</법령일련번호>
          <현행연혁코드>현행</현행연혁코드>
          <법령명한글>변경법</법령명한글>
          <법령ID>H1</법령ID>
          <공포일자>20200101</공포일자>
          <공포번호>1</공포번호>
          <제개정구분명>개정</제개정구분명>
          <소관부처코드>1</소관부처코드>
          <소관부처명>부</소관부처명>
          <법령구분명>법률</법령구분명>
          <시행일자>20200201</시행일자>
          <자법타법여부>자법</자법타법여부>
          <법령상세링크>/h</법령상세링크>
        </law>
      </LawSearch>
    `);
    const r = await searchLawChangeHistory(OC, { regDt: "20260101" });
    expect(r.items[0].lawName).toBe("변경법");
  });
});

describe("getLawArticleSub", () => {
  it("getLawArticleSub_정상XML_파싱_본문과항", async () => {
    mockFetchXml(`
      <법령 법령키="0092902025013120733">
        <기본정보>
          <법령ID>009290</법령ID>
          <공포일자>20250131</공포일자>
          <공포번호>20733</공포번호>
          <언어>한글</언어>
          <법종구분 법종구분코드="A0002">법률</법종구분>
          <법령명_한글>민사집행법</법령명_한글>
          <법령명_한자>民事執行法</법령명_한자>
          <소관부처 소관부처코드="1270000">법무부</소관부처>
          <시행일자>20260201</시행일자>
        </기본정보>
        <조문>
          <조문단위 조문키="0276000">
            <조문번호>276</조문번호>
            <조문여부>전문</조문여부>
          </조문단위>
          <조문단위 조문키="0276001">
            <조문번호>276</조문번호>
            <조문여부>조문</조문여부>
            <조문제목>가압류의 목적</조문제목>
            <조문내용>제276조(가압류의 목적)</조문내용>
            <항>
              <항번호>① </항번호>
              <항내용>①가압류는 금전채권이나 금전으로 환산할 수 있는 채권에 대하여 동산 또는 부동산에 대한 강제집행을 보전하기 위하여 할 수 있다.</항내용>
            </항>
            <항>
              <항번호>② </항번호>
              <항내용>②제1항의 채권이 조건이 붙어 있는 것이거나 기한이 차지 아니한 것인 경우에도 가압류를 할 수 있다.</항내용>
            </항>
          </조문단위>
        </조문>
      </법령>
    `);
    const r = await getLawArticleSub(OC, { lawId: 268837, jo: "027600" });
    expect(r.lawNameKo).toBe("민사집행법");
    expect(r.lawTypeName).toBe("법률");
    expect(r.lawTypeCode).toBe("A0002");
    expect(r.departmentName).toBe("법무부");
    expect(r.articleNumber).toBe("276");
    expect(r.articleTitle).toBe("가압류의 목적");
    expect(r.articleContent).toContain("제276조(가압류의 목적)");
    expect(r.articleContent).toContain("①가압류는 금전채권");
    expect(r.articleContent).toContain("②제1항의 채권이 조건");
  });

  it("getLawArticleSub_호목중첩_파싱", async () => {
    mockFetchXml(`
      <법령 법령키="k1">
        <기본정보>
          <법령ID>L1</법령ID>
          <법령명_한글>테스트법</법령명_한글>
        </기본정보>
        <조문>
          <조문단위>
            <조문번호>10</조문번호>
            <조문여부>조문</조문여부>
            <조문제목>예시</조문제목>
            <조문내용>제10조(예시)</조문내용>
            <항>
              <항번호>① </항번호>
              <항내용>① 다음 각 호의 경우 적용한다.</항내용>
              <호>
                <호번호>1.</호번호>
                <호내용>1. 첫째 사유</호내용>
                <목>
                  <목번호>가.</목번호>
                  <목내용>세부 가</목내용>
                </목>
              </호>
              <호>
                <호번호>2.</호번호>
                <호내용>2. 둘째 사유</호내용>
              </호>
            </항>
          </조문단위>
        </조문>
      </법령>
    `);
    const r = await getLawArticleSub(OC, { lawId: 1, jo: "001000" });
    expect(r.articleContent).toContain("제10조(예시)");
    expect(r.articleContent).toContain("다음 각 호의 경우");
    expect(r.articleContent).toContain("1. 첫째 사유");
    expect(r.articleContent).toContain("가.");
    expect(r.articleContent).toContain("세부 가");
    expect(r.articleContent).toContain("2. 둘째 사유");
  });
});

describe("searchAILegalTerms", () => {
  it("searchAILegalTerms_정상XML_목록반환", async () => {
    mockFetchXml(`
      <lstrmAISearch>
        <검색결과개수>1</검색결과개수>
        <page>1</page>
        <법령용어>
          <법령용어명>AI용어</법령용어명>
          <동음이의어존재여부>N</동음이의어존재여부>
          <비고>비고</비고>
          <용어간관계링크>/t</용어간관계링크>
          <조문간관계링크>/a</조문간관계링크>
        </법령용어>
      </lstrmAISearch>
    `);
    const r = await searchAILegalTerms(OC, { query: "AI" });
    expect(r.totalCount).toBe(1);
    expect(r.items[0].termName).toBe("AI용어");
  });
});

describe("searchLinkedOrdinances", () => {
  it("searchLinkedOrdinances_정상XML_목록반환", async () => {
    mockFetchXml(`
      <OrdinSearch>
        <totalCnt>1</totalCnt>
        <page>1</page>
        <law>
          <자치법규일련번호>170001</자치법규일련번호>
          <자치법규명>연계조례</자치법규명>
          <자치법규ID>LK1</자치법규ID>
          <공포일자>20200101</공포일자>
          <공포번호>1</공포번호>
          <제개정구분명>제정</제개정구분명>
          <자치법규종류>조례</자치법규종류>
          <시행일자>20200201</시행일자>
        </law>
      </OrdinSearch>
    `);
    const r = await searchLinkedOrdinances(OC, { query: "연계" });
    expect(r.items[0].ordinanceName).toBe("연계조례");
  });
});

describe("searchAdminRuleOldNew", () => {
  it("searchAdminRuleOldNew_정상XML_목록반환", async () => {
    mockFetchXml(`
      <OldAndNewLawSearch>
        <totalCnt>1</totalCnt>
        <page>1</page>
        <oldAndNew>
          <신구법일련번호>180001</신구법일련번호>
          <현행연혁코드>현행</현행연혁코드>
          <신구법명>구규칙</신구법명>
          <신구법ID>AR1</신구법ID>
          <발령일자>20200101</발령일자>
          <발령번호>1</발령번호>
          <제개정구분명>개정</제개정구분명>
          <소관부처코드>1</소관부처코드>
          <소관부처명>부</소관부처명>
          <법령구분명>훈령</법령구분명>
          <시행일자>20200201</시행일자>
          <신구법상세링크>/ar</신구법상세링크>
        </oldAndNew>
      </OldAndNewLawSearch>
    `);
    const r = await searchAdminRuleOldNew(OC, { query: "규칙" });
    expect(r.items[0].ruleName).toBe("구규칙");
    expect(r.items[0].ruleId).toBe("AR1");
  });
});

describe("getAdminRuleOldNewDetail", () => {
  it("getAdminRuleOldNewDetail_AdmRulOldAndNewService루트_파싱", async () => {
    mockFetchXml(`
      <AdmRulOldAndNewService>
        <구조문_기본정보>
          <행정규칙ID>OLD_R</행정규칙ID>
          <행정규칙일련번호>1</행정규칙일련번호>
          <시행일자>20200101</시행일자>
          <발령일자>20190101</발령일자>
          <발령번호>1</발령번호>
          <현행여부>Y</현행여부>
          <행정규칙명>구규칙</행정규칙명>
        </구조문_기본정보>
        <신조문_기본정보>
          <행정규칙ID>NEW_R</행정규칙ID>
          <행정규칙일련번호>2</행정규칙일련번호>
          <시행일자>20210101</시행일자>
          <발령일자>20200101</발령일자>
          <발령번호>2</발령번호>
          <현행여부>Y</현행여부>
          <행정규칙명>신규칙</행정규칙명>
        </신조문_기본정보>
        <구조문목록><조문>구</조문></구조문목록>
        <신조문목록><조문>신</조문></신조문목록>
      </AdmRulOldAndNewService>
    `);
    const r = await getAdminRuleOldNewDetail(OC, 180001);
    expect(r.oldBasicInfo.ruleName).toBe("구규칙");
    expect(r.newBasicInfo.ruleName).toBe("신규칙");
    expect(r.oldArticles).toContain("구");
  });
});

describe("빈 XML root 분기 테스트", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    fakeNow += 2000;
    vi.spyOn(Date, "now").mockImplementation(() => {
      fakeNow += 2000;
      return fakeNow;
    });
  });

  it("searchLaws_빈root_빈결과반환", async () => {
    mockFetchXml("<empty/>");
    const r = await searchLaws(OC, { query: "x" });
    expect(r.totalCount).toBe(0);
    expect(r.items).toEqual([]);
  });

  it("searchLaws_search파라미터_사용", async () => {
    mockFetchXml(`<LawSearch><totalCnt>0</totalCnt></LawSearch>`);
    const r = await searchLaws(OC, { query: "x", search: 2, org: "법무부" });
    expect(r.totalCount).toBe(0);
  });

  it("getLawDetail_빈root_throws", async () => {
    mockFetchXml("<empty/>");
    await expect(getLawDetail(OC, 1)).rejects.toThrow();
  });

  it("searchCases_빈root_빈결과반환", async () => {
    mockFetchXml("<empty/>");
    const r = await searchCases(OC, { query: "x" });
    expect(r.totalCount).toBe(0);
  });

  it("getCaseDetail_빈root_throws", async () => {
    mockFetchXml("<empty/>");
    await expect(getCaseDetail(OC, "1")).rejects.toThrow();
  });

  it("searchConstitutional_빈root_빈결과", async () => {
    mockFetchXml("<empty/>");
    const r = await searchConstitutional(OC, { query: "x" });
    expect(r.totalCount).toBe(0);
  });

  it("getConstitutionalDetail_빈root_throws", async () => {
    mockFetchXml("<empty/>");
    await expect(getConstitutionalDetail(OC, "1")).rejects.toThrow();
  });

  it("searchInterpretations_빈root_빈결과", async () => {
    mockFetchXml("<empty/>");
    const r = await searchInterpretations(OC, { query: "x" });
    expect(r.totalCount).toBe(0);
  });

  it("getInterpretationDetail_빈root_throws", async () => {
    mockFetchXml("<empty/>");
    await expect(getInterpretationDetail(OC, "1")).rejects.toThrow();
  });

  it("searchAdminRules_빈root_빈결과", async () => {
    mockFetchXml("<empty/>");
    const r = await searchAdminRules(OC, { query: "x" });
    expect(r.totalCount).toBe(0);
  });

  it("getAdminRuleDetail_빈root_throws", async () => {
    mockFetchXml("<empty/>");
    await expect(getAdminRuleDetail(OC, "1")).rejects.toThrow();
  });

  it("searchOrdinances_빈root_빈결과", async () => {
    mockFetchXml("<empty/>");
    const r = await searchOrdinances(OC, { query: "x" });
    expect(r.totalCount).toBe(0);
  });

  it("getOrdinanceDetail_빈root_throws", async () => {
    mockFetchXml("<empty/>");
    await expect(getOrdinanceDetail(OC, "1")).rejects.toThrow();
  });

  it("searchTreaties_빈root_빈결과", async () => {
    mockFetchXml("<empty/>");
    const r = await searchTreaties(OC, { query: "x" });
    expect(r.totalCount).toBe(0);
  });

  it("getTreatyDetail_빈root_throws", async () => {
    mockFetchXml("<empty/>");
    await expect(getTreatyDetail(OC, "1")).rejects.toThrow();
  });

  it("searchLegalTerms_빈root_빈결과", async () => {
    mockFetchXml("<empty/>");
    const r = await searchLegalTerms(OC, { query: "x" });
    expect(r.totalCount).toBe(0);
  });

  it("getLegalTermDetail_빈root_throws", async () => {
    mockFetchXml("<empty/>");
    await expect(getLegalTermDetail(OC, "1")).rejects.toThrow();
  });

  it("searchEnglishLaws_빈root_빈결과", async () => {
    mockFetchXml("<empty/>");
    const r = await searchEnglishLaws(OC, { query: "x" });
    expect(r.totalCount).toBe(0);
  });

  it("getEnglishLawDetail_빈root_throws", async () => {
    mockFetchXml("<empty/>");
    await expect(getEnglishLawDetail(OC, "1")).rejects.toThrow();
  });

  it("searchCommitteeDecisions_빈root_빈결과", async () => {
    mockFetchXml("<empty/>");
    const r = await searchCommitteeDecisions(OC, "ftc", { query: "x" });
    expect(r.totalCount).toBe(0);
  });

  it("getCommitteeDecisionDetail_빈root_throws", async () => {
    mockFetchXml("<empty/>");
    await expect(getCommitteeDecisionDetail(OC, "ftc", "1")).rejects.toThrow();
  });

  it("searchAdminAppeals_빈root_빈결과", async () => {
    mockFetchXml("<empty/>");
    const r = await searchAdminAppeals(OC, { query: "x" });
    expect(r.totalCount).toBe(0);
  });

  it("getAdminAppealDetail_빈root_throws", async () => {
    mockFetchXml("<empty/>");
    await expect(getAdminAppealDetail(OC, "1")).rejects.toThrow();
  });

  it("searchOldNewLaw_빈root_빈결과", async () => {
    mockFetchXml("<empty/>");
    const r = await searchOldNewLaw(OC, { query: "x" });
    expect(r.totalCount).toBe(0);
  });

  it("getOldNewLawDetail_빈root_throws", async () => {
    mockFetchXml("<empty/>");
    await expect(getOldNewLawDetail(OC, 1)).rejects.toThrow();
  });

  it("searchLawSystem_빈root_빈결과", async () => {
    mockFetchXml("<empty/>");
    const r = await searchLawSystem(OC, { query: "x" });
    expect(r.totalCount).toBe(0);
  });

  it("getLawSystemDetail_빈root_throws", async () => {
    mockFetchXml("<empty/>");
    await expect(getLawSystemDetail(OC, 1)).rejects.toThrow();
  });

  it("searchThreeWayComp_빈root_빈결과", async () => {
    mockFetchXml("<empty/>");
    const r = await searchThreeWayComp(OC, { query: "x" });
    expect(r.totalCount).toBe(0);
  });

  it("getThreeWayCompDetail_빈root_throws", async () => {
    mockFetchXml("<empty/>");
    await expect(getThreeWayCompDetail(OC, 1, "법률")).rejects.toThrow();
  });

  it("searchAttachedForms_빈root_빈결과", async () => {
    mockFetchXml("<empty/>");
    const r = await searchAttachedForms(OC, { query: "x" });
    expect(r.totalCount).toBe(0);
  });

  it("searchLawAbbreviations_빈root_빈결과", async () => {
    mockFetchXml("<empty/>");
    const r = await searchLawAbbreviations(OC, { query: "x" });
    expect(r.totalCount).toBe(0);
  });

  it("searchLawChangeHistory_빈root_빈결과", async () => {
    mockFetchXml("<empty/>");
    const r = await searchLawChangeHistory(OC, { lawId: 1 });
    expect(r.totalCount).toBe(0);
  });

  it("getLawArticleSub_빈root_throws", async () => {
    mockFetchXml("<empty/>");
    await expect(getLawArticleSub(OC, { lawId: 1, article: "1" })).rejects.toThrow();
  });

  it("searchAILegalTerms_빈root_빈결과", async () => {
    mockFetchXml("<empty/>");
    const r = await searchAILegalTerms(OC, { query: "x" });
    expect(r.totalCount).toBe(0);
  });

  it("searchLinkedOrdinances_빈root_빈결과", async () => {
    mockFetchXml("<empty/>");
    const r = await searchLinkedOrdinances(OC, { query: "x" });
    expect(r.totalCount).toBe(0);
  });

  it("searchAdminRuleOldNew_빈root_빈결과", async () => {
    mockFetchXml("<empty/>");
    const r = await searchAdminRuleOldNew(OC, { query: "x" });
    expect(r.totalCount).toBe(0);
  });

  it("getAdminRuleOldNewDetail_빈root_throws", async () => {
    mockFetchXml("<empty/>");
    await expect(getAdminRuleOldNewDetail(OC, 1)).rejects.toThrow();
  });
});
