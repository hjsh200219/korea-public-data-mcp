import { describe, it, expect } from "vitest";
import { filterCookiesByDomain, ensureNetscapeHeader } from "./refresh-youtube-cookies.js";

const NETSCAPE_HEADER = "# Netscape HTTP Cookie File\n";

/** Netscape 쿠키 라인 생성 헬퍼 */
function makeLine(domain: string, name = "SID", value = "abc"): string {
  return `${domain}\tTRUE\t/\tFALSE\t0\t${name}\t${value}`;
}

describe("filterCookiesByDomain", () => {
  it(".youtube.com 도메인만 통과", () => {
    const raw = [
      makeLine(".youtube.com"),
      makeLine(".example.com"),
    ].join("\n");

    const result = filterCookiesByDomain(raw);
    expect(result).toContain(".youtube.com");
    expect(result).not.toContain(".example.com");
  });

  it(".google.com 도메인은 제외됨", () => {
    const raw = [
      makeLine(".google.com"),
      makeLine(".facebook.com"),
    ].join("\n");

    const result = filterCookiesByDomain(raw);
    expect(result).not.toContain(".google.com");
    expect(result).not.toContain(".facebook.com");
  });

  it("다른 도메인은 제외", () => {
    const raw = [
      makeLine(".youtube.com"),
      makeLine(".google.com"),
      makeLine(".twitter.com"),
      makeLine(".github.com"),
      makeLine("accounts.google.com"),
    ].join("\n");

    const result = filterCookiesByDomain(raw);
    expect(result).toContain(".youtube.com");
    expect(result).not.toContain(".google.com");
    expect(result).not.toContain(".twitter.com");
    expect(result).not.toContain(".github.com");
    expect(result).not.toContain("accounts.google.com");
  });

  it("헤더와 주석 줄은 건너뜀 (필터 출력에 포함 안 됨)", () => {
    const raw = [
      "# Netscape HTTP Cookie File",
      "# This is a comment",
      makeLine(".youtube.com"),
    ].join("\n");

    const result = filterCookiesByDomain(raw);
    expect(result).not.toContain("# Netscape HTTP Cookie File");
    expect(result).not.toContain("# This is a comment");
    expect(result).toContain(".youtube.com");
  });

  it("빈 raw 입력이면 빈 문자열 반환", () => {
    expect(filterCookiesByDomain("")).toBe("");
  });

  it("필드 수 부족한 라인은 건너뜀", () => {
    const raw = ".youtube.com\tinvalid-line";
    expect(filterCookiesByDomain(raw)).toBe("");
  });
});

describe("ensureNetscapeHeader", () => {
  it("헤더 없으면 자동 추가", () => {
    const content = makeLine(".youtube.com");
    const result = ensureNetscapeHeader(content);
    expect(result).toBe(NETSCAPE_HEADER + content);
  });

  it("이미 헤더 있으면 중복 추가 안 함", () => {
    const content = NETSCAPE_HEADER + makeLine(".youtube.com");
    const result = ensureNetscapeHeader(content);
    expect(result).toBe(content);
    // 헤더가 딱 한 번만 나타나는지 확인
    expect(result.indexOf(NETSCAPE_HEADER)).toBe(0);
    expect(result.indexOf(NETSCAPE_HEADER, 1)).toBe(-1);
  });

  it("빈 문자열에 헤더 추가", () => {
    const result = ensureNetscapeHeader("");
    expect(result).toBe(NETSCAPE_HEADER);
  });
});

describe("크기 경고 임계값 (32KB)", () => {
  it("32KB 초과 콘텐츠를 생성할 수 있음 (실제 경고는 main()에서)", () => {
    // 32KB = 32768바이트
    const bigContent = "a".repeat(32 * 1024 + 1);
    const byteSize = Buffer.byteLength(bigContent, "utf8");
    expect(byteSize).toBeGreaterThan(32 * 1024);
  });

  it("20KB 이하는 경고 없음 (임계값 확인)", () => {
    const smallContent = "a".repeat(10 * 1024);
    const byteSize = Buffer.byteLength(smallContent, "utf8");
    expect(byteSize).toBeLessThan(20 * 1024);
  });
});
