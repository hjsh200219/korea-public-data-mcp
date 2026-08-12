---
name: korea-public-data
description: 대한민국 공공데이터 MCP 도구 19종의 라우팅 가이드. 법령·판례·헌재결정, DART 기업공시·재무제표, 관세청 통관·HS코드·관세율·환율, 금융상품(예적금·대출)·보험 공시, 나라장터 입찰·낙찰, 국회 의안·표결, 약국·병원·온비드·사업자진위, 한국관광공사 관광정보, YouTube 자막, 미국·독일 판례, 정부24 민원을 조회할 때 사용한다. 트리거 — "법령 찾아줘", "판례 검색", "이 회사 공시", "재무제표", "HS코드", "관세율", "환율", "예금 금리 비교", "실손보험", "입찰공고", "낙찰", "발의 법안", "국회 표결", "근처 약국", "병원 찾기", "온비드 공매", "사업자등록 진위", "여행지 추천", "축제 일정", "유튜브 자막", "미국 판례", "독일 판례", "민원 절차".
---

# 대한민국 공공데이터 조회

19개 MCP 도구가 각각 여러 `action`을 갖는 구조다. **도구를 먼저 고르고, action을 고른다.**

## 1단계: 도구 선택

| 사용자가 묻는 것 | 도구 |
|---|---|
| 법률·시행령·시행규칙·행정규칙·조례·조약 본문 | `legal_research` |
| 대법원 판례, 헌재결정례, 법령해석례, 행정심판례 | `case_research` |
| 법 개정 전후 비교, 신구법, 법령 체계도 | `law_amendment` |
| 상장사 공시, 재무제표, 기업개황, 배당 | `corporate_disclosure` |
| 약국·병원·동물병원, 의약품, 온비드 공매, 사업자등록 진위 | `public_data` |
| 예금·적금·대출·연금저축 금리 비교 | `financial_product` |
| 실손·자동차·생명·변액·퇴직연금 보험 공시 | `insurance` |
| 나라장터 입찰공고, 낙찰결과 | `procurement` |
| 수입 통관, 화물추적, 검역, 관세 납부 | `import_clearance` |
| 수출 이행내역, 수출신고필증 검증 | `export_clearance` |
| 보세구역, 보세운송, 입출항, 배차 | `shipping_logistics` |
| HS코드, 관세율, 관세환율·시장환율, 간이환급 | `tariff_lookup` |
| 관세사·포워더·항공사·선박회사·해외공급자 | `trade_entity` |
| YouTube 자막 추출·요약, 영상정보·검색·댓글 | `youtube` |
| 제품 리뷰(유튜브 리뷰 + 쿠팡 구매링크) | `product_review` |
| 관광지·축제·숙박 검색, 지역 코드 | `tourism` |
| 미국(CourtListener)·독일(OpenLegalData) 판례 | `foreign_case_research` |
| 국회 의안 발의·처리·표결, 의원 정보, 회의록 | `assembly` |
| 정부24 민원 절차 AI 질의응답 | `gov24_ai` |

## 2단계: action 선택

### 법령 — `legal_research`
검색: `search_laws`(법률·시행령) `search_admin_rules`(행정규칙) `search_ordinances`(자치법규) `search_treaties`(조약) `search_legal_terms` `search_english_laws` `search_attached_forms`(별표·서식) `search_law_abbreviations` `search_ai_legal_terms` `search_linked_ordinances`
상세: `get_law_detail` `get_admin_rule_detail` `get_ordinance_detail` `get_treaty_detail` `get_legal_term_detail` `get_english_law_detail` `get_law_article_sub`

> 조문이 많은 법령은 응답이 8000자에서 잘린다. `get_law_detail`에 `article_start`/`article_end`를 주어 범위로 나눠 조회할 것.

### 판례 — `case_research`
`search_cases` / `get_case_detail` — 대법원·하급심 (`court`: supreme|lower|all)
`search_constitutional` / `get_constitutional_detail` — 헌재결정례
`search_interpretations` / `get_interpretation_detail` — 법령해석례
`search_committee_decisions` / `get_committee_decision_detail` — 위원회 결정문
`search_admin_appeals` / `get_admin_appeal_detail` — 행정심판례

> 한국 판례 전용. 미국·독일 판례는 `foreign_case_research`.

### 법 개정 비교 — `law_amendment`
`search_old_new_law` / `get_old_new_law_detail`(신구법 비교) · `search_law_system` / `get_law_system_detail`(체계도) · `search_three_way_comp` / `get_three_way_comp_detail`(3단비교) · `search_law_change_history`(변경이력) · `search_admin_rule_old_new` / `get_admin_rule_old_new_detail`

### 기업공시 — `corporate_disclosure`
`resolve_corp_code`(회사명 → 고유번호, **다른 action의 선행 단계**) → `search_disclosures` `get_company_info` `get_financial_statements` `get_key_accounts` `get_document` `search_stock_dividend`

> 회사명만 알 때는 항상 `resolve_corp_code`부터. 정적 스냅샷(11.8만 건) 조회라 즉시 응답한다.

### 공공데이터 — `public_data`
`search_pharmacy` `search_hospital` `get_hospital_detail` `search_animal_hospital` `search_rare_medicine` `search_health_food` `search_bio_equivalence` `search_medicine_patent` `verify_business`(사업자 진위) `check_business_status`(휴폐업) `search_onbid_pbanc_list` `search_onbid_pbanc_cltr_detail`

> 약국·병원은 한글 시도/시군구명(예: "서울특별시", "강남구")을 그대로 넘기면 내부에서 지역코드로 변환된다.
> `search_hospital` 결과에 `ykiho`(요양기관기호)가 함께 나온다. 진료과목·진료시간·장비 등 상세는 그 값으로 `get_hospital_detail`을 호출한다.

### 금융·보험
`financial_product`: `company` `deposit`(정기예금) `saving`(적금) `annuity`(연금저축) `mortgage_loan` `rent_house_loan`(전세자금) `credit_loan`(개인신용)
`insurance`: `medical_reimbursement`(실손) `auto_contract` `auto_los_circumstance` `auto_victim` `property_insu_join` `variable_insurance_fund` `life_insu_join_status` `individual_annuity_insu` `retirement_pension_fund`

### 조달 — `procurement`
`bid_list`(입찰공고) `award_list`(낙찰결과)

### 무역·통관
`tariff_lookup`: `search_hs` `tariff_rate` `customs_rate`(관세환율) `market_exchange`(시장환율) `simple_drawback` `simple_drawback_company` `export_period_short` `statistics_code` `hs_navigation`
`import_clearance` (20종): `track_cargo` `get_containers` `get_arrival_report` `verify_declaration` `get_inspection` `get_tax_payment` `import_requirement` `single_window` `customs_check` `postal_customs` `postal_clearance` `attachment_status` `reimport_balance` `reexport_balance` `reexport_deadline` `reexport_completion` `collateral_release` `declaration_correction` `search_import_meat` `lookup_meat_by_bl`
`export_clearance`: `export_performance` `verify_export` `export_by_vehicle` `loading_inspection` `ecommerce_export_load` `bonded_release`
`shipping_logistics`: `bonded_area` `shed_info` `bonded_vehicle` `port_entry_exit` `unloading_declarations` `sea_departure` `air_departure` `air_arrival_report` `bonded_transport_info`
`trade_entity` (11종): `search_company` `search_broker` `broker_detail` `search_animal_plant_company` `forwarder_list` `forwarder_detail` `airline_list` `airline_detail` `ship_company_list` `ship_company_detail` `overseas_supplier`

### 국회 — `assembly`
의안(12): `bill_search` `bill_search_extended` `bill_detail` `bill_proposers` `bill_processing` `bill_pending` `bill_processed` `bill_receipts` `bill_judge` `bill_recent_plenary` `bill_plenary_referred` `bill_committee_alt`
표결·본회의(8): `vote_by_bill` `member_votes` `plenary_vote_bills` `plenary_processed_law` `plenary_processed_budget` `plenary_processed_etc` `plenary_processed_settlement` `plenary_schedule`
의원·회의(5): `member_current` `member_history` `plenary_minutes` `committee_minutes` `bill_committee_conferences`

> 대부분의 action이 `AGE`(대수, 예: 22)를 요구한다. 미지정 시 현재 대수로 자동 보강된다.

### 관광 — `tourism`
`search_tourism_area`(지역 기반) `search_tourism_keyword` `search_tourism_location`(좌표 반경) `search_tourism_festival` `search_tourism_stay` `get_tourism_detail` `get_tourism_codes`

### YouTube — `youtube` / `product_review`
`youtube`: `get_transcript`(자막+타임스탬프) `summarize` `video_info` `search` `comments`
`product_review`: `full_review`(유튜브 리뷰 + 쿠팡 링크) `find_reviews`(유튜브만) `coupang_search`(쿠팡만)

### 해외 판례 — `foreign_case_research`
`search_us_cases` / `get_us_case_detail` — CourtListener, cursor 페이지네이션. 주요 법원 slug: `scotus`, `ca1`~`ca11`, `cadc`, `cafc`, `dcd`
`search_de_cases` / `get_de_case_detail` — OpenLegalData, page 페이지네이션
본문은 원문(영어/독일어) 그대로 반환된다.

### 민원 — `gov24_ai`
`ask` — 정부24 AI 민원 질의응답 (beta, 비공식 엔드포인트)

## 응답 처리 규칙

- 모든 응답은 **8000자에서 잘린다**. 잘렸다는 표시가 보이면 `offset` 파라미터로 다음 구간을 이어서 조회한다.
- 검색 → 상세 2단계 도구가 많다. 목록에서 ID를 얻은 뒤 상세 action을 호출한다.
- 일부 도구는 서버의 API 키 설정에 따라 비활성 상태일 수 있다. 도구 목록에 없으면 해당 도메인 키가 미설정된 것이다.

## 원격 서버

이 플러그인은 `https://public-data.up.railway.app/mcp` 에 연결한다. API 키는 서버가 보유하므로 사용자 설정이 필요 없다. 서버 상태 확인: `https://public-data.up.railway.app/health`
