---
name: youtube-transcript-error-code-priority
description: TranscriptError 코드 cascade 사유 보존 우선순위 (PO_TOKEN > COOKIE > BOT > NO_SUBS) + circuit breaker INFRA_ERRORS 정책
type: project
created: 2026-05-07
---

YouTube 자막 추출 캐스케이드에서 차단 사유를 정확히 분류·보존하는 정책.

**Cascade 사유 보존 우선순위** (가장 구체적인 사유가 우선, `src/youtube-api.ts`의 `moreSpecificReason`):

```
PO_TOKEN_REQUIRED > COOKIE_EXPIRED > BOT_DETECTED > NO_SUBTITLES
```

캐스케이드 도중 여러 클라이언트가 다른 사유로 실패하면 우선순위 높은 사유로 보존. 예: tv는 DRM(BOT_DETECTED), web은 PO Token 차단 → 최종 PO_TOKEN_REQUIRED로 throw.

**Circuit Breaker INFRA_ERRORS** (`src/youtube-circuit-breaker.ts`):
- `NO_SUBTITLES`만 제외하고 모두 카운트
- 7회 연속 실패 시 60초 차단 (임계값은 `youtube-circuit-breaker-thresholds.md` 참조)

**Why:**
- 운영 시 "왜 막혔는가"를 정확히 진단하려면 가장 시스템적인 원인이 노출되어야 함
- 이전 버그: 모든 cascade 실패가 NO_SUBTITLES로 마스킹 → 사용자가 "영상에 자막 없음"으로 오해 (실제는 PO Token 정책 차단)
- NO_SUBTITLES는 영상별 정상 상태이므로 CB 카운트 제외해야 정상 영상이 다른 영상의 회로를 열지 않음

**How to apply:**
- 신규 에러 코드 추가 시 우선순위 표에 위치 명시 (`moreSpecificReason` 갱신)
- INFRA_ERRORS 집합 결정 기준: 영상별 이슈(NO_SUBTITLES, REGION_BLOCKED 일부) vs 시스템 이슈(PO_TOKEN, COOKIE, BOT, 429)
- runbook-youtube.md의 에러 코드 표를 SoT로 유지
