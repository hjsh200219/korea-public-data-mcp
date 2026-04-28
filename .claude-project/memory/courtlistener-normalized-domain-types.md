---
name: courtlistener-normalized-domain-types
description: CourtListener 클라이언트는 정규화 도메인 타입(camelCase) + cursor 페이지네이션 사용. raw API 패스스루 아님
type: project
created: 2026-04-29
---

`src/courtlistener-types.ts` 는 raw API 응답을 그대로 노출하지 않고 정규화한다:
- camelCase 일관 (snake_case 혼재 제거): `dateFiled` → `decisionDate`, `cluster_id` → `clusterId` 등
- List item 과 Detail 을 별개 인터페이스로 분리: `OpinionListItem` / `OpinionDetail` / `ClusterDetail`
- Cursor 페이지네이션 (v4 native): `{ items, nextCursor, totalCount }` 응답 구조
- jurisdiction/precedentialStatus enum 상수: `JURISDICTION_VALUES`, `PRECEDENTIAL_STATUS_VALUES`
- 클라이언트 인터페이스: `CourtListenerClient` 객체 (searchOpinions/getOpinion/getCluster/listCourts) — 함수 export 아님
- HTML fallback chain: `plain_text → html_with_citations → html → xml_harvard` (stripHtmlTags 적용)

**Why:** 2026-04-29 C-2 통합으로 단순 함수 패스스루(`searchUSCases`/`getUSCaseDetail` 85줄)에서 정교한 클라이언트(396줄)로 교체. CourtListener v4 응답의 polymorphic citations(string|string[]|{volume,reporter,page}[]) 정규화, 토큰 절대 노출 방지, opinions_cited URL→ID 추출 등 처리. 배포된 REST `/api/courtlistener/search` 응답 shape 도 함께 변경(breaking).

**How to apply:**
- 새 액션 추가 시 `createCourtListenerClient({ token })` 로 클라이언트 생성 후 메서드 호출
- 응답에서 raw 필드(`cluster_id`, `dateFiled`) 가져오려 하지 말고 정규화 필드(`clusterId`, `decisionDate`) 사용
- REST 응답 shape이 `{ items, totalCount, nextCursor }` 이므로 외부 호출자 코드에서 `body.results`/`body.count` 접근 금지
- 페이지 번호 기반 페이지네이션 시도 금지 — `cursor` 토큰 사용
- 본문 추출은 `extractOpinionText` 로직 또는 `client.getOpinion()` 의 `plainText` 필드 활용
