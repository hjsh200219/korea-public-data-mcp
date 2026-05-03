---
name: smithery-quality-score-bilingual-boost
description: Smithery 품질 점수 항목별 분석 및 이중언어 title/description의 Server Metadata 기여
type: feedback
created: 2026-05-03
---

2026-05-03 기준 Smithery 품질 점수 개선 작업 결과:

| 항목 | 개선 전 | 예상 개선 |
|------|---------|----------|
| Output schemas | 0/17 | +10pt (`registerSkillTool` 자동 주입) |
| Annotations | 0/17 | +6pt |
| Parameter descriptions | ~13/17 | +1pt |
| Server Metadata | 3/35 | +12pt (bilingual description/title) |
| **기준 점수** | **48pt** | **~77pt 예상** |

Server Metadata 항목은 smithery.yaml의 top-level `description`, `startCommand.tools[].description`, tool `title` 품질에 비례.

이중언어 포맷(`"English / 한국어"`)이 이 카테고리에 직접 기여함.

**Why:** 점수가 예상치에 못 미칠 경우 어느 항목이 기여/미기여했는지 추적 가능.

**How to apply:**
- 신규 도구 추가 후 Smithery 대시보드에서 점수 재확인
- smithery.yaml `tools[]` 항목 수 = 등록 스킬 수와 동기화 필수 (불일치 시 Server Metadata 점수 손실)
- Output schemas는 `registerSkillTool()` 래퍼가 자동 주입하므로 직접 `server.tool()` 사용 금지
