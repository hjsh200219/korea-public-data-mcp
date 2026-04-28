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
    delete process.env.COURTLISTENER_API_TOKEN;
    delete process.env.OPENLEGALDATA_API_TOKEN;
    delete process.env.FOREIGN_CASE_ENABLED;
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
    expect(cfg.courtlistenerApiToken).toBeUndefined();
    expect(cfg.openLegalDataApiToken).toBeUndefined();
    expect(cfg.foreignCaseEnabled).toBeUndefined();
  });

  it("모든환경변수_매핑", () => {
    process.env.LAW_API_OC = "L1";
    process.env.DART_API_KEY = "D1";
    process.env.DATA20_SERVICE_KEY = "DATA";
    process.env.EXCHANGE_RATE_API_KEY = "EX";
    process.env.MAFRA_API_KEY = "M1";
    process.env.FINLIFE_API_KEY = "F1";
    process.env.COURTLISTENER_API_TOKEN = "CL_TOKEN";
    process.env.UNIPASS_KEY_API001 = "U1";
    process.env.UNIPASS_KEY_API002 = "U2";

    const cfg = loadConfig();

    expect(cfg.lawApiOc).toBe("L1");
    expect(cfg.dartApiKey).toBe("D1");
    expect(cfg.data20ServiceKey).toBe("DATA");
    expect(cfg.unipassApiKeys).toEqual({ "001": "U1", "002": "U2" });
    expect(cfg.eximApiKey).toBe("EX");
    expect(cfg.mafraApiKey).toBe("M1");
    expect(cfg.finlifeApiKey).toBe("F1");
  });

  it("해외판례_환경변수_매핑", () => {
    process.env.LAW_API_OC = "L";
    process.env.COURTLISTENER_API_TOKEN = "cl-token";
    process.env.OPENLEGALDATA_API_TOKEN = "old-token";
    process.env.FOREIGN_CASE_ENABLED = "true";

    const cfg = loadConfig();

    expect(cfg.courtlistenerApiToken).toBe("cl-token");
    expect(cfg.openLegalDataApiToken).toBe("old-token");
    expect(cfg.foreignCaseEnabled).toBe(true);
  });

  it("FOREIGN_CASE_ENABLED는_true문자열만_true_그외undefined", () => {
    process.env.LAW_API_OC = "L";
    process.env.FOREIGN_CASE_ENABLED = "false";

    const cfg = loadConfig();
    expect(cfg.foreignCaseEnabled).toBeUndefined();
  });

  it("해외판례_3변수_모두미설정시_비활성화경고1회", () => {
    process.env.LAW_API_OC = "L";
    delete process.env.COURTLISTENER_API_TOKEN;
    delete process.env.OPENLEGALDATA_API_TOKEN;
    delete process.env.FOREIGN_CASE_ENABLED;
    const warnSpy = vi.spyOn(console, "warn");

    const cfg = loadConfig();

    expect(cfg.courtlistenerApiToken).toBeUndefined();
    expect(cfg.openLegalDataApiToken).toBeUndefined();
    expect(cfg.foreignCaseEnabled).toBeUndefined();
    const warnMessages = warnSpy.mock.calls.map((c) => String(c[0]));
    const target = warnMessages.filter((m) =>
      m.includes("해외 판례 도구 비활성화"),
    );
    expect(target).toHaveLength(1);
  });

  it("해외판례_변수1개라도_설정시_경고미발생", () => {
    process.env.LAW_API_OC = "L";
    process.env.COURTLISTENER_API_TOKEN = "abc";
    delete process.env.OPENLEGALDATA_API_TOKEN;
    delete process.env.FOREIGN_CASE_ENABLED;
    const warnSpy = vi.spyOn(console, "warn");

    const cfg = loadConfig();

    expect(cfg.courtlistenerApiToken).toBe("abc");
    const warnMessages = warnSpy.mock.calls.map((c) => String(c[0]));
    expect(warnMessages.some((m) => m.includes("해외 판례 도구 비활성화"))).toBe(false);
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
