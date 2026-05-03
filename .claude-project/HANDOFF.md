---
created: 2026-05-04T07:15:00+09:00
project: k-public-data-mcp
summary: YouTube 자막 추출 버그 2건 수정 (write-auto-subs + 에러 대소문자 매칭)
---

## Session Digest

이 세션에서는 YouTube 자막 추출의 근본 원인 2건을 수정했다:

1. **--write-auto-subs 플래그 오류** (d955eab)
   - 기존: `--write-auto-sub` (단수, 존재하지 않는 플래그)
   - 수정: `--write-auto-subs` (복수, 올바른 플래그)
   - 영향: 자동자막이 전혀 다운로드되지 않던 버그 해결
   - 테스트: yt-dlp 인자에 `--write-auto-subs` 포함 검증 추가

2. **yt-dlp 에러 문자열 대소문자 매칭** (2761d4f)
   - 기존: 정확한 대소문자 비교 → yt-dlp 버전 업데이트 시 대소문자 변형으로 인해 오분류
   - 수정: `toLowerCase()` 적용 → 대소문자 무시 매칭
   - 패턴: `no subtitles`, `subtitles are disabled`, `PO Token`, `po_token`, `sign in`, `not available in your country`
   - 테스트: 대소문자 변형 케이스 4개 추가 (python3 fallback 미호출 검증)

## Progress

### 완료
- ✅ `--write-auto-subs` 플래그 수정 (d955eab)
  - `src/youtube-api.ts` 1줄 수정
  - `src/youtube-api.test.ts` 테스트 추가 (14줄)
- ✅ yt-dlp 에러 문자열 대소문자 무시 매칭 (2761d4f)
  - `src/youtube-api.ts` 6줄 수정
  - `src/youtube-api.test.ts` 39줄 테스트 추가
- ✅ 전체 CI 통과: `npm run test`, `npm run build` ✅

### 미완료 (인계)

**구조 변경 필요** (Codex 리뷰 이슈):
- **#3**: 클라이언트 캐스케이드 고정
  - 현황: 쿠키 있으면 tv/web만, 없으면 android만 시도
  - 검토 필요: 원래 의도적 설계인지 여부 (쿠키 풀 거동 재검토)
  
- **#4/#5**: PO Token/bot 경로 null 반환 + 쿠키 풀 미동기
  - #4: PO Token/bot 경로에서 null 반환 시 타입 정보 미보존
  - #5: 에러 시 `markCurrentFailed()` 미호출로 쿠키 풀 미동기
  - 특징: 밀접하게 얽혀 있어 함께 리팩토링 필요

## Next Steps

1. **#3 검토**: `src/youtube-api.ts` 클라이언트 캐스케이드 로직 재검토
   - 쿠키 풀 거동과의 일관성 확인
   - 의도적 설계라면 주석 추가

2. **#4/#5 리팩토링**: entangled refactor 필요
   - `markCurrentFailed()` 호출 위치 정확히 파악
   - PO Token/bot 경로에서 타입 정보 보존 방식 개선
   - 테스트: 쿠키 풀 상태 동기화 검증 추가

3. **YouTube 안정성 모니터링**
   - 자막 추출 성공률 확인 (circuit breaker, probe metrics)
   - 쿠키 풀 갱신 주기 (Remote 루틴 `trig_013jaxkLuRLDkpk71g49tJxB`)

## Blockers

- **#3/#4/#5**: 구조 변경이 필요한 미완료 이슈 (다음 세션 주제)

## Watch Out

### YouTube yt-dlp 에러 매칭
- **대소문자 무시 매칭 필수**: yt-dlp 버전 업데이트 시 에러 메시지의 대소문자가 변할 수 있음
- **패턴 목록** (모두 `toLowerCase()`로 비교):
  - `no subtitles`
  - `subtitles are disabled`
  - `po token` (대문자 변형)
  - `sign in`
  - `not available in your country`
- **python3 fallback**: 새로운 에러 패턴 발견 시 테스트 케이스 추가 필수

### 쿠키 풀 상태 관리
- **markCurrentFailed() 호출**: 에러 발생 시 쿠키를 실패 상태로 마킹해야 풀이 다음 쿠키 시도
- **PO Token/bot 경로**: null 반환 시에도 상태 추적 필수 (타입 정보 보존)

### 클라이언트 캐스케이드
- **현재 로직**: 쿠키 유무에 따라 클라이언트 목록 다름
  - 쿠키 있음: `tv`, `web`
  - 쿠키 없음: `android`
- **검토 필요**: 의도적인가, 아니면 버그인가

## Files Touched

| 파일 | 변경 사항 | 커밋 |
|------|---------|------|
| `src/youtube-api.ts` | `--write-auto-sub` → `--write-auto-subs`, 에러 매칭 toLowerCase() 적용 | d955eab, 2761d4f |
| `src/youtube-api.test.ts` | 14줄 (write-auto-subs) + 39줄 (대소문자 케이스) 테스트 추가 | d955eab, 2761d4f |

## Session Timeline

1. **07:08** — `--write-auto-subs` 플래그 수정 (d955eab)
2. **07:11** — yt-dlp 에러 대소문자 매칭 (2761d4f)
3. **07:15** — HANDOFF 작성

## Decision Log

- **write-auto-subs 복수형**: yt-dlp 공식 플래그 (단수 `--write-auto-sub`는 존재하지 않음)
- **toLowerCase() 적용**: yt-dlp 버전 업데이트 시 에러 메시지 대소문자 변형 대응
- **구조 변경 미루기**: #3/#4/#5는 밀접하게 얽혀 있어 별도 세션에서 함께 리팩토링

---

**다음 세션 시작 시**:
1. #3 클라이언트 캐스케이드 설계 의도 검토
2. #4/#5 entangled refactor 실행
3. YouTube 자막 추출 성공률 메트릭 확인 (쿠키 풀, circuit breaker, probe)
4. Smithery 마켓플레이스 승인 상태 + `awesome-mcp-servers` PR 상태 확인 (이전 세션 미완료)
