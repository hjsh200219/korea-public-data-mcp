#!/usr/bin/env tsx
/**
 * YouTube 쿠키 갱신 스크립트
 * 사용법: npm run refresh:cookies -- --browser chrome
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFileSync, writeFileSync, rmSync } from "node:fs";

const execFileAsync = promisify(execFile);

const NETSCAPE_HEADER = "# Netscape HTTP Cookie File\n";
const RAW_COOKIE_PATH = "/tmp/yt_raw_cookies.txt";
const FILTERED_COOKIE_PATH = "/tmp/yt_filtered.txt";
const ALLOWED_DOMAINS = [".youtube.com"];
// 쿠키 유효성 확인용 실요청 대상 (자막 있는 저트래픽 영상)
const PROBE_VIDEO_URL = "https://www.youtube.com/watch?v=jNQXAC9IVRw";

// 20KB 경고 임계값
const WARN_SIZE_BYTES = 20 * 1024;

// 인증(로그인) 쿠키 — 이게 없으면 transcript 추출 불가.
// 로그아웃/잘못된 프로필 추출 시 방문자 쿠키(PREF/YSC 등)만 잡혀 빈값 아님 → 업로드 차단용 가드.
export const REQUIRED_AUTH_COOKIES = ["LOGIN_INFO", "SAPISID", "__Secure-1PSID"];

/** 필터링된 Netscape 쿠키에서 누락된 필수 인증 쿠키 목록 반환 (빈 배열 = 정상) */
export function findMissingAuthCookies(filtered: string): string[] {
  const names = new Set<string>();
  for (const line of filtered.split("\n")) {
    if (line.startsWith("#") || line.trim() === "") {
      continue;
    }
    const parts = line.split("\t");
    if (parts.length >= 6 && parts[5]) {
      names.add(parts[5]);
    }
  }
  return REQUIRED_AUTH_COOKIES.filter((c) => !names.has(c));
}

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
  // yt-dlp 형식: BROWSER[+KEYRING][:PROFILE] (예: "chrome:Profile 4") — 브라우저명만 검증
  const browserName = browser.split(":")[0].split("+")[0];
  const validBrowsers = ["chrome", "firefox", "safari", "brave", "edge", "chromium"];
  if (!validBrowsers.includes(browserName)) {
    console.error(`지원하지 않는 브라우저: ${browserName}`);
    console.error(`지원 목록: ${validBrowsers.join(", ")}`);
    process.exit(1);
  }

  console.log(`브라우저 쿠키 추출 중: ${browser}`);

  // yt-dlp의 `--cookies`는 읽기 겸 쓰기 — 기존 파일이 있으면 그 쿠키를 쿠키 항아리에
  // 먼저 로드한 뒤 브라우저 쿠키와 병합한다. 직전 실행에서 남은 죽은 세션이 살아있는
  // 브라우저 쿠키를 덮어써 인증 쿠키가 통째로 빠지므로(재현: 파일 재사용 0/3 vs 새 파일 3/3)
  // 매 실행 전에 반드시 삭제한다.
  rmSync(RAW_COOKIE_PATH, { force: true });

  // yt-dlp로 브라우저 쿠키 export
  try {
    await execFileAsync("yt-dlp", [
      "--cookies-from-browser", browser,
      "--cookies", RAW_COOKIE_PATH,
      "--skip-download",
      // 세션 생사 판별용 실요청. dQw4w9WgXcQ는 봇 트래픽이 몰려 상시 429라 부적합.
      PROBE_VIDEO_URL,
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

  // 인증 쿠키 가드 — 로그아웃/잘못된 프로필(방문자 쿠키만) 업로드 차단
  const missing = findMissingAuthCookies(filtered);
  if (missing.length > 0) {
    console.error(`[FATAL] 인증 쿠키 누락: ${missing.join(", ")}`);
    console.error("크롬 프로필이 YouTube 로그아웃 상태이거나 잘못된 프로필을 읽음 → 업로드 중단.");
    console.error('해결: --browser "chrome:Profile N" 으로 로그인된 프로필 지정.');
    process.exit(1);
  }

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

// CLI로 직접 실행할 때만 main() 호출 (import 시 자동 실행 방지)
const isMain = process.argv[1]?.endsWith("refresh-youtube-cookies.ts") ||
  process.argv[1]?.endsWith("refresh-youtube-cookies.js");
if (isMain) {
  main();
}
