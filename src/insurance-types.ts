/**
 * 금융위원회 보험상품 공시 (data.go.kr) API 타입 정의
 *
 * 6개 서비스, 9개 오퍼레이션 제공:
 *   1. 실손보험정보             GetMedicalReimbursementInsuranceInfoService/getInsuranceInfo
 *   2. 일반손해보험가입정보     GetFPPptInsuJoinInfoService/getPropertyInsuJoinInfo
 *   3. 자동차보험가입정보       GetFPAtmbInsujoinInfoService/getContractInfo
 *                                                          /getLosCircumstance
 *                                                          /getVictimInfo
 *   4. 변액보험기본정보         GetVariableInsuranceInfoService/getFundInfo
 *   5. 생명보험가입정보         GetFPLifeInsuJoinInfoService/getLifeInsuJoinStatus
 *                                                         /getIndividualAnnuityInsuInfo
 *   6. 퇴직연금기본정보         GetRetirementPensionInfoService/getFundInfo
 *
 * 공통 응답 구조 (data.go.kr 표준):
 *   { response: { header: { resultCode, resultMsg }, body: { items: { item: [...] }, totalCount, pageNo, numOfRows } } }
 */

// ---------------------------------------------------------------------------
// 1. 실손보험정보 (getInsuranceInfo)
// ---------------------------------------------------------------------------

export interface MedicalReimbursementItem {
  ofrInstNm: string;        // 제공기관명
  basDt: string;            // 기준일자 [YYYYMMDD]
  cmpyCd: string;           // 회사코드
  cmpyNm: string;           // 회사명
  ptrn: string;             // 상품종류
  mog: string;              // 담보종류
  prdNm: string;            // 상품명
  age: string;              // 나이
  mlInsRt: number | null;   // 남자보험료
  fmlInsRt: number | null;  // 여자보험료
}

export interface MedicalReimbursementSearchParams {
  basDt?: string;            // 기준일자
  beginBasDt?: string;       // 기준일자 시작
  endBasDt?: string;         // 기준일자 종료
  cmpyCd?: string;           // 회사코드
  cmpyNm?: string;           // 회사명 (정확히 일치)
  ptrn?: string;             // 상품종류
  mog?: string;              // 담보종류
  prdNm?: string;            // 상품명 (정확히 일치)
  likePrdNm?: string;        // 상품명 부분 일치
  age?: string;              // 나이
  ofrInstNm?: string;        // 제공기관명
  pageNo?: number;
  numOfRows?: number;
}

// ---------------------------------------------------------------------------
// 2. 일반손해보험가입정보 (getPropertyInsuJoinInfo)
// ---------------------------------------------------------------------------

export interface PropertyInsuJoinItem {
  sttsAccmlTrgtYr: string;  // 통계누적대상연도
  mogClsfNm: string;        // 담보구분명
  objcClsfNm: string;       // 목적물구분명
  cntrCnt: number | null;   // 계약건수
  inpm: number | null;      // 보험료
}

export interface PropertyInsuJoinSearchParams {
  sttsAccmlTrgtYr?: string;       // 통계누적대상연도 (정확)
  likeSttsAccmlTrgtYr?: string;   // 통계누적대상연도 (부분 일치, 필수)
  beginSttsAccmlTrgtYr?: string;
  endSttsAccmlTrgtYr?: string;
  mogClsfNm?: string;
  objcClsfNm?: string;
  pageNo?: number;
  numOfRows?: number;
}

// ---------------------------------------------------------------------------
// 3. 자동차보험가입정보 (getContractInfo)
// ---------------------------------------------------------------------------

export interface AutoContractItem {
  isuCmpyOfrYm: string;     // 보험사 제공 연월
  isuItmsNm: string;        // 보험종목명
  mogClsfNm: string;        // 담보구분명
  sexNm: string;            // 성별명
  aggr: string;             // 연령대
  atmbPlorNm: string;       // 자동차소유자명 (개인/법인)
  kncrNm: string;           // 차종명
  joinCnt: number | null;   // 가입건수
  elpsInpm: number | null;  // 경과보험료
}

export interface AutoContractSearchParams {
  isuCmpyOfrYm?: string;       // 보험사 제공 연월
  beginIsuCmpyOfrYm?: string;
  endIsuCmpyOfrYm?: string;
  isuItmsNm?: string;          // 보험종목명
  mogClsfNm?: string;          // 담보구분명
  sexNm?: string;              // 성별명
  aggr?: string;               // 연령대
  atmbPlorNm?: string;         // 자동차소유자명
  kncrNm?: string;             // 차종명
  pageNo?: number;
  numOfRows?: number;
}

// ---------------------------------------------------------------------------
// 4. 자동차보험 사고현황 (getLosCircumstance)
// ---------------------------------------------------------------------------

export interface AutoLosCircumstanceItem {
  isuCmpyOfrYm: string;       // 보험사 제공 연월
  isuItmsNm: string;          // 보험종목명
  mogClsfNm: string;          // 담보구분명
  kncrNm: string;             // 차종명
  losAmt: number | null;      // 손해액
  injPtlCnt: number | null;   // 부상자수
  dthTotlCnt: number | null;  // 사망자수
}

export interface AutoLosCircumstanceSearchParams {
  isuCmpyOfrYm?: string;
  beginIsuCmpyOfrYm?: string;
  endIsuCmpyOfrYm?: string;
  isuItmsNm?: string;
  mogClsfNm?: string;
  kncrNm?: string;
  pageNo?: number;
  numOfRows?: number;
}

// ---------------------------------------------------------------------------
// 5. 자동차보험 피해자 정보 (getVictimInfo)
// ---------------------------------------------------------------------------

export interface AutoVictimItem {
  atmbAcdnCnlsYm: string;     // 자동차사고 집계 연월
  dthInjClsfNm: string;       // 사망/부상 구분명
  impYn: string;              // 과실여부 (Y/N)
  injLvlcntCd: string;        // 부상등급코드
  impLvlcntCd: string;        // 과실등급코드
  victimCnt?: number | null;  // 피해자수 (응답 포맷에 따라 존재)
}

export interface AutoVictimSearchParams {
  atmbAcdnCnlsYm?: string;
  beginAtmbAcdnCnlsYm?: string;
  endAtmbAcdnCnlsYm?: string;
  dthInjClsfNm?: string;
  impYn?: string;
  injLvlcntCd?: string;
  impLvlcntCd?: string;
  pageNo?: number;
  numOfRows?: number;
}

// ---------------------------------------------------------------------------
// 6. 변액보험 기본정보 (getFundInfo)
// ---------------------------------------------------------------------------

export interface VariableInsuranceFundItem {
  cmpyCd: string;             // 회사코드
  cmpyNm: string;             // 회사명
  fndNm: string;              // 펀드명
  fndCd: string;              // 펀드코드
  basDt: string;              // 기준일자 YYYYMMDD
  basprc: string | null;      // 기준가
  nPptAmt: string | null;     // 순자산금액
}

export interface VariableInsuranceFundSearchParams {
  cmpyCd?: string;
  cmpyNm?: string;
  likeCmpyNm?: string;
  fndNm?: string;
  likeFndNm?: string;
  fndCd?: string;
  basDt?: string;
  beginBasDt?: string;
  endBasDt?: string;
  likeBasDt?: string;
  pageNo?: number;
  numOfRows?: number;
}

// ---------------------------------------------------------------------------
// 7. 생명보험 가입현황 (getLifeInsuJoinStatus)
// ---------------------------------------------------------------------------

export interface LifeInsuJoinStatusItem {
  isuKindNm: string;          // 보험종류명
  joinCnt: string | null;     // 가입건수 (data.go.kr이 문자열로 직렬화)
  joinRto: string | null;     // 가입율 (% 단위, 문자열)
  sttsAccmlTrgtYr: string;    // 통계집적대상년도
  areaNm: string;             // 지역명
  sexNm: string;              // 성별명
  rchnAggr: string;           // 도달연령대
}

export interface LifeInsuJoinStatusSearchParams {
  sttsAccmlTrgtYr?: string;
  areaNm?: string;
  sexNm?: string;
  rchnAggr?: string;
  isuKindNm?: string;
  pageNo?: number;
  numOfRows?: number;
}

// ---------------------------------------------------------------------------
// 8. 개인연금보험 가입정보 (getIndividualAnnuityInsuInfo)
// ---------------------------------------------------------------------------

export interface IndividualAnnuityInsuItem {
  sttsAccmlTrgtYr: string;    // 통계집적대상년도
  rchnAggr: string;           // 도달연령대
  taxPrqlYn: string;          // 세제적격여부 (Y/N)
  pymtMthNm: string;          // 납입방법명
  offrTyNm: string;           // 모집형태명
  yerUnitPymtTerm: string;    // 년단위납입기간
  joinCnt: string | null;     // 가입건수 (data.go.kr이 문자열로 직렬화)
}

export interface IndividualAnnuityInsuSearchParams {
  sttsAccmlTrgtYr?: string;
  rchnAggr?: string;
  taxPrqlYn?: string;
  pymtMthNm?: string;
  offrTyNm?: string;
  yerUnitPymtTerm?: string;
  pageNo?: number;
  numOfRows?: number;
}

// ---------------------------------------------------------------------------
// 9. 퇴직연금 기본정보 (getFundInfo)
// ---------------------------------------------------------------------------

export interface RetirementPensionFundItem {
  cmpyCd: string;             // 회사코드
  cmpyNm: string;             // 회사명
  fndNm: string;              // 펀드명
  fndCd: string;              // 펀드코드
  basDt: string;              // 기준일자 YYYYMMDD
  basprc: string | null;      // 기준가
  nPptAmt: string | null;     // 순자산금액
  ofrInstNm: string;          // 제공기관명
}

export interface RetirementPensionFundSearchParams {
  cmpyCd?: string;
  cmpyNm?: string;
  likeCmpyNm?: string;
  fndNm?: string;
  likeFndNm?: string;
  fndCd?: string;
  basDt?: string;
  beginBasDt?: string;
  endBasDt?: string;
  likeBasDt?: string;
  beginBasprc?: string;
  endBasprc?: string;
  ofrInstNm?: string;
  pageNo?: number;
  numOfRows?: number;
}

// ---------------------------------------------------------------------------
// 공통 결과 래퍼 (data20-types.ts의 DataGoKrResult와 동일 구조)
// ---------------------------------------------------------------------------

export interface InsuranceFetchResult<T> {
  totalCount: number;
  pageNo: number;
  numOfRows: number;
  items: T[];
}
