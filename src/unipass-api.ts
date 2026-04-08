/**
 * 관세청 UNI-PASS API 클라이언트
 * https://unipass.customs.go.kr:38010/ext/rest
 */

import { XMLParser, XMLValidator } from "fast-xml-parser";
import { toKSTDate, formatYYYYMMDD, subtractDays } from "./kst-date.js";
import type {
  CargoTrackingItem,
  ContainerItem,
  DeclarationItem,
  HsCodeItem,
  TariffRateItem,
  CustomsExchangeRateItem,
  CustomsExchangeRateResult,
  CompanyItem,
  BrokerItem,
  InspectionItem,
  ArrivalReportItem,
  AnimalPlantCompanyItem,
  BondedAreaItem,
  TaxPaymentItem,
  ExportPerformanceItem,
  ImportRequirementItem,
  ShedInfoItem,
  ForwarderListItem,
  ForwarderDetailItem,
  AirlineListItem,
  AirlineDetailItem,
  OverseasSupplierItem,
  BrokerDetailItem,
  SimpleDrawbackItem,
  SimpleDrawbackCompanyItem,
  ExportPeriodShortItem,
  StatisticsCodeItem,
  BondedTransportVehicleItem,
  PortEntryExitItem,
  SingleWindowHistoryItem,
  ShipCompanyListItem,
  ShipCompanyDetailItem,
  CustomsCheckItem,
  PostalCustomsItem,
  AttachmentSubmitItem,
  ReimportExportBalanceItem,
  ExportDeclarationVerifyItem,
  ExportByVehicleItem,
  PostalClearanceItem,
  UnloadingDeclarationItem,
  SeaDeparturePermitItem,
  AirDeparturePermitItem,
  ReexportDutyFreeBalanceItem,
  HsCodeNavigationItem,
  AirArrivalReportItem,
  ReexportDeadlineItem,
  ReexportCompletionItem,
  BondedReleaseItem,
  CollateralReleaseItem,
  EcommerceExportLoadItem,
  DeclarationCorrectionItem,
  LoadingInspectionItem,
  BondedTransportInfoItem,
} from "./unipass-types.js";

const UNIPASS_BASE_URL = "https://unipass.customs.go.kr:38010/ext/rest";
const TIMEOUT_MS = 30000;

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  trimValues: true,
  parseTagValue: false,
});

// --- 공통 유틸 ---

export function buildUnipassUrl(
  apiKeys: Record<string, string>,
  apiId: string,
  path: string,
  params?: Record<string, string>,
): string {
  const key = apiKeys[apiId];
  if (!key) {
    throw new Error(`UNIPASS_KEY_API${apiId} 환경변수가 설정되지 않았습니다.`);
  }
  const url = new URL(`${UNIPASS_BASE_URL}${path}`);
  url.searchParams.set("crkyCn", key);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }
  }
  return url.toString();
}

export function parseUnipassXml(xml: string): Record<string, unknown> {
  const validation = XMLValidator.validate(xml);
  if (validation !== true) {
    throw new Error(
      `잘못된 XML: ${(validation as { err: { msg: string } }).err.msg}`,
    );
  }
  const result = xmlParser.parse(xml);
  if (!result || typeof result !== "object") {
    throw new Error("XML 파싱 결과가 올바르지 않습니다.");
  }
  return result as Record<string, unknown>;
}

async function fetchUnipassXml(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      method: "GET",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) return null;
    return response.text();
  } catch (e) {
    throw new Error(`UNI-PASS 요청 실패: ${url}`, { cause: e });
  }
}

function isNtceError(root: Record<string, unknown>): boolean {
  const ntce = root.ntceInfo;
  if (ntce == null || ntce === "") return false;
  if (typeof ntce === "object") {
    const obj = ntce as Record<string, unknown>;
    if (obj.resultCode === "00" || !obj.resultCode) return false;
    return true;
  }
  const msg = String(ntce);
  return msg.includes("필수입력") || msg.includes("오류");
}

function extractList(
  parsed: Record<string, unknown>,
  rootKey: string,
  itemKey: string,
): Record<string, unknown>[] | null {
  const root = parsed[rootKey] as Record<string, unknown> | undefined;
  if (!root) return null;
  if (isNtceError(root)) return null;

  const items = root[itemKey];
  if (!items) return null;

  const arr = Array.isArray(items) ? items : [items];
  return arr as Record<string, unknown>[];
}

function extractSingle(
  parsed: Record<string, unknown>,
  rootKeys: string[],
  itemKeys: string[],
): Record<string, string> | null {
  for (const rootKey of rootKeys) {
    const root = parsed[rootKey] as Record<string, unknown> | undefined;
    if (!root) continue;
    if (isNtceError(root)) continue;

    for (const itemKey of itemKeys) {
      const item = root[itemKey];
      if (!item) continue;
      const first = Array.isArray(item) ? item[0] : item;
      return first as Record<string, string>;
    }
  }
  return null;
}

function str(val: unknown): string {
  return val != null ? String(val) : "";
}

// --- API001: 화물통관진행정보 ---

export async function getCargoTracking(
  apiKeys: Record<string, string>,
  blNumber: string,
  blYy?: string,
): Promise<CargoTrackingItem[]> {
  const params: Record<string, string> = { mblNo: blNumber };
  if (blYy) params.blYy = blYy;
  const url = buildUnipassUrl(apiKeys, "001", "/cargCsclPrgsInfoQry/retrieveCargCsclPrgsInfo", params);
  const xml = await fetchUnipassXml(url);
  if (!xml) return [];

  try {
    const parsed = parseUnipassXml(xml);
    const list = extractList(parsed, "cargCsclPrgsInfoQryRtnVo", "cargCsclPrgsInfoQryVo");
    if (!list) return [];
    return list.map((item) => ({
      cargMtNo: str(item.cargMtNo),
      prgsStts: str(item.prgsStts),
      prgsSttsCd: str(item.prgsSttsCd),
      csclPrgsDate: str(item.csclPrgsDate),
    }));
  } catch (e) {
    throw new Error("UNI-PASS 화물통관진행정보 조회 실패", { cause: e });
  }
}

// --- API020: 컨테이너내역 ---

export async function getContainerInfo(
  apiKeys: Record<string, string>,
  blNumber: string,
): Promise<ContainerItem[]> {
  const url = buildUnipassUrl(apiKeys, "020", "/cntrQryBrkdQry/retrieveCntrQryBrkd", {
    cargMtNo: blNumber,
  });
  const xml = await fetchUnipassXml(url);
  if (!xml) return [];

  try {
    const parsed = parseUnipassXml(xml);
    const list = extractList(parsed, "cntrQryBrkdQryRtnVo", "cntrQryBrkdQryRsltVo");
    if (!list) return [];
    return list.map((item) => ({
      cntrNo: str(item.cntrNo),
      cntrSzCd: str(item.cntrSzCd),
      sealNo: str(item.sealNo),
    }));
  } catch (e) {
    throw new Error("UNI-PASS 컨테이너내역 조회 실패", { cause: e });
  }
}

// --- API022: 수입신고 검증 ---

export async function verifyImportDeclaration(
  apiKeys: Record<string, string>,
  declarationNo: string,
): Promise<DeclarationItem | null> {
  const url = buildUnipassUrl(apiKeys, "022", "/impDclrCrfnVrfcQry/retrieveImpDclrCrfnVrfc", {
    impDclrNo: declarationNo,
  });
  const xml = await fetchUnipassXml(url);
  if (!xml) return null;

  try {
    const parsed = parseUnipassXml(xml);
    const item = extractSingle(
      parsed,
      ["impDclrCrfnVrfcQryRtnVo"],
      ["impDclrCrfnVrfcQryRsltVo"],
    );
    if (!item) return null;

    return {
      dclrNo: str(item.dclrNo),
      dclrDt: str(item.dclrDt),
      dclrSttsCd: str(item.dclrSttsCd),
      dclrSttsNm: str(item.dclrSttsNm),
      blNo: str(item.blNo),
      trdnNm: str(item.trdnNm),
      hsSgn: str(item.hsSgn),
      wght: str(item.wght),
      gcnt: str(item.gcnt),
    };
  } catch (e) {
    throw new Error("UNI-PASS 수입신고 검증 실패", { cause: e });
  }
}

// --- API018: HS코드 검색 ---

export async function searchHsCode(
  apiKeys: Record<string, string>,
  hsCode: string,
): Promise<HsCodeItem[]> {
  const url = buildUnipassUrl(apiKeys, "018", "/hsSgnQry/searchHsSgn", {
    hsSgn: hsCode,
    koenTp: "1",
  });
  const xml = await fetchUnipassXml(url);
  if (!xml) return [];

  try {
    const parsed = parseUnipassXml(xml);
    const list = extractList(parsed, "hsSgnSrchRtnVo", "hsSgnSrchRsltVo");
    if (!list) return [];
    return list.map((item) => ({
      hsSgn: str(item.hsSgn),
      korePrnm: str(item.korePrnm),
      englPrnm: str(item.englPrnm),
      txrt: str(item.txrt),
      txtpSgn: str(item.txtpSgn),
      wghtUt: str(item.wghtUt),
    }));
  } catch (e) {
    throw new Error("UNI-PASS HS코드 검색 실패", { cause: e });
  }
}

// --- API030: 관세율 기본 조회 ---

export async function getTariffRate(
  apiKeys: Record<string, string>,
  hsCode: string,
): Promise<TariffRateItem[]> {
  const url = buildUnipassUrl(apiKeys, "030", "/trrtQry/retrieveTrrt", {
    hsSgn: hsCode,
  });
  const xml = await fetchUnipassXml(url);
  if (!xml) return [];

  try {
    const parsed = parseUnipassXml(xml);
    const list = extractList(parsed, "trrtQryRtnVo", "trrtQryRsltVo");
    if (!list) return [];

    return list.map((item) => ({
      hsSgn: str(item.hsSgn),
      trrt: str(item.trrt),
      trrtTpcd: str(item.trrtTpcd),
      trrtTpNm: str(item.trrtTpNm),
      aplyStrtDt: str(item.aplyStrtDt),
      aplyEndDt: str(item.aplyEndDt),
    }));
  } catch (e) {
    throw new Error("UNI-PASS 관세율 조회 실패", { cause: e });
  }
}

// --- API012: 관세환율 ---

/** 특정 날짜의 관세 환율을 직접 fetch (fetchUnipassXml 우회 — 실패/무결과 분리) */
async function fetchCustomsRatesForDate(
  apiKeys: Record<string, string>,
  dateParam: string,
  imexTp: string,
  currencies: string[],
): Promise<CustomsExchangeRateItem[]> {
  const params: Record<string, string> = { qryYymmDd: dateParam, imexTp };
  const url = buildUnipassUrl(apiKeys, "012", "/trifFxrtInfoQry/retrieveTrifFxrtInfo", params);

  const response = await fetch(url, { method: "GET", signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!response.ok) {
    throw new Error(`관세환율 API HTTP 오류: ${response.status}`);
  }

  const xml = await response.text();
  const parsed = parseUnipassXml(xml);

  const root = parsed.trifFxrtInfoQryRtnVo as Record<string, unknown> | undefined;
  if (!root) return [];
  if (isNtceError(root)) {
    const ntce = root.ntceInfo as Record<string, unknown> | undefined;
    const code = ntce?.resultCode ?? "";
    const msg = ntce?.resultMsg ?? String(root.ntceInfo);
    throw new Error(`관세환율 API 오류: ${code} ${msg}`);
  }

  const items = root.trifFxrtInfoQryRsltVo;
  if (!items) return [];

  const arr = Array.isArray(items) ? items : [items];
  return (arr as Record<string, unknown>[])
    .map((item) => ({
      currSgn: str(item.currSgn),
      fxrt: str(item.fxrt),
      aplyBgnDt: str(item.aplyBgnDt),
      mtryUtNm: str(item.mtryUtNm),
      cntySgn: str(item.cntySgn),
      imexTp: str(item.imexTp),
    }))
    .filter((item) => currencies.includes(item.currSgn.toUpperCase()));
}

/**
 * 관세 환율 조회 — 주 단위 폴백.
 * 관세 환율은 주 단위 고시이므로 빈 결과 시 7일 전으로 1회 점프 (최대 API 호출 2회).
 */
export async function getCustomsExchangeRates(
  apiKeys: Record<string, string>,
  currencies?: string[],
  qryYymmDd?: string,
  imexTp?: string,
): Promise<CustomsExchangeRateResult> {
  const requestDate = qryYymmDd ?? formatYYYYMMDD(toKSTDate());
  const filter = currencies ?? ["USD", "EUR", "JPY", "CNY", "GBP"];
  const tp = imexTp ?? "1";

  const candidates = [requestDate, subtractDays(requestDate, 7)];

  for (const candidate of candidates) {
    try {
      const rates = await fetchCustomsRatesForDate(apiKeys, candidate, tp, filter);
      if (rates.length > 0) {
        return {
          rates,
          queriedDate: candidate,
          isFallback: candidate !== requestDate,
        };
      }
    } catch (e) {
      console.error(`관세환율 조회 오류 (${candidate}):`, e);
      throw e;
    }
  }

  return { rates: [], queriedDate: requestDate, isFallback: false };
}

// --- API010: 통관고유부호 업체 조회 ---

export async function searchCompany(
  apiKeys: Record<string, string>,
  query: string,
): Promise<CompanyItem[]> {
  const url = buildUnipassUrl(apiKeys, "010", "/ecmQry/retrieveEcm", {
    conmNm: query,
  });
  const xml = await fetchUnipassXml(url);
  if (!xml) return [];

  try {
    const parsed = parseUnipassXml(xml);
    const list = extractList(parsed, "ecmQryRtnVo", "ecmQryRsltVo");
    if (!list) return [];
    return list.map((item) => ({
      ecm: str(item.ecm),
      conmNm: str(item.conmNm),
      bsnsNo: str(item.bsnsNo),
      rppnNm: str(item.rppnNm),
      bslcBscsAddr: str(item.bslcBscsAddr),
      rprsTelno: str(item.rprsTelno),
      useYn: str(item.useYn),
    }));
  } catch (e) {
    throw new Error("UNI-PASS 업체 조회 실패", { cause: e });
  }
}

// --- API013: 관세사부호 조회 ---

export async function searchBroker(
  apiKeys: Record<string, string>,
  query: string,
): Promise<BrokerItem[]> {
  const url = buildUnipassUrl(apiKeys, "013", "/lcaLstInfoQry/retrieveLcaBrkd", {
    lcaNm: query,
  });
  const xml = await fetchUnipassXml(url);
  if (!xml) return [];

  try {
    const parsed = parseUnipassXml(xml);
    const list = extractList(parsed, "lcaLstInfoQryRtnVo", "lcaLstInfoQryRsltVo");
    if (!list) return [];
    return list.map((item) => ({
      lcaSgn: str(item.lcaSgn),
      lcaNm: str(item.lcaNm),
      cstmSgn: str(item.cstmSgn),
      cstmNm: str(item.cstmNm),
    }));
  } catch (e) {
    throw new Error("UNI-PASS 관세사부호 조회 실패", { cause: e });
  }
}

// --- API004: 검사검역내역 ---

export async function getInspectionInfo(
  apiKeys: Record<string, string>,
  blNumber: string,
): Promise<InspectionItem[]> {
  const url = buildUnipassUrl(apiKeys, "004", "/xtrnUserInscQuanBrkdQry/retrieveXtrnUserInscQuanBrkd", {
    mblNo: blNumber,
  });
  const xml = await fetchUnipassXml(url);
  if (!xml) return [];

  try {
    const parsed = parseUnipassXml(xml);
    const list = extractList(parsed, "xtrnUserInscQuanBrkdQryRtnVo", "xtrnUserInscQuanBrkdQryRsltVo");
    if (!list) return [];
    return list.map((item) => ({
      inqrRsltCd: str(item.inqrRsltCd),
      inqrRsltNm: str(item.inqrRsltNm),
      inqrDt: str(item.inqrDt),
    }));
  } catch (e) {
    throw new Error("UNI-PASS 검사검역내역 조회 실패", { cause: e });
  }
}

// --- API021: 입항보고내역 (해상) ---

export async function getArrivalReport(
  apiKeys: Record<string, string>,
  blNumber: string,
): Promise<ArrivalReportItem[]> {
  const url = buildUnipassUrl(apiKeys, "021", "/etprRprtQryBrkdQry/retrieveetprRprtQryBrkd", {
    shipCallSgn: blNumber,
  });
  const xml = await fetchUnipassXml(url);
  if (!xml) return [];

  try {
    const parsed = parseUnipassXml(xml);
    const list = extractList(parsed, "etprRprtQryBrkdQryRtnVo", "etprRprtQryBrkdQryRsltVo");
    if (!list) return [];
    return list.map((item) => ({
      vydfNm: str(item.vydfNm),
      etprCstm: str(item.etprCstm),
      etprDt: str(item.etprDt),
      msrm: str(item.msrm),
    }));
  } catch (e) {
    throw new Error("UNI-PASS 입항보고내역 조회 실패", { cause: e });
  }
}

// --- API033: 농림축산검역 업체코드 ---

export async function searchAnimalPlantCompany(
  apiKeys: Record<string, string>,
  companyName: string,
): Promise<AnimalPlantCompanyItem[]> {
  const url = buildUnipassUrl(apiKeys, "033", "/alspEntsCdQry/retrieveAlspEntsCd", {
    alspEntsCd: companyName,
  });
  const xml = await fetchUnipassXml(url);
  if (!xml) return [];

  try {
    const parsed = parseUnipassXml(xml);
    const list = extractList(parsed, "alspEntsCdQryRtnVo", "alspEntsCdQryRsltVo");
    if (!list) return [];
    return list.map((item) => ({
      bsntNm: str(item.bsntNm),
      bsntCd: str(item.bsntCd),
      bsntAddr: str(item.bsntAddr),
    }));
  } catch (e) {
    throw new Error("UNI-PASS 농림축산검역 업체코드 조회 실패", { cause: e });
  }
}

// --- API047: 보세구역 장치기간 ---

export async function getBondedAreaStorage(
  apiKeys: Record<string, string>,
  cargoNo: string,
): Promise<BondedAreaItem[]> {
  const url = buildUnipassUrl(apiKeys, "047", "/bdgdFccmShedQry/retrievebdgdFccmShed", {
    snarSgn: cargoNo,
  });
  const xml = await fetchUnipassXml(url);
  if (!xml) return [];

  try {
    const parsed = parseUnipassXml(xml);
    const list = extractList(parsed, "bdgdFccmShedQryRtnVo", "bdgdFccmShedQryRsltVo");
    if (!list) return [];
    return list.map((item) => ({
      cargMtNo: str(item.cargMtNo),
      strgBgnDt: str(item.strgBgnDt),
      strgPridExpnDt: str(item.strgPridExpnDt),
      bndAreaNm: str(item.bndAreaNm),
    }));
  } catch (e) {
    throw new Error("UNI-PASS 보세구역 장치기간 조회 실패", { cause: e });
  }
}

// --- API049: 수입 제세 납부여부 ---

export async function getTaxPaymentInfo(
  apiKeys: Record<string, string>,
  declarationNo: string,
): Promise<TaxPaymentItem[]> {
  const url = buildUnipassUrl(apiKeys, "049", "/taxMgPayYnAndPayDtInfoQry/retrieveTaxMgPayYnAndPayDt", {
    impDclrNo: declarationNo,
  });
  const xml = await fetchUnipassXml(url);
  if (!xml) return [];

  try {
    const parsed = parseUnipassXml(xml);
    const list = extractList(parsed, "taxMgQryRtnVo", "taxMgPayYnAndPayDtInfoQryRsltVo");
    if (!list) return [];
    return list.map((item) => ({
      dclrNo: str(item.dclrNo),
      txpymDt: str(item.txpymDt),
      txpymYn: str(item.txpymYn),
      txpymAmt: str(item.txpymAmt),
    }));
  } catch (e) {
    throw new Error("UNI-PASS 제세납부 조회 실패", { cause: e });
  }
}

// --- API002: 수출이행내역 ---

export async function getExportPerformance(
  apiKeys: Record<string, string>,
  expDclrNo: string,
): Promise<ExportPerformanceItem | null> {
  const url = buildUnipassUrl(apiKeys, "002", "/expDclrNoPrExpFfmnBrkdQry/retrieveExpDclrNoPrExpFfmnBrkd", { expDclrNo });
  const xml = await fetchUnipassXml(url);
  if (!xml) return null;
  try {
    const parsed = parseUnipassXml(xml);
    const item = extractSingle(
      parsed,
      ["expDclrNoPrExpFfmnBrkdQryRtnVo"],
      ["expDclrNoPrExpFfmnBrkdQryRsltVo"],
    );
    if (!item) return null;
    return {
      shpmPckUt: str(item.shpmPckUt), mnurConm: str(item.mnurConm),
      shpmCmplYn: str(item.shpmCmplYn), acptDt: str(item.acptDt),
      acptDttm: str(item.acptDttm), shpmWght: str(item.shpmWght),
      exppnConm: str(item.exppnConm), loadDtyTmIm: str(item.loadDtyTmIm),
      sanm: str(item.sanm), expDclrNo: str(item.expDclrNo),
      csclWght: str(item.csclWght), shpmPckGcnt: str(item.shpmPckGcnt),
      csclPckUt: str(item.csclPckUt), csclPckGcnt: str(item.csclPckGcnt),
      ldpInscTrgtYn: str(item.ldpInscTrgtYn),
    };
  } catch (e) { throw new Error("UNI-PASS 수출이행내역 조회 실패", { cause: e }); }
}

// --- API003: 요건확인내역 ---

export async function getImportRequirement(
  apiKeys: Record<string, string>,
  reqApreNo: string,
  imexTpcd: string,
): Promise<ImportRequirementItem | null> {
  const url = buildUnipassUrl(apiKeys, "003", "/xtrnUserReqApreBrkdQry/retrieveXtrnUserReqApreBrkd", { reqApreNo, imexTpcd });
  const xml = await fetchUnipassXml(url);
  if (!xml) return null;
  try {
    const parsed = parseUnipassXml(xml);
    const item = extractSingle(
      parsed,
      ["xtrnUserReqApreBrkdQryRtnVo"],
      ["xtrnUserImpReqApreBrkdQryRsltVo"],
    );
    if (!item) return null;
    return {
      apreCond: str(item.apreCond), issDt: str(item.issDt),
      lprt: str(item.lprt), relaFrmlNm: str(item.relaFrmlNm),
      valtPrid: str(item.valtPrid), relaLwor: str(item.relaLwor),
      dlcn: str(item.dlcn), reqApreNo: str(item.reqApreNo),
    };
  } catch (e) { throw new Error("UNI-PASS 요건확인내역 조회 실패", { cause: e }); }
}

// --- API005: 보관장치장 정보 ---

export async function getShedInfo(
  apiKeys: Record<string, string>,
  params: { jrsdCstmCd?: string; snarSgn?: string },
): Promise<ShedInfoItem[]> {
  const urlParams: Record<string, string> = {};
  if (params.jrsdCstmCd) urlParams.jrsdCstmCd = params.jrsdCstmCd;
  if (params.snarSgn) urlParams.snarSgn = params.snarSgn;
  const url = buildUnipassUrl(apiKeys, "005", "/shedInfoQry/retrieveShedInfo", urlParams);
  const xml = await fetchUnipassXml(url);
  if (!xml) return [];
  try {
    const parsed = parseUnipassXml(xml);
    const list = extractList(parsed, "shedInfoQryRtnVo", "shedInfoQryRsltVo");
    if (!list) return [];
    return list.map((item) => ({
      snarSgn: str(item.snarSgn), snarNm: str(item.snarNm),
      snarAddr: str(item.snarAddr), snartelno: str(item.snartelno),
      pnltLvyTrgtYn: str(item.pnltLvyTrgtYn),
      adtxColtPridYn: str(item.adtxColtPridYn),
      ldunPlcSnarYn: str(item.ldunPlcSnarYn),
    }));
  } catch (e) { throw new Error("UNI-PASS 보관장치장 조회 실패", { cause: e }); }
}

// --- API006: 포워더 목록 ---

export async function getForwarderList(
  apiKeys: Record<string, string>,
  frwrNm: string,
): Promise<ForwarderListItem[]> {
  const url = buildUnipassUrl(apiKeys, "006", "/frwrLstQry/retrieveFrwrLst", { frwrNm });
  const xml = await fetchUnipassXml(url);
  if (!xml) return [];
  try {
    const parsed = parseUnipassXml(xml);
    const list = extractList(parsed, "frwrLstQryRtnVo", "frwrLstQryRsltVo");
    if (!list) return [];
    return list.map((item) => ({
      frwrSgn: str(item.frwrSgn), frwrKoreNm: str(item.frwrKoreNm),
      frwrEnglNm: str(item.frwrEnglNm), rppnNm: str(item.rppnNm),
    }));
  } catch (e) { throw new Error("UNI-PASS 포워더 목록 조회 실패", { cause: e }); }
}

// --- API007: 포워더 상세 ---

export async function getForwarderDetail(
  apiKeys: Record<string, string>,
  frwrSgn: string,
): Promise<ForwarderDetailItem | null> {
  const url = buildUnipassUrl(apiKeys, "007", "/frwrBrkdQry/retrieveFrwrBrkd", { frwrSgn });
  const xml = await fetchUnipassXml(url);
  if (!xml) return null;
  try {
    const parsed = parseUnipassXml(xml);
    const item = extractSingle(parsed, ["frwrBrkdQryRtnVo"], ["frwrBrkdQryRsltVo"]);
    if (!item) return null;
    return {
      brnchAddr: str(item.brnchAddr), brno: str(item.brno),
      koreConmNm: str(item.koreConmNm), rppnFnm: str(item.rppnFnm),
      englConmNm: str(item.englConmNm), cntyCd: str(item.cntyCd),
      telNo: str(item.telNo), faxNo: str(item.faxNo),
      frwrSgn: str(item.frwrSgn),
      rgsrValtPridXpirDt: str(item.rgsrValtPridXpirDt),
      hdofAddr: str(item.hdofAddr),
    };
  } catch (e) { throw new Error("UNI-PASS 포워더 상세 조회 실패", { cause: e }); }
}

// --- API008: 항공사 목록 ---

export async function getAirlineList(
  apiKeys: Record<string, string>,
  flcoNm: string,
): Promise<AirlineListItem[]> {
  const url = buildUnipassUrl(apiKeys, "008", "/flcoLstQry/retrieveFlcoLst", { flcoNm });
  const xml = await fetchUnipassXml(url);
  if (!xml) return [];
  try {
    const parsed = parseUnipassXml(xml);
    const list = extractList(parsed, "flcoLstQryRtnVo", "flcoLstQryRsltVo");
    if (!list) return [];
    return list.map((item) => ({
      flcoEnglNm: str(item.flcoEnglNm), flcoKoreNm: str(item.flcoKoreNm),
      flcoSgn: str(item.flcoSgn), rppnNm: str(item.rppnNm),
    }));
  } catch (e) { throw new Error("UNI-PASS 항공사 목록 조회 실패", { cause: e }); }
}

// --- API009: 항공사 상세 ---

export async function getAirlineDetail(
  apiKeys: Record<string, string>,
  flcoSgn: string,
): Promise<AirlineDetailItem | null> {
  const url = buildUnipassUrl(apiKeys, "009", "/flcoBrkdQry/retrieveFlcoBrkd", { flcoSgn });
  const xml = await fetchUnipassXml(url);
  if (!xml) return null;
  try {
    const parsed = parseUnipassXml(xml);
    const item = extractSingle(parsed, ["flcoBrkdQryRtnVo"], ["flcoBrkdQryRsltVo"]);
    if (!item) return null;
    return {
      brno: str(item.brno), flcoEnglSgn: str(item.flcoEnglSgn),
      flcoKoreConm: str(item.flcoKoreConm), flcoNat: str(item.flcoNat),
      rppnFnm: str(item.rppnFnm), cntyNm: str(item.cntyNm),
      telno: str(item.telno), faxNo: str(item.faxNo),
      flcoEnglConm: str(item.flcoEnglConm),
      flcoNumSgn: str(item.flcoNumSgn), hdofAddr: str(item.hdofAddr),
    };
  } catch (e) { throw new Error("UNI-PASS 항공사 상세 조회 실패", { cause: e }); }
}

// --- API011: 해외거래처부호 ---

export async function getOverseasSupplier(
  apiKeys: Record<string, string>,
  cntySgn: string,
  conm: string,
): Promise<OverseasSupplierItem[]> {
  const url = buildUnipassUrl(apiKeys, "011", "/ovrsSplrSgnQry/retrieveOvrsSplrSgn", { cntySgn, conm });
  const xml = await fetchUnipassXml(url);
  if (!xml) return [];
  try {
    const parsed = parseUnipassXml(xml);
    const list = extractList(parsed, "ovrsSplrSgnQryRtnVo", "ovrsSplrSgnQryRsltVo");
    if (!list) return [];
    return list.map((item) => ({
      athzDt: str(item.athzDt), englCntyNm: str(item.englCntyNm),
      ovrsSplrSgn: str(item.ovrsSplrSgn), useStopRsn: str(item.useStopRsn),
      afarConmSplrConm: str(item.afarConmSplrConm),
      rprsSgn: str(item.rprsSgn), splrAddr1: str(item.splrAddr1),
      useStopStts: str(item.useStopStts), splrConm: str(item.splrConm),
      splrCntyAbrt: str(item.splrCntyAbrt),
    }));
  } catch (e) { throw new Error("UNI-PASS 해외거래처 조회 실패", { cause: e }); }
}

// --- API014: 관세사 상세 ---

export async function getBrokerDetail(
  apiKeys: Record<string, string>,
  lcaSgn: string,
): Promise<BrokerDetailItem | null> {
  const url = buildUnipassUrl(apiKeys, "014", "/lcaBrkdQry/retrieveLcaBrkd", { lcaSgn });
  const xml = await fetchUnipassXml(url);
  if (!xml) return null;
  try {
    const parsed = parseUnipassXml(xml);
    const item = extractSingle(parsed, ["lcaBrkdQryRtnVo"], ["lcaBrkdQryRsltVo"]);
    if (!item) return null;
    return {
      jrsdCstmNm: str(item.jrsdCstmNm), dcerPcd: str(item.dcerPcd),
      lcaSgn: str(item.lcaSgn), lcaConm: str(item.lcaConm),
      telNo: str(item.telNo), addr: str(item.addr), rppnNm: str(item.rppnNm),
    };
  } catch (e) { throw new Error("UNI-PASS 관세사 상세 조회 실패", { cause: e }); }
}

// --- API015: 간이환급율 ---

export async function getSimpleDrawbackRate(
  apiKeys: Record<string, string>,
  params: { baseDt: string; hsSgn?: string },
): Promise<SimpleDrawbackItem[]> {
  const urlParams: Record<string, string> = { baseDt: params.baseDt };
  if (params.hsSgn) urlParams.hsSgn = params.hsSgn;
  const url = buildUnipassUrl(apiKeys, "015", "/simlXamrttXtrnUserQry/retrieveSimlXamrttXtrnUser", urlParams);
  const xml = await fetchUnipassXml(url);
  if (!xml) return [];
  try {
    const parsed = parseUnipassXml(xml);
    const list = extractList(parsed, "simlXamrttXtrnUserQryRtnVo", "simlXamrttXtrnUserQryRsltVo");
    if (!list) return [];
    return list.map((item) => ({
      prutDrwbWncrAmt: str(item.prutDrwbWncrAmt), stsz: str(item.stsz),
      drwbAmtBaseTpcd: str(item.drwbAmtBaseTpcd), aplyDd: str(item.aplyDd),
      ceseDt: str(item.ceseDt), hs10: str(item.hs10),
    }));
  } catch (e) { throw new Error("UNI-PASS 간이환급율 조회 실패", { cause: e }); }
}

// --- API016: 간이정액 적용/비적용 업체 ---

export async function getSimpleDrawbackCompany(
  apiKeys: Record<string, string>,
  ecm: string,
): Promise<SimpleDrawbackCompanyItem | null> {
  const url = buildUnipassUrl(apiKeys, "016", "/simlFxamtAplyNnaplyEntsQry/retrieveSimlFxamtAplyNnaplyEnts", { ecm });
  const xml = await fetchUnipassXml(url);
  if (!xml) return null;
  try {
    const parsed = parseUnipassXml(xml);
    const item = extractSingle(
      parsed,
      ["simlFxamtAplyNnaplyEntsQryRtnVo"],
      ["simlFxamtAplyNnaplyEntsQryRsltVo"],
    );
    if (!item) return null;
    return {
      simlFxamtNnaplyApreDt: str(item.simlFxamtNnaplyApreDt),
      conm: str(item.conm),
      simlFxamtAplyApreDt: str(item.simlFxamtAplyApreDt),
      simlFxamtNnaplyApntRsn: str(item.simlFxamtNnaplyApntRsn),
      rgsrCstmNm: str(item.rgsrCstmNm),
    };
  } catch (e) { throw new Error("UNI-PASS 간이정액 업체 조회 실패", { cause: e }); }
}

// --- API017: 수출이행기간 단축대상 품목 ---

export async function getExportPeriodShortTarget(
  apiKeys: Record<string, string>,
  hsSgn: string,
): Promise<ExportPeriodShortItem[]> {
  const url = buildUnipassUrl(apiKeys, "017", "/expFfmnPridShrtTrgtPrlstQry/retrieveExpFfmnPridShrtTrgtPrlst", { hsSgn });
  const xml = await fetchUnipassXml(url);
  if (!xml) return [];
  try {
    const parsed = parseUnipassXml(xml);
    const list = extractList(
      parsed, "expFfmnPridShrtTrgtPrlstQryRtnVo", "expFfmnPridShrtTrgtPrlstQryRsltVo",
    );
    if (!list) return [];
    return list.map((item) => ({
      hsSgn: str(item.hsSgn), ffmnTmlmDt: str(item.ffmnTmlmDt),
      trgtImpEndDt: str(item.trgtImpEndDt), prnm: str(item.prnm),
      stszNm: str(item.stszNm),
    }));
  } catch (e) { throw new Error("UNI-PASS 수출이행기간 단축대상 조회 실패", { cause: e }); }
}

// --- API019: 통계부호 ---

export async function getStatisticsCode(
  apiKeys: Record<string, string>,
  params: { statsSgnTp: string; cdValtValNm?: string },
): Promise<StatisticsCodeItem[]> {
  const urlParams: Record<string, string> = { statsSgnTp: params.statsSgnTp };
  if (params.cdValtValNm) urlParams.cdValtValNm = params.cdValtValNm;
  const url = buildUnipassUrl(apiKeys, "019", "/statsSgnQry/retrieveStatsSgnBrkd", urlParams);
  const xml = await fetchUnipassXml(url);
  if (!xml) return [];
  try {
    const parsed = parseUnipassXml(xml);
    const list = extractList(parsed, "statsSgnQryRtnVo", "statsSgnQryVo");
    if (!list) return [];
    return list.map((item) => ({
      statsSgn: str(item.statsSgn), englAbrt: str(item.englAbrt),
      koreAbrt: str(item.koreAbrt), koreBrkd: str(item.koreBrkd),
      itxRt: str(item.itxRt),
    }));
  } catch (e) { throw new Error("UNI-PASS 통계부호 조회 실패", { cause: e }); }
}

// --- API023: 보세운송 차량 ---

export async function getBondedTransportVehicle(
  apiKeys: Record<string, string>,
  params: { btcoSgn?: string; vhclNoSanm?: string },
): Promise<BondedTransportVehicleItem[]> {
  const urlParams: Record<string, string> = {};
  if (params.btcoSgn) urlParams.btcoSgn = params.btcoSgn;
  if (params.vhclNoSanm) urlParams.vhclNoSanm = params.vhclNoSanm;
  const url = buildUnipassUrl(apiKeys, "023", "/btcoVhclQry/retrieveBtcoVhcl", urlParams);
  const xml = await fetchUnipassXml(url);
  if (!xml) return [];
  try {
    const parsed = parseUnipassXml(xml);
    const list = extractList(parsed, "btcoVhclQryRtnVo", "btcoVhclQryRsltVo");
    if (!list) return [];
    return list.map((item) => ({
      btcoSgn: str(item.btcoSgn),
      bnbnTrnpVhclRgsrDt: str(item.bnbnTrnpVhclRgsrDt),
      bnbnTrnpEqipTpcd: str(item.bnbnTrnpEqipTpcd),
      vhclInfoSrno: str(item.vhclInfoSrno),
      vhclNoSanm: str(item.vhclNoSanm),
      bnbnTrnpEqipTpcdNm: str(item.bnbnTrnpEqipTpcdNm),
      useYn: str(item.useYn),
    }));
  } catch (e) { throw new Error("UNI-PASS 보세운송 차량 조회 실패", { cause: e }); }
}

// --- API024: 입출항 보고 ---

export async function getPortEntryExit(
  apiKeys: Record<string, string>,
  params: { shipCallImoNo: string; seaFlghIoprTpcd: string; cstmSgn?: string },
): Promise<PortEntryExitItem[]> {
  const urlParams: Record<string, string> = {
    shipCallImoNo: params.shipCallImoNo,
    seaFlghIoprTpcd: params.seaFlghIoprTpcd,
  };
  if (params.cstmSgn) urlParams.cstmSgn = params.cstmSgn;
  const url = buildUnipassUrl(apiKeys, "024", "/ioprRprtQry/retrieveIoprRprtBrkd", urlParams);
  const xml = await fetchUnipassXml(url);
  if (!xml) return [];
  try {
    const parsed = parseUnipassXml(xml);
    const list = extractList(parsed, "ioprRprtBrkdQryRtnVo", "etprRprtQryBrkdQryVo");
    if (!list) return [];
    return list.map((item) => ({
      cstmSgn: str(item.cstmSgn), shipFlgtNm: str(item.shipFlgtNm),
      cstmNm: str(item.cstmNm), ioprSbmtNo: str(item.ioprSbmtNo),
      shipAirCntyNm: str(item.shipAirCntyNm),
      shipAirCntyCd: str(item.shipAirCntyCd),
      alCrmbPecnt: str(item.alCrmbPecnt), alPsngPecnt: str(item.alPsngPecnt),
      etprDttm: str(item.etprDttm), tkofDttm: str(item.tkofDttm),
      dptrPortAirptNm: str(item.dptrPortAirptNm),
      arvlCntyPortAirptNm: str(item.arvlCntyPortAirptNm),
    }));
  } catch (e) { throw new Error("UNI-PASS 입출항 보고 조회 실패", { cause: e }); }
}

// --- API025: 단일창구 진행현황 ---

export async function getSingleWindowHistory(
  apiKeys: Record<string, string>,
  reqRqstNo: string,
): Promise<SingleWindowHistoryItem[]> {
  const url = buildUnipassUrl(apiKeys, "025", "/apfmPrcsStusQry/retrieveApfmPrcsStus", { reqRqstNo });
  const xml = await fetchUnipassXml(url);
  if (!xml) return [];
  try {
    const parsed = parseUnipassXml(xml);
    const list = extractList(parsed, "apfmPrcsStusQryRtnVo", "apfmPrcsStusQryVo");
    if (!list) return [];
    return list.map((item) => ({
      reqRqstNo: str(item.reqRqstNo), elctDocNm: str(item.elctDocNm),
      reqRqstPrcsSttsNm: str(item.reqRqstPrcsSttsNm),
      trsnTpNm: str(item.trsnTpNm), rcpnDttm: str(item.rcpnDttm),
    }));
  } catch (e) { throw new Error("UNI-PASS 단일창구 진행현황 조회 실패", { cause: e }); }
}

// --- API026: 선사 목록 ---

export async function getShipCompanyList(
  apiKeys: Record<string, string>,
  shipCoNm: string,
): Promise<ShipCompanyListItem[]> {
  const url = buildUnipassUrl(apiKeys, "026", "/shipCoLstQry/retrieveShipCoLst", { shipCoNm });
  const xml = await fetchUnipassXml(url);
  if (!xml) return [];
  try {
    const parsed = parseUnipassXml(xml);
    const list = extractList(parsed, "shipCoLstQryRtnVo", "shipCoLstQryRsltVo");
    if (!list) return [];
    return list.map((item) => ({
      shipCoEnglNm: str(item.shipCoEnglNm), shipCoKoreNm: str(item.shipCoKoreNm),
      shipCoSgn: str(item.shipCoSgn), rppnNm: str(item.rppnNm),
    }));
  } catch (e) { throw new Error("UNI-PASS 선사 목록 조회 실패", { cause: e }); }
}

// --- API027: 선사 상세 ---

export async function getShipCompanyDetail(
  apiKeys: Record<string, string>,
  shipCoSgn: string,
): Promise<ShipCompanyDetailItem | null> {
  const url = buildUnipassUrl(apiKeys, "027", "/shipCoBrkdQry/retrieveShipCoBrkd", { shipCoSgn });
  const xml = await fetchUnipassXml(url);
  if (!xml) return null;
  try {
    const parsed = parseUnipassXml(xml);
    const item = extractSingle(parsed, ["shipCoBrkdQryRtnVo"], ["shipCoBrkdQryRsltVo"]);
    if (!item) return null;
    return {
      cntyNm: str(item.cntyNm), shipAgncNm: str(item.shipAgncNm),
      rppnNm: str(item.rppnNm), brno: str(item.brno),
      shipCoNat: str(item.shipCoNat), hdofAddr: str(item.hdofAddr),
      agncAddr: str(item.agncAddr), telno: str(item.telno),
      faxNo: str(item.faxNo), rgsrNo: str(item.rgsrNo), rgsrDt: str(item.rgsrDt),
    };
  } catch (e) { throw new Error("UNI-PASS 선사 상세 조회 실패", { cause: e }); }
}

// --- API029: 세관검사 확인사항 ---

export async function getCustomsCheckItems(
  apiKeys: Record<string, string>,
  hsSgn: string,
  imexTp: string,
): Promise<CustomsCheckItem[]> {
  const url = buildUnipassUrl(apiKeys, "029", "/ccctLworCdQry/retrieveCcctLworCd", { hsSgn, imexTp });
  const xml = await fetchUnipassXml(url);
  if (!xml) return [];
  try {
    const parsed = parseUnipassXml(xml);
    const list = extractList(parsed, "CcctLworCdQryRtnVo", "CcctLworCdQryRsltVo");
    if (!list) return [];
    return list.map((item) => ({
      hsSgn: str(item.hsSgn), dcerCrmLworCd: str(item.dcerCrmLworCd),
      dcerCfrmLworNm: str(item.dcerCfrmLworNm),
      reqApreIttCd: str(item.reqApreIttCd),
      reqApreIttNm: str(item.reqApreIttNm),
      aplyStrtDt: str(item.aplyStrtDt), aplyEndDt: str(item.aplyEndDt),
      reqCfrmIstmNm: str(item.reqCfrmIstmNm),
    }));
  } catch (e) { throw new Error("UNI-PASS 세관검사 확인사항 조회 실패", { cause: e }); }
}

// --- API031: 우편세관 관할 ---

export async function getPostalCustoms(
  apiKeys: Record<string, string>,
  jrsdPsno: string,
): Promise<PostalCustomsItem[]> {
  const url = buildUnipassUrl(apiKeys, "031", "/postNoPrCstmSgnQry/retrievePostNoPrCstmSgnQry", { jrsdPsno });
  const xml = await fetchUnipassXml(url);
  if (!xml) return [];
  try {
    const parsed = parseUnipassXml(xml);
    const list = extractList(parsed, "psnoPrJrsdCstmQryRtnVo", "psnoPrJrsdCstmQryRsltVoList");
    if (!list) return [];
    return list.map((item) => ({
      jrsdCstmSgn: str(item.jrsdCstmSgn),
      jrsdCstmSgnNm: str(item.jrsdCstmSgnNm),
    }));
  } catch (e) { throw new Error("UNI-PASS 우편세관 관할 조회 실패", { cause: e }); }
}

// --- API032: 첨부서류 제출현황 ---

export async function getAttachmentSubmitStatus(
  apiKeys: Record<string, string>,
  dclrBsopDtlTpcd: string,
  dcshSbmtNo: string,
): Promise<AttachmentSubmitItem[]> {
  const url = buildUnipassUrl(apiKeys, "032", "/expImpAffcSbmtInfoQry/retrieveExpImpAffcSbmtInfo", {
    dclrBsopDtlTpcd, dcshSbmtNo,
  });
  const xml = await fetchUnipassXml(url);
  if (!xml) return [];
  try {
    const parsed = parseUnipassXml(xml);
    const list = extractList(
      parsed, "expImpAffcSbmtInfoQryRtnVo", "expImpAffcSbmtInfoQryRsltVoList",
    );
    if (!list) return [];
    return list.map((item) => ({
      dclrBsopDtlTpcd: str(item.dclrBsopDtlTpcd),
      elctDocNm: str(item.elctDocNm), dcshSbmtNo: str(item.dcshSbmtNo),
      sbmtDttm: str(item.sbmtDttm), attchSbmtYn: str(item.attchSbmtYn),
    }));
  } catch (e) { throw new Error("UNI-PASS 첨부서류 제출현황 조회 실패", { cause: e }); }
}

// --- API034: 재수입수출 잔량 ---

export async function getReimportExportBalance(
  apiKeys: Record<string, string>,
  params: { expDclrNo: string; expDclrLnNo: string; expDclrStszSrno?: string },
): Promise<ReimportExportBalanceItem[]> {
  const urlParams: Record<string, string> = {
    expDclrNo: params.expDclrNo, expDclrLnNo: params.expDclrLnNo,
  };
  if (params.expDclrStszSrno) urlParams.expDclrStszSrno = params.expDclrStszSrno;
  const url = buildUnipassUrl(apiKeys, "034", "/expCmdtRsqtyInfoQry/retrieveExpCmdtRsqty", urlParams);
  const xml = await fetchUnipassXml(url);
  if (!xml) return [];
  try {
    const parsed = parseUnipassXml(xml);
    const list = extractList(parsed, "expCmdtRsqtyInfoQryRtnVo", "expCmdtRsqtyVoRsltVo");
    if (!list) return [];
    return list.map((item) => ({
      stsz: str(item.stsz), ttwg: str(item.ttwg), ttwgUt: str(item.ttwgUt),
      useAqty: str(item.useAqty), useAqtyUt: str(item.useAqtyUt),
      rsqty: str(item.rsqty), rsqtyUt: str(item.rsqtyUt), drwbYn: str(item.drwbYn),
    }));
  } catch (e) { throw new Error("UNI-PASS 재수입수출 잔량 조회 실패", { cause: e }); }
}

// --- API035: 수출신고확인서 검증 ---

export async function verifyExportDeclaration(
  apiKeys: Record<string, string>,
  params: {
    expDclrCrfnPblsNo: string; expDclrNo: string; txprBrno: string;
    orcyCntyCd: string; prnm: string; ntwg: string;
  },
): Promise<ExportDeclarationVerifyItem | null> {
  const url = buildUnipassUrl(apiKeys, "035", "/expDclrCrfnVrfcInfoQry/retrieveExpDclrCrfnVrfc", {
    expDclrCrfnPblsNo: params.expDclrCrfnPblsNo,
    expDclrNo: params.expDclrNo, txprBrno: params.txprBrno,
    orcyCntyCd: params.orcyCntyCd, prnm: params.prnm, ntwg: params.ntwg,
  });
  const xml = await fetchUnipassXml(url);
  if (!xml) return null;
  try {
    const parsed = parseUnipassXml(xml);
    const root = parsed.expDclrCrfnVrfcQryRsltVo as Record<string, unknown> | undefined;
    if (!root) return null;
    return { tCnt: str(root.tCnt), vrfcRsltCn: str(root.vrfcRsltCn) };
  } catch (e) { throw new Error("UNI-PASS 수출신고확인서 검증 실패", { cause: e }); }
}

// --- API036: 차량번호별 수출이행 ---

export async function getExportByVehicle(
  apiKeys: Record<string, string>,
  params: { cbno: string; dclrDttm?: string },
): Promise<ExportByVehicleItem[]> {
  const urlParams: Record<string, string> = { cbno: params.cbno };
  if (params.dclrDttm) urlParams.dclrDttm = params.dclrDttm;
  const url = buildUnipassUrl(apiKeys, "036", "/expFfmnBrkdCbnoQry/retrieveExpFfmnBrkdCbnoQryRtnVo", urlParams);
  const xml = await fetchUnipassXml(url);
  if (!xml) return [];
  try {
    const parsed = parseUnipassXml(xml);
    const list = extractList(parsed, "expFfmnBrkdCbnoQryRtnVo", "expFfmnBrkdCbnoQryRsltVo");
    if (!list) return [];
    return list.map((item) => ({
      dclrDttm: str(item.dclrDttm), cbno: str(item.cbno),
      vhclPrgsStts: str(item.vhclPrgsStts), expDclrNo: str(item.expDclrNo),
    }));
  } catch (e) { throw new Error("UNI-PASS 차량별 수출이행 조회 실패", { cause: e }); }
}

// --- API037: 우편물 통관진행 ---

export async function getPostalClearance(
  apiKeys: Record<string, string>,
  psmtKcd: string,
  psmtNo: string,
): Promise<PostalClearanceItem | null> {
  const url = buildUnipassUrl(apiKeys, "037", "/psmtCsclPrgsInfoQry/retrievePsmtCsclPrgsInfo", { psmtKcd, psmtNo });
  const xml = await fetchUnipassXml(url);
  if (!xml) return null;
  try {
    const parsed = parseUnipassXml(xml);
    const item = extractSingle(
      parsed, ["psmtCsclPrgsInfoQryRtnVo"], ["psmtCsclPrgsInfoQryRsltVo"],
    );
    if (!item) return null;
    return {
      psmtCsclMtNo: str(item.psmtCsclMtNo), psmtNo: str(item.psmtNo),
      psmtPrcsTpcd: str(item.psmtPrcsTpcd), csclPsofCd: str(item.csclPsofCd),
      psmtKcd: str(item.psmtKcd), brngArvlDt: str(item.brngArvlDt),
      sendCntyCdNm: str(item.sendCntyCdNm), ttwg: str(item.ttwg),
      aprvDt: str(item.aprvDt), psmtPrcsStcd: str(item.psmtPrcsStcd),
    };
  } catch (e) { throw new Error("UNI-PASS 우편물 통관진행 조회 실패", { cause: e }); }
}

// --- API038: 하선신고내역 ---

export async function getUnloadingDeclarations(
  apiKeys: Record<string, string>,
  etprDt: string,
  dclrCstmSgn: string,
): Promise<UnloadingDeclarationItem[]> {
  const url = buildUnipassUrl(apiKeys, "038", "/seaUlvsDclrInfoQry/retrieveSeaUlvsDclrInfo", { etprDt, dclrCstmSgn });
  const xml = await fetchUnipassXml(url);
  if (!xml) return [];
  try {
    const parsed = parseUnipassXml(xml);
    const list = extractList(parsed, "seaUlvsDclrInfoQryRtnVo", "seaUlvsDclrInfoQryRsltVo");
    if (!list) return [];
    return list.map((item) => ({
      mrn: str(item.mrn), shipNm: str(item.shipNm),
      ulvsUnairPrcsNm: str(item.ulvsUnairPrcsNm),
    }));
  } catch (e) { throw new Error("UNI-PASS 하선신고내역 조회 실패", { cause: e }); }
}

// --- API039: 해상 출항허가 ---

export async function getSeaDeparturePermit(
  apiKeys: Record<string, string>,
  params: { ioprSbmtNo?: string; tkofPermNo?: string },
): Promise<SeaDeparturePermitItem | null> {
  const urlParams: Record<string, string> = {};
  if (params.ioprSbmtNo) urlParams.ioprSbmtNo = params.ioprSbmtNo;
  if (params.tkofPermNo) urlParams.tkofPermNo = params.tkofPermNo;
  const url = buildUnipassUrl(apiKeys, "039", "/tkofWrprQry/retrieveTkofWrpr", urlParams);
  const xml = await fetchUnipassXml(url);
  if (!xml) return null;
  try {
    const parsed = parseUnipassXml(xml);
    const root = parsed.tkofWrprQryRsltVo as Record<string, unknown> | undefined;
    if (!root) return null;
    return {
      shipFlgtNm: str(root.shipFlgtNm), shipAirCntyCd: str(root.shipAirCntyCd),
      shipCallImoNo: str(root.shipCallImoNo), tkofDttm: str(root.tkofDttm),
      arvlCntyPortAirptCd: str(root.arvlCntyPortAirptCd),
      loadWght: str(root.loadWght), alCrmbPecnt: str(root.alCrmbPecnt),
      alPsngPecnt: str(root.alPsngPecnt), aprePermDttm: str(root.aprePermDttm),
    };
  } catch (e) { throw new Error("UNI-PASS 해상 출항허가 조회 실패", { cause: e }); }
}

// --- API040: 항공 출항허가 ---

export async function getAirDeparturePermit(
  apiKeys: Record<string, string>,
  params: { ioprSbmtNo?: string; tkofDttm?: string; shipFlgtNm?: string },
): Promise<AirDeparturePermitItem | null> {
  const urlParams: Record<string, string> = {};
  if (params.ioprSbmtNo) urlParams.ioprSbmtNo = params.ioprSbmtNo;
  if (params.tkofDttm) urlParams.tkofDttm = params.tkofDttm;
  if (params.shipFlgtNm) urlParams.shipFlgtNm = params.shipFlgtNm;
  const url = buildUnipassUrl(apiKeys, "040", "/tkofWrprQry/retrieveFlghTkofPerm", urlParams);
  const xml = await fetchUnipassXml(url);
  if (!xml) return null;
  try {
    const parsed = parseUnipassXml(xml);
    const root = parsed.tkofFlghIoprRsltVo as Record<string, unknown> | undefined;
    if (!root) return null;
    return {
      shipFlgtNm: str(root.shipFlgtNm), shipAirCntyCd: str(root.shipAirCntyCd),
      airRgsrNo: str(root.airRgsrNo), tkofDttm: str(root.tkofDttm),
      arvlCntyPortAirptCd: str(root.arvlCntyPortAirptCd),
      dptrPortAirptCd: str(root.dptrPortAirptCd), loadTtn: str(root.loadTtn),
      kornCrmbPecnt: str(root.kornCrmbPecnt),
      kornPsngPecnt: str(root.kornPsngPecnt), prcsDttm: str(root.prcsDttm),
    };
  } catch (e) { throw new Error("UNI-PASS 항공 출항허가 조회 실패", { cause: e }); }
}

// --- API042: 재수출 면세이행잔량 ---

export async function getReexportDutyFreeBalance(
  apiKeys: Record<string, string>,
  impDclrNo: string,
): Promise<ReexportDutyFreeBalanceItem[]> {
  const url = buildUnipassUrl(apiKeys, "042", "/reexpTxfrFfmnRsqtyQry/retrieveReexpTxfrFfmnRsqty", { impDclrNo });
  const xml = await fetchUnipassXml(url);
  if (!xml) return [];
  try {
    const parsed = parseUnipassXml(xml);
    const list = extractList(
      parsed, "reexpTxfrFfmnRsqtyQryRtnVo", "reexpTxfrFfmnRsqtyQryRsltVo",
    );
    if (!list) return [];
    return list.map((item) => ({
      impDclrNo: str(item.impDclrNo), lnNo: str(item.lnNo),
      dclrQty: str(item.dclrQty), dclrWght: str(item.dclrWght),
      totReexpFfmnQty: str(item.totReexpFfmnQty),
      totReexpFfmnWght: str(item.totReexpFfmnWght),
      qtyRsqty: str(item.qtyRsqty), wghtRsqty: str(item.wghtRsqty),
      reexpFfmnLastEnfrDt: str(item.reexpFfmnLastEnfrDt),
    }));
  } catch (e) { throw new Error("UNI-PASS 재수출 면세이행잔량 조회 실패", { cause: e }); }
}

// --- API043: HS코드 네비게이션 ---

export async function getHsCodeNavigation(
  apiKeys: Record<string, string>,
  hsSgn: string,
): Promise<HsCodeNavigationItem[]> {
  const url = buildUnipassUrl(apiKeys, "043", "/cmtrStatsQry/retrieveCmtrStats", { hsSgn });
  const xml = await fetchUnipassXml(url);
  if (!xml) return [];
  try {
    const parsed = parseUnipassXml(xml);
    const list = extractList(parsed, "cmtrStatsQryRtnVo", "cmtrStatsQryRsltVo");
    if (!list) return [];
    return list.map((item) => ({
      hs10Sgn: str(item.hs10Sgn), acrsTcntRnk: str(item.acrsTcntRnk),
      prlstNm: str(item.prlstNm), prlstLnCnt: str(item.prlstLnCnt),
    }));
  } catch (e) { throw new Error("UNI-PASS HS코드 네비게이션 조회 실패", { cause: e }); }
}

// --- API044: 항공 입항보고 ---

export async function getAirArrivalReport(
  apiKeys: Record<string, string>,
  params: { ioprSbmtNo?: string; shipFlgtNm?: string; etprDt?: string },
): Promise<AirArrivalReportItem[]> {
  const urlParams: Record<string, string> = {};
  if (params.ioprSbmtNo) urlParams.ioprSbmtNo = params.ioprSbmtNo;
  if (params.shipFlgtNm) urlParams.shipFlgtNm = params.shipFlgtNm;
  if (params.etprDt) urlParams.etprDt = params.etprDt;
  const url = buildUnipassUrl(apiKeys, "044", "/etprRprtQryBrkdQry/retrieveFlghEtprRprtBrkd", urlParams);
  const xml = await fetchUnipassXml(url);
  if (!xml) return [];
  try {
    const parsed = parseUnipassXml(xml);
    const list = extractList(parsed, "flghEtprRprtBrkdQryRtnVo", "flghEtprRprtBrkdQryVo");
    if (!list) return [];
    return list.map((item) => ({
      ioprSbmtNo: str(item.ioprSbmtNo), shipFlgtNm: str(item.shipFlgtNm),
      shipAirCntyCd: str(item.shipAirCntyCd), etprDttm: str(item.etprDttm),
      dptrPortAirptCd: str(item.dptrPortAirptCd),
      alCrmbPecnt: str(item.alCrmbPecnt), alPsngPecnt: str(item.alPsngPecnt),
      cstmSgn: str(item.cstmSgn), aprePermDttm: str(item.aprePermDttm),
      arvlCntyPortAirptCd: str(item.arvlCntyPortAirptCd),
    }));
  } catch (e) { throw new Error("UNI-PASS 항공 입항보고 조회 실패", { cause: e }); }
}

// --- API045: 재수출 기한 ---

export async function getReexportDeadline(
  apiKeys: Record<string, string>,
  impDclrNo: string,
  lnNo: string,
): Promise<ReexportDeadlineItem | null> {
  const url = buildUnipassUrl(apiKeys, "045", "/reepCndtImpFfmnTmlmInfoOfr/retrieveReepCndtImpFfmnTmlmInfo", { impDclrNo, lnNo });
  const xml = await fetchUnipassXml(url);
  if (!xml) return null;
  try {
    const parsed = parseUnipassXml(xml);
    const item = extractSingle(
      parsed,
      ["reepCndtImpFfmnTmlmInfoQryRtnVo"],
      ["reepCndtImpFfmnTmlmInfoQryRsltVo"],
    );
    if (!item) return null;
    return { xtnsDt: str(item.xtnsDt) };
  } catch (e) { throw new Error("UNI-PASS 재수출 기한 조회 실패", { cause: e }); }
}

// --- API046: 재수출 이행완료 ---

export async function getReexportCompletion(
  apiKeys: Record<string, string>,
  impDclrNo: string,
  lnNo: string,
): Promise<ReexportCompletionItem | null> {
  const url = buildUnipassUrl(apiKeys, "046", "/reexpFfmnCmplRprtPrcsInfoQry/retrieveReexpFfmnCmplRprtPrcsInfo", {
    impDclrNo, lnNo,
  });
  const xml = await fetchUnipassXml(url);
  if (!xml) return null;
  try {
    const parsed = parseUnipassXml(xml);
    const item = extractSingle(
      parsed,
      ["reexpFfmnCmplRprtPrcsInfoQryRtnVo"],
      ["reexpFfmnCmplRprtPrcsInfoQryRsltVo"],
    );
    if (!item) return null;
    return {
      reexpFffmnPrcsStcd: str(item.reexpFffmnPrcsStcd),
      reexpFfmnLastEnfrDt: str(item.reexpFfmnLastEnfrDt),
      lastReexpFfmnDtyConcRcd: str(item.lastReexpFfmnDtyConcRcd),
    };
  } catch (e) { throw new Error("UNI-PASS 재수출 이행완료 조회 실패", { cause: e }); }
}

// --- API048: 보세구역 반출 ---

export async function getBondedRelease(
  apiKeys: Record<string, string>,
  rlbrBssNo: string,
): Promise<BondedReleaseItem | null> {
  const url = buildUnipassUrl(apiKeys, "048", "/impCmdtSnarRlseDclrQry/retrieveImpCmdtSnarRlseDclr", { rlbrBssNo });
  const xml = await fetchUnipassXml(url);
  if (!xml) return null;
  try {
    const parsed = parseUnipassXml(xml);
    const item = extractSingle(
      parsed,
      ["impCmdtSnarRlseDclrQryRtnVo"],
      ["impCmdtSnarRlseDclrYnRsltVo"],
    );
    if (!item) return null;
    return { rlbrDt: str(item.rlbrDt), rlbrYn: str(item.rlbrYn) };
  } catch (e) { throw new Error("UNI-PASS 보세구역 반출 조회 실패", { cause: e }); }
}

// --- API050: 담보해제 ---

export async function getCollateralRelease(
  apiKeys: Record<string, string>,
  impDclrNo: string,
): Promise<CollateralReleaseItem | null> {
  const url = buildUnipassUrl(apiKeys, "050", "/taxMgReleRqstPrcsStusInfoQry/retrieveTaxMgReleRqstPrcsStus", { impDclrNo });
  const xml = await fetchUnipassXml(url);
  if (!xml) return null;
  try {
    const parsed = parseUnipassXml(xml);
    const item = extractSingle(
      parsed, ["taxMgQryRtnVo"], ["taxMgReleRqstPrcsStusInfoQryRsltVo"],
    );
    if (!item) return null;
    return {
      mgPrcsStcdNm: str(item.mgPrcsStcdNm),
      mgAprvDt: str(item.mgAprvDt), mgRqstDt: str(item.mgRqstDt),
    };
  } catch (e) { throw new Error("UNI-PASS 담보해제 조회 실패", { cause: e }); }
}

// --- API051: 전자상거래 수출 적재정보 ---

export async function getEcommerceExportLoad(
  apiKeys: Record<string, string>,
  elcmExpDclrNo: string,
): Promise<EcommerceExportLoadItem | null> {
  const url = buildUnipassUrl(apiKeys, "051", "/elcmExpLoadInfoQry/retrieveElcmExpLoadInfo", { elcmExpDclrNo });
  const xml = await fetchUnipassXml(url);
  if (!xml) return null;
  try {
    const parsed = parseUnipassXml(xml);
    const item = extractSingle(
      parsed, ["elcmExpLoadInfoQryRtnVo"], ["elcmExpLoadInfoQryRsltVo"],
    );
    if (!item) return null;
    return { loadCmplYn: str(item.loadCmplYn) };
  } catch (e) { throw new Error("UNI-PASS 전자상거래 수출 적재정보 조회 실패", { cause: e }); }
}

// --- API052: 정정처리상태 ---

export async function getDeclarationCorrection(
  apiKeys: Record<string, string>,
  params: {
    dcshSbmtNo: string; imexTpcd: string;
    mdfyRqstDgcnt: string; mdfyRqstDt?: string;
  },
): Promise<DeclarationCorrectionItem | null> {
  const urlParams: Record<string, string> = {
    dcshSbmtNo: params.dcshSbmtNo, imexTpcd: params.imexTpcd,
    mdfyRqstDgcnt: params.mdfyRqstDgcnt,
  };
  if (params.mdfyRqstDt) urlParams.mdfyRqstDt = params.mdfyRqstDt;
  const url = buildUnipassUrl(apiKeys, "052", "/mdfyPrcsSttsBrkdQry/retrieveMdfyPrcsSttsBrkd", urlParams);
  const xml = await fetchUnipassXml(url);
  if (!xml) return null;
  try {
    const parsed = parseUnipassXml(xml);
    const item = extractSingle(
      parsed,
      ["mdfyPrcsSttsBrkdQryRtnVo"],
      ["mdfyPrcsSttsBrkdQryRsltVoLst", "mdfyPrcsSttsBrkdQryRsltVo"],
    );
    if (!item) return null;
    return {
      mdfyRqstPrcsStcd: str(item.mdfyRqstPrcsStcd),
      mdfyRqstPrcsStcdNm: str(item.mdfyRqstPrcsStcdNm),
    };
  } catch (e) { throw new Error("UNI-PASS 정정처리상태 조회 실패", { cause: e }); }
}

// --- API053: 적재지검사 ---

export async function getLoadingInspection(
  apiKeys: Record<string, string>,
  expDclrNo: string,
): Promise<LoadingInspectionItem | null> {
  const url = buildUnipassUrl(apiKeys, "053", "/expLdpInscInfoQry/retrieveLdpInscInfo", { expDclrNo });
  const xml = await fetchUnipassXml(url);
  if (!xml) return null;
  try {
    const parsed = parseUnipassXml(xml);
    const item = extractSingle(
      parsed, ["expLdpInscInfoQryRtnVo"], ["expLdpInscInfoQryRsltVo"],
    );
    if (!item) return null;
    return {
      expInscTrgtYn: str(item.expInscTrgtYn),
      expInscCmplYn: str(item.expInscCmplYn),
    };
  } catch (e) { throw new Error("UNI-PASS 적재지검사 조회 실패", { cause: e }); }
}

// --- API054: 보세운송 배차정보 ---

export async function getBondedTransportInfo(
  apiKeys: Record<string, string>,
  params: {
    qryStrtDt: string; qryEndDt: string;
    frarSnarSgn?: string; arlcSnarSgn?: string; btcoSgn?: string;
  },
): Promise<BondedTransportInfoItem[]> {
  const urlParams: Record<string, string> = {
    qryStrtDt: params.qryStrtDt, qryEndDt: params.qryEndDt,
  };
  if (params.frarSnarSgn) urlParams.frarSnarSgn = params.frarSnarSgn;
  if (params.arlcSnarSgn) urlParams.arlcSnarSgn = params.arlcSnarSgn;
  if (params.btcoSgn) urlParams.btcoSgn = params.btcoSgn;
  const url = buildUnipassUrl(apiKeys, "054", "/trnpMethAlocPrngQry/retrieveTrnpMethAlocPrng", urlParams);
  const xml = await fetchUnipassXml(url);
  if (!xml) return [];
  try {
    const parsed = parseUnipassXml(xml);
    const list = extractList(
      parsed, "trnpMethAlocPrngApiInfoQryRtnVo", "trnpMethAlocPrngApiInfoQryRsltVo",
    );
    if (!list) return [];
    return list.map((item) => ({
      alocPrngDclrNo: str(item.alocPrngDclrNo),
      bnbnTrnpDclrNo: str(item.bnbnTrnpDclrNo),
      frarSnarSgnNm: str(item.frarSnarSgnNm),
      arlcSnarSgnNm: str(item.arlcSnarSgnNm),
      bntpMethNo: str(item.bntpMethNo), cntrNo: str(item.cntrNo),
    }));
  } catch (e) { throw new Error("UNI-PASS 보세운송 배차정보 조회 실패", { cause: e }); }
}
