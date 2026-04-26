---
created: 2026-04-26T15:50:00+09:00
project: k-public-data-mcp
summary: YouTube 자막 추출 안정화 (yt-dlp + fallback + 쿠키 + 리전) + 로컬 stdio MCP 등록
---

## Session Digest

YouTube 자막 추출 안정성에 집중한 세션. yt-dlp 클라이언트 분기(쿠키 시 web, 없으면 android), `youtube-transcript-api` v1.0+ fallback, `YOUTUBE_COOKIES` 환경변수, Railway 리전 변경 (Singapore → US West → US East → Amsterdam) 4단계로 차단 우회 메커니즘 구축. Amsterdam에서 한국 영상 자막 추출 검증 완료. 로컬 stdio MCP를 Claude Desktop에 등록해 차단 안전망 확보.

## Progress

- ✅ yt-dlp android 클라이언트로 PO Token 우회 (15bdf75)
- ✅ youtube-transcript-api fallback 추가 (6b16707)
- ✅ YOUTUBE_COOKIES 환경변수 지원 (135cb6a)
- ✅ 쿠키 있을 때 web 클라이언트 분기 (036c336)
- ✅ yt-dlp가 파일 못 만들 때도 fallback 시도 (850a4bf)
- ✅ youtube-transcript-api v1.0+ API 적용 (685bb1b)
- ✅ Railway 리전을 Amsterdam(europe-west4)으로 변경 → 한국 영상 추출 검증
- ✅ 로컬 stdio MCP 등록 (`~/Library/Application Support/Claude/claude_desktop_config.json`의 `public-data-local`)
- ✅ 디버그 메시지 정리 후 사용자 친화적 에러로 복원

## Next Steps

1. **Claude Desktop 재시작** (Cmd+Q → 다시 열기) → 로컬 stdio MCP 활성화
2. (선택) 자동 리전 fallback 시스템 검토 — 비용 대비 효율은 낮음
3. (선택) 거주용 프록시 통합 — Railway 차단 영구 회피용

## Blockers

- 없음

## Watch Out

- Railway는 Pro라도 4개 리전만 지원 (Amsterdam/Singapore/US West/US East)
- YouTube가 Amsterdam도 향후 차단할 수 있음 → 차단 시 다른 리전으로 즉시 전환
- 로컬 stdio는 PC가 켜져 있을 때만 동작 (모바일/원격 사용 불가)
- yt-dlp는 Python user bin에 설치되어 있어 PATH에 명시 필요
- youtube-transcript-api는 v1.0+에서 API 변경됨 (`get_transcript` → `fetch()`)

## Files Touched

- `src/youtube-api.ts` — yt-dlp 클라이언트 분기, 쿠키 지원, fallback, v1.0+ API
- `src/youtube-api.test.ts` — fallback/쿠키 테스트 추가 (총 29개 테스트)
- `Dockerfile` — `pip3 install youtube-transcript-api` 추가
- `~/Library/Application Support/Claude/claude_desktop_config.json` — public-data-local 등록 (61개 env, 절대경로 PATH)
- Railway 환경변수 `YOUTUBE_COOKIES` 추가
