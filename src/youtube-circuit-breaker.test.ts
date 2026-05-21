import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { TranscriptErrorCode } from "./youtube-types.js";

// 서킷 브레이커 import (아직 없으므로 이 테스트는 실패함)
import { YoutubeCircuitBreaker } from "./youtube-circuit-breaker.js";

describe("YoutubeCircuitBreaker", () => {
  let breaker: YoutubeCircuitBreaker;

  beforeEach(() => {
    vi.useFakeTimers();
    breaker = new YoutubeCircuitBreaker();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("초기 상태: closed", () => {
    expect(breaker.state).toBe("closed");
    expect(breaker.isOpen()).toBe(false);
  });

  it("인프라 실패 60% 초과 시 open", () => {
    // trailing 10회 중 7회 실패 = 70% > 60% → open
    for (let i = 0; i < 3; i++) breaker.recordSuccess();
    for (let i = 0; i < 7; i++) breaker.recordFailure(TranscriptErrorCode.RATE_LIMITED);
    expect(breaker.state).toBe("open");
    expect(breaker.isOpen()).toBe(true);
  });

  it("NO_SUBTITLES 에러는 카운터 미증가", () => {
    for (let i = 0; i < 10; i++) breaker.recordFailure(TranscriptErrorCode.NO_SUBTITLES);
    expect(breaker.state).toBe("closed");
  });

  it("healthy 쿠키 성공 시 카운터 리셋", () => {
    for (let i = 0; i < 6; i++) breaker.recordFailure(TranscriptErrorCode.RATE_LIMITED);
    breaker.recordSuccess(); // healthy 쿠키 성공 → 리셋
    // 6회 실패였다가 성공으로 리셋 → 추가 실패 7회 필요 (10회 trailing 기준)
    for (let i = 0; i < 6; i++) breaker.recordFailure(TranscriptErrorCode.BOT_DETECTED);
    expect(breaker.state).toBe("closed"); // 리셋 후 6회 실패 = 60% → 미도달
  });

  it("open 상태에서 60초 후 half-open 전환", () => {
    for (let i = 0; i < 7; i++) breaker.recordFailure(TranscriptErrorCode.RATE_LIMITED);
    for (let i = 0; i < 3; i++) breaker.recordSuccess();
    // 확실히 open 만들기
    breaker["_state"] = "open";
    breaker["_openedAt"] = Date.now();
    expect(breaker.isOpen()).toBe(true);
    vi.advanceTimersByTime(60_000);
    expect(breaker.isOpen()).toBe(false); // half-open: 1회 허용
    expect(breaker.state).toBe("half-open");
  });

  it("half-open 성공 시 closed 복귀", () => {
    breaker["_state"] = "half-open";
    breaker.recordSuccess();
    expect(breaker.state).toBe("closed");
  });

  it("half-open 실패 시 다시 open", () => {
    breaker["_state"] = "half-open";
    breaker["_openedAt"] = Date.now();
    breaker.recordFailure(TranscriptErrorCode.COOKIE_EXPIRED);
    expect(breaker.state).toBe("open");
  });

  it("state getter는 isOpen() 호출 없이도 시간 경과 시 half-open 반영 (health endpoint stale 방지)", () => {
    // 시나리오: breaker가 open된 후 60초 경과. 운영자가 /health/youtube 조회 → state getter만 호출.
    // 기존 버그: isOpen()이 호출되지 않으면 _state는 "open"으로 정체 → 헬스 응답에 stale 노출.
    breaker["_state"] = "open";
    breaker["_openedAt"] = Date.now();
    expect(breaker.state).toBe("open");
    vi.advanceTimersByTime(60_000);
    // isOpen() 호출 없이 state getter만 조회
    expect(breaker.state).toBe("half-open");
  });

  it("state getter는 open 시간 미경과 시 open 유지", () => {
    breaker["_state"] = "open";
    breaker["_openedAt"] = Date.now();
    vi.advanceTimersByTime(30_000); // 60초 미만
    expect(breaker.state).toBe("open");
  });

  it("YOUTUBE_CIRCUIT_BREAKER_ENABLED=false 시 항상 closed", () => {
    vi.stubEnv("YOUTUBE_CIRCUIT_BREAKER_ENABLED", "false");
    const disabledBreaker = new YoutubeCircuitBreaker();
    for (let i = 0; i < 10; i++) disabledBreaker.recordFailure(TranscriptErrorCode.RATE_LIMITED);
    expect(disabledBreaker.isOpen()).toBe(false);
    vi.unstubAllEnvs();
  });
});
