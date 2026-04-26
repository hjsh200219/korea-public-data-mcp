---
name: railway-youtube-429-transient
description: Railway 송출 IP의 YouTube 429는 일시적 — 5–10분 대기 후 재시도가 1차 대응
type: reference
created: 2026-04-27
---

Railway egress IP는 클라우드 공유 IP 풀이라 YouTube가 이웃 트래픽 영향으로 자주 429(Too Many Requests)를 반환. 보통 수 분 내 자연 해소.

**Why:** 2026-04-27 세션에서 새 코드 배포 직후 동일 영상 자막 호출이 `HTTP Error 429: Too Many Requests`를 반환. 코드 경로는 정상이며 IP rate limit으로 분류. Amsterdam 리전(`europe-west4-drams3a`)도 동일 현상.

**How to apply:**
- 자막 추출 429 시 즉시 코드/리전/쿠키를 손대지 말고 5–10분 대기 후 재시도.
- 지속되면: 1) 쿠키 갱신(브라우저 재로그인 후 재추출), 2) 로컬 stdio 모드로 임시 우회, 3) 리전 변경 검토.
- 새 캐스케이드 정책상 429는 즉시 throw로 다음 클라이언트 폴백 안 함 — 의도된 동작이며, 더 두드릴수록 차단 길어짐.
