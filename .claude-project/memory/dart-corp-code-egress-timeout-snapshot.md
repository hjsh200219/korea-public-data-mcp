---
name: dart-corp-code-egress-timeout-snapshot
description: DART corp_code 해석 prod-only 60s abort — Railway egress 느림이 원인, 정적 스냅샷 번들로 해결
type: project
created: 2026-06-15
---

DART `resolve_corp_code`(및 의존 도구)가 프로덕션(Railway)에서만 60s 후 `"This operation was aborted"` 실패. 로컬은 2.1s 정상 (커밋 9f585d5).

**근본 원인**: Railway egress → opendart.fss.or.kr 가 전반적으로 느림 — 작은 financials JSON도 ~14s(로컬 sub-second). 3.5MB `corpCode.xml` ZIP 다운로드가 `CORP_CODE_TIMEOUT_MS=60000` 안에 못 끝나 AbortController 발동. financials 등 작은 JSON 엔드포인트는 14s로 느리지만 성공 → DART 호스트 자체는 도달 가능, **대용량 다운로드만 stall**. 진단: prod `/api/dart/corp-code` REST 호출 시 정확히 60.47s에 500.

**해결**: 정적 스냅샷 번들 (`hira-region-codes.ts` 정적 매핑 패턴과 동일).
- `scripts/harvest-dart-corp-codes.ts` — corpCode.xml → `[corpCode,corpName,stockCode]` 파싱 → gzip+base64 → `src/dart-corp-codes.ts` (118,313건, 1.8MB .ts)
- `resolveCorpCode()`: 스냅샷(`getCorpCodeSnapshot()`, lazy gunzip ~121ms 1회 캐시) 우선 → 미수록 시에만 라이브 corpCode.xml 폴백
- 결과: 56ms 해석 (60s 타임아웃 → 즉시)

**왜 .ts 데이터 모듈인가**: build는 plain `tsc`(asset 복사 없음, rootDir=./src). raw `.json`은 dist에 안 들어감. base64 string을 .ts에 넣으면 일반 TS처럼 dist 컴파일됨.

**갱신**: 신규 상장/개명 반영하려면 `npx tsx scripts/harvest-dart-corp-codes.ts` 재실행.

**Why**: prod-only 실패는 거의 항상 egress/IP/리소스 차이 — 로컬 재현 안 되면 prod REST/MCP로 직접 재현해 타임아웃 값과 일치하는지 확인(60.47s ≈ CORP_CODE_TIMEOUT_MS).
**How to apply**: Railway에서 opendart 대용량 다운로드 타임아웃 보면 라이브 페치 금지, 정적 스냅샷 번들. 작은 JSON API는 느려도 동작하므로 financials/company 등은 그대로 라이브.
