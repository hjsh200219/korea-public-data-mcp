---
name: openlegaldata-de-anonymous-mit
description: OpenLegalData (de.openlegaldata.io) — anonymous OK, MIT 라이선스, 활성 유지보수
type: reference
created: 2026-04-28
---

OpenLegalData (독일 판례 오픈 API)
- 베이스: `https://de.openlegaldata.io/api/`
- 검색·상세 모두 토큰 없이 anonymous 호출 가능 (live 검증)
- 라이선스: MIT (코드) + 데이터 재배포 가능
- GitHub: `openlegaldata/oldp` — 최신 push 2026-04-27 (활성 유지보수)
- 환경변수: `OPENLEGALDATA_API_TOKEN` (선택, 더 높은 limit용) 또는 `FOREIGN_CASE_ENABLED=true`로 활성화

**Why:** 독일 판례를 추가할 때 가장 마찰 적은 무료/오픈 소스. CourtListener 미국과 짝으로 외국 판례 커버리지 구성.
**How to apply:** Foreign-case 스킬에서 미국=CourtListener, 독일=OpenLegalData로 라우팅. 토큰 없이 MVP 출시 가능.
