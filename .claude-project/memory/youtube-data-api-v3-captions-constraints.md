---
name: youtube-data-api-v3-captions-constraints
description: YouTube Data API v3 captions.download은 owner-only OAuth — 제3자 자막 수집 대안 없음
type: reference
created: 2026-05-07
---

YouTube 공식 API로 yt-dlp를 대체할 수 있는지 검토한 결정 기록 (2026-05-07).

**공식 API 제약** ([captions.download](https://developers.google.com/youtube/v3/docs/captions/download)):
- *"This method requires the user to have permission to edit the video."* — 영상 편집 권한자(owner)만 호출 가능
- API key 단독으로는 **불가**. OAuth 2.0 필수 (`https://www.googleapis.com/auth/youtube.force-ssl`)
- `onBehalfOfContentOwner` 파라미터는 *"exclusively for YouTube content partners"* 전용
- 자동 자막(ASR/`trackKind: ASR`)도 동일 제약 적용
- Quota: captions.list 50 units, captions.download 200 units (일일 기본 10,000)

**timedtext 직접 호출** (`youtube.com/api/timedtext?...`):
- yt-dlp가 내부적으로 사용하는 비공식 엔드포인트
- [YouTube Developer Policies](https://developers.google.com/youtube/terms/developer-policies) 위반:
  - *"must not use any technology other than YouTube API Services to access or retrieve API Data"*
  - *"must not...directly or indirectly, scrape YouTube Applications"*
- 이게 PO Token 차단의 근본 원인 — YouTube가 정책 위반 클라이언트를 BotGuard로 식별·차단

**결론**: 제3자 영상 자막 수집은 yt-dlp 클라이언트 우회 외 합법/실용 대안 없음.

**Why:** 향후 "왜 공식 API 안 쓰냐"는 질문이 반복될 가능성 → 결정 근거를 메모리에 못박음. 또한 신규 자막 도구/대안 검토 시 첫 번째 필터로 사용.

**How to apply:**
- 신규 자막 추출 도구/대안 검토 시 owner OAuth 필요 여부를 첫 번째 필터로 적용
- owner OAuth가 필요한 use case(자기 채널 영상만)가 아니면 yt-dlp 경로 유지
- AssemblyAI/Deepgram 등 외부 ASR 서비스는 영상 다운로드도 별도 정책 이슈 + 비용 큼 → 비추천
