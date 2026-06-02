---
name: gov24-ai-endpoint-characteristics
description: plus.gov.kr AI(gov24-ai) 엔드포인트 — 익명 cold POST, SSE 이중 스키마, X_GST_QLC 쿼터
type: reference
created: 2026-06-03
---

plus.gov.kr AI 검색(`POST /ai/search_beta/api/fabrix/chat`, gov24-ai 도메인) 특성. 비공식 reverse-engineered beta — 예고 없이 변경/종료 가능. `GOV24_AI_ENABLED=true`로만 활성(기본 OFF).

**인증:** API key·로그인 불필요. 익명 cold POST(쿠키 0개) → 200 + SSE 응답, 서버가 `JSESSIONID`/`X_GST_*` 세션쿠키 자체발급. 캡처한 브라우저 쿠키 재사용 불필요. `GOV24_AI_API_KEY` 같은 env 변수 추가 금지 — 익명 동작.

**답변 SSE 이중 스키마(중요):** 동일 쿼리도 요청마다 두 스키마를 번갈아 스트리밍한다:
- Format A: `data:{"event_status":"CHUNK","content":"..."}` + top-level `trace_id`
- Format B: `data:{"stream":"..."}` + `trace_id`는 `data:{"metadata":{...,"trace_id":...}}` 중첩

`parseSseText`는 `obj.content` AND `obj.stream` 둘 다 `answer`에 concat해야 한다. 한쪽만 처리하면 다른 포맷에서 answer="" (신뢰도·링크는 정상이라 silent 빈답변 = 최악). 라이브 검증: 6회 중 5회만에 Format B 등장.

**쿼터:** `X_GST_QLC` 세션당 ~50 질문. `remainingQuestions` 디크리먼트. cold-per-call(매 요청 새 세션)로 쿼터 리셋. 단, 대량 cold 요청은 남용으로 보여 IP 차단 위험 — ADR follow-up에 cookie-reuse 재검토 명시.

**Why:** sign-off 전 라이브 contract test 필수 — 단일 fixture(monoculture)는 멀티스키마 beta에서 silent 빈답변을 놓친다(unit 통과해도 라이브 절반 깨짐).

**How to apply:** (1) HTTP 클라이언트 쿠키 jar 요청 간 공유 금지(cold-per-call). (2) 답변 비면 `(답변 없음)` 대신 fail-loud 경고로 스키마 드리프트 노출. (3) `GOV24_AI_ENABLED=true npx vitest run src/gov24-ai-api.contract.test.ts`로 라이브 검증.
