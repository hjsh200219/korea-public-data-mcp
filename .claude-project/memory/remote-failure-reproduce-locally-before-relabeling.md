---
name: remote-failure-reproduce-locally-before-relabeling
description: 원격 실패는 같은 도구·같은 인자·같은 핀 버전으로 로컬 재현해 원문 stderr를 보기 전엔 라벨을 믿지 말 것
type: feedback
created: 2026-09-16
---

원격 서버(Railway 등)의 자막/외부도구 실패는 **우리 코드가 붙인 에러 라벨**로 먼저 보인다.
그 라벨이 맞는지는 같은 도구를 같은 인자·같은 핀 버전으로 로컬 venv에서 재현해
**원문 stderr를 직접 읽어야** 확인된다.

**Why:** 2026-09-16 세션에서 `COOKIE_EXPIRED` 라벨을 믿고 쿠키 재동기화·재배포부터 돌렸지만,
실제 tv 클라이언트 오류는 `The page needs to be reloaded.`였다. 라벨이 오분류였기 때문에
쿠키를 아무리 갱신해도 원인은 그대로 남았다. 오분류 메커니즘은 [[yt-dlp-stderr-429-false-positive]].

**How to apply:**
- 진단 순서: 로컬 재현 → 원문 stderr 확인 → 그다음에 라벨/코드 수정
- 재현 환경은 프로덕션과 **핀 버전까지** 맞출 것 (`Dockerfile`의 yt-dlp 릴리즈 번호 그대로,
  `python3 -m venv` + `pip install yt-dlp==<핀>`이 가장 빠르다)
- 쿠키 재발급·재배포처럼 비용/부작용 있는 대응은 원문 stderr를 본 뒤에 결정
- 라벨과 원문이 다르면 대응보다 **분류 코드 수정이 먼저** — 아니면 같은 오진이 반복된다
- 서버에 클라이언트별 실패 로그가 없으면 그것부터 추가할 것 (커밋 2760206·c61e6e2)
