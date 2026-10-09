---
name: product-review-registration-gate
description: product_review 는 YouTube 키 또는 쿠팡 키 쌍 중 하나만 있어도 등록 — 로컬 kpd 는 YouTube 키를 안 넘긴다
type: project
created: 2026-10-09
---

`registerProductReviewSkill` 은 키가 하나도 없을 때만 등록을 건너뛴다. 예전엔 `YOUTUBE_API_KEY` 없으면 통째로 스킵해서, YouTube 키를 일부러 빼고 서버를 띄우는 로컬 kpd 클라이언트(`~/.agents/skills/k-public-data/scripts/kpd.py`, `/k-shopping`)에서 `coupang_search` 가 `Tool product_review not found` 로 죽었다(2026-10-09, 커밋 4d478c2).

**Why:** 도구 등록 게이트가 한 action 의 키에 묶이면 다른 action 까지 사라진다. 운영(Railway)은 키가 다 있어서 안 드러난다.
**How to apply:** 여러 원천을 묶은 스킬 도구의 등록 조건은 「action 중 하나라도 쓸 수 있으면 등록」, 키 없는 action 은 핸들러에서 isError 로 안내. kpd 의 `isError` 는 이제 서버 문구를 같이 출력하니 그 문구로 원인을 가른다.
