/**
 * Claude Code 플러그인 매니페스트 검증
 *
 * 플러그인 배포물(.claude-plugin/, .mcp.json, skills/, commands/)은 런타임 코드가 아니라
 * 선언 파일이지만, 오타 하나로 `/plugin marketplace add` 전체가 실패하므로 구조를 고정한다.
 */

import { describe, it, expect } from "vitest";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");

function readJson<T>(...segments: string[]): T {
  return JSON.parse(readFileSync(join(ROOT, ...segments), "utf8")) as T;
}

interface PluginManifest {
  name: string;
  version: string;
  description: string;
  author?: { name?: string; url?: string };
  homepage?: string;
  repository?: string;
  license?: string;
  keywords?: string[];
}

interface MarketplaceManifest {
  name: string;
  owner: { name: string; url?: string };
  plugins: Array<{
    name: string;
    source: string;
    description: string;
    version?: string;
    category?: string;
    keywords?: string[];
  }>;
}

interface McpConfig {
  mcpServers: Record<
    string,
    { type?: string; url?: string; command?: string; args?: string[] }
  >;
}

const SKILLS_DIR = join(ROOT, "src", "tools", "skills");

/** ACTIONS 상수 대신 런타임에 목록을 조립하는 도구 — 정적 추출 대상에서 제외한다 */
const DYNAMIC_ACTION_TOOLS = ["youtube", "foreign-case-research"];

/** 위 도구들의 액션 (소스에서 정적 추출 불가하므로 여기서 관리) */
const DYNAMIC_ACTIONS = [
  "get_transcript",
  "summarize",
  "video_info",
  "search",
  "comments",
  "search_us_cases",
  "get_us_case_detail",
  "search_de_cases",
  "get_de_case_detail",
];

/** `registerXxx` 호출로 실제 등록되는 스킬 도구 이름 (snake_case) */
function registeredToolNames(): string[] {
  return skillModuleFiles().map((f) => f.replace(/\.ts$/, "").replace(/-/g, "_"));
}

function skillModuleFiles(): string[] {
  return readdirSync(SKILLS_DIR).filter(
    (f) =>
      f.endsWith(".ts") &&
      !f.endsWith(".test.ts") &&
      !f.startsWith("_") &&
      f !== "index.ts" &&
      f !== "prompts.ts",
  );
}

/** inputSchema의 zod 필드명 — 문서가 action과 함께 백틱으로 표기하므로 오탐 방지에 필요 */
function sourceParamNames(): string[] {
  const names = new Set<string>();
  for (const file of skillModuleFiles()) {
    const src = readFileSync(join(SKILLS_DIR, file), "utf8");
    for (const m of src.matchAll(/^\s+([a-z][a-z0-9_]*):\s*z\./gm)) {
      names.add(m[1]);
    }
  }
  return [...names];
}

/** 각 스킬 모듈의 `const ACTIONS = [...] as const` 를 파싱해 도구별 액션 목록을 만든다 */
function sourceActions(): Map<string, string[]> {
  const result = new Map<string, string[]>();
  for (const file of skillModuleFiles()) {
    const base = file.replace(/\.ts$/, "");
    if (DYNAMIC_ACTION_TOOLS.includes(base)) continue;
    const src = readFileSync(join(SKILLS_DIR, file), "utf8");
    const block = src.match(/^const ACTIONS = \[([\s\S]*?)\] as const;/m);
    if (!block) continue;
    const actions = [...block[1].matchAll(/"([a-z0-9_]+)"/g)].map((m) => m[1]);
    result.set(base.replace(/-/g, "_"), actions);
  }
  return result;
}

describe("플러그인 매니페스트 (.claude-plugin/plugin.json)", () => {
  const manifest = readJson<PluginManifest>(".claude-plugin", "plugin.json");

  it("pluginJson_필수필드_존재", () => {
    expect(manifest.name).toBe("korea-public-data");
    expect(manifest.description.length).toBeGreaterThan(0);
    expect(manifest.author?.name).toBeTruthy();
  });

  it("pluginJson_name_kebabCase", () => {
    expect(manifest.name).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it("pluginJson_version_semver형식", () => {
    expect(manifest.version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("pluginJson_repository_실제저장소지시", () => {
    expect(manifest.repository).toContain("github.com/hjsh200219");
    expect(manifest.homepage).toContain("github.com/hjsh200219");
  });
});

describe("마켓플레이스 매니페스트 (.claude-plugin/marketplace.json)", () => {
  const marketplace = readJson<MarketplaceManifest>(
    ".claude-plugin",
    "marketplace.json",
  );
  const manifest = readJson<PluginManifest>(".claude-plugin", "plugin.json");

  it("marketplace_plugins_1개이상", () => {
    expect(marketplace.plugins.length).toBeGreaterThan(0);
  });

  it("marketplace_selfHosted항목_source가저장소루트", () => {
    const self = marketplace.plugins.find((p) => p.name === manifest.name);
    expect(self).toBeDefined();
    expect(self?.source).toBe("./");
  });

  it("marketplace_pluginJson대조_name과description일치", () => {
    const self = marketplace.plugins.find((p) => p.name === manifest.name);
    expect(self?.description).toBe(manifest.description);
  });

  it("marketplace_owner_존재", () => {
    expect(marketplace.owner.name).toBeTruthy();
  });
});

describe("번들 MCP 서버 (.mcp.json)", () => {
  const mcp = readJson<McpConfig>(".mcp.json");

  it("mcpJson_publicData서버_원격HTTP등록", () => {
    const server = mcp.mcpServers["public-data"];
    expect(server).toBeDefined();
    expect(server.type).toBe("http");
    expect(server.url).toBe("https://public-data.up.railway.app/mcp");
  });

  it("mcpJson_원격전용_로컬커맨드없음", () => {
    for (const server of Object.values(mcp.mcpServers)) {
      expect(server.command).toBeUndefined();
    }
  });

  it("mcpJson_url_https강제", () => {
    for (const server of Object.values(mcp.mcpServers)) {
      expect(server.url?.startsWith("https://")).toBe(true);
    }
  });
});

describe("플러그인 스킬 (skills/)", () => {
  const skillPath = join(ROOT, "skills", "korea-public-data", "SKILL.md");

  it("skillMd_파일_존재", () => {
    expect(existsSync(skillPath)).toBe(true);
  });

  it("skillMd_frontmatter_name과description존재", () => {
    const body = readFileSync(skillPath, "utf8");
    expect(body.startsWith("---\n")).toBe(true);
    const frontmatter = body.slice(4, body.indexOf("\n---", 4));
    expect(frontmatter).toMatch(/^name:\s*\S+/m);
    expect(frontmatter).toMatch(/^description:\s*\S+/m);
  });

  it("skillMd_등록된모든스킬도구_이름언급", () => {
    const body = readFileSync(skillPath, "utf8");
    // 하드코딩 목록 대신 오케스트레이터에서 파생 — 도구 추가 시 자동으로 검증 대상에 포함된다
    for (const name of registeredToolNames()) {
      expect(body, `SKILL.md에 ${name} 설명 누락`).toContain(name);
    }
  });

  it("skillMd_소스ACTIONS_전수언급", () => {
    const body = readFileSync(skillPath, "utf8");
    const missing: string[] = [];
    for (const [tool, actions] of sourceActions()) {
      for (const action of actions) {
        if (!body.includes(action)) missing.push(`${tool}.${action}`);
      }
    }
    // "외 N종" 같은 요약 표현은 개수가 소스와 어긋나도 드러나지 않으므로 전수 나열을 강제한다
    expect(missing, `SKILL.md 미기재 action: ${missing.join(", ")}`).toEqual([]);
  });

  it("skillMd_존재하지않는action_미언급", () => {
    const body = readFileSync(skillPath, "utf8");
    const known = new Set(
      [...sourceActions().values()]
        .flat()
        .concat(DYNAMIC_ACTIONS)
        .concat(sourceParamNames()),
    );
    // 백틱으로 감싼 snake_case 토큰만 action 표기로 간주 (산문·도구명과 구분)
    const cited = [...body.matchAll(/`([a-z][a-z0-9]*(?:_[a-z0-9]+)+)`/g)].map(
      (m) => m[1],
    );
    const toolNames = new Set(registeredToolNames());
    const phantom = [
      ...new Set(cited.filter((t) => !known.has(t) && !toolNames.has(t))),
    ];
    expect(phantom, `소스에 없는 action 표기: ${phantom.join(", ")}`).toEqual(
      [],
    );
  });
});

describe("플러그인 커맨드 (commands/)", () => {
  const commandsDir = join(ROOT, "commands");
  const files = existsSync(commandsDir)
    ? readdirSync(commandsDir).filter((f) => f.endsWith(".md"))
    : [];

  it("commands_md파일_1개이상", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it("commands_전체_descriptionFrontmatter존재", () => {
    for (const file of files) {
      const body = readFileSync(join(commandsDir, file), "utf8");
      expect(body.startsWith("---\n"), `${file}: frontmatter 누락`).toBe(true);
      const frontmatter = body.slice(4, body.indexOf("\n---", 4));
      expect(frontmatter, `${file}: description 누락`).toMatch(
        /^description:\s*\S+/m,
      );
    }
  });

  it("commands_파일명_kebabCase", () => {
    for (const file of files) {
      expect(file).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*\.md$/);
    }
  });

  it("commands_전체_k접두사", () => {
    // 파일명이 곧 슬래시 커맨드 이름이다. `law`·`trade` 같은 일반명사는 타 플러그인과
    // 축약형(`/law`)이 충돌하므로 `k-` 접두사로 네임스페이스를 확보하고 자동완성에서 묶는다.
    for (const file of files) {
      expect(file, `${file}: 커맨드는 k- 접두사가 필요하다`).toMatch(/^k-/);
    }
  });
});
