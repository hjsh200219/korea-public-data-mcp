---
description: 이 플러그인이 제공하는 공공데이터 도구 목록과 상태 확인
---

`korea-public-data` 플러그인 도구 카탈로그를 보여준다.

1. 현재 세션에서 사용 가능한 `public-data` MCP 도구 목록을 확인한다. 서버의 API 키 설정에 따라 일부 도구는 등록되지 않을 수 있다.
2. 아래 표를 기준으로, **실제로 붙어 있는 도구**에는 ✅, 없는 도구에는 ⚪를 표시해 출력한다.

| 도구 | 제공 범위 | 출처 |
|---|---|---|
| `legal_research` | 법률·시행령·행정규칙·자치법규·조약·법령용어·별표서식 | 법제처 |
| `case_research` | 대법원 판례, 헌재결정례, 법령해석례, 위원회 결정, 행정심판 | 법제처 |
| `law_amendment` | 신구법 비교, 법령 체계도, 3단비교, 변경이력 | 법제처 |
| `corporate_disclosure` | 기업 공시, 재무제표, 기업개황, 배당 | DART |
| `public_data` | 약국·병원·동물병원, 의약품, 온비드 공매, 사업자 진위 | 공공데이터포털 |
| `financial_product` | 예금·적금·연금저축·대출 금리 비교 | 금융감독원 |
| `insurance` | 실손·자동차·생명·변액·퇴직연금 공시 | 금융위원회 |
| `procurement` | 입찰공고, 낙찰결과 | 조달청 나라장터 |
| `import_clearance` | 화물추적, 수입신고, 검역, 제세, 요건확인 등 20종 | 관세청 UNI-PASS |
| `export_clearance` | 수출이행내역, 신고필증 검증, 적재 검사 | 관세청 UNI-PASS |
| `shipping_logistics` | 보세구역, 보세운송, 입출항, 배차 | 관세청 UNI-PASS |
| `tariff_lookup` | HS코드, 관세율, 관세환율·시장환율, 간이환급 | 관세청·수출입은행 |
| `trade_entity` | 관세사·포워더·항공사·선사·해외공급자 | 관세청 |
| `youtube` | 자막 추출·요약, 영상정보, 검색, 댓글 | YouTube |
| `product_review` | 유튜브 제품 리뷰 + 쿠팡 구매링크 | YouTube·쿠팡 |
| `tourism` | 관광지·축제·숙박 검색, 지역 코드 | 한국관광공사 |
| `foreign_case_research` | 미국(CourtListener)·독일(OpenLegalData) 판례 | 해외 |
| `assembly` | 의안 발의·처리·표결, 의원, 회의록 | 국회 |
| `gov24_ai` | 민원 절차 AI 질의응답 (beta) | 정부24 |

3. 마지막에 자주 쓰는 슬래시 커맨드를 안내한다: `/law` `/dart` `/trade` `/bid` `/bill` `/finance`
4. 도구가 하나도 안 보이면 서버 상태를 의심하고 `https://public-data.up.railway.app/health` 확인을 권한다.
