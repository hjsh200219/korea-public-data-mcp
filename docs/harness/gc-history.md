# Harness GC 히스토리

GC 실행 메타데이터만 기록합니다. 상세 감사 로그는 `_workspace/` (로컬, git 무시).

## 2026-04-09 (Run #1)

- 모드: full
- 문서 신선도: ~78% (수치 드리프트 중심, symlink·링크는 양호)
- 아키텍처: 레이어 ESLint 없음, 구조는 layer-rules와 정성 일치
- 품질 등급 (정성): B+
- 하네스 성숙도: **L3 (~66점)** — DimA 6.0 / B 7.0 / C 7.7 / D 5.5
- 약점 원칙: **P7** (5), **P5** (5), **P8** (6)
- Knip strict: 미설치 — 스킵
- 발견 이슈: 문서 수치 불일치 다수 → **즉시 수정**: ARCHITECTURE.md, AGENTS.md, docs/QUALITY.md 동기화
- 반복 드리프트: —
- 예방 스크립트: **반영** — `scripts/verify-docs.ts`, `npm run verify-docs`, `gc`에 포함
- 하네스 메타 검증: 해당 없음 (3회 미만)

## 2026-04-09 (Run #2, 후속)

- Knip: `knip.json`, `npm run dead-code`, `gc`에 포함 (`@internal`로 `safeRoot` 예외, 타입 export는 `ignoreIssues`)
- ESLint: `no-restricted-imports`로 R3/R4/R5/R6 일부 자동 검증
- 관측: `route-helpers` REST 에러 시 `logger` 기록; `remote.ts` async 라우트 + 전역 500 미들웨어
- ADR: `docs/adr/` 템플릿 + `0001-tooling-gc-harness.md`
- `.claudeignore` 정책 주석 추가

## 2026-04-09 (Run #3, L5)

- 하네스 성숙도: **L5** (루브릭: [maturity.md](./maturity.md))
- Dim (정성 재평가): A 8.5 / B 8.0 / C 9.0 / D 8.5 (참고용)
- CI ↔ 로컬: `quality-gate`에 `verify-docs`, `dead-code`, `verify-harness-meta` 추가
- Knip: `vitest: true`로 테스트 진입점 반영, `treatConfigHintsAsErrors: true`
- 메타: `scripts/verify-harness-meta.ts` — `gc`·`ci.yml`·`knip.json` 정합성
- ADR: [0002-harness-l5.md](../adr/0002-harness-l5.md)

## 2026-04-09 (Run #4, harness-gc full)

- 모드: full (오케스트레이터: Phase 1.5 사실 추출 + 문서/아키/품질 리포트 + synthesizer)
- 문서 신선도: ~92% (추정); symlink·핵심 docs 링크 양호 — 템플릿 경로 `harness-principles.md` / `harness-setup.md` 미도입(선택)
- 아키텍처: ESLint 레이어 0 위반; `npm run gc` 통과
- 품질 등급 (정성): A-
- 하네스 성숙도: **L5 유지** (~82점 루브릭, [maturity.md](./maturity.md) 참고)
- 약점 원칙: P1(8), P2(8), P8(8)
- Knip: `dead-code` → `knip --no-config-hints`; **`npx knip --strict` exit 0** (이중 production entry + `ignoreDependencies`로 strict 오탐 흡수)
- 발견 이슈: strict 모드 의존성 그래프 한계 2건 → **즉시 수정**: `knip.json`/`package.json` 조정 (삭제 아님)
- 반복 드리프트: 없음
- 예방 스크립트: 기존 verify-docs / verify-harness-meta 유지
- 하네스 메타: GC 3회+ — SIMPLIFY 후보 없음
