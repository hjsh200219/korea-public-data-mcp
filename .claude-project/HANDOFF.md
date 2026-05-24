---
created: 2026-05-25T08:35:00+09:00
project: k-public-data-mcp
summary: HIRA Q0/Q1 한글 → raw sidoCd/sgguCd 자동 매핑 (17 시도+254 시군구) — 하남 약국 1건→131건 정상화
---

## Session Digest
HIRA 약국/병원 API의 Q0/Q1(한글) 무시 문제를 정적 매핑 테이블(17 시도 + 254 시군구)로 우회 해결. 하남시 약국 검색 1건 → 131건 정상화. 이전 메모리 노트(`sidoCd/sgguCd도 무시`)는 잘못된 가정이었음을 production 검증으로 확정 — 실제로는 한글 Q0/Q1만 무시되고 raw 6자리 코드는 서버측 필터 정상 동작.

## Progress

### 완료 (이번 세션)
- 근본 원인 확정 (production curl 검증): HIRA `getParmacyBasisList`/`getHospBasisList`가 Q0/Q1(한글)을 무시하지만 raw `sidoCd`/`sgguCd` (6자리 HIRA 코드)는 서버측 필터 정상 동작
  - 무필터 25744 → sidoCd=310000(경기) 6044 → +sgguCd=311300(하남시) 131
- `src/hira-region-codes.ts` 신규: 17 시도 + 254 시군구 매핑 (자치구 분리 보존: 수원 4구, 부산 16구/군, 대구 9구/군, 인천 10구/군, 광주 5구, 대전 5구, 울산 5구/군, 창원 5구, 화성 4구, 청주 4구, 천안 2구, 전주 2구, 포항 2구, 고양 3구, 부천 3구, 성남 3구, 안산 2구, 안양 2구, 용인 3구)
- `resolveHiraRegionCode()` + `applyRegionCodeMapping()`: 한글 → raw 코드 변환. 매핑 성공 시 raw 주입+Q0/Q1 비움+단일 페이지, 실패 시 기존 다중 페이지+클라이언트 재필터 폴백. 사용자가 raw 코드 직접 입력 시 매핑 skip
- `scripts/harvest-hira-region-codes.ts` 신규: 재사용 가능 코드 수집기 (rate-limit-safe 5s 딜레이, DRY_RUN, CLI 가드)
- 부분명 자동 보강: "하남" → "하남시" suffix 시/군/구 자동 시도
- TDD: 신규 23건 (resolver 17 + handler 6), 기존 stale 테스트 3건 부산/해운대구로 변경 (자치구 분리 미스로 폴백 경로 검증)
- 검증: 918 pass / 5 skip, lint/type/build/verify-docs 모두 OK
- 메모리 정정: `hira-region-filter-server-side-ignored.md` (Q0/Q1만 무시, raw 동작 명시)
- Memory 신규 5건: encoding pattern / static-mapping / harvester pattern / resolve-fallback / region investigation checklist
- CLAUDE.md(AGENTS.md): HIRA 매핑 컨벤션 + 자동 생성 파일 직접 수정 금지 항목 추가
- Commit 649ca94 master 푸시 완료

### 이전 세션 누적 (계속 미해결)
- 🔲 **IP 차단 PRD 작성** (YouTube Railway egress RATE_LIMITED — proxy/residential IP / per-instance 분산 / throttle)
- 🔲 HANDOFF #3/#4/#5 entangled refactor 재평가
- 🔲 9-lang `FALLBACK_LANGS` 좁히기 PRD
- 🔲 per-language 분할 호출 검토
- 🔲 쿠키 만료 자동화 PRD (현재 30일 수동)
- 🔲 운영 알람 분기에 `expired` 상태 반영
- 🔲 Smithery 마켓플레이스 승인 + awesome-mcp-servers PR 상태 확인
- 🔲 production 배포 후 `android_vr` 효과 정량 평가 (1주 데이터 누적 필요)
- 🔲 clCd 검색 헬퍼/enum hint 설계 검토 (HIRA 종별코드 사용자 인지 보조)

## Next Steps (우선순위)

1. **Production 재배포 (Railway) 후 MCP E2E 검증** — 하남시 + 추가 3~5개 시군구 샘플 (부산해운대구, 대구중구, 수원영통구, 광주광산구, 천안서북구). `search_pharmacy`/`search_hospital` 둘 다 raw 매핑 동작 확인
2. **`handleSearchAnimalHospital` 매핑 적용 검토** — 별도 경로로 분기되어 현재 미적용. 동물병원도 같은 HIRA Q0/Q1 무시 가능성. raw curl로 재현 확인 후 결정
3. **`package.json` 스크립트 추가**: `"harvest:hira-region-codes": "tsx scripts/harvest-hira-region-codes.ts"` (재생성 표준화), Quick Start에 노출
4. **다른 지역검색 도메인 점검** — 한국관광공사 KorService2, 조달처 나라장터 등도 Q0/Q1 무시 패턴 의심. 진단 우선순위는 `[[user-bug-report-region-keyword-investigation-checklist]]`
5. **신규 시군구 대응 가이드 문서화** — `docs/runbook-hira.md` 신설 또는 `src/hira-region-codes.ts` 상단 주석에 절차 명시 (harvest 재실행 → 빌드 → 테스트)
6. **HIRA clCd 헬퍼/enum hint 설계** (이전 세션 누적)
7. **IP 차단 PRD 작성** (YouTube 별건)
8. **HANDOFF #3/#4/#5 entangled refactor 잔여 식별, 쿠키 자동화 + Smithery 마감**

## Blockers
없음.

## Watch Out

### HIRA 매핑 (본 세션 핵심)
- HIRA `sidoCd`/`sgguCd`는 **HIRA 자체 6자리 코드** — 행안부 법정동코드(10자리)와 절대 혼동 금지 (메모리 `hira-sido-sggu-code-encoding-pattern`)
- 일반구/광역시 자치구는 prefix 결합 (성남수정 ≠ 수정, 부산해운대구 ≠ 해운대구) — 단순 "해운대구" Q1 입력은 매핑 안 됨 (suffix 자동 보강은 시/군/구 추가만 시도)
- `handleSearchAnimalHospital`은 현재 별도 경로로 매핑 미적용 — Q0/Q1 입력 시 같은 버그 재현 가능성
- harvest 스크립트는 rate-limit 보호되어 있으나 운영 시간 대량 호출 시 일시 차단 가능 — 야간/저트래픽 시간대 권장
- 매핑 테이블이 정적 → 신규 시군구 발생 시 harvest 재실행 + 빌드 + 테스트 필요 (verify-docs EXPECTED는 영향 없음)
- MCP 응답 8000자 truncate 유지 — 131건 약국도 `truncateWindow()` 페이지네이션으로 노출됨, E2E 시 offset 순회 확인

### 운영 (이전 세션 잔존)
- Railway egress IP RATE_LIMITED — YouTube 자막 실패 시 우선 의심
- YouTube 쿠키 만료 30일 주기 (현재 잔여) — 알람/크론 자동화 PRD
- Railway `YOUTUBE_COOKIES` 32KB 제한 — `.youtube.com` 도메인만 필터링
- `YOUTUBE_CIRCUIT_BREAKER_ENABLED`, `YOUTUBE_PROBE_ENABLED` kill switch
- Circuit Breaker `state` getter는 lazy 전이 포함 — 외부에서 `_state` 직접 접근 금지
- Python fallback 성공 시 `recordSuccess()` 명시 호출
- 429 시 yt-dlp player_client cascade 변경 **금지** (동일 IP egress 무효)
- `src/youtube-cookie-pool.ts` getHealthInfo 상태 분류 변경 시 → /health/youtube 스키마 동기화
- `src/youtube-probe.ts` errorCode 길이 (200자) 변경 시 → 로그/알람 임계값 재확인
- cascade 순서 변경 시 `src/youtube-api.test.ts` 5건 동기화
- `TranscriptError` 코드 분류 변경 시 `INFRA_ERRORS` 동기화
- `docs/runbook-youtube.md` 에러 코드 표 + cascade 표 + "expired status 의미" 동시 갱신

## Files Touched

| 파일 | 변경 사항 | 상태 |
|------|---------|------|
| `src/hira-region-codes.ts` | 17 시도 + 254 시군구 매핑 + resolveHiraRegionCode() | 신규 (자동 생성) |
| `src/hira-region-codes.test.ts` | resolver 단위 테스트 17건 | 신규 |
| `src/tools/skills/public-data.ts` | applyRegionCodeMapping() 통합, 매핑 성공 시 단일 페이지 + Q0/Q1 비움 | 수정 |
| `src/tools/skills/public-data.test.ts` | handler 매핑 경로 6건 추가, 기존 폴백 3건 부산/해운대구로 갱신 | 수정 |
| `scripts/harvest-hira-region-codes.ts` | rate-limit-safe 수집기 (DRY_RUN, CLI 가드) | 신규 |
| `AGENTS.md` (CLAUDE.md 심볼릭) | HIRA 매핑 + 자동 생성 파일 규칙 2건 추가 | 수정 |
| `~/.claude/projects/.../memory/MEMORY.md` | 5건 신규 + 1건 갱신 | 수정 |
| `.claude-project/HANDOFF.md` | 본 인계서 (2026-05-25) | 수정 |

## Session Timeline

1. **보고** — 사용자: "하남 약국 검색" → 이전 세션 코드(클라이언트 재필터)로 1건만 나옴
2. **메모리 확인** — `hira-region-filter-server-side-ignored.md`에 "sidoCd/sgguCd도 무시" 기록 발견 → 의심 보류
3. **옵션 분석** — 4가지 (페이지 상한 상향, raw sgguCd 검증, 매핑 테이블, 다른 API) → "raw 검증" 추천 (메모리 미검증 가정)
4. **production curl 검증** — sidoCd=310000 단독 → 25744→6044 (경기) / +sgguCd=311300 → 131 (하남시). **메모리 노트 오류 확정**
5. **하남시 sgguCd 확보** — 경기도 페이징 스캔으로 311300 발견
6. **advisor 호출** — 정적 매핑 vs 동적 학습 결정. 정적 권장 + 사용자에게 즉시 답변 + 코드 fix 병행
7. **메모리 정정** — Q0/Q1만 무시, raw 동작 명시
8. **TDD RED** — `src/hira-region-codes.test.ts` 17건 + handler 매핑 6건 (RED 확인)
9. **TDD GREEN** — `src/hira-region-codes.ts` 신규 + handler `applyRegionCodeMapping()` 통합
10. **기존 stale 테스트 갱신** — 폴백 검증을 부산/해운대구(매핑 안 됨)로 변경
11. **harvester 스크립트 작성** — DRY_RUN smoke (경기 1분, 47 sggu) → 풀 harvest (17 시도, 254 sggu)
12. **자동 생성 매핑 통합** — `src/hira-region-codes.ts` 자동 덮어쓰기, 기존 seed 테스트 모두 유효
13. **최종 검증** — 918 pass / lint / type / build / verify-docs 모두 OK
14. **commit 649ca94** — master 푸시
15. **Pack** — 5 에이전트 병렬 분석, Memory 5건 신규 + HANDOFF + AGENTS.md 컨벤션 추가

## Decision Log

- **메모리 노트 의심 보류 → production 검증** — 메모리 신뢰성보다 raw 데이터 검증 우선. 결과적으로 메모리 오류 발견 및 정정
- **정적 매핑 채택 (advisor 권장)** — 런타임 학습은 (a) cold-start (b) 캐시 무효화 복잡 (c) 외부 호출 부담. HIRA 코드는 변동성 거의 없음 → 정적이 정답
- **부분명 자동 보강만 도입 ("하남" → "하남시")** — 풀 퍼지 매칭은 안 함 (예측 가능성 우선)
- **매핑 실패 시 기존 폴백 유지** — 100% 매핑 보장 어려운 도메인에서 graceful degradation 확보 ([[resolve-then-fallback-translation-pattern]])
- **자치구 분리 보존** — 성남수정/성남중원/성남분당 별개 코드 그대로 (HIRA 명세 그대로). 사용자가 "성남" 검색 시 매핑 실패 → 폴백으로 클라이언트 재필터에서 흡수
- **harvester를 별도 스크립트로 분리** — 운영 호출 경로와 격리, rate-limit-safe + 재현 가능성 확보
- **자동 생성 파일 직접 수정 금지를 AGENTS.md 컨벤션에 명시** — 다음 harvest 시 손실 방지

---

**다음 세션 시작 시 권장 순서**:

1. `git log --oneline -10`으로 본 세션 커밋(649ca94) 확인
2. Railway production 재배포 후 MCP `search_pharmacy`/`search_hospital` E2E (하남시 + 3~5 시군구 샘플)
3. `handleSearchAnimalHospital` raw 매핑 적용 검토 (curl 재현 우선)
4. `package.json`에 `harvest:hira-region-codes` 스크립트 등록
5. 다른 지역검색 도메인 (관광공사 KorService2, 나라장터) 동일 패턴 점검
6. HIRA clCd 헬퍼/enum hint 설계
7. IP 차단 PRD + entangled refactor + 쿠키 자동화 + Smithery 잔여 항목
