---
name: fast-xml-parser-repeated-tag-array
description: fast-xml-parser는 반복 태그를 배열로 반환. str() 코어션 시 콤마 결합되어 본문 깨짐
type: reference
created: 2026-05-27
---

`fast-xml-parser`는 동일 이름 반복 태그를 자동으로 배열로 변환:
```xml
<조문내용>제1조 ...</조문내용>
<조문내용>제2조 ...</조문내용>
<조문내용>제3조 ...</조문내용>
```
→ `root["조문내용"] = ["제1조...", "제2조...", "제3조..."]`

**버그 패턴**:
```ts
content: stripHtmlTags(str(root.조문내용))
// String(array) → "제1조...,제2조...,제3조..." (콤마 결합, 줄바꿈 손실)
```

**정정 패턴**:
```ts
const nodes = ensureArray(root["조문내용"] as unknown);
const content = nodes
  .map((node) => stripHtmlTags(str(node)))
  .filter(Boolean)
  .join("\n\n");
```

**Why:** 단일 응답에서는 단일/배열 분기 안 보여 mock 테스트에 배열 케이스 누락하기 쉬움. `admrul.조문내용`, `trty.조약내용.조약내용` 등 여러 곳에서 발생.

**How to apply:** XML 파서 작성 시 모든 반복 가능 필드는 `ensureArray()` 후 `.map(str)` 처리. `str(value)` 직접 호출 금지 (배열일 때 망가짐). 헬퍼 `helpers.ts`의 `isArray` config에 명시되지 않은 태그도 반복 가능. mock 테스트는 단건/다건 케이스 모두 작성.
