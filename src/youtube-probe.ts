import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

interface ProbeResult {
  success: boolean;
  errorCode?: string;
  timestamp: number;
}

const PROBE_VIDEO_ID = process.env.YOUTUBE_PROBE_VIDEO_ID ?? "jNQXAC9IVRw"; // Me at the zoo
const PROBE_INTERVAL_MS = 5 * 60 * 1000; // 5분
const RING_BUFFER_SIZE = 100;

export class YoutubeProbe {
  private _results: ProbeResult[] = [];
  private _timer: ReturnType<typeof setInterval> | null = null;
  private _ytdlpVersion: string | null = null;

  get enabled(): boolean {
    return process.env.YOUTUBE_PROBE_ENABLED !== "false";
  }

  start(): void {
    if (!this.enabled || this._timer) return;
    void this._loadYtdlpVersion();
    this._timer = setInterval(() => void this._runProbe(), PROBE_INTERVAL_MS);
  }

  stop(): void {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
  }

  private async _loadYtdlpVersion(): Promise<void> {
    try {
      const { stdout } = await execFileAsync("yt-dlp", ["--version"], { timeout: 5000 });
      this._ytdlpVersion = stdout.trim();
    } catch {
      this._ytdlpVersion = "unknown";
    }
  }

  private async _runProbe(): Promise<void> {
    // 간단한 메타데이터 조회 (자막 추출 대신 --dump-json으로 빠르게)
    try {
      await execFileAsync("yt-dlp", ["--dump-json", "--", PROBE_VIDEO_ID], { timeout: 15000 });
      this._push({ success: true, timestamp: Date.now() });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this._push({ success: false, errorCode: msg.slice(0, 50), timestamp: Date.now() });
    }
    this._checkConsecutiveFailures();
  }

  private _push(result: ProbeResult): void {
    this._results.push(result);
    if (this._results.length > RING_BUFFER_SIZE) this._results.shift();
  }

  private _checkConsecutiveFailures(): void {
    const recent = this._results.slice(-3);
    if (recent.length === 3 && recent.every((r) => !r.success)) {
      console.error("[YoutubeProbe] YouTube 자막 서비스 연속 3회 실패. 점검이 필요합니다.");
    }
  }

  getHealthData(cookiePoolInfo: unknown, circuitBreakerState: string): object {
    const failures = this._results.filter((r) => !r.success).length;
    const lastSuccess = this._results.filter((r) => r.success).at(-1);
    const recent = this._results.slice(-3);
    let consec = 0;
    for (let i = recent.length - 1; i >= 0 && !recent[i].success; i--) consec++;

    let status: "healthy" | "degraded" | "down";
    if (this._results.length === 0) {
      status = "healthy";
    } else if (consec >= 3) {
      status = "down";
    } else if (failures > 0) {
      status = "degraded";
    } else {
      status = "healthy";
    }

    return {
      status,
      lastSuccess: lastSuccess ? new Date(lastSuccess.timestamp).toISOString() : null,
      consecutiveFailures: consec,
      lastErrorCode: this._results.at(-1)?.errorCode ?? null,
      cookiePool: cookiePoolInfo,
      ytdlpVersion: this._ytdlpVersion,
      circuitBreaker: circuitBreakerState,
    };
  }

  get ytdlpVersion(): string | null {
    return this._ytdlpVersion;
  }
}

// 글로벌 싱글톤
export const youtubeProbe = new YoutubeProbe();
