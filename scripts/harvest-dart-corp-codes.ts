#!/usr/bin/env tsx
/**
 * DART 고유번호(corp_code) 스냅샷 수집기.
 *
 * 배경: Railway egress → opendart.fss.or.kr 가 전반적으로 느려(작은 JSON도 ~14s)
 * 3.5MB corpCode.xml ZIP 다운로드가 60s 타임아웃 안에 못 끝나 corp_code 해석이
 * 프로덕션에서 상시 실패한다. 따라서 정적 스냅샷을 리포에 번들해 라이브 다운로드를
 * 제거한다 (hira-region-codes.ts 와 동일한 정적 매핑 패턴).
 *
 * 동작:
 * 1. corpCode.xml ZIP 다운로드 → CORPCODE.xml 추출
 * 2. <list> 항목 파싱 → [corpCode, corpName, stockCode] 배열
 * 3. JSON → gzip → base64 → src/dart-corp-codes.ts 로 덮어쓰기
 *
 * 사용법:
 *   DART_API_KEY=... npx tsx scripts/harvest-dart-corp-codes.ts
 *   또는 .env에 키 있으면: npx tsx scripts/harvest-dart-corp-codes.ts
 *
 * 옵션 환경변수:
 *   HARVEST_DRY_RUN=1 — 파일 쓰지 않고 통계만 출력
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const CORP_CODE_URL = "https://opendart.fss.or.kr/api/corpCode.xml";
const REQUEST_TIMEOUT_MS = 120000;
const DRY_RUN = process.env["HARVEST_DRY_RUN"] === "1";

function loadApiKey(): string {
  const fromEnv = process.env["DART_API_KEY"];
  if (fromEnv) return fromEnv;
  try {
    const envPath = join(process.cwd(), ".env");
    const text = readFileSync(envPath, "utf8");
    const match = text.match(/^DART_API_KEY=(.+)$/m);
    if (match) return match[1].trim();
  } catch {
    // ignore
  }
  throw new Error("DART_API_KEY가 환경변수/.env에 없습니다.");
}

async function downloadCorpCodeXml(apiKey: string): Promise<string> {
  const url = `${CORP_CODE_URL}?crtfc_key=${encodeURIComponent(apiKey)}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const r = await fetch(url, { signal: controller.signal });
    if (!r.ok) throw new Error(`corpCode.xml 다운로드 실패: HTTP ${r.status}`);
    const buffer = await r.arrayBuffer();
    const JSZip = (await import("jszip")).default;
    const zip = await JSZip.loadAsync(buffer);
    const xmlFile = zip.file("CORPCODE.xml");
    if (!xmlFile) throw new Error("CORPCODE.xml을 ZIP에서 찾을 수 없습니다");
    return await xmlFile.async("text");
  } finally {
    clearTimeout(timer);
  }
}

/** [corpCode, corpName, stockCode] 3-튜플 배열로 파싱. */
function parseEntries(xml: string): Array<[string, string, string]> {
  const rows: Array<[string, string, string]> = [];
  const listRe = /<list>([\s\S]*?)<\/list>/g;
  const field = (block: string, tag: string): string => {
    const m = new RegExp(`<${tag}>([^<]*)</${tag}>`).exec(block);
    return m ? m[1].trim() : "";
  };
  let m: RegExpExecArray | null;
  while ((m = listRe.exec(xml)) !== null) {
    const block = m[1];
    const corpName = field(block, "corp_name");
    if (!corpName) continue;
    const corpCode = field(block, "corp_code").padStart(8, "0");
    const stockCode = field(block, "stock_code");
    rows.push([corpCode, corpName, stockCode]);
  }
  return rows;
}

function renderModule(rows: Array<[string, string, string]>, b64: string): string {
  return `/**
 * DART 고유번호(corp_code) 정적 스냅샷.
 *
 * 배경: Railway egress → opendart.fss.or.kr 가 느려 3.5MB corpCode.xml 라이브
 * 다운로드가 60s 타임아웃 안에 못 끝난다. 따라서 번들 스냅샷에서 먼저 조회하고,
 * 미수록 시에만 라이브 corpCode.xml 로 폴백한다 (dart-api.ts resolveCorpCode).
 *
 * 자동 생성: scripts/harvest-dart-corp-codes.ts
 * 직접 수정 금지 — harvest 스크립트 재실행으로만 갱신.
 *
 * 형식: gzip(JSON([[corpCode, corpName, stockCode], ...])) → base64.
 * 항목 수: ${rows.length}
 */

import { gunzipSync } from "node:zlib";
import type { CorpCodeEntry } from "./dart-types.js";

/** gzip+base64 인코딩된 corp_code 스냅샷 (런타임에 lazy 디코딩). */
const CORP_CODE_SNAPSHOT_B64 =
  "${b64}";

let cached: Map<string, CorpCodeEntry[]> | null = null;

/** 스냅샷을 corpName → CorpCodeEntry[] Map 으로 디코딩 (1회 캐시). */
export function getCorpCodeSnapshot(): Map<string, CorpCodeEntry[]> {
  if (cached) return cached;
  const json = gunzipSync(Buffer.from(CORP_CODE_SNAPSHOT_B64, "base64")).toString("utf8");
  const rows = JSON.parse(json) as Array<[string, string, string]>;
  const map = new Map<string, CorpCodeEntry[]>();
  for (const [corpCode, corpName, stockCode] of rows) {
    if (!corpName) continue;
    const entry: CorpCodeEntry = { corpCode, corpName, stockCode, modifyDate: "" };
    const existing = map.get(corpName);
    if (existing) existing.push(entry);
    else map.set(corpName, [entry]);
  }
  cached = map;
  return map;
}
`;
}

async function main(): Promise<void> {
  const apiKey = loadApiKey();
  console.log("[harvest] corpCode.xml 다운로드 중...");
  const xml = await downloadCorpCodeXml(apiKey);
  console.log(`[harvest] XML ${(xml.length / 1e6).toFixed(1)}MB 수신, 파싱 중...`);

  const rows = parseEntries(xml);
  if (rows.length === 0) {
    throw new Error("파싱된 항목이 0개 — 응답 형식/네트워크 확인 필요");
  }
  const json = JSON.stringify(rows);
  const gz = gzipSync(Buffer.from(json, "utf8"), { level: 9 });
  const b64 = gz.toString("base64");
  console.log(
    `[harvest] 항목 ${rows.length}개 | JSON ${(json.length / 1e6).toFixed(2)}MB → gzip ${(gz.length / 1e6).toFixed(2)}MB → base64 ${(b64.length / 1e6).toFixed(2)}MB`,
  );

  if (DRY_RUN) {
    console.log("[DRY_RUN] 파일 쓰지 않음.");
    return;
  }
  const outPath = join(process.cwd(), "src", "dart-corp-codes.ts");
  writeFileSync(outPath, renderModule(rows, b64), "utf8");
  console.log(`[harvest] 저장: ${outPath}`);
}

// CLI 가드 — import 시 자동 실행 방지 (test:coverage 부작용 회피)
if (process.argv[1] && process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
