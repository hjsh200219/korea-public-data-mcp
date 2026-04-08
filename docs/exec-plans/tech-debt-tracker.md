# Tech Debt Tracker

## Active Debt

| ID | Category | Description | Impact | Effort | Priority |
|----|----------|-------------|--------|--------|----------|
| TD-015 | DRY | `law/helpers.ts`, `dart-api.ts` 자체 fetch/retry 구현 — `http-client.ts` 미사용 | 중복 ~110줄 | Medium | P3 |

## Resolved Debt

| ID | Description | Resolution | Date |
|----|-------------|------------|------|
| TD-001 | `server.ts` (1527 lines) monolith | v6 리팩토링: 21줄로 축소, skills/index.ts에 위임 | 2026-04 |
| TD-003 | Zero test files exist | 18개 테스트 파일, 309개 테스트 (v6 기준) | 2026-04 |
| TD-005 | `index.ts`/`remote.ts` 환경변수 수집 로직 중복 | `config.ts`에 `loadConfig()` 추출 | 2026-04 |
| TD-006 | `api-routes.ts` (878 lines) monolith | 47줄 오케스트레이터 + 9개 도메인별 라우트 파일 분리 | 2026-04 |
| TD-007 | `openapi.ts` (1238 lines) monolith | 47줄 오케스트레이터 + 9개 도메인별 path 파일 분리 | 2026-04 |
| TD-016 | dart/finlife/insurance API 테스트 부재 | 25개 파일 571개 테스트, lines 89% | 2026-04-08 |
| TD-017 | financial-product/insurance 스킬 테스트 부재 | 각 16/20개 테스트 추가, lines 90%+ | 2026-04-08 |
| TD-002 | `law-api.ts` (1546 lines) monolith | `src/law/` 5개 모듈로 분리 (search/detail/case/amendment/helpers) + barrel re-export | 2026-04-08 |
| TD-004 | `unipass-api.ts` 52개 swallowed catches | `throw new Error(..., { cause })` 패턴으로 전면 교체 | 2026-04-08 |
| TD-008 | REST routes 입력 검증 없음 | Zod 검증 미들웨어 (`_validation.ts`) + law/dart/unipass 라우트 적용 | 2026-04-08 |
| TD-009 | 구조화 로깅 없음 | `logger.ts` 모듈 도입 (JSON/human 포맷, 35줄) | 2026-04-08 |
| TD-010 | Session Map TTL 없음 | 30분 TTL + touchSession/removeSession 패턴 | 2026-04-08 |
| TD-011 | SIGTERM/SIGINT 핸들러 없음 | `remote.ts`에 gracefulShutdown 이미 구현 확인 | 2026-04-08 |
| TD-012 | OpenAPI 보일러플레이트 반복 | `_helpers.ts` + `shared.ts` 공통 헬퍼 제공 | 2026-04-08 |
| TD-013 | 헬스체크 정적 JSON | uptime/sessions/memory/startedAt 추가 | 2026-04-08 |
| TD-014 | XML 파싱 취약성 | `safeRoot` 헬퍼 추가 + 기존 안전 패턴 유지 확인 | 2026-04-08 |
| TD-018 | CI/CD 없음 | `.github/workflows/ci.yml` — typecheck+lint+coverage+build | 2026-04-08 |
| TD-019 | Pre-commit hooks 없음 | husky + lint-staged (eslint --fix + vitest related) | 2026-04-08 |
| TD-020 | 버전 3곳 하드코딩 | `config.ts` `SERVER_VERSION` 상수로 SSOT 통합 | 2026-04-08 |

## Scoring

- **P1**: Blocks confidence in shipping changes
- **P2**: Slows development or operations
- **P3**: Annoyance, address opportunistically
