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

describe("플러그인 매니페스트 (.claude-plugin/plugin.json)", () => {
  const manifest = readJson<PluginManifest>(".claude-plugin", "plugin.json");

  it("필수 필드를 갖는다", () => {
    expect(manifest.name).toBe("korea-public-data");
    expect(manifest.description.length).toBeGreaterThan(0);
    expect(manifest.author?.name).toBeTruthy();
  });

  it("plugin name은 kebab-case다 (Claude Code 로더 제약)", () => {
    expect(manifest.name).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it("version은 semver 형식이다", () => {
    expect(manifest.version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("repository/homepage는 실제 GitHub 저장소를 가리킨다", () => {
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

  it("plugins 목록에 최소 1개 항목이 있다", () => {
    expect(marketplace.plugins.length).toBeGreaterThan(0);
  });

  it("self-hosted 항목의 source는 저장소 루트('./')다", () => {
    const self = marketplace.plugins.find((p) => p.name === manifest.name);
    expect(self).toBeDefined();
    expect(self?.source).toBe("./");
  });

  it("plugin.json과 name/description이 어긋나지 않는다", () => {
    const self = marketplace.plugins.find((p) => p.name === manifest.name);
    expect(self?.description).toBe(manifest.description);
  });

  it("owner 정보를 갖는다", () => {
    expect(marketplace.owner.name).toBeTruthy();
  });
});

describe("번들 MCP 서버 (.mcp.json)", () => {
  const mcp = readJson<McpConfig>(".mcp.json");

  it("public-data 서버를 원격 HTTP로 등록한다", () => {
    const server = mcp.mcpServers["public-data"];
    expect(server).toBeDefined();
    expect(server.type).toBe("http");
    expect(server.url).toBe("https://public-data.up.railway.app/mcp");
  });

  it("원격 전용이므로 로컬 실행 커맨드를 포함하지 않는다", () => {
    for (const server of Object.values(mcp.mcpServers)) {
      expect(server.command).toBeUndefined();
    }
  });

  it("URL은 https다 (평문 전송 금지)", () => {
    for (const server of Object.values(mcp.mcpServers)) {
      expect(server.url?.startsWith("https://")).toBe(true);
    }
  });
});

describe("플러그인 스킬 (skills/)", () => {
  const skillPath = join(ROOT, "skills", "korea-public-data", "SKILL.md");

  it("SKILL.md가 존재한다", () => {
    expect(existsSync(skillPath)).toBe(true);
  });

  it("frontmatter에 name/description을 갖는다", () => {
    const body = readFileSync(skillPath, "utf8");
    expect(body.startsWith("---\n")).toBe(true);
    const frontmatter = body.slice(4, body.indexOf("\n---", 4));
    expect(frontmatter).toMatch(/^name:\s*\S+/m);
    expect(frontmatter).toMatch(/^description:\s*\S+/m);
  });

  it("19개 스킬 도구 이름을 모두 언급한다 (도구 발견율 보장)", () => {
    const body = readFileSync(skillPath, "utf8");
    const toolNames = [
      "legal_research",
      "case_research",
      "law_amendment",
      "corporate_disclosure",
      "public_data",
      "financial_product",
      "insurance",
      "procurement",
      "import_clearance",
      "export_clearance",
      "shipping_logistics",
      "tariff_lookup",
      "trade_entity",
      "youtube",
      "product_review",
      "tourism",
      "foreign_case_research",
      "assembly",
      "gov24_ai",
    ];
    for (const name of toolNames) {
      expect(body, `SKILL.md에 ${name} 설명 누락`).toContain(name);
    }
  });
});

describe("플러그인 커맨드 (commands/)", () => {
  const commandsDir = join(ROOT, "commands");
  const files = existsSync(commandsDir)
    ? readdirSync(commandsDir).filter((f) => f.endsWith(".md"))
    : [];

  it("커맨드가 1개 이상 있다", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it("모든 커맨드가 description frontmatter를 갖는다", () => {
    for (const file of files) {
      const body = readFileSync(join(commandsDir, file), "utf8");
      expect(body.startsWith("---\n"), `${file}: frontmatter 누락`).toBe(true);
      const frontmatter = body.slice(4, body.indexOf("\n---", 4));
      expect(frontmatter, `${file}: description 누락`).toMatch(
        /^description:\s*\S+/m,
      );
    }
  });

  it("커맨드 파일명은 kebab-case다", () => {
    for (const file of files) {
      expect(file).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*\.md$/);
    }
  });
});
