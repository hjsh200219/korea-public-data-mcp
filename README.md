# K Public Data MCP

대한민국 공공데이터 MCP(Model Context Protocol) 서버입니다.
법제처 국가법령정보센터, DART 전자공시시스템, 공공데이터포털, 관세청 UNI-PASS, 수출입은행 환율, 농림축산식품부, 금융감독원 금융상품 비교공시, 금융위원회 보험상품 공시, 조달청 나라장터, YouTube 자막·메타데이터, 한국관광공사 KorService2, 쿠팡 파트너스, 국회 Open API, 정부24 plus AI 민원 검색, 해외 판례(CourtListener·OpenLegalData) API를 통합합니다.

---

## 조회 가능 항목

### 법제처 국가법령정보센터 (21개 도구)

| # | 분류 | 검색 도구 | 상세 조회 도구 | 설명 |
|---|------|-----------|----------------|------|
| 1 | 법령 | `search_laws` | `get_law_detail` | 법률, 대통령령, 총리령, 부령 등 |
| 2 | 판례 | `search_cases` | `get_case_detail` | 대법원 및 하급법원 판례 |
| 3 | 헌재결정례 | `search_constitutional` | `get_constitutional_detail` | 헌법재판소 결정례 |
| 4 | 법령해석례 | `search_interpretations` | `get_interpretation_detail` | 법제처 법령해석 |
| 5 | 행정규칙 | `search_admin_rules` | `get_admin_rule_detail` | 훈령, 예규, 고시, 공고 등 |
| 6 | 자치법규 | `search_ordinances` | `get_ordinance_detail` | 지방자치단체 조례 및 규칙 |
| 7 | 조약 | `search_treaties` | `get_treaty_detail` | 대한민국 체결 조약 |
| 8 | 법령용어 | `search_legal_terms` | `get_legal_term_detail` | 법령에서 사용되는 용어 정의 |
| 9 | 영문법령 | `search_english_laws` | `get_english_law_detail` | 한국 법령의 영문 번역본 |
| 10 | 위원회 결정문 | `search_committee_decisions` | `get_committee_decision_detail` | 11개 행정위원회 결정문 |
| 11 | 행정심판례 | `search_admin_appeals` | `get_admin_appeal_detail` | 행정심판 재결례 |
| 12 | 신구법비교 | `search_old_new_law` | `get_old_new_law_detail` | 법령 개정 전후 조문 대비 |
| 13 | 법령 체계도 | `search_law_system` | `get_law_system_detail` | 상위법-하위법 관계 체계도 |
| 14 | 3단비교 | `search_three_way_comp` | `get_three_way_comp_detail` | 법률·시행령·시행규칙 비교 |
| 15 | 별표서식 | `search_attached_forms` | - | 법령 별표·서식·별지 |
| 16 | 법령 약칭 | `search_law_abbreviations` | - | 법령 약칭명 목록 |
| 17 | 법령 변경이력 | `search_law_change_history` | - | 특정 일자 법령 변경 내역 |
| 18 | 조항호목 | - | `get_law_article_sub` | 특정 조·항·호·목 정밀 조회 |
| 19 | 지식베이스 법령용어 | `search_ai_legal_terms` | - | AI 기반 용어·조문 관계 검색 |
| 20 | 연계 조례 | `search_linked_ordinances` | - | 법령-자치법규 연계 조례 |
| 21 | 행정규칙 신구법비교 | `search_admin_rule_old_new` | `get_admin_rule_old_new_detail` | 행정규칙 개정 전후 대비 |

### DART 전자공시시스템 (5개 도구, 선택)

> `DART_API_KEY` 환경변수 설정 시 활성화됩니다.

| # | 분류 | 도구 | 설명 |
|---|------|------|------|
| 22 | 기업 고유번호 검색 | `dart_resolve_corp_code` | 회사명으로 DART 고유번호 조회 |
| 23 | 공시보고서 검색 | `dart_search_disclosures` | 기업 공시보고서 목록 조회 |
| 24 | 기업개황 | `dart_get_company_info` | 대표자, 주소, 업종 등 기본정보 |
| 25 | 전체 재무제표 | `dart_get_financial_statements` | 재무상태표, 손익계산서 등 |
| 26 | 주요계정 | `dart_get_key_accounts` | 매출액, 영업이익, 당기순이익 등 |

### 공공데이터포털 (8개 도구, 선택)

> `DATA20_SERVICE_KEY` 환경변수 설정 시 활성화됩니다.

| # | 분류 | 도구 | 설명 |
|---|------|------|------|
| 27 | 약국 검색 | `data20_search_pharmacy` | 전국 약국 정보 (지역·약국명) |
| 28 | 병원 검색 | `data20_search_hospital` | 전국 병원·의원 정보 |
| 29 | 동물병원 검색 | `data20_search_animal_hospital` | 전국 동물병원 정보 |
| 30 | 주식배당정보 | `data20_search_stock_dividend` | 상장기업 배당금·배당률 |
| 31 | 희귀의약품 검색 | `data20_search_rare_medicine` | 희귀의약품 품목·효능 정보 |
| 32 | 건강기능식품 검색 | `data20_search_health_food` | 건강기능식품 제품 정보 |
| 33 | 사업자등록 진위확인 | `data20_verify_business` | 사업자번호·대표자명 진위 확인 |
| 34 | 사업자등록 상태조회 | `data20_check_business_status` | 사업자 상태 (계속/휴업/폐업) |

### 관세청 UNI-PASS (선택)

> `UNIPASS_KEY_API*` 환경변수 설정 시 활성화됩니다 (API 번호별 개별 키, 예: `UNIPASS_KEY_API001`).

`tariff_lookup` 스킬로 관세율·HS코드 조회 / `import_clearance`·`export_clearance` 스킬로 수입·수출 통관 정보 조회 / `trade_entity` 스킬로 무역 업체 조회 / `shipping_logistics` 스킬로 물류·운송 정보 조회.

### 수출입은행 환율 (선택)

> `EXCHANGE_RATE_API_KEY` 환경변수 설정 시 활성화됩니다.

`tariff_lookup` 스킬의 `exchange_rate` 액션으로 기준환율 조회.

### 농림축산식품부 (선택)

> `MAFRA_API_KEY` 환경변수 설정 시 활성화됩니다.

`trade_entity` 스킬로 수입축산물 이력 조회.

### 금융감독원 금융상품 비교공시 (선택)

> `FINLIFE_API_KEY` 환경변수 설정 시 활성화됩니다.

`financial_product` 스킬로 예금·적금·대출·연금·펀드 등 금융상품 비교공시 조회.

### 금융위원회 보험상품 공시 (선택)

`insurance` 스킬로 보험상품 공시 정보 조회 (별도 키 불필요).

### 조달청 나라장터 G2B (선택)

`procurement` 스킬로 입찰공고·낙찰결과 조회 (별도 키 불필요).

### YouTube 자막·메타데이터 (선택)

> 자막 추출은 키 없이 사용 가능. `YOUTUBE_API_KEY` 설정 시 메타데이터·검색·댓글 기능 추가 활성화.

`youtube` 스킬로 YouTube 자막 추출, `product_review` 스킬로 제품 리뷰 검색 (+ 쿠팡 링크 통합).

### 쿠팡 파트너스 (선택)

> `COUPANG_ACCESS_KEY` / `COUPANG_SECRET_KEY` 환경변수 설정 시 활성화됩니다.

`product_review` 스킬의 `coupang_search`·`full_review` 액션으로 쿠팡 상품 검색 및 구매 링크 조회.

### 한국관광공사 KorService2 (선택)

`tourism` 스킬로 관광지·행사·음식점·숙박 정보 조회 (별도 키 불필요).

### 국회 Open API (선택)

> `ASSEMBLY_API_KEY` 환경변수 설정 시 활성화됩니다.

`assembly` 스킬로 의안 검색·표결·국회의원·회의록·일정 조회.

### 정부24 plus AI 민원 검색 (선택)

> `GOV24_AI_ENABLED=true` 환경변수 설정 시 활성화됩니다 (비공식 역방향 엔드포인트, 기본 비활성).

`gov24_ai` 스킬로 정부24 AI 민원 질의응답 검색.

### 해외 판례 — CourtListener + OpenLegalData (4개 액션, 비교법 참조용)

> 토큰 게이팅: `COURTLISTENER_API_TOKEN` (미국) / `OPENLEGALDATA_API_TOKEN` 또는 `FOREIGN_CASE_ENABLED=true` (독일).

| # | 액션 | 설명 |
|---|------|------|
| - | `foreign_case_research.search_us_cases` | 미국 연방·주 법원 판례 검색 (CourtListener v4 cursor 페이지네이션, 정규화 도메인 응답) |
| - | `foreign_case_research.get_us_case_detail` | 미국 Opinion 상세 (HTML fallback chain + 본문 offset 윈도우) |
| - | `foreign_case_research.search_de_cases` | 독일 판례 검색 (OpenLegalData, page 페이지네이션) |
| - | `foreign_case_research.get_de_case_detail` | 독일 판례 상세 (Aktenzeichen, ECLI 포함) |

추가 REST 전용 엔드포인트: `/api/courtlistener/clusters/{clusterId}`, `/api/courtlistener/courts` (Cluster 메타·법원 목록).

워크플로 가이드: `해외판례_비교법_워크플로` MCP 프롬프트로 한국 판례 ↔ 미국 판례 비교법 리서치 자동화.

---

## 항목별 상세 안내

### 1. 법령

현행 법률, 대통령령, 총리령, 부령 등 대한민국의 모든 법령을 검색하고 조문 내용을 조회합니다.

**검색 예시**: "민법 검색해줘", "개인정보보호법 찾아줘", "근로기준법 조문 보여줘"

| 검색 옵션 | 설명 |
|-----------|------|
| 법령명 검색 | 법령 이름으로 검색 (기본값) |
| 본문 검색 | 법령 조문 내용에서 검색 |

**상세 조회 시 제공 정보**: 법령명, 법종구분, 소관부처, 공포일자, 시행일자, 제개정구분, 전체 조문 내용

### 2. 판례

대법원 및 하급법원의 판례를 검색하고, 판시사항·판결요지·판례 전문을 조회합니다.

**검색 예시**: "손해배상 판례 찾아줘", "부당해고 관련 대법원 판례", "2024년 임대차 판례"

| 검색 옵션 | 설명 |
|-----------|------|
| 사건명 검색 | 사건 이름으로 검색 |
| 전문 검색 | 판례 본문 전체에서 검색 (기본값) |
| 기간 지정 | 시작일~종료일 (YYYYMMDD 형식) |
| 법원 유형 | 대법원 / 하급법원 / 전체 |

**상세 조회 시 제공 정보**: 사건명, 사건번호, 선고일자, 법원명, 판시사항, 판결요지, 참조조문, 참조판례, 판례 전문

### 3. 헌재결정례

헌법재판소의 위헌심판, 헌법소원 등 결정례를 검색하고 결정 전문을 조회합니다.

**검색 예시**: "사형제도 헌재결정 찾아줘", "기본권 침해 헌법소원"

**상세 조회 시 제공 정보**: 사건번호, 사건명, 종국일자, 판시사항, 결정요지, 전문, 참조조문, 참조판례

### 4. 법령해석례

법제처의 법령해석 사례를 검색합니다. 법령의 의미나 적용 범위에 대한 공식 해석입니다.

**검색 예시**: "건축법 법령해석례", "영업허가 해석례"

**상세 조회 시 제공 정보**: 안건명, 안건번호, 해석일자, 질의기관, 질의요지, 회답, 이유

### 5. 행정규칙

훈령, 예규, 고시, 공고 등 행정기관의 내부 규칙을 검색합니다.

**검색 예시**: "보조금 관리 고시", "공무원 복무 예규"

**상세 조회 시 제공 정보**: 행정규칙명, 종류, 발령일자, 발령번호, 소관부처, 규칙 내용

### 6. 자치법규

지방자치단체(시·도, 시·군·구)의 조례 및 규칙을 검색하고 조문을 조회합니다.

**검색 예시**: "서울시 주차 조례", "경기도 환경 조례"

| 검색 옵션 | 설명 |
|-----------|------|
| 자치법규명 검색 | 자치법규 이름으로 검색 (기본값) |
| 본문 검색 | 조문 내용에서 검색 |

**상세 조회 시 제공 정보**: 자치법규명, 지자체명, 공포일자, 시행일자, 전체 조문 내용

### 7. 조약

대한민국이 체결한 양자·다자 조약을 검색하고 내용을 조회합니다.

**검색 예시**: "한미 FTA", "범죄인 인도 조약"

**상세 조회 시 제공 정보**: 조약명(한글/영문), 조약번호, 발효일, 서명일, 체결대상국, 조약 분야, 조약 내용

### 8. 법령용어

법령에서 사용되는 전문 용어의 정의를 검색합니다.

**검색 예시**: "선의취득 뜻 알려줘", "법령용어 '기속행위' 검색"

**상세 조회 시 제공 정보**: 용어명(한글/한자), 정의, 출처

### 9. 영문법령

한국 법령의 공식 영문 번역본을 검색하고 조문을 조회합니다.

**검색 예시**: "Civil Act 영문법령", "labor standards act"

**상세 조회 시 제공 정보**: 영문 법령명, 공포일자, 공포번호, 영문 조문 전체

### 10. 위원회 결정문

11개 행정위원회의 결정문을 검색하고 주문·이유 등을 조회합니다.

| 코드 | 위원회명 | 주요 내용 |
|------|----------|-----------|
| `ftc` | 공정거래위원회 | 독점규제, 불공정거래행위, 기업결합 |
| `acr` | 국민권익위원회 | 고충민원, 부패방지, 행정심판 |
| `fsc` | 금융위원회 | 금융제재, 인가·허가, 검사·제재 |
| `nlrc` | 노동위원회 | 부당해고·부당노동행위 구제 |
| `kcc` | 방송통신위원회 | 방송심의, 통신규제 |
| `oclt` | 중앙토지수용위원회 | 토지수용 재결 |
| `nhrck` | 국가인권위원회 | 인권침해, 차별행위 |
| `eiac` | 고용보험심사위원회 | 고용보험 급여 심사 |
| `ecc` | 중앙환경분쟁조정위원회 | 환경오염 피해 분쟁조정 |
| `sfc` | 증권선물위원회 | 증권·선물 불공정거래 제재 |
| `iaciac` | 산재보험재심사위원회 | 산업재해 보험급여 재심사 |

**검색 예시**: "공정거래위원회 결정문 검색해줘", "노동위원회 부당해고 결정문"

**상세 조회 시 제공 정보**: 사건명, 사건번호, 결정일자, 요지/개요, 주문/조치내용, 이유, 위원회별 추가 정보

### 11. 행정심판례

행정심판위원회의 재결례를 검색하고 주문·이유 등을 조회합니다.

**검색 예시**: "해고처분 행정심판", "영업정지 재결례"

**상세 조회 시 제공 정보**: 사건명, 사건번호, 의결일자, 처분청, 재결청, 재결구분, 주문, 청구취지, 이유, 재결요지

### 12. 신구법비교

법령의 개정 전후 조문을 대비하여 비교합니다.

**검색 예시**: "건축법 신구법비교", "민법 개정 전후 비교"

**상세 조회 시 제공 정보**: 구법/신법 기본정보(법령명, 시행일자, 공포일자), 구조문 목록, 신조문 목록

### 13. 법령 체계도

법령의 상위법-하위법 관계(법률→시행령→시행규칙→행정규칙→자치법규)를 체계적으로 조회합니다.

**검색 예시**: "건축법 체계도", "근로기준법 하위법령"

**상세 조회 시 제공 정보**: 기본정보, 상하위법 체계 (법률, 시행령, 시행규칙, 행정규칙, 자치법규 관계)

### 14. 3단비교

법률·시행령·시행규칙의 조문을 3단으로 나란히 비교합니다.

**검색 예시**: "건축법 3단비교", "개인정보보호법 인용조문 비교"

| 비교 유형 | 설명 |
|-----------|------|
| 인용조문 (citation) | 법률 조문이 인용하는 시행령·시행규칙 조문 (기본값) |
| 위임조문 (delegation) | 법률이 위임한 시행령·시행규칙 조문 |

**상세 조회 시 제공 정보**: 법률명·시행령명·시행규칙명, 조문별 3단 비교 내용, 위임행정규칙 정보

### 15. 별표서식

법령에 첨부된 별표·서식·별지를 검색합니다.

**검색 예시**: "건축법 별표", "소득세법 서식"

| 종류 | 설명 |
|------|------|
| `table` | 별표 |
| `form` | 서식 |
| `annex` | 별지 |
| `other` | 기타 |
| `unclassified` | 미분류 |

**검색 시 제공 정보**: 별표명, 관련법령명, 별표종류, 소관부처, 파일링크

### 16. 법령 약칭

법령의 약칭(줄여서 부르는 법령명) 목록을 검색합니다.

**검색 예시**: "법령 약칭 검색", "약칭 목록 보여줘"

**검색 시 제공 정보**: 법령명, 약칭명, 법종구분, 소관부처, 시행일자

### 17. 법령 변경이력

특정 일자에 변경(공포·시행)된 법령 목록을 조회합니다.

**검색 예시**: "2025년 1월 1일 변경된 법령", "오늘 시행 법령"

| 파라미터 | 설명 |
|----------|------|
| `date` | 변경 일자 (YYYYMMDD 형식, 필수) |

**검색 시 제공 정보**: 법령명, 법종구분, 제개정구분, 공포일자, 시행일자, 소관부처

### 18. 조항호목

법령의 특정 조·항·호·목을 정밀하게 조회합니다. 전체 조문이 아닌 특정 부분만 필요할 때 사용합니다.

**검색 예시**: "민법 제1조 조회", "건축법 제11조 제1항 제3호"

| 파라미터 | 설명 |
|----------|------|
| `law_id` | 법령 일련번호 (MST) |
| `article` | 조번호 (6자리, 예: `000100` = 제1조) |
| `paragraph` | 항번호 (6자리, 선택) |
| `clause` | 호번호 (6자리, 선택) |
| `subclause` | 목번호 (한글 한 글자, 선택) |

### 19. 지식베이스 법령용어

법령정보 지식베이스에서 법령용어를 검색합니다. 용어간·조문간 관계 정보를 제공합니다.

**검색 예시**: "선의취득 지식베이스", "채권양도 용어 관계"

**검색 시 제공 정보**: 용어명, 동음이의어 존재 여부, 용어간 관계 링크, 조문간 관계 링크

### 20. 연계 조례

법령에 연계된 지방자치단체 조례 목록을 검색합니다.

**검색 예시**: "건축법 연계 조례", "주차장법 관련 지방 조례"

**검색 시 제공 정보**: 자치법규명, 자치법규 종류, 제개정구분, 시행일자

### 21. 행정규칙 신구법비교

행정규칙(훈령, 예규, 고시 등)의 개정 전후 조문을 대비하여 비교합니다.

**검색 예시**: "공무원 예규 신구법비교", "고시 개정 전후"

**상세 조회 시 제공 정보**: 구법/신법 기본정보(행정규칙명, 시행일자, 발령일자), 구조문 목록, 신조문 목록

### 22~26. DART 전자공시시스템

금융감독원 전자공시시스템(DART)의 기업 공시정보를 검색합니다. [DART 오픈API](https://opendart.fss.or.kr)에서 API 키를 발급받아 사용합니다.

**검색 예시**: "삼성전자 공시보고서 검색해줘", "LG에너지솔루션 재무제표 보여줘", "현대차 기업개황 조회"

| 도구 | 설명 | 주요 파라미터 |
|------|------|---------------|
| `dart_resolve_corp_code` | 회사명으로 고유번호 검색 | `corp_name` |
| `dart_search_disclosures` | 공시보고서 목록 | `corp_code`, `bgn_de`, `end_de`, `pblntf_ty` |
| `dart_get_company_info` | 기업개황 (대표자, 주소 등) | `corp_code` |
| `dart_get_financial_statements` | 전체 재무제표 | `corp_code`, `bsns_year`, `reprt_code`, `fs_div` |
| `dart_get_key_accounts` | 주요계정 (매출·영업이익) | `corp_code`, `bsns_year`, `reprt_code` |

> DART 도구 사용 시 `dart_resolve_corp_code`로 먼저 기업 고유번호를 조회한 뒤 다른 도구에 전달합니다.

### 27~34. 공공데이터포털

공공데이터포털(data.go.kr)의 생활·의료·사업자 정보를 검색합니다. [공공데이터포털](https://www.data.go.kr)에서 서비스 키를 발급받아 사용합니다.

**검색 예시**: "강남구 약국 찾아줘", "서울대학교병원 정보", "삼성전자 주식배당 조회", "사업자번호 상태 확인해줘"

| 도구 | 설명 | 주요 파라미터 |
|------|------|---------------|
| `data20_search_pharmacy` | 약국 검색 | `Q0`(시도), `Q1`(시군구), `QN`(약국명) |
| `data20_search_hospital` | 병원 검색 | `yadmNm`(기관명), `clCd`(종별), `dgsbjtCd`(진료과목) |
| `data20_search_animal_hospital` | 동물병원 검색 | `yadmNm`(기관명), `sidoCd`, `sgguCd` |
| `data20_search_stock_dividend` | 주식배당정보 | `stckIssuCmpyNm`(회사명), `basDt`(기준일) |
| `data20_search_rare_medicine` | 희귀의약품 검색 | `item_name`(품목명), `entp_name`(업체명) |
| `data20_search_health_food` | 건강기능식품 검색 | `prdlst_nm`(제품명) |
| `data20_verify_business` | 사업자등록 진위확인 | `b_no`, `start_dt`, `p_nm` |
| `data20_check_business_status` | 사업자등록 상태조회 | `b_no` |

---

## 검색 파라미터 레퍼런스

### 공통 파라미터

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `query` | string | O | 검색어 |
| `page` | number | X | 페이지 번호 (기본 1) |
| `display` | number | X | 페이지당 결과 수 (1~100, 기본 20) |

### 도구별 추가 파라미터

- **search_laws**: `search_type` (law_name/full_text)
- **search_cases**: `search_type` (case_name/full_text), `date_from`, `date_to`, `court` (supreme/lower/all)
- **search_ordinances**: `search_type` (ordinance_name/full_text)
- **get_case_detail**: `sections` (holdings, summary, reference_laws, reference_cases, content, all)
- **get_constitutional_detail**: `sections` (holdings, decision_summary, full_text, reference_laws, reference_cases, all)
- **search_committee_decisions**: `committee` (필수, 위원회 코드)
- **get_committee_decision_detail**: `committee` (필수), `decision_id`
- **get_three_way_comp_detail**: `comparison_type` (citation/delegation)
- **search_attached_forms**: `form_type` (all/table/form/annex/other/unclassified)
- **search_law_change_history**: `date` (YYYYMMDD, 필수)
- **get_law_article_sub**: `law_id`, `article` (필수), `paragraph`, `clause`, `subclause` (선택)

---

## 사용 팁

모든 항목은 **검색 → 상세 조회** 2단계로 동작합니다.
AI에게 자연어로 요청하면 이 과정을 자동으로 처리합니다.

```
"약사법 제23조 내용 보여줘"
→ search_laws로 '약사법' 검색 → get_law_detail로 조문 조회

"2024년 대법원 임대차 판례 찾아줘"
→ search_cases로 기간·법원 지정 검색

"개인정보 관련 법령해석례 있어?"
→ search_interpretations로 검색

"서울시 주차 관련 조례 찾아줘"
→ search_ordinances로 검색

"건축법 개정 전후 비교해줘"
→ search_old_new_law로 검색 → get_old_new_law_detail로 신구 조문 대비

"건축법의 하위법령 체계 보여줘"
→ search_law_system로 검색 → get_law_system_detail로 체계도 조회

"건축법 법률·시행령·시행규칙 3단비교"
→ search_three_way_comp로 검색 → get_three_way_comp_detail로 조회

"민법 제1조 제1항만 보여줘"
→ get_law_article_sub로 조항호목 정밀 조회

"해고처분 행정심판 재결례 찾아줘"
→ search_admin_appeals로 검색 → get_admin_appeal_detail로 조회

"삼성전자 2024년 재무제표 보여줘"
→ dart_resolve_corp_code로 고유번호 조회 → dart_get_financial_statements로 재무제표 조회

"강남구 약국 찾아줘"
→ data20_search_pharmacy로 지역 기반 약국 검색

"사업자번호 1234567890 상태 확인"
→ data20_check_business_status로 사업 상태 조회
```

---

## 설치 및 설정

> 처음 사용하시는 분은 [설치 가이드 (초보자용)](INSTALL_GUIDE.md)를 참고하세요.

### 방법 1: Remote MCP (Claude) — 추천

설치 없이 Claude 앱에서 바로 연결할 수 있습니다.
법령·DART·공공데이터 등 **모든 기능이 포함**되어 있어 별도 API 키 발급이 필요 없습니다.

**Claude 모바일/웹 앱:**

1. Claude 앱 → **Settings → Connectors**
2. **Add custom connector** 클릭
3. URL 입력: `https://public-data.up.railway.app/mcp`
4. **Add** 클릭

Pro/Max 플랜이 필요합니다.

**Claude Desktop / Cursor:**

`claude_desktop_config.json` 또는 `~/.cursor/mcp.json`에 추가:

```json
{
  "mcpServers": {
    "public-data": {
      "url": "https://public-data.up.railway.app/mcp"
    }
  }
}
```

### 방법 2: Claude Code 플러그인 (GitHub) — Claude Code 사용자 추천

Claude Code에서는 플러그인 한 번 설치로 **MCP 도구 19종 + 슬래시 커맨드 7종 + 라우팅 스킬**이 함께 등록됩니다.
원격 서버에 연결되므로 API 키 발급이 필요 없습니다.

```bash
claude plugin marketplace add hjsh200219/korea-public-data-mcp
claude plugin install korea-public-data@korea-public-data
```

또는 Claude Code 세션 안에서:

```
/plugin marketplace add hjsh200219/korea-public-data-mcp
/plugin install korea-public-data@korea-public-data
```

**포함된 슬래시 커맨드**

| 커맨드 | 용도 |
|---|---|
| `/k-law` | 법령·판례 검색 (법제처) |
| `/k-dart` | 기업 공시·재무제표 (DART) |
| `/k-trade` | HS코드·관세율·환율·통관 (관세청) |
| `/k-bid` | 나라장터 입찰공고·낙찰 |
| `/k-bill` | 국회 의안·표결·의원 |
| `/k-finance` | 예적금·대출 금리, 보험 공시 |
| `/k-tools` | 도구 목록·연결 상태 확인 |

`korea-public-data` 스킬이 함께 설치되어, 슬래시 커맨드 없이 자연어로 물어도 적절한 도구와 action을 자동 선택합니다.

설치 확인:

```bash
claude plugin details korea-public-data
```

### 방법 3: OpenAI GPT Actions (커스텀 GPT)

ChatGPT의 커스텀 GPT에서 한국 법령 검색 기능을 사용할 수 있습니다.

1. [ChatGPT](https://chatgpt.com) → **My GPTs** → **Create a GPT**
2. **Configure** 탭 → **Actions** → **Create new action**
3. **Import from URL** 클릭 후 입력: `https://public-data.up.railway.app/openapi.json`
4. 스키마가 자동으로 로드되면 **Save** 클릭

#### REST API 직접 사용

GPT Actions 외에도 REST API를 직접 호출할 수 있습니다.

```bash
# 법령 검색
curl "https://public-data.up.railway.app/api/search/laws?query=민법"

# 판례 검색 (기간 지정)
curl "https://public-data.up.railway.app/api/search/cases?query=손해배상&date_from=20240101&date_to=20241231"

# 법령 상세 조회
curl "https://public-data.up.railway.app/api/detail/law/123456"
```

**REST API 엔드포인트**:
- 검색: `/api/search/{type}` (laws, cases, constitutional, interpretations 등)
- 상세: `/api/detail/{type}/{id}` (law, case, constitutional, interpretation 등)
- OpenAPI 스펙: `/openapi.json`

### 셀프 호스팅 (서버 직접 운영)

자체 서버에서 운영하려면:

```bash
git clone https://github.com/hjsh200219/korea-public-data-mcp.git
cd korea-public-data-mcp
npm install
npm run build
npm start
```

#### 환경변수

| 변수 | 필수 | 설명 |
|------|------|------|
| `LAW_API_OC` | O | 법제처 API 인증코드. [법제처 오픈API](https://open.law.go.kr/LSO/openApi/guideList.do)에서 발급 |
| `DART_API_KEY` | X | DART API 키. [DART 오픈API](https://opendart.fss.or.kr)에서 발급 |
| `DATA20_SERVICE_KEY` | X | 공공데이터포털 서비스 키. [공공데이터포털](https://www.data.go.kr)에서 발급 |
| `UNIPASS_KEY_API*` | X | 관세청 UNI-PASS API 인증키 (API 번호별 개별 키, 예: `UNIPASS_KEY_API001`) |
| `EXCHANGE_RATE_API_KEY` | X | 수출입은행 환율 API 키 |
| `MAFRA_API_KEY` | X | 농림축산식품부 API 키 |
| `FINLIFE_API_KEY` | X | 금융감독원 금융상품 비교공시 API 키 |
| `YOUTUBE_API_KEY` | X | YouTube Data API v3 키 (없으면 자막 추출만 사용 가능) |
| `YOUTUBE_COOKIES_FROM_BROWSER` | X | 자막 봇 차단 우회용 로컬 브라우저 (`chrome`/`firefox`/`safari` 등). stdio 로컬 전용 |
| `YOUTUBE_COOKIES` | X | 자막 봇 차단 우회용 Netscape cookies.txt. Railway 서버 배포용 |
| `COUPANG_ACCESS_KEY` | X | 쿠팡 파트너스 Access Key |
| `COUPANG_SECRET_KEY` | X | 쿠팡 파트너스 Secret Key |
| `ASSEMBLY_API_KEY` | X | 국회 Open API 키 ([open.assembly.go.kr](https://open.assembly.go.kr)) |
| `COURTLISTENER_API_TOKEN` | X | CourtListener API 토큰 (미국 판례) |
| `OPENLEGALDATA_API_TOKEN` | X | OpenLegalData 토큰 (독일 판례) |
| `FOREIGN_CASE_ENABLED` | X | `true` 설정 시 토큰 없이도 독일 판례 활성화 |
| `GOV24_AI_ENABLED` | X | `true` 설정 시 정부24 plus AI 검색(beta) 활성화 (기본 비활성) |
| `PORT` | X | HTTP 서버 포트 (기본 3000) |

Railway, Render 등 Node.js를 지원하는 플랫폼에 배포할 수 있습니다.

## 기술 스택

- TypeScript + Node.js
- `@modelcontextprotocol/sdk` - MCP 프로토콜 (Streamable HTTP + stdio)
- `express` - Remote HTTP 서버
- `cors` - CORS 처리
- `fast-xml-parser` - XML 응답 파싱
- `jszip` - DART 기업코드 ZIP 파싱
- `zod` - 입력 검증
