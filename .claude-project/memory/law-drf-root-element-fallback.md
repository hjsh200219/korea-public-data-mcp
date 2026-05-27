---
name: law-drf-root-element-fallback
description: 법제처 DRF는 동일 target에 응답 root 엘리먼트가 분기됨. 단일 root 가정 시 throw
type: reference
created: 2026-05-27
---

법제처 DRF (`lawService.do`)는 동일 target이라도 데이터 유형에 따라 응답 root 엘리먼트가 다름:

| target | root (case A) | root (case B) | 조건 |
|---|---|---|---|
| `trty` (조약) | `BothTrtyService` | `MultTrtyService` | 양자 vs 다자 |
| `admrulOldAndNew` | `AdmRulOldAndNewService` | `OldAndNewService` (문서) | 실제 응답은 전자 |
| `lawjosub` (조항호목) | `법령` (국문) | `Law` (영문) | 국문/영문 법령 |

**Why:** 법제처 공식 문서는 단일 root만 명시. 라이브 호출로만 발견. 다자조약/행정규칙 신구법 호출 시 "조약/신구법비교 정보를 찾을 수 없습니다" throw → 사용자는 데이터 없음으로 오해.

**How to apply:** 신규 detail 함수 작성 시 라이브 호출로 양자/다자, 국문/영문, 정상/예외 등 가능한 분기 케이스 모두 curl로 확인. 코드 패턴:
```ts
const root = (data.RootA || data.RootB) as Record<string, unknown> | undefined;
if (!root) throw new Error("...");
```
관련 필드도 양자/다자 분기 가능 (예: `양자조약분야명 || 다자조약분야명`).

관련: [[law-detail-21api-live-verification]]
