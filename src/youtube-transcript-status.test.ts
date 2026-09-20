import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import {
  SERVER_TRANSCRIPT_UNAVAILABLE,
  TranscriptCallMetrics,
  isServerBlockedTranscript,
  serverTranscriptUnavailableMessage,
  transcriptFailureReason,
} from "./youtube-transcript-status.js";
import { TranscriptError, TranscriptErrorCode } from "./youtube-types.js";

const DAY_MS = 24 * 60 * 60 * 1000;

describe("서버 자막 불가 분류", () => {
  it("BOT_DETECTED·PO_TOKEN_REQUIRED는 서버 차단 — 로컬로 갈아타면 풀린다", () => {
    expect(isServerBlockedTranscript(new TranscriptError("x", TranscriptErrorCode.BOT_DETECTED))).toBe(true);
    expect(isServerBlockedTranscript(new TranscriptError("x", TranscriptErrorCode.PO_TOKEN_REQUIRED))).toBe(true);
  });

  it("RATE_LIMITED도 서버 차단 — 데이터센터 IP 차단의 다른 얼굴이다", () => {
    // 2026-09-20 실측: 같은 영상이 아침엔 BOT_DETECTED, 몇 시간 뒤엔 RATE_LIMITED 로
    // 돌아왔고 로컬은 둘 다 정상 추출됐다. 빼 두면 «잠시 후 다시 시도» 오보가 나간다.
    expect(isServerBlockedTranscript(new TranscriptError("x", TranscriptErrorCode.RATE_LIMITED))).toBe(true);
  });

  it("COOKIE_EXPIRED·NO_SUBTITLES는 서버 차단이 아니다 — 대안 안내가 오보가 된다", () => {
    expect(isServerBlockedTranscript(new TranscriptError("x", TranscriptErrorCode.COOKIE_EXPIRED))).toBe(false);
    expect(isServerBlockedTranscript(new TranscriptError("x", TranscriptErrorCode.NO_SUBTITLES))).toBe(false);
    expect(isServerBlockedTranscript(new Error("그냥 오류"))).toBe(false);
  });

  it("사유 코드 추출 — TranscriptError면 code, 아니면 OTHER", () => {
    expect(transcriptFailureReason(new TranscriptError("x", TranscriptErrorCode.BOT_DETECTED)))
      .toBe(TranscriptErrorCode.BOT_DETECTED);
    expect(transcriptFailureReason(new Error("x"))).toBe("OTHER");
    expect(transcriptFailureReason("문자열")).toBe("OTHER");
  });

  it("안내문에 고정 코드·사유·로컬 대안이 들어간다", () => {
    const msg = serverTranscriptUnavailableMessage(TranscriptErrorCode.BOT_DETECTED);
    expect(msg).toContain(SERVER_TRANSCRIPT_UNAVAILABLE);
    expect(msg).toContain(TranscriptErrorCode.BOT_DETECTED);
    expect(msg).toContain("yt-dlp");
  });

  it("안내문이 원인을 단정하지 않는다", () => {
    // 2026-09-20: 한때 「데이터센터 IP 탓이라 쿠키를 갱신해도 풀리지 않는다」고 단정했으나
    // 같은 날 쿠키 재추출 + 배포로 복구돼 그 단정을 철회했다. 복구가 새 쿠키 덕인지
    // 차단이 저절로 풀린 것인지 가를 데이터가 없다 — 안내문이 한쪽을 단정하면 다음 사람이
    // 실제로 듣는 조치(쿠키 갱신)를 건너뛴다.
    const msg = serverTranscriptUnavailableMessage(TranscriptErrorCode.BOT_DETECTED);
    expect(msg).not.toContain("쿠키를 갱신해도 풀리지 않습니다");
    expect(msg).not.toContain("쿠키 문제가 아닙니다");
  });
});

describe("TranscriptCallMetrics — 30일 롤링", () => {
  let metrics: TranscriptCallMetrics;

  beforeEach(() => {
    vi.useFakeTimers();
    metrics = new TranscriptCallMetrics();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("표면별 성공/실패/사유를 센다", () => {
    metrics.record("get_transcript", true);
    metrics.record("get_transcript", false, TranscriptErrorCode.BOT_DETECTED);
    metrics.record("get_transcript", false, TranscriptErrorCode.BOT_DETECTED);
    metrics.record("summarize", false, TranscriptErrorCode.PO_TOKEN_REQUIRED);
    metrics.record("product_review", true);

    const snap = metrics.snapshot();
    expect(snap.get_transcript).toEqual({
      ok: 1,
      fail: 2,
      byReason: { [TranscriptErrorCode.BOT_DETECTED]: 2 },
    });
    expect(snap.summarize.fail).toBe(1);
    expect(snap.summarize.byReason[TranscriptErrorCode.PO_TOKEN_REQUIRED]).toBe(1);
    expect(snap.product_review.ok).toBe(1);
  });

  it("since를 반드시 낸다 — «0건 = 수요 없음»과 «0건 = 방금 초기화»를 가르는 근거", () => {
    const snap = metrics.snapshot();
    expect(snap.since).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(snap.windowDays).toBe(30);
    expect(snap.get_transcript).toEqual({ ok: 0, fail: 0, byReason: {} });
  });

  it("재배포 직후 since는 창 시작이 아니라 카운터 시작 시각", () => {
    const snap = metrics.snapshot();
    expect(new Date(snap.since).getTime()).toBe(Date.now());
  });

  it("30일이 지난 호출은 창 밖으로 떨어진다", () => {
    metrics.record("get_transcript", false, TranscriptErrorCode.BOT_DETECTED);
    expect(metrics.snapshot().get_transcript.fail).toBe(1);

    vi.advanceTimersByTime(29 * DAY_MS);
    expect(metrics.snapshot().get_transcript.fail).toBe(1);

    vi.advanceTimersByTime(2 * DAY_MS);
    const snap = metrics.snapshot();
    expect(snap.get_transcript.fail).toBe(0);
    // 창이 밀린 뒤 since는 창 시작(최대 30일 전)을 넘지 않는다
    expect(Date.now() - new Date(snap.since).getTime()).toBeLessThanOrEqual(30 * DAY_MS);
  });

  it("버킷은 하루 단위로 접힌다 — 공개 표면이라 낱개 이벤트를 쌓지 않는다", () => {
    for (let i = 0; i < 500; i++) metrics.record("get_transcript", false, "OTHER");
    const internal = metrics as unknown as { _buckets: Map<number, unknown> };
    expect(internal._buckets.size).toBe(1);
    expect(metrics.snapshot().get_transcript.fail).toBe(500);
  });
});
