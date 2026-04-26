---
created: 2026-04-27T08:45:00+09:00
project: k-public-data-mcp
summary: yt-dlp tv→web 클라이언트 캐스케이드로 PO Token 보호 자동자막 추출 우회 (TDD, 배포 완료)
---

## Session Digest

YouTube 영상(`Nmk1wxoi6ys`) 자막 추출 실패를 추적해 자동자막 + PO Token 보호가 원인임을 확인. yt-dlp `tv` 클라이언트 + 쿠키 우회 경로를 검증하고, TDD로 `src/youtube-api.ts`에 클라이언트 캐스케이드(쿠키 있음 → tv → web, 쿠키 없음 → android)를 도입. 기존 6개 테스트 재작성 + 신규 1개 추가로 36/36 통과 확보. typecheck/lint/test(674)/build 전부 그린 상태에서 commit `4446c0c`로 origin/master 푸시, Railway 자동 배포 SUCCESS. 실서버 검증은 YouTube 429로 일시 차단됐고 코드 경로는 정상.

## Progress
- [x] 자막 추출 실패 원인 분석 (자동자막 + PO Token 보호)
- [x] yt-dlp `tv` 클라이언트 + 쿠키로 우회 경로 실증
- [x] TDD: Red 테스트 → 캐스케이드 구현 → Refactor (36/36 통과)
- [x] lint/typecheck/test(674)/build 모두 통과
- [x] commit `4446c0c` 작성, origin/master 푸시
- [x] Railway 자동 배포 SUCCESS, 새 컨테이너 가동 확인
- [ ] 실서버에서 동일 영상 자막 추출 검증 — YouTube 429로 미완

## Next Steps
1. YouTube 429 자연 해소 대기 후 `https://youtu.be/Nmk1wxoi6ys` 재검증
2. 다른 영상 2~3건으로 캐스케이드 재현 테스트 (자동자막만 vs 수동자막 vs 자막 없음 혼합)
3. 429 재발 시 백오프/지수 재시도 로직 추가 검토
4. yt-dlp 업스트림이 `tv`도 막을 가능성 모니터링 — `mweb`/`android_creator` 백업 클라이언트 검토

## Blockers
- 외부 의존: YouTube가 Railway egress IP에 일시 rate limit (429) 적용. 코드 정상, 자연 해소 대기.

## Watch Out
- Railway env `YOUTUBE_COOKIES` 만료 가능성 — 주기적 갱신 필요 (브라우저 재로그인 후 재추출).
- `tv` 클라이언트도 PO Token 강제 시 향후 차단 가능 — `web` fallback 유지 이유.
- `ios`는 쿠키 미지원 (`Skipping client "ios" since it does not support cookies`) — 캐스케이드에 추가 무의미.
- 새 정책상 429는 즉시 throw — 폴백 안 함. 의도된 동작이며, 더 두드릴수록 차단 길어짐.
- Dockerfile의 `yt-dlp`/`python3`/`youtube-transcript-api`/`deno` 버전 핀 부재 — 업스트림 변경에 직접 노출됨.

## Files Touched
- `src/youtube-api.ts` (캐스케이드 로직, `tryYtDlpClient` 분리)
- `src/youtube-api.test.ts` (6개 재작성 + 1개 신규, 36/36)
