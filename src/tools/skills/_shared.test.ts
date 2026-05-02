import { describe, it, expect, vi } from "vitest";
import { createDispatcher, requireParam, registerSkillTool } from "./_shared.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

describe("createDispatcher", () => {
  it("유효한action_해당핸들러호출", async () => {
    const dispatch = createDispatcher("test_skill", {
      ping: async () => ({ content: [{ type: "text", text: "pong" }] }),
    });

    const result = await dispatch({ action: "ping" });
    expect(result.content[0].text).toBe("pong");
    expect(result.isError).toBeUndefined();
  });

  it("알수없는action_isError반환", async () => {
    const dispatch = createDispatcher("test_skill", {
      ping: async () => ({ content: [{ type: "text", text: "pong" }] }),
    });

    const result = await dispatch({ action: "unknown" });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("알 수 없는 action");
    expect(result.content[0].text).toContain("unknown");
  });

  it("사용가능action목록_에러메시지에포함", async () => {
    const dispatch = createDispatcher("test_skill", {
      a: async () => ({ content: [{ type: "text", text: "" }] }),
      b: async () => ({ content: [{ type: "text", text: "" }] }),
    });

    const result = await dispatch({ action: "x" });
    expect(result.content[0].text).toContain("a, b");
  });

  it("핸들러예외_그대로throw", async () => {
    const dispatch = createDispatcher("test_skill", {
      fail: async () => { throw new Error("boom"); },
    });

    await expect(dispatch({ action: "fail" })).rejects.toThrow("boom");
  });
});

describe("registerSkillTool", () => {
  it("annotations.readOnlyHint=true로_registerTool_호출", () => {
    const registerTool = vi.fn();
    const server = { registerTool } as unknown as McpServer;

    registerSkillTool(server, {
      name: "test_tool",
      title: "Test Tool",
      description: "테스트 도구",
      inputSchema: { action: z.string().describe("액션") },
      callback: async () => ({ content: [{ type: "text" as const, text: "ok" }] }),
    });

    expect(registerTool).toHaveBeenCalledOnce();
    const [, config] = registerTool.mock.calls[0];
    expect(config.annotations?.readOnlyHint).toBe(true);
    expect(config.annotations?.destructiveHint).toBe(false);
  });

  it("outputSchema_content_배열_형태로_등록", () => {
    const registerTool = vi.fn();
    const server = { registerTool } as unknown as McpServer;

    registerSkillTool(server, {
      name: "test_tool",
      title: "Test Tool",
      description: "테스트 도구",
      inputSchema: { action: z.string().describe("액션") },
      callback: async () => ({ content: [{ type: "text" as const, text: "ok" }] }),
    });

    const [, config] = registerTool.mock.calls[0];
    expect(config.outputSchema).toBeDefined();
  });

  it("title과_description이_config에_전달됨", () => {
    const registerTool = vi.fn();
    const server = { registerTool } as unknown as McpServer;

    registerSkillTool(server, {
      name: "test_tool",
      title: "My Tool Title",
      description: "도구 설명",
      inputSchema: { action: z.string().describe("액션") },
      callback: async () => ({ content: [{ type: "text" as const, text: "ok" }] }),
    });

    const [name, config] = registerTool.mock.calls[0];
    expect(name).toBe("test_tool");
    expect(config.title).toBe("My Tool Title");
    expect(config.description).toBe("도구 설명");
  });
});

describe("requireParam", () => {
  it("값존재_null반환", () => {
    const result = requireParam({ hs_code: "0201" }, "hs_code", "search_hs");
    expect(result).toBeNull();
  });

  it("undefined_에러반환", () => {
    const result = requireParam({}, "hs_code", "search_hs");
    expect(result).not.toBeNull();
    expect(result!.isError).toBe(true);
    expect(result!.content[0].text).toContain("hs_code");
  });

  it("빈문자열_에러반환", () => {
    const result = requireParam({ hs_code: "" }, "hs_code", "search_hs");
    expect(result).not.toBeNull();
    expect(result!.isError).toBe(true);
  });

  it("null값_에러반환", () => {
    const result = requireParam({ hs_code: null }, "hs_code", "search_hs");
    expect(result).not.toBeNull();
    expect(result!.isError).toBe(true);
  });

  it("0값_유효_null반환", () => {
    const result = requireParam({ count: 0 }, "count", "test");
    expect(result).toBeNull();
  });
});
