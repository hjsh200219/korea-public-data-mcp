# 하네스 성숙도 (Harness maturity)

프로젝트 전용 루브릭입니다. 외부 도구 이름은 예시이며, **동등 이상**의 실질을 채우면 해당 항목을 만족한 것으로 봅니다.

## 차원 (4 Dim)

| Dim | 이름 | 측정 대상 |
|-----|------|-----------|
| **A** | 자동화 | 타입·린트·테스트·빌드·데드코드·문서 검증이 스크립트/CI로 고정돼 있는가 |
| **B** | 폭·깊이 | 레이어 규칙, 커버리지 게이트, ADR, 관측(로깅·에러 경계) |
| **C** | 일관성 | 로컬 `npm run gc`와 CI가 동일한 품질 축을 통과하는가 |
| **D** | 메타·문서 | 성숙도 정의, GC 히스토리, 메타 스크립트로 “말한 것=한 것” 검증 |

각 차원은 1–10 척도로 정성 평가할 수 있으며, **레벨**은 네 차원의 균형과 최소 바를 함께 본다.

## 레벨 L1–L5

| 레벨 | 요약 | 최소 바 (모두 필요) |
|------|------|---------------------|
| **L1** | 기본 빌드 | `npm run build` 또는 동등 |
| **L2** | 정적 품질 | `typecheck` + `lint` + `test` (CI 권장) |
| **L3** | 게이트 통합 | 커버리지 threshold + 단일 `gc`(또는 동등) 스크립트로 품질 루프 고정 |
| **L4** | 구조·문서 검증 | 레이어 import 제한(ESLint 등) + 문서 수치 자동 검증(`verify-docs`) + 데드코드 스캔(Knip 등) + ADR 템플릿 |
| **L5** | CI=로컬 + 메타 | **CI가 로컬 `gc`와 같은 축**(`verify-docs`, `dead-code` 포함) + Knip **설정 힌트 없음**(`treatConfigHintsAsErrors`) + **본 문서**로 레벨 근거 명시 + `verify-harness-meta` 통과 |

## 현재 목표: L5

다음이 참이면 이 저장소는 **L5**로 본다.

- [x] `npm run gc`에 `verify-docs`, `dead-code`(Knip), `typecheck`, `lint`, `test:coverage`, `build`, `verify-harness-meta` 포함
- [x] GitHub Actions `quality-gate`에 위와 동일 축 (`verify-docs`, `dead-code` 단계 포함)
- [x] `knip.json`에 `treatConfigHintsAsErrors: true` 및 설정 힌트 0건
- [x] `docs/harness/maturity.md`(본 문서), `docs/harness/gc-history.md` 유지
- [x] `scripts/verify-harness-meta.ts`로 CI↔package 스크립트 정합성 검증

## 점수화 (참고)

GC에서 사용한 **가중 평균 ~66점 → L3** 같은 수치는 외부 하네스 도구 출력을 그대로 쓴 것이다. L5 달성 후에도 주기적으로 Dim A–D를 1–10으로 재평가해 `gc-history.md`에 짧게 남기면 추세 추적에 유리하다.
