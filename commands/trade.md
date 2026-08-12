---
description: HS코드·관세율·환율·통관 조회 (관세청 UNI-PASS)
argument-hint: [품목명 / HS코드 / 화물관리번호]
---

무역·통관 조회 요청: **$ARGUMENTS**

입력 형태로 도구를 고른다.

| 입력 | 도구 · action |
|---|---|
| 품목명 (예: 커피, 노트북) | `tariff_lookup` → `search_hs` 로 HS코드 확보 후 `tariff_rate` |
| HS코드 10자리 | `tariff_lookup` → `tariff_rate` |
| 환율 | `tariff_lookup` → `customs_rate`(관세환율) 또는 `market_exchange`(시장환율) |
| 화물관리번호·B/L | `import_clearance` → `track_cargo` |
| 수입신고번호 | `import_clearance` → `verify_declaration` |
| 수출신고번호 | `export_clearance` → `verify_export` |
| 보세구역·입출항·배차 | `shipping_logistics` |
| 관세사·포워더·선사 상호 | `trade_entity` |

처리 규칙:
1. HS코드는 6자리(국제 공통)와 10자리(국내 세번)를 구분해 표기한다.
2. 관세율은 기본세율·WTO협정세율·FTA세율을 나눠 보여주고, 어느 원산지 기준인지 명시한다.
3. 요건확인 대상 품목이면 `import_requirement`로 필요 인증·허가를 함께 조회한다.
4. 환율은 **적용 주차와 고시일**을 반드시 함께 적는다.
