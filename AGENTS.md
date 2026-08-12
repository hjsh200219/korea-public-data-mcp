---
description: K Public Data MCP 프로젝트 규칙 - 한국 공공데이터 MCP 서버 (해외 판례 보조 포함)
globs:
alwaysApply: true
---

> Be concise. No filler. Straight to the point. Use fewer words.

# public-data-mcp

K public data MCP server (법제처 + DART 전자공시 + 공공데이터포털 + 관세청 UNI-PASS + 수출입은행 + 농림축산식품부 + 금융감독원 금융상품 비교공시 + 금융위원회 보험상품 공시 + 조달청 나라장터 + YouTube 자막/메타데이터 + 해외 판례 CourtListener·OpenLegalData + 한국관광공사 KorService2 + 쿠팡 파트너스 상품리뷰 + 정부24 plus AI 민원 검색).

## Quick Start

```bash
npm run build           # TypeScript -> dist/
npm run start:stdio     # MCP stdio mode (local)
npm start               # HTTP mode (Railway deploy)
npm run dev             # Dev with tsx (stdio)
npm run dev:remote      # Dev with tsx (HTTP)
npm run canary:ytdlp    # yt-dlp 연결 상태 점검
npm run refresh:cookies # YouTube 쿠키 풀 갱신
```

## Docs

| | |
|--|--|
| [docs/source-map.md](docs/source-map.md) | 파일 구조, 도메인 목록, 레이어 다이어그램 |
| [docs/env.md](docs/env.md) | 환경변수 전체 목록 |
| [docs/dev-guidelines.md](docs/dev-guidelines.md) | 코딩 행동 지침 |
| [ARCHITECTURE.md](ARCHITECTURE.md) | 시스템 다이어그램, 외부 의존성 |
| [docs/design-docs/layer-rules.md](docs/design-docs/layer-rules.md) | import 규칙 |
| [docs/QUALITY.md](docs/QUALITY.md) | 품질 평가 |
| [docs/runbook-youtube.md](docs/runbook-youtube.md) | YouTube 운영 런북 (쿠키/CB/프로브) |

## Conventions

- Korean comments for domain-specific logic
- 스킬 도구: 19개 의도 기반, `action` enum으로 세부 동작 선택
- Contract tests (`*.contract.test.ts`): 도메인별 env var (`ASSEMBLY_API_KEY` 등) 있을 때만 실행 — `describe.skipIf(!process.env.X)` 패턴으로 CI baseline 영향 0
- 스킬 등록: `server.tool()` 대신 `registerSkillTool()` (`tools/skills/_shared.ts`) 사용
- 스킬 도구 `title`/`description`: 이중 언어 형식 — `"English / 한글"` (title), `"English desc. / 한글 설명"` (description)
- REST routes: `kebab-case`
- Error responses: `isError: true` with Korean messages
- Domain files: `{domain}-api.ts` + `{domain}-types.ts`
- MCP responses: 8000자 truncate (`truncateWindow()`로 offset 페이지네이션)
- `youtube.md` 채널 목록: `# 주석` 줄로 그룹핑 가능 (`parseYoutubeMdChannels`가 자동 무시)
- 스킬 내 텍스트 검색: `matchesQuery(title, description, query)` — title+description 토큰 분리 매칭, 대소문자 무시
- YouTube kill switches: `YOUTUBE_CIRCUIT_BREAKER_ENABLED`, `YOUTUBE_PROBE_ENABLED` (`false`로 즉시 비활성화)
- YouTube cookies: `.youtube.com` 도메인만 필터링 (Railway 32KB 제한 — `.google.com` 포함 시 초과)
- YouTube cookie 추출: yt-dlp `--cookies-from-browser`에 **로그인된 프로필 명시 필수** (`chrome:Profile N`) — 프로필 미지정 시 `Default` 읽어 로그아웃 방문자 쿠키만 잡힘. `refresh-youtube-cookies.ts`는 `BROWSER:PROFILE` 형식 파싱 + `findMissingAuthCookies` 가드(LOGIN_INFO/SAPISID/`__Secure-1PSID` 없으면 업로드 중단)
- YouTube Circuit Breaker `state` getter는 lazy 전이 포함 (open→half-open by `OPEN_DURATION_MS`) — 별도 `currentState` 만들지 말고 단일 게터 재사용 (`isOpen()`도 동일 게터 호출). 임계값 `FAILURE_THRESHOLD`=3(2026-06 6→3)
- YouTube 502 방지 전역 데드라인: `getTranscript`는 `YOUTUBE_TOTAL_BUDGET_MS`(기본 25s) 내 반환 — 각 클라이언트 시도 전 남은 예산 < `BUDGET_FLOOR_MS`(3s)면 캐스케이드 중단, per-attempt 타임아웃 = `min(YTDLP_ATTEMPT_TIMEOUT_MS=8s, 남은예산)`. 게이트웨이 한도(~60-100s) 초과 시 Cloudflare 502가 나므로 데드라인은 그보다 한참 작게 유지. 데이터센터 봇차단 캐스케이드(throw 아닌 `{kind:"cascade"}`)는 종단 `finalize()`에서만 `recordFailure` 1회 — per-client catch와 이중 카운트 금지
- YouTube Python fallback 성공 경로도 `youtubeCircuitBreaker.recordSuccess()` 명시 호출 — half-open 회복 메커니즘 보존 (누락 시 영구 half-open 잔존)
- YouTube 헬스 프로브(`youtube-probe.ts` `_runProbe`)는 서빙 경로 `getTranscript()`를 **그대로 호출** — 별도 yt-dlp 명령으로 복제 금지. 복제하면 캐스케이드(android_vr→tv→web)·쿠키 폴백이 빠져 "실제 tool은 정상인데 프로브만 down" 늑대소년 발생(과거 쿠키없는 web `--dump-json`이 데이터센터 IP에서 항상 봇 차단). 서킷 브레이커 결합은 의도적(회복 하트비트)
- MCP stale 세션(재배포로 인메모리 세션 소실 후 옛 `mcp-session-id` 요청)은 404 거절 금지 — `handleStatelessMcpRequest()`(`mcp-stateless-fallback.ts`) 1회성 stateless 폴백으로 응답. claude.ai 게이트웨이는 404 후 재초기화하지 않고 포기해 대화에서 툴이 통째로 사라짐 (2026-06-12 장애)
- CLI scripts (`scripts/*.ts`): `main()`은 `process.argv[1]` 가드로 보호 — import 시 자동 실행 방지 (test:coverage 부작용)
- Dead-code (Knip): 내부 전용 심볼은 `export` 제거, 외부 참조 없는 타입은 삭제
- `verify-docs.ts` EXPECTED 카운트: 파일 추가/삭제 시 `npm run verify-docs`로 동기화 필수
- HIRA 지역 코드: 한글 시도/시군구명(Q0/Q1)은 `src/hira-region-codes.ts` 매핑으로 raw `sidoCd`/`sgguCd` 자동 해석 후 호출 — 매칭 실패 시에만 클라이언트 재필터 폴백 (HIRA가 Q0/Q1 무시)
- 자동 생성 매핑 파일(`hira-region-codes.ts`, `dart-corp-codes.ts` 등): 직접 수정 금지 — `scripts/harvest-*.ts` 재실행으로만 갱신 (rate-limit-safe delay 내장)
- DART corp_code 해석: 정적 스냅샷(`dart-corp-codes.ts`, gzip+base64 118k건) 우선 조회 후 미수록 시에만 라이브 `corpCode.xml` 폴백 — Railway egress가 opendart.fss.or.kr에 느려 3.5MB ZIP이 60s 타임아웃 초과(작은 JSON도 ~14s). 스냅샷 갱신: `npx tsx scripts/harvest-dart-corp-codes.ts` (신규 상장/개명 반영)
- 법제처 DRF XML 파싱: 반복 가능 필드는 `ensureArray()` + `.map(str)`로 정규화 (`str(array)` 콤마 결합 함정), 동일 target에 root 분기(`trty` 양자/다자, `admrulOldAndNew` 등)는 fallback chain 필수 — 라이브 curl로 응답 형상 먼저 확인 후 파서 작성
- 긴 법령 truncation 회피: `get_law_detail` 류 다수 조문 반환 도구는 `article_start`/`article_end` 범위 필터 노출 — 클라이언트가 8000자 한도 내 조회 가능하도록
- Claude Code 플러그인 배포: `.claude-plugin/plugin.json`(매니페스트) + `.claude-plugin/marketplace.json`(`source: "./"` 로 자기 저장소를 마켓플레이스로 노출) + `.mcp.json`(prod HTTP 번들, 원격 전용). 커맨드는 `commands/*.md`, 라우팅 스킬은 `skills/korea-public-data/SKILL.md` — 둘 다 규약 위치 자동 탐색이므로 plugin.json에 경로 명시 금지(오타 시 조용히 누락)
- 플러그인 매니페스트 변경 시 `src/plugin-manifest.test.ts` 통과 필수(스키마·kebab-case·19개 도구 언급 검증). 실제 로드 검증은 `claude plugin marketplace add ./` → `claude plugin install korea-public-data@korea-public-data` → `claude plugin details korea-public-data`로 컴포넌트 인벤토리 확인
- 플러그인 커맨드 파일명은 `k-` 접두사 필수 (`commands/k-law.md` → `/k-law`) — 파일명이 곧 커맨드 이름이고, `law`·`trade` 같은 일반명사는 타 플러그인과 축약형이 충돌한다. 접두사로 네임스페이스 확보 + 자동완성 그룹핑. `plugin-manifest.test.ts`의 `commands_전체_k접두사`가 강제
- 플러그인 커맨드에 `allowed-tools` 하드코딩 금지 — 플러그인 설치 시 도구 이름이 `mcp__plugin_{plugin}_{server}__{tool}`로 바뀌어 stdio 설치명과 어긋남. 자연어 지시로 도구를 지목할 것
- Railway 서브도메인(`public-data.up.railway.app`) 폐기·이름 변경 금지 — `.mcp.json`이 이 주소에 원격 연결하므로 반환 시 제3자가 선점해 설치자 전원의 법령·공시 응답을 조작할 수 있다(dangling subdomain takeover). 이전이 필요하면 플러그인을 먼저 회수하거나 자체 소유 커스텀 도메인으로 옮길 것

## TDD 필수

모든 새 기능/로직 변경은 TDD로 개발한다 (Red → Green → Refactor).
테스트 없는 코드 변경은 허용하지 않는다.

## 세션 시작 시 Handoff 강제

`.claude-project/HANDOFF.md`가 존재하면 **반드시 먼저 전체를 읽고** 시작한다.
