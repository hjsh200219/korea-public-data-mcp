---
created: 2026-08-12T14:35:00+09:00
project: k-public-data-mcp
summary: Claude Code 플러그인 배포 지원 추가 + 커맨드 k- 접두사 적용(v1.1.0) — 실제 설치·업데이트 검증 완료 (ea50c6f, c0613c9, 6dcc544, 93ead8e 푸시 완료)
---

## Session Digest
사용자 요청: "본 프로젝트를 github plugin으로도 배포할 수 있게 해줘". Remote HTTP 연결 방식 + 스킬 + 슬래시 커맨드 구성으로 결정하고 구현. GitHub 저장소 자체를 Claude Code 마켓플레이스로 노출해 `/plugin marketplace add hjsh200219/korea-public-data-mcp` 한 줄로 설치되게 했다. prod HTTP MCP에 원격 연결하므로 사용자 API 키 발급이 불필요하다.

이어서 `/sh:git-push` full 모드 실행 — 원격이 20커밋 앞서 있어 rebase 후 통합 검증, harness-gc 3개 감사 에이전트가 문서 드리프트 다수를 찾아내 수정했다. 특히 SKILL.md의 "외 21종" 표기가 실제 20종과 어긋나고 12개 action이 미기재였던 것을 발견, 소스 파싱 전수 대조 테스트로 재발을 구조적으로 차단했다.

## Progress
- [x] 플러그인 매니페스트 3종 작성 (`.claude-plugin/plugin.json`, `marketplace.json`, `.mcp.json`)
- [x] 라우팅 스킬 `skills/korea-public-data/SKILL.md` — 19개 도구 → action 매핑
- [x] 슬래시 커맨드 7종 (`/law` `/dart` `/trade` `/bid` `/bill` `/finance` `/kpd-tools`)
- [x] `src/plugin-manifest.test.ts` TDD — 19케이스 (매니페스트 스키마 + action 전수 대조)
- [x] README·INSTALL_GUIDE에 설치 안내 추가 (방법 2 / 방법 E)
- [x] rebase (원격 20커밋) + 원격 신규 기능 `get_hospital_detail` SKILL.md 반영
- [x] harness-gc 감사 대응: ARCHITECTURE.md 수치 5건, 옛 저장소명 3곳, source-map 배포 표면 섹션
- [x] SKILL.md action 전수 나열 (import_clearance 20 / trade_entity 11 / assembly 25)
- [x] 커밋 `ea50c6f`, `c0613c9` 푸시 완료
- [x] **실제 GitHub 경로 설치 검증** — 클론·마켓플레이스 검증·설치 성공, MCP 1 / 스킬 8 / always-on 663 tok
- [x] 슬래시 커맨드 `k-` 접두사 적용 (`93ead8e`, v1.1.0) — `/law`→`/k-law` 등 7개 `git mv`, `commands_전체_k접두사` 테스트로 규칙 강제
- [x] `claude plugin marketplace update`로 v1.1.0 · `k-*` 7개 인식 검증
- [ ] (이월) KIPRIS 서비스 승인 대기 → 승인 시 `src/kipris-api.ts` TDD 구현
- [ ] (이월) YouTube 쿠키 LaunchAgent 정기 실행 결과 확인

## Next Steps
1. **README 도구 카탈로그 재작성** — 구식 개별 도구명(`dart_resolve_corp_code`, `data20_search_pharmacy`)이 현재 스킬 도구 구조(`corporate_disclosure`, `public_data`)와 정면 불일치. 이번 세션 이전부터 누적된 부채이며 SKILL.md를 SSOT로 삼아 정리 권장
2. **커스텀 도메인 이전 검토** — `.mcp.json`이 `public-data.up.railway.app`에 연결. Railway 서브도메인은 반환 시 제3자 선점 가능(dangling takeover), 플러그인 설치자 전원이 노출됨. 자체 소유 도메인으로 옮기면 근본 해소
3. (이월) KIPRIS 승인 확인 후 구현 착수
4. 플러그인 사용 후 도구 발견율 관찰 — SKILL.md 라우팅표가 실제로 작동하는지, 커맨드가 쓰이는지

## Blockers
- **KIPRIS 서비스 승인 대기** (이전 세션 이월) — 승인 전까지 `resultCode 31 DEADLINE_HAS_EXPIRED`

## Watch Out
- **`.mcp.json`의 Railway 서브도메인은 플러그인 설치자 전원의 신뢰 기반**이다. 프로젝트 폐기·이름 변경 전에 반드시 플러그인을 먼저 회수하거나 커스텀 도메인으로 이전할 것
- 플러그인 커맨드에 `allowed-tools`를 하드코딩하지 말 것 — 설치 시 도구 이름이 `mcp__plugin_korea-public-data_public-data__{tool}`로 바뀌어 stdio 등록명과 어긋난다
- `commands/`·`skills/`·`.mcp.json`은 규약 위치 자동 탐색이다. `plugin.json`에 경로를 명시하면 오타 시 **에러 없이 조용히 누락**된다
- SKILL.md에 action을 추가·수정할 때 "외 N종" 같은 요약 표현 금지 — `plugin-manifest.test.ts`의 전수 대조 테스트가 실패한다. 전부 나열할 것
- 커맨드 파일을 추가할 때 파일명에 `k-` 접두사 필수 (`commands/k-*.md`). 파일명이 곧 커맨드 이름이고 테스트가 강제한다
- 플러그인 배포 후 사용자에게 반영하려면 `claude plugin marketplace update korea-public-data` → `/plugin update`. 푸시만으로는 설치본이 안 바뀐다. 커맨드 이름 변경 등 breaking change는 `plugin.json`·`marketplace.json` version을 **둘 다** 올릴 것
- 푸시 전 `git status --short --branch`로 behind 확인 필수 — 이번에 원격이 20커밋 앞서 있었다
- `.husky/pre-commit`이 실행 권한 없어 무시되고 있다(기존 상태). lint-staged가 커밋 시 안 돈다
- 플러그인 로컬 검증 후에는 `claude plugin uninstall` + `marketplace remove`로 원복할 것 — 사용자 설정에 로컬 경로가 남는다

## Files Touched
- `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`, `.mcp.json` (신규)
- `commands/{law,dart,trade,bid,bill,finance,kpd-tools}.md` (신규)
- `skills/korea-public-data/SKILL.md` (신규)
- `src/plugin-manifest.test.ts` (신규, 19케이스)
- `commands/k-*.md` — v1.1.0에서 7개 전부 `k-` 접두사로 rename
- `AGENTS.md` (플러그인 컨벤션 5항 + 스킬 도구 18→19 교정)
- `ARCHITECTURE.md` (수치 교정 + 배포 채널 표)
- `docs/source-map.md` (배포 표면 섹션)
- `README.md`, `INSTALL_GUIDE.md` (설치 안내 + 저장소명 교정)
