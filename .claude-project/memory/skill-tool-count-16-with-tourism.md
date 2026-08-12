---
name: skill-tool-count-16-with-tourism
description: MCP 스킬 도구 수 19개 기준점 및 전체 목록 (assembly, gov24_ai 추가 후)
type: project
created: 2026-04-30
updated: 2026-08-12
---

2026-08-12 기준 등록된 스킬 도구 19개 (`src/tools/skills/*.ts`, `prompts.ts` 제외):
legal-research, case-research, law-amendment, import-clearance, export-clearance,
shipping-logistics, tariff-lookup, trade-entity, corporate-disclosure, public-data,
financial-product, insurance, procurement, youtube, foreign-case-research, tourism,
product-review, assembly, gov24-ai

product_review 스킬: 3 actions
- find_reviews: youtube.md 채널에서 리뷰 자막 추출 (YOUTUBE_API_KEY 필수)
- coupang_search: 쿠팡 상품 검색 + 구매 URL (COUPANG_ACCESS_KEY/SECRET_KEY 필수)
- full_review: find_reviews + coupang_search 통합

환경변수: COUPANG_ACCESS_KEY, COUPANG_SECRET_KEY
채널 목록: youtube.md 동적 로드 (process.cwd()/youtube.md)

2026-05-03 추가: 모든 스킬 `registerSkillTool()` 마이그레이션 완료.
`server.tool()` 직접 호출은 더 이상 없음.

**Why:** 스킬 수 기준점으로 다음 통합 시 충돌/중복 방지 및 e2e 테스트 assertion 기준.
**How to apply:** 새 스킬 추가 시 index.ts 등록 + e2e test 카운트 갱신 + 이 메모 업데이트.
신규 스킬은 반드시 `registerSkillTool()` 사용 (`server.tool()` 금지).
도구 수는 AGENTS.md·ARCHITECTURE.md·`skills/korea-public-data/SKILL.md`에도 박혀 있으니
같이 갱신하고 `src/plugin-manifest.test.ts`(readdirSync 파생)로 검증한다
— [[doc-summary-phrase-drift-exhaustive-test]]
