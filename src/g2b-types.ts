/**
 * 나라장터(G2B) 조달청 API 타입 정의
 * - BidPublicInfoService (입찰공고정보)
 * - ScsbidInfoService (낙찰정보)
 */

/** 공통 API 응답 래퍼 */
export interface G2bResponse<T> {
  response: {
    header: { resultCode: string; resultMsg: string };
    body: {
      items: T[];
      numOfRows: number;
      pageNo: number;
      totalCount: number;
    };
  };
}

/** 입찰공고 항목 (물품/용역/공사/외자 공통 필드) */
export interface BidPublicItem {
  bidNtceNo: string;
  bidNtceOrd: string;
  bidNtceNm: string;
  ntceInsttNm: string;
  dminsttNm: string;
  bidNtceDt: string;
  bidBeginDt: string;
  bidClseDt: string;
  opengDt: string;
  bidMethdNm: string;
  cntrctCnclsMthdNm: string;
  presmptPrce: string;
  asignBdgtAmt: string;
  sucsfbidMthdNm: string;
  rgstDt: string;
  bidNtceDtlUrl: string;
  ntceInsttOfclNm: string;
  ntceInsttOfclTelNo: string;
  reNtceYn: string;
  rbidPermsnYn: string;
  prdctClsfcLmtYn: string;
  dtilPrdctClsfcNo?: string;
  dtilPrdctClsfcNoNm?: string;
  bidPrtcptFee?: string;
  cmmnSpldmdMethdNm?: string;
  indstrytyLmtYn?: string;
  chgDt?: string;
  chgNtceRsn?: string;
}

/** 낙찰정보 항목 (물품/용역/공사/외자 공통 필드) */
export interface ScsbidItem {
  bidNtceNo: string;
  bidNtceOrd: string;
  bidNtceNm: string;
  bidClsfcNo: string;
  rbidNo: string;
  prtcptCnum: string;
  bidwinnrNm: string;
  bidwinnrBizno: string;
  bidwinnrCeoNm: string;
  bidwinnrAdrs: string;
  bidwinnrTelNo: string;
  sucsfbidAmt: string;
  sucsfbidRate: string;
  rlOpengDt: string;
  dminsttCd: string;
  dminsttNm: string;
  rgstDt: string;
  fnlSucsfDate: string;
}


/** 입찰 유형 */
export type BidType = "thng" | "servc" | "cnstwk" | "frgcpt";

export const BID_TYPE_LABELS: Record<BidType, string> = {
  thng: "물품",
  servc: "용역",
  cnstwk: "공사",
  frgcpt: "외자",
};
