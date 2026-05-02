---
created: 2026-05-03T05:00:00+09:00
project: k-public-data-mcp
summary: AGENTS.md 204→51줄 공격적 축약 + source-map.md/env.md/dev-guidelines.md 분리 생성 + handoff 경로 수정
---

## Session Digest

AGENTS.md의 handoff 경로 불일치를 수정하고(`e89bcbf`), AGENTS.md를 204줄 → 51줄로 공격적으로 축약했다 (`891d93f`, `c8d45c9`).
축약 과정에서 Source Map, 환경변수 목록, 개발 가이드라인 내용을 각각 `docs/source-map.md`, `docs/env.md`, `docs/dev-guidelines.md`로 분리 생성해 정보 손실 없이 AGENTS.md를 간결하게 유지했다.

## Progress

- **완료**:
  - `AGENTS.md` handoff 경로 수정 (`.claude/HANDOFF.md` → `.claude-project/HANDOFF.md`) — 커밋 `e89bcbf`
  - `AGENTS.md` 204→51줄 축약 — 커밋 `891d93f`, `c8d45c9`
    - `docs/source-map.md` 신규 생성 (Source Map 전체 내용 분리)
    - `docs/env.md` 신규 생성 (환경변수 목록 분리)
    - `docs/dev-guidelines.md` 신규 생성 (Behavioral Guidelines 분리)

- **이전 세션 인계 항목 (미완료 유지)**:
  - Smithery 마켓플레이스 등록 승인 대기 중 (제출 완료)
  - Railway `YOUTUBE_COOKIES` 수동 갱신 필요 (만료 시)
  - Smithery 품질 점수 개선 push 완료 (`1f2dfb1`) — 대시보드 반영 확인 필요

## Smithery 품질 점수 현황

| 항목 | 개선 전 | 예상 개선 |
|------|---------|----------|
| Output schemas | 0/16 | +10pt |
| Annotations | 0/16 | +6pt |
| Parameter descriptions | 13/16 | +1pt |
| Server Metadata | 3/35 | +12pt |
| **기준 점수** | **48점** | **~77점 예상** |

실제 반영 점수는 Smithery 대시보드에서 확인 필요.

## Next Steps

1. **Smithery 대시보드 점수 확인** — 반영까지 수분~수십 분 소요될 수 있음
2. Smithery 마켓플레이스 등록 승인 확인 후 README/CLAUDE.md 배지/링크 추가
3. `awesome-mcp-servers` GitHub 리포에 PR 제출 (마케팅)
4. MCP Prompts(`src/tools/skills/prompts.ts`) — product_review 워크플로 가이드 프롬프트 추가 고려
5. 쿠키 갱신 알림 수신 시 즉시 Watch Out 절차 수행 (Railway `YOUTUBE_COOKIES` 교체)

## Blockers

- Smithery 등록 승인: 외부 의존 (대기)
- Railway `YOUTUBE_COOKIES`: 수동 갱신 필요 — 만료 시 자막 추출 재차 실패

## Watch Out

- **쿠키 갱신 SOP** (만료 알림 수신 시):
  1. 로컬 Chrome 쿠키 추출:
     `yt-dlp --cookies-from-browser chrome --cookies /tmp/yt_cookies.txt --skip-download "https://www.youtube.com/watch?v=dQw4w9WgXcQ"`
  2. `/tmp/yt_cookies.txt`에서 `.youtube.com` / `.google.com` 라인만 필터링 (~6KB)
  3. Railway Dashboard → `YOUTUBE_COOKIES` 환경변수 값 교체 → 재배포
- `YOUTUBE_COOKIES_FROM_BROWSER`(로컬 stdio용)와 `YOUTUBE_COOKIES`(서버 배포용)는 별개 변수.
- `youtube.md` 파일이 `product_review` 스킬의 채널 소스 — 삭제/이동 시 `find_reviews` 동작 불가.
- 쿠키 만료 알림 Remote 루틴: `trig_013jaxkLuRLDkpk71g49tJxB` (매주 월요일 09:00 KST)
- `registerSkillTool()` 래퍼 사용 시 `outputSchema`가 설정되므로 콜백은 `structuredContent`도 자동 주입됨 — 직접 `server.registerTool()` 사용 시 주의.

## Files Touched (이번 세션)

- `AGENTS.md` — handoff 경로 수정 + 204→51줄 축약
- `docs/source-map.md` — 신규 생성 (Source Map 분리)
- `docs/env.md` — 신규 생성 (환경변수 목록 분리)
- `docs/dev-guidelines.md` — 신규 생성 (Behavioral Guidelines 분리)
