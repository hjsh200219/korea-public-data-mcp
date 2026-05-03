/**
 * 한국수출입은행 환율 API 타입 정의
 * https://oapi.koreaexim.go.kr
 */

export interface EximExchangeRateRaw {
  result: number;
  cur_unit: string;
  ttb: string;
  tts: string;
  deal_bas_r: string;
  bkpr: string;
  yy_efee_r: string;
  ten_dd_efee_r: string;
  kftc_bkpr: string;
  kftc_deal_bas_r: string;
  cur_nm: string;
}

export interface EximExchangeRate {
  currency: string;
  currencyName: string;
  dealBaseRate: number;
  ttBuy: string;
  ttSell: string;
  baseRate: string;
}
