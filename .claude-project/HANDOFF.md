---
created: 2026-05-26T23:15:00+09:00
project: k-public-data-mcp
summary: 전 도메인 API 필터 라이브 매트릭스 검증 + 4건 server-ignore 수정 (architect APPROVE)
---

## Session Digest

본 프로젝트 18개 스킬·100+ 액션의 모든 server-side 필터를 라이브 API로 매트릭스 검증.
4건 server-ignore 패턴 발견 + 수정 + TDD 테스트 추가:
1. assembly.plenary_processed_etc — BILL_NAME server-ignored → BILL_NM/COMMITTEE_NM 매핑
2. insurance.medical_reimbursement.likePrdNm — server-ignored → client-side prdNm includes 폴백
3. assembly.bill_receipts/bill_judge — BILL_NAME/BILL_NM 모두 ignored → client-side BILL_NM 폴백
4. assembly.plenary_processed_settlement — ACTIONS describe 누락 + V2 fetcher 타입 안전성

Architect 2-pass: 1차 ITERATE (4 issues) → 2차 APPROVE.
1018 tests pass, typecheck/lint/knip/verify-docs/build 0 issues.

## Progress

- ✅ 전 18개 도메인 필터 인벤토리 (caveman-investigator agent로 매트릭스 출력)
- ✅ 라이브 API 검증 (DART/FINLIFE/Insurance/HIRA/Tourism/G2B/Law/Assembly)
- ✅ 발견된 4건 모두 수정 + 라이브 검증
- ✅ Production E2E (member_current + 법사위 → 18건)
- ✅ Architect APPROVE on cc9de91
- ✅ 3 round 커밋·푸시 (40a622d, f52cfff, cc9de91)

## Next Steps

1. v3 backlog (이번 PR 외): BILLRCPV2/BILLRCP alias 정리, VCONFBILLLIST spec 재발굴, REST/OpenAPI surface 추가
2. 추후 dataset 추가 시: row schema 먼저 확인 → server param 결정 매트릭스 적용
3. like_* prefix param 의심: 새 insurance/data.go.kr 도메인 추가 시 server vs client filter 라이브 검증

## Blockers

- 없음 (모든 검증 게이트 green)

## Watch Out

- `nbslryaradshbpbpm` (plenary_processed_etc) row schema는 `BillProcessingRow` 사용 — BILL_NM/COMMITTEE_NM/LINK_URL. `BillSearchRow` 아님.
- VCONFBILLLIST는 모든 server filter 무시 — voteListClientFilters 유지 필수
- BILLRCP/BILLJUDGE BILL_NAME/BILL_NM 둘 다 무시 — clientFilters: { bill_name: "BILL_NM" } 필수
- open.assembly.go.kr curl 직접 검증 시 `-A "Mozilla/5.0"` 헤더 필수 (curl 기본 UA는 400)
- FINLIFE도 Node fetch에서 User-Agent 헤더 명시 (src/finlife-api.ts:93)

## Files Touched

- src/tools/skills/assembly.ts (handler config + describe + clientFilters)
- src/tools/skills/assembly.test.ts (TDD: plenary_processed_etc + bill_receipts/bill_judge)
- src/tools/skills/insurance.ts (medical_reimbursement client-fallback)
- src/tools/skills/insurance.test.ts (TDD: like_prd_nm fallback)
- src/assembly-api.ts (getPlenaryProcessedV2 return type → BillProcessingRow)
