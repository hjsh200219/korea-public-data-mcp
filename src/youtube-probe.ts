import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { getTranscript } from "./youtube-api.js";
import { TranscriptError } from "./youtube-types.js";

const execFileAsync = promisify(execFile);

interface ProbeResult {
  success: boolean;
  errorCode?: string;
  timestamp: number;
}

const PROBE_VIDEO_ID = process.env.YOUTUBE_PROBE_VIDEO_ID ?? "jNQXAC9IVRw"; // Me at the zoo
const PROBE_LANG = process.env.YOUTUBE_PROBE_LANG ?? "en"; // "Me at the zoo"는 en 자막 보유
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
    // 실제 도구(getTranscript)를 그대로 호출해 헬스 체크한다 — 프로브와 서빙 경로가
    // 100% 동일해야 "실제 tool 은 멀쩡한데 프로브만 down" 불일치가 안 생긴다.
    //
    // 왜 자체 yt-dlp 명령을 버렸나:
    //   - 이전 구현: 쿠키없는 web `--dump-json`. video formats를 요구 → 데이터센터 IP에서
    //     항상 봇 차단("No title found in player responses")을 맞아 실제 도구는 멀쩡해도 down 오보.
    //   - android_vr 단독 자막 추출도 부족: 실제 도구는 android_vr → tv → web(쿠키) 캐스케이드라
    //     android_vr가 데이터센터 IP에서 간헐 실패해도 폴백으로 살아남는다. 프로브가 android_vr
    //     단독이면 실제 도구는 성공하는데 프로브만 실패한다.
    //
    // 서킷 브레이커 결합: getTranscript 내부에서 success/failure가 기록된다. 흔한 프로브 실패
    // (BOT_DETECTED/PO_TOKEN/RATE_LIMITED)는 실유저도 똑같이 겪는 인프라 장애라 트립이 정상이고,
    // 프로브 성공은 half-open → close 회복 하트비트가 된다. (NO_SUBTITLES는 브레이커 트립 제외.)
    try {
      await getTranscript(PROBE_VIDEO_ID, PROBE_LANG);
      this._push({ success: true, timestamp: Date.now() });
    } catch (e) {
      const code = e instanceof TranscriptError
        ? e.code
        : e instanceof Error
          ? e.message
          : String(e);
      this._push({ success: false, errorCode: String(code).slice(0, 200), timestamp: Date.now() });
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
