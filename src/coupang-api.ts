import crypto from "node:crypto";
import { fetchWithRetry } from "./http-client.js";
import type { CoupangProduct, CoupangSearchResult, CoupangProductRaw } from "./coupang-types.js";

const COUPANG_BASE = "https://api-gateway.coupang.com";
const SEARCH_PATH = "/v2/providers/affiliate_open_api/apis/openapi/products/search";
const TIMEOUT_MS = 15_000;
const CACHE_TTL_MS = 60 * 60 * 1000;
const CACHE_MAX_ENTRIES = 100;

const cache = new Map<string, { data: CoupangProduct[]; expiresAt: number }>();

export function _resetCoupangCache(): void {
  cache.clear();
}

function cleanExpired(): void {
  const now = Date.now();
  for (const [k, v] of cache) if (v.expiresAt <= now) cache.delete(k);
  while (cache.size > CACHE_MAX_ENTRIES) {
    const firstKey = cache.keys().next().value;
    if (firstKey !== undefined) cache.delete(firstKey);
  }
}

/** datetime 포맷: yymmddTHHMMSSZ (GMT) */
export function formatCoupangDate(d: Date): string {
  const iso = d.toISOString();
  return `${iso.slice(2,4)}${iso.slice(5,7)}${iso.slice(8,10)}T${iso.slice(11,13)}${iso.slice(14,16)}${iso.slice(17,19)}Z`;
}

/** HMAC-SHA256 Authorization 헤더 */
export function buildCoupangAuthHeader(
  method: string,
  path: string,
  queryString: string,
  accessKey: string,
  secretKey: string,
  now = new Date(),
): string {
  const dt = formatCoupangDate(now);
  const message = `${dt}${method}${path}${queryString}`;
  const signature = crypto.createHmac("sha256", secretKey).update(message).digest("hex");
  return `CEA algorithm=HmacSHA256, access-key=${accessKey}, signed-date=${dt}, signature=${signature}`;
}

/** 쿠팡 파트너스 상품 검색 (캐시 1h, 10건/h 제한) */
export async function searchCoupangProducts(
  keyword: string,
  accessKey: string | undefined,
  secretKey: string | undefined,
  limit = 10,
): Promise<CoupangSearchResult> {
  if (!accessKey || !secretKey) {
    throw new Error("쿠팡 파트너스 API 키가 설정되지 않았습니다. COUPANG_ACCESS_KEY, COUPANG_SECRET_KEY를 설정하세요.");
  }

  cleanExpired();
  const cacheKey = `${keyword}:${limit}`;
  const cached = cache.get(cacheKey);
  if (cached) return { query: keyword, products: cached.data, cached: true };

  const qs = `keyword=${encodeURIComponent(keyword)}&limit=${limit}`;
  const auth = buildCoupangAuthHeader("GET", SEARCH_PATH, qs, accessKey, secretKey);

  const res = await fetchWithRetry(`${COUPANG_BASE}${SEARCH_PATH}?${qs}`, {
    timeoutMs: TIMEOUT_MS,
    maxRetries: 2,
    init: {
      method: "GET",
      headers: { Authorization: auth, "Content-Type": "application/json" },
    },
  });

  if (res.status === 429) {
    throw new Error("쿠팡 API 호출 한도 초과 (시간당 10회). 잠시 후 다시 시도해주세요.");
  }
  if (!res.ok) {
    throw new Error(`쿠팡 API 오류: HTTP ${res.status}`);
  }

  const json = await res.json() as { rCode: string; rMessage?: string; data?: { productData?: CoupangProductRaw[] } };
  if (json.rCode !== "0") {
    throw new Error(`쿠팡 API 오류: ${json.rMessage ?? json.rCode}`);
  }

  const products: CoupangProduct[] = (json.data?.productData ?? []).map((p) => ({
    productId: p.productId,
    productName: p.productName,
    productPrice: p.productPrice,
    productImage: p.productImage,
    productUrl: p.productUrl,
    isRocket: p.isRocket,
    isFreeShipping: p.isFreeShipping,
  }));

  cache.set(cacheKey, { data: products, expiresAt: Date.now() + CACHE_TTL_MS });
  return { query: keyword, products, cached: false };
}
