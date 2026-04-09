# ADR-0001: GC 하네스 도구 (Knip, verify-docs, ESLint 레이어)

- 상태: 수락됨
- 날짜: 2026-04-09

## 맥락

Harness GC에서 문서 수치 드리프트, 미사용 export, 레이어 위반 가능성이 반복적으로 지적되었다.

## 결정

1. **Knip** (`npm run dead-code`): 미사용 의존성·export 탐지. `@internal` 및 `ignoreIssues`로 의도적 공개 타입·헬퍼는 예외 처리한다.
2. **verify-docs** (`npm run verify-docs`): `ARCHITECTURE.md`의 액션 합계와 `src` 모듈 개수(스킬·라우트·openapi·api·types)를 스크립트로 검증한다.
3. **ESLint** `@typescript-eslint/no-restricted-imports`: Data Access·Types·OpenAPI·`tools/`에 layer-rules.md와 맞는 import 제한을 둔다.
4. **`npm run gc`**: 위 검증을 기존 typecheck·lint·test·build 파이프라인에 포함한다.

## 결과

CI/로컬에서 문서·구조 드리프트를 조기에 잡을 수 있다. Knip 설정은 초기에 `ignoreIssues`가 있어, 이후 점진적으로 줄일 수 있다.

## 대안

- 전용 커스텀 AST 스크립트만 사용: 유지보수 비용이 커서 기존 도구 조합을 택했다.
