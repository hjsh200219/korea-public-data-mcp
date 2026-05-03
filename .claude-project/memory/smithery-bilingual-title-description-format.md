---
name: smithery-bilingual-title-description-format
description: smithery.yaml 및 스킬 tool title/description 이중언어 포맷 규칙
type: project
created: 2026-05-03
---

All `title` and `description` fields in smithery.yaml and skill tool registrations use:

```
"English text / 한국어 텍스트"
```

- Separator: ` / ` (space-slash-space)
- English first, Korean second
- Scope: smithery.yaml top-level `description`, per-tool `tools[].description`, and `title`/`description` in each skill's `registerSkillTool()` call

Example (legal-research.ts):
```ts
title: "Legal Research / 법령 리서치",
description: "Legal Research — search and retrieve Korean statutes ... / 법령 리서치 — 법률·시행령·행정규칙 ...",
```

17개 스킬 전부 동일 포맷 적용 완료 (2026-05-03 기준).

**Exception:** smithery.yaml configSchema의 개별 property `description`은 한국어 단독 허용 (내부 설정 문서).

**Why:** Smithery 마켓플레이스는 영어 사용자 우선 탐색 → 영어 선행. 한국어 사용자 맥락 유지를 위해 병기.

**How to apply:** 신규 스킬 추가 시 `title`/`description` 반드시 이 포맷 사용. smithery.yaml `startCommand.tools[]`에도 동기화 필수.
