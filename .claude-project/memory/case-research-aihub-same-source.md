---
name: case-research-aihub-same-source
description: case_research(law.go.kr)와 AI Hub 판결서 익명처리 데이터셋은 동일 원천 — caseNoID=case_id 1:1 매핑
type: reference
created: 2026-06-27
---

AI Hub 「판결서 익명처리 데이터」는 `case_research`가 조회하는 법제처 law.go.kr 판례를 **본문만 익명화한 가공본**이다. 동일 원천이며, AI Hub JSON `info.caseNoID` = law.go.kr 판례일련번호 = `case_research get_case_detail`의 `case_id`로 1:1 매칭(100%)된다.

실측 검증(2026-06-27): 대법원 2000므612=216027 / 하급심 95느2952=145932 / 대법원 2025두33647=612981 모두 동일.

**차이:** law.go.kr(case_research)=실명 노출(변호사·판사·법원명 그대로). AI Hub=본문 내 인명·기관 익명화(`전주지법`→`조직-1`, method=GENERALIZE, rule=R7 등) + NLP 학습용 `annotations` 라벨. AI Hub 판례 ⊂ law.go.kr 전체 풀의 부분집합.

**Why:** "AI Hub 판례 = case_research와 다른 데이터냐"는 질문에 명확히 답하기 위함. 다른 게 아니라 같은 판례의 익명화본.

**How to apply:** 판례 인용·검증은 case_research(실명·실시간·전체)가 정본. AI Hub 데이터(caseNoID 보유)는 case_id로 law.go.kr 원본 역추적 가능. AI Hub zip은 git 미추적(199MB 학습 코퍼스)이라 docs/reference/aihub에 있어도 커밋 안 됨.
