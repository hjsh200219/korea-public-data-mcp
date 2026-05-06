---
created: 2026-05-06T00:00:00+09:00
project: k-public-data-mcp
summary: Algrow MCP 스타일 비디오 분석 기능 적용 가능성 검토 PRD 작성 (Option B 권고)
---

## Session Digest

이번 세션은 코드 변경 없이 의사결정 보고서(PRD) 작성만 진행했다.

YouTube 영상 [Pr0P4a-Ucok](https://www.youtube.com/watch?v=Pr0P4a-Ucok)에서 소개된 Algrow MCP(URL 입력 → YouTube/TikTok/Instagram 비디오 분석, 트렌드/경쟁자 분석)의 기능을 우리 K Public Data MCP에 적용 가능한지 검토했다.

갭 분석 결과: 핵심 기능(스크립트/요약/검색/메타데이터/댓글)은 이미 동등 수준으로 보유. 진짜 갭은 ① 트렌드/경쟁자 분석 합성 액션 ② TikTok/Instagram 멀티플랫폼이며, 4가지 옵션(A 보류 / B 트렌드+경쟁자 액션만 / C TikTok 추가 / D 풀스코프)을 제시하고 **Option B**를 권고했다.

## Progress

### 완료
- ✅ PRD 작성: [docs/product-specs/algrow-mcp-feasibility.md](../docs/product-specs/algrow-mcp-feasibility.md)
  - Algrow 기능 vs 현재 보유 기능 갭 매트릭스
  - 4개 옵션 비교(A/B/C/D) + Option B 권고 근거
  - Option B 적용 시 액션 2개(`trend_analysis`, `compare_channels`) 명세
  - 비범위·리스크·선결조건 정리
- ✅ [docs/product-specs/index.md](../docs/product-specs/index.md) 인덱스에 등록
- ✅ `npm run verify-docs` 통과 (skills:17, routes:11, actions:124)

### 미완료 (인계)
- 🔲 PRD 의사결정 (Option A/B/C/D 채택)
- 🔲 (이전 세션부터 인계) HANDOFF #3/#4/#5 entangled refactor
  - #3 클라이언트 캐스케이드 의도 검토 (쿠키 유무 → tv/web vs android)
  - #4 PO Token/bot 경로 null 반환 시 타입 정보 미보존
  - #5 에러 시 markCurrentFailed() 미호출로 쿠키 풀 미동기
- 🔲 Smithery 마켓플레이스 승인 + awesome-mcp-servers PR 상태 확인

## Next Steps

1. **PRD 검토 + 의사결정**: Option A/B/C/D 중 선택
   - 권고: **Option B** (트렌드/경쟁자 분석 액션만, YouTube 한정)
2. **(Option B 채택 시) 선결: #3/#4/#5 정리** — 멀티 액션 추가 전 쿠키 풀 안정화
3. **(선결 완료 시) `/ralplan`** 으로 Option B 합의 플랜 생성
   - 신규 액션 2개: `trend_analysis`, `compare_channels`
   - 기존 `youtube` 스킬에 액션 추가 (신규 스킬 도구 만들지 않음)
   - Data API v3 쿼터 보호 + 채널 24h 캐시
4. Smithery·awesome-mcp-servers 상태 점검 (이전 세션부터 누적)

## Blockers

- **선결 의존성**: Option B 진행 시 HANDOFF #3/#4/#5 정리가 선행되어야 함 (쿠키 풀 동기화 안정화)
- **의사결정 대기**: PRD 채택 옵션이 결정되어야 후속 ralplan 가능

## Watch Out

### PRD 등록·문서 일관성
- `docs/product-specs/index.md` 표에 신규 PRD 등록됨. 다음 PRD 추가 시 동일 패턴 사용
- `verify-docs.ts` EXPECTED는 변경 없음 (액션·스킬 수 동일)
- product-specs는 의사결정 단계 산출물 — 채택되면 `docs/exec-plans/active/`로 실행 플랜 분리

### Algrow 광고 vs 실제 우리 위치
- 영상은 마케팅성 콘텐츠(Nova AI Daily, 조회수 99) — 광고 주장은 보수적으로 해석
- 우리는 이미 기본기(스크립트/검색/요약) 동등. "Algrow 따라잡기"가 아니라 "우리 페르소나(법률·공공데이터·기업분석)에 맞는 보강"이 핵심
- TikTok/Instagram은 yt-dlp 정책상 운영 부담 큼 — 별도 PRD에서 ROI 입증 후 검토

### 미해결 인계 사항 (이전 세션부터)
- yt-dlp 에러 매칭은 toLowerCase() 적용 완료 (2761d4f)
- `--write-auto-subs` 복수형 적용 완료 (d955eab)
- 쿠키 풀 / circuit breaker / probe 인프라는 정상 동작 중

## Files Touched

| 파일 | 변경 사항 | 상태 |
|------|---------|------|
| `docs/product-specs/algrow-mcp-feasibility.md` | 신규 PRD (8KB) | 신규 |
| `docs/product-specs/index.md` | 인덱스에 PRD 1건 등록 | 수정 |
| `.claude-project/HANDOFF.md` | 본 인계서 갱신 | 수정 |

## Session Timeline

1. **PRD 요청** — YouTube 영상 Pr0P4a-Ucok의 Algrow MCP 기능 적용 가능성 검토 요청
2. **정찰** — Explore 에이전트로 youtube 스킬·yt-dlp·circuit breaker·cookie pool·17개 스킬 슬롯 매핑
3. **갭 분석** — Algrow 7개 기능 vs 우리 보유 기능 매트릭스
4. **옵션 설계** — A(보류) / B(트렌드·경쟁자만) / C(+TikTok) / D(+Instagram)
5. **PRD 저장** — `docs/product-specs/algrow-mcp-feasibility.md`
6. **인덱스 등록 + verify-docs OK**
7. **Pack** — 본 인계서 작성

## Decision Log

- **Option B 권고**: 핵심 기능 이미 동등 + 우리 페르소나(법률·공공데이터)에 마케팅·크리에이터 페르소나 어긋남 + 멀티플랫폼은 운영 부담 큼
- **신규 스킬 도구 만들지 않음**: 17개 스킬 슬롯 유지, 기존 `youtube` 스킬에 액션 추가 방식 채택 (verify-docs EXPECTED 동기화 부담 회피)
- **선결 조건 명시**: Option B 진행은 HANDOFF #3/#4/#5 정리 후로 연기 (쿠키 풀 안정성 우선)
- **TikTok/Instagram 별도 PRD**: yt-dlp 정책 불안정 + 로그인 요구 + 운영 부담 → 본 PRD에서는 비범위로 분리

---

**다음 세션 시작 시**:
1. `docs/product-specs/algrow-mcp-feasibility.md` 의사결정 (Option A/B/C/D)
2. (B 채택 시) HANDOFF #3/#4/#5 entangled refactor 우선 처리
3. 그 후 `/ralplan` 으로 trend_analysis + compare_channels 합의 플랜
4. 누적 미완료: Smithery 마켓플레이스 / awesome-mcp-servers PR 상태 확인
