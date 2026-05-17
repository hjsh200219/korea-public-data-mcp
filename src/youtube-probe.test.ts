import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// YoutubeProbe를 직접 테스트 — 싱글톤 대신 클래스를 export 해야 함
import { YoutubeProbe } from "./youtube-probe.js";

describe("YoutubeProbe", () => {
  let probe: YoutubeProbe;

  beforeEach(() => {
    vi.useFakeTimers();
    probe = new YoutubeProbe();
  });

  afterEach(() => {
    probe.stop();
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it("getHealthData() 반환 스키마: 필수 필드 존재", () => {
    const data = probe.getHealthData([], "closed") as Record<string, unknown>;
    expect(data).toHaveProperty("status");
    expect(data).toHaveProperty("lastSuccess");
    expect(data).toHaveProperty("consecutiveFailures");
    expect(data).toHaveProperty("lastErrorCode");
    expect(data).toHaveProperty("cookiePool");
    expect(data).toHaveProperty("ytdlpVersion");
    expect(data).toHaveProperty("circuitBreaker");
  });

  it("프로브 결과 없을 때 status = 'healthy'", () => {
    const data = probe.getHealthData([], "closed") as Record<string, unknown>;
    expect(data.status).toBe("healthy");
    expect(data.lastSuccess).toBeNull();
    expect(data.consecutiveFailures).toBe(0);
  });

  it("getHealthData()는 cookiePool/circuitBreaker를 그대로 반영", () => {
    const cookieInfo = [{ id: "cookie1" }];
    const data = probe.getHealthData(cookieInfo, "open") as Record<string, unknown>;
    expect(data.cookiePool).toEqual(cookieInfo);
    expect(data.circuitBreaker).toBe("open");
  });

  it("연속 3회 실패 시 console.error 호출", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // _push와 _checkConsecutiveFailures를 내부적으로 호출하는 private 메서드 접근
    // 실패 3개를 직접 주입
    for (let i = 0; i < 3; i++) {
      (probe as unknown as { _push: (r: unknown) => void })._push({
        success: false,
        errorCode: `ERR_${i}`,
        timestamp: Date.now(),
      });
    }
    (probe as unknown as { _checkConsecutiveFailures: () => void })._checkConsecutiveFailures();

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("YouTube 자막 서비스 연속 3회 실패"),
    );
    errorSpy.mockRestore();
  });

  it("YOUTUBE_PROBE_ENABLED=false 시 start() 후 타이머 미생성", () => {
    vi.stubEnv("YOUTUBE_PROBE_ENABLED", "false");
    const disabledProbe = new YoutubeProbe();
    expect(disabledProbe.enabled).toBe(false);
    disabledProbe.start();
    // enabled=false이면 _timer가 null 유지
    expect((disabledProbe as unknown as { _timer: unknown })._timer).toBeNull();
    disabledProbe.stop();
  });

  it("status: 3회 연속 실패 시 'down'", () => {
    for (let i = 0; i < 3; i++) {
      (probe as unknown as { _push: (r: unknown) => void })._push({
        success: false,
        errorCode: "RATE_LIMITED",
        timestamp: Date.now(),
      });
    }
    const data = probe.getHealthData([], "closed") as Record<string, unknown>;
    expect(data.status).toBe("down");
  });

  it("_runProbe 실패 시 errorCode 200자 슬라이스 (50자 truncate 회귀 방지)", async () => {
    const longMsg = "Command failed: yt-dlp --dump-json -- jNQXAC9IVRw\nERROR: [youtube] jNQXAC9IVRw: Sign in to confirm you're not a bot. Use --cookies-from-browser or --cookies for the authentication. See https://github.com/yt-dlp/yt-dlp/wiki/FAQ#how-do-i-pass-cookies-to-yt-dlp for how to manually pass cookies.";
    // _runProbe 안의 slice 길이를 정적으로 검증: 50자로 회귀하면 통과 안 함
    const probeSource = (await import("node:fs")).readFileSync(
      new URL("./youtube-probe.ts", import.meta.url),
      "utf-8",
    );
    expect(probeSource).toMatch(/msg\.slice\(0,\s*200\)/);

    // 추가: ring buffer가 200자급 메시지를 그대로 보존하는지 확인
    (probe as unknown as { _push: (r: unknown) => void })._push({
      success: false,
      errorCode: longMsg.slice(0, 200),
      timestamp: Date.now(),
    });
    const data = probe.getHealthData([], "closed") as Record<string, unknown>;
    const code = data.lastErrorCode as string;
    expect(code.length).toBeGreaterThan(50);
    expect(code).toContain("Sign in to confirm");
  });

  it("status: 실패 있지만 3회 미만이면 'degraded'", () => {
    (probe as unknown as { _push: (r: unknown) => void })._push({
      success: true,
      timestamp: Date.now(),
    });
    (probe as unknown as { _push: (r: unknown) => void })._push({
      success: false,
      errorCode: "ERR",
      timestamp: Date.now(),
    });
    const data = probe.getHealthData([], "closed") as Record<string, unknown>;
    expect(data.status).toBe("degraded");
  });
});
