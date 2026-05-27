/**
 * 법제처 국가법령정보센터 API 타입 정의
 * 지원 target: law, prec, detc, expc, admrul, ordin, trty, lstrm, elaw,
 *   decc, oldAndNew, lsStmd, thdCmp, licbyl, lsAbrv, lsHstInf, lawjosub,
 *   lstrmAI, lnkOrd, admrulOldAndNew, 위원회(11개)
 */

// --- 공통 검색 파라미터 ---

export interface SearchParams {
  query: string;
  page?: number;
  display?: number;
  sort?: string;
}

export interface CaseSearchParams extends SearchParams {
  search?: 1 | 2; // 1=사건명, 2=전문
  dateFrom?: string; // YYYYMMDD
  dateTo?: string; // YYYYMMDD
  court?: string; // 400201=대법원, 400202=하급법원
}

export interface LawSearchParams extends SearchParams {
  search?: 1 | 2; // 1=법령명, 2=본문
  org?: string; // 소관부처코드
}

export interface OrdinSearchParams extends SearchParams {
  search?: 1 | 2; // 1=자치법규명, 2=본문
}

// --- 공통 검색 결과 ---

export interface SearchResult<T> {
  totalCount: number;
  currentPage: number;
  items: T[];
}

// --- 법령 (law) ---

export interface LawListItem {
  id: number; // 법령일련번호
  lawName: string; // 법령명한글
  lawAbbreviation: string; // 법령약칭명
  lawId: string; // 법령ID
  promulgationDate: string; // 공포일자
  promulgationNumber: string; // 공포번호
  amendmentType: string; // 제개정구분명
  departmentName: string; // 소관부처명
  lawType: string; // 법령구분명
  enforcementDate: string; // 시행일자
  currentHistoryCode: string; // 현행연혁코드
  detailLink: string; // 법령상세링크
}

export interface LawArticle {
  articleNumber: string;
  articleTitle: string;
  articleContent: string;
}

export interface LawDetail {
  lawId: string;
  lawName: string;
  lawType: string;
  departmentName: string;
  enforcementDate: string;
  promulgationDate: string;
  promulgationNumber: string;
  amendmentType: string;
  articles: LawArticle[];
}

// --- 판례 (prec) ---

export interface CaseListItem {
  id: number;
  caseName: string;
  caseNumber: string;
  decisionDate: string;
  courtName: string;
  caseType: string;
  verdictType: string;
  verdict: string;
  detailLink: string;
}

export interface CaseDetail {
  id: number;
  caseName: string;
  caseNumber: string;
  decisionDate: string;
  verdict: string;
  courtName: string;
  caseType: string;
  verdictType: string;
  holdings: string;
  summary: string;
  referenceLaws: string;
  referenceCases: string;
  content: string;
}

// --- 헌재결정례 (detc) ---

export interface ConstitutionalListItem {
  id: number; // 헌재결정례일련번호
  conclusionDate: string; // 종국일자
  caseNumber: string; // 사건번호
  caseName: string; // 사건명
  detailLink: string; // 헌재결정례상세링크
}

export interface ConstitutionalDetail {
  id: number;
  conclusionDate: string;
  caseNumber: string;
  caseName: string;
  caseType: string; // 사건종류명
  holdings: string; // 판시사항
  decisionSummary: string; // 결정요지
  fullText: string; // 전문
  referenceLaws: string; // 참조조문
  referenceCases: string; // 참조판례
}

// --- 법령해석례 (expc) ---

export interface InterpretationListItem {
  id: number; // 법령해석례일련번호
  title: string; // 안건명
  caseNumber: string; // 안건번호
  inquiryOrg: string; // 질의기관명
  replyOrg: string; // 회신기관명
  replyDate: string; // 회신일자
  detailLink: string; // 법령해석례상세링크
}

export interface InterpretationDetail {
  id: number;
  title: string;
  caseNumber: string;
  interpretationDate: string; // 해석일자
  interpretationOrg: string; // 해석기관명
  inquiryOrg: string; // 질의기관명
  inquirySummary: string; // 질의요지
  reply: string; // 회답
  reason: string; // 이유
}

// --- 행정규칙 (admrul) ---

export interface AdminRuleListItem {
  id: number; // 행정규칙일련번호
  ruleName: string; // 행정규칙명
  ruleType: string; // 행정규칙종류
  issuanceDate: string; // 발령일자
  issuanceNumber: string; // 발령번호
  departmentName: string; // 소관부처명
  currentHistoryType: string; // 현행연혁구분
  amendmentType: string; // 제개정구분명
  ruleId: string; // 행정규칙ID
  enforcementDate: string; // 시행일자
  detailLink: string; // 행정규칙상세링크
}

export interface AdminRuleDetail {
  id: number;
  ruleName: string;
  ruleType: string;
  issuanceDate: string;
  issuanceNumber: string;
  departmentName: string;
  amendmentType: string;
  content: string; // 조문내용
}

// --- 자치법규 (ordin) ---

export interface OrdinanceListItem {
  id: number; // 자치법규일련번호
  ordinanceName: string; // 자치법규명
  ordinanceId: string; // 자치법규ID
  promulgationDate: string; // 공포일자
  promulgationNumber: string; // 공포번호
  amendmentType: string; // 제개정구분명
  localGovName: string; // 지자체기관명
  ordinanceType: string; // 자치법규종류
  enforcementDate: string; // 시행일자
  detailLink: string; // 자치법규상세링크
}

export interface OrdinanceArticle {
  articleNumber: string;
  articleTitle: string;
  articleContent: string;
}

export interface OrdinanceDetail {
  ordinanceId: string;
  ordinanceName: string;
  localGovName: string;
  promulgationDate: string;
  enforcementDate: string;
  articles: OrdinanceArticle[];
}

// --- 조약 (trty) ---

export interface TreatyListItem {
  id: number; // 조약일련번호
  treatyName: string; // 조약명
  treatyType: string; // 조약구분명
  effectiveDate: string; // 발효일자
  signDate: string; // 서명일자
  treatyNumber: string; // 조약번호
  detailLink: string; // 조약상세링크
}

export interface TreatyDetail {
  id: number;
  treatyNameKo: string; // 조약명_한글
  treatyNameEn: string; // 조약명_영문
  effectiveDate: string;
  signDate: string;
  treatyNumber: string;
  counterpartyCountry: string; // 체결대상국가
  treatyField: string; // 양자조약분야명
  content: string; // 조약내용
}

// --- 법령용어 (lstrm) ---

export interface LegalTermListItem {
  id: string; // 법령용어ID
  termName: string; // 법령용어명
  detailLink: string; // 법령용어상세링크
}

export interface LegalTermDetail {
  id: string;
  termName: string; // 법령용어명_한글
  termNameHanja: string; // 법령용어명_한자
  definition: string; // 법령용어정의
  source: string; // 출처
}

// --- 영문법령 (elaw) ---

export interface ElawListItem {
  id: number; // 법령일련번호
  lawNameKo: string; // 법령명한글
  lawNameEn: string; // 법령명영문
  lawId: string; // 법령ID
  promulgationDate: string; // 공포일자
  promulgationNumber: string; // 공포번호
  amendmentType: string; // 제개정구분명
  departmentName: string; // 소관부처명
  lawType: string; // 법령구분명
  enforcementDate: string; // 시행일자
  currentHistoryCode: string; // 현행연혁코드
  detailLink: string; // 법령상세링크
}

export interface ElawArticle {
  articleNumber: string; // joNo
  articleBranchNumber: string; // joBrNo
  articleTitle: string; // joTtl
  articleContent: string; // joCts
}

export interface ElawDetail {
  lawId: string; // lsId
  lawNameEn: string; // lsNmEng
  promulgationDate: string; // ancYd
  promulgationNumber: string; // ancNo
  articles: ElawArticle[];
}

// --- 위원회 결정문 (공통) ---

export interface CommitteeDecisionListItem {
  id: number; // 결정문일련번호
  title: string; // 사건명/안건명/제목
  caseNumber: string; // 사건번호/안건번호/의결번호
  decisionDate: string; // 결정일자/의결일/등록일
  agencyName: string; // 기관명
  detailLink: string; // 결정문상세링크
}

export interface CommitteeDecisionDetail {
  id: number; // 결정문일련번호
  title: string; // 사건명/안건명/제목
  caseNumber: string; // 사건번호/안건번호/의결번호
  agencyName: string; // 기관명
  decisionDate: string; // 결정일자/의결일
  ruling: string; // 주문/조치내용
  reason: string; // 이유/조치이유
  summary: string; // 결정요지/판정요지/사건개요 등
  extras: Record<string, string>; // 위원회별 추가 필드
}

// --- 행정심판례 (decc) ---

export interface AdminAppealListItem {
  id: number; // 행정심판재결례일련번호
  caseName: string; // 사건명
  caseNumber: string; // 사건번호
  dispositionDate: string; // 처분일자
  decisionDate: string; // 의결일자
  dispositionAgency: string; // 처분청
  decisionAgency: string; // 재결청
  decisionType: string; // 재결구분명
  decisionTypeCode: string; // 재결구분코드
  detailLink: string; // 행정심판례상세링크
}

export interface AdminAppealDetail {
  id: number; // 행정심판례일련번호
  caseName: string; // 사건명
  caseNumber: string; // 사건번호
  dispositionDate: string; // 처분일자
  decisionDate: string; // 의결일자
  dispositionAgency: string; // 처분청
  decisionAgency: string; // 재결청
  decisionTypeName: string; // 재결례유형명
  ruling: string; // 주문
  claim: string; // 청구취지
  reason: string; // 이유
  summary: string; // 재결요지
}

// --- 신구법비교 (oldAndNew) ---

export interface OldNewLawListItem {
  id: number; // 신구법일련번호
  currentHistoryCode: string; // 현행연혁코드
  lawName: string; // 신구법명
  lawId: string; // 신구법ID
  promulgationDate: string; // 공포일자
  promulgationNumber: string; // 공포번호
  amendmentType: string; // 제개정구분명
  departmentCode: string; // 소관부처코드
  departmentName: string; // 소관부처명
  lawType: string; // 법령구분명
  enforcementDate: string; // 시행일자
  detailLink: string; // 신구법상세링크
}

export interface OldNewLawDetail {
  oldBasicInfo: {
    lawId: string;
    lawSerialNumber: number;
    enforcementDate: string;
    promulgationDate: string;
    promulgationNumber: string;
    isCurrent: string;
    amendmentType: string;
    lawName: string;
    lawType: string;
  };
  newBasicInfo: {
    lawId: string;
    lawSerialNumber: number;
    enforcementDate: string;
    promulgationDate: string;
    promulgationNumber: string;
    isCurrent: string;
    amendmentType: string;
    lawName: string;
    lawType: string;
  };
  oldArticles: string; // 구조문 텍스트
  newArticles: string; // 신조문 텍스트
}

// --- 법령 체계도 (lsStmd) ---

export interface LawSystemListItem {
  id: number; // 법령일련번호
  lawName: string; // 법령명
  lawId: string; // 법령ID
  promulgationDate: string; // 공포일자
  promulgationNumber: string; // 공포번호
  amendmentType: string; // 제개정구분명
  departmentCode: string; // 소관부처코드
  departmentName: string; // 소관부처명
  lawType: string; // 법령구분명
  enforcementDate: string; // 시행일자
  detailLink: string; // 본문상세링크
}

export interface LawSystemDetail {
  basicInfo: {
    lawId: string;
    lawSerialNumber: number;
    promulgationDate: string;
    promulgationNumber: string;
    lawType: string;
    lawName: string;
    enforcementDate: string;
    amendmentType: string;
  };
  hierarchy: string; // 상하위법 구조 텍스트
}

// --- 3단비교 (thdCmp) ---

export interface ThreeWayCompListItem {
  id: number; // 삼단비교일련번호
  lawName: string; // 법령명한글
  lawId: string; // 법령ID
  promulgationDate: string; // 공포일자
  promulgationNumber: string; // 공포번호
  amendmentType: string; // 제개정구분명
  departmentCode: string; // 소관부처코드
  departmentName: string; // 소관부처명
  lawType: string; // 법령구분명
  enforcementDate: string; // 시행일자
  citationLink: string; // 인용조문_삼단비교상세링크
  delegationLink: string; // 위임조문_삼단비교상세링크
}

export interface ThreeWayCompDetail {
  basicInfo: {
    lawId: string;
    decreeId: string;
    ruleId: string;
    lawName: string;
    decreeName: string;
    ruleName: string;
    comparisonExists: string;
  };
  content: string; // 삼단비교 내용 텍스트
}

// --- 별표서식 (licbyl) ---

export interface AttachedFormListItem {
  id: number; // 별표일련번호
  relatedLawId: number; // 관련법령일련번호
  formName: string; // 별표명
  relatedLawName: string; // 관련법령명
  formNumber: string; // 별표번호
  formType: string; // 별표종류
  departmentName: string; // 소관부처명
  promulgationDate: string; // 공포일자
  amendmentType: string; // 제개정구분명
  lawType: string; // 법령종류
  fileLink: string; // 별표서식파일링크
  detailLink: string; // 별표법령상세링크
}

export interface AttachedFormSearchParams extends SearchParams {
  search?: 1 | 2 | 3; // 1=별표명, 2=관련법령명, 3=본문
  knd?: 1 | 2 | 3 | 4 | 5; // 1=별표, 2=서식, 3=별지, 4=기타, 5=미분류
}

// --- 법령명 약칭 (lsAbrv) ---

export interface LawAbbreviationListItem {
  id: number; // 법령일련번호
  currentHistoryCode: string; // 현행연혁코드
  lawName: string; // 법령명한글
  abbreviation: string; // 법령약칭명
  lawId: string; // 법령ID
  promulgationDate: string; // 공포일자
  promulgationNumber: string; // 공포번호
  amendmentType: string; // 제개정구분명
  registrationDate: string; // 등록일
  departmentCode: string; // 소관부처코드
  departmentName: string; // 소관부처명
  lawType: string; // 법령구분명
  enforcementDate: string; // 시행일자
  selfOtherLaw: string; // 자법타법여부
  detailLink: string; // 법령상세링크
}

// --- 법령 변경이력 (lsHstInf) ---

export interface LawChangeHistoryListItem {
  id: number; // 법령일련번호
  currentHistoryCode: string; // 현행연혁코드
  lawName: string; // 법령명한글
  lawId: string; // 법령ID
  promulgationDate: string; // 공포일자
  promulgationNumber: string; // 공포번호
  amendmentType: string; // 제개정구분명
  departmentCode: string; // 소관부처코드
  departmentName: string; // 소관부처명
  lawType: string; // 법령구분명
  enforcementDate: string; // 시행일자
  selfOtherLaw: string; // 자법타법여부
  detailLink: string; // 법령상세링크
}

export interface LawChangeHistoryParams {
  regDt: string; // YYYYMMDD (필수)
  page?: number;
  display?: number;
}

// --- 조항호목 (lawjosub) ---

export interface LawArticleSubDetail {
  lawKey: string; // 법령키
  lawId: string; // 법령ID
  promulgationDate: string; // 공포일자
  promulgationNumber: string; // 공포번호
  language: string; // 언어
  lawNameKo: string; // 법령명_한글
  lawNameHanja: string; // 법령명_한자
  lawTypeCode: string; // 법종구분코드
  lawTypeName: string; // 법종구분명
  departmentName: string; // 소관부처
  enforcementDate: string; // 시행일자
  articleNumber: string; // 조문번호
  articleTitle: string; // 조문제목
  articleContent: string; // 조문 본문 (조문내용 + 항/호/목 합본 텍스트)
}

export interface LawArticleSubParams {
  lawId: number; // MST 또는 ID (법령일련번호)
  jo: string; // 조번호 (6자리, 예: 000100)
  hang?: string; // 항번호 (6자리)
  ho?: string; // 호번호 (6자리)
  mok?: string; // 목번호 (한글 한 글자)
}

// --- 지식베이스 법령용어 (lstrmAI) ---

export interface AILegalTermListItem {
  termName: string; // 법령용어명
  homonymExists: string; // 동음이의어존재여부
  remarks: string; // 비고
  termRelationLink: string; // 용어간관계링크
  articleRelationLink: string; // 조문간관계링크
}

// --- 법령-자치법규 연계 조례 (lnkOrd) ---

export interface LinkedOrdinanceListItem {
  id: number; // 자치법규일련번호
  ordinanceName: string; // 자치법규명
  ordinanceId: string; // 자치법규ID
  promulgationDate: string; // 공포일자
  promulgationNumber: string; // 공포번호
  amendmentType: string; // 제개정구분명
  ordinanceType: string; // 자치법규종류
  enforcementDate: string; // 시행일자
}

// --- 행정규칙 신구법비교 (admrulOldAndNew) ---

export interface AdminRuleOldNewListItem {
  id: number; // 신구법일련번호
  currentHistoryCode: string; // 현행연혁코드
  ruleName: string; // 신구법명
  ruleId: string; // 신구법ID
  issuanceDate: string; // 발령일자
  issuanceNumber: string; // 발령번호
  amendmentType: string; // 제개정구분명
  departmentCode: string; // 소관부처코드
  departmentName: string; // 소관부처명
  lawType: string; // 법령구분명
  enforcementDate: string; // 시행일자
  detailLink: string; // 신구법상세링크
}

export interface AdminRuleOldNewDetail {
  oldBasicInfo: {
    ruleId: string;
    ruleSerialNumber: number;
    enforcementDate: string;
    issuanceDate: string;
    issuanceNumber: string;
    isCurrent: string;
    ruleName: string;
  };
  newBasicInfo: {
    ruleId: string;
    ruleSerialNumber: number;
    enforcementDate: string;
    issuanceDate: string;
    issuanceNumber: string;
    isCurrent: string;
    ruleName: string;
  };
  oldArticles: string;
  newArticles: string;
}
