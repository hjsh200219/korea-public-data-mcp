import { describe, it, expect } from "vitest";
import {
  truncate,
  truncateWindow,
  errorResponse,
  MAX_CONTENT_LENGTH,
} from "./shared.js";

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

describe("truncateWindow", () => {
  it("offset=0_기본동작은_truncate와_동일한_window", () => {
    const long = "x".repeat(20000);
    const out = truncateWindow(long, { max: 8000, offset: 0 });
    expect(out.text.startsWith("x".repeat(8000))).toBe(true);
    expect(out.totalLength).toBe(20000);
    expect(out.windowEnd).toBe(8000);
    expect(out.hasMore).toBe(true);
  });

  it("offset>0_지정시_해당위치부터_max만큼_반환", () => {
    const long = "0123456789".repeat(2000); // 20000자
    const out = truncateWindow(long, { max: 100, offset: 50 });
    expect(out.text.startsWith(long.substring(50, 150))).toBe(true);
    expect(out.windowStart).toBe(50);
    expect(out.windowEnd).toBe(150);
    expect(out.hasMore).toBe(true);
  });

  it("마지막_window는_hasMore_false", () => {
    const text = "abc".repeat(100); // 300자
    const out = truncateWindow(text, { max: 100, offset: 200 });
    expect(out.text.length).toBe(100);
    expect(out.windowEnd).toBe(300);
    expect(out.hasMore).toBe(false);
  });

  it("offset이_total보다_크면_빈문자열_hasMore_false", () => {
    const text = "short";
    const out = truncateWindow(text, { max: 100, offset: 1000 });
    expect(out.text).toBe("");
    expect(out.hasMore).toBe(false);
  });

  it("음수_offset_과_max는_정규화", () => {
    const text = "abc".repeat(100);
    const out = truncateWindow(text, { max: -5, offset: -10 });
    expect(out.windowStart).toBe(0);
    expect(out.text.length).toBeGreaterThan(0);
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
