/**
 * YouTube 쿠키 풀 (Cookie Pool)
 * - YOUTUBE_COOKIES_POOL: JSON 배열로 여러 쿠키 관리, round-robin 선택
 * - YOUTUBE_COOKIES: 단일 쿠키 fallback (pool size=1)
 * - YOUTUBE_COOKIES_FROM_BROWSER: browser 쿠키 우선 (pool 무시)
 */

import { TranscriptErrorCode } from "./youtube-types.js";

interface CookieEntry {
  content: string; // Netscape 형식 쿠키 문자열
  status: "healthy" | "failed";
  failedAt?: number; // timestamp
  expiresAt?: number; // 최소 만료 타임스탬프 (ms)
}

const RECOVERY_MS = 5 * 60 * 1000; // 5분
const EXPIRY_WARN_MS = 7 * 24 * 60 * 60 * 1000; // 7일
const NETSCAPE_HEADER = "# Netscape HTTP Cookie File\n";

/** Netscape 쿠키에서 최소 만료 타임스탬프 파싱 */
function parseMinExpiry(cookieContent: string): number | undefined {
  // Netscape 형식: domain flag path secure expiry name value
  // expiry는 5번째 필드 (0-indexed: 4)
  let minExpiry: number | undefined;
  for (const line of cookieContent.split("\n")) {
    if (line.startsWith("#") || !line.trim()) continue;
    const parts = line.split("\t");
    if (parts.length >= 5) {
      const expiry = parseInt(parts[4], 10);
      if (!isNaN(expiry) && expiry > 0) {
        const expiryMs = expiry * 1000;
        if (minExpiry === undefined || expiryMs < minExpiry) minExpiry = expiryMs;
      }
    }
  }
  return minExpiry;
}

export class YoutubeCookiePool {
  private _entries: CookieEntry[] = [];
  private _index = 0;
  private readonly _browserCookies: string | undefined;

  constructor() {
    this._browserCookies = process.env.YOUTUBE_COOKIES_FROM_BROWSER?.trim() || undefined;
    this._loadPool();
  }

  private _loadPool(): void {
    const poolEnv = process.env.YOUTUBE_COOKIES_POOL;
    const singleEnv = process.env.YOUTUBE_COOKIES;

    if (poolEnv) {
      try {
        const parsed = JSON.parse(poolEnv) as string[];
        if (!Array.isArray(parsed) || parsed.length === 0) throw new Error("empty");
        this._entries = parsed.map((c) => ({
          content: c.startsWith("#") ? c : NETSCAPE_HEADER + c,
          status: "healthy" as const,
          expiresAt: parseMinExpiry(c),
        }));
        // 모든 쿠키가 7일 이내 만료이면 경고
        this._checkAllExpiringSoon();
        return;
      } catch (e) {
        console.error("[CookiePool] YOUTUBE_COOKIES_POOL 파싱 실패, YOUTUBE_COOKIES fallback:", e);
      }
    }

    if (singleEnv) {
      const content = singleEnv.startsWith("#") ? singleEnv : NETSCAPE_HEADER + singleEnv;
      this._entries = [
        {
          content,
          status: "healthy" as const,
          expiresAt: parseMinExpiry(singleEnv),
        },
      ];
    }
  }

  private _checkAllExpiringSoon(): void {
    const now = Date.now();
    const allSoon = this._entries.every(
      (e) => e.expiresAt !== undefined && e.expiresAt - now < EXPIRY_WARN_MS,
    );
    if (allSoon && this._entries.length > 0) {
      console.warn("[CookiePool] 경고: 모든 쿠키가 7일 이내 만료됩니다. 쿠키를 갱신하세요.");
    }
  }

  /** 브라우저 쿠키 또는 풀 쿠키가 있으면 true */
  get hasCookies(): boolean {
    return Boolean(this._browserCookies) || this._entries.length > 0;
  }

  /** 브라우저 쿠키 (YOUTUBE_COOKIES_FROM_BROWSER) */
  get browserCookies(): string | undefined {
    return this._browserCookies;
  }

  /** 다음 사용 가능한 쿠키 내용 반환 (round-robin, 실패 쿠키 skip) */
  nextCookie(): string | null {
    if (this._entries.length === 0) return null;
    // 현재 인덱스부터 시작해서 healthy한 쿠키 찾기
    for (let i = 0; i < this._entries.length; i++) {
      const idx = (this._index + i) % this._entries.length;
      const entry = this._entries[idx];
      if (entry.status === "failed") {
        // 5분 지났으면 recovery 시도
        if (entry.failedAt !== undefined && Date.now() - entry.failedAt >= RECOVERY_MS) {
          entry.status = "healthy";
          entry.failedAt = undefined;
        }
      }
      if (entry.status === "healthy") {
        this._index = (idx + 1) % this._entries.length;
        return entry.content;
      }
    }
    return null; // 모든 쿠키 실패
  }

  /** 직전에 반환한 쿠키에 실패 마킹 */
  markCurrentFailed(_code: TranscriptErrorCode): void {
    const failIdx = (this._index - 1 + this._entries.length) % this._entries.length;
    const entry = this._entries[failIdx];
    if (entry) {
      entry.status = "failed";
      entry.failedAt = Date.now();
    }
  }

  /** 헬스 정보 반환 */
  getHealthInfo(): Array<{
    index: number;
    status: string;
    expiresIn?: string;
    warning?: string;
  }> {
    const now = Date.now();
    return this._entries.map((e, i) => {
      const info: { index: number; status: string; expiresIn?: string; warning?: string } = {
        index: i,
        status: e.status,
      };
      if (e.expiresAt) {
        const days = Math.floor((e.expiresAt - now) / (24 * 60 * 60 * 1000));
        info.expiresIn = `${days}d`;
        if (days <= 7) info.warning = "expires_soon";
      }
      return info;
    });
  }
}

export const youtubeCookiePool = new YoutubeCookiePool();
