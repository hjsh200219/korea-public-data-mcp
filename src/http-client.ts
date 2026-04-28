/**
 * 공유 HTTP 클라이언트 — fetch/retry/timeout/throttle 패턴 통합
 *
 * 각 API 클라이언트(law-api, dart-api, data20-api 등)가 개별 구현하던
 * fetch 래퍼를 단일 모듈로 통합하여 향후 점진적 마이그레이션에 사용.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FetchOptions {
  /** 요청 타임아웃 (ms). 기본 15000 */
  timeoutMs?: number;
  /** 최대 재시도 횟수 (0 = 재시도 없음). 기본 0 */
  maxRetries?: number;
  /** 첫 번째 재시도 대기 시간 (ms). 지수 백오프 적용. 기본 1000 */
  retryDelayMs?: number;
  /** 요청 간 최소 간격 (ms). 0이면 스로틀 없음. 기본 0 */
  throttleMs?: number;
  /** fetch에 전달할 RequestInit (method, headers, body 등). signal은 내부 관리. */
  init?: Omit<RequestInit, "signal">;
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_MAX_RETRIES = 0;
const DEFAULT_RETRY_DELAY_MS = 1_000;
const DEFAULT_THROTTLE_MS = 0;

const RETRYABLE_STATUS_CODES = new Set([429, 503]);

// ---------------------------------------------------------------------------
// Throttle state (모듈 레벨 — 인스턴스별 격리가 필요하면 클래스로 전환 가능)
// ---------------------------------------------------------------------------

let lastRequestTime = 0;

/** 테스트 등에서 모듈 상태를 초기화할 때 사용 */
export function resetThrottleState(): void {
  lastRequestTime = 0;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isRetryableError(err: unknown): boolean {
  if (err instanceof DOMException && err.name === "AbortError") return true;
  if (err instanceof TypeError) return true;
  return false;
}

async function applyThrottle(throttleMs: number): Promise<void> {
  if (throttleMs <= 0) return;
  const elapsed = Date.now() - lastRequestTime;
  if (elapsed < throttleMs) {
    await new Promise<void>((r) => setTimeout(r, throttleMs - elapsed));
  }
  lastRequestTime = Date.now();
}

function retryDelay(base: number, attempt: number): number {
  return base * Math.pow(2, attempt);
}

function sleep(ms: number): Promise<void> {
  return new Promise<void>((r) => setTimeout(r, ms));
}

/**
 * Retry-After 헤더(RFC 7231) 파싱 — delta-seconds 또는 HTTP-date 형식.
 * - 숫자 (초) → ms 환산
 * - HTTP-date → 현재 시각과 차이 ms
 * - 파싱 불가 → null
 */
function parseRetryAfter(value: string | null): number | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (trimmed === "") return null;

  // delta-seconds (정수)
  if (/^\d+$/.test(trimmed)) {
    return parseInt(trimmed, 10) * 1000;
  }

  // HTTP-date
  const dateMs = Date.parse(trimmed);
  if (!Number.isNaN(dateMs)) {
    const diff = dateMs - Date.now();
    return diff >= 0 ? diff : 0;
  }

  return null;
}

const RETRY_AFTER_MAX_MS = 60_000;

// ---------------------------------------------------------------------------
// fetchWithRetry
// ---------------------------------------------------------------------------

/**
 * timeout + 지수 백오프 재시도 + 스로틀을 지원하는 fetch 래퍼.
 *
 * - 429/503 응답 시 자동 재시도
 * - 네트워크 오류(TypeError) 및 타임아웃(AbortError) 시 자동 재시도
 * - 재시도 대기: `retryDelayMs * 2^attempt`
 * - 스로틀: 연속 요청 간 최소 `throttleMs` 간격 보장
 */
export async function fetchWithRetry(
  url: string,
  options?: FetchOptions,
): Promise<Response> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxRetries = options?.maxRetries ?? DEFAULT_MAX_RETRIES;
  const baseDelay = options?.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;
  const throttleMs = options?.throttleMs ?? DEFAULT_THROTTLE_MS;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    await applyThrottle(throttleMs);

    try {
      const response = await fetch(url, {
        ...options?.init,
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (RETRYABLE_STATUS_CODES.has(response.status) && attempt < maxRetries) {
        const backoff = retryDelay(baseDelay, attempt);

        // RFC 7231: Retry-After is a minimum wait the server requests.
        // Honor it (max), don't undercut (min). Upper bound applied via
        // the 60000ms clamp on headerValue.
        const headerRaw = response.headers.get("Retry-After");
        const headerParsed = parseRetryAfter(headerRaw);
        let delay = backoff;
        if (headerRaw !== null && headerParsed === null) {
          console.error(
            `Retry-After 헤더 파싱 실패 — exponential backoff fallback (value: "${headerRaw}")`,
          );
        } else if (headerParsed !== null) {
          const clampedHeader = Math.max(0, Math.min(headerParsed, RETRY_AFTER_MAX_MS));
          delay = Math.max(clampedHeader, backoff);
        }

        console.error(
          `HTTP ${response.status} — ${delay}ms 후 재시도 (${attempt + 1}/${maxRetries})`,
        );
        await sleep(delay);
        continue;
      }

      return response;
    } catch (err) {
      if (isRetryableError(err) && attempt < maxRetries) {
        const delay = retryDelay(baseDelay, attempt);
        console.error(
          `요청 실패 (${err instanceof Error ? err.message : String(err)}) — ${delay}ms 후 재시도 (${attempt + 1}/${maxRetries})`,
        );
        await sleep(delay);
        continue;
      }
      throw err;
    }
  }

  throw new Error("fetchWithRetry: 도달 불가 코드");
}
