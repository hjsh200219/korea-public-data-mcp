---
created: 2026-08-04T08:45:00+09:00
project: k-public-data-mcp
summary: YouTube 쿠키 동기화 FAIL 근본원인(raw 파일 재사용 자가오염) 수정 + 헬스 만료값 오표시 2건 수정, 전부 배포·라이브 검증 완료
---

## Session Digest
08:00 `sync-youtube-cookies` 실패 알림에서 출발. 처음엔 "서버측 세션 사망"으로 진단했으나, 검증 과정에서 **yt-dlp `--cookies`가 읽기 겸 쓰기**라는 사실이 드러나 진짜 원인을 특정했다 — 직전 실행이 남긴 `/tmp/yt_raw_cookies.txt`의 죽은 세션이 살아있는 브라우저 쿠키와 병합되며 인증 쿠키를 덮어써 가드가 FATAL. 결정적 A/B: 동일 시점·동일 명령에서 **기존 파일 재사용 0/3 vs 새 파일 3/3**.

부수적으로 `/health/youtube`의 `expiresIn` 오표시 2건(30분짜리 `GPS`가 최소값을 지배 → 항상 `0d`/`expires_soon`, Chrome 에포크 미정규화 → `155842942811d`)도 수정. 커밋 3건 전부 master 푸시·Railway 배포·라이브 검증 완료.

## Progress
- [x] 08:00 FAIL 원인 규명 — raw 쿠키 파일 재사용 자가오염 (프로필/keychain 문제 아님)
- [x] `scripts/refresh-youtube-cookies.ts`: yt-dlp 호출 직전 `rmSync(RAW_COOKIE_PATH, {force:true})` (`396ad7d`)
- [x] 프로브 영상 `dQw4w9WgXcQ` → `jNQXAC9IVRw` 교체 — 전자는 로컬에서도 3연속 429
- [x] `youtube-cookie-pool.ts` `parseMinExpiry`: 인증 쿠키 기준 최소 만료 계산 + 인증쿠키 부재 시 전체 최소값 폴백 (`8167092`)
- [x] `normalizeExpiryMs`: Chrome 에포크(1601 기준 마이크로초) → unix 정규화, `parseInt`→`Number` (`743c1de`)
- [x] 테스트 4건 추가 (실업로드 형상 기반, 값은 더미) — 1078 passed
- [x] 라이브 검증: `sync-youtube-cookies.sh` 연속 3회 성공 / `/health/youtube` `expiresIn:"399d"` 경고 없음 / MCP `get_transcript` 자막 반환
- [ ] KIPRIS 관리자 승인 대기 (이전 세션 이월, 영업일 1~3일)
- [ ] KIPRIS MCP 도구 구현 (승인 후 착수)

## Next Steps
1. 내일 08:00 LaunchAgent 정기 실행 결과 확인 — 수정 후 첫 무인 실행 (`/tmp/sync-youtube-cookies.log`)
2. (KIPRIS, 이전 세션 이월) 승인되면 `getAdvancedSearch` 라이브 검증 → `src/kipris-api.ts` TDD 구현. 상세 스펙은 `HANDOFF.md.prev` 참조 — `KIPRIS_API_KEY`는 `.env` + Railway 저장 완료

## Blockers
- **KIPRIS 서비스 승인 대기** — 승인 전까지 `resultCode 31 DEADLINE_HAS_EXPIRED`. 사용자가 승인되면 알려주기로 함.

## Watch Out
- **yt-dlp `--cookies`는 읽기 겸 쓰기.** 쿠키 진단 시 반드시 존재하지 않는 새 파일 경로를 쓸 것 — 기존 파일 재사용하면 같은 오염으로 오진한다.
- 쿠키 동기화 검증은 **연속 2회 이상** 성공을 볼 것. 1회 성공은 증거가 안 된다(수정 전에도 1회차는 통과했음).
- 컨테이너의 쿠키 스냅샷은 1시간 내 stale해진다(`SID`/`__Secure-1PSIDTS` 회전). 일일 동기화 + 재배포 설계의 한계이며 버그가 아니다. 재배포 직후 검증할 것.
- Railway 공개 도메인은 `public-data.up.railway.app`. `korea-public-data-mcp-production.up.railway.app`은 404.
- 헬스 200만으로 정상 판정 금지 — MCP `get_transcript` 실호출까지 볼 것.
- `dQw4w9WgXcQ`는 봇 트래픽이 몰려 상시 429. 테스트·프로브 영상으로 쓰지 말 것.

## Files Touched
- `scripts/refresh-youtube-cookies.ts`
- `src/youtube-cookie-pool.ts`
- `src/youtube-cookie-pool.test.ts`
