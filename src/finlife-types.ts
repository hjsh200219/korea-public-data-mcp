/**
 * 금융감독원 금융상품통합비교공시 (FINLIFE) API 타입 정의
 * https://finlife.fss.or.kr/finlife/api/fncCoApi/list.do
 *
 * 공통 응답 구조: { result: { err_cd, err_msg, total_count, max_page_no, now_page_no, baseList, optionList } }
 */

// ---------------------------------------------------------------------------
// 공통 응답 래퍼
// ---------------------------------------------------------------------------

export interface FinlifeResultWrapper<Base, Option> {
  result: {
    err_cd: string;
    err_msg: string;
    prdt_div?: string;
    total_count: number;
    max_page_no: number;
    now_page_no: number;
    baseList?: Base[];
    optionList?: Option[];
  };
}

/**
 * 권역코드 (topFinGrpNo) — FINLIFE는 6자리 권역코드 사용.
 * FINLIFE 가이드 페이지의 e_topFinGrpNo 셀렉트박스 기준:
 *   020000 = 은행
 *   030200 = 여신전문금융 (카드/캐피탈)
 *   030300 = 저축은행
 *   050000 = 보험
 *   060000 = 금융투자
 */
export type TopFinGrpNo =
  | "020000"
  | "030200"
  | "030300"
  | "050000"
  | "060000";

/** 금융권역 한글 라벨 */
export const TOP_FIN_GRP_LABELS: Record<TopFinGrpNo, string> = {
  "020000": "은행",
  "030200": "여신전문금융",
  "030300": "저축은행",
  "050000": "보험",
  "060000": "금융투자",
};

// ---------------------------------------------------------------------------
// 1. 금융회사 API (companySearch.json)
// ---------------------------------------------------------------------------

export interface FinlifeCompanyBase {
  dcls_month: string;        // 공시제출월 [YYYYMM]
  fin_co_no: string;         // 금융회사 코드
  kor_co_nm: string;         // 금융회사명
  dcls_chrg_man: string;     // 공시담당자
  homp_url: string;          // 홈페이지 주소
  cal_tel: string;           // 고객센터 전화번호
}

export interface FinlifeCompanyOption {
  dcls_month: string;
  fin_co_no: string;
  area_cd: string;           // 지역 코드
  area_nm: string;           // 지역명
  exis_yn: string;           // 존재여부
}

export type FinlifeCompanyResponse = FinlifeResultWrapper<
  FinlifeCompanyBase,
  FinlifeCompanyOption
>;

// ---------------------------------------------------------------------------
// 2. 정기예금 API (depositProductsSearch.json)
// ---------------------------------------------------------------------------

export interface FinlifeDepositBase {
  dcls_month: string;
  fin_co_no: string;
  fin_prdt_cd: string;           // 금융상품 코드
  kor_co_nm: string;             // 금융회사명
  fin_prdt_nm: string;           // 금융상품명
  join_way: string;              // 가입 방법
  mtrt_int: string;              // 만기 후 이자율
  spcl_cnd: string;              // 우대조건
  join_deny: string;             // 가입제한 (1:제한없음, 2:서민전용, 3:일부제한)
  join_member: string;           // 가입대상
  etc_note: string;              // 기타 유의사항
  max_limit: number | null;      // 최고한도
  dcls_strt_day: string;         // 공시 시작일
  dcls_end_day: string | null;   // 공시 종료일
  fin_co_subm_day: string;       // 금융회사 제출일
}

export interface FinlifeDepositOption {
  dcls_month: string;
  fin_co_no: string;
  fin_prdt_cd: string;
  intr_rate_type: string;        // 저축 금리 유형 (S:단리, M:복리)
  intr_rate_type_nm: string;
  save_trm: string;              // 저축 기간 (개월)
  intr_rate: number | null;      // 저축 금리
  intr_rate2: number | null;     // 최고 우대금리
}

export type FinlifeDepositResponse = FinlifeResultWrapper<
  FinlifeDepositBase,
  FinlifeDepositOption
>;

// ---------------------------------------------------------------------------
// 3. 적금 API (savingProductsSearch.json)
// ---------------------------------------------------------------------------

export interface FinlifeSavingBase extends FinlifeDepositBase {}

export interface FinlifeSavingOption {
  dcls_month: string;
  fin_co_no: string;
  fin_prdt_cd: string;
  intr_rate_type: string;
  intr_rate_type_nm: string;
  rsrv_type: string;             // 적립 유형 (S:정액적립, F:자유적립)
  rsrv_type_nm: string;
  save_trm: string;
  intr_rate: number | null;
  intr_rate2: number | null;
}

export type FinlifeSavingResponse = FinlifeResultWrapper<
  FinlifeSavingBase,
  FinlifeSavingOption
>;

// ---------------------------------------------------------------------------
// 4. 연금저축 API (annuitySavingProductsSearch.json)
// ---------------------------------------------------------------------------

export interface FinlifeAnnuityBase {
  dcls_month: string;
  fin_co_no: string;
  fin_prdt_cd: string;
  kor_co_nm: string;
  fin_prdt_nm: string;
  join_way: string;
  pnsn_kind: string;             // 연금종류 코드
  pnsn_kind_nm: string;          // 연금종류명
  sale_strt_day: string;         // 판매 개시일
  mntn_cnt: number | null;       // 판매 건수
  prdt_type: string;             // 상품 유형 코드
  prdt_type_nm: string;          // 상품 유형명
  avg_prft_rate: number | null;  // 평균 수익률
  dcls_rate: string;             // 공시 이율
  guar_rate: string;             // 최저보증이율
  btrm_prft_rate_1: number | null;
  btrm_prft_rate_2: number | null;
  btrm_prft_rate_3: number | null;
  etc: string;
  sale_co: string;               // 판매사
  dcls_strt_day: string;
  dcls_end_day: string | null;
  fin_co_subm_day: string;
}

export interface FinlifeAnnuityOption {
  dcls_month: string;
  fin_co_no: string;
  fin_prdt_cd: string;
  pnsn_recp_trm: string;         // 연금 수령 기간 코드
  pnsn_recp_trm_nm: string;
  pnsn_entr_age: string;         // 가입 연령 코드
  pnsn_entr_age_nm: string;
  mon_paym_atm: string;          // 월 납입금 코드
  mon_paym_atm_nm: string;
  paym_prd: string;              // 납입 기간 코드
  paym_prd_nm: string;
  pnsn_strt_age: string;         // 연금 개시 연령 코드
  pnsn_strt_age_nm: string;
  pnsn_recp_amt: number | null;  // 월 예상 연금 수령액
}

export type FinlifeAnnuityResponse = FinlifeResultWrapper<
  FinlifeAnnuityBase,
  FinlifeAnnuityOption
>;

// ---------------------------------------------------------------------------
// 5. 주택담보대출 API (mortgageLoanProductsSearch.json)
// ---------------------------------------------------------------------------

export interface FinlifeMortgageBase {
  dcls_month: string;
  fin_co_no: string;
  fin_prdt_cd: string;
  kor_co_nm: string;
  fin_prdt_nm: string;
  join_way: string;
  loan_inci_expn: string;        // 대출 부대비용
  erly_rpay_fee: string;         // 중도상환 수수료
  dly_rate: string;              // 연체 이자율
  loan_lmt: string;              // 대출 한도
  dcls_strt_day: string;
  dcls_end_day: string | null;
  fin_co_subm_day: string;
}

export interface FinlifeMortgageOption {
  dcls_month: string;
  fin_co_no: string;
  fin_prdt_cd: string;
  mrtg_type: string;             // 담보 유형 코드 (A:아파트, E:아파트 외)
  mrtg_type_nm: string;
  rpay_type: string;             // 대출 상환 유형 코드 (S:분할상환, D:만기일시)
  rpay_type_nm: string;
  lend_rate_type: string;        // 금리 유형 코드 (F:고정, C:변동, M:혼합)
  lend_rate_type_nm: string;
  lend_rate_min: number | null;  // 대출금리 최저
  lend_rate_max: number | null;  // 대출금리 최고
  lend_rate_avg: number | null;  // 전월 평균금리
}

export type FinlifeMortgageResponse = FinlifeResultWrapper<
  FinlifeMortgageBase,
  FinlifeMortgageOption
>;

// ---------------------------------------------------------------------------
// 6. 전세자금대출 API (rentHouseLoanProductsSearch.json)
// ---------------------------------------------------------------------------

export interface FinlifeRentLoanBase {
  dcls_month: string;
  fin_co_no: string;
  fin_prdt_cd: string;
  kor_co_nm: string;
  fin_prdt_nm: string;
  join_way: string;
  loan_inci_expn: string;
  erly_rpay_fee: string;
  dly_rate: string;
  loan_lmt: string;
  dcls_strt_day: string;
  dcls_end_day: string | null;
  fin_co_subm_day: string;
}

export interface FinlifeRentLoanOption {
  dcls_month: string;
  fin_co_no: string;
  fin_prdt_cd: string;
  rpay_type: string;
  rpay_type_nm: string;
  lend_rate_type: string;
  lend_rate_type_nm: string;
  lend_rate_min: number | null;
  lend_rate_max: number | null;
  lend_rate_avg: number | null;
}

export type FinlifeRentLoanResponse = FinlifeResultWrapper<
  FinlifeRentLoanBase,
  FinlifeRentLoanOption
>;

// ---------------------------------------------------------------------------
// 7. 개인신용대출 API (creditLoanProductsSearch.json)
// ---------------------------------------------------------------------------

export interface FinlifeCreditLoanBase {
  dcls_month: string;
  fin_co_no: string;
  fin_prdt_cd: string;
  kor_co_nm: string;
  fin_prdt_nm: string;
  join_way: string;
  cb_name: string;               // CB 회사명
  crdt_prdt_type: string;        // 신용 대출 상품 유형 코드
  crdt_prdt_type_nm: string;     // 신용 대출 상품 유형명
  dcls_strt_day: string;
  dcls_end_day: string | null;
  fin_co_subm_day: string;
}

export interface FinlifeCreditLoanOption {
  dcls_month: string;
  fin_co_no: string;
  fin_prdt_cd: string;
  crdt_prdt_type: string;
  crdt_lend_rate_type: string;   // 금리 구분 코드
  crdt_lend_rate_type_nm: string;
  crdt_grad_1: number | null;    // 900점 초과
  crdt_grad_4: number | null;    // 801~900점
  crdt_grad_5: number | null;    // 701~800점
  crdt_grad_6: number | null;    // 601~700점
  crdt_grad_10: number | null;   // 501~600점
  crdt_grad_11: number | null;   // 401~500점
  crdt_grad_12: number | null;   // 301~400점
  crdt_grad_13: number | null;   // 300점 이하
  crdt_grad_avg: number | null;  // 평균 금리
}

export type FinlifeCreditLoanResponse = FinlifeResultWrapper<
  FinlifeCreditLoanBase,
  FinlifeCreditLoanOption
>;

// ---------------------------------------------------------------------------
// 공통 검색 파라미터
// ---------------------------------------------------------------------------

export interface FinlifeSearchParams {
  topFinGrpNo: TopFinGrpNo;   // 권역코드 (필수)
  pageNo?: number;            // 페이지 번호 (기본 1)
  finCoNo?: string;           // 금융회사 코드 (금융회사 API 전용 필터)
}
