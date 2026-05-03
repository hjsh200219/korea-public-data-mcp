---
name: verify-docs-expected-counts-sync-requirement
description: 파일 추가/삭제 시 verify-docs.ts EXPECTED 카운트 동기화 필수 (CI quality-gate 차단)
type: feedback
created: 2026-05-03
---

새 스킬/routes/API/types 파일 추가 후 `scripts/verify-docs.ts`의 EXPECTED 값을 업데이트하지 않으면 CI quality-gate에서 "실제 N개, 기대 M개" 에러로 차단됨.

**Why:** 이번 세션에서 skillModules 12→17, routes/openapi 8→11, apis/types 8→14로 실제 파일 수가 바뀌었는데 EXPECTED 하드코딩 값이 그대로여서 CI 실패.

**How to apply:**
- 파일 추가/삭제 후 로컬에서 `npm run verify-docs` 실행
- 에러 나면 `scripts/verify-docs.ts`의 EXPECTED 섹션을 실제 값으로 업데이트
- 커밋 메시지에 변경 수치 명시 (예: `skillModules: 12 → 17`)
