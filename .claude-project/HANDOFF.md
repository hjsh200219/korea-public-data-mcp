---
created: 2026-05-21T11:25:00+09:00
project: k-public-data-mcp
summary: YouTube 회복/가시성 버그 2건 TDD 수정 + 푸시 — Python fallback success 미기록 / state getter lazy 전이 누락. 근본은 Railway egress IP 차단(RATE_LIMITED), 별건 PRD 필요.
---

## Session Digest

사용자가 production `58JmiqdPxqE` 자막 추출 실패 보고. /health/youtube는 `status: healthy` / `consecutiveFailures: 0`인데 `circuitBreaker: "open"` 모순 노출. MCP 직접 호출로 `RATE_LIMITED` (yt-dlp HTTP 429) 확인 — known-good `K7QP8LyvEEA`도 동일 → Railway egress IP가 YouTube 측에 차단된 상태. 본 케이스는 IP cooldown 이슈로 즉시 해결 불가.

진단 과정에서 별개의 회복/가시성 버그 2건 식별 → TDD 수정 + 푸시 완료:
1. **1f82923**: Python fallback 성공 시 `recordSuccess()` 누락 → half-open 정체 → 다음 인프라 실패에 즉시 재오픈
2. **a7fa375**: `state` getter가 `_state` 그대로 반환 → /health/youtube에 영원히 "open" 노출 (60초 경과해도 lazy 전이 미실행). state getter에 lazy 전이 이동, isOpen() 재사용

886/891 그린(5 skip 사전 존재), build OK, origin/master push 완료. 원 이슈(RATE_LIMITED)는 YouTube IP cooldown 풀려야 해소.

## Progress

### 완료
- **1f82923** — `fix: Python fallback 성공 시 recordSuccess() 호출` (half-open 정체 해소)
- **a7fa375** — `fix: state getter lazy 전이 — /health/youtube open 영속 노출 해소`
- TDD 테스트 작성 → Red → Green 확인
- 886/891 그린 (5 skip 사전 존재), npm run build 성공
- origin/master push 완료
- production /health/youtube + MCP tools/call로 RATE_LIMITED 진단 확정

### 이전 세션 누적 (미해결)
- 🔲 HANDOFF #3/#4/#5 entangled refactor 재평가 (cascade 의도 + null 타입 손실 + 쿠키 풀 미동기)
- 🔲 9-lang `FALLBACK_LANGS` 좁히기 PRD (RATE_LIMITED 빈도 높을 시)
- 🔲 per-language 분할 호출 검토
- 🔲 Smithery 마켓플레이스 승인 + awesome-mcp-servers PR 상태 확인
- 🔲 production 배포 후 `android_vr` 효과 정량 평가 (1주 데이터 누적 필요)
- 🔲 쿠키 만료 자동화 PRD (현재 30일 수동, 마지막 갱신 179d 유효)
- 🔲 운영 알람 분기에 `expired` 상태 반영

## Next Steps (우선순위 순)

1. **IP 차단 PRD 작성** — Railway egress IP가 YouTube 측에 RATE_LIMITED. proxy/residential IP 로테이션, per-instance fingerprint 분산, 호출 빈도 throttle 등 근본 대책 설계. 본 세션 패치는 회복/가시성만 fix이며 IP 자체 차단은 별건.
2. **production /health/youtube 재검증** — 본 세션 패치 배포 후 (a) circuitBreaker 60초 경과 시 half-open/closed 자연 전이 확인 (b) Python fallback 성공 후 consecutiveFailures 감소 확인
3. **IP cooldown 모니터링** — `58JmiqdPxqE` / `K7QP8LyvEEA` 자막 추출 재시도 (수동) — RATE_LIMITED 해소 시점 측정
4. **HANDOFF #3/#4/#5 재평가** — outcome 타입 도입 후 잔여 entangled refactor 항목 식별
5. **android_vr 효과 + RATE_LIMITED 빈도 모니터링** — 1주 데이터 누적 후 FALLBACK_LANGS 의사결정
6. **Smithery / awesome-mcp-servers 마감** — 마켓플레이스 등록 상태 점검
7. **쿠키 자동화 PRD** — 알람 또는 크론 자동화 검토

## Blockers

- **Railway egress IP RATE_LIMITED** — YouTube 측 IP cooldown 풀릴 때까지 자막 추출 불가. 본 패치는 회복/가시성만 fix
- IP 로테이션 또는 residential proxy 없이는 동일 IP에서 yt-dlp 호출이 지속 차단되는 구조적 한계

## Watch Out

### 본 세션 패치 동기화 포인트
- **Circuit Breaker state getter** — `state` 접근 시점에 lazy 전이가 일어남. 외부 코드가 getter를 호출하지 않고 내부 필드를 직접 보면 stale. 가능하면 `isOpen()` / `state` getter 사용 통일
- **Python fallback recordSuccess()** — fallback 경로에서 yt-dlp 외 모든 성공도 `recordSuccess()` 호출 필요. 신규 fallback 경로 추가 시 동일 처리 확인
- `src/youtube-circuit-breaker.ts` 상태 전이 로직 변경 시 → 테스트 + `/health/youtube` 응답 의미 검토
- 429 시 yt-dlp player_client cascade 변경은 **금지** (동일 IP egress라 무효, burst 가중 우려) — advisor 권고

### 운영
- **Railway egress IP RATE_LIMITED** — 자막 추출 실패 시 YouTube 측 IP 차단 가능성 우선 의심
- 쿠키 만료 30일 주기 (현재 179d 잔여) — 알람/크론 자동화 PRD 검토
- Railway `YOUTUBE_COOKIES` 32KB 제한 — `.youtube.com` 도메인만 필터링 유지
- `YOUTUBE_CIRCUIT_BREAKER_ENABLED`, `YOUTUBE_PROBE_ENABLED` kill switch (env)

### 이전 세션 잔존
- `src/youtube-cookie-pool.ts` getHealthInfo 상태 분류 변경 시 → /health/youtube 스키마 문서 동기화
- `src/youtube-probe.ts` errorCode 길이 (현재 200자) 변경 시 → 로그/알람 임계값 재확인
- cascade 순서 변경 시 `src/youtube-api.test.ts` 5건 동기화
- `TranscriptError` 코드 분류 변경 시 `INFRA_ERRORS` 동기화
- `docs/runbook-youtube.md` 에러 코드 표 + cascade 표 + "expired status 의미" 동시 갱신

## Files Touched

| 파일 | 변경 사항 | 상태 |
|------|---------|------|
| `src/youtube-circuit-breaker.ts` | state getter lazy 전이 / isOpen() 재사용 / Python fallback recordSuccess() | 수정 |
| `src/youtube-circuit-breaker.test.ts` | 두 버그에 대한 TDD 테스트 추가 | 수정 |
| `.claude-project/HANDOFF.md` | 본 인계서 (2026-05-21) | 수정 |

## Session Timeline

1. **보고** — 사용자: production `58JmiqdPxqE` 자막 추출 실패
2. **진단 #1** — /health/youtube 조회: `status: healthy`, `consecutiveFailures: 0`, 쿠키 176d 유효 — 그러나 `circuitBreaker: "open"` 모순
3. **진단 #2** — MCP `tools/call` 직접 호출 → `RATE_LIMITED` (yt-dlp HTTP 429) 확정
4. **진단 #3** — known-good `K7QP8LyvEEA`도 동일 RATE_LIMITED → Railway egress IP 전체 차단으로 판정 (영상별 문제 아님)
5. **Advisor 1차** — 429 시 player_client cascade 변경 제안 → 동일 IP egress라 무효 + burst 가중 우려로 기각
6. **버그 식별 #1** — Python fallback 성공 시 `recordSuccess()` 누락 → half-open 정체
7. **TDD #1** — Red → Green → 1f82923 commit
8. **버그 식별 #2** — `state` getter가 lazy 전이 없이 `_state` 반환 → /health/youtube 영속 "open" 노출
9. **TDD #2** — Red → Green → a7fa375 commit (state getter lazy 전이, isOpen() 재사용)
10. **검증** — 886/891 그린(5 skip 사전 존재), npm run build 성공
11. **Push** — origin/master push 완료
12. **본 HANDOFF 작성** — 회복/가시성 fix 정리 + IP 차단 별건 PRD 항목 등록

## Decision Log

- **player_client cascade 변경 기각** — 동일 IP egress에서 cascade 변경은 무효. burst 가중 우려까지 있어 advisor 권고 수용
- **2개 atomic 커밋 분리** — fallback recordSuccess + state getter lazy 전이를 한 커밋에 묶지 않음. bisect/revert 단위 보존
- **state getter에 lazy 전이 이동** — 호출 시점 평가로 변경하여 /health/youtube 응답이 실시간 반영. isOpen()도 동일 경로 재사용으로 분기 통일
- **IP 차단은 별건 PRD로 분리** — 본 세션은 회복/가시성 fix만 다룸. proxy/residential IP / per-instance fingerprint 분산은 별도 설계 필요
- **production 자막 추출 미해결** — 본 패치 배포로 회복 메커니즘은 정상 동작하지만 IP cooldown 풀릴 때까지 RATE_LIMITED 지속. 사용자에게 별도 안내

---

**다음 세션 시작 시 권장 순서**:

1. `git log --oneline -8`로 본 세션 커밋(1f82923 / a7fa375 / pack) 확인
2. production /health/youtube 재조회 — circuitBreaker 자연 전이 / consecutiveFailures 정상 작동 확인
3. `58JmiqdPxqE` / `K7QP8LyvEEA` 자막 추출 재시도 — RATE_LIMITED 해소 시점 측정
4. IP 차단 PRD 초안 작성 (proxy/residential IP / per-instance 분산 / throttle)
5. HANDOFF #3/#4/#5 entangled refactor 잔여 항목 식별
6. 쿠키 자동화 + Smithery 마감 항목 점검
