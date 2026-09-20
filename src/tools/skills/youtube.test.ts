import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../youtube-api.js", () => ({
  getTranscript: vi.fn(),
  formatTranscriptWithTimestamps: vi.fn(() => "[00:00] 안녕하세요"),
  cleanTranscriptText: vi.fn((s: string) => s),
  getVideoMetadata: vi.fn(),
  searchVideos: vi.fn(),
  getVideoComments: vi.fn(),
}));

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getTranscript } from "../../youtube-api.js";
import { registerYoutube } from "./youtube.js";
import { SERVER_TRANSCRIPT_UNAVAILABLE, youtubeTranscriptMetrics } from "../../youtube-transcript-status.js";
import { TranscriptError, TranscriptErrorCode } from "../../youtube-types.js";

type Callback = (params: Record<string, unknown>) => Promise<{
  content: { type: string; text: string }[];
  isError?: boolean;
}>;

/** registerSkillTool이 실제로 등록하는 콜백을 잡아낸다 (McpServer 없이 핸들러 검증) */
function makeHandler(): Callback {
  let captured: Callback | null = null;
  const fakeServer = {
    registerTool: (_name: string, _config: unknown, cb: Callback) => {
      captured = cb;
    },
  } as unknown as McpServer;
  registerYoutube(fakeServer);
  if (!captured) throw new Error("youtube 도구가 등록되지 않았습니다");
  return captured;
}

describe("youtube 스킬 — 자막 실패의 정직한 보고", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("get_transcript 봇 차단 → SERVER_TRANSCRIPT_UNAVAILABLE + 로컬 대안 + isError", async () => {
    vi.mocked(getTranscript).mockRejectedValue(
      new TranscriptError("자동화된 요청 감지", TranscriptErrorCode.BOT_DETECTED),
    );

    const result = await makeHandler()({ action: "get_transcript", url: "aircAruvnKk" });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain(SERVER_TRANSCRIPT_UNAVAILABLE);
    expect(result.content[0].text).toContain(TranscriptErrorCode.BOT_DETECTED);
    expect(result.content[0].text).toContain("yt-dlp");
  });

  it("summarize 봇 차단도 같은 고정 코드로 답한다", async () => {
    vi.mocked(getTranscript).mockRejectedValue(
      new TranscriptError("자동화된 요청 감지", TranscriptErrorCode.BOT_DETECTED),
    );

    const result = await makeHandler()({ action: "summarize", url: "aircAruvnKk" });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain(SERVER_TRANSCRIPT_UNAVAILABLE);
  });

  it("자막 없는 영상은 서버 차단으로 오보하지 않는다", async () => {
    vi.mocked(getTranscript).mockRejectedValue(
      new TranscriptError("자막이 없는 영상입니다.", TranscriptErrorCode.NO_SUBTITLES),
    );

    const result = await makeHandler()({ action: "get_transcript", url: "aircAruvnKk" });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).not.toContain(SERVER_TRANSCRIPT_UNAVAILABLE);
    expect(result.content[0].text).toContain("YouTube 자막 추출 오류");
  });

  it("성공·실패가 30일 계측에 잡힌다 (/health/youtube 노출분)", async () => {
    const before = youtubeTranscriptMetrics.snapshot();
    const handler = makeHandler();

    vi.mocked(getTranscript).mockResolvedValueOnce({
      videoId: "vid1", segments: [], fullText: "안녕하세요", language: "ko", segmentCount: 1,
    });
    await handler({ action: "get_transcript", url: "vid1" });

    vi.mocked(getTranscript).mockRejectedValueOnce(
      new TranscriptError("차단", TranscriptErrorCode.BOT_DETECTED),
    );
    await handler({ action: "get_transcript", url: "vid2" });

    const after = youtubeTranscriptMetrics.snapshot();
    expect(after.get_transcript.ok).toBe(before.get_transcript.ok + 1);
    expect(after.get_transcript.fail).toBe(before.get_transcript.fail + 1);
    expect(after.get_transcript.byReason[TranscriptErrorCode.BOT_DETECTED] ?? 0)
      .toBe((before.get_transcript.byReason[TranscriptErrorCode.BOT_DETECTED] ?? 0) + 1);
  });
});
