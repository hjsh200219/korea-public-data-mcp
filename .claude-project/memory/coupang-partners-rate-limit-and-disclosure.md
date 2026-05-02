---
name: coupang-partners-rate-limit-and-disclosure
description: 쿠팡 파트너스 API rate limit 및 수수료 공시 의무
type: reference
created: 2026-05-03
---

**Rate Limit**: 시간당 10회 (HTTP 429 반환 시 한국어 에러 메시지로 처리)
**캐시 전략**: 동일 keyword+limit 조합 1시간 캐시 → rate limit 자동 회피

**수수료 공시 의무 (쿠팡 파트너스 운영정책)**:
- 쿠팡 링크를 사용자에게 노출할 때 반드시 수수료 고지 문구 포함해야 함
- 현재 사용 문구: `"※ 이 링크는 쿠팡 파트너스 활동의 일환으로 수수료를 제공받을 수 있습니다."`
- 상수명: `COUPANG_DISCLOSURE` (`src/tools/skills/product-review.ts`)

쿠팡 affiliate URL 형식: `https://link.coupang.com/re/AFFSDP?lptag=AF{partnerId}&...`

**Why:** 공시 문구 누락 시 쿠팡 파트너스 계정 정지 위험.
**How to apply:** 쿠팡 링크를 노출하는 모든 응답에 `COUPANG_DISCLOSURE` 상수를 append. 새 스킬/액션에서 쿠팡 결과를 출력할 때도 동일하게 적용.
