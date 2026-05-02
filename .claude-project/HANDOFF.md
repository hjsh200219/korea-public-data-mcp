---
created: 2026-05-03T01:00:00+09:00
project: k-public-data-mcp
summary: product_review MCP 스킬 추가 (YouTube 리뷰 + 쿠팡 구매 URL) + Smithery 마켓플레이스 등록 진행
---

## Session Digest

`product_review` MCP 스킬(17번째 스킬)을 구현했다. YouTube 리뷰 자막 추출(youtube.md 동적 채널 로드)과 쿠팡 Partners API HMAC-SHA256 인증으로 구매 URL을 반환한다. Smithery MCP 마켓플레이스 등록을 위한 `smithery.yaml`을 작성하고 GitHub에 푸시까지 완료했다. 820개 테스트 통과.

## Progress

- **완료**:
  - `product_review` MCP 스킬 구현 (`src/tools/skills/product-review.ts`, 252 lines)
    - `find_reviews` — YouTube 채널에서 상품 리뷰 자막 검색
    - `coupang_search` — 쿠팡 Products API로 상품 검색 + 딥링크 URL 반환
    - `full_review` — find_reviews + coupang_search 통합 워크플로
  - `src/coupang-api.ts` — Coupang Partners HMAC-SHA256 인증, 1h 캐시, fetchWithRetry (99 lines)
  - `src/coupang-types.ts` — 쿠팡 TypeScript 인터페이스 (29 lines)
  - `src/youtube-api.ts` — `parseYoutubeMdChannels` / `resolveChannelHandles` / `getChannelVideos` 추가, `searchVideos` 옵션 객체 시그니처로 리팩터 (+113 lines)
  - `youtube.md` — 12개 리뷰 채널 목록 추가 (동적 로드 소스)
  - `src/config.ts` — `COUPANG_ACCESS_KEY` / `COUPANG_SECRET_KEY` 환경변수 추가
  - `smithery.yaml` — Smithery MCP 마켓플레이스 등록용 메타데이터 (65 lines)
  - `AGENTS.md` — product_review 스킬 문서 업데이트
  - TDD 완료: `src/coupang-api.test.ts` (148 lines), `src/tools/skills/product-review.test.ts` (206 lines)
  - Railway 환경변수 `COUPANG_ACCESS_KEY` / `COUPANG_SECRET_KEY` 추가 및 재배포
  - E2E 테스트 통과 (쿠팡 딥링크 URL 정상 반환 확인)
  - GitHub 푸시 완료 (`ef2688b` HEAD)
- **미완료**:
  - Smithery 마켓플레이스 실제 등록 승인 대기 중 (제출은 완료)

## Next Steps

1. Smithery 마켓플레이스 등록 승인 확인 — 등록 완료 후 README/CLAUDE.md에 Smithery 배지/링크 추가
2. `awesome-mcp-servers` GitHub 리포에 PR 제출 (마케팅)
3. MCP Prompts(`src/tools/skills/prompts.ts`) — product_review 워크플로 가이드 프롬프트 추가 고려
4. youtube.md 채널 확장 — 현재 12개, 카테고리별 채널 추가 가능

## Blockers

- Smithery 등록 승인은 외부 의존 (별도 처리 불필요, 대기)
- 쿠팡 Partners API는 `COUPANG_ACCESS_KEY` / `COUPANG_SECRET_KEY` 필수 — 미설정 시 `coupang_search` / `full_review` 액션 비활성화됨

## Watch Out

- `youtube.md` 파일이 `product_review` 스킬의 채널 소스다. 파일 삭제/이동 시 `find_reviews`가 동작하지 않는다.
- `searchVideos` 함수 시그니처가 이번 세션에서 **옵션 객체 형태로 변경**됐다. 외부에서 직접 호출하는 코드가 있다면 인터페이스 확인 필요.
- 쿠팡 Partners API 딥링크는 `coupangpick.com` 도메인이 아닌 `link.coupang.com` 기반이다 — URL 패턴 변경 시 E2E 테스트가 깨진다.
- CLAUDE.md Source Map 업데이트 완료 (`coupang-api.ts`, `coupang-types.ts`, Layer Rules, 헤더 포함).

## Files Touched

- `/Users/hoshin/workspace/k-public-data-mcp/src/coupang-api.ts` — 신규 생성
- `/Users/hoshin/workspace/k-public-data-mcp/src/coupang-api.test.ts` — 신규 생성
- `/Users/hoshin/workspace/k-public-data-mcp/src/coupang-types.ts` — 신규 생성
- `/Users/hoshin/workspace/k-public-data-mcp/src/tools/skills/product-review.ts` — 신규 생성
- `/Users/hoshin/workspace/k-public-data-mcp/src/tools/skills/product-review.test.ts` — 신규 생성
- `/Users/hoshin/workspace/k-public-data-mcp/src/tools/skills/index.ts` — product_review 스킬 등록
- `/Users/hoshin/workspace/k-public-data-mcp/src/tools/skills/youtube.ts` — import 경로 수정
- `/Users/hoshin/workspace/k-public-data-mcp/src/youtube-api.ts` — 채널 동적 로드 함수 추가, searchVideos 시그니처 변경
- `/Users/hoshin/workspace/k-public-data-mcp/src/youtube-api.test.ts` — 신규 테스트 추가
- `/Users/hoshin/workspace/k-public-data-mcp/src/config.ts` — Coupang 환경변수 추가
- `/Users/hoshin/workspace/k-public-data-mcp/youtube.md` — 12개 채널 목록 추가
- `/Users/hoshin/workspace/k-public-data-mcp/smithery.yaml` — 신규 생성
- `/Users/hoshin/workspace/k-public-data-mcp/AGENTS.md` — product_review 문서 업데이트
