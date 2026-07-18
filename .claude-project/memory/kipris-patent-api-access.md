---
name: kipris-patent-api-access
description: KIPRIS 특허검색 API = "특허·실용 공개·등록공보" 서비스 무료신청(월 1,000건, KP242) — patUtiModInfoSearchSevice, getWordSearch 폐기예정→getAdvancedSearch
type: reference
created: 2026-07-18
---

KIPRIS 특허 정보검색 API를 K-Data MCP에 붙일 때의 접근 경로·함정 (2026-07-18 조사).

**엔드포인트**: `http://plus.kipris.or.kr/kipo-api/kipi/patUtiModInfoSearchSevice/{op}?...&ServiceKey={key}`
- op: `getWordSearch`(단어검색, **폐기예정**), `getAdvancedSearch`(항목별), `getBibliographyDetailInfoSearch`(서지). 구현은 getAdvancedSearch 기준.
- 응답 XML: `<response><header>successYN,resultCode,resultMsg</header><body><items><item>…</item></items><count/></body></response>`. 성공=`resultCode 00 NORMAL SERVICE.`

**접근 활성화 (핵심)**:
- KIPRIS 정보검색 API는 KIPRIS Plus **"특허·실용 공개·등록공보"** 서비스에 포함(국내 IP데이터>공보>특허·실용). 데이터셋 ID `DBII_000000000000001`.
- 활성화 = plus.kipris.or.kr 로그인 → 데이터 서비스 > 서비스 신청 > Open API → "특허·실용 공개·등록공보" 체크 → 장바구니 → **유/무료 드롭다운을 무료로 변경**(기본값 유료!) → 신청하기 → 관리자 승인 **영업일 1~3일**.
- 무료 = `KP242` **월 1,000 호출 제한**. 유료(무제한) = `KP241`.
- AccessKey는 마이페이지 > API KEY 관리(계정당 1개, 영구). 시크릿 → `.env` `KIPRIS_API_KEY`, 커밋 금지.

**함정**:
- `resultCode 31 DEADLINE_HAS_EXPIRED` = 서비스 활용기간 만료/미신청(키 자체 문제 아님). AccessKey는 유효해도 서비스 신청이 만료되면 이 코드.
- 신청 목록에서 "정보검색" 검색 = 0건. 서비스명이 "공보"라서 안 잡힘.
- data.go.kr의 KIPRIS 특허검색 항목 클릭 시 plus.kipris.or.kr로 리다이렉트 — 원천은 KIPRIS Plus(별도 data.go.kr API 아님).
- 장바구니 "담기" 클릭 시 blocking JS dialog(alert) 발생 → 브라우저 자동화 시 navigate로 우회.

**Why:** 특허검색 MCP 도구 추가 시 접근 경로·무료 신청·만료 코드를 매번 재조사하지 않기 위함. 기존 의약품 특허(`public_data.search_medicine_patent`)는 별개(data.go.kr).
**How to apply:** KIPRIS 도구 구현·디버깅 시 이 노트 참조. code 31 나오면 서비스 활용기간부터 확인. 상세 스펙·구현 계획은 세션 HANDOFF(2026-07-18) 참조.
