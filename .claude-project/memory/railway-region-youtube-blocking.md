---
name: railway-region-youtube-blocking
description: Railway 리전별 YouTube 한국 콘텐츠 차단 패턴 (2026-04-26 기준)
type: reference
created: 2026-04-26
---

Railway 리전별로 YouTube가 한국 콘텐츠 자막 요청을 차단하는 정도가 다름:

| 리전 (Railway 코드) | 한국 콘텐츠 | 영어 콘텐츠 |
|---------------------|-------------|-------------|
| `asia-southeast1-eqsg3a` (Singapore) | ❌ 차단 심함 | ✅ |
| `us-west2` (California) | ❌ 차단 | ✅ |
| `us-east4-eqdc4a` (Virginia) | ❌ 차단 | ✅ |
| `europe-west4-drams3a` (Amsterdam) | ✅ **차단 안 됨** | ✅ |

Railway는 Pro 플랜에서도 위 4개 리전이 전부. Tokyo, Mumbai 등 추가 리전 없음.

**Why:** YouTube가 클라우드 데이터센터 IP를 광범위하게 차단하는데, EU 리전(Amsterdam)이 가장 관대함. 한국 콘텐츠 자막 요청 시 다른 리전은 `RequestBlocked` 에러 발생.

**How to apply:** k-public-data-mcp 운영은 `europe-west4-drams3a`로 유지. 차단 발생 시 `railway scale --europe-west4-drams3a 1 --{기존-리전} 0`으로 변경. 멀티 리전 fallback은 비용 대비 효율 낮아 비추천.
