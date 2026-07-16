---
created: 2026-07-16T16:04:00+09:00
project: k-public-data-mcp
summary: 병원 상세정보 더보기(15001699/MadmDtlInfoService2.8) 통합 — ykiho 노출 + get_hospital_detail 5 op 팬아웃, 배포·프로덕션 E2E 완료
---

## Session Digest
공공데이터포털 15001699(건강보험심사평가원 의료기관별상세정보서비스)를 K-Data MCP에 통합. `search_hospital` 응답에 `ykiho`(암호화 요양기호) 노출 + `get_hospital_detail(ykiho)` action 신설 — 시설/세부/진료과목/의료장비/교통 5개 오퍼레이션 병렬 팬아웃. Railway 배포 후 프로덕션 E2E 검증 완료. 커밋 4개(3fa92dd→a1f8e9b) master 푸시, CI green.

## Progress
- [x] `HospitalItem.ykiho` 타입 추가 — getHospBasisList가 원래 반환하나 타입에서 누락되던 것 노출 (3fa92dd)
- [x] `get_hospital_detail` action + `getHospitalDetail()` 5 op 병렬 팬아웃, generic key=value 렌더(온비드 패턴)
- [x] fetchXml 평문응답 가드(Forbidden/API not found → 명시 에러), 전 섹션 접근거부 시 활용신청 안내
- [x] REST(/data20/hospital/detail) + OpenAPI 경로 미러
- [x] 버전 함정 수정: MadmDtlInfoService**2.7 폐기(403)→2.8** + http→https + `_type=xml`, 라벨 교정 (a1f8e9b)
- [x] Knip dead-code(HOSPITAL_DETAIL_OPS export 제거) CI 복구 (807014b)
- [x] 배포·프로덕션 E2E: 삼성서울병원 시설 1·진료과목 29(내과 전문의 213)·의료장비 16(PET 4대)
- [x] 검증: tsc·knip·verify-docs·76테스트·CI green 전부 통과

## Next Steps
1. (선택) 약국 상세정보 — 동일 ykiho 패턴을 PharmacyItem에도 적용 가능(현재 병원만)
2. (선택) getDtlInfo2.8·getTrnsprtInfo2.8은 삼성서울병원서 0건 — 다른 기관으로 실데이터 형상 추가 확인
3. HANDOFF 이전 항목(통계 API 15047819/15119055 등 미구현 조사)은 여전히 백로그

## Blockers
- 없음.

## Watch Out
- **op명↔의미 반대**: `getEqpInfo2.8`=시설정보(병상), `getMedOftInfo2.8`=의료장비정보(PET/CT). 라벨 헷갈리지 말 것
- **data.go.kr 403은 활용신청 미승인이 아니라 폐기 버전 호출일 수 있음** — 정상 서비스(병원 hospInfoServicev2)가 같은 키로 00이면 인증 유효, 버전·op명 먼저 확인 (메모리 reference_datago_403_deprecated_version)
- 상세 op 응답 필드는 op별 상이 → generic 렌더 유지(하드코딩 필드 매핑 금지)

## Files Touched
- src/data20-types.ts, src/data20-api.ts, src/tools/skills/public-data.ts
- src/routes/data20-routes.ts, src/openapi/data20-paths.ts
- src/data20-api.test.ts, src/tools/skills/public-data.test.ts
