---
name: product-review-skill-youtube-md-dynamic-channels
description: product_review 스킬 — youtube.md에서 채널 동적 로드 패턴
type: reference
created: 2026-05-03
---

`product_review` MCP 스킬은 `youtube.md`를 런타임에 읽어 리뷰 채널 목록을 동적으로 로드한다.
하드코딩 없이 파일만 수정하면 채널 추가/제거 가능.

**파일 경로**: `process.cwd()/youtube.md` (Railway 배포 시 루트 기준)
**파싱 함수**: `parseYoutubeMdChannels(content)` → `@handle` 배열 반환
**채널 해석**: `resolveChannelHandles(apiKey, handles)` → `{channelId, handle}[]` (24h 캐시)
**파일 없으면**: 빈 문자열 fallback, `emptyResultMessage` 반환 (throw 안 함)

채널별 영상 검색: `getChannelVideos` — `playlistItems.list` (UU prefix, 1 quota unit)
title 클라이언트 필터링 후 `Promise.allSettled`로 자막 병렬 추출.

Actions:
- `find_reviews`: YouTube 채널 자막 검색 (YOUTUBE_API_KEY 필수)
- `coupang_search`: 쿠팡 상품 검색 (COUPANG_ACCESS_KEY/SECRET_KEY 필수)
- `full_review`: 두 액션 병렬 실행 (`Promise.all`)

구현 위치: `src/tools/skills/product-review.ts`

**Why:** 채널 목록을 코드에 하드코딩하면 배포 없이 채널을 변경할 수 없다.
**How to apply:** 새 리뷰 채널 추가 시 `youtube.md`에 `https://www.youtube.com/@handle` 형식으로 추가만 하면 됨. 코드 수정 불필요.
