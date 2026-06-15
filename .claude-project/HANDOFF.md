---
created: 2026-06-15T12:42:00+09:00
project: k-public-data-mcp
summary: DART corp_code 프로덕션 60s 타임아웃 수정 — 정적 스냅샷 우선 조회 (커밋 9f585d5 푸시 완료, prod 배포 대기)
---

## Session Digest
DART `corporate_disclosure` corp_code 해석이 프로덕션(Railway)에서만 60s 후 abort하던 버그 수정. 원인: Railway egress → opendart.fss.or.kr 가 전반적으로 느려(작은 JSON도 ~14s) 3.5MB `corpCode.xml` ZIP 다운로드가 `CORP_CODE_TIMEOUT_MS`(60s) 안에 못 끝남. 정적 스냅샷(`dart-corp-codes.ts`, 118,313건 gzip+base64) 우선 조회 + 미수록 시 라이브 corpCode.xml 폴백으로 해결. 케어랩스 해석 60s → 56ms. 커밋 `9f585d5` 푸시 완료.

## Progress
- [x] 원인 진단: prod REST `/api/dart/corp-code` 60.47s abort 재현 (= CORP_CODE_TIMEOUT_MS)
- [x] financials 등 작은 JSON은 14s로 동작 확인 → 호스트 도달 가능, 대용량 다운로드만 stall
- [x] `scripts/harvest-dart-corp-codes.ts` 스냅샷 생성기 작성
- [x] `src/dart-corp-codes.ts` 생성 (118k건, lazy gunzip ~121ms 1회 캐시)
- [x] `resolveCorpCode` 스냅샷 우선 + 라이브 폴백 (TDD 4케이스)
- [x] AGENTS.md 컨벤션 2줄 추가
- [x] 검증: type/lint/test(1062)/build/verify-docs/knip 클린, 커버리지 84.9%/89.07%
- [x] 커밋 `9f585d5` 푸시

## Next Steps
1. **프로덕션 배포** — 현재 prod는 구버전이라 여전히 60s 타임아웃. Railway 재배포해야 수정 반영
2. 배포 후 prod `/api/dart/corp-code?corp_name=케어랩스` 재검증 (56ms 기대)
3. (원 작업) 케어랩스 종속회사 EDB 매출 비중 조사 재개 — corp_code=01187148, 사업보고서 종속기업 요약재무

## Blockers
- 없음 (배포는 사용자 결정 사항)

## Watch Out
- `dart-corp-codes.ts`는 자동 생성 — 직접 수정 금지. 신규 상장/개명 반영은 `npx tsx scripts/harvest-dart-corp-codes.ts` 재실행
- 정적 스냅샷은 시점 데이터 — 최근 상장/개명 기업은 스냅샷 미수록 시 라이브 폴백(prod에서 여전히 60s 위험). 주기적 harvest 권장
- prod-only 실패 진단: 로컬 재현 안 되면 prod REST/MCP로 직접 재현, 타임아웃 값 일치 확인

## Files Touched
- src/dart-api.ts (resolveCorpCode 스냅샷 우선 + lookupInMap 추출)
- src/dart-api.test.ts (resolveCorpCode 4 케이스 재작성)
- src/dart-corp-codes.ts (신규, 자동 생성 스냅샷)
- scripts/harvest-dart-corp-codes.ts (신규, 스냅샷 생성기)
- AGENTS.md (컨벤션)
