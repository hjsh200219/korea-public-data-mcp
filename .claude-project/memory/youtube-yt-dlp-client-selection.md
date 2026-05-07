---
name: youtube-yt-dlp-client-selection
description: yt-dlp YouTube 자동자막 우회 클라이언트 캐스케이드 (android_vr → tv → web w/ cookies, android_vr → android w/o)
type: reference
created: 2026-04-26
updated: 2026-05-07
---

YouTube 자동자막은 클라이언트별 PO Token / DRM / 쿠키 지원 차이가 큼. 2026-05-07 실측 갱신:

| 클라이언트 | 쿠키 지원 | PO Token 요구 (자막) | 자동자막 추출 |
|----------|---------|--------------------|------------|
| `android_vr` | 무관 | **없음** | **본 케이스 정상 추출 (ko/en 958/1023 segs)** |
| `tv` | O | **없음** | 쿠키 필수 (없으면 DRM 보호로 실패) |
| `web` | O | **요구됨** (Subtitles PO Token) | 거부 |
| `web_safari` | O | 사실상 web과 동일 | 거부 |
| `mweb` | O | **요구됨** | 거부 |
| `android` | X | 우회 가능 (위키상) | 일부 영상에서만, 본 케이스 429 |
| `ios` | X | — | 사실상 사용 불가 |
| `web_embedded` | O | 미명시 | 일부 영상 429 |

**PO Token 정책 배경**: YouTube가 2024년 후반부터 BotGuard JavaScript 챌린지 기반 PO Token을 도입. yt-dlp는 이를 풀 수 없어 PO Token 요구 클라이언트는 자막 차단됨. 영상 `Bgxsx8slDEA`(Chase AI)는 web/tv/android 모두 차단되지만 `android_vr`로 정상 추출 검증(2026-05-07).

**현재 정책** (`src/youtube-api.ts:404-408`의 `getTranscript`):
- 쿠키 있음 → `android_vr` → `tv` → `web` 캐스케이드
- 쿠키 없음 → `android_vr` → `android` 캐스케이드
- 모두 실패 → `youtube-transcript-api` Python fallback

`android_vr`이 1순위인 이유: 자막 PO Token 미요구 + 쿠키 무관 동작 + Made-for-kids 외 광범위 호환.

**Why:** PO Token 우회 + 쿠키 의존성 최소화 + 인프라 변경 0. bgutil-ytdlp-pot-provider 사이드카(월 $1.50~$2.80)도 불필요.

**How to apply:** 새 영상 실패 시 `yt-dlp --extractor-args "youtube:player_client=android_vr" --list-subs --skip-download -- VID`로 1차 확인. android_vr가 막히면 tv→web→android 순으로 검증. "made for kids" 영상은 android_vr 거부되므로 fallback 유지 필수.

**참조**: [yt-dlp PO Token Guide](https://github.com/yt-dlp/yt-dlp/wiki/PO-Token-Guide)
