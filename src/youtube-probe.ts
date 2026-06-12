import { execFile } from "node:child_process";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

interface ProbeResult {
  success: boolean;
  errorCode?: string;
  timestamp: number;
}

const PROBE_VIDEO_ID = process.env.YOUTUBE_PROBE_VIDEO_ID ?? "jNQXAC9IVRw"; // Me at the zoo
const PROBE_SUB_LANGS = process.env.YOUTUBE_PROBE_SUB_LANGS ?? "en,ko";
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
    // 실제 자막 추출(getTranscript)의 1순위 경로와 동일하게 헬스 체크한다:
    // android_vr 클라이언트로 자막 파일을 실제로 받아본다.
    // 왜 --dump-json이 아니라 자막 추출인가:
    //   - 쿠키없는 web --dump-json(이전 구현)은 video formats를 요구 → 데이터센터 IP에서
    //     항상 봇 차단("No title found in player responses")을 맞아 실제 도구는 멀쩡해도 down 오보.
    //   - android_vr는 자막 PO Token 미요구 + 쿠키 무관 동작이라 데이터센터 IP에서도 자막 추출 성공.
    //     (단 android_vr는 쿠키 미지원 — --cookies를 붙이면 "Skipping client" 로 클라이언트가 통째 스킵됨.
    //      그래서 쿠키는 주지 않는다.)
    const dir = await mkdtemp(join(tmpdir(), "yt-probe-"));
    try {
      await execFileAsync("yt-dlp", [
        "--skip-download",
        "--write-auto-subs",
        "--write-sub",
        "--sub-lang", PROBE_SUB_LANGS,
        "--sub-format", "json3",
        "--extractor-args", "youtube:player_client=android_vr",
        "-o", join(dir, "%(id)s"),
        "--", PROBE_VIDEO_ID,
      ], { timeout: 30000 });
      // yt-dlp가 exit 0이어도 자막 파일이 0개면 실패로 본다 (자막 추출이 핵심 기능).
      const files = await readdir(dir);
      if (files.some((f) => f.endsWith(".json3"))) {
        this._push({ success: true, timestamp: Date.now() });
      } else {
        this._push({ success: false, errorCode: "NO_SUBTITLE_FILE", timestamp: Date.now() });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this._push({ success: false, errorCode: msg.slice(0, 200), timestamp: Date.now() });
    } finally {
      await rm(dir, { recursive: true, force: true }).catch(() => {});
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
