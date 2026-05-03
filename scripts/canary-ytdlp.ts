#!/usr/bin/env tsx
/**
 * yt-dlp nightly canary: latest 버전으로 프로브 영상 자막 추출 시도
 * exit 0: 성공, exit 1: 실패
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const videoId = process.env["YOUTUBE_PROBE_VIDEO_ID"] ?? "jNQXAC9IVRw";

async function main(): Promise<void> {
  // 1. yt-dlp 버전 확인
  let version: string;
  try {
    const { stdout } = await execFileAsync("yt-dlp", ["--version"]);
    version = stdout.trim();
  } catch (err) {
    console.error("yt-dlp version check failed:", err);
    process.exit(1);
  }

  // 2. 프로브 영상에서 자막 추출 시도
  try {
    await execFileAsync("yt-dlp", [
      "--skip-download",
      "--write-auto-sub",
      "--sub-lang", "en",
      "--sub-format", "json3",
      "-o", "/tmp/canary-%(id)s",
      `https://www.youtube.com/watch?v=${videoId}`,
    ]);
  } catch (err) {
    const result = {
      success: false,
      version,
      videoId,
      timestamp: new Date().toISOString(),
      error: String(err),
    };
    console.log(JSON.stringify(result));
    process.exit(1);
  }

  const result = {
    success: true,
    version,
    videoId,
    timestamp: new Date().toISOString(),
  };
  console.log(JSON.stringify(result));
  process.exit(0);
}

main();
