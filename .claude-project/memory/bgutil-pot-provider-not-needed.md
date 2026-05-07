---
name: bgutil-pot-provider-not-needed
description: PO Token 우회는 android_vr 캐스케이드로 충분 — bgutil 사이드카 도입 불필요 (월 $1.50~$2.80 절감)
type: reference
created: 2026-05-07
---

YouTube PO Token 차단 우회 방안 검토 결과 결정 기록 (2026-05-07).

**검토 대상**: [bgutil-ytdlp-pot-provider](https://github.com/Brainicism/bgutil-ytdlp-pot-provider) — 별도 컨테이너로 PO Token 발급 HTTP 서버 운영, yt-dlp 플러그인으로 자동 토큰 주입.
- v1.3.1 (2025-03-07), 525 stars, GPL-3.0, yt-dlp 메인테이너 유지
- Docker 이미지: `brainicism/bgutil-ytdlp-pot-provider:latest`, 4416 포트
- yt-dlp 2025.05.22 이상 필요
- pip install bgutil-ytdlp-pot-provider 필수 (yt-dlp 호스트에)
- yt-dlp 인자: `--extractor-args "youtubepot-bgutilhttp:base_url=http://..."`

**결론: 도입 불필요.** `android_vr` 클라이언트 캐스케이드로 동일 효과 달성.

**비용 비교**:
| 방안 | Railway 비용 | 인프라 변경 | 운영 복잡도 |
|------|-----|-----|-----|
| bgutil 사이드카 | +$1.50~$2.80/월 | 신규 서비스 1개 | 컨테이너 모니터링/업데이트 |
| android_vr 캐스케이드 | 0 | 코드 한 줄 | 없음 |

**Why:** 클라이언트 단순 변경으로 해결되면 그것이 최소 비용 경로. 사이드카는 신규 점, 메모리/CPU, 갱신 주기 부담 추가. 또한 bgutil 자체가 *"Providing a PO token does not guarantee bypassing 403 errors or bot checks"*로 100% 보장 아님.

**How to apply:**
- android_vr가 광범위 차단되거나 yt-dlp가 android_vr도 PO Token 요구로 변경하면 재검토
- 그 시점에서 bgutil 셀프호스트 vs PO Token 만료 주기 trade-off 재평가
- 재검토 시 본 메모리 갱신 (decision reversed 표시)

**참조**: 
- [yt-dlp PO Token Guide](https://github.com/yt-dlp/yt-dlp/wiki/PO-Token-Guide)
- [bgutil-ytdlp-pot-provider](https://github.com/Brainicism/bgutil-ytdlp-pot-provider)
