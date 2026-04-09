/**
 * L5 메타 검증: package.json의 gc 스크립트와 CI 워크플로가 동일 품질 축을 포함하는지 확인합니다.
 * `npm run verify-harness-meta`
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");

function fail(msg: string): never {
  console.error(`verify-harness-meta: ${msg}`);
  process.exit(1);
}

const pkgPath = join(ROOT, "package.json");
const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as {
  scripts?: Record<string, string>;
};

const gc = pkg.scripts?.gc ?? "";
const requiredInGc = ["verify-docs", "dead-code", "verify-harness-meta"];
for (const name of requiredInGc) {
  if (!gc.includes(name)) {
    fail(`package.json scripts.gc에 "${name}"가 포함되어야 합니다.`);
  }
}

const ciPath = join(ROOT, ".github", "workflows", "ci.yml");
let ci: string;
try {
  ci = readFileSync(ciPath, "utf8");
} catch {
  fail(".github/workflows/ci.yml 을 읽을 수 없습니다.");
}

const requiredInCi = ["verify-docs", "dead-code"];
for (const name of requiredInCi) {
  if (!ci.includes(name)) {
    fail(`ci.yml에 "${name}" 단계(또는 동일 npm run)가 있어야 합니다.`);
  }
}

const knipPath = join(ROOT, "knip.json");
const knip = JSON.parse(readFileSync(knipPath, "utf8")) as {
  treatConfigHintsAsErrors?: boolean;
};
if (knip.treatConfigHintsAsErrors !== true) {
  fail("knip.json 에 treatConfigHintsAsErrors: true 가 필요합니다 (L5).");
}

console.log("verify-harness-meta: OK");
