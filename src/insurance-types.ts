/**
 * 금융감독원 보험상품 공시 (data.go.kr) API 타입 정의
 *
 * 3개 서비스, 5개 오퍼레이션 제공:
 *   1. 실손보험정보             GetMedicalReimbursementInsuranceInfoService/getInsuranceInfo
 *   2. 일반손해보험가입정보     GetFPPptInsuJoinInfoService/getPropertyInsuJoinInfo
 *   3. 자동차보험가입정보       GetFPAtmbInsujoinInfoService/getContractInfo
 *                                                          /getLosCircumstance
 *                                                          /getVictimInfo
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
// 공통 결과 래퍼 (data20-types.ts의 DataGoKrResult와 동일 구조)
// ---------------------------------------------------------------------------

export interface InsuranceFetchResult<T> {
  totalCount: number;
  pageNo: number;
  numOfRows: number;
  items: T[];
}
