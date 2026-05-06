---
title: Algrow MCP 스타일 비디오 분석 기능 적용 가능성 검토
status: review
created: 2026-05-06
owner: hjsh200219
source-video: https://www.youtube.com/watch?v=Pr0P4a-Ucok
related:
  - src/tools/skills/youtube.ts
  - src/youtube-api.ts
  - .claude-project/HANDOFF.md
---

# Algrow MCP 스타일 비디오 분석 기능 적용 가능성 검토

## 1. 배경 (Context)

2026-04-06 출시된 Algrow MCP(개발자 samgrows)가 화제가 됨. URL 입력만으로 YouTube/TikTok/Instagram 영상을 분석·요약·트렌드 인사이트까지 제공하며 출시 6개월 만에 월 14,000 USD 수익을 기록한 것으로 보도됨. 본 문서는 해당 기능을 우리 프로젝트(K Public Data MCP)에 도입할 가치가 있는지, 있다면 어떤 범위로 도입할지를 결정하기 위한 갭 분석 및 권고 보고서다.

영상 출처: [Pr0P4a-Ucok](https://www.youtube.com/watch?v=Pr0P4a-Ucok) (Nova AI Daily, 2026-05-04)

## 2. Algrow가 광고하는 기능

| # | 기능 | 비고 |
|---|------|------|
| F1 | URL → 비디오 분석 (YouTube/TikTok/Instagram) | 트윗에서 3개 플랫폼 모두 언급. 기사 본문은 "현재 MCP는 YouTube에 특화"라고 부연 |
| F2 | 라이브 유튜브 스크립트 추출 | yt-dlp 또는 자체 추출기 추정 |
| F3 | Claude 채팅 인터페이스에 MCP 직결 | 표준 MCP |
| F4 | 키워드 검색 + 트렌드 분석 (코드리스, API 키만) | 핵심 차별화 포인트 |
| F5 | 모든 길이의 비디오 전체 스크립트 접근 | 길이 제한 없음 강조 |
| F6 | 분석 소요 2~3분 | 다단계 도구 체이닝 결과 |
| F7 | 사용 사례: 크리에이터 트렌드/경쟁자 분석, 마케터 바이럴 콘텐츠 분석 | 페르소나 |

## 3. 우리 프로젝트의 현재 상태

### 3.1 보유 기능 (`youtube` 스킬, [src/tools/skills/youtube.ts](../../src/tools/skills/youtube.ts))

| Action | Algrow 대응 | 상태 |
|--------|-------------|------|
| `get_transcript` | F2, F5 | 정상. yt-dlp + Python `youtube-transcript-api` 폴백 |
| `summarize` | (Claude가 전사 후 요약) | 정상 |
| `video_info` | (메타데이터) | 정상. Data API v3 |
| `search` | F4 키워드 검색 | 정상. Data API v3 |
| `comments` | (감성 분석 입력) | 정상. Data API v3 |

### 3.2 운영 인프라

- **Circuit breaker** ([src/youtube-circuit-breaker.ts](../../src/youtube-circuit-breaker.ts)): 6회 인프라 실패 시 60초 차단
- **Cookie pool** ([src/youtube-cookie-pool.ts](../../src/youtube-cookie-pool.ts)): 라운드로빈, 24h 만료 추적, Railway 32KB 제약 대응 (`.youtube.com` 필터)
- **Probe** ([src/youtube-probe.ts](../../src/youtube-probe.ts)): 5분 주기 헬스체크, 100-item 링버퍼
- **Kill switch**: `YOUTUBE_CIRCUIT_BREAKER_ENABLED`, `YOUTUBE_PROBE_ENABLED`
- **채널 캐털로그**: `youtube.md` (`@HANDLE` URL, `# 주석` 그룹핑) + `getChannelVideos`

### 3.3 미해결 이슈 (HANDOFF.md)

- **#3** 클라이언트 캐스케이드 의도 검토 (쿠키 유무에 따른 `tv|web|android` 분기)
- **#4/#5** PO Token/bot 경로 null 반환 + 쿠키 풀 미동기 (entangled refactor)

## 4. 갭 분석 (Algrow vs Ours)

| Algrow 기능 | 우리 보유 | 갭 | 갭 우선순위 |
|---|---|---|---|
| URL → YouTube 분석 | ✅ get_transcript+summarize+video_info | 동등 | — |
| URL → TikTok 분석 | ❌ | 신규 추출기 필요 | **중** |
| URL → Instagram 분석 | ❌ | 신규 추출기 + 인증 부담 | **하** |
| 라이브 스크립트 | ✅ | 동등 | — |
| Claude MCP 직결 | ✅ | 동등 | — |
| 키워드 검색 | ✅ search | 동등 | — |
| 트렌드 분석(상위 레벨 합성) | △ 채널 캐털로그+검색은 있으나 합성 미제공 | 신규 액션 (`trend_analysis`) 필요 | **상** |
| 경쟁자 분석 | △ `youtube.md` 그룹핑 활용 가능하나 액션 없음 | 신규 액션 (`compare_channels`) 필요 | **상** |
| 모든 길이 전체 스크립트 | ✅ (8000자 truncate는 응답 측, 원본은 전체 보유) | 동등 (페이지네이션) | — |
| 코드리스 (API 키만) | ✅ MCP 표준 | 동등 | — |

### 4.1 결론적 갭

도입할 가치가 있는 갭은 다음 셋이다:
1. **트렌드/경쟁자 분석 액션** (상위 레벨 합성 — 가장 큰 차별화 가치)
2. **TikTok 지원** (yt-dlp가 이미 지원, 운영 부담 보통)
3. **Instagram 지원** (yt-dlp 지원하나 로그인 요구 잦음, 운영 부담 큼)

## 5. 옵션 비교

### Option A — 보고서로 끝내고 도입 보류
- **근거**: 핵심 기능(스크립트/검색/요약)은 이미 동등. 추가 ROI 불확실
- **트레이드오프**: 마케팅/크리에이터 페르소나가 우리 주력(법률·공공데이터)과 어긋남. 차별화 효과 미미

### Option B — 트렌드/경쟁자 분석만 추가 (YouTube 한정)
- **범위**: `youtube` 스킬에 `trend_analysis`, `compare_channels` 2개 action 추가
- **재료**: 이미 보유한 `getChannelVideos` + `youtube.md` 그룹 + Data API v3 검색 + Claude 합성
- **신규 도메인 파일 불필요** — 기존 `youtube-api.ts`에 헬퍼만 추가
- **트레이드오프**: TikTok/Instagram 미지원으로 "Algrow 동급" 광고는 못함. 그러나 우리 페르소나(법률·공공데이터·기업분석)에는 충분

### Option C — TikTok 추가 (B 위에)
- **범위**: B + `tiktok-api.ts` + `tiktok-types.ts` + 멀티플랫폼 추출 추상화
- **트레이드오프**: yt-dlp가 TikTok 워터마크/리전블록에 자주 깨지며, Cookie pool 인프라를 TikTok용으로 별도 구축해야 함. Probe·CB도 플랫폼별 분리 필요. 운영 비용 급증

### Option D — 풀스코프 (TikTok + Instagram + 트렌드/경쟁자)
- **범위**: C + `instagram-api.ts` + Instagram 로그인 세션 관리
- **트레이드오프**: Instagram은 yt-dlp 정책상 가장 불안정. 로그인 세션 만료 잦음. **운영 부담이 우리 본업(공공데이터)을 위협할 수준**

### 옵션 권고

**Option B 권고.** 근거:
- HANDOFF #3/#4/#5(쿠키 풀 동기화)도 미해결인데 멀티플랫폼 확장은 시기상조
- 우리 페르소나는 법률·공공데이터·기업분석·관세 등이며 마케팅·크리에이터가 아님
- 트렌드/경쟁자 분석은 기존 인프라 재활용으로 저비용 고가치
- TikTok/Instagram은 별도 PRD에서 수요·ROI가 입증된 후 검토

## 6. Option B 적용 시 권고 범위

### 6.1 추가 액션 2개

| Action | 입력 | 출력 (요약) |
|---|---|---|
| `trend_analysis` | `query` 또는 `channel_group` (youtube.md 그룹), 기간(예: 7d/30d) | 상위 N개 비디오 + 키워드 빈도 + 채널별 평균 조회수 |
| `compare_channels` | `channel_handles[]` (예: `["@A","@B"]`) | 채널별 최근 업로드, 평균 인게이지먼트, 토픽 클러스터 (Claude 합성) |

### 6.2 비기능 요구

- 응답 8000자 truncate 컨벤션 유지 (`truncateWindow()`)
- Data API 쿼터 보호: `max_results` 상한, 채널당 호출 횟수 제한
- 기존 circuit breaker / probe / cookie pool 무변경 (재활용)
- 16개 → 17개 스킬 유지 (action 추가만, 신규 스킬 도구는 만들지 않음)
- `verify-docs.ts` EXPECTED 카운트 동기화 불필요 (액션만 늘어남)

### 6.3 선결 조건 (Prerequisites)

다음 항목이 정리된 후 본 작업 착수 권장:
- HANDOFF #3 클라이언트 캐스케이드 의도 정리
- HANDOFF #4/#5 PO Token/쿠키 풀 동기화 entangled refactor

### 6.4 비범위 (Out of Scope)

- TikTok / Instagram 지원
- 별도 신규 스킬 도구 (`video_analysis`, `trend_research` 등) — 기존 `youtube` 스킬에 액션 추가로 처리
- 자체 트렌드 점수 모델 (Claude의 합성으로 충분)
- 비디오 다운로드 / 클립 생성

## 7. 리스크 및 가정

| ID | 리스크 / 가정 | 완화책 |
|---|---|---|
| R1 | YouTube Data API v3 쿼터 초과 (`trend_analysis`가 다수 채널 호출 시) | `max_results` 상한 + 채널별 캐시 24h |
| R2 | 트렌드 합성 결과가 마케팅용으로는 깊이 부족 | "보조 인사이트"로 포지셔닝, 풀-깊이는 별도 도구 사용자 가이드 |
| R3 | Algrow 동급 광고를 못함 | 우리 포지셔닝은 K 공공데이터 + 보조 비디오 분석. 정직한 메시지 |
| A1 | Claude가 Data API v3 응답을 기반으로 트렌드 합성 가능 (전용 모델 불필요) | 본 가정 위에서 Option B 비용 산정 |

## 8. 의사결정 요청 (Decision Requested)

다음 셋 중 하나를 결정:

- **[ ] Option A** — 도입 보류, 본 보고서로 종료
- **[x] Option B** — 트렌드/경쟁자 분석 2개 액션 추가 (HANDOFF #3/#4/#5 정리 후)  *(권고)*
- **[ ] Option C/D** — 멀티플랫폼 확장 (별도 PRD 필요)

승인 시 후속:
1. HANDOFF #3/#4/#5 entangled refactor 완료 확인
2. `/ralplan` 으로 Option B 합의 플랜 생성 (Planner→Architect→Critic)
3. 합의 후 `/team` 또는 `/ralph` 로 실행

## 9. 참고

- 영상 메타: 1분 52초, 조회수 99, Nova AI Daily 채널 (마케팅성 콘텐츠 — 광고 주장은 보수적으로 해석함)
- Algrow 트윗: https://x.com/samgrows/status/2050633685582373245
- 본 PRD는 코드 변경 명세가 아니라 **도입 가능성 판단** 보고서임. 실제 구현은 Option B 채택 시 별도 ralplan 합의 필요
