---
created: 2026-05-23T22:58:00+09:00
project: k-public-data-mcp
summary: HIRA search_hospital/search_pharmacy 지역 필터 무동작 → 원격 API가 Q0/Q1 무시함을 확인. 클라이언트 재필터 + 다중 페이지 수집 + 임계값 경고 + clCd 안내 TDD 구현. MCP 서버 매핑은 정상.
---

## Session Digest

사용자 보고: K-Data MCP의 `search_hospital` / `search_pharmacy` 지역 필터(Q0/Q1)가 실제 결과에 반영되지 않음. "MCP 서버 매핑 버그" 주장.

진단 결과 매핑은 정상(`data20-api.filter-query-contract.test.ts` 그린). HIRA 원격 API 자체가 Q0(시도) / Q1(시군구) 파라미터를 받고도 무시하고 전국 결과를 반환하는 동작 확인. clCd(요양기관종별)도 미지정 시 전체 종별이 섞여 일부 종별이 누락되는 현상 함께 노출.

TDD로 다음 4가지 보강:
1. **클라이언트 측 재필터** — 원격 응답을 Q0/Q1 기준으로 한 번 더 좁힘
2. **다중 페이지 수집** — 지역 매칭 결과가 적을 때 후속 페이지까지 끌어와 정확도 확보
3. **임계값 경고** — 수집/필터 결과가 기대보다 적으면 응답에 warning 추가
4. **description 강화 + clCd 안내** — 사용자에게 clCd 지정 권장 문구 명시

E2E 검증:
- 하남 약국: 1건 정확 매칭
- 하남 요양병원 (`clCd=28`): 2건 → 4건 (다중 페이지 효과 입증)

추가로 `numOfRows` 기본 100, REQUEST_TIMEOUT_MS 30s 상향.

## Progress

### 완료 (이번 세션)
- HIRA `search_hospital` / `search_pharmacy` 클라이언트 재필터(Q0/Q1) TDD 구현
- 다중 페이지 수집 로직 (지역 매칭 부족 시 후속 페이지)
- 결과 부족 시 warning 필드 추가
- `description` 문구에 clCd 권장 안내 추가
- `numOfRows` 기본 100 / `REQUEST_TIMEOUT_MS` 30s 적용
- `data20-api.filter-query-contract.test.ts` 그린으로 매핑 정상 확정
- E2E 검증: 하남 약국 (1건), 하남 요양병원 clCd=28 (2→4건)

### 이전 세션 누적 (계속 미해결)
- 🔲 **IP 차단 PRD 작성** (YouTube Railway egress RATE_LIMITED — proxy/residential IP / per-instance 분산 / throttle)
- 🔲 HANDOFF #3/#4/#5 entangled refactor 재평가 (cascade 의도 + null 타입 손실 + 쿠키 풀 미동기)
- 🔲 9-lang `FALLBACK_LANGS` 좁히기 PRD
- 🔲 per-language 분할 호출 검토
- 🔲 쿠키 만료 자동화 PRD (현재 30일 수동)
- 🔲 운영 알람 분기에 `expired` 상태 반영
- 🔲 Smithery 마켓플레이스 승인 + awesome-mcp-servers PR 상태 확인
- 🔲 production 배포 후 `android_vr` 효과 정량 평가 (1주 데이터 누적 필요)

## Next Steps (우선순위 순)

1. **본 세션 패치 배포 + production 검증** — 하남 약국/요양병원 동일 쿼리 재시도, warning 필드 동작 확인
2. **IP 차단 PRD 작성** (YouTube, 별건) — Railway egress IP RATE_LIMITED 구조적 한계 해소 설계
3. **HIRA API 한계 운영 문서화** — 원격 API가 Q0/Q1을 무시하는 사실 + clCd 미지정 시 권장값 표 (docs/ 또는 runbook)
4. **clCd 검색 헬퍼 검토** — 사용자가 종별코드를 모를 때 인지 가능한 키워드(요양병원/한의원/약국 등)로 변환하는 헬퍼 또는 enum hint
5. **다중 페이지 수집 상한선 모니터링** — 페이지 N 초과 시 비용/지연 측정 후 cap 조정
6. **HANDOFF #3/#4/#5 entangled refactor 잔여 항목 식별**
7. **쿠키 자동화 PRD + Smithery / awesome-mcp-servers 마감**

## Blockers

- **HIRA 원격 API 자체 한계** — Q0/Q1 파라미터를 받고도 무시하고 전국 반환. 클라이언트 재필터로 보강했으나 데이터 정확도는 HIRA 응답에 의존
- **clCd 미지정 시 결과 혼재** — 사용자가 종별을 모르면 의도한 결과를 얻기 어려움. description 안내로 완화했으나 UX 한계 잔존
- **Railway egress IP RATE_LIMITED** (YouTube, 이전 세션) — 본 세션과 무관하나 별건 PRD 필요

## Watch Out

### HIRA API 동작 특성 (본 세션 핵심)
- **Q0 / Q1 파라미터는 원격에서 무시됨** — 클라이언트 재필터가 유일한 필터링 수단. 신규 HIRA 엔드포인트 추가 시 동일 패턴 적용 필요
- **clCd 미지정 시 종별 혼재** — 전국 + 전 종별이 numOfRows 한도 내에서 잘림 → 의도한 종별이 페이지 후순위로 밀려 누락 가능
- **다중 페이지 수집 트리거 조건** — 지역 매칭 결과가 기대치 미만일 때 후속 페이지 요청. 비용/지연 trade-off 모니터링 필요
- **`REQUEST_TIMEOUT_MS` 30s 영향 범위** — HIRA 외 다른 데이터20 호출에도 적용됨. 다중 페이지 합산 시간 고려한 값
- **`numOfRows` 100 상향** — 응답 크기 증가 → MCP truncate 8000자 + 페이지네이션 영향 검토
- **warning 필드 추가** — 결과가 임계값 미만이면 응답에 포함. 소비측(클라이언트) 파싱 호환성 검증 필요

### 운영 (이전 세션 잔존)
- Railway egress IP RATE_LIMITED — YouTube 자막 실패 시 우선 의심
- YouTube 쿠키 만료 30일 주기 (현재 잔여) — 알람/크론 자동화 PRD
- Railway `YOUTUBE_COOKIES` 32KB 제한 — `.youtube.com` 도메인만 필터링
- `YOUTUBE_CIRCUIT_BREAKER_ENABLED`, `YOUTUBE_PROBE_ENABLED` kill switch
- Circuit Breaker `state` getter는 lazy 전이 포함 — 외부에서 `_state` 직접 접근 금지
- Python fallback 성공 시 `recordSuccess()` 명시 호출 — 신규 fallback 경로 추가 시 동일 처리
- 429 시 yt-dlp player_client cascade 변경 **금지** (동일 IP egress 무효)
- `src/youtube-cookie-pool.ts` getHealthInfo 상태 분류 변경 시 → /health/youtube 스키마 동기화
- `src/youtube-probe.ts` errorCode 길이 (200자) 변경 시 → 로그/알람 임계값 재확인
- cascade 순서 변경 시 `src/youtube-api.test.ts` 5건 동기화
- `TranscriptError` 코드 분류 변경 시 `INFRA_ERRORS` 동기화
- `docs/runbook-youtube.md` 에러 코드 표 + cascade 표 + "expired status 의미" 동시 갱신

## Files Touched

| 파일 | 변경 사항 | 상태 |
|------|---------|------|
| `src/tools/data20-api.ts` | search_hospital / search_pharmacy 클라이언트 재필터 + 다중 페이지 수집 + warning | 수정 |
| `src/tools/data20-api.filter-query-contract.test.ts` | 매핑 정상 회귀 테스트 (그린으로 매핑 버그 부정) | 검증 |
| `src/tools/data20-api.test.ts` | 재필터 / 다중 페이지 / warning TDD 케이스 추가 | 수정 |
| (tool 등록부) | `description` 강화 + clCd 권장 안내 + `numOfRows` 기본 100 | 수정 |
| (config/env) | `REQUEST_TIMEOUT_MS` 30s 상향 | 수정 |
| `.claude-project/HANDOFF.md` | 본 인계서 (2026-05-23) | 수정 |

## Session Timeline

1. **보고** — 사용자: K-Data MCP `search_hospital` / `search_pharmacy` 지역 필터 미작동, "MCP 매핑 버그" 주장
2. **진단 #1** — `data20-api.filter-query-contract.test.ts` 그린 확인 → 매핑 정상
3. **진단 #2** — HIRA 원격 API 직접 호출 → Q0/Q1 명시해도 전국 결과 반환 확정
4. **진단 #3** — clCd 미지정 시 종별 혼재로 의도한 종별이 페이지 후순위로 밀림 확인
5. **TDD #1** — 클라이언트 재필터 Red → Green
6. **TDD #2** — 다중 페이지 수집 Red → Green
7. **TDD #3** — 임계값 경고(warning) Red → Green
8. **개선** — description에 clCd 권장 안내, numOfRows 100, REQUEST_TIMEOUT_MS 30s
9. **E2E** — 하남 약국 (1건 정확) / 하남 요양병원 clCd=28 (2→4건, 다중 페이지 효과)
10. **본 HANDOFF 작성** — HIRA API 한계 + 보강 4종 + 운영 주의사항 정리

## Decision Log

- **매핑 버그 주장 기각** — `filter-query-contract.test.ts` 그린이 매핑 정상의 결정적 증거. HIRA 원격 동작이 근본 원인
- **클라이언트 재필터 채택** — HIRA가 Q0/Q1을 받고도 무시하므로 응답 데이터에 한해 재필터링이 유일한 정확도 보강 수단
- **다중 페이지 수집** — 단일 페이지에서 지역 매칭이 부족하면 응답 빈약. 후속 페이지까지 끌어와 사용자 의도 충족
- **warning 필드 신규 추가** — silently 빈 결과 반환 대신 명시적 신호. 운영/디버깅 시 HIRA 한계 즉시 파악 가능
- **clCd 안내는 description으로** — 별도 enum 강제는 과한 변경. 사용자 선택권 유지하면서 권장값 제시
- **`numOfRows` 100 / `REQUEST_TIMEOUT_MS` 30s** — 다중 페이지 수집 + 재필터 비용 흡수 위한 여유. 기존 도메인 영향 모니터링 항목으로 등록

---

**다음 세션 시작 시 권장 순서**:

1. `git log --oneline -8`로 본 세션 커밋 확인
2. production 배포 후 하남 약국/요양병원 동일 쿼리 재검증 (warning 필드 동작 포함)
3. HIRA API 한계 + clCd 권장값 표를 `docs/` 또는 runbook에 정리
4. clCd 검색 헬퍼/enum hint 설계 검토
5. 다중 페이지 수집 비용/지연 측정 후 cap 결정
6. IP 차단 PRD (YouTube, 별건) 초안 작성
7. HANDOFF #3/#4/#5 entangled refactor 잔여 항목 식별
8. 쿠키 자동화 + Smithery 마감 항목 점검
