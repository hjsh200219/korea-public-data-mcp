---
name: plugin-update-propagation
description: 플러그인 변경은 git push만으로 설치본에 반영 안 됨 — marketplace update + version bump 필요
type: project
created: 2026-08-12
---

Claude Code 플러그인을 고쳐 GitHub에 푸시해도 **이미 설치한 사용자에게는 반영되지 않는다.**
마켓플레이스는 클론 캐시를 쓰기 때문이다.

반영 절차:
1. `plugin.json`과 `marketplace.json`의 `version`을 **둘 다** 올린다 (한쪽만 올리면 어긋난다)
2. push
3. `claude plugin marketplace update <marketplace-name>` — GitHub를 다시 클론해 캐시 갱신
4. 사용자는 `/plugin update <plugin>@<marketplace>` 후 `/reload-plugins` 또는 재시작

검증은 `claude plugin details <plugin>`으로 버전과 컴포넌트 인벤토리를 확인한다.
2026-08-12 v1.0.0 → v1.1.0(커맨드 `k-` 접두사) 전환에서 이 흐름으로 확인했다.

**Why:** 버전을 안 올리면 사용자가 업데이트 필요성을 알 수 없고, 캐시 때문에 갱신도 안 된다.
커맨드 이름 변경처럼 breaking change면 특히 버전이 유일한 신호다.

**How to apply:**
- 커맨드 추가·삭제·rename, 스킬 변경, `.mcp.json` URL 변경 → minor 이상 bump
- 문서 오타 수정 등 동작 무관 변경 → bump 생략 가능
- 관련: [[plugin-always-on-token-budget]]
