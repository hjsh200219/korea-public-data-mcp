/**
 * 환경변수 기반 설정 로더
 * index.ts / remote.ts 진입점에서 공통 사용
 */

export const SERVER_VERSION = "6.0.0";

export interface ServerConfig {
  lawApiOc: string;
  dartApiKey?: string;
  data20ServiceKey?: string;
  unipassApiKeys?: Record<string, string>;
  eximApiKey?: string;
  mafraApiKey?: string;
  finlifeApiKey?: string;
  youtubeApiKey?: string;
  courtlistenerApiToken?: string;
  openLegalDataApiToken?: string;
  foreignCaseEnabled?: boolean;
  coupangAccessKey?: string;
  coupangSecretKey?: string;
}

function collectUnipassKeys(): Record<string, string> {
  const keys: Record<string, string> = {};
  for (const [k, v] of Object.entries(process.env)) {
    const match = k.match(/^UNIPASS_KEY_API(\d{3})$/);
    if (match && v) keys[match[1]] = v;
  }
  return keys;
}

export function loadConfig(): ServerConfig {
  const lawApiOc = process.env.LAW_API_OC || "";
  const dartApiKey = process.env.DART_API_KEY || "";
  const data20ServiceKey = process.env.DATA20_SERVICE_KEY || "";
  const exchangeRateApiKey = process.env.EXCHANGE_RATE_API_KEY || "";
  const mafraApiKey = process.env.MAFRA_API_KEY || "";
  const finlifeApiKey = process.env.FINLIFE_API_KEY || "";
  const youtubeApiKey = process.env.YOUTUBE_API_KEY || "";
  const courtlistenerApiToken = process.env.COURTLISTENER_API_TOKEN || "";
  const openLegalDataApiToken = process.env.OPENLEGALDATA_API_TOKEN || "";
  const foreignCaseEnabled = process.env.FOREIGN_CASE_ENABLED === "true";
  const coupangAccessKey = process.env.COUPANG_ACCESS_KEY || "";
  const coupangSecretKey = process.env.COUPANG_SECRET_KEY || "";
  const unipassKeys = collectUnipassKeys();

  if (!lawApiOc) {
    console.error(
      "LAW_API_OC 환경변수가 설정되지 않았습니다. 법제처 API 인증코드를 설정하세요.",
    );
    process.exit(1);
  }

  if (!dartApiKey) {
    console.warn("DART_API_KEY 미설정 — DART 공시 도구 비활성화");
  }

  if (!data20ServiceKey) {
    console.warn("DATA20_SERVICE_KEY 미설정 — 공공데이터포털 도구 비활성화");
  }

  if (Object.keys(unipassKeys).length === 0) {
    console.warn("UNIPASS_KEY_API* 미설정 — UNI-PASS 관세청 도구 비활성화");
  }

  if (!exchangeRateApiKey) {
    console.warn("EXCHANGE_RATE_API_KEY 미설정 — 수출입은행 환율 도구 비활성화");
  }

  if (!mafraApiKey) {
    console.warn("MAFRA_API_KEY 미설정 — 수입축산물 이력 도구 비활성화");
  }

  if (!finlifeApiKey) {
    console.warn("FINLIFE_API_KEY 미설정 — 금융상품 비교공시 도구 비활성화");
  }

  if (!youtubeApiKey) {
    console.warn("YOUTUBE_API_KEY 미설정 — YouTube 메타데이터/검색/댓글 도구 비활성화 (자막 추출은 사용 가능)");
  }

  if (!courtlistenerApiToken && !openLegalDataApiToken && !foreignCaseEnabled) {
    console.warn(
      "COURTLISTENER_API_TOKEN / OPENLEGALDATA_API_TOKEN / FOREIGN_CASE_ENABLED 미설정 — 해외 판례 도구 비활성화",
    );
  }

  if (!coupangAccessKey || !coupangSecretKey) {
    console.warn("COUPANG_ACCESS_KEY/COUPANG_SECRET_KEY 미설정 — 쿠팡 상품 검색 비활성화");
  }

  return {
    lawApiOc,
    dartApiKey: dartApiKey || undefined,
    data20ServiceKey: data20ServiceKey || undefined,
    unipassApiKeys: Object.keys(unipassKeys).length > 0 ? unipassKeys : undefined,
    eximApiKey: exchangeRateApiKey || undefined,
    mafraApiKey: mafraApiKey || undefined,
    finlifeApiKey: finlifeApiKey || undefined,
    youtubeApiKey: youtubeApiKey || undefined,
    courtlistenerApiToken: courtlistenerApiToken || undefined,
    openLegalDataApiToken: openLegalDataApiToken || undefined,
    foreignCaseEnabled: foreignCaseEnabled || undefined,
    coupangAccessKey: coupangAccessKey || undefined,
    coupangSecretKey: coupangSecretKey || undefined,
  };
}
