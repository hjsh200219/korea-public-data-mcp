import { TranscriptErrorCode } from "./youtube-types.js";

type BreakerState = "closed" | "open" | "half-open";

const INFRA_ERRORS = new Set([
  TranscriptErrorCode.COOKIE_EXPIRED,
  TranscriptErrorCode.PO_TOKEN_REQUIRED,
  TranscriptErrorCode.RATE_LIMITED,
  TranscriptErrorCode.REGION_BLOCKED,
  TranscriptErrorCode.BOT_DETECTED,
]);

const OPEN_DURATION_MS = 60_000;

// 연속 인프라 실패가 이 값을 초과하면 open (7회 이상 실패 시)
const FAILURE_THRESHOLD = 6;

export class YoutubeCircuitBreaker {
  private _state: BreakerState = "closed";
  private _openedAt = 0;
  // 마지막 성공 이후 인프라 실패 횟수 (성공 시 리셋)
  private _failureCount = 0;
  private readonly _enabled: boolean;

  constructor() {
    this._enabled = process.env.YOUTUBE_CIRCUIT_BREAKER_ENABLED !== "false";
  }

  get state(): BreakerState {
    return this._state;
  }

  isOpen(): boolean {
    if (!this._enabled) return false;
    if (this._state === "open") {
      if (Date.now() - this._openedAt >= OPEN_DURATION_MS) {
        this._state = "half-open";
        return false;
      }
      return true;
    }
    return false;
  }

  recordSuccess(): void {
    if (!this._enabled) return;
    if (this._state === "half-open") {
      this._state = "closed";
      this._failureCount = 0;
      return;
    }
    // 성공 시 실패 카운터 리셋 (healthy 쿠키 성공 → 인프라 실패 카운터 초기화)
    this._failureCount = 0;
  }

  recordFailure(code: TranscriptErrorCode): void {
    if (!this._enabled) return;
    if (!INFRA_ERRORS.has(code)) return; // NO_SUBTITLES 등 무시

    if (this._state === "half-open") {
      this._state = "open";
      this._openedAt = Date.now();
      return;
    }

    this._failureCount++;
    if (this._failureCount > FAILURE_THRESHOLD) {
      this._state = "open";
      this._openedAt = Date.now();
    }
  }
}

// 글로벌 싱글톤 (getTranscript가 공유)
export const youtubeCircuitBreaker = new YoutubeCircuitBreaker();
