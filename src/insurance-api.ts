/**
 * 금융위원회 보험상품 공시 (data.go.kr) API 클라이언트
 *
 * 9종 오퍼레이션 제공 (6개 서비스):
 *   1. 실손보험정보              GetMedicalReimbursementInsuranceInfoService/getInsuranceInfo
 *   2. 일반손해보험가입정보      GetFPPptInsuJoinInfoService/getPropertyInsuJoinInfo
 *   3. 자동차보험 계약정보       GetFPAtmbInsujoinInfoService/getContractInfo
 *   4. 자동차보험 사고현황       GetFPAtmbInsujoinInfoService/getLosCircumstance
 *   5. 자동차보험 피해자정보     GetFPAtmbInsujoinInfoService/getVictimInfo
 *   6. 변액보험 펀드정보         GetVariableInsuranceInfoService/getFundInfo
 *   7. 생명보험 가입현황         GetFPLifeInsuJoinInfoService/getLifeInsuJoinStatus
 *   8. 개인연금보험 가입정보     GetFPLifeInsuJoinInfoService/getIndividualAnnuityInsuInfo
 *   9. 퇴직연금 펀드정보         GetRetirementPensionInfoService/getFundInfo
 *
 * 인증: DATA20_SERVICE_KEY 재사용 (data.go.kr 통합 API 키).
 *       단, 각 API별로 활용신청이 별도 승인되어야 호출 가능.
 *       2026-04 기준 1번(getInsuranceInfo)만 승인됨, 나머지는 활용신청 필요.
 *
 * 공통 응답:
 *   { response: { header: { resultCode, resultMsg }, body: { items: { item: [...] }, totalCount, pageNo, numOfRows } } }
 *   resultCode === "00" 이 성공
 */

import { fetchWithRetry } from "./http-client.js";
import type {
  InsuranceFetchResult,
  MedicalReimbursementItem,
  MedicalReimbursementSearchParams,
  PropertyInsuJoinItem,
  PropertyInsuJoinSearchParams,
  AutoContractItem,
  AutoContractSearchParams,
  AutoLosCircumstanceItem,
  AutoLosCircumstanceSearchParams,
  AutoVictimItem,
  AutoVictimSearchParams,
  VariableInsuranceFundItem,
  VariableInsuranceFundSearchParams,
  LifeInsuJoinStatusItem,
  LifeInsuJoinStatusSearchParams,
  IndividualAnnuityInsuItem,
  IndividualAnnuityInsuSearchParams,
  RetirementPensionFundItem,
  RetirementPensionFundSearchParams,
} from "./insurance-types.js";

const REQUEST_TIMEOUT_MS = 15000;
const MAX_RETRIES = 2;

const DATA_GO_KR_ERRORS: Record<string, string> = {
  "01": "어플리케이션 에러",
  "02": "DB 에러",
  "03": "데이터 없음",
  "04": "HTTP 에러",
  "05": "서비스 타임아웃",
  "10": "잘못된 요청 파라미터",
  "11": "필수 파라미터 누락",
  "12": "등록되지 않은 서비스",
  "20": "서비스 접근 거부 (활용신청 미승인)",
  "21": "일시적 사용 불가",
  "22": "일일 요청 한도 초과",
  "30": "등록되지 않은 서비스 키",
  "31": "만료된 서비스 키",
  "32": "최대 요청 횟수 초과",
};

// ---------------------------------------------------------------------------
// 공통 헬퍼
// ---------------------------------------------------------------------------

function buildUrl(baseUrl: string, serviceKey: string, params: Record<string, string>): string {
  const url = new URL(baseUrl);
  url.searchParams.set("serviceKey", serviceKey);
  for (const [key, value] of Object.entries(params)) {
    if (value) url.searchParams.set(key, value);
  }
  return url.toString();
}

function throwIfErrorCode(code: string, msg?: string): void {
  if (code === "00" || code === "0") return;
  throw new Error(DATA_GO_KR_ERRORS[code] || msg || `오류 코드: ${code}`);
}

async function fetchJson<T>(
  baseUrl: string,
  serviceKey: string,
  params: Record<string, string>,
): Promise<InsuranceFetchResult<T>> {
  const response = await fetchWithRetry(buildUrl(baseUrl, serviceKey, params), {
    timeoutMs: REQUEST_TIMEOUT_MS,
    maxRetries: MAX_RETRIES,
  });
  if (!response.ok) throw new Error(`보험 API 오류: HTTP ${response.status}`);

  const data = (await response.json()) as Record<string, unknown>;
  const top = (data.response || data) as Record<string, unknown>;
  const header = top.header as Record<string, unknown> | undefined;
  const body = top.body as Record<string, unknown> | undefined;

  throwIfErrorCode(String(header?.resultCode ?? "00"), String(header?.resultMsg ?? ""));

  let items: T[];
  const bodyItems = body?.items as Record<string, unknown> | unknown[] | undefined;
  if (
    bodyItems &&
    typeof bodyItems === "object" &&
    !Array.isArray(bodyItems) &&
    (bodyItems as Record<string, unknown>).item
  ) {
    const raw = (bodyItems as Record<string, unknown>).item;
    items = Array.isArray(raw) ? (raw as T[]) : [raw as T];
  } else if (Array.isArray(bodyItems)) {
    items = bodyItems as T[];
  } else {
    items = [];
  }

  return {
    totalCount: Number(body?.totalCount) || 0,
    pageNo: Number(body?.pageNo) || 1,
    numOfRows: Number(body?.numOfRows) || 0,
    items,
  };
}

function pageParams(pageNo?: number, numOfRows?: number): Record<string, string> {
  return {
    pageNo: String(pageNo ?? 1),
    numOfRows: String(numOfRows ?? 10),
  };
}

// ---------------------------------------------------------------------------
// 1. 실손보험정보
// ---------------------------------------------------------------------------

export async function searchMedicalReimbursementInsurance(
  serviceKey: string,
  params: MedicalReimbursementSearchParams,
): Promise<InsuranceFetchResult<MedicalReimbursementItem>> {
  return fetchJson<MedicalReimbursementItem>(
    "https://apis.data.go.kr/1160100/service/GetMedicalReimbursementInsuranceInfoService/getInsuranceInfo",
    serviceKey,
    {
      resultType: "json",
      basDt: params.basDt || "",
      beginBasDt: params.beginBasDt || "",
      endBasDt: params.endBasDt || "",
      cmpyCd: params.cmpyCd || "",
      cmpyNm: params.cmpyNm || "",
      ptrn: params.ptrn || "",
      mog: params.mog || "",
      prdNm: params.prdNm || "",
      likePrdNm: params.likePrdNm || "",
      age: params.age || "",
      ofrInstNm: params.ofrInstNm || "",
      ...pageParams(params.pageNo, params.numOfRows),
    },
  );
}

// ---------------------------------------------------------------------------
// 2. 일반손해보험가입정보
// ---------------------------------------------------------------------------

export async function searchPropertyInsuJoin(
  serviceKey: string,
  params: PropertyInsuJoinSearchParams,
): Promise<InsuranceFetchResult<PropertyInsuJoinItem>> {
  return fetchJson<PropertyInsuJoinItem>(
    "https://apis.data.go.kr/1160100/service/GetFPPptInsuJoinInfoService/getPropertyInsuJoinInfo",
    serviceKey,
    {
      resultType: "json",
      sttsAccmlTrgtYr: params.sttsAccmlTrgtYr || "",
      likeSttsAccmlTrgtYr: params.likeSttsAccmlTrgtYr || "",
      beginSttsAccmlTrgtYr: params.beginSttsAccmlTrgtYr || "",
      endSttsAccmlTrgtYr: params.endSttsAccmlTrgtYr || "",
      mogClsfNm: params.mogClsfNm || "",
      objcClsfNm: params.objcClsfNm || "",
      ...pageParams(params.pageNo, params.numOfRows),
    },
  );
}

// ---------------------------------------------------------------------------
// 3. 자동차보험 계약정보
// ---------------------------------------------------------------------------

export async function searchAutoContract(
  serviceKey: string,
  params: AutoContractSearchParams,
): Promise<InsuranceFetchResult<AutoContractItem>> {
  return fetchJson<AutoContractItem>(
    "https://apis.data.go.kr/1160100/service/GetFPAtmbInsujoinInfoService/getContractInfo",
    serviceKey,
    {
      resultType: "json",
      isuCmpyOfrYm: params.isuCmpyOfrYm || "",
      beginIsuCmpyOfrYm: params.beginIsuCmpyOfrYm || "",
      endIsuCmpyOfrYm: params.endIsuCmpyOfrYm || "",
      isuItmsNm: params.isuItmsNm || "",
      mogClsfNm: params.mogClsfNm || "",
      sexNm: params.sexNm || "",
      aggr: params.aggr || "",
      atmbPlorNm: params.atmbPlorNm || "",
      kncrNm: params.kncrNm || "",
      ...pageParams(params.pageNo, params.numOfRows),
    },
  );
}

// ---------------------------------------------------------------------------
// 4. 자동차보험 사고현황
// ---------------------------------------------------------------------------

export async function searchAutoLosCircumstance(
  serviceKey: string,
  params: AutoLosCircumstanceSearchParams,
): Promise<InsuranceFetchResult<AutoLosCircumstanceItem>> {
  return fetchJson<AutoLosCircumstanceItem>(
    "https://apis.data.go.kr/1160100/service/GetFPAtmbInsujoinInfoService/getLosCircumstance",
    serviceKey,
    {
      resultType: "json",
      isuCmpyOfrYm: params.isuCmpyOfrYm || "",
      beginIsuCmpyOfrYm: params.beginIsuCmpyOfrYm || "",
      endIsuCmpyOfrYm: params.endIsuCmpyOfrYm || "",
      isuItmsNm: params.isuItmsNm || "",
      mogClsfNm: params.mogClsfNm || "",
      kncrNm: params.kncrNm || "",
      ...pageParams(params.pageNo, params.numOfRows),
    },
  );
}

// ---------------------------------------------------------------------------
// 5. 자동차보험 피해자 정보
// ---------------------------------------------------------------------------

export async function searchAutoVictim(
  serviceKey: string,
  params: AutoVictimSearchParams,
): Promise<InsuranceFetchResult<AutoVictimItem>> {
  return fetchJson<AutoVictimItem>(
    "https://apis.data.go.kr/1160100/service/GetFPAtmbInsujoinInfoService/getVictimInfo",
    serviceKey,
    {
      resultType: "json",
      atmbAcdnCnlsYm: params.atmbAcdnCnlsYm || "",
      beginAtmbAcdnCnlsYm: params.beginAtmbAcdnCnlsYm || "",
      endAtmbAcdnCnlsYm: params.endAtmbAcdnCnlsYm || "",
      dthInjClsfNm: params.dthInjClsfNm || "",
      impYn: params.impYn || "",
      injLvlcntCd: params.injLvlcntCd || "",
      impLvlcntCd: params.impLvlcntCd || "",
      ...pageParams(params.pageNo, params.numOfRows),
    },
  );
}

// ---------------------------------------------------------------------------
// 6. 변액보험 펀드정보 (GetVariableInsuranceInfoService/getFundInfo)
// ---------------------------------------------------------------------------

export async function searchVariableInsuranceFund(
  serviceKey: string,
  params: VariableInsuranceFundSearchParams,
): Promise<InsuranceFetchResult<VariableInsuranceFundItem>> {
  return fetchJson<VariableInsuranceFundItem>(
    "https://apis.data.go.kr/1160100/service/GetVariableInsuranceInfoService/getFundInfo",
    serviceKey,
    {
      resultType: "json",
      cmpyCd: params.cmpyCd || "",
      cmpyNm: params.cmpyNm || "",
      likeCmpyNm: params.likeCmpyNm || "",
      fndNm: params.fndNm || "",
      likeFndNm: params.likeFndNm || "",
      fndCd: params.fndCd || "",
      basDt: params.basDt || "",
      beginBasDt: params.beginBasDt || "",
      endBasDt: params.endBasDt || "",
      likeBasDt: params.likeBasDt || "",
      ...pageParams(params.pageNo, params.numOfRows),
    },
  );
}

// ---------------------------------------------------------------------------
// 7. 생명보험 가입현황 (GetFPLifeInsuJoinInfoService/getLifeInsuJoinStatus)
// ---------------------------------------------------------------------------

export async function searchLifeInsuJoinStatus(
  serviceKey: string,
  params: LifeInsuJoinStatusSearchParams,
): Promise<InsuranceFetchResult<LifeInsuJoinStatusItem>> {
  return fetchJson<LifeInsuJoinStatusItem>(
    "https://apis.data.go.kr/1160100/service/GetFPLifeInsuJoinInfoService/getLifeInsuJoinStatus",
    serviceKey,
    {
      resultType: "json",
      sttsAccmlTrgtYr: params.sttsAccmlTrgtYr || "",
      areaNm: params.areaNm || "",
      sexNm: params.sexNm || "",
      rchnAggr: params.rchnAggr || "",
      isuKindNm: params.isuKindNm || "",
      ...pageParams(params.pageNo, params.numOfRows),
    },
  );
}

// ---------------------------------------------------------------------------
// 8. 개인연금보험 가입정보 (GetFPLifeInsuJoinInfoService/getIndividualAnnuityInsuInfo)
// ---------------------------------------------------------------------------

export async function searchIndividualAnnuityInsu(
  serviceKey: string,
  params: IndividualAnnuityInsuSearchParams,
): Promise<InsuranceFetchResult<IndividualAnnuityInsuItem>> {
  return fetchJson<IndividualAnnuityInsuItem>(
    "https://apis.data.go.kr/1160100/service/GetFPLifeInsuJoinInfoService/getIndividualAnnuityInsuInfo",
    serviceKey,
    {
      resultType: "json",
      sttsAccmlTrgtYr: params.sttsAccmlTrgtYr || "",
      rchnAggr: params.rchnAggr || "",
      taxPrqlYn: params.taxPrqlYn || "",
      pymtMthNm: params.pymtMthNm || "",
      offrTyNm: params.offrTyNm || "",
      yerUnitPymtTerm: params.yerUnitPymtTerm || "",
      ...pageParams(params.pageNo, params.numOfRows),
    },
  );
}

// ---------------------------------------------------------------------------
// 9. 퇴직연금 펀드정보 (GetRetirementPensionInfoService/getFundInfo)
// ---------------------------------------------------------------------------

export async function searchRetirementPensionFund(
  serviceKey: string,
  params: RetirementPensionFundSearchParams,
): Promise<InsuranceFetchResult<RetirementPensionFundItem>> {
  return fetchJson<RetirementPensionFundItem>(
    "https://apis.data.go.kr/1160100/service/GetRetirementPensionInfoService/getFundInfo",
    serviceKey,
    {
      resultType: "json",
      cmpyCd: params.cmpyCd || "",
      cmpyNm: params.cmpyNm || "",
      likeCmpyNm: params.likeCmpyNm || "",
      fndNm: params.fndNm || "",
      likeFndNm: params.likeFndNm || "",
      fndCd: params.fndCd || "",
      basDt: params.basDt || "",
      beginBasDt: params.beginBasDt || "",
      endBasDt: params.endBasDt || "",
      likeBasDt: params.likeBasDt || "",
      beginBasprc: params.beginBasprc || "",
      endBasprc: params.endBasprc || "",
      ofrInstNm: params.ofrInstNm || "",
      ...pageParams(params.pageNo, params.numOfRows),
    },
  );
}
