/**
 * 스킬 공통 유틸 — action 디스패치 + 파라미터 검증 + 도구 등록 래퍼
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z, type ZodRawShape } from "zod";

export type SkillResult = {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
};

export type ActionHandler<T> = (params: T) => Promise<SkillResult>;

/**
 * action enum → handler 매핑 디스패처 생성.
 * handler 맵에 없는 action이 들어오면 isError 응답 반환.
 */
export function createDispatcher<T extends { action: string }>(
  skillName: string,
  handlers: Record<string, ActionHandler<T>>,
): ActionHandler<T> {
  return async (params: T): Promise<SkillResult> => {
    const handler = handlers[params.action];
    if (!handler) {
      return {
        content: [{
          type: "text",
          text: `[${skillName}] 알 수 없는 action: "${params.action}". 사용 가능: ${Object.keys(handlers).join(", ")}`,
        }],
        isError: true,
      };
    }
    return handler(params);
  };
}

/**
 * 빈 결과 시 AI가 다음 행동을 결정할 수 있는 힌트 포함 메시지 생성.
 * 일시 장애와 진짜 무결과를 구분하는 단서 제공.
 */
export function emptyResultMessage(
  domain: string,
  usedParams?: Record<string, string | undefined>,
  hint?: string,
): SkillResult {
  const paramLines = usedParams
    ? Object.entries(usedParams)
        .filter(([, v]) => v !== undefined && v !== "")
        .map(([k, v]) => `  - ${k}: ${v}`)
        .join("\n")
    : "";
  const paramSection = paramLines ? `\n\n사용된 조건:\n${paramLines}` : "";
  const hintSection = hint ? `\n\n${hint}` : "";
  return {
    content: [{ type: "text", text: `${domain} 검색 결과가 없습니다.${paramSection}${hintSection}` }],
  };
}

/**
 * 필수 파라미터 누락 시 에러 메시지 반환 헬퍼.
 * 예: requireParam(params, "hs_code", "search_hs")
 */
export function requireParam(
  params: Record<string, unknown>,
  name: string,
  action: string,
): SkillResult | null {
  const value = params[name];
  if (value === undefined || value === null || value === "") {
    return {
      content: [{
        type: "text",
        text: `"${action}" action에는 "${name}" 파라미터가 필요합니다.`,
      }],
      isError: true,
    };
  }
  return null;
}

const OUTPUT_SCHEMA = {
  content: z.array(z.object({ type: z.literal("text"), text: z.string() })),
};

/**
 * MCP 스킬 도구 등록 래퍼.
 * outputSchema(content 배열)와 annotations(readOnly/idempotent/openWorld)을 공통 적용.
 */
export function registerSkillTool<TInput extends ZodRawShape>(
  server: McpServer,
  opts: {
    name: string;
    title: string;
    description: string;
    inputSchema: TInput;
    callback: (params: z.infer<z.ZodObject<TInput>>) => Promise<SkillResult>;
  },
): void {
  server.registerTool(
    opts.name,
    {
      title: opts.title,
      description: opts.description,
      inputSchema: opts.inputSchema,
      outputSchema: OUTPUT_SCHEMA,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (async (params: any) => {
      const result = await opts.callback(params);
      return {
        ...result,
        structuredContent: { content: result.content },
      };
    }) as Parameters<typeof server.registerTool>[2],
  );
}
