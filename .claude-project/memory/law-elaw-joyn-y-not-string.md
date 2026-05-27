---
name: law-elaw-joyn-y-not-string
description: 영문법령(elaw) joYn 필드는 "Y"/"N" 코드. "조문" 한글 문자열 비교는 항상 false
type: reference
created: 2026-05-27
---

영문법령(`target=elaw`) 응답의 `<Jo>` 단위에는 `<joYn>` 필드가 있고, 값은 **"Y" 또는 "N"** 코드. 다른 국문 detail API는 `조문여부=조문/전문` 한글 값이라 추론으로 잘못된 필터 작성하기 쉬움.

**버그 사례**:
```ts
// 항상 false → 폴백 || joCts가 모든 항목 통과시켜 챕터 헤더까지 articles에 포함
.filter((a) => str(a.joYn) === "조문" || str(a.joCts))
```

**정정**:
```ts
.filter((a) => str(a.joYn) === "Y")  // 章/CHAPTER 헤더(N) 자동 제외
```

**Why:** 응답 본문은 영어, 메타 코드도 영문 (joYn=Y, joNo=0001 등). 다른 도메인과 일관성 깨는 예외 케이스.

**How to apply:** elaw 관련 파서 작성/수정 시 `joYn === "Y"` 사용. 다른 영문 API 추가 시 필드 값 컨벤션 (한글 vs 영문 코드) 먼저 curl로 확인.
