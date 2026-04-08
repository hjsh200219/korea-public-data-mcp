import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { loadConfig } from "./config.js";

describe("loadConfig", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it("LAW_API_OC_반환", () => {
    process.env.LAW_API_OC = "law-oc-value";
    process.env.DART_API_KEY = "";

    const cfg = loadConfig();
    expect(cfg.lawApiOc).toBe("law-oc-value");
  });

  it("선택키_미설정시_undefined", () => {
    process.env.LAW_API_OC = "required";
    delete process.env.DART_API_KEY;
    delete process.env.DATA20_SERVICE_KEY;
    delete process.env.EXCHANGE_RATE_API_KEY;
    delete process.env.MAFRA_API_KEY;
    delete process.env.FINLIFE_API_KEY;
    for (const k of Object.keys(process.env)) {
      if (k.startsWith("UNIPASS_KEY_API")) delete process.env[k];
    }

    const cfg = loadConfig();
    expect(cfg.dartApiKey).toBeUndefined();
    expect(cfg.data20ServiceKey).toBeUndefined();
    expect(cfg.unipassApiKeys).toBeUndefined();
    expect(cfg.eximApiKey).toBeUndefined();
    expect(cfg.mafraApiKey).toBeUndefined();
    expect(cfg.finlifeApiKey).toBeUndefined();
  });

  it("모든환경변수_매핑", () => {
    process.env.LAW_API_OC = "L1";
    process.env.DART_API_KEY = "D1";
    process.env.DATA20_SERVICE_KEY = "DATA";
    process.env.EXCHANGE_RATE_API_KEY = "EX";
    process.env.MAFRA_API_KEY = "M1";
    process.env.FINLIFE_API_KEY = "F1";
    process.env.UNIPASS_KEY_API001 = "U1";
    process.env.UNIPASS_KEY_API002 = "U2";

    const cfg = loadConfig();

    expect(cfg).toEqual({
      lawApiOc: "L1",
      dartApiKey: "D1",
      data20ServiceKey: "DATA",
      unipassApiKeys: { "001": "U1", "002": "U2" },
      eximApiKey: "EX",
      mafraApiKey: "M1",
      finlifeApiKey: "F1",
    });
  });

  it("빈문자열_선택키는_undefined로정규화", () => {
    process.env.LAW_API_OC = "L";
    process.env.DART_API_KEY = "";
    process.env.DATA20_SERVICE_KEY = "";

    const cfg = loadConfig();
    expect(cfg.dartApiKey).toBeUndefined();
    expect(cfg.data20ServiceKey).toBeUndefined();
  });

  it("LAW_API_OC_없으면_process_exit_호출", () => {
    delete process.env.LAW_API_OC;
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

    loadConfig();

    expect(exitSpy).toHaveBeenCalledWith(1);
    exitSpy.mockRestore();
  });
});
