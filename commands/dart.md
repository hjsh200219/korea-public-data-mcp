---
description: DART 전자공시 기업 정보·재무제표 조회
argument-hint: [회사명] [알고 싶은 것]
---

기업 공시 조회 요청: **$ARGUMENTS**

`corporate_disclosure` 도구로 처리한다.

1. **`resolve_corp_code`를 먼저 호출**해 회사명을 8자리 고유번호로 변환한다. 동명이인·유사 상호가 나오면 상장 여부와 업종으로 구분해 사용자에게 확인한다.
2. 요청 내용에 맞는 action을 고른다.
   - 최근 공시 목록 → `search_disclosures`
   - 회사 개요(대표자·업종·주소) → `get_company_info`
   - 재무제표 → `get_financial_statements` (`reprt_code`: 11011=사업보고서, 11012=반기, 11013=1분기, 11014=3분기)
   - 주요 계정 요약 → `get_key_accounts`
   - 공시서류 본문 → `get_document`
   - 배당 → `search_stock_dividend`
3. 숫자는 단위(원/백만원)를 명시하고, 전년 동기 대비 증감을 함께 제시한다.
4. 조회한 보고서의 **접수번호와 접수일자**를 근거로 남긴다.

스냅샷에 없는 신규 상장사는 라이브 조회로 넘어가 느릴 수 있다. 응답이 없으면 정식 상호명으로 재시도한다.
