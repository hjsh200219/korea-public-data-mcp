import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchWithRetry, resetThrottleState } from "./http-client.js";

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

const originalFetch = globalThis.fetch;

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  resetThrottleState();
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.useRealTimers();
});

function mockFetch(impl: typeof globalThis.fetch): void {
  globalThis.fetch = impl;
}

function okResponse(body = "ok"): Response {
  return new Response(body, { status: 200 });
}

function statusResponse(status: number): Response {
  return new Response(null, { status });
}

// ---------------------------------------------------------------------------
// 기본 동작
// ---------------------------------------------------------------------------

describe("fetchWithRetry 기본 동작", () => {
  it("정상응답_Response반환", async () => {
    mockFetch(async () => okResponse("hello"));

    const res = await fetchWithRetry("https://example.com");
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("hello");
  });

  it("4xx오류_재시도없이즉시반환", async () => {
    const fn = vi.fn(async () => statusResponse(404));
    mockFetch(fn);

    const res = await fetchWithRetry("https://example.com", { maxRetries: 2 });
    expect(res.status).toBe(404);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// 재시도
// ---------------------------------------------------------------------------

describe("fetchWithRetry 재시도", () => {
  it("429응답_지수백오프재시도후성공", async () => {
    let call = 0;
    mockFetch(async () => {
      call++;
      if (call <= 2) return statusResponse(429);
      return okResponse();
    });

    const res = await fetchWithRetry("https://example.com", {
      maxRetries: 3,
      retryDelayMs: 100,
    });

    expect(res.status).toBe(200);
    expect(call).toBe(3);
  });

  it("503응답_재시도소진시마지막응답반환", async () => {
    mockFetch(async () => statusResponse(503));

    const res = await fetchWithRetry("https://example.com", {
      maxRetries: 2,
      retryDelayMs: 50,
    });

    expect(res.status).toBe(503);
  });

  it("네트워크오류_재시도후성공", async () => {
    let call = 0;
    mockFetch(async () => {
      call++;
      if (call === 1) throw new TypeError("fetch failed");
      return okResponse();
    });

    const res = await fetchWithRetry("https://example.com", {
      maxRetries: 1,
      retryDelayMs: 50,
    });

    expect(res.status).toBe(200);
    expect(call).toBe(2);
  });

  it("네트워크오류_재시도소진시throw", async () => {
    mockFetch(async () => {
      throw new TypeError("fetch failed");
    });

    await expect(
      fetchWithRetry("https://example.com", { maxRetries: 1, retryDelayMs: 50 }),
    ).rejects.toThrow("fetch failed");
  });

  it("maxRetries_0이면재시도없음", async () => {
    const fn = vi.fn(async () => statusResponse(429));
    mockFetch(fn);

    const res = await fetchWithRetry("https://example.com", { maxRetries: 0 });
    expect(res.status).toBe(429);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// 지수 백오프 딜레이 검증
// ---------------------------------------------------------------------------

describe("fetchWithRetry 지수 백오프", () => {
  it("재시도딜레이_지수증가확인", async () => {
    vi.useRealTimers();
    resetThrottleState();

    const timestamps: number[] = [];
    let call = 0;

    mockFetch(async () => {
      timestamps.push(Date.now());
      call++;
      if (call <= 3) return statusResponse(429);
      return okResponse();
    });

    const res = await fetchWithRetry("https://example.com", {
      maxRetries: 3,
      retryDelayMs: 50,
    });

    expect(res.status).toBe(200);
    expect(timestamps).toHaveLength(4);

    const gap1 = timestamps[1] - timestamps[0];
    const gap2 = timestamps[2] - timestamps[1];
    const gap3 = timestamps[3] - timestamps[2];

    expect(gap1).toBeGreaterThanOrEqual(40);
    expect(gap2).toBeGreaterThanOrEqual(80);
    expect(gap3).toBeGreaterThanOrEqual(160);
  });
});

// ---------------------------------------------------------------------------
// 타임아웃
// ---------------------------------------------------------------------------

describe("fetchWithRetry 타임아웃", () => {
  it("타임아웃초과_AbortError재시도후throw", async () => {
    vi.useRealTimers();

    mockFetch(async (_url, init) => {
      const signal = (init as RequestInit).signal;
      return new Promise<Response>((_, reject) => {
        const id = setTimeout(() => reject(new DOMException("signal timed out", "AbortError")), 5);
        signal?.addEventListener("abort", () => {
          clearTimeout(id);
          reject(new DOMException("signal timed out", "AbortError"));
        });
      });
    });

    await expect(
      fetchWithRetry("https://example.com", {
        timeoutMs: 50,
        maxRetries: 1,
        retryDelayMs: 10,
      }),
    ).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// 스로틀
// ---------------------------------------------------------------------------

describe("fetchWithRetry 스로틀", () => {
  it("스로틀_연속요청간최소간격보장", async () => {
    vi.useRealTimers();
    resetThrottleState();

    mockFetch(async () => okResponse());

    const start = Date.now();
    await fetchWithRetry("https://example.com", { throttleMs: 100 });
    await fetchWithRetry("https://example.com", { throttleMs: 100 });
    const elapsed = Date.now() - start;

    expect(elapsed).toBeGreaterThanOrEqual(90);
  });

  it("스로틀0_지연없이즉시실행", async () => {
    vi.useRealTimers();
    resetThrottleState();

    mockFetch(async () => okResponse());

    const start = Date.now();
    await fetchWithRetry("https://example.com", { throttleMs: 0 });
    await fetchWithRetry("https://example.com", { throttleMs: 0 });
    const elapsed = Date.now() - start;

    expect(elapsed).toBeLessThan(50);
  });
});

// ---------------------------------------------------------------------------
// 기본값 확인
// ---------------------------------------------------------------------------

describe("fetchWithRetry 기본값", () => {
  it("옵션미지정시_기본값으로동작", async () => {
    mockFetch(async (_url, init) => {
      expect(init).toBeDefined();
      expect((init as RequestInit).signal).toBeDefined();
      return okResponse();
    });

    const res = await fetchWithRetry("https://example.com");
    expect(res.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// Retry-After 헤더 (RFC 7231) — delta-seconds + HTTP-date
// ---------------------------------------------------------------------------

describe("fetchWithRetry Retry-After 헤더", () => {
  it("Retry-After헤더_지정시간이상대기후재시도", async () => {
    vi.useRealTimers();
    resetThrottleState();

    const timestamps: number[] = [];
    let call = 0;
    mockFetch(async () => {
      timestamps.push(Date.now());
      call++;
      if (call === 1) {
        return new Response(null, {
          status: 429,
          headers: { "Retry-After": "1" },
        });
      }
      return okResponse();
    });

    const res = await fetchWithRetry("https://example.com", {
      maxRetries: 1,
      retryDelayMs: 50, // exponential backoff은 더 짧음
    });

    expect(res.status).toBe(200);
    expect(call).toBe(2);
    const gap = timestamps[1] - timestamps[0];
    // Retry-After: 1 (1000ms) > backoff(50ms) → max로 ≥1000ms 대기
    expect(gap).toBeGreaterThanOrEqual(900);
  });

  it("Retry-After없으면_지수백오프fallback", async () => {
    vi.useRealTimers();
    resetThrottleState();

    const timestamps: number[] = [];
    let call = 0;
    mockFetch(async () => {
      timestamps.push(Date.now());
      call++;
      if (call === 1) return statusResponse(429); // Retry-After 헤더 없음
      return okResponse();
    });

    const res = await fetchWithRetry("https://example.com", {
      maxRetries: 1,
      retryDelayMs: 100,
    });

    expect(res.status).toBe(200);
    const gap = timestamps[1] - timestamps[0];
    // 헤더 없음 → backoff(100ms) 그대로 대기, 5초 같은 큰 값 아님
    expect(gap).toBeGreaterThanOrEqual(80);
    expect(gap).toBeLessThan(500);
  });

  it("Retry-After_HTTPdate형식_파싱및대기", async () => {
    vi.useRealTimers();
    resetThrottleState();

    const timestamps: number[] = [];
    let call = 0;
    mockFetch(async () => {
      timestamps.push(Date.now());
      call++;
      if (call === 1) {
        // 2초 후 시각을 HTTP-date 형식으로 (RFC 1123).
        // toUTCString은 ms를 잘라내므로 1초 차이는 0~999ms 손실 가능 → 2초 사용.
        const future = new Date(Date.now() + 2000).toUTCString();
        return new Response(null, {
          status: 503,
          headers: { "Retry-After": future },
        });
      }
      return okResponse();
    });

    const res = await fetchWithRetry("https://example.com", {
      maxRetries: 1,
      retryDelayMs: 50,
    });

    expect(res.status).toBe(200);
    const gap = timestamps[1] - timestamps[0];
    expect(gap).toBeGreaterThanOrEqual(900);
  });

  it("Retry-After_파싱불가시_console.error_후_backoff", async () => {
    vi.useRealTimers();
    resetThrottleState();

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    let call = 0;
    mockFetch(async () => {
      call++;
      if (call === 1) {
        return new Response(null, {
          status: 429,
          headers: { "Retry-After": "garbage-value" },
        });
      }
      return okResponse();
    });

    const res = await fetchWithRetry("https://example.com", {
      maxRetries: 1,
      retryDelayMs: 50,
    });

    expect(res.status).toBe(200);
    const errorMessages = errorSpy.mock.calls.map((c) => String(c[0]));
    expect(errorMessages.some((m) => m.includes("Retry-After 헤더 파싱 실패"))).toBe(true);
    errorSpy.mockRestore();
  });
});
