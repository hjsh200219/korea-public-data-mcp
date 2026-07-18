---
created: 2026-07-18T19:55:16+09:00
project: k-public-data-mcp
summary: KIPRIS 특허검색 API 통합 사전 조사 — 접근경로·스펙 확보, 무료 서비스 신청(승인 대기), 코드 미착수
---

## Session Digest
KIPRIS 특허 검색 기능을 K-Data MCP에 새 도메인으로 추가하기 위한 사전 조사 세션. **코드 변경 없음**(브라우저 조사만). KIPRIS Plus 계정 API 접근 경로를 규명하고, 엔드포인트·응답 스펙을 확보했으며, 신승호가 무료 서비스를 신청함(관리자 승인 대기).

## Progress
- [x] K-Data MCP 기존 특허 지원 조사 — `public_data.search_medicine_patent`(의약품 특허만), 범용 특허검색 없음
- [x] KIPRIS 정보검색 API 접근 경로 규명 — plus.kipris.or.kr `kipo-api/kipi/patUtiModInfoSearchSevice`
- [x] 원인 진단 — 신승호 AccessKey는 유효하나 `resultCode 31 DEADLINE_HAS_EXPIRED`(서비스 활용기간 만료)
- [x] 무료 신청 대상 특정 — "특허·실용 공개·등록공보"(국내 IP데이터>공보>특허·실용) 서비스가 정보검색 API 원천
- [x] 응답 스펙 확보(아래 API Spec)
- [x] 신승호가 "특허·실용 공개·등록공보" 무료(월 1,000건) 신청 제출
- [ ] KIPRIS 관리자 승인 대기 (영업일 1~3일)
- [ ] MCP 도구 구현
- [ ] 라이브 검증 + Railway 배포

## Next Steps (승인 후 착수)
1. 라이브 검증: `getAdvancedSearch` 실호출로 `resultCode 00 NORMAL SERVICE` 확인 (신승호 AccessKey)
2. `.env`에 `KIPRIS_API_KEY` 저장 (현재 미저장 — 만료 상태라 보류했음)
3. TDD 구현 (repo 도메인 패턴):
   - `src/kipris-api.ts` + `src/kipris-types.ts`
   - `src/kipris-api.test.ts` + `src/kipris-api.contract.test.ts`(`describe.skipIf(!process.env.KIPRIS_API_KEY)`)
   - `src/tools/skills/kipris.ts`(`registerSkillTool()`, action enum, 이중언어 title/desc) + test
4. 배선: `src/config.ts`(`kiprisApiKey?` + env 로드 + 미설정 warn, `assemblyApiKey` 패턴 복제), `src/tools/skills/index.ts`(키 있을 때만 `registerKipris`)
5. 문서: `.env` / `docs/env.md` / `docs/source-map.md` / `README.md` + `npm run verify-docs`, `npm run build`, `npm test`
6. Railway env `KIPRIS_API_KEY` 설정 + redeploy (stateless 폴백으로 claude.ai 커넥터 자동 인식)

## Blockers
- **KIPRIS 서비스 승인 대기** — 관리자 승인 영업일 1~3일. 승인 전까지 API가 `code 31 DEADLINE_HAS_EXPIRED` 반환. 사용자가 승인되면 알려주기로 함.

## Watch Out
- 무료 티어 = **월 1,000 호출 제한**(dropdown value `KP242`). 유료(무제한)=`KP241`. 신청 폼 기본값이 유료라 무료 변경 필수했음.
- `getWordSearch`는 **폐기예정** → 구현은 `getAdvancedSearch`(항목별검색) 기준.
- data.go.kr의 KIPRIS 특허검색 항목은 plus.kipris.or.kr로 리다이렉트 = 원천은 KIPRIS Plus(별도 data.go.kr API 아님).
- KIPRIS AccessKey는 시크릿 — `.env`에만, 커밋 금지(`.env`는 gitignore 확인됨).
- 장바구니 "담기" 클릭 시 blocking JS dialog 발생 → navigate로 우회.

## API Spec (구현용, DBII_000000000000001 상세페이지 기준)
- Base: `http://plus.kipris.or.kr/kipo-api/kipi/patUtiModInfoSearchSevice/`
- Ops: `getWordSearch`(단어, 폐기예정), `getAdvancedSearch`(항목별), `getBibliographyDetailInfoSearch`(서지)
- `getWordSearch` params: `word`(검색단어), `year`(0~10), `patent`(bool), `utility`(bool), `numOfRows`(기본30·최대500), `pageNo`, `ServiceKey`
- 응답 envelope(XML): `<response><header>successYN,resultCode,resultMsg</header><body><items><item>…</item></items><count>…</count></body></response>`
- item 필드(16): indexNo, registerStatus, inventionTitle(발명명·한글), ipcNumber, registerNumber, registerDate, applicationNumber(출원번호), applicationDate, openNumber, openDate, publicationNumber, publicationDate, astrtCont(초록), drawing(이미지경로), bigDrawing, applicantName(출원인)
- count: numOfRows, pageNo, totalCount
- 성공 시 `<resultCode>00</resultCode><resultMsg>NORMAL SERVICE.</resultMsg>`

## Files Touched
- (없음 — 조사 세션, 코드 미변경)
