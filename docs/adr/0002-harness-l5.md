# ADR-0002: 하네스 L5 루브릭 및 메타 검증

- 상태: 수락됨
- 날짜: 2026-04-09

## 맥락

GC에서 L3(~66점)로 기록되었고, 이후 Knip·verify-docs·레이어 ESLint 등이 들어갔다. “L5에 가깝다”는 구호 없이 **저장소 안에 달성 기준을 두고** CI와 로컬을 맞출 필요가 있다.

## 결정

1. SSOT 루브릭: `docs/harness/maturity.md`에 L1–L5 정의.
2. L5 필수: CI가 `verify-docs`, `dead-code`, `verify-harness-meta`를 실행하고, `npm run gc`에도 동일하게 포함.
3. Knip: `treatConfigHintsAsErrors: true`, Vitest 플러그인으로 테스트 파일을 진입점으로 인식.

## 결과

품질 축이 문서화되고, 워크플로 드리프트를 메타 스크립트가 조기에 잡는다.

## 대안

- 외부 전용 하네스 SaaS만 신뢰: 비용·락인을 피하고 Git + npm으로 최소 구현을 택했다.
