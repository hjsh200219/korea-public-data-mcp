---
created: 2026-06-27T00:00:00+09:00
project: k-public-data-mcp
summary: AI Hub 판결서 익명처리 데이터셋(docs/reference/aihub, 199MB untracked) 검증 — caseNoID가 law.go.kr 판례일련번호(case_research case_id)와 1:1 동일 확인 후 폴더 삭제. 코드 변경 0건.
---

## Session Digest
`docs/reference/aihub`에 다운로드돼 있던 AI Hub 「판결서 익명처리 데이터」(zip 8개, 199MB, **git untracked**)가 K-Data MCP `case_research`(=법제처 law.go.kr)와 같은 판례를 가져오는지 실측 검증. 결론: AI Hub 데이터 = law.go.kr 판례를 **본문만 익명화한 가공본**, 동일 원천. JSON `info.caseNoID`가 law.go.kr 판례일련번호(`get_case_detail`의 `case_id`)와 완전 동일 → 1:1 매칭 100%. 검증 후 사용자 요청으로 폴더 삭제(untracked라 git 변경 0건).

## Progress
- [x] aihub zip 구조 분석: Training/Validation × 원천/라벨링, JSON 1500+개. 파일명 UTF-8(Python zipfile 그대로, cp437 재인코딩 불필요)
- [x] JSON 스키마 파악: `info`(caseNo/caseNoID/courtType/jdgmn/Reference_info) + `sections`(판시사항/판결요지/판례내용) + `annotations`(익명화 span·method·rule·entity)
- [x] 사건번호·일련번호 노출률 100% 확인 (Validation 2100건 전수). 익명화는 본문 내 인명·기관만(`전주지법`→`조직-1`, GENERALIZE/R7)
- [x] K-Data MCP 교차 검증 3건 100% 매칭: 대법원 2000므612=case_id 216027 / 하급심 95느2952=145932 / 대법원 2025두33647(2025최신)=612981
- [x] 차이 확인: K-Data=실명 노출(변호사·판사·법원), AI Hub=익명화본 + NLP 학습용 annotation 라벨
- [x] `docs/reference/aihub` 199MB 삭제 (untracked → git 무영향)

## Next Steps
- 없음. 검증·삭제 완료. 코드 변경 없어 코드 푸시 단계 스킵됨.

## Blockers
- 없음.

## Watch Out
- aihub 데이터는 **git 미추적**이었음 — 재다운로드해도 커밋되지 않음(199MB, 학습 코퍼스). 재검증 시 caseNoID로 `case_research get_case_detail` 호출하면 동일.
- AI Hub 판례 ⊂ K-Data(law.go.kr) 전체 풀의 부분집합. 인용 정본은 K-Data MCP(실명·실시간·전체), AI Hub는 학습용.

## Files Touched
- docs/reference/aihub/ (삭제 — git untracked, 변경 추적 안 됨)
- .claude-project/HANDOFF.md, .claude-project/memory/ (이 Pack)
