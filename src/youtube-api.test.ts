import { describe, it, expect, vi, beforeEach } from "vitest";
import { extractVideoId, parseJson3Subtitles, formatTranscriptWithTimestamps, cleanTranscriptText } from "./youtube-api.js";

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
}));

import { execFile } from "node:child_process";
import { readFile, rm, mkdtemp } from "node:fs/promises";
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

  it("자막 없는 영상 에러", async () => {
    vi.mocked(execFile).mockImplementation((_cmd, _args, _opts, callback) => {
      const cb = typeof _opts === "function" ? _opts : callback;
      (cb as (err: Error | null, stdout: string, stderr: string) => void)(null, "", "");
      return {} as ReturnType<typeof execFile>;
    });
    // readFile가 ENOENT → 파일 없음 → 모든 폴백 언어도 없음 → 에러
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
});
