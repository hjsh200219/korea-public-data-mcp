---
name: master-direct-push-railway-autodeploy
description: 이 레포는 PR 없이 master 직접 push, GitHub→Railway 자동 배포
type: project
created: 2026-04-27
---

`korea-public-data-mcp` 레포 운영 패턴:
- PR 워크플로 없음. 모든 변경이 master에 직접 commit·push.
- GitHub `master` push → Railway가 webhook으로 자동 빌드·배포 (`railway.json`/`railway.toml` 없음, GitHub 연동 기본 동작).
- CI 게이트 없음 — push 전에 로컬에서 `npm run lint && npm run typecheck && npm test && npm run build`를 직접 통과시켜야 함.

**Why:** 1인 개발 + 프로덕션 트래픽 적은 MCP 서버. 빠른 피드백 루프 우선. `git log`상 최근 커밋(`655aa5e`, `99850ff`, `4446c0c` 등) 모두 master 직접.

**How to apply:**
- 작업 브랜치 만들지 말고 master에 커밋·푸시.
- 푸시 후 `railway status --json`으로 latestDeployment commitHash 확인 → `/health`로 새 컨테이너 startedAt 확인.
- Claude Code 환경에서는 master 직접 push가 권한 가드에 막힘 — 사용자에게 명시 승인을 받아야 함.
- 큰 리팩터링/스키마 변경처럼 롤백이 어려운 작업은 예외적으로 브랜치 + PR 고려.
