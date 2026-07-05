---
created: 2026-07-05T18:10:00+09:00
project: k-public-data-mcp
summary: HIRA 보건의료빅데이터 진료통계 API 카탈로그 조사 완료(미구현) — REST 3종 연동 후보 확정, 문서만 커밋
---

## Session Digest
Threads 게시물(K Public Data MCP 소개, 2026-07-02, 조회 13,661) 댓글에서 사용자 prof.coconut가 "HIRA 보건의료빅데이터개방시스템 진료통계 연동" 기능 요청. 현재 MCP HIRA 도구는 요양기관(약국/병원) 위치검색 마스터만 제공 — 진료 실적 통계는 별개 데이터셋. data.go.kr 개방 현황 조사 후 레퍼런스 문서로 정리. 구현 미착수("조사까지만").

## Progress
- [x] HIRA 통계 API 카탈로그 조사 → `docs/reference/hira-medical-statistics-api-catalog.md` (커밋 c16fc97, 푸시됨)
- [x] REST API vs 파일데이터 구분, data.go.kr 데이터셋 ID·EDB 우선순위 확정
- [ ] 실제 연동 구현 (스킬 도구 추가) — 손 안 댐

## Next Steps
1. **의약품사용정보조회서비스(data.go.kr 15047819) 먼저 구현** — EDB 본업(처방·조제) 직결, 상권분석 처방수요지수 강화. 우선순위 1
2. 질병정보서비스(15119055) — 요청자 니즈 + 상권 질병수요
3. 진료행위정보서비스(15001701) — 보조
4. 구현 전 data.go.kr 활용신청(개발계정 즉시) → Swagger/활용가이드 docx로 실제 파라미터명·응답 필드 확보 (조사 문서엔 오퍼레이션명까지만)
5. (shconsulting 별건) prof.coconut Threads 댓글에 "연동 검토 중" 답글 — 아직 미발송

## Blockers
- 없음. 미확인 항목(파라미터명·응답 필드)은 구현 단계 Swagger에서 확보 가능.

## Watch Out
- 지역 파라미터는 raw sidoCd/sgguCd일 가능성 높음 → 기존 `src/hira-region-codes.ts`(한글 시도/시군구 → raw 코드 매핑) 재활용. 새 harvest 불필요
- 발급처 data.go.kr = 기존 `DATA20_SERVICE_KEY` 재활용. REST/XML, 개발계정 10,000건/일
- 스킬 도구는 `registerSkillTool()` + 이중언어 title/description, TDD 필수 (CLAUDE.md 규칙)
- 상세 카탈로그는 `docs/reference/hira-medical-statistics-api-catalog.md` 참조 (SSOT)

## Files Touched
- docs/reference/hira-medical-statistics-api-catalog.md (신규, 조사 문서)
- .claude-project/HANDOFF.md (이 Pack)
