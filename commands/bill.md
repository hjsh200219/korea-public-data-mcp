---
description: 국회 의안·표결·의원 정보 조회 (국회 Open API)
argument-hint: [법안명 또는 의원명]
---

국회 정보 조회 요청: **$ARGUMENTS**

`assembly` 도구로 처리한다.

1. 대상을 판별한다.
   - 법안 → `bill_search`(의안명 검색) → `bill_detail` → 필요 시 `bill_proposers`(발의자)
   - 처리 현황 → `bill_processing` `bill_pending`(계류) `bill_processed`(처리)
   - 표결 → `vote_by_bill`(의안별) `member_votes`(의원별)
   - 의원 정보 → `member_current`(현직) `member_history`(역대)
   - 회의록 → `plenary_minutes` `committee_minutes`
2. `AGE`(대수)를 지정하지 않으면 현재 대수로 자동 보강된다. 과거 법안을 찾을 때만 명시한다.
3. 답변에는 **의안번호·발의일·소관위원회·현재 상태**를 포함한다.
4. 표결 결과는 찬성/반대/기권 수와 함께 가결·부결 여부를 명시한다.

법안명이 부정확하면 핵심 키워드만으로 먼저 검색해 후보를 제시한다.
