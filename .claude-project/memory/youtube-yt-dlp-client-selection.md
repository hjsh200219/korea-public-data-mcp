---
name: youtube-yt-dlp-client-selection
description: yt-dlp YouTube 자동자막 우회를 위한 클라이언트 캐스케이드 (tv → web w/ cookies, android w/o)
type: reference
created: 2026-04-26
updated: 2026-04-27
---

YouTube 자동자막은 클라이언트별 PO Token / DRM / 쿠키 지원 차이가 큼. 2026-04-27 실측:

| 클라이언트 | 쿠키 지원 | PO Token 요구 | 자동자막 추출 |
|----------|---------|--------------|------------|
| `web` | O | **요구됨** (Subtitles PO Token) | 거부 |
| `mweb` | O | **요구됨** | 거부 |
| `android` | X (`Skipping client "android" since it does not support cookies`) | 우회 가능 | 일부 영상에서만, 본 케이스 429 |
| `ios` | X (`Skipping client "ios" since it does not support cookies`) | — | 사실상 사용 불가 |
| `tv` | O | **없음** | 쿠키 필수 (없으면 DRM 보호로 실패) |

**현재 정책** (`src/youtube-api.ts`의 `getTranscript`):
- 쿠키 있음 → `tv` → `web` 캐스케이드
- 쿠키 없음 → `android` 단독 (한계 명확)
- 모두 실패 → `youtube-transcript-api` Python fallback

**Why:** 자동자막만 있는 영상(`Nmk1wxoi6ys` 케이스)은 web/mweb/android 모두 PO Token 또는 DRM으로 거부. 유일하게 안정적인 경로가 `tv + 쿠키`. yt-dlp의 정책 변경 시 차단될 수 있어 web fallback 유지.

**How to apply:** 새 영상 재현 안 되면 첫 번째로 `yt-dlp --extractor-args "youtube:player_client=tv" --cookies cookies.txt --list-subs --skip-download -- VID`로 클라이언트 단독 동작 확인. yt-dlp 업스트림이 tv도 막으면 mweb/android_creator 같은 백업 클라이언트 검토.
