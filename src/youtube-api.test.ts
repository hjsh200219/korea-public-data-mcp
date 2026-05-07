import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { extractVideoId, parseJson3Subtitles, formatTranscriptWithTimestamps, cleanTranscriptText } from "./youtube-api.js";
import { TranscriptError, TranscriptErrorCode } from "./youtube-types.js";

// ── extractVideoId (기존 로직, 변경 없음) ──

describe("extractVideoId", () => {
  it("표준 URL에서 ID 추출", () => {
    expect(extractVideoId("https://www.youtube.com/watch?v=gc297hx4F7o")).toBe("gc297hx4F7o");
  });

  it("단축 URL에서 ID 추출", () => {
    expect(extractVideoId("https://youtu.be/gc297hx4F7o")).toBe("gc297hx4F7o");
  });

  it("embed URL에서 ID 추출", () => {
    expect(extractVideoId("https://www.youtube.com/embed/gc297hx4F7o")).toBe("gc297hx4F7o");
  });

  it("순수 11자 ID 그대로 반환", () => {
    expect(extractVideoId("gc297hx4F7o")).toBe("gc297hx4F7o");
  });

  it("유효하지 않은 입력은 에러", () => {
    expect(() => extractVideoId("not-a-valid-id")).toThrow("유효한 YouTube URL");
  });
});

// ── parseJson3Subtitles (순수 함수) ──

describe("parseJson3Subtitles", () => {
  const sampleJson3 = {
    events: [
      // 첫 번째 이벤트: 윈도우 설정 (segs 없음 → 무시)
      { tStartMs: 0, dDurationMs: 275600, id: 1 },
      // 실제 자막 이벤트
      {
        tStartMs: 80,
        dDurationMs: 6799,
        wWinId: 1,
        segs: [
          { utf8: "Hello" },
          { utf8: " world", tOffsetMs: 500 },
        ],
      },
      {
        tStartMs: 7000,
        dDurationMs: 3000,
        wWinId: 1,
        segs: [
          { utf8: "Second line" },
        ],
      },
      // 빈 segs 이벤트 → 무시
      {
        tStartMs: 11000,
        dDurationMs: 1000,
        wWinId: 1,
        segs: [{ utf8: "\n" }],
      },
    ],
  };

  it("json3 이벤트에서 세그먼트 추출", () => {
    const segments = parseJson3Subtitles(JSON.stringify(sampleJson3), "en");
    expect(segments).toHaveLength(2);
  });

  it("세그먼트 텍스트를 하나로 합침", () => {
    const segments = parseJson3Subtitles(JSON.stringify(sampleJson3), "en");
    expect(segments[0].text).toBe("Hello world");
    expect(segments[1].text).toBe("Second line");
  });

  it("offset과 duration 매핑", () => {
    const segments = parseJson3Subtitles(JSON.stringify(sampleJson3), "en");
    expect(segments[0].offset).toBe(80);
    expect(segments[0].duration).toBe(6799);
    expect(segments[1].offset).toBe(7000);
    expect(segments[1].duration).toBe(3000);
  });

  it("lang 필드 설정", () => {
    const segments = parseJson3Subtitles(JSON.stringify(sampleJson3), "ko");
    expect(segments[0].lang).toBe("ko");
  });

  it("빈 events → 빈 배열 반환", () => {
    const empty = { events: [] };
    expect(parseJson3Subtitles(JSON.stringify(empty), "en")).toEqual([]);
  });

  it("유효하지 않은 JSON → 에러", () => {
    expect(() => parseJson3Subtitles("not json", "en")).toThrow();
  });
});

// ── cleanTranscriptText ──

describe("cleanTranscriptText", () => {
  it("연속 중복 문장 제거", () => {
    const result = cleanTranscriptText("Hello world. Hello world. Next sentence.");
    expect(result).toBe("Hello world. Next sentence.");
  });

  it("다중 공백을 단일 공백으로", () => {
    const result = cleanTranscriptText("Hello   world.   How  are   you?");
    expect(result).toBe("Hello world. How are you?");
  });

  it("자동자막 필러 제거 (영어)", () => {
    const result = cleanTranscriptText("So um the thing is uh that we need to uh do this");
    expect(result).not.toContain(" um ");
    expect(result).not.toContain(" uh ");
    expect(result).toContain("the thing is");
    expect(result).toContain("do this");
  });

  it("한국어 필러 제거", () => {
    const result = cleanTranscriptText("그래서 어 그게 음 뭐냐면 어 이렇게 하는 거예요");
    expect(result).not.toMatch(/\s어\s/);
    expect(result).not.toMatch(/\s음\s/);
    expect(result).toContain("그래서");
    expect(result).toContain("이렇게 하는 거예요");
  });

  it("앞뒤 공백 제거", () => {
    const result = cleanTranscriptText("  Hello world  ");
    expect(result).toBe("Hello world");
  });

  it("빈 문자열 처리", () => {
    expect(cleanTranscriptText("")).toBe("");
    expect(cleanTranscriptText("   ")).toBe("");
  });

  it("[음악], [박수] 등 비음성 태그 제거", () => {
    const result = cleanTranscriptText("Hello [Music] world [Applause] end");
    expect(result).toBe("Hello world end");
  });

  it("의미있는 내용은 보존", () => {
    const input = "Today we will discuss the architecture of modern systems and how they scale.";
    expect(cleanTranscriptText(input)).toBe(input);
  });
});

// ── formatTranscriptWithTimestamps ──

describe("formatTranscriptWithTimestamps", () => {
  it("타임스탬프 포맷팅", () => {
    const result = formatTranscriptWithTimestamps([
      { text: "Hello", offset: 0, duration: 1000 },
      { text: "World", offset: 65000, duration: 2000 },
    ]);
    expect(result).toBe("[00:00] Hello\n[01:05] World");
  });
});

// ── getTranscript (yt-dlp subprocess mock) ──

// child_process를 모킹하여 subprocess 호출 테스트
vi.mock("node:child_process", () => ({
  execFile: vi.fn(),
}));

// fs/promises 모킹
vi.mock("node:fs/promises", () => ({
  readFile: vi.fn(),
  rm: vi.fn(),
  mkdtemp: vi.fn(),
  writeFile: vi.fn(),
}));

import { execFile } from "node:child_process";
import { readFile, rm, mkdtemp, writeFile } from "node:fs/promises";
import { getTranscript } from "./youtube-api.js";

describe("getTranscript (yt-dlp)", () => {
  const mockJson3 = JSON.stringify({
    events: [
      { tStartMs: 0, dDurationMs: 100000, id: 1 },
      {
        tStartMs: 500,
        dDurationMs: 3000,
        wWinId: 1,
        segs: [{ utf8: "테스트 자막" }],
      },
    ],
  });

  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(mkdtemp).mockResolvedValue("/tmp/yt-sub-abc123");
    vi.mocked(rm).mockResolvedValue(undefined);
  });

  it("yt-dlp로 자막 추출 성공", async () => {
    // execFile 성공 시뮬레이션
    vi.mocked(execFile).mockImplementation((_cmd, _args, _opts, callback) => {
      // callback이 3번째 인자일 수도 있음
      const cb = typeof _opts === "function" ? _opts : callback;
      (cb as (err: Error | null, stdout: string, stderr: string) => void)(null, "", "");
      return {} as ReturnType<typeof execFile>;
    });

    // readFile: glob으로 찾을 json3 파일 내용 반환
    vi.mocked(readFile).mockResolvedValue(mockJson3);

    // glob을 위해 fs.readdir도 모킹 필요 → 대신 readFile이 직접 호출되도록 구현

    const result = await getTranscript("gc297hx4F7o", "ko");
    expect(result.videoId).toBe("gc297hx4F7o");
    expect(result.segments).toHaveLength(1);
    expect(result.segments[0].text).toBe("테스트 자막");
    expect(result.segmentCount).toBe(1);
  });

  it("yt-dlp 미설치 시 명확한 에러 메시지", async () => {
    const err = new Error("spawn yt-dlp ENOENT") as NodeJS.ErrnoException;
    err.code = "ENOENT";
    vi.mocked(execFile).mockImplementation((_cmd, _args, _opts, callback) => {
      const cb = typeof _opts === "function" ? _opts : callback;
      (cb as (err: Error | null, stdout: string, stderr: string) => void)(err, "", "");
      return {} as ReturnType<typeof execFile>;
    });

    await expect(getTranscript("gc297hx4F7o")).rejects.toThrow("yt-dlp가 설치되어 있지 않습니다");
  });

  it("429 레이트 리밋 시 한국어 에러 메시지", async () => {
    const err = new Error("Command failed: yt-dlp ... ERROR: HTTP Error 429: Too Many Requests");
    vi.mocked(execFile).mockImplementation((_cmd, _args, _opts, callback) => {
      const cb = typeof _opts === "function" ? _opts : callback;
      (cb as (err: Error | null, stdout: string, stderr: string) => void)(err, "", "");
      return {} as ReturnType<typeof execFile>;
    });

    await expect(getTranscript("gc297hx4F7o")).rejects.toThrow("YouTube 요청이 너무 많습니다");
  });

  it("자막 없는 영상 에러 (yt-dlp 파일 없음 + fallback도 실패)", async () => {
    // yt-dlp는 성공이지만 파일 없음, python3 fallback은 ok:false 반환
    vi.mocked(execFile).mockImplementation((_cmd, _args, _opts, callback) => {
      const cb = typeof _opts === "function" ? _opts : callback;
      if (_cmd === "yt-dlp") {
        (cb as (err: Error | null, stdout: string, stderr: string) => void)(null, "", "");
      } else {
        // python3 fallback: 자막 없음
        (cb as (err: Error | null, stdout: string) => void)(
          null,
          JSON.stringify({ ok: false, error: "No transcripts found" }),
        );
      }
      return {} as ReturnType<typeof execFile>;
    });
    vi.mocked(readFile).mockRejectedValue(
      Object.assign(new Error("ENOENT"), { code: "ENOENT" }),
    );

    await expect(getTranscript("gc297hx4F7o")).rejects.toThrow("자막을 찾을 수 없습니다");
  });

  it("한국어 자막 없을 때 영어 자막으로 폴백", async () => {
    const mockEnJson3 = JSON.stringify({
      events: [
        { tStartMs: 0, dDurationMs: 100000, id: 1 },
        {
          tStartMs: 500,
          dDurationMs: 3000,
          wWinId: 1,
          segs: [{ utf8: "English subtitle" }],
        },
      ],
    });

    vi.mocked(execFile).mockImplementation((_cmd, _args, _opts, callback) => {
      const cb = typeof _opts === "function" ? _opts : callback;
      (cb as (err: Error | null, stdout: string, stderr: string) => void)(null, "", "");
      return {} as ReturnType<typeof execFile>;
    });

    // ko는 없고 en만 있는 상황
    vi.mocked(readFile).mockImplementation((path) => {
      const p = String(path);
      if (p.endsWith(".en.json3")) {
        return Promise.resolve(mockEnJson3 as unknown as Buffer);
      }
      return Promise.reject(Object.assign(new Error("ENOENT"), { code: "ENOENT" }));
    });

    const result = await getTranscript("gc297hx4F7o", "ko");
    expect(result.language).toBe("en");
    expect(result.segments[0].text).toBe("English subtitle");
  });

  it("봇 감지 에러 시 youtube-transcript-api fallback 호출", async () => {
    const mockFallbackJson = JSON.stringify({
      ok: true,
      lang: "ko",
      data: [
        { text: "fallback 자막", start: 1.5, duration: 2.0 },
        { text: "두 번째 자막", start: 3.5, duration: 1.5 },
      ],
    });

    vi.mocked(execFile).mockImplementation((_cmd, _args, _opts, callback) => {
      const cb = typeof _opts === "function" ? _opts : callback;
      if (_cmd === "yt-dlp") {
        // yt-dlp: 봇 감지 에러
        const err = Object.assign(new Error("Sign in to confirm you're not a bot"), { code: "1" });
        (cb as (err: Error | null, stdout: string, stderr: string) => void)(err, "", "");
      } else {
        // python3: fallback 성공
        (cb as (err: Error | null, stdout: string) => void)(null, mockFallbackJson);
      }
      return {} as ReturnType<typeof execFile>;
    });

    const result = await getTranscript("gc297hx4F7o", "ko");
    expect(result.language).toBe("ko");
    expect(result.segments).toHaveLength(2);
    expect(result.segments[0].text).toBe("fallback 자막");
    expect(result.segments[0].offset).toBe(1500);
    expect(result.segments[0].duration).toBe(2000);
    expect(result.segmentCount).toBe(2);
  });

  // ── 클라이언트 폴백 캐스케이드 + 쿠키 분기 ──

  /**
   * 캡처된 yt-dlp 호출 + readFile 시퀀스 헬퍼
   * - allCalls: yt-dlp가 호출될 때마다 args 누적
   * - readFileResolvers: yt-dlp 호출 N번째 시도에서 readFile이 어떻게 동작할지 결정
   *   (true → mockJson3 반환, false → ENOENT)
   */
  function setupClientCascade(readFileSuccessOnAttempt: number | "all" | "never") {
    const allCalls: string[][] = [];
    let attempt = 0;

    vi.mocked(execFile).mockImplementation((_cmd, args, _opts, callback) => {
      const cb = typeof _opts === "function" ? _opts : callback;
      if (_cmd === "yt-dlp") {
        allCalls.push(args as string[]);
        attempt += 1;
      }
      (cb as (err: Error | null, stdout: string, stderr: string) => void)(null, "", "");
      return {} as ReturnType<typeof execFile>;
    });

    vi.mocked(readFile).mockImplementation(() => {
      const succeed =
        readFileSuccessOnAttempt === "all"
          ? true
          : readFileSuccessOnAttempt === "never"
          ? false
          : attempt === readFileSuccessOnAttempt;
      return succeed
        ? Promise.resolve(mockJson3 as unknown as Buffer)
        : Promise.reject(Object.assign(new Error("ENOENT"), { code: "ENOENT" }));
    });

    return { allCalls };
  }

  it("쿠키 있을 때 첫 시도는 android_vr 클라이언트 (자막 PO Token 우회 1순위)", async () => {
    vi.stubEnv("YOUTUBE_COOKIES_FROM_BROWSER", "chrome");
    vi.stubEnv("YOUTUBE_COOKIES", "");

    const { allCalls } = setupClientCascade(1);

    await getTranscript("gc297hx4F7o", "ko");

    expect(allCalls[0]).toContain("youtube:player_client=android_vr");
    expect(allCalls[0]).toContain("--cookies-from-browser");
    expect(allCalls[0]).not.toContain("--cookies");

    vi.unstubAllEnvs();
  });

  it("쿠키 있고 android_vr 실패 시 tv → web 순서로 fallback", async () => {
    vi.stubEnv("YOUTUBE_COOKIES_FROM_BROWSER", "chrome");

    const { allCalls } = setupClientCascade(3);

    await getTranscript("gc297hx4F7o", "ko");

    expect(allCalls).toHaveLength(3);
    expect(allCalls[0]).toContain("youtube:player_client=android_vr");
    expect(allCalls[1]).toContain("youtube:player_client=tv");
    expect(allCalls[2]).toContain("youtube:player_client=web");
    expect(allCalls[2]).toContain("--cookies-from-browser");

    vi.unstubAllEnvs();
  });

  it("브라우저 + 프로파일 형식(chrome:Default) 그대로 전달", async () => {
    vi.stubEnv("YOUTUBE_COOKIES_FROM_BROWSER", "chrome:Default");

    const { allCalls } = setupClientCascade(1);

    await getTranscript("gc297hx4F7o", "ko");

    const args = allCalls[0];
    const idx = args.indexOf("--cookies-from-browser");
    expect(args[idx + 1]).toBe("chrome:Default");

    vi.unstubAllEnvs();
  });

  it("YOUTUBE_COOKIES에 Netscape 헤더 없으면 자동 추가", async () => {
    vi.stubEnv("YOUTUBE_COOKIES_FROM_BROWSER", "");
    vi.stubEnv("YOUTUBE_COOKIES", ".youtube.com\tTRUE\t/\tFALSE\t0\ttest\tvalue");

    const { allCalls } = setupClientCascade(1);
    vi.mocked(writeFile).mockResolvedValue(undefined);

    await getTranscript("gc297hx4F7o", "ko");

    const writeCalls = vi.mocked(writeFile).mock.calls;
    const cookieWriteCall = writeCalls.find((c) => String(c[0]).endsWith("cookies.txt"));
    expect(cookieWriteCall).toBeDefined();
    const written = String(cookieWriteCall![1]);
    expect(written.startsWith("# Netscape HTTP Cookie File\n")).toBe(true);
    expect(written).toContain(".youtube.com");

    vi.unstubAllEnvs();
  });

  it("yt-dlp 인자에 --write-auto-subs 포함 (자동자막 추출 가능)", async () => {
    vi.stubEnv("YOUTUBE_COOKIES_FROM_BROWSER", "");
    vi.stubEnv("YOUTUBE_COOKIES", "");

    const { allCalls } = setupClientCascade(1);

    await getTranscript("gc297hx4F7o", "ko");

    expect(allCalls[0]).toContain("--write-auto-subs");
    expect(allCalls[0]).not.toContain("--write-auto-sub");

    vi.unstubAllEnvs();
  });

  it("YOUTUBE_COOKIES (파일 쿠키)도 android_vr → tv → web 캐스케이드 사용", async () => {
    vi.stubEnv("YOUTUBE_COOKIES_FROM_BROWSER", "");
    vi.stubEnv("YOUTUBE_COOKIES", "# Netscape HTTP Cookie File\nfake");

    const { allCalls } = setupClientCascade(3);

    await getTranscript("gc297hx4F7o", "ko");

    expect(allCalls).toHaveLength(3);
    expect(allCalls[0]).toContain("youtube:player_client=android_vr");
    expect(allCalls[0]).toContain("--cookies");
    expect(allCalls[0]).not.toContain("--cookies-from-browser");
    expect(allCalls[1]).toContain("youtube:player_client=tv");
    expect(allCalls[2]).toContain("youtube:player_client=web");

    vi.unstubAllEnvs();
  });

  it("YOUTUBE_COOKIES_FROM_BROWSER가 YOUTUBE_COOKIES보다 우선", async () => {
    vi.stubEnv("YOUTUBE_COOKIES_FROM_BROWSER", "firefox");
    vi.stubEnv("YOUTUBE_COOKIES", "# Netscape HTTP Cookie File\nfake");

    const { allCalls } = setupClientCascade(1);

    await getTranscript("gc297hx4F7o", "ko");

    expect(allCalls[0]).toContain("--cookies-from-browser");
    expect(allCalls[0]).not.toContain("--cookies");

    vi.unstubAllEnvs();
  });

  it("쿠키 환경변수 없을 때는 android_vr → android 캐스케이드 (자막 PO Token 우회)", async () => {
    vi.stubEnv("YOUTUBE_COOKIES_FROM_BROWSER", "");
    vi.stubEnv("YOUTUBE_COOKIES", "");

    const { allCalls } = setupClientCascade(1);

    await getTranscript("gc297hx4F7o", "ko");

    // 첫 시도가 android_vr이고 성공하면 안드로이드 시도 없이 종료
    expect(allCalls).toHaveLength(1);
    expect(allCalls[0]).toContain("youtube:player_client=android_vr");
    expect(allCalls[0]).not.toContain("--cookies-from-browser");
    expect(allCalls[0]).not.toContain("--cookies");

    vi.unstubAllEnvs();
  });

  it("쿠키 없음 + android_vr 실패 시 android로 fallback", async () => {
    vi.stubEnv("YOUTUBE_COOKIES_FROM_BROWSER", "");
    vi.stubEnv("YOUTUBE_COOKIES", "");

    const { allCalls } = setupClientCascade(2);

    await getTranscript("gc297hx4F7o", "ko");

    expect(allCalls).toHaveLength(2);
    expect(allCalls[0]).toContain("youtube:player_client=android_vr");
    expect(allCalls[1]).toContain("youtube:player_client=android");

    vi.unstubAllEnvs();
  });

  it("모든 yt-dlp 클라이언트 실패 시 youtube-transcript-api fallback 호출", async () => {
    vi.stubEnv("YOUTUBE_COOKIES_FROM_BROWSER", "chrome");

    const allCalls: string[][] = [];
    const mockFallbackJson = JSON.stringify({
      ok: true,
      lang: "ko",
      data: [{ text: "py fallback", start: 1.0, duration: 2.0 }],
    });

    vi.mocked(execFile).mockImplementation((_cmd, args, _opts, callback) => {
      const cb = typeof _opts === "function" ? _opts : callback;
      if (_cmd === "yt-dlp") {
        allCalls.push(args as string[]);
        (cb as (err: Error | null, stdout: string, stderr: string) => void)(null, "", "");
      } else {
        // python3 fallback
        (cb as (err: Error | null, stdout: string) => void)(null, mockFallbackJson);
      }
      return {} as ReturnType<typeof execFile>;
    });
    // 모든 readFile은 ENOENT → 모든 yt-dlp 시도가 "파일 없음"으로 실패
    vi.mocked(readFile).mockRejectedValue(
      Object.assign(new Error("ENOENT"), { code: "ENOENT" }),
    );

    const result = await getTranscript("gc297hx4F7o", "ko");

    expect(allCalls.length).toBeGreaterThanOrEqual(3); // android_vr + tv + web
    expect(allCalls[0]).toContain("youtube:player_client=android_vr");
    expect(result.segments[0].text).toBe("py fallback");

    vi.unstubAllEnvs();
  });

  it("429 에러 발생해도 이미 쓰인 자막 파일이 있으면 반환", async () => {
    // 실제 재현 케이스: en 자막은 성공, ja 자막 요청 중 429 발생 → yt-dlp exit 1
    const mockEnJson3 = JSON.stringify({
      events: [
        { tStartMs: 0, dDurationMs: 100000, id: 1 },
        {
          tStartMs: 500,
          dDurationMs: 3000,
          wWinId: 1,
          segs: [{ utf8: "Partial success subtitle" }],
        },
      ],
    });

    const err = new Error(
      "Command failed: yt-dlp ... ERROR: Unable to download video subtitles for 'ja': HTTP Error 429: Too Many Requests",
    );
    vi.mocked(execFile).mockImplementation((_cmd, _args, _opts, callback) => {
      const cb = typeof _opts === "function" ? _opts : callback;
      // yt-dlp: 429 에러로 exit 1 (en은 이미 다운로드 완료된 상태)
      (cb as (err: Error | null, stdout: string, stderr: string) => void)(err, "", "");
      return {} as ReturnType<typeof execFile>;
    });

    // en 파일은 존재, 나머지는 ENOENT
    vi.mocked(readFile).mockImplementation(((path: unknown) => {
      const p = String(path);
      if (p.endsWith(".en.json3")) return Promise.resolve(mockEnJson3);
      return Promise.reject(Object.assign(new Error("ENOENT"), { code: "ENOENT" }));
    }) as typeof readFile);

    const result = await getTranscript("iuYlGRnC7J8", "en");
    expect(result.videoId).toBe("iuYlGRnC7J8");
    expect(result.language).toBe("en");
    expect(result.segments[0].text).toBe("Partial success subtitle");
  });
});

// ── getTranscriptFallback 단독 테스트 ──

import { getTranscriptFallback } from "./youtube-api.js";

describe("getTranscriptFallback (youtube-transcript-api)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("python3 성공 시 TranscriptResult 반환", async () => {
    const mockOut = JSON.stringify({
      ok: true,
      lang: "ko",
      data: [
        { text: "안녕하세요", start: 0.0, duration: 1.5 },
        { text: "반갑습니다", start: 2.0, duration: 2.0 },
      ],
    });

    vi.mocked(execFile).mockImplementation((_cmd, _args, _opts, callback) => {
      const cb = typeof _opts === "function" ? _opts : callback;
      (cb as (err: Error | null, stdout: string) => void)(null, mockOut);
      return {} as ReturnType<typeof execFile>;
    });

    const result = await getTranscriptFallback("abc123", "ko");
    expect(result.videoId).toBe("abc123");
    expect(result.language).toBe("ko");
    expect(result.segments[0].offset).toBe(0);
    expect(result.segments[1].offset).toBe(2000);
    expect(result.segments[1].duration).toBe(2000);
    expect(result.fullText).toBe("안녕하세요 반갑습니다");
  });

  it("python3 ok:false 시 에러 throw", async () => {
    const mockOut = JSON.stringify({ ok: false, error: "No transcripts found" });

    vi.mocked(execFile).mockImplementation((_cmd, _args, _opts, callback) => {
      const cb = typeof _opts === "function" ? _opts : callback;
      (cb as (err: Error | null, stdout: string) => void)(null, mockOut);
      return {} as ReturnType<typeof execFile>;
    });

    await expect(getTranscriptFallback("abc123", "ko")).rejects.toThrow("자막을 찾을 수 없습니다");
  });

  it("python3 미설치 시 안내 메시지 에러", async () => {
    vi.mocked(execFile).mockImplementation((_cmd, _args, _opts, callback) => {
      const cb = typeof _opts === "function" ? _opts : callback;
      const err = Object.assign(new Error("ENOENT: python3 not found"), { code: "ENOENT" });
      (cb as (err: Error | null, stdout: string) => void)(err, "");
      return {} as ReturnType<typeof execFile>;
    });

    await expect(getTranscriptFallback("abc123", "ko")).rejects.toThrow("youtube-transcript-api가 설치되어 있지 않습니다");
  });
});

// ── parseYoutubeMdChannels ──

import { parseYoutubeMdChannels } from "./youtube-api.js";

describe("parseYoutubeMdChannels", () => {
  it("URL에서 핸들 추출", () => {
    const content = [
      "https://www.youtube.com/@ITSUB",
      "https://www.youtube.com/@channelTwo",
    ].join("\n");
    expect(parseYoutubeMdChannels(content)).toEqual(["ITSUB", "channelTwo"]);
  });

  it("빈 줄과 비URL 줄 무시", () => {
    const content = [
      "",
      "# 제목",
      "https://www.youtube.com/@ValidHandle",
      "   ",
      "not a url",
      "https://www.youtube.com/@AnotherOne",
    ].join("\n");
    expect(parseYoutubeMdChannels(content)).toEqual(["ValidHandle", "AnotherOne"]);
  });
});

// ── resolveChannelHandles / _resetChannelCache ──

import { resolveChannelHandles, _resetChannelCache } from "./youtube-api.js";

describe("resolveChannelHandles", () => {
  beforeEach(() => {
    _resetChannelCache();
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("channels.list API 호출 후 ChannelInfo[] 반환", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [{ id: "UC_abc123", snippet: { title: "ITSUB Channel" } }],
      }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const result = await resolveChannelHandles("apikey", ["ITSUB"]);
    expect(result).toEqual([{ handle: "ITSUB", channelId: "UC_abc123", title: "ITSUB Channel" }]);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain("channels");
    expect(url).toContain("forHandle=ITSUB");
  });

  it("두 번째 호출은 캐시 사용 (API 한 번만 호출)", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [{ id: "UC_abc123", snippet: { title: "ITSUB Channel" } }],
      }),
    });
    vi.stubGlobal("fetch", mockFetch);

    await resolveChannelHandles("apikey", ["ITSUB"]);
    await resolveChannelHandles("apikey", ["ITSUB"]);

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("_resetChannelCache 호출 후 캐시 클리어됨", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [{ id: "UC_abc123", snippet: { title: "ITSUB Channel" } }],
      }),
    });
    vi.stubGlobal("fetch", mockFetch);

    await resolveChannelHandles("apikey", ["ITSUB"]);
    _resetChannelCache();
    await resolveChannelHandles("apikey", ["ITSUB"]);

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});

// ── TranscriptError 에러 코드 분류 ──

describe("TranscriptError 에러 코드 분류 (yt-dlp stderr)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(mkdtemp).mockResolvedValue("/tmp/yt-sub-abc123");
    vi.mocked(rm).mockResolvedValue(undefined);
    vi.stubEnv("YOUTUBE_COOKIES_FROM_BROWSER", "");
    vi.stubEnv("YOUTUBE_COOKIES", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  function mockYtDlpError(msg: string) {
    const err = new Error(msg);
    vi.mocked(execFile).mockImplementation((_cmd, _args, _opts, callback) => {
      const cb = typeof _opts === "function" ? _opts : callback;
      if (_cmd === "yt-dlp") {
        (cb as (err: Error | null, stdout: string, stderr: string) => void)(err, "", "");
      } else {
        // python3 fallback도 실패
        const fallbackOut = JSON.stringify({ ok: false, error: "No transcripts found" });
        (cb as (err: Error | null, stdout: string) => void)(null, fallbackOut);
      }
      return {} as ReturnType<typeof execFile>;
    });
    vi.mocked(readFile).mockRejectedValue(
      Object.assign(new Error("ENOENT"), { code: "ENOENT" }),
    );
  }

  it("yt-dlp stderr에 '429' 포함 시 RATE_LIMITED 코드", async () => {
    mockYtDlpError("ERROR: HTTP Error 429: Too Many Requests");

    const err = await getTranscript("gc297hx4F7o").catch((e) => e);
    expect(err).toBeInstanceOf(TranscriptError);
    expect((err as TranscriptError).code).toBe(TranscriptErrorCode.RATE_LIMITED);
  });

  it("yt-dlp stderr에 'no subtitles' 포함 시 NO_SUBTITLES 코드", async () => {
    const err = new Error("ERROR: gc297hx4F7o: no subtitles available");
    vi.mocked(execFile).mockImplementation((_cmd, _args, _opts, callback) => {
      const cb = typeof _opts === "function" ? _opts : callback;
      (cb as (err: Error | null, stdout: string, stderr: string) => void)(err, "", "");
      return {} as ReturnType<typeof execFile>;
    });
    vi.mocked(readFile).mockRejectedValue(
      Object.assign(new Error("ENOENT"), { code: "ENOENT" }),
    );

    const thrown = await getTranscript("gc297hx4F7o").catch((e) => e);
    expect(thrown).toBeInstanceOf(TranscriptError);
    expect((thrown as TranscriptError).code).toBe(TranscriptErrorCode.NO_SUBTITLES);
  });

  it("python3 fallback ok:false 시 NO_SUBTITLES 코드", async () => {
    // yt-dlp 성공이지만 파일 없음, fallback도 자막 없음
    vi.mocked(execFile).mockImplementation((_cmd, _args, _opts, callback) => {
      const cb = typeof _opts === "function" ? _opts : callback;
      if (_cmd === "yt-dlp") {
        (cb as (err: Error | null, stdout: string, stderr: string) => void)(null, "", "");
      } else {
        const fallbackOut = JSON.stringify({ ok: false, error: "No transcripts found" });
        (cb as (err: Error | null, stdout: string) => void)(null, fallbackOut);
      }
      return {} as ReturnType<typeof execFile>;
    });
    vi.mocked(readFile).mockRejectedValue(
      Object.assign(new Error("ENOENT"), { code: "ENOENT" }),
    );

    const thrown = await getTranscript("gc297hx4F7o").catch((e) => e);
    expect(thrown).toBeInstanceOf(TranscriptError);
    expect((thrown as TranscriptError).code).toBe(TranscriptErrorCode.NO_SUBTITLES);
  });

  it("yt-dlp stderr에 'PO Token' 포함 시 cascade 사유 보존 → PO_TOKEN_REQUIRED (fallback 실패)", async () => {
    mockYtDlpError("ERROR: Sign in to confirm you're not a bot. PO Token required.");

    const thrown = await getTranscript("gc297hx4F7o").catch((e) => e);
    // PO Token → cascade 사유 보존 → fallback 실패 → 마지막 cascade 사유로 throw
    expect(thrown).toBeInstanceOf(TranscriptError);
    expect((thrown as TranscriptError).code).toBe(TranscriptErrorCode.PO_TOKEN_REQUIRED);
    expect((thrown as TranscriptError).message).toMatch(/PO Token|봇 차단/);
  });

  it("'No Subtitles' 대소문자 변형 — python fallback 미호출, NO_SUBTITLES 즉시 분류", async () => {
    mockYtDlpError("ERROR: gc297hx4F7o: No Subtitles available for requested languages");

    const thrown = await getTranscript("gc297hx4F7o").catch((e) => e);
    expect(thrown).toBeInstanceOf(TranscriptError);
    expect((thrown as TranscriptError).code).toBe(TranscriptErrorCode.NO_SUBTITLES);
    // 즉시 throw여야 함: python3(fallback) 호출 없어야 함
    const python3Calls = vi.mocked(execFile).mock.calls.filter((c) => c[0] === "python3");
    expect(python3Calls).toHaveLength(0);
  });

  it("'subtitles are disabled' 소문자 — python fallback 미호출, NO_SUBTITLES 즉시 분류", async () => {
    mockYtDlpError("ERROR: subtitles are disabled for this video");

    const thrown = await getTranscript("gc297hx4F7o").catch((e) => e);
    expect(thrown).toBeInstanceOf(TranscriptError);
    expect((thrown as TranscriptError).code).toBe(TranscriptErrorCode.NO_SUBTITLES);
    const python3Calls = vi.mocked(execFile).mock.calls.filter((c) => c[0] === "python3");
    expect(python3Calls).toHaveLength(0);
  });

  it("'po_token' 소문자도 cascade 사유 보존 → PO_TOKEN_REQUIRED", async () => {
    mockYtDlpError("ERROR: This video requires a po_token to access.");

    const thrown = await getTranscript("gc297hx4F7o").catch((e) => e);
    expect(thrown).toBeInstanceOf(TranscriptError);
    expect((thrown as TranscriptError).code).toBe(TranscriptErrorCode.PO_TOKEN_REQUIRED);
  });

  it("yt-dlp stderr에 'sign in to confirm' 포함 시 COOKIE_EXPIRED (fallback 실패)", async () => {
    mockYtDlpError("ERROR: Sign in to confirm your age. cookies may have expired.");

    const thrown = await getTranscript("gc297hx4F7o").catch((e) => e);
    expect(thrown).toBeInstanceOf(TranscriptError);
    // sign in / cookie 패턴은 PO Token 패턴이 함께 없으면 COOKIE_EXPIRED
    expect((thrown as TranscriptError).code).toBe(TranscriptErrorCode.COOKIE_EXPIRED);
  });

  it("web 클라이언트 stdout에 'no subtitles for the requested languages' + PO Token 경고 → PO_TOKEN_REQUIRED", async () => {
    // web 클라이언트는 exit 0이지만 stdout에 PO Token 미제공 + no subtitles 메시지 출력
    vi.stubEnv("YOUTUBE_COOKIES_FROM_BROWSER", "chrome");

    let attempt = 0;
    vi.mocked(execFile).mockImplementation((_cmd, args, _opts, callback) => {
      const cb = typeof _opts === "function" ? _opts : callback;
      if (_cmd === "yt-dlp") {
        attempt += 1;
        const argsArr = args as string[];
        if (argsArr.includes("youtube:player_client=tv")) {
          // tv: DRM 에러
          const err = new Error(
            "ERROR: [youtube] gc297hx4F7o: Requested format is not available. drm protected.",
          );
          (cb as (err: Error | null, stdout: { stdout: string; stderr: string }) => void)(err, { stdout: "", stderr: "" });
        } else {
          // web: exit 0이지만 stdout에 "no subtitles" + "PO Token" 경고
          // promisify(execFile)는 정상 시 {stdout, stderr} 객체 반환 — mock도 동일하게 객체 형태로
          const stdoutText =
            "WARNING: [youtube] Some web client subtitles require a PO Token which was not provided.\n" +
            "[info] There are no subtitles for the requested languages\n";
          (cb as (err: Error | null, value: { stdout: string; stderr: string }) => void)(null, { stdout: stdoutText, stderr: "" });
        }
      } else {
        // python3 fallback도 실패
        const fallbackOut = JSON.stringify({ ok: false, error: "No transcripts found" });
        (cb as (err: Error | null, stdout: string) => void)(null, fallbackOut);
      }
      return {} as ReturnType<typeof execFile>;
    });
    vi.mocked(readFile).mockRejectedValue(
      Object.assign(new Error("ENOENT"), { code: "ENOENT" }),
    );

    const thrown = await getTranscript("gc297hx4F7o").catch((e) => e);
    expect(thrown).toBeInstanceOf(TranscriptError);
    expect((thrown as TranscriptError).code).toBe(TranscriptErrorCode.PO_TOKEN_REQUIRED);
    expect(attempt).toBeGreaterThanOrEqual(2); // tv → web 캐스케이드 확인
  });

  it("python fallback이 TranscriptError throw 시 외부 catch가 마스킹하지 않고 재throw", async () => {
    // yt-dlp 모든 시도 cascade null → python fallback ok:false (NO_SUBTITLES throw)
    // 외부 catch가 cascade 사유 또는 fallback의 NO_SUBTITLES를 보존해야 함
    vi.mocked(execFile).mockImplementation((_cmd, _args, _opts, callback) => {
      const cb = typeof _opts === "function" ? _opts : callback;
      if (_cmd === "yt-dlp") {
        // yt-dlp 성공이지만 파일 0개 → cascade
        (cb as (err: Error | null, stdout: string, stderr: string) => void)(null, "", "");
      } else {
        // python3 fallback: NO_SUBTITLES TranscriptError
        const fallbackOut = JSON.stringify({ ok: false, error: "No transcripts found" });
        (cb as (err: Error | null, stdout: string) => void)(null, fallbackOut);
      }
      return {} as ReturnType<typeof execFile>;
    });
    vi.mocked(readFile).mockRejectedValue(
      Object.assign(new Error("ENOENT"), { code: "ENOENT" }),
    );

    const thrown = await getTranscript("gc297hx4F7o").catch((e) => e);
    expect(thrown).toBeInstanceOf(TranscriptError);
    expect((thrown as TranscriptError).code).toBe(TranscriptErrorCode.NO_SUBTITLES);
    // cause가 fallback의 TranscriptError여야 함 (래핑하지 말고 재throw)
    // 또는 동일한 TranscriptError 인스턴스
  });

  it("회귀 방지: 쿠키 없음 + 429는 여전히 RATE_LIMITED (PO_TOKEN으로 강등 안 됨)", async () => {
    mockYtDlpError("ERROR: HTTP Error 429: Too Many Requests");

    const thrown = await getTranscript("gc297hx4F7o").catch((e) => e);
    expect(thrown).toBeInstanceOf(TranscriptError);
    expect((thrown as TranscriptError).code).toBe(TranscriptErrorCode.RATE_LIMITED);
  });

  it("'not available in your country' 대소문자 변형도 REGION_BLOCKED — yt-dlp 1회만 호출", async () => {
    mockYtDlpError("ERROR: This video is not available in your country due to copyright restrictions");

    const thrown = await getTranscript("gc297hx4F7o").catch((e) => e);
    expect(thrown).toBeInstanceOf(TranscriptError);
    expect((thrown as TranscriptError).code).toBe(TranscriptErrorCode.REGION_BLOCKED);
    const ytdlpCalls = vi.mocked(execFile).mock.calls.filter((c) => c[0] === "yt-dlp");
    expect(ytdlpCalls).toHaveLength(1);
  });
});

// ── getChannelVideos ──

import { getChannelVideos } from "./youtube-api.js";

describe("getChannelVideos", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("playlistItems.list를 UU 접두사로 호출하고 SearchResultItem[] 반환", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [
          {
            snippet: {
              resourceId: { videoId: "vid001" },
              title: "Test Video",
              description: "A description",
              channelTitle: "My Channel",
              publishedAt: "2024-01-01T00:00:00Z",
              thumbnails: { high: { url: "https://img.url/hq.jpg" } },
            },
          },
        ],
        pageInfo: { totalResults: 1 },
      }),
    });
    vi.stubGlobal("fetch", mockFetch);

    // channelId starts with "UC", so uploadsPlaylistId = "UU" + channelId.slice(2)
    const result = await getChannelVideos("apikey", "UCtest123");
    expect(result).toHaveLength(1);
    expect(result[0].videoId).toBe("vid001");
    expect(result[0].title).toBe("Test Video");

    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain("playlistItems");
    expect(url).toContain("UUtest123");
  });
});
