---
name: yt-dlp-stderr-429-false-positive
description: execFile 에러 메시지 앞머리의 명령 에코가 에러 분류를 오염시킨다 — 분류·로깅 모두 에코를 버릴 것
type: feedback
created: 2026-05-03
updated: 2026-09-16
---

Node `execFile`(`execFileAsync`)의 에러 메시지는 `Command failed: <전체 명령>`으로 시작한다.
즉 **우리가 넘긴 인자가 에러 메시지 본문에 그대로 들어 있다.**
이 문자열을 substring 매칭으로 분류하면 원격 서버의 실제 오류가 아니라
우리 인자가 분류 결과를 결정한다.

**실측 사례 2건**
- 2026-05-03(잠재): `--extractor-args "youtube:player_client=android"` 인자가 에러 메시지에 포함돼
  `error.message.includes('429')`류 검사가 오탐 가능한 상태로 남아 있었음.
- 2026-09-16(실제 사고): 명령줄에 `--cookies`가 들어 있어, tv 클라이언트의 실제 오류
  `The page needs to be reloaded.`가 **COOKIE_EXPIRED로 둔갑**. "쿠키를 갱신하라"는 오안내가
  나갔고 쿠키 재동기화·재배포를 반복했지만 원인은 그대로였음. 수정 커밋 0573ec2.

같은 이유로 **로깅에도 해당**한다. 실패 로그에 stderr 원문을 그대로 남기면 앞머리 대부분이
명령 에코라 정작 원인 줄이 잘려 나간다. 커밋 c61e6e2의 `summarizeYtDlpOutput`이
에코를 버리고 `ERROR`/`WARNING` 줄 위주로 **뒤쪽**을 남긴다.

**Why:** 라벨이 틀리면 대응 전체가 틀린다. 오분류는 실패로 보이지 않고 "설명 가능한 실패"로
보이기 때문에 가장 늦게 발견된다.

**How to apply:**
- 분류 전에 `stripCommandEcho`(`src/youtube-api.ts`)로 `Command failed: <명령>` 앞머리를 제거하고,
  **남은 stderr만** 매칭 대상으로 삼을 것
- 새 에러 코드를 추가할 때 판별 문자열이 우리 인자에도 등장할 수 있는지 먼저 확인
  (`--cookies`, `player_client=...`, URL, 파일 경로 등)
- 실패 로그는 `summarizeYtDlpOutput`으로 요약해 남길 것 — 에코 제거 + ERROR/WARNING 줄 우선 + 뒤쪽 보존
- 쿠키 미지원 클라이언트 스킵 경고도 같은 함정: [[yt-dlp-cookie-unsupported-clients-skip]]
- 진단 절차: [[remote-failure-reproduce-locally-before-relabeling]]
