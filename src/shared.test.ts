import { describe, it, expect } from "vitest";
import { truncate, errorResponse, MAX_CONTENT_LENGTH } from "./shared.js";

describe("truncate", () => {
  it("짧은문자열_그대로반환", () => {
    expect(truncate("hello")).toBe("hello");
  });

  it("기본최대길이_8000_초과시_절단", () => {
    const long = "a".repeat(MAX_CONTENT_LENGTH + 100);
    const out = truncate(long);
    expect(out.length).toBeLessThanOrEqual(MAX_CONTENT_LENGTH + 40);
    expect(out.startsWith("a".repeat(MAX_CONTENT_LENGTH))).toBe(true);
    expect(out).toContain("내용이 길어 일부만 표시");
  });

  it("커스텀_max_적용", () => {
    expect(truncate("abcdefghij", 5)).toBe("abcde\n\n... (내용이 길어 일부만 표시)");
  });
});

describe("errorResponse", () => {
  it("Error_메시지포함", () => {
    const res = errorResponse("테스트", new Error("실패"));
    expect(res.isError).toBe(true);
    expect(res.content[0].type).toBe("text");
    expect((res.content[0] as { text: string }).text).toBe("테스트 오류: 실패");
  });

  it("비Error_알수없는오류", () => {
    const res = errorResponse("라벨", "string-err");
    expect(res.isError).toBe(true);
    expect((res.content[0] as { text: string }).text).toBe("라벨 오류: 알 수 없는 오류");
  });
});
