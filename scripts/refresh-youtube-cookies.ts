#!/usr/bin/env tsx
/**
 * YouTube 쿠키 갱신 스크립트
 * 사용법: npm run refresh:cookies -- --browser chrome
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFileSync, writeFileSync } from "node:fs";

const execFileAsync = promisify(execFile);

const NETSCAPE_HEADER = "# Netscape HTTP Cookie File\n";
const RAW_COOKIE_PATH = "/tmp/yt_raw_cookies.txt";
const FILTERED_COOKIE_PATH = "/tmp/yt_filtered.txt";
const ALLOWED_DOMAINS = [".youtube.com", ".google.com"];

// 20KB 경고 임계값
const WARN_SIZE_BYTES = 20 * 1024;

/** Netscape 쿠키 파일에서 허용된 도메인만 필터링 */
export function filterCookiesByDomain(raw: string): string {
  const lines = raw.split("\n");
  const filtered: string[] = [];

  for (const line of lines) {
    // 헤더, 빈 줄, 주석은 건너뜀
    if (line.startsWith("#") || line.trim() === "") {
      continue;
    }
    // 탭으로 구분된 Netscape 형식: domain, flag, path, secure, expiry, name, value
    const parts = line.split("\t");
    if (parts.length >= 7) {
      const domain = parts[0];
      if (ALLOWED_DOMAINS.some((allowed) => domain === allowed || domain.endsWith(allowed))) {
        filtered.push(line);
      }
    }
  }

  return filtered.join("\n");
}

/** Netscape 헤더 없으면 추가 */
export function ensureNetscapeHeader(content: string): string {
  if (content.startsWith(NETSCAPE_HEADER)) {
    return content;
  }
  return NETSCAPE_HEADER + content;
}

/** CLI 인자에서 --browser 값 파싱 */
function parseBrowserArg(): string {
  const args = process.argv.slice(2);
  const idx = args.indexOf("--browser");
  if (idx !== -1 && args[idx + 1]) {
    return args[idx + 1];
  }
  return "chrome";
}

async function main(): Promise<void> {
  const browser = parseBrowserArg();
  const validBrowsers = ["chrome", "firefox", "safari", "brave", "edge", "chromium"];
  if (!validBrowsers.includes(browser)) {
    console.error(`지원하지 않는 브라우저: ${browser}`);
    console.error(`지원 목록: ${validBrowsers.join(", ")}`);
    process.exit(1);
  }

  console.log(`브라우저 쿠키 추출 중: ${browser}`);

  // yt-dlp로 브라우저 쿠키 export
  try {
    await execFileAsync("yt-dlp", [
      "--cookies-from-browser", browser,
      "--cookies", RAW_COOKIE_PATH,
      "--skip-download",
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    ]);
  } catch (err) {
    console.error("yt-dlp 실행 실패:", err);
    process.exit(1);
  }

  // raw 파일 읽기
  let raw: string;
  try {
    raw = readFileSync(RAW_COOKIE_PATH, "utf8");
  } catch (err) {
    console.error(`쿠키 파일 읽기 실패: ${RAW_COOKIE_PATH}`, err);
    process.exit(1);
  }

  // 도메인 필터링
  const filtered = filterCookiesByDomain(raw);

  // Netscape 헤더 확인/추가
  const withHeader = ensureNetscapeHeader(filtered);

  // 필터링 결과를 /tmp/yt_filtered.txt에 저장
  writeFileSync(FILTERED_COOKIE_PATH, withHeader, "utf8");

  // 통계
  const lineCount = withHeader.split("\n").filter((l) => l.trim() !== "").length;
  const byteSize = Buffer.byteLength(withHeader, "utf8");
  const kbSize = (byteSize / 1024).toFixed(1);

  // 크기 경고
  if (byteSize > WARN_SIZE_BYTES) {
    console.warn(`[WARNING] 필터링된 쿠키 크기(${kbSize}KB)가 20KB를 초과합니다.`);
  }

  console.log(`\n쿠키 필터링 완료: ${lineCount}줄, ${kbSize}KB`);
  console.log("Railway 환경변수 업데이트 명령:");
  console.log(`   railway variables set YOUTUBE_COOKIES="$(cat ${FILTERED_COOKIE_PATH})"`);
}

main();
