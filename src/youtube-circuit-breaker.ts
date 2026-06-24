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

// 연속 인프라 실패가 이 값을 초과하면 open (4회째 실패 시)
// 데이터센터 IP 봇 차단은 시도당 ~8s 소요 — 임계값을 낮춰 502 무한 반복을 빠르게 차단한다.
const FAILURE_THRESHOLD = 3;

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
    // open 시간 경과 시 half-open으로 lazy 전환 — getter에서도 시간을 반영해
    // health endpoint(state 직접 조회)가 stale "open"을 노출하지 않도록 한다.
    if (this._state === "open" && Date.now() - this._openedAt >= OPEN_DURATION_MS) {
      this._state = "half-open";
    }
    return this._state;
  }

  isOpen(): boolean {
    if (!this._enabled) return false;
    // state getter가 시간 경과 시 half-open 전환을 수행하므로 결과를 그대로 사용
    return this.state === "open";
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

  /** 테스트 격리용 — 상태/카운터를 closed로 초기화 @internal */
  _reset(): void {
    this._state = "closed";
    this._openedAt = 0;
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
