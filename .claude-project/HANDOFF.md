---
created: 2026-05-07T00:00:00+09:00
project: k-public-data-mcp
summary: 자막 추출 cascade 차단 사유 보존 + android_vr 1순위 추가로 PO Token 우회
---

## Session Digest

사용자가 YouTube 영상 `Bgxsx8slDEA` 자막 추출 실패에 대해 캐시 재활성화를 요청한 것이 시작점이었으나, 진단 결과 "자막 비활성화"는 잘못된 메시지였고 실제 원인은 PO Token 요구로 인한 cascade 전체 차단이었다.

세 가지 작업을 완료했다: ① Algrow MCP PRD 폐기 (의사결정 결과 미채택), ② cascade 차단 사유를 정확한 에러 코드(PO_TOKEN_REQUIRED 등)로 분류해 보존, ③ yt-dlp cascade에 `android_vr` 클라이언트를 1순위로 추가해 PO Token 요구를 우회.

라이브 검증은 `dQw4w9WgXcQ`로 OK 확인. 원본 영상 `Bgxsx8slDEA`은 IP rate limit으로 로컬 미검증 — production 배포 후 재확인 필요.

## Progress

### 완료
- 936ebc0 — `chore: drop algrow MCP feasibility PRD` (Option 미채택 결정 → PRD 파일 + index 항목 제거, 17개 스킬 슬롯 영향 없음)
- 2ab2af6 — `fix: 자막 추출 캐스케이드 차단 사유 보존` (PO_TOKEN_REQUIRED / RATE_LIMITED / BOT_CHECK / INFRA_ERROR 정확 분류, outcome 타입 도입으로 null 반환 시 타입 정보 손실 해결)
- 3c83b1f — `fix: yt-dlp 캐스케이드에 android_vr 1순위 추가` (PO Token 미요구 클라이언트로 우회, bgutil 사이드카 불필요 결론 — 월 $1.50~$2.80 절약)

### 검증
- 58/58 youtube-api 테스트 통과
- 882/887 전체 테스트 통과 (5개는 사전 무관 skip)
- 라이브: `dQw4w9WgXcQ` → OK lang=en segs=61
- `Bgxsx8slDEA` 자체는 IP rate limit으로 로컬 라이브 미검증 (production 추후 확인)

### 미완료 (인계)
- 🔲 production 배포 후 PO_TOKEN_REQUIRED / RATE_LIMITED 빈도 모니터링 — `android_vr` 효과 정량 평가
- 🔲 (이전 세션부터 누적) HANDOFF #3/#4/#5 entangled refactor 재평가
  - #3 클라이언트 캐스케이드 의도 검토 (쿠키 유무 → tv/web vs android)
  - #4 PO Token/bot 경로 null 반환 시 타입 정보 미보존
  - #5 에러 시 `markCurrentFailed()` 미호출로 쿠키 풀 미동기
  - **재평가 사유**: 본 세션의 outcome 타입 도입(#4)과 cascade 변경(#3)으로 일부 자연 해결 가능성. 다음 세션에서 잔여분 식별 필요
- 🔲 9-lang `FALLBACK_LANGS` 좁히기 PRD (RATE_LIMITED 빈도가 운영 데이터로 높게 나올 경우)
- 🔲 per-language 분할 호출 검토 (위와 동일 트리거)
- 🔲 (이전 세션부터 누적) Smithery 마켓플레이스 승인 + awesome-mcp-servers PR 상태 확인

## Next Steps (우선순위 순)

1. **production 배포 + 모니터링** — PO_TOKEN_REQUIRED / RATE_LIMITED / BOT_CHECK 빈도 추적, `android_vr` 1순위 효과 측정 (최소 1주 데이터)
2. **HANDOFF #3/#4/#5 재평가** — 본 세션의 cascade 변경 + outcome 타입 도입으로 일부 해결됐을 가능성. 코드 정독 후 잔여 항목만 추려서 entangled refactor 진행
3. **(필요 시) 9-lang RATE_LIMITED 빈도가 높으면** `FALLBACK_LANGS` 좁히기 또는 per-language 분할 호출 PRD 작성
4. **Smithery / awesome-mcp-servers 상태 점검** — 누적 중인 외부 등록 작업 마감

## Blockers

- production 배포 + 운영 데이터 누적 전엔 `android_vr` 효과 정량 평가 불가 (Next Step #1 선행 필요)
- IP rate limit (로컬 테스트로 동일 영상 반복 시 발생) — 라이브 검증 시 영상 다양화 권장

## Watch Out

### Cascade / 에러 코드 변경 시 동기화 포인트
- `src/youtube-api.ts:404-408` cascade 순서 변경 시 → `src/youtube-api.test.ts`의 cascade 순서 테스트 5건 함께 갱신
- `TranscriptError` 코드 분류 변경 시 → `src/youtube-circuit-breaker.ts`의 `INFRA_ERRORS` 동기화
- `docs/runbook-youtube.md`에 6개 에러 코드 표 + cascade 표 신규 추가됨 → cascade/에러 코드 변경 시 표도 같이 갱신 필수

### bgutil 사이드카 결론
- 본 세션 결론: `android_vr` 우회로 충분 → bgutil 불필요 (월 $1.50~$2.80 절약)
- **재검토 트리거**: yt-dlp가 `android_vr`도 막거나 PO Token 요구를 확장하는 경우

### 일반
- `verify-docs.ts` EXPECTED 카운트는 본 세션 변경 없음 (스킬·액션 개수 불변)
- 9-lang FALLBACK_LANGS는 현재 유지 — 운영 데이터 보고 좁힐지 결정

## Files Touched

| 파일 | 변경 사항 | 상태 |
|------|---------|------|
| `src/youtube-api.ts` | cascade에 `android_vr` 1순위 추가 + outcome 타입 + cascadeMessage 보존 | 수정 |
| `src/youtube-api.test.ts` | 테스트 6건 변경/추가 (cascade 순서 + outcome 분류) | 수정 |
| `docs/runbook-youtube.md` | 6개 에러 코드 표 + cascade 표 신규 | 수정 |
| `docs/product-specs/index.md` | Algrow 항목 제거 | 수정 |
| `docs/product-specs/algrow-mcp-feasibility.md` | 삭제 (PRD 폐기) | 삭제 |
| `.gitignore` | `.claude/` 추가 | 수정 |
| `.claude-project/HANDOFF.md` | 본 인계서 갱신 | 수정 |

## Session Timeline

1. **요청** — `Bgxsx8slDEA` 자막 추출 실패 + 캐시 재활성화 요청
2. **진단** — "자막 비활성화" 메시지가 실제 원인을 가리고 있음을 발견. 실제는 cascade 전체가 PO Token 요구로 차단
3. **PRD 폐기** — Algrow PRD 미채택 결정 → 파일/인덱스 제거 (936ebc0)
4. **차단 사유 보존** — outcome 타입 도입으로 PO_TOKEN_REQUIRED 등 정확 분류 (2ab2af6)
5. **android_vr 우회** — cascade 1순위에 추가, bgutil 사이드카 불필요 결론 (3c83b1f)
6. **검증** — 58/58 youtube-api, 882/887 전체, 라이브 `dQw4w9WgXcQ` OK
7. **Pack** — 본 인계서 작성

## Decision Log

- **Algrow PRD 폐기**: 핵심 기능 이미 동등 + 우리 페르소나에 어긋남 + 운영 부담 → Option 미채택 확정
- **android_vr 우선**: PO Token 미요구 클라이언트로 우회. bgutil 사이드카(월 $1.50~$2.80) 추가 운영 부담 회피
- **outcome 타입 도입**: null 반환 시 타입 정보 손실 문제 구조적 해결 — HANDOFF #4 자연 해결 가능성
- **runbook 표 신규**: 6개 에러 코드 + cascade 표를 운영 가시성용으로 추가 — 변경 시 동기화 룰 명시

---

**다음 세션 시작 시 권장 순서**:

1. `git log --oneline -5`로 본 세션 커밋 3건(936ebc0/2ab2af6/3c83b1f) 확인
2. production 배포 상태 + 운영 로그에서 PO_TOKEN_REQUIRED·RATE_LIMITED·BOT_CHECK 빈도 점검 (`android_vr` 효과 측정)
3. `src/youtube-api.ts` + `src/youtube-circuit-breaker.ts` 정독 후 HANDOFF #3/#4/#5 잔여 항목만 추려서 entangled refactor 범위 확정
4. (운영 데이터에 따라) 9-lang FALLBACK_LANGS 좁히기 PRD 또는 per-language 분할 호출 검토
5. Smithery / awesome-mcp-servers 상태 점검 마감
