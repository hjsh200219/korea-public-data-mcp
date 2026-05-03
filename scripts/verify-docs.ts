/**
 * ARCHITECTURE.md 다이어그램의 액션 합계·헤더 문구와 실제 src 모듈 개수를 검증합니다.
 * `npm run verify-docs`
 */

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const SRC = join(ROOT, "src");

function listTs(dir: string): string[] {
  return readdirSync(dir).filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"));
}

const skillsDir = join(SRC, "tools", "skills");
const skillModules = listTs(skillsDir).filter(
  (f) => f !== "_shared.ts" && f !== "index.ts" && f !== "prompts.ts",
);

const routeDomainFiles = listTs(join(SRC, "routes")).filter((f) => f.endsWith("-routes.ts"));

const openapiPathFiles = listTs(join(SRC, "openapi")).filter(
  (f) => f !== "shared.ts" && f !== "_helpers.ts" && f.endsWith("-paths.ts"),
);

const dataAccessApis = listTs(SRC).filter((f) => f.endsWith("-api.ts"));

const typesFiles = listTs(SRC).filter((f) => f.endsWith("-types.ts"));

const EXPECTED = {
  skillModules: 17,
  routeDomainFiles: 11,
  openapiPathModules: 11,
  dataAccessApis: 14,
  typesFiles: 14,
} as const;

function assertCount(label: string, actual: number, expected: number): void {
  if (actual !== expected) {
    throw new Error(`${label}: 실제 ${actual}개, 기대 ${expected}개`);
  }
}

assertCount("의도 기반 스킬 모듈", skillModules.length, EXPECTED.skillModules);
assertCount("routes/*-routes.ts", routeDomainFiles.length, EXPECTED.routeDomainFiles);
assertCount("openapi/*-paths.ts", openapiPathFiles.length, EXPECTED.openapiPathModules);
assertCount("Data Access *-api.ts", dataAccessApis.length, EXPECTED.dataAccessApis);
assertCount("Types *-types.ts", typesFiles.length, EXPECTED.typesFiles);

const archPath = join(ROOT, "ARCHITECTURE.md");
const arch = readFileSync(archPath, "utf8");
const introLine = arch.split("\n").find((l) => l.includes("API 액션")) ?? "";
const actionHeader = introLine.match(/(\d+)개 API 액션/);
if (!actionHeader) {
  throw new Error("ARCHITECTURE.md에서 'N개 API 액션' 문구를 찾지 못했습니다.");
}
const documentedTotal = parseInt(actionHeader[1], 10);

const actionMatches = [...arch.matchAll(/\((\d+) actions?\)/gi)];
const sumFromDiagram = actionMatches.reduce((acc, m) => acc + parseInt(m[1], 10), 0);

if (sumFromDiagram !== documentedTotal) {
  throw new Error(
    `ARCHITECTURE 액션 수 불일치: 다이어그램 (N actions) 합계 ${sumFromDiagram} vs 헤더 ${documentedTotal}`,
  );
}

console.log("verify-docs: OK", {
  skills: skillModules.length,
  routes: routeDomainFiles.length,
  openapiPaths: openapiPathFiles.length,
  dataAccessApis: dataAccessApis.length,
  types: typesFiles.length,
  actionsDocumented: documentedTotal,
});
