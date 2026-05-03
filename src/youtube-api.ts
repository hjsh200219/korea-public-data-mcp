/**
 * YouTube 자막 추출 + Data API v3 클라이언트
 * - yt-dlp subprocess: 자막 텍스트 추출 (API 키 불필요, 자동자막 지원)
 * - YouTube Data API v3: 메타데이터, 검색, 댓글 (API 키 필요)
 */

import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { TranscriptError, TranscriptErrorCode } from "./youtube-types.js";
import { youtubeCircuitBreaker } from "./youtube-circuit-breaker.js";
import { youtubeCookiePool } from "./youtube-cookie-pool.js";
import type {
  TranscriptResult, TranscriptSegment,
  VideoMetadata, SearchResult, SearchResultItem,
  CommentsResult, CommentItem,
} from "./youtube-types.js";

const execFileAsync = promisify(execFile);

const YT_API_BASE = "https://www.googleapis.com/youtube/v3";
const TIMEOUT_MS = 15000;

/**
 * YouTube URL 또는 ID에서 videoId 추출
 * 지원 형식: 전체 URL, 단축 URL, 순수 ID
 */
export function extractVideoId(input: string): string {
  const trimmed = input.trim();

  // youtu.be/VIDEO_ID
  const shortMatch = trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (shortMatch) return shortMatch[1];

  // youtube.com/watch?v=VIDEO_ID
  const longMatch = trimmed.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (longMatch) return longMatch[1];

  // youtube.com/embed/VIDEO_ID
  const embedMatch = trimmed.match(/\/embed\/([a-zA-Z0-9_-]{11})/);
  if (embedMatch) return embedMatch[1];

  // 순수 11자 ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;

  throw new Error(`유효한 YouTube URL 또는 ID가 아닙니다: ${input}`);
}

/** 밀리초 → "MM:SS" 포맷 */
function formatTimestamp(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

/** json3 자막 파일 이벤트 */
interface Json3Event {
  tStartMs: number;
  dDurationMs: number;
  segs?: { utf8: string; tOffsetMs?: number }[];
}

/**
 * yt-dlp json3 자막 파일 파싱 (순수 함수)
 */
export function parseJson3Subtitles(json3: string, lang: string): TranscriptSegment[] {
  const data = JSON.parse(json3) as { events?: Json3Event[] };
  const events = data.events ?? [];

  return events
    .filter((e) => Array.isArray(e.segs) && e.segs.length > 0)
    .map((e) => ({
      text: e.segs!.map((s) => s.utf8).join("").trim(),
      offset: e.tStartMs,
      duration: e.dDurationMs,
      lang,
    }))
    .filter((s) => s.text.length > 0);
}

// 언어 폴백 순서: 요청 언어 → en → en-US → ja → zh-Hans → zh-Hant
const FALLBACK_LANGS = ["en", "en-US", "en-GB", "ja", "zh-Hans", "zh-Hant", "zh-TW", "zh-CN"];

/** youtube-transcript-api가 반환하는 항목 형식 */
interface YtTranscriptEntry {
  text: string;
  start: number;   // seconds
  duration: number; // seconds
}

/**
 * python3 subprocess 실행 후 stdout 반환
 * execFile 콜백을 직접 사용해 테스트 mock과 호환
 * @internal visible for testing
 */
export function _runPython3(script: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      "python3", ["-c", script, ...args],
      { timeout: 30_000 },
      (err, stdout) => {
        if (err) { reject(err); return; }
        resolve(typeof stdout === "string" ? stdout : (stdout as Buffer).toString());
      },
    );
  });
}

/**
 * youtube-transcript-api Python 패키지로 자막 추출 (yt-dlp 봇 차단 시 fallback)
 * pip install youtube-transcript-api 필요
 */
export async function getTranscriptFallback(
  videoId: string,
  primaryLang: string,
): Promise<TranscriptResult> {
  const langsToTry = [primaryLang, ...FALLBACK_LANGS.filter((l) => l !== primaryLang)];

  const script = [
    "import json, sys",
    "from youtube_transcript_api import YouTubeTranscriptApi",
    "vid = sys.argv[1]",
    "langs = sys.argv[2:]",
    "try:",
    "    # v1.0+ 새 API (instance method)",
    "    if hasattr(YouTubeTranscriptApi, 'fetch'):",
    "        api = YouTubeTranscriptApi()",
    "        fetched = api.fetch(vid, languages=langs)",
    "        data = [{'text': s.text, 'start': s.start, 'duration': s.duration} for s in fetched]",
    "        lang = fetched.language_code if hasattr(fetched, 'language_code') else (langs[0] if langs else 'unknown')",
    "    else:",
    "        # v0.x 레거시 API (static method)",
    "        data = YouTubeTranscriptApi.get_transcript(vid, languages=langs)",
    "        lang = langs[0] if langs else 'unknown'",
    "    print(json.dumps({'ok': True, 'data': data, 'lang': lang}))",
    "except Exception as e:",
    "    print(json.dumps({'ok': False, 'error': f'{type(e).__name__}: {str(e)[:200]}'}))",
  ].join("\n");

  let stdout: string;
  try {
    stdout = await _runPython3(script, [videoId, ...langsToTry]);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if ((e as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error("youtube-transcript-api가 설치되어 있지 않습니다. 'pip install youtube-transcript-api'로 설치해주세요.", { cause: e });
    }
    throw new Error(`youtube-transcript-api 실행 실패: ${msg.slice(0, 300)}`, { cause: e });
  }

  let parsed: { ok: boolean; data?: YtTranscriptEntry[]; lang?: string; error?: string };
  try {
    parsed = JSON.parse(stdout.trim());
  } catch {
    throw new Error("youtube-transcript-api 응답 파싱 실패");
  }

  if (!parsed.ok || !parsed.data) {
    throw new TranscriptError(
      `자막을 찾을 수 없습니다. 자막이 비활성화되었거나 없는 영상입니다. (${parsed.error ?? "unknown"})`,
      TranscriptErrorCode.NO_SUBTITLES,
    );
  }

  const segments: TranscriptSegment[] = parsed.data
    .map((e) => ({
      text: e.text.trim(),
      offset: Math.round(e.start * 1000),
      duration: Math.round(e.duration * 1000),
      lang: parsed.lang ?? primaryLang,
    }))
    .filter((s) => s.text.length > 0);

  if (segments.length === 0) {
    throw new TranscriptError(
      "자막을 찾을 수 없습니다. 자막이 비활성화되었거나 없는 영상입니다.",
      TranscriptErrorCode.NO_SUBTITLES,
    );
  }

  return {
    videoId,
    segments,
    fullText: segments.map((s) => s.text).join(" "),
    language: parsed.lang ?? primaryLang,
    segmentCount: segments.length,
  };
}

/**
 * 단일 yt-dlp 시도. 성공 시 TranscriptResult, 실패(자막 파일 없음) 시 null.
 * 즉시 종료해야 하는 에러(yt-dlp 미설치 / 429 / 자막 비활성)는 throw.
 */
async function tryYtDlpClient(
  videoId: string,
  langsToTry: string[],
  subLangArg: string,
  playerClient: string,
  browserCookies: string | undefined,
  cookieFile: string | null,
  tmpDir: string,
): Promise<TranscriptResult | null> {
  const ytdlpArgs = [
    "--skip-download",
    "--write-sub",
    "--write-auto-sub",
    "--sub-lang", subLangArg,
    "--sub-format", "json3",
    "--extractor-args", `youtube:player_client=${playerClient}`,
    ...(browserCookies ? ["--cookies-from-browser", browserCookies] : []),
    ...(cookieFile ? ["--cookies", cookieFile] : []),
    "-o", join(tmpDir, "%(id)s"),
    "--", videoId,
  ];

  let ytdlpError: Error | null = null;
  try {
    await execFileAsync("yt-dlp", ytdlpArgs, { timeout: 30_000 });
  } catch (e) {
    if (!(e instanceof Error)) throw e;
    const msg = e.message;

    // 즉시 중단 조건: yt-dlp 미설치, 자막 비활성
    if ((e as NodeJS.ErrnoException).code === "ENOENT" && msg.includes("yt-dlp")) {
      throw new Error("yt-dlp가 설치되어 있지 않습니다. 'pip install yt-dlp' 또는 'brew install yt-dlp'로 설치해주세요.", { cause: e });
    }
    if (msg.includes("no subtitles") || msg.includes("Subtitles are disabled")) {
      throw new TranscriptError(
        "자막을 찾을 수 없습니다. 자막이 비활성화되었거나 없는 영상입니다.",
        TranscriptErrorCode.NO_SUBTITLES,
        e,
      );
    }
    // 429 / PO Token / DRM / 봇 감지 등: 이미 쓰인 파일이 있을 수 있으므로 읽기 먼저 시도
    ytdlpError = e;
  }

  // 요청 언어 우선, 없으면 폴백 언어 순서로 시도
  for (const tryLang of langsToTry) {
    try {
      const json3 = await readFile(join(tmpDir, `${videoId}.${tryLang}.json3`), "utf-8");
      const segments = parseJson3Subtitles(json3, tryLang);
      if (segments.length === 0) continue;
      return {
        videoId,
        segments,
        fullText: segments.map((s) => s.text).join(" "),
        language: tryLang,
        segmentCount: segments.length,
      };
    } catch {
      continue;
    }
  }

  // 파일도 없을 때 에러 분류
  if (ytdlpError) {
    const errMsg = ytdlpError.message;
    if (errMsg.includes("429")) {
      throw new TranscriptError(
        "YouTube 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.",
        TranscriptErrorCode.RATE_LIMITED,
        ytdlpError,
      );
    }
    if (errMsg.includes("PO Token")) {
      // PO Token 요구 → 다음 클라이언트로 (BOT_DETECTED로 분류하되 cascade 계속)
      return null;
    }
    if (errMsg.includes("Sign in") || errMsg.includes("cookie")) {
      // 쿠키 만료 → 다음 클라이언트로 cascade 계속
      return null;
    }
    if (errMsg.includes("not available in your country")) {
      throw new TranscriptError(
        "이 영상은 현재 지역에서 시청할 수 없습니다.",
        TranscriptErrorCode.REGION_BLOCKED,
        ytdlpError,
      );
    }
    // PO Token / DRM / 봇 감지 등 → 다음 클라이언트로
    return null;
  }

  // yt-dlp 성공했지만 자막 파일 0개 → 다음 클라이언트로
  return null;
}

/**
 * YouTube 영상 자막 추출 (yt-dlp subprocess)
 * 요청 언어 자막이 없으면 FALLBACK_LANGS 순서로 시도
 *
 * 봇 차단 우회 (우선순위 순):
 *   1. YOUTUBE_COOKIES_FROM_BROWSER=chrome|firefox|safari|brave|edge|chromium (선택적으로 ":프로파일")
 *      → 로컬 브라우저 쿠키 DB 직접 사용 (로컬 stdio 권장)
 *   2. YOUTUBE_COOKIES=<Netscape cookies.txt 내용>
 *      → 환경변수에 텍스트로 주입 (Railway 등 서버 배포 권장)
 *
 * 클라이언트 캐스케이드:
 *   - 쿠키 있음: tv → web (자동자막 PO Token 우회는 tv가 가장 안정적,
 *     단 tv는 일부 영상 DRM 표시로 실패할 수 있어 web fallback)
 *   - 쿠키 없음: android (자동자막 PO Token 우회 가능성, 본질적으로 한계 있음)
 *   - 모두 실패: youtube-transcript-api Python fallback
 */
export async function getTranscript(
  urlOrId: string,
  lang?: string,
): Promise<TranscriptResult> {
  // 서킷 브레이커 체크
  if (youtubeCircuitBreaker.isOpen()) {
    throw new TranscriptError(
      "YouTube 자막 추출 서비스가 일시적으로 차단되었습니다. 잠시 후 다시 시도해주세요.",
      TranscriptErrorCode.BOT_DETECTED,
    );
  }

  const videoId = extractVideoId(urlOrId);
  const primaryLang = lang ?? "ko";
  const langsToTry = [primaryLang, ...FALLBACK_LANGS.filter((l) => l !== primaryLang)];
  const subLangArg = langsToTry.join(",");
  const rootTmp = await mkdtemp(join(tmpdir(), "yt-sub-"));

  const browserCookies = process.env.YOUTUBE_COOKIES_FROM_BROWSER?.trim() || undefined;
  let cookieFile: string | null = null;
  // 쿠키 풀 또는 단일 쿠키 설정
  if (!browserCookies) {
    // YOUTUBE_COOKIES_POOL이 설정된 경우 풀에서 round-robin으로 쿠키 선택
    const poolEnv = process.env.YOUTUBE_COOKIES_POOL;
    if (poolEnv) {
      const cookieContent = youtubeCookiePool.nextCookie();
      if (cookieContent) {
        cookieFile = join(rootTmp, "cookies.txt");
        await writeFile(cookieFile, cookieContent, "utf-8");
      }
    } else {
      // 기존 단일 쿠키 fallback (YOUTUBE_COOKIES)
      const cookiesEnv = process.env.YOUTUBE_COOKIES;
      if (cookiesEnv) {
        cookieFile = join(rootTmp, "cookies.txt");
        const NETSCAPE_HEADER = "# Netscape HTTP Cookie File\n";
        const content = cookiesEnv.startsWith("#") ? cookiesEnv : NETSCAPE_HEADER + cookiesEnv;
        await writeFile(cookieFile, content, "utf-8");
      }
    }
  }
  const hasCookies = Boolean(browserCookies) || Boolean(cookieFile);
  const clients = hasCookies ? ["tv", "web"] : ["android"];

  try {
    for (const playerClient of clients) {
      // 시도마다 별도 디렉터리: 이전 시도 잔여 파일이 다음 시도 결과를 오염시키지 않도록
      const dir = await mkdtemp(join(rootTmp, "attempt-"));
      try {
        const result = await tryYtDlpClient(
          videoId, langsToTry, subLangArg,
          playerClient, browserCookies, cookieFile, dir,
        );
        if (result) {
          youtubeCircuitBreaker.recordSuccess();
          return result;
        }
      } catch (e) {
        if (e instanceof TranscriptError) {
          youtubeCircuitBreaker.recordFailure(e.code);
          // 쿠키 풀 사용 중이면 실패한 쿠키 마킹
          if (process.env.YOUTUBE_COOKIES_POOL && cookieFile) {
            youtubeCookiePool.markCurrentFailed(e.code);
          }
        }
        throw e;
      }
    }

    // 모든 yt-dlp 시도 실패 → Python fallback
    try {
      return await getTranscriptFallback(videoId, primaryLang);
    } catch (fallbackErr) {
      throw new TranscriptError(
        "자막을 찾을 수 없습니다. 자막이 비활성화되었거나 없는 영상입니다.",
        TranscriptErrorCode.NO_SUBTITLES,
        fallbackErr,
      );
    }
  } finally {
    await rm(rootTmp, { recursive: true, force: true }).catch(() => {});
  }
}

/**
 * 타임스탬프 포함 자막 포맷팅
 */
export function formatTranscriptWithTimestamps(
  segments: TranscriptSegment[],
): string {
  return segments
    .map((s) => `[${formatTimestamp(s.offset)}] ${s.text}`)
    .join("\n");
}

/**
 * 자막 텍스트 정리 (자동자막 필러/중복/비음성 태그 제거)
 */
export function cleanTranscriptText(text: string): string {
  let cleaned = text;

  // [Music], [Applause], [박수] 등 비음성 태그 제거
  cleaned = cleaned.replace(/\[[\w가-힣]+\]/g, "");

  // 영어 필러 제거 (단어 경계 기준)
  cleaned = cleaned.replace(/\b(um|uh|ah|er|hmm|huh)\b/gi, "");

  // 한국어 필러 제거 (공백으로 구분된 단독 필러)
  cleaned = cleaned.replace(/(?<=\s)(어|음|그|저|뭐)(?=\s)/g, "");

  // 연속 중복 문장 제거 (마침표 기준)
  cleaned = cleaned.replace(/([^.]+\.)\s*\1/g, "$1");

  // 다중 공백 → 단일 공백
  cleaned = cleaned.replace(/\s{2,}/g, " ");

  return cleaned.trim();
}

// ─── YouTube Data API v3 ───

/** Data API 응답 공통 구조 */
interface YtApiResponse {
  items?: Record<string, unknown>[];
  pageInfo?: { totalResults?: number };
}

/** ISO 8601 duration (PT1H2M3S) → 사람이 읽을 수 있는 형식 */
function parseDuration(iso: string): string {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return iso;
  const h = m[1] ? `${m[1]}시간 ` : "";
  const min = m[2] ? `${m[2]}분 ` : "";
  const sec = m[3] ? `${m[3]}초` : "";
  return (h + min + sec).trim() || "0초";
}

/** 중첩 객체에서 안전하게 값 추출 */
function pick(obj: Record<string, unknown>, key: string): unknown {
  return obj[key];
}

function pickStr(obj: Record<string, unknown>, key: string): string {
  return String(obj[key] ?? "");
}

function pickNum(obj: Record<string, unknown>, key: string): number {
  return Number(obj[key] ?? 0);
}

function pickObj(obj: Record<string, unknown>, key: string): Record<string, unknown> {
  return (obj[key] ?? {}) as Record<string, unknown>;
}

/** Data API 공통 fetch */
async function ytApiFetch(path: string, apiKey: string, params: Record<string, string>): Promise<YtApiResponse> {
  const qs = new URLSearchParams({ ...params, key: apiKey });
  const res = await fetch(`${YT_API_BASE}/${path}?${qs}`, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`YouTube API 오류 (${res.status}): ${body.slice(0, 200)}`);
  }
  return res.json() as Promise<YtApiResponse>;
}

/**
 * 영상 메타데이터 조회
 */
export async function getVideoMetadata(
  apiKey: string,
  urlOrId: string,
): Promise<VideoMetadata> {
  const videoId = extractVideoId(urlOrId);
  const data = await ytApiFetch("videos", apiKey, {
    part: "snippet,statistics,contentDetails",
    id: videoId,
  });

  const items = data.items;
  if (!items || items.length === 0) {
    throw new Error(`영상을 찾을 수 없습니다: ${videoId}`);
  }

  const item = items[0];
  const s = pickObj(item, "snippet");
  const st = pickObj(item, "statistics");
  const cd = pickObj(item, "contentDetails");
  const thumbnails = pickObj(s, "thumbnails");
  const highThumb = pickObj(thumbnails, "high");
  const defaultThumb = pickObj(thumbnails, "default");
  return {
    videoId,
    title: pickStr(s, "title"),
    description: pickStr(s, "description"),
    channelTitle: pickStr(s, "channelTitle"),
    channelId: pickStr(s, "channelId"),
    publishedAt: pickStr(s, "publishedAt"),
    tags: pick(s, "tags") as string[] | undefined,
    viewCount: pickNum(st, "viewCount"),
    likeCount: pickNum(st, "likeCount"),
    commentCount: pickNum(st, "commentCount"),
    duration: parseDuration(pickStr(cd, "duration")),
    thumbnailUrl: pickStr(highThumb, "url") || pickStr(defaultThumb, "url"),
  };
}

// ─── 채널 핸들 파싱 ───

/**
 * youtube.md 파일 내용에서 YouTube 채널 핸들 배열 추출
 * https://www.youtube.com/@HANDLE 형식의 URL에서 핸들(@ 제외) 파싱
 */
export function parseYoutubeMdChannels(content: string): string[] {
  const handles: string[] = [];
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    const match = trimmed.match(/youtube\.com\/@([\w-]+)/);
    if (match) handles.push(match[1]);
  }
  return handles;
}

// ─── 채널 ID 캐시 (24h TTL) ───

interface ChannelInfo {
  handle: string;
  channelId: string;
  title: string;
}

const CHANNEL_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const channelCache = new Map<string, { channelId: string; title: string; expiresAt: number }>();

export function _resetChannelCache(): void {
  channelCache.clear();
}

/**
 * 핸들 배열을 채널 ID로 변환 (캐시 24h)
 */
export async function resolveChannelHandles(
  apiKey: string,
  handles: string[],
): Promise<ChannelInfo[]> {
  const results: ChannelInfo[] = [];
  const now = Date.now();

  for (const handle of handles) {
    const cached = channelCache.get(handle);
    if (cached && cached.expiresAt > now) {
      results.push({ handle, channelId: cached.channelId, title: cached.title });
      continue;
    }

    const data = await ytApiFetch("channels", apiKey, {
      part: "id,snippet",
      forHandle: handle,
    });

    if (!data.items || data.items.length === 0) {
      console.warn(`[youtube] 핸들 '${handle}'에 해당하는 채널을 찾을 수 없습니다.`);
      continue;
    }

    const item = data.items[0];
    const channelId = String(item.id ?? "");
    const snippet = (item.snippet ?? {}) as Record<string, unknown>;
    const title = String(snippet.title ?? "");

    channelCache.set(handle, { channelId, title, expiresAt: now + CHANNEL_CACHE_TTL_MS });
    results.push({ handle, channelId, title });
  }

  return results;
}

/**
 * 채널의 최근 업로드 영상 목록 조회 (playlistItems.list)
 * uploadsPlaylistId = "UU" + channelId.slice(2)
 */
export async function getChannelVideos(
  apiKey: string,
  channelId: string,
  maxResults = 50,
): Promise<SearchResultItem[]> {
  const playlistId = "UU" + channelId.slice(2);
  const data = await ytApiFetch("playlistItems", apiKey, {
    part: "snippet",
    playlistId,
    maxResults: String(Math.min(maxResults, 50)),
  });

  return (data.items ?? []).map((item) => {
    const snippet = pickObj(item, "snippet");
    const resourceId = pickObj(snippet, "resourceId");
    const thumbnails = pickObj(snippet, "thumbnails");
    const highThumb = pickObj(thumbnails, "high");
    return {
      videoId: pickStr(resourceId, "videoId"),
      title: pickStr(snippet, "title"),
      description: pickStr(snippet, "description"),
      channelTitle: pickStr(snippet, "channelTitle"),
      publishedAt: pickStr(snippet, "publishedAt"),
      thumbnailUrl: pickStr(highThumb, "url"),
    };
  });
}

/**
 * 영상 검색
 */
export async function searchVideos(
  apiKey: string,
  query: string,
  opts?: { maxResults?: number; channelId?: string; order?: string },
): Promise<SearchResult> {
  const maxResults = opts?.maxResults ?? 5;
  const params: Record<string, string> = {
    part: "snippet",
    type: "video",
    q: query,
    maxResults: String(Math.min(maxResults, 20)),
  };
  if (opts?.channelId) params.channelId = opts.channelId;
  if (opts?.order) params.order = opts.order;

  const data = await ytApiFetch("search", apiKey, params);

  const items: SearchResultItem[] = (data.items ?? []).map((item) => {
    const id = pickObj(item, "id");
    const snippet = pickObj(item, "snippet");
    const thumbnails = pickObj(snippet, "thumbnails");
    const highThumb = pickObj(thumbnails, "high");
    return {
      videoId: pickStr(id, "videoId"),
      title: pickStr(snippet, "title"),
      description: pickStr(snippet, "description"),
      channelTitle: pickStr(snippet, "channelTitle"),
      publishedAt: pickStr(snippet, "publishedAt"),
      thumbnailUrl: pickStr(highThumb, "url"),
    };
  });

  return {
    query,
    totalResults: data.pageInfo?.totalResults ?? items.length,
    items,
  };
}

/**
 * 영상 댓글 조회
 */
export async function getVideoComments(
  apiKey: string,
  urlOrId: string,
  maxResults = 20,
): Promise<CommentsResult> {
  const videoId = extractVideoId(urlOrId);
  const data = await ytApiFetch("commentThreads", apiKey, {
    part: "snippet",
    videoId,
    maxResults: String(Math.min(maxResults, 100)),
    order: "relevance",
  });

  const items: CommentItem[] = (data.items ?? []).map((item) => {
    const threadSnippet = pickObj(item, "snippet");
    const topComment = pickObj(threadSnippet, "topLevelComment");
    const c = pickObj(topComment, "snippet");
    return {
      author: pickStr(c, "authorDisplayName"),
      text: pickStr(c, "textDisplay"),
      likeCount: pickNum(c, "likeCount"),
      publishedAt: pickStr(c, "publishedAt"),
    };
  });

  return {
    videoId,
    totalResults: data.pageInfo?.totalResults ?? items.length,
    items,
  };
}
