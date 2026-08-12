---
name: plugin-always-on-token-budget
description: 플러그인 스킬/커맨드는 설치자 모든 세션에 상시 얹힘 — claude plugin details로 always-on 토큰 확인
type: project
created: 2026-08-12
---

`claude plugin details korea-public-data`는 설치된 컴포넌트 인벤토리와 함께
**always-on 토큰 비용**을 출력한다. 2026-08-12 실물 설치 기준: MCP 1 / 스킬 8 /
always-on 663 tok.

이 663 토큰은 플러그인을 설치한 사용자의 **모든 세션 컨텍스트에 무조건 선적재**된다
(스킬 frontmatter의 name/description, 커맨드 description). 스킬·커맨드를 늘리면
사용자가 그 기능을 안 써도 비용을 낸다.

**Why:** MCP 도구는 호출할 때만 스키마가 붙지만 스킬/커맨드 메타데이터는 상시다.
커맨드를 편하다고 계속 추가하면 설치자 전원의 컨텍스트 예산을 조용히 잠식한다.

**How to apply:**
- `commands/*.md` 또는 `skills/*/SKILL.md` 추가·수정 후 `claude plugin details`로
  always-on 수치를 재확인하고, 증가분이 기능 가치에 비해 큰지 판단한다.
- description은 라우팅에 필요한 최소 길이로. 상세 사용법은 본문에 두면 상시 비용이 아니다.
- 관련: [[skill-tool-count-16-with-tourism]]
