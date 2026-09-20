/**
 * 자막 계열 호출의 «정직한 실패» 표면 — 고정 코드·안내문 + 30일 롤링 계측.
 *
 * 왜 필요한가 (2026-09-20 설계 §3.2 «조용한 오보»):
 *   서버(Railway 데이터센터 IP)가 YouTube 봇 차단에 걸려 자막이 전멸해도 지금까지는
 *   «검색 결과가 없습니다»라는 «정상적 빈 결과»로 둔갑해 호출자가 고장을 알 수 없었다.
 *   ① 고장은 고장이라고 말하고(고정 코드 + 대안 안내)
 *   ② 그 기능에 실수요가 있는지 서버가 직접 센다(30일 뒤 A1b 구축 여부를 가르는 게이트).
 *
 * 계측은 «스킬 표면»(사용자 호출)에서만 한다 — youtube-probe 의 5분 주기 합성 호출은
 * 실수요가 아니므로 세지 않는다(프로브는 getTranscript 를 직접 부르고 여기를 거치지 않는다).
 */

import { TranscriptError, TranscriptErrorCode } from "./youtube-types.js";

/**
 * 서버 자막 추출 불가를 나타내는 고정 코드.
 * 호출자(사람·에이전트)가 문자열 매칭으로 «서버 고장»과 «진짜 빈 결과»를 가른다.
 */
export const SERVER_TRANSCRIPT_UNAVAILABLE = "SERVER_TRANSCRIPT_UNAVAILABLE";

/**
 * «서버에서는 못 뽑지만 로컬에서는 뽑히는» 차단 사유.
 * 2026-09-20 09:49 A/B 실측에서 같은 영상·같은 yt-dlp(2026.08.19)·같은 쿠키로 로컬 맥은
 * 자막 171KB 정상, 서버는 「자동화된 요청 감지」였다. 다만 같은 날 10:03 에 쿠키를 새로 뽑아
 * 배포하자 복구됐으므로 «출구 IP 탓이라 쿠키로는 안 풀린다» 고 단정하지 않는다 — 복구가
 * 새 쿠키 덕인지 차단이 저절로 풀린 것인지 가를 데이터가 없다.
 * COOKIE_EXPIRED(진짜 쿠키 만료)·NO_SUBTITLES(자막 없는 영상)는 성격이 달라 제외한다 —
 * 그쪽까지 이 코드로 싸면 «쿠키 갱신하면 되는 일»까지 불가로 오보하게 된다.
 */
const SERVER_BLOCKED_CODES: ReadonlySet<string> = new Set<string>([
  TranscriptErrorCode.BOT_DETECTED,
  TranscriptErrorCode.PO_TOKEN_REQUIRED,
  // RATE_LIMITED 도 여기 넣는다 — 2026-09-20 에 같은 영상이 아침엔 BOT_DETECTED,
  // 몇 시간 뒤엔 RATE_LIMITED 로 돌아왔고 그 사이 로컬은 계속 정상이었다. 개별 호출자의
  // 과다요청으로 보이지만 실제로는 서버 쪽 추출만 막힌 상태였다. 빼 두면 «잠시 후 다시
  // 시도해주세요» 가 나가 호출자가 자기 호출량을 줄이는 헛수고를 한다.
  TranscriptErrorCode.RATE_LIMITED,
]);

/** 이 실패가 «서버 출구 IP 때문»인가 (= 로컬로 갈아타면 풀리는가) */
export function isServerBlockedTranscript(error: unknown): boolean {
  return error instanceof TranscriptError && SERVER_BLOCKED_CODES.has(error.code);
}

/** 계측·안내문에 실을 실패 사유 코드. 분류 못 한 에러는 OTHER 로 뭉친다. */
export function transcriptFailureReason(error: unknown): string {
  return error instanceof TranscriptError ? error.code : "OTHER";
}

/**
 * 서버 자막 추출 불가 안내문 — 원인과 «로컬 yt-dlp» 대안을 함께 낸다.
 * 일반 오류 문자열과 달리 고정 코드로 시작해 기계·사람 모두 식별할 수 있다.
 */
export function serverTranscriptUnavailableMessage(reason: string): string {
  return [
    `[${SERVER_TRANSCRIPT_UNAVAILABLE}] 서버에서 자막을 추출하지 못했습니다. (차단 사유: ${reason})`,
    "",
    "서버 쪽 추출만 막힌 상태입니다. 같은 영상이 로컬 PC에서는 추출되는 경우가 많습니다.",
    "원인은 쿠키 만료일 수도, 서버 출구에 대한 일시 차단일 수도 있습니다 —",
    "2026-09-20에는 쿠키를 새로 뽑아 배포한 뒤 복구됐습니다.",
    "",
    "대안: 로컬에서 직접 추출하세요.",
    "  yt-dlp --skip-download --write-auto-subs --sub-lang ko --sub-format json3 -- <영상ID>",
    "",
    "참고: video_info·search·comments(YouTube Data API v3)는 이 차단과 무관하게 정상 동작합니다.",
  ].join("\n");
}

// ─── 30일 롤링 계측 ───

const DAY_MS = 24 * 60 * 60 * 1000;
const WINDOW_DAYS = 30;

/** 자막을 실제로 쓰는 호출 표면 3곳 (product_review 는 영상 단위가 아니라 요청 단위 1건) */
export type TranscriptCallSource = "get_transcript" | "summarize" | "product_review";

const SOURCES: readonly TranscriptCallSource[] = ["get_transcript", "summarize", "product_review"];

interface Counter {
  ok: number;
  fail: number;
  byReason: Record<string, number>;
}

type DayBucket = Record<TranscriptCallSource, Counter>;

function emptyCounter(): Counter {
  return { ok: 0, fail: 0, byReason: {} };
}

function emptyBucket(): DayBucket {
  return { get_transcript: emptyCounter(), summarize: emptyCounter(), product_review: emptyCounter() };
}

/**
 * 인메모리 30일 롤링 집계.
 *
 * 이벤트를 낱개로 쌓지 않고 «UTC 하루 × 표면» 버킷으로 접는다 — 이 서버는 인증 없는 공개
 * 표면이라 낱개 배열은 임의 호출자가 메모리를 밀어 넣는 통로가 된다. 버킷은 30 × 3 개로
 * 상한이 고정된다.
 *
 * 영속 저장소가 없어 재배포하면 초기화된다. 그래서 snapshot() 이 since 를 반드시 함께 내고,
 * 판정하는 쪽이 «0건 = 수요 없음»과 «0건 = 방금 초기화»를 구분할 수 있게 한다(설계 §4.3).
 */
export class TranscriptCallMetrics {
  private _startedAt = Date.now();
  private _buckets = new Map<number, DayBucket>();

  /** 자막 계열 호출 1건 기록. 실패면 사유 코드까지. */
  record(source: TranscriptCallSource, ok: boolean, reason?: string): void {
    const dayIndex = Math.floor(Date.now() / DAY_MS);
    this._prune(dayIndex);

    let bucket = this._buckets.get(dayIndex);
    if (!bucket) {
      bucket = emptyBucket();
      this._buckets.set(dayIndex, bucket);
    }

    const counter = bucket[source];
    if (ok) {
      counter.ok++;
      return;
    }
    counter.fail++;
    const key = reason ?? "OTHER";
    counter.byReason[key] = (counter.byReason[key] ?? 0) + 1;
  }

  /** `/health/youtube` 에 실을 집계. since 는 실제 관측 시작 시각(재배포 또는 창 시작 중 늦은 쪽). */
  snapshot(): { since: string; windowDays: number } & Record<TranscriptCallSource, Counter> {
    const dayIndex = Math.floor(Date.now() / DAY_MS);
    this._prune(dayIndex);

    const total = emptyBucket();
    for (const bucket of this._buckets.values()) {
      for (const source of SOURCES) {
        const from = bucket[source];
        const to = total[source];
        to.ok += from.ok;
        to.fail += from.fail;
        for (const [reason, n] of Object.entries(from.byReason)) {
          to.byReason[reason] = (to.byReason[reason] ?? 0) + n;
        }
      }
    }

    const windowStart = (dayIndex - (WINDOW_DAYS - 1)) * DAY_MS;
    return {
      since: new Date(Math.max(this._startedAt, windowStart)).toISOString(),
      windowDays: WINDOW_DAYS,
      ...total,
    };
  }

  /** 30일 창 밖 버킷 폐기 */
  private _prune(dayIndex: number): void {
    const oldest = dayIndex - (WINDOW_DAYS - 1);
    for (const key of this._buckets.keys()) {
      if (key < oldest) this._buckets.delete(key);
    }
  }
}

/** 글로벌 싱글톤 — 스킬 표면에서 기록하고 /health/youtube 에서 읽는다. */
export const youtubeTranscriptMetrics = new TranscriptCallMetrics();
