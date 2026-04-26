---
name: yt-dlp-cookies-file-quirks
description: yt-dlp --cookies 파일/URL 사용 시 함정 두 가지
type: reference
created: 2026-04-27
---

yt-dlp로 쿠키 추출만 할 때 알아둘 두 함정.

## 1. 빈/존재하지 않는 파일을 `--cookies <file>`로 지정하면 실패

`--cookies <path>`는 yt-dlp가 **입력 파일로 먼저 읽으려고 시도**한다. 빈 파일이거나 Netscape 포맷이 아니면:
```
ERROR: '<path>' does not look like a Netscape format cookies file
```

**해결:** `mktemp`로 0바이트 파일을 미리 만들지 말고, `mktemp -d`로 디렉토리만 만든 뒤 그 안에 파일 경로를 지정해 yt-dlp가 자체 생성하게 둔다.
```bash
TMP_DIR="$(mktemp -d)"
TMP_COOKIES="$TMP_DIR/cookies.txt"   # 파일은 yt-dlp가 만든다
yt-dlp --cookies-from-browser chrome --cookies "$TMP_COOKIES" --skip-download <URL>
```

## 2. `https://youtube.com/`을 URL로 쓰면 홈 전체 영상을 enumerate

쿠키 추출만 원해도 yt-dlp는 그 URL을 거대한 플레이리스트로 처리해 매우 느려진다(수 분 단위로 멈춤).

**해결:** 단일 비디오 URL을 사용하고 `--no-playlist --simulate` 추가.
```bash
yt-dlp --cookies-from-browser chrome --cookies cookies.txt \
  --skip-download --no-playlist --no-warnings --simulate \
  "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
```
Rickroll(`dQw4w9WgXcQ`)은 영구 가용 + 트래픽 영향 미미라 cookie-extraction 전용 호출에 관용적으로 쓰인다.

**Why:** 2026-04-27 세션에서 두 함정 모두 직접 밟음. Railway용 cookies.txt 자동 갱신 스크립트(`~/workspace/scripts/sync-youtube-cookies.sh`)에 이 패턴 반영됨.
