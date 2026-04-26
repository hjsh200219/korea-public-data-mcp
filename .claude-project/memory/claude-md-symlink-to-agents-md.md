---
name: claude-md-symlink-to-agents-md
description: 이 레포의 CLAUDE.md는 AGENTS.md로 향하는 심볼릭 링크
type: reference
created: 2026-04-27
---

레포 루트의 `CLAUDE.md`는 실제 파일이 아니라 `AGENTS.md`로 향하는 **심볼릭 링크**이다.

```
$ ls -la CLAUDE.md AGENTS.md
lrwxr-xr-x  CLAUDE.md -> AGENTS.md
-rw-r--r--  AGENTS.md
```

**Why:** Claude Code(`CLAUDE.md` 컨벤션)와 AGENTS.md 표준을 동시에 지원하기 위한 구성. 두 파일을 따로 유지하면 동기화 오류가 생기므로 SSOT는 `AGENTS.md`이고 `CLAUDE.md`는 링크.

**How to apply:**
- 컨텍스트 갱신은 **AGENTS.md만 편집**하면 된다 — CLAUDE.md 별도 편집 불필요
- Edit 도구로 CLAUDE.md를 수정해도 실제로는 AGENTS.md가 수정된다(파일시스템 레벨)
- 두 파일을 모두 git add 하지 말 것 — 심링크가 깨질 수 있음
- 신규 클론 후 심링크가 사라졌다면 `ln -sf AGENTS.md CLAUDE.md`로 복원
