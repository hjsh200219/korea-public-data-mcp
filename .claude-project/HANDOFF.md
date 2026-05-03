---
created: 2026-05-03T16:30:00+09:00
project: k-public-data-mcp
summary: YouTube 쿠키 Railway 32KB 제한 해결 + CI quality-gate 수정 + main() 자동 실행 방지
---

## Session Digest

이 세션에서는 이전 YouTube 안정화 작업(54c7489)을 완료한 후 3가지 CI/배포 이슈를 해결했다:

1. **Railway YOUTUBE_COOKIES 32KB 초과** — 전체 쿠키(553KB)에서 `.youtube.com` 도메인만 필터링(3KB)으로 감소. Railway 환경변수 업데이트 및 재배포 완료. `/health/youtube` 정상 동작 확인 (`status:healthy`, `cookiePool[0]:healthy`).
2. **CI quality-gate 실패** — `verify-docs.ts`의 EXPECTED 예상 값을 실제 값으로 동기화:
   - `skillModules`: 12 → 17
   - `routes` + `openapi`: 8 → 11
   - `apis` + `types`: 8 → 14
3. **Knip dead-code CI** — 미사용 export 7개 제거 (InqryDiv 타입 등):
   - `src/g2b-types.ts`: InqryDiv 제거
   - `src/openlegaldata-types.ts`: unused exports 제거
   - `src/shared.ts`: unused exports 제거
   - `src/tools/skills/{foreign-case-research,procurement,product-review}.ts`: unused exports 제거
   - `src/youtube-api.ts`: unused exports 제거
4. **refresh-youtube-cookies.ts main() 자동 실행 방지** — CLI 직접 실행 시에만 `main()` 호출하도록 `process.argv[1]` 체크 추가. 테스트 import 시 자동 실행으로 인한 unhandled error 방지.

모든 CI 체크 통과 ✅ (fe78351 커밋).

## Progress

### 완료
- Railway YOUTUBE_COOKIES 필터링: 553KB → 3KB (.youtube.com 도메인만)
- Railway 재배포 + `/health/youtube` 정상 동작 확인
- `verify-docs.ts` EXPECTED 카운트 4개 항목 수정 (skillModules, routes, openapi, apis, types)
- Knip dead-code CI 통과 (미사용 export 7개 제거)
- `refresh-youtube-cookies.ts` main() 자동 실행 방지 (`process.argv[1]` 체크)
- 전체 CI 통과: `npm run test`, `npm run build`, quality-gate ✅
- Master 푸시 (fe78351)

### 미완료 (인계)
- Smithery 마켓플레이스 등록 승인 대기 (외부 심사)
- `awesome-mcp-servers` GitHub PR 미제출
- `youtube-api.ts` 파일 분리 follow-up 티켓 (622줄 → transcript/data-api/channel 모듈 분리)

## Next Steps

1. **Smithery 등록 상태 확인**: 마켓플레이스 대시보드 확인 → 승인 시 README/CLAUDE.md 배지·링크 추가
2. **awesome-mcp-servers PR 제출**: GitHub k-public-data-mcp 프로젝트 추가
3. **youtube-api.ts 분리 티켓**: 622줄 단일 파일 → 모듈 분리 (transcript, data-api, channel)
4. **쿠키 만료 모니터링**: Remote 루틴 `trig_013jaxkLuRLDkpk71g49tJxB` (매주 월요일 09:00 KST) 동작 확인

## Blockers

- **Smithery 마켓플레이스 승인 대기**: 외부 심사 프로세스 (액션 불필요, 대시보드 확인만)

## Watch Out

### Railway YOUTUBE_COOKIES 관리
- **도메인 필터**: `.youtube.com`만 유지. `.google.com` 포함 시 Railway 32KB 제한 초과
- **쿠키 갱신 SOP** (만료 시):
  ```bash
  yt-dlp --cookies-from-browser chrome --cookies /tmp/yt_cookies.txt --skip-download "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
  # .youtube.com 라인만 필터링 (~3KB)
  railway variables --set YOUTUBE_COOKIES="$(cat /tmp/yt_filtered.txt)"
  # 또는 scripts/refresh-youtube-cookies.ts 사용
  ```
- **Remote 루틴**: `trig_013jaxkLuRLDkpk71g49tJxB` (매주 월요일 09:00 KST)

### 버전 고정
- **yt-dlp**: `.railway/nixpacks.toml`에서 `2026.03.17` 고정. 업그레이드 시 nightly canary 통과 후 Dockerfile 수동 범프 필요

### 스킬 도구 관리
- **현재 스킬 도구**: 17개 (verify-docs.ts EXPECTED 값 동기화됨)
- **prompts.ts**: 현재 7개. `mcp-server.e2e.test.ts`의 `expect(prompts.length).toBe(7)` 동기화 필수
- **registerSkillTool()**: `outputSchema` 자동 주입 → `structuredContent` 함께 반환
- **text search**: `matchesQuery(title, description, query)` — title+description 토큰 분리 매칭, 대소문자 무시

### YouTube kill switches
- `YOUTUBE_CIRCUIT_BREAKER_ENABLED`: `false`로 즉시 CB 비활성화
- `YOUTUBE_PROBE_ENABLED`: `false`로 즉시 프로브 비활성화

## Files Touched

| 파일 | 변경 사항 | 이유 |
|------|---------|------|
| `.railway/nixpacks.toml` | (이전) | yt-dlp 2026.03.17 버전 고정 |
| `scripts/verify-docs.ts` | EXPECTED 카운트 5개 항목 수정 | skillModules:12→17, routes:8→11, openapi:8→11, apis:8→14, types:8→14 |
| `scripts/refresh-youtube-cookies.ts` | main() 자동 실행 방지 | process.argv[1] 체크 추가 (CI test:coverage 수정) |
| `scripts/refresh-youtube-cookies.test.ts` | 9줄 추가 | 테스트 코드 업데이트 |
| `src/g2b-types.ts` | InqryDiv 제거 | Knip dead-code (미사용 타입) |
| `src/openlegaldata-types.ts` | unused exports 제거 | Knip dead-code |
| `src/shared.ts` | unused exports 제거 | Knip dead-code |
| `src/tools/skills/foreign-case-research.ts` | unused exports 제거 | Knip dead-code |
| `src/tools/skills/procurement.ts` | unused exports 제거 | Knip dead-code |
| `src/tools/skills/product-review.ts` | unused exports 제거 | Knip dead-code |
| `src/youtube-api.ts` | unused exports 제거 | Knip dead-code |
| Railway 환경변수 `YOUTUBE_COOKIES` | 필터링된 쿠키로 업데이트 | 553KB → 3KB (.youtube.com 도메인만) |
| `.claude-project/HANDOFF.md` | 업데이트 | 이전 세션 내용 압축 + 현재 세션 결과 추가 |
| `.claude-project/memory/MEMORY.md` | 2줄 추가 | 쿠키 필터링 및 verify-docs 주의사항 |
| `.claude-project/memory/railway-youtube-cookies-32kb-domain-filter.md` | 신규 (16줄) | Railway 32KB 제한 대응 절차 (도메인 필터링) |
| `.claude-project/memory/verify-docs-expected-counts-sync-requirement.md` | 신규 (15줄) | verify-docs.ts EXPECTED 값 동기화 체크리스트 |
| `AGENTS.md` | 15줄 수정 | 세션 결과 반영 |

## Session Timeline

1. **16:20** — 이전 HANDOFF 인계 (YouTube 안정화 완료)
2. **16:21-16:23** — Railway YOUTUBE_COOKIES 32KB 필터링 + 재배포
3. **16:24-16:25** — CI quality-gate 실패 → verify-docs.ts EXPECTED 값 수정
4. **16:26** — Knip dead-code 7개 export 제거 + refresh-youtube-cookies.ts main() 자동 실행 방지
5. **16:27** — 전체 CI 통과 확인 (fe78351)
6. **16:30** — HANDOFF 작성 및 master 푸시

## Decision Log

- **YOUTUBE_COOKIES 필터 선택: .youtube.com only** — `.google.com` 포함 시 Railway 32KB 제한 초과 (553KB → 3KB). 향후 확장 시 Railway Unlimited 플랜 검토 필요.
- **InqryDiv 타입 제거** — 미사용 (Knip). 향후 필요 시 재추가 가능.
- **refresh-youtube-cookies.ts process.argv[1] 체크** — 테스트 import 시 자동 실행으로 인한 unhandled error 방지. CLI 직접 실행 시에만 main() 호출.

---

**다음 세션 시작 시**:
1. Smithery 마켓플레이스 승인 상태 확인
2. `awesome-mcp-servers` PR 제출 여부 확인
3. YouTube 쿠키 만료 시간 모니터링 (Remote 루틴)
4. YouTube 안정화 메트릭 확인 (cb-circuit-breaker, probe success rate)
