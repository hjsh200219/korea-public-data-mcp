#!/usr/bin/env tsx
/**
 * HIRA 시도/시군구 코드 일괄 수집기.
 *
 * 동작:
 * 1. 시도 코드 후보(110000~490000, 10000 단위) 순회 → 응답에서 sidoCdNm 추출
 * 2. 발견한 sidoCd마다 페이지 순회하며 sgguCd/sgguCdNm 누적
 * 3. 결과를 src/hira-region-codes.ts 파일로 덮어쓰기
 *
 * Rate limit 회피: 호출 간 5초 딜레이 (HIRA API 부하 보호).
 * 한 번 실행 시 ~10~20분 소요 (시도 25개 × 시군구 약 250개 / 100개씩 페이징).
 *
 * 사용법:
 *   DATA20_SERVICE_KEY=... npx tsx scripts/harvest-hira-region-codes.ts
 *   또는 .env에 키 있으면: npx tsx scripts/harvest-hira-region-codes.ts
 *
 * 옵션 환경변수:
 *   HARVEST_DELAY_MS (기본 5000) — 호출 간 지연
 *   HARVEST_DRY_RUN=1 — 파일 쓰지 않고 결과만 출력
 *   HARVEST_SIDO_CANDIDATES — 후보 시도코드 CSV (기본 110000~490000 sweep)
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const HIRA_PHARMACY_URL =
  "http://apis.data.go.kr/B551182/pharmacyInfoService/getParmacyBasisList";
const DELAY_MS = Number(process.env["HARVEST_DELAY_MS"] ?? 5000);
const DRY_RUN = process.env["HARVEST_DRY_RUN"] === "1";
const REQUEST_TIMEOUT_MS = 60000;

function loadServiceKey(): string {
  const fromEnv = process.env["DATA20_SERVICE_KEY"];
  if (fromEnv) return fromEnv;
  // .env 파일에서 직접 읽기 (의존성 회피)
  try {
    const envPath = join(process.cwd(), ".env");
    const text = readFileSync(envPath, "utf8");
    const match = text.match(/^DATA20_SERVICE_KEY=(.+)$/m);
    if (match) return match[1].trim();
  } catch {
    // ignore
  }
  throw new Error("DATA20_SERVICE_KEY가 환경변수/.env에 없습니다.");
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

async function fetchPharmacyXml(
  serviceKey: string,
  params: Record<string, string>,
): Promise<string> {
  const url = new URL(HIRA_PHARMACY_URL);
  url.searchParams.set("serviceKey", serviceKey);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const r = await fetch(url.toString(), { signal: controller.signal });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.text();
  } finally {
    clearTimeout(timer);
  }
}

function extractAll(xml: string, tag: string): string[] {
  const re = new RegExp(`<${tag}>([^<]*)</${tag}>`, "g");
  const out: string[] = [];
  let m;
  while ((m = re.exec(xml)) !== null) out.push(m[1]);
  return out;
}

function extractFirst(xml: string, tag: string): string | undefined {
  const re = new RegExp(`<${tag}>([^<]*)</${tag}>`);
  return re.exec(xml)?.[1];
}

function parseTotalCount(xml: string): number {
  return Number(extractFirst(xml, "totalCount") ?? "0");
}

function defaultSidoCandidates(): string[] {
  const csv = process.env["HARVEST_SIDO_CANDIDATES"];
  if (csv) return csv.split(",").map((s) => s.trim()).filter(Boolean);
  // 110000~490000, 10000 단위 (HIRA 17개 시도가 이 범위에 분포)
  const cands: string[] = [];
  for (let n = 110000; n <= 490000; n += 10000) cands.push(String(n));
  return cands;
}

async function discoverSidos(serviceKey: string): Promise<Map<string, string>> {
  const map = new Map<string, string>(); // sidoCdNm -> sidoCd
  const candidates = defaultSidoCandidates();
  console.log(`[harvest] 시도 후보 ${candidates.length}개 스캔 시작 (delay=${DELAY_MS}ms)`);
  for (const sc of candidates) {
    try {
      const xml = await fetchPharmacyXml(serviceKey, {
        sidoCd: sc,
        numOfRows: "1",
        pageNo: "1",
      });
      const total = parseTotalCount(xml);
      if (total > 0) {
        const nm = extractFirst(xml, "sidoCdNm");
        if (nm) {
          map.set(nm, sc);
          console.log(`  ✓ ${sc} → ${nm} (total=${total})`);
        }
      }
    } catch (e) {
      console.warn(`  ✗ ${sc}: ${(e as Error).message}`);
    }
    await sleep(DELAY_MS);
  }
  return map;
}

async function discoverSggus(
  serviceKey: string,
  sidoCd: string,
  sidoNm: string,
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  console.log(`[harvest] ${sidoNm}(${sidoCd}) 시군구 수집...`);
  let pageNo = 1;
  let totalPages = 1;
  while (pageNo <= totalPages) {
    try {
      const xml = await fetchPharmacyXml(serviceKey, {
        sidoCd,
        numOfRows: "100",
        pageNo: String(pageNo),
      });
      if (pageNo === 1) {
        const total = parseTotalCount(xml);
        totalPages = Math.ceil(total / 100);
        console.log(`  total=${total}, pages=${totalPages}`);
      }
      const codes = extractAll(xml, "sgguCd");
      const names = extractAll(xml, "sgguCdNm");
      const n = Math.min(codes.length, names.length);
      for (let i = 0; i < n; i++) {
        if (!map.has(names[i])) map.set(names[i], codes[i]);
      }
    } catch (e) {
      console.warn(`  pg${pageNo} 실패: ${(e as Error).message}`);
    }
    pageNo++;
    await sleep(DELAY_MS);
  }
  console.log(`  → ${sidoNm} 시군구 ${map.size}개 발견`);
  return map;
}

function renderModule(sido: Map<string, string>, sggu: Map<string, string>): string {
  const sidoLines = [...sido.entries()]
    .sort(([a], [b]) => a.localeCompare(b, "ko"))
    .map(([nm, cd]) => `  ${nm}: ${JSON.stringify(cd)},`)
    .join("\n");
  const sgguLines = [...sggu.entries()]
    .sort(([a], [b]) => a.localeCompare(b, "ko"))
    .map(([nm, cd]) => `  ${nm}: ${JSON.stringify(cd)},`)
    .join("\n");
  return `/**
 * HIRA(건강보험심사평가원) 자체 시도/시군구 코드 매핑
 *
 * 배경: HIRA \`getParmacyBasisList\`/\`getHospBasisList\`는 Q0/Q1(한글) 파라미터는 무시하지만
 * raw \`sidoCd\`/\`sgguCd\` (6자리 HIRA 코드)는 서버측 필터로 정상 동작.
 *
 * 자동 생성: scripts/harvest-hira-region-codes.ts
 * 수동 편집 가능하나 재생성 시 덮어써짐.
 */

/** HIRA 시도 코드 (6자리, 끝 5자리 = "00000"). */
export const HIRA_SIDO_CODES: Record<string, string> = {
${sidoLines}
};

/** HIRA 시군구 코드 (6자리, 앞 2자리 = sido prefix). */
export const HIRA_SGGU_CODES: Record<string, string> = {
${sgguLines}
};

/** 부분명 자동 보강 후보 — "하남" → "하남시", "수원" → "수원시" 등 시도 */
const SGGU_SUFFIX_HINTS = ["시", "군", "구"];

function lookupSido(name?: string): string | undefined {
  if (!name) return undefined;
  const key = name.trim();
  if (!key) return undefined;
  return HIRA_SIDO_CODES[key];
}

function lookupSggu(name?: string): string | undefined {
  if (!name) return undefined;
  const key = name.trim();
  if (!key) return undefined;
  if (HIRA_SGGU_CODES[key]) return HIRA_SGGU_CODES[key];
  for (const suffix of SGGU_SUFFIX_HINTS) {
    if (!key.endsWith(suffix)) {
      const augmented = key + suffix;
      if (HIRA_SGGU_CODES[augmented]) return HIRA_SGGU_CODES[augmented];
    }
  }
  return undefined;
}

export interface HiraRegionResolution {
  sidoCd?: string;
  sgguCd?: string;
  matched: boolean;
}

/**
 * Q0/Q1 한글 → HIRA raw sidoCd/sgguCd 변환.
 *
 * 매칭 규칙:
 * - 둘 다 지정: 둘 다 매핑되어야 matched=true
 * - 한쪽만 지정: 해당 쪽만 매핑되면 matched=true
 * - 미매핑 시 matched=false → 호출자는 기존 클라이언트 재필터 경로 폴백
 */
export function resolveHiraRegionCode(input: {
  Q0?: string;
  Q1?: string;
}): HiraRegionResolution {
  const sidoCd = lookupSido(input.Q0);
  const sgguCd = lookupSggu(input.Q1);

  const wantsSido = Boolean(input.Q0?.trim());
  const wantsSggu = Boolean(input.Q1?.trim());

  if (!wantsSido && !wantsSggu) return { matched: false };

  const sidoOk = !wantsSido || Boolean(sidoCd);
  const sgguOk = !wantsSggu || Boolean(sgguCd);

  if (sidoOk && sgguOk) {
    const result: HiraRegionResolution = { matched: true };
    if (sidoCd) result.sidoCd = sidoCd;
    if (sgguCd) result.sgguCd = sgguCd;
    return result;
  }

  return { matched: false };
}
`;
}

async function main(): Promise<void> {
  const serviceKey = loadServiceKey();
  const sidoMap = await discoverSidos(serviceKey);
  if (sidoMap.size === 0) {
    throw new Error("발견된 시도가 0개 — 후보 코드 범위 또는 네트워크 확인 필요");
  }
  console.log(`\n[harvest] 시도 ${sidoMap.size}개 발견. 시군구 수집 시작...\n`);

  const sgguMap = new Map<string, string>();
  for (const [sidoNm, sidoCd] of sidoMap) {
    const local = await discoverSggus(serviceKey, sidoCd, sidoNm);
    for (const [nm, cd] of local) {
      if (!sgguMap.has(nm)) sgguMap.set(nm, cd);
    }
  }

  console.log(`\n[harvest] 완료: 시도 ${sidoMap.size}개, 시군구 ${sgguMap.size}개`);

  const moduleSrc = renderModule(sidoMap, sgguMap);
  if (DRY_RUN) {
    console.log("\n[DRY_RUN] 출력 모듈:\n");
    console.log(moduleSrc);
    return;
  }
  const outPath = join(process.cwd(), "src", "hira-region-codes.ts");
  writeFileSync(outPath, moduleSrc, "utf8");
  console.log(`[harvest] 저장: ${outPath}`);
}

// CLI 가드 — import 시 자동 실행 방지 (test:coverage 부작용 회피)
if (process.argv[1] && process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
