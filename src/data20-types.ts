/**
 * 공공데이터포털 (data.go.kr) API 타입 정의
 * DATA20_SERVICE_KEY 기반 API 공통 타입
 */

export interface DataGoKrResult<T> {
  totalCount: number;
  pageNo: number;
  numOfRows: number;
  items: T[];
}

// --- 약국정보 ---

export interface PharmacyItem {
  yadmNm: string;
  addr: string;
  telno: string;
  sidoCdNm: string;
  sgguCdNm: string;
  emdongNm: string;
  postNo: string;
  clCdNm: string;
  XPos: string;
  YPos: string;
}

// --- 병원정보 ---

export interface HospitalItem {
  yadmNm: string;
  addr: string;
  telno: string;
  sidoCdNm: string;
  sgguCdNm: string;
  emdongNm: string;
  postNo: string;
  clCd: string;
  clCdNm: string;
  dgsbjtCdNm: string;
  XPos: string;
  YPos: string;
  hospUrl: string;
  estbDd: string;
  drTotCnt: string;
}

// --- 주식배당정보 ---

export interface StockDividendItem {
  basDt: string;
  crno: string;
  stckIssuCmpyNm: string;
  isinCdNm: string;
  stckParPrc: string;
  dvdnBasDt: string;
  cashDvdnPayDt: string;
  stckGenrDvdnAmt: string;
  stckGenrCashDvdnRt: string;
  stckDvdnRcdNm: string;
}

// --- 희귀의약품정보 ---

export interface RareMedicineItem {
  PRODT_NAME: string;
  MANUF_NAME: string;
  MANUFPLACE_NAME: string;
  TARGET_DISEASE: string;
  GOODS_NAME: string;
  APPOINT_DATE: string;
  DEVSTEP_YN: string;
  RARITY_DRUG_APPOINT_NO: string;
}

// --- 건강식품정보 ---

export interface HealthFoodItem {
  PRDUCT: string;
  ENTRPS: string;
  STTEMNT_NO: string;
  REGIST_DT: string;
  DISTB_PD: string;
  MAIN_FNCTN: string;
  SRV_USE: string;
  INTAKE_HINT1: string;
}

// --- 생동성인정품목 ---

export interface BioEquivalenceItem {
  ITEM_SEQ: string;
  ITEM_NAME: string;
  ENTP_NAME: string;
  INGR_KOR_NAME: string;
  INGR_QTY: string;
  SHAPE_CODE_NAME: string;
  BIOEQ_PRODT_NOTICE_DATE: string;
}

// --- 의약품 특허정보 ---
// 식약처 MdcinPatentInfoService2 JSON은 구스키마(PATENT_*)와 신규(DOMESTIC_*, INGR_NAME, SHAPE 등)가 혼재 — data20-api에서 정규화

export interface MedicinePatentItem {
  ITEM_SEQ: string;
  ITEM_NAME: string;
  ITEM_ENG_NAME: string;
  ENTP_NAME: string;
  INGR_KOR_NAME: string;
  INGR_ENG_NAME: string;
  PATENT_NO: string;
  PATENT_DATE: string;
  PATENT_EXPIRY_DATE: string;
  DOSAGE_FORM: string;
}

// --- 사업자등록정보 ---

export interface BusinessValidateRequest {
  b_no: string;
  start_dt: string;
  p_nm: string;
  b_nm?: string;
}

export interface BusinessValidateResult {
  b_no: string;
  valid: string;
  valid_msg: string;
  request_param: Record<string, string>;
  status: Record<string, string>;
}

export interface BusinessStatusResult {
  b_no: string;
  b_stt: string;
  b_stt_cd: string;
  tax_type: string;
  tax_type_cd: string;
  end_dt: string;
  utcc_yn: string;
  tax_type_change_dt: string;
  invoice_apply_dt: string;
}

// --- 온비드 차세대 공고물건상세 (B010003/OnbidPbancCltrDtlSrvc2/getPbancCltrInf2) — 응답 필드는 물건 유형에 따라 가변 ---

export type OnbidPbancCltrItem = Record<string, unknown>;

// --- 온비드 차세대 공고목록 (B010003/OnbidPbancListSrvc2/getPbancList2) — 응답 필드는 공고 유형에 따라 가변 ---

export type OnbidPbancListItem = Record<string, unknown>;
