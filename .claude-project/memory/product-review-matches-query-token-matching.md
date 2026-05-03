---
name: product-review-matches-query-token-matching
description: product_review find_reviews — 공백 분리 토큰 + title/description 동시 탐색 매칭 패턴
type: reference
created: 2026-05-03
---

`find_reviews` 액션에서 영상 필터링에 `matchesQuery()` 함수를 사용한다.

```ts
export function matchesQuery(title: string, description: string, query: string): boolean {
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  const haystack = (title + " " + description).toLowerCase();
  return tokens.some((t) => haystack.includes(t));
}
```

- **기존 방식**: `title.includes(query)` — 전체 문자열 exact match, 한 단어라도 순서 다르면 누락
- **개선 방식**: 쿼리를 공백으로 토큰 분리 → 토큰 중 하나라도 title 또는 description에 포함되면 매칭
- title과 description을 합쳐 haystack으로 검색하므로 설명에만 언급된 제품도 포착

구현 위치: `src/tools/skills/product-review.ts`
테스트 위치: `src/tools/skills/product-review.test.ts`

**Why:** "무선 마우스 추천"을 검색할 때 "마우스"만 제목에 있는 영상도 매칭되어야 리뷰 누락이 줄어든다.
**How to apply:** 새로운 스킬에서 영상/문서 필터링 로직 작성 시 동일 패턴 적용. exact match 대신 token-any 방식 사용.
