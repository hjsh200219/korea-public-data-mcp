---
description: 예적금·대출 금리 비교, 보험상품 공시 조회 (금감원·금융위)
argument-hint: [상품 유형] [조건]
---

금융상품 조회 요청: **$ARGUMENTS**

| 요청 | 도구 · action |
|---|---|
| 정기예금 금리 비교 | `financial_product` → `deposit` |
| 적금 | `financial_product` → `saving` |
| 연금저축 | `financial_product` → `annuity` |
| 주택담보대출 | `financial_product` → `mortgage_loan` |
| 전세자금대출 | `financial_product` → `rent_house_loan` |
| 개인신용대출 | `financial_product` → `credit_loan` |
| 금융회사 목록 | `financial_product` → `company` |
| 실손의료보험 | `insurance` → `medical_reimbursement` |
| 자동차보험 | `insurance` → `auto_contract` `auto_los_circumstance` `auto_victim` |
| 변액·생명·연금·퇴직연금 | `insurance` → `variable_insurance_fund` `life_insu_join_status` `individual_annuity_insu` `retirement_pension_fund` |

처리 규칙:
1. 금리는 **기본금리와 최고우대금리를 나눠** 제시하고, 우대 조건을 함께 적는다.
2. 예적금은 단리/복리, 대출은 고정/변동 구분을 명시한다.
3. 상위 5개만 표로 보여주고 정렬 기준(금리순 등)을 밝힌다.
4. 공시 데이터는 **기준일자**를 반드시 함께 표기한다. 실제 가입 조건은 해당 금융회사 확인이 필요하다고 덧붙인다.

투자·가입 권유가 아니라 공시 데이터 조회 결과임을 유지한다.
