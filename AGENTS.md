---
description: K Public Data MCP 프로젝트 규칙 - 한국 공공데이터 MCP 서버 (해외 판례 보조 포함)
globs:
alwaysApply: true
---

> Be concise. No filler. Straight to the point. Use fewer words.

# public-data-mcp

K public data MCP server (법제처 + DART 전자공시 + 공공데이터포털 + 관세청 UNI-PASS + 수출입은행 + 농림축산식품부 + 금융감독원 금융상품 비교공시 + 금융위원회 보험상품 공시 + 조달청 나라장터 + YouTube 자막/메타데이터 + 해외 판례 CourtListener·OpenLegalData + 한국관광공사 KorService2 + 쿠팡 파트너스 상품리뷰).

## Quick Start

```bash
npm run build        # TypeScript -> dist/
npm run start:stdio  # MCP stdio mode (local)
npm start            # HTTP mode (Railway deploy)
npm run dev          # Dev with tsx (stdio)
npm run dev:remote   # Dev with tsx (HTTP)
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

## Conventions

- Korean comments for domain-specific logic
- 스킬 도구: 17개 의도 기반, `action` enum으로 세부 동작 선택
- 스킬 등록: `server.tool()` 대신 `registerSkillTool()` (`tools/skills/_shared.ts`) 사용
- 스킬 도구 `title`/`description`: 이중 언어 형식 — `"English / 한글"` (title), `"English desc. / 한글 설명"` (description)
- REST routes: `kebab-case`
- Error responses: `isError: true` with Korean messages
- Domain files: `{domain}-api.ts` + `{domain}-types.ts`
- MCP responses: 8000자 truncate (`truncateWindow()`로 offset 페이지네이션)

## TDD 필수

모든 새 기능/로직 변경은 TDD로 개발한다 (Red → Green → Refactor).
테스트 없는 코드 변경은 허용하지 않는다.

## 세션 시작 시 Handoff 강제

`.claude-project/HANDOFF.md`가 존재하면 **반드시 먼저 전체를 읽고** 시작한다.
