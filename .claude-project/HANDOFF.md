---
created: 2026-05-18T15:30:00+09:00
project: k-public-data-mcp
summary: YouTube /health 만료 쿠키 노출 + probe errorCode 200자 확장 (production 진단성 개선)
---

## Session Digest

사용자가 production에서 `K7QP8LyvEEA` 자막 추출 실패를 보고. 진단 결과 두 가지 production-only 가시성 버그 발견:

1. `/health/youtube`가 쿠키 만료(`expiresIn: "-12d"`)에도 `status: "healthy"`로 분류 — 운영자가 만료를 놓침
2. probe `errorCode`가 50자 truncate로 실제 yt-dlp 실패 메시지(PO Token / bot check 등) 가림

로컬 재현은 성공(android_vr → ko 246 segs) → production 한정 문제로 확정. TDD로 2개 atomic 커밋(4eea7b8, 5a58b31) 작성, 26/26 youtube 테스트 + 전체 그린, origin/master push 완료 → Railway 자동 재배포 트리거됨.

쿠키 갱신(`npm run refresh:cookies`) + Railway env 업데이트 + 배포 검증은 **사용자 액션 대기 중**.

## Progress

### 완료
- **4eea7b8** — `fix: 만료된 YouTube 쿠키 상태 'expired'로 노출` (`src/youtube-cookie-pool.ts` getHealthInfo) — 만료된 쿠키를 `healthy`로 분류하던 버그 수정
- **5a58b31** — `fix: YouTube probe errorCode truncate 50자 → 200자` (`src/youtube-probe.ts`) — 실제 실패 사유(PO_TOKEN / bot check) 노출
- 26/26 youtube 테스트 통과, 전체 스위트 그린
- `git push origin master` (264c67b..5a58b31) → Railway auto-redeploy 트리거

### 진단 결과 (production-only)
- production `/health/youtube` 응답: `cookies.expiresIn: "-12d"` + `status: "healthy"` ← 분류 버그
- probe errorCode 50자에서 잘려 실제 yt-dlp 에러 가림
- 로컬: android_vr 클라이언트로 `K7QP8LyvEEA` 정상 추출 (ko 246 segs) → 코드 정상, 환경 차이

### 미완료 (사용자 액션 대기)
- 🔲 **Task 1/3**: `npm run refresh:cookies -- --browser chrome` 로컬 실행
- 🔲 **Task 2/3**: Railway `YOUTUBE_COOKIES` env 갱신값으로 업데이트
- 🔲 **Task 3/3**: 배포 후 `/health/youtube`에서 `expired` 노출 + 200자 errorCode 확인

### 이전 세션 누적 (미해결)
- 🔲 HANDOFF #3/#4/#5 entangled refactor 재평가 (cascade 의도 + null 타입 손실 + 쿠키 풀 미동기) — 이전 세션 outcome 타입 도입으로 일부 자연 해결 가능성
- 🔲 9-lang `FALLBACK_LANGS` 좁히기 PRD (RATE_LIMITED 빈도 높을 시)
- 🔲 per-language 분할 호출 검토
- 🔲 Smithery 마켓플레이스 승인 + awesome-mcp-servers PR 상태 확인
- 🔲 production 배포 후 `android_vr` 효과 정량 평가 (이전 세션 미완료)

## Next Steps (우선순위 순)

1. **쿠키 갱신 3-step 완료** (사용자 액션) — refresh:cookies → Railway env 업데이트 → /health 검증. 이게 끝나야 K7QP8LyvEEA 본 문제 해결 확정
2. **production /health/youtube 재확인** — 본 세션 가시성 패치(만료 노출 + 200자 errorCode) 효과 확인. expired 카운트 + errorCode 본문 확보
3. **HANDOFF #3/#4/#5 재평가** — 이전 세션 cascade 변경 + outcome 타입 도입으로 잔여 항목 추려서 entangled refactor 진행
4. **android_vr 효과 + RATE_LIMITED 빈도 모니터링** — 1주 운영 데이터 누적 후 FALLBACK_LANGS 좁히기 / per-language 분할 의사결정
5. **Smithery / awesome-mcp-servers 마감**

## Blockers

- 쿠키 갱신은 사용자 로컬 chrome 접근 필요 → 자동화 불가
- Railway env 업데이트 후 재배포 완료까지 검증 불가 (2-3분 대기)
- 가시성 패치 효과는 production 트래픽 누적 후 확인 가능

## Watch Out

### 본 세션 패치 동기화 포인트
- `src/youtube-cookie-pool.ts` getHealthInfo `status` 분류 로직 변경 시 → `/health/youtube` 응답 스키마 문서 동기화 필요
- `src/youtube-probe.ts` errorCode 길이 변경 시 → 로그 저장소/모니터링 알람 임계값 재확인 (200자 가정)
- `docs/runbook-youtube.md`의 헬스체크 섹션에 "expired status 의미" 추가 검토

### 운영
- 쿠키 만료 30일 주기 — 알람/크론 자동화 검토 (현재 수동)
- Railway `YOUTUBE_COOKIES` 32KB 제한 — `.youtube.com` 도메인만 필터링 룰 유지
- `YOUTUBE_CIRCUIT_BREAKER_ENABLED`, `YOUTUBE_PROBE_ENABLED` kill switch 위치 (env)

### 이전 세션 잔존
- cascade 순서 변경 시 `src/youtube-api.test.ts` 5건 동기화
- `TranscriptError` 코드 분류 변경 시 `src/youtube-circuit-breaker.ts`의 `INFRA_ERRORS` 동기화
- `docs/runbook-youtube.md` 에러 코드 표 + cascade 표 동시 갱신

## Files Touched

| 파일 | 변경 사항 | 상태 |
|------|---------|------|
| `src/youtube-cookie-pool.ts` | getHealthInfo: 만료 쿠키 `expired` 상태 노출 | 수정 |
| `src/youtube-probe.ts` | errorCode truncate 50 → 200자 | 수정 |
| `src/youtube-cookie-pool.test.ts` | expired 상태 테스트 추가 | 수정 |
| `src/youtube-probe.test.ts` | 200자 truncate 테스트 갱신 | 수정 |
| `.claude-project/HANDOFF.md` | 본 인계서 갱신 | 수정 |

## Session Timeline

1. **보고** — 사용자: production에서 `K7QP8LyvEEA` 자막 추출 실패
2. **진단** — production `/health/youtube` 조회 → `expiresIn: "-12d"` + `status: "healthy"` 모순 발견. probe errorCode 50자 truncate로 실제 사유 가려짐
3. **로컬 재현** — android_vr 클라이언트로 정상 추출 → production-only 환경 문제 확정
4. **TDD #1** — 4eea7b8: 만료 쿠키 `expired` 상태 노출
5. **TDD #2** — 5a58b31: errorCode 200자 확장
6. **검증** — 26/26 youtube + 전체 그린
7. **Push** — origin/master 264c67b..5a58b31, Railway 자동 재배포
8. **인계** — 본 HANDOFF 작성, 사용자에게 3-step 액션 패스

## Decision Log

- **`expired` 별도 상태 도입**: `healthy`/`degraded`로 합치는 대신 명시적 분리 → 운영 알람 분기 단순화
- **200자 errorCode**: 50자는 PO Token / bot check 메시지 잘림. 200자면 yt-dlp 표준 메시지 거의 보존하면서도 헬스 응답 크기 영향 미미
- **2개 atomic 커밋 분리**: 가시성 버그 두 개를 한 커밋에 묶지 않음 — bisect / revert 단위 보존
- **쿠키 갱신은 사용자 위임**: 로컬 chrome 접근 필요 + 자격증명 민감 → agent 자동 실행 회피

---

**다음 세션 시작 시 권장 순서**:

1. `git log --oneline -5`로 본 세션 커밋 2건(4eea7b8/5a58b31) 확인
2. 사용자에게 쿠키 갱신 3-step 완료 여부 확인 (Task 1/2/3)
3. production `/health/youtube` 재조회 → `expired` 노출 + 200자 errorCode 검증
4. (완료 시) `K7QP8LyvEEA` production 재추출 확인 → 본 이슈 클로즈
5. HANDOFF #3/#4/#5 entangled refactor 잔여 항목 식별
6. android_vr 효과 + RATE_LIMITED 빈도 1주 데이터 누적 후 FALLBACK_LANGS 의사결정
7. Smithery / awesome-mcp-servers 상태 점검 마감
