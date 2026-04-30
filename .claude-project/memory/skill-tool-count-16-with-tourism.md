---
name: skill-tool-count-16-with-tourism
description: MCP 스킬 도구 수 16개 기준점 및 전체 목록 (tourism 추가 후)
type: project
created: 2026-04-30
---

2026-04-30 기준 등록된 스킬 도구 16개 (tools/skills/index.ts):
legal-research, case-research, law-amendment, import-clearance, export-clearance,
shipping-logistics, tariff-lookup, trade-entity, corporate-disclosure, public-data,
financial-product, insurance, procurement, youtube, foreign-case-research, tourism

tourism 스킬: 7 actions
- search_tourism_area, search_tourism_keyword, search_tourism_location
- search_tourism_festival, search_tourism_stay
- get_tourism_detail (detailType=common|intro|info|image)
- get_tourism_codes (codeType=area|category|ldong|lclssystm|sync)
DATA20_SERVICE_KEY 재사용 (별도 환경변수 없음)

**Why:** 스킬 수 기준점으로 다음 통합 시 충돌/중복 방지 및 e2e 테스트 assertion 기준.
**How to apply:** 새 스킬 추가 시 index.ts 등록 + e2e test 카운트 갱신 + 이 메모 업데이트.
