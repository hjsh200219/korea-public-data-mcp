import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createLogger } from "./logger.js";

describe("createLogger", () => {
  const original = process.env.NODE_ENV;

  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.env.NODE_ENV = original;
  });

  it("info_개발모드_humanReadable포맷", () => {
    const log = createLogger("test");
    log.info("hello");
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining("[INFO][test] hello"),
    );
  });

  it("error_consoleError로출력", () => {
    const log = createLogger("test");
    log.error("fail", { code: 500 });
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("[ERROR][test] fail"),
    );
  });

  it("warn_context포함출력", () => {
    const log = createLogger("api");
    log.warn("slow", { ms: 3000 });
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('"ms":3000'),
    );
  });

  it("debug_consoleWarn출력", () => {
    const log = createLogger("dbg");
    log.debug("trace");
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining("[DEBUG][dbg] trace"),
    );
  });

  it("context없으면_JSON없이출력", () => {
    const log = createLogger("t");
    log.info("simple");
    const call = (console.warn as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(call).toBe("[INFO][t] simple");
  });
});
