---
name: skill-tool-bilingual-title-llm-routing
description: 스킬 title/description을 강화해 LLM이 올바른 스킬을 선택하도록 유도하는 패턴
type: reference
created: 2026-05-03
---

LLM이 비슷한 기능의 스킬(예: `youtube` vs `product_review`) 중 잘못된 것을 선택하는 문제를 title/description 강화로 해결한다.

**product_review 스킬 적용 예:**
- title: `"Product Review (YouTube + Coupang) / 제품 리뷰 (유튜브+쿠팡)"`
- description: `youtube.search` 대신 이 스킬을 쓰도록 명시적으로 안내

**원칙:**
1. title에 다루는 플랫폼/데이터소스를 괄호로 명시 (예: `(YouTube + Coupang)`)
2. description에 "youtube.search 대신 이 스킬 사용" 같은 부정적 가이드라인 포함 가능
3. 이중 언어 형식 필수: `"English / 한글"` (smithery 품질 점수 + LLM 라우팅 모두에 기여)

**컨벤션 출처:** CLAUDE.md — `스킬 도구 title/description: 이중 언어 형식 — "English / 한글" (title), "English desc. / 한글 설명" (description)`

**Why:** LLM은 tool description을 기반으로 스킬을 선택한다. title/description이 모호하면 유사 스킬(youtube.search)로 라우팅될 수 있다.
**How to apply:** 새 스킬 등록 시 다른 스킬과 혼동될 여지가 있으면 title에 데이터소스 명시, description에 경쟁 스킬 대비 우선순위 문구 추가.
