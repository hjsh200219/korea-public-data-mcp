---
name: law-ordinance-article-number-6digit
description: 자치법규 조문번호는 6자리(조 4·가지 2)이고 XML 파서가 앞 0을 지운다 · 국세 출처 판례는 법제처 상세 없음 · CourtListener v4 ID 위치
type: reference
created: 2026-11-04
---

법제처 DRF 응답에서 코드가 그대로 믿으면 틀리는 값 세 가지다.

- 자치법규 `조문번호`는 6자리(앞 4자리 조·뒤 2자리 가지)다. `000100`=제1조, `000302`=제3조의2, `000000`=장·절 제목이다. XML 파서가 숫자로 읽어 앞 0이 사라지므로 `padStart(6, "0")` 뒤에 나눈다.
- 판례 목록의 `데이터출처명`이 `국세법령정보시스템`이면 법제처 상세 조회가 되지 않는다. 2026-11-04 라이브 검색 「부가가치세」 20건 중 12~17건이 이 출처였다.
- CourtListener v4 검색 결과에는 `hit.id`가 없고 opinion ID는 `opinions[0].id`에 있다. 빠뜨리면 ID가 전부 0이 된다.

**Why:** 자치법규 번호가 깨지고, 공정위 피심정보가 `[object Object]`로 나오고, 미국 판례 ID가 0으로 나왔다(00d6f38 에서 수정).
**How to apply:** 새 필드를 표시할 때 `str()`만 믿지 말고 라이브 응답으로 형태를 먼저 본다. 중첩 요소는 `flattenText()`(`src/law/case.ts`)로 편다.
