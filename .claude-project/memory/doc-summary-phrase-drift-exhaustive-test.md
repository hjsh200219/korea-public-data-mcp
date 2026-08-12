---
name: doc-summary-phrase-drift-exhaustive-test
description: 문서의 "외 N종" 요약 표현은 드리프트를 숨김 — 소스 파싱 전수 대조 테스트로 강제
type: project
created: 2026-08-12
---

문서에 `import_clearance` 액션을 "조회 외 21종" 식으로 요약해 적어두면 소스가 바뀌어도
테스트가 잡지 못한다. 2026-08-12 감사에서 실제로 **21종이라 적혀 있었으나 소스는 20종,
그중 12개가 문서에 아예 미기재**였다. 개수가 틀려도, 항목이 빠져도 요약 표현은 그대로
"맞아 보인다".

대응 (`src/plugin-manifest.test.ts`):
- `skillMd_소스ACTIONS_전수언급` — `src/tools/skills/*.ts`의 `const ACTIONS = [...] as const;`를
  정규식으로 파싱해 모든 action이 `skills/korea-public-data/SKILL.md`에 문자열로
  존재하는지 대조. 요약 표현 사용 시 즉시 실패한다.
- `skillMd_존재하지않는action_미언급` — 역방향. 문서에만 있고 소스에 없는 action 탐지.
  zod 스키마 필드명도 소스에서 수집해 파라미터 표기를 action 오탐으로 잡지 않게 한다.
- 런타임 조립형 도구(`DYNAMIC_ACTIONS`)는 정적 추출이 불가능하므로 명시적 예외 목록으로 관리.
- 도구 목록은 하드코딩 배열이 아니라 `readdirSync(SKILLS_DIR)`로 파생 — 새 도구 추가 시
  테스트가 자동으로 포함한다.

**Why:** 사람이 관리하는 요약 문구는 소스 변경을 따라가지 못한다. 카운트만 검증하는
테스트(`19개 도구 언급`)도 "N종" 표현 뒤에 숨은 누락은 못 잡는다. 전수 나열 강제만이
드리프트를 컴파일 타임 오류처럼 만든다.

**How to apply:**
- 문서에 목록을 쓸 때 "외 N종", "등", "..." 금지. 전수 나열한다.
- 새로 문서-소스 쌍(SKILL.md, commands/*.md, README 표 등)이 생기면 카운트 검증이 아니라
  **소스를 파싱한 전수 대조**를 먼저 쓴다. 역방향(문서에만 있는 항목) 검증도 같이 건다.
- 관련: [[verify-docs-expected-counts-sync-requirement]]
