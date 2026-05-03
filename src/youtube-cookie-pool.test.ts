import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { TranscriptErrorCode } from "./youtube-types.js";

// 각 테스트에서 new YoutubeCookiePool() 직접 생성 (싱글톤 캡처 방지)
import { YoutubeCookiePool } from "./youtube-cookie-pool.js";

const NETSCAPE_HEADER = "# Netscape HTTP Cookie File\n";

/** 만료 타임스탬프가 포함된 Netscape 쿠키 라인 생성 (초 단위) */
function makeCookieLine(expirySeconds: number): string {
  return `.youtube.com\tTRUE\t/\tFALSE\t${expirySeconds}\tSID\tvalue`;
}

describe("YoutubeCookiePool", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  // ── 1. YOUTUBE_COOKIES_POOL JSON 배열 파싱 + round-robin ──

  describe("YOUTUBE_COOKIES_POOL round-robin", () => {
    it("JSON 배열 파싱 후 round-robin으로 쿠키 반환", () => {
      const cookie1 = "cookie-content-1";
      const cookie2 = "cookie-content-2";
      vi.stubEnv("YOUTUBE_COOKIES_POOL", JSON.stringify([cookie1, cookie2]));
      vi.stubEnv("YOUTUBE_COOKIES_FROM_BROWSER", "");

      const pool = new YoutubeCookiePool();

      const first = pool.nextCookie();
      const second = pool.nextCookie();
      const third = pool.nextCookie(); // 다시 첫 번째

      expect(first).toContain(cookie1);
      expect(second).toContain(cookie2);
      expect(third).toContain(cookie1);
    });

    it("쿠키에 Netscape 헤더 없으면 자동 추가", () => {
      const raw = ".youtube.com\tTRUE\t/\tFALSE\t0\tSID\tvalue";
      vi.stubEnv("YOUTUBE_COOKIES_POOL", JSON.stringify([raw]));
      vi.stubEnv("YOUTUBE_COOKIES_FROM_BROWSER", "");

      const pool = new YoutubeCookiePool();
      const cookie = pool.nextCookie();

      expect(cookie).toBe(NETSCAPE_HEADER + raw);
    });

    it("이미 헤더 있으면 중복 추가 안 함", () => {
      const withHeader = NETSCAPE_HEADER + ".youtube.com\tTRUE\t/\tFALSE\t0\tSID\tvalue";
      vi.stubEnv("YOUTUBE_COOKIES_POOL", JSON.stringify([withHeader]));
      vi.stubEnv("YOUTUBE_COOKIES_FROM_BROWSER", "");

      const pool = new YoutubeCookiePool();
      const cookie = pool.nextCookie();

      expect(cookie).toBe(withHeader);
      expect(cookie?.indexOf(NETSCAPE_HEADER)).toBe(0);
      // 헤더 중복 없음
      expect(cookie?.indexOf(NETSCAPE_HEADER, 1)).toBe(-1);
    });
  });

  // ── 2. YOUTUBE_COOKIES_POOL 미설정 시 YOUTUBE_COOKIES fallback (pool size=1) ──

  describe("YOUTUBE_COOKIES fallback", () => {
    it("YOUTUBE_COOKIES_POOL 없으면 YOUTUBE_COOKIES로 pool size=1 구성", () => {
      vi.stubEnv("YOUTUBE_COOKIES_FROM_BROWSER", "");
      vi.stubEnv("YOUTUBE_COOKIES", "# Netscape HTTP Cookie File\nfake-single-cookie");

      const pool = new YoutubeCookiePool();

      expect(pool.hasCookies).toBe(true);
      const cookie = pool.nextCookie();
      expect(cookie).toContain("fake-single-cookie");

      // 두 번 호출해도 같은 (유일한) 쿠키 반환
      const cookie2 = pool.nextCookie();
      expect(cookie2).toContain("fake-single-cookie");
    });

    it("YOUTUBE_COOKIES_POOL, YOUTUBE_COOKIES 모두 없으면 hasCookies=false, nextCookie=null", () => {
      vi.stubEnv("YOUTUBE_COOKIES_FROM_BROWSER", "");
      vi.stubEnv("YOUTUBE_COOKIES_POOL", "");
      vi.stubEnv("YOUTUBE_COOKIES", "");

      const pool = new YoutubeCookiePool();

      expect(pool.hasCookies).toBe(false);
      expect(pool.nextCookie()).toBeNull();
    });
  });

  // ── 3. 쿠키 실패 마킹 → 5분 skip → recovery ──

  describe("실패 마킹 및 recovery", () => {
    it("실패 마킹 후 5분 이내에는 해당 쿠키 skip", () => {
      const cookie1 = "cookie-1-content";
      const cookie2 = "cookie-2-content";
      vi.stubEnv("YOUTUBE_COOKIES_POOL", JSON.stringify([cookie1, cookie2]));
      vi.stubEnv("YOUTUBE_COOKIES_FROM_BROWSER", "");

      const pool = new YoutubeCookiePool();

      // 첫 번째 쿠키 가져오기
      const first = pool.nextCookie();
      expect(first).toContain(cookie1);

      // 첫 번째 쿠키 실패 마킹
      pool.markCurrentFailed(TranscriptErrorCode.COOKIE_EXPIRED);

      // 두 번째 요청: 실패된 cookie1 skip → cookie2 반환
      const second = pool.nextCookie();
      expect(second).toContain(cookie2);

      // 세 번째 요청도 cookie2 (cookie1은 여전히 실패 상태)
      // 아직 5분 미경과
      vi.advanceTimersByTime(4 * 60 * 1000);
      const third = pool.nextCookie();
      expect(third).toContain(cookie2);
    });

    it("5분 경과 후 실패한 쿠키가 recovery되어 다시 사용됨", () => {
      const cookie1 = "cookie-1-content";
      vi.stubEnv("YOUTUBE_COOKIES_POOL", JSON.stringify([cookie1]));
      vi.stubEnv("YOUTUBE_COOKIES_FROM_BROWSER", "");

      const pool = new YoutubeCookiePool();

      // 쿠키 가져오고 실패 마킹
      pool.nextCookie();
      pool.markCurrentFailed(TranscriptErrorCode.RATE_LIMITED);

      // 모든 쿠키 실패 → null
      expect(pool.nextCookie()).toBeNull();

      // 5분 경과
      vi.advanceTimersByTime(5 * 60 * 1000 + 1);

      // recovery 후 다시 반환
      const recovered = pool.nextCookie();
      expect(recovered).toContain(cookie1);
    });

    it("모든 쿠키 실패 시 nextCookie=null", () => {
      const cookie1 = "cookie-A";
      const cookie2 = "cookie-B";
      vi.stubEnv("YOUTUBE_COOKIES_POOL", JSON.stringify([cookie1, cookie2]));
      vi.stubEnv("YOUTUBE_COOKIES_FROM_BROWSER", "");

      const pool = new YoutubeCookiePool();

      // 두 쿠키 모두 실패 마킹
      pool.nextCookie();
      pool.markCurrentFailed(TranscriptErrorCode.COOKIE_EXPIRED);
      pool.nextCookie();
      pool.markCurrentFailed(TranscriptErrorCode.COOKIE_EXPIRED);

      expect(pool.nextCookie()).toBeNull();
    });
  });

  // ── 4. per-cookie 만료 파싱: Netscape 쿠키의 5번째 필드, 7일 이내면 경고 ──

  describe("만료 파싱 및 경고", () => {
    it("getHealthInfo()에서 7일 이내 만료 쿠키에 warning 반환", () => {
      const now = Date.now();
      // 3일 후 만료 (7일 이내)
      const expirySeconds = Math.floor((now + 3 * 24 * 60 * 60 * 1000) / 1000);
      const cookie = makeCookieLine(expirySeconds);

      vi.stubEnv("YOUTUBE_COOKIES_POOL", JSON.stringify([cookie]));
      vi.stubEnv("YOUTUBE_COOKIES_FROM_BROWSER", "");

      const pool = new YoutubeCookiePool();
      const health = pool.getHealthInfo();

      expect(health).toHaveLength(1);
      expect(health[0].warning).toBe("expires_soon");
    });

    it("7일 초과 만료 쿠키는 warning 없음", () => {
      const now = Date.now();
      // 10일 후 만료
      const expirySeconds = Math.floor((now + 10 * 24 * 60 * 60 * 1000) / 1000);
      const cookie = makeCookieLine(expirySeconds);

      vi.stubEnv("YOUTUBE_COOKIES_POOL", JSON.stringify([cookie]));
      vi.stubEnv("YOUTUBE_COOKIES_FROM_BROWSER", "");

      const pool = new YoutubeCookiePool();
      const health = pool.getHealthInfo();

      expect(health[0].warning).toBeUndefined();
    });

    it("만료 필드 0이거나 없으면 expiresIn 없음", () => {
      const cookie = ".youtube.com\tTRUE\t/\tFALSE\t0\tSID\tvalue"; // expiry=0
      vi.stubEnv("YOUTUBE_COOKIES_POOL", JSON.stringify([cookie]));
      vi.stubEnv("YOUTUBE_COOKIES_FROM_BROWSER", "");

      const pool = new YoutubeCookiePool();
      const health = pool.getHealthInfo();

      expect(health[0].expiresIn).toBeUndefined();
    });
  });

  // ── 5. 모든 쿠키가 같은 주(7일 이내) 만료 시 allExpiringSoon 경고 ──

  describe("allExpiringSoon 경고", () => {
    it("모든 쿠키가 7일 이내 만료 시 console.warn 호출", () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const now = Date.now();
      const expirySeconds = Math.floor((now + 2 * 24 * 60 * 60 * 1000) / 1000);
      const cookie1 = makeCookieLine(expirySeconds);
      const cookie2 = makeCookieLine(expirySeconds);

      vi.stubEnv("YOUTUBE_COOKIES_POOL", JSON.stringify([cookie1, cookie2]));
      vi.stubEnv("YOUTUBE_COOKIES_FROM_BROWSER", "");

      new YoutubeCookiePool();

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("7일 이내 만료"),
      );
      warnSpy.mockRestore();
    });

    it("일부 쿠키만 7일 이내 만료면 경고 없음", () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const now = Date.now();
      const soonExpiry = Math.floor((now + 2 * 24 * 60 * 60 * 1000) / 1000);
      const laterExpiry = Math.floor((now + 20 * 24 * 60 * 60 * 1000) / 1000);
      const cookie1 = makeCookieLine(soonExpiry);
      const cookie2 = makeCookieLine(laterExpiry);

      vi.stubEnv("YOUTUBE_COOKIES_POOL", JSON.stringify([cookie1, cookie2]));
      vi.stubEnv("YOUTUBE_COOKIES_FROM_BROWSER", "");

      new YoutubeCookiePool();

      expect(warnSpy).not.toHaveBeenCalled();
      warnSpy.mockRestore();
    });
  });

  // ── 6. JSON 파싱 실패 시 YOUTUBE_COOKIES fallback + 에러 로그 ──

  describe("JSON 파싱 실패 fallback", () => {
    it("YOUTUBE_COOKIES_POOL이 유효하지 않은 JSON이면 console.error 후 YOUTUBE_COOKIES fallback", () => {
      const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      vi.stubEnv("YOUTUBE_COOKIES_POOL", "this-is-not-json");
      vi.stubEnv("YOUTUBE_COOKIES", "# Netscape HTTP Cookie File\nfallback-cookie");
      vi.stubEnv("YOUTUBE_COOKIES_FROM_BROWSER", "");

      const pool = new YoutubeCookiePool();

      expect(errSpy).toHaveBeenCalledOnce();
      expect(pool.hasCookies).toBe(true);
      const cookie = pool.nextCookie();
      expect(cookie).toContain("fallback-cookie");

      errSpy.mockRestore();
    });

    it("YOUTUBE_COOKIES_POOL이 빈 배열이면 console.error 후 YOUTUBE_COOKIES fallback", () => {
      const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      vi.stubEnv("YOUTUBE_COOKIES_POOL", JSON.stringify([]));
      vi.stubEnv("YOUTUBE_COOKIES", "# Netscape HTTP Cookie File\nfallback-cookie");
      vi.stubEnv("YOUTUBE_COOKIES_FROM_BROWSER", "");

      const pool = new YoutubeCookiePool();

      expect(errSpy).toHaveBeenCalledOnce();
      expect(pool.nextCookie()).toContain("fallback-cookie");

      errSpy.mockRestore();
    });
  });

  // ── 7. YOUTUBE_COOKIES_FROM_BROWSER 설정 시 pool 무시 (browser 우선) ──

  describe("YOUTUBE_COOKIES_FROM_BROWSER 우선", () => {
    it("browserCookies 설정 시 hasCookies=true, browserCookies 반환", () => {
      vi.stubEnv("YOUTUBE_COOKIES_FROM_BROWSER", "chrome");
      vi.stubEnv("YOUTUBE_COOKIES_POOL", JSON.stringify(["some-pool-cookie"]));

      const pool = new YoutubeCookiePool();

      expect(pool.browserCookies).toBe("chrome");
      expect(pool.hasCookies).toBe(true);
    });

    it("YOUTUBE_COOKIES_FROM_BROWSER 없으면 browserCookies=undefined", () => {
      vi.stubEnv("YOUTUBE_COOKIES_FROM_BROWSER", "");
      vi.stubEnv("YOUTUBE_COOKIES", "some-cookie");

      const pool = new YoutubeCookiePool();

      expect(pool.browserCookies).toBeUndefined();
    });
  });
});
