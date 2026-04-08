/**
 * E2E: MCP 서버 부트스트랩 + tool call 통합 테스트
 * 외부 API는 모킹, 서버 내부 레이어 간 연결을 검증
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer } from "../server.js";
import type { ServerConfig } from "../config.js";

const FULL_CONFIG: ServerConfig = {
  lawApiOc: "test-oc",
  dartApiKey: "test-dart",
  data20ServiceKey: "test-data20",
  unipassApiKeys: { "001": "test-key" },
  eximApiKey: "test-exim",
  mafraApiKey: "test-mafra",
  finlifeApiKey: "test-finlife",
};

const MINIMAL_CONFIG: ServerConfig = {
  lawApiOc: "test-oc",
};

function mockFetchXml(rootTag: string, inner: string): void {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(`<${rootTag}>${inner}</${rootTag}>`, {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    }),
  );
}

async function createConnectedClient(config: ServerConfig) {
  const server = createServer(config);
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);

  const client = new Client({ name: "test-client", version: "1.0.0" });
  await client.connect(clientTransport);
  return { client, server };
}

describe("MCP 서버 E2E", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("풀_설정_12개스킬+5개프롬프트_등록확인", async () => {
    const { client } = await createConnectedClient(FULL_CONFIG);
    const { tools } = await client.listTools();
    const toolNames = tools.map((t) => t.name).sort();

    expect(toolNames).toContain("legal_research");
    expect(toolNames).toContain("case_research");
    expect(toolNames).toContain("law_amendment");
    expect(toolNames).toContain("import_clearance");
    expect(toolNames).toContain("export_clearance");
    expect(toolNames).toContain("shipping_logistics");
    expect(toolNames).toContain("tariff_lookup");
    expect(toolNames).toContain("trade_entity");
    expect(toolNames).toContain("corporate_disclosure");
    expect(toolNames).toContain("public_data");
    expect(toolNames).toContain("financial_product");
    expect(toolNames).toContain("insurance");
    expect(toolNames).toHaveLength(12);

    const { prompts } = await client.listPrompts();
    expect(prompts.length).toBe(5);
  });

  it("최소_설정_법제처3개+기업공시1개만_등록", async () => {
    const { client } = await createConnectedClient(MINIMAL_CONFIG);
    const { tools } = await client.listTools();
    const toolNames = tools.map((t) => t.name).sort();

    expect(toolNames).toContain("legal_research");
    expect(toolNames).toContain("case_research");
    expect(toolNames).toContain("law_amendment");
    expect(toolNames).toContain("corporate_disclosure");
    expect(toolNames).toHaveLength(4);
  });

  it("legal_research_search_laws_실제디스패치", async () => {
    mockFetchXml("LawSearch", "<totalCnt>1</totalCnt><law><법령일련번호>123</법령일련번호><법령명한글>민법</법령명한글></law>");

    const { client } = await createConnectedClient(FULL_CONFIG);
    const result = await client.callTool({
      name: "legal_research",
      arguments: { action: "search_laws", query: "민법" },
    });

    expect(result.isError).toBeFalsy();
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain("민법");
  });

  it("잘못된_action_검증에러반환", async () => {
    const { client } = await createConnectedClient(FULL_CONFIG);
    const result = await client.callTool({
      name: "legal_research",
      arguments: { action: "invalid_action" },
    });

    expect(result.isError).toBe(true);
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain("Invalid");
  });

  it("필수파라미터_누락_에러반환", async () => {
    const { client } = await createConnectedClient(FULL_CONFIG);
    const result = await client.callTool({
      name: "legal_research",
      arguments: { action: "get_law_detail" },
    });

    expect(result.isError).toBe(true);
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain("파라미터가 필요합니다");
  });

  it("MCP_프롬프트_내용조회", async () => {
    const { client } = await createConnectedClient(FULL_CONFIG);
    const { prompts } = await client.listPrompts();
    const importGuide = prompts.find((p) => p.name === "수입통관_워크플로");
    expect(importGuide).toBeDefined();

    const result = await client.getPrompt({
      name: "수입통관_워크플로",
      arguments: { bl_number: "TESTBL123" },
    });
    expect(result.messages.length).toBeGreaterThan(0);
    expect(result.messages[0].content.type).toBe("text");
  });

  it("API키_없으면_해당도구_미등록", async () => {
    const config: ServerConfig = { lawApiOc: "test-oc", dartApiKey: "dk" };
    const { client } = await createConnectedClient(config);
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name);

    expect(names).not.toContain("import_clearance");
    expect(names).not.toContain("financial_product");
    expect(names).not.toContain("public_data");
    expect(names).toContain("corporate_disclosure");
  });
});
