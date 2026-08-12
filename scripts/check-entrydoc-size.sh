#!/bin/sh
# 진입 문서 크기 게이트 — "map, not handbook" (~100줄, 상한 120줄)
# 경고 전용(exit 0): 기존 초과 repo의 빌드를 깨지 않으면서 매 실행마다 눈에 띄게 한다.
# 출처: /sh:harness-setup Phase 3 검증 스크립트 스펙
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LIMIT=120
for f in AGENTS.md agent.md; do
  [ -f "$ROOT/$f" ] || continue
  n=$(wc -l < "$ROOT/$f" | tr -d ' ')
  if [ "$n" -gt "$LIMIT" ]; then
    printf 'verify-docs: [WARN] %s %s줄 — 상한 %s줄 초과. 상세는 docs/ 하위로 분리할 것 (map, not handbook)\n' "$f" "$n" "$LIMIT"
  else
    printf 'verify-docs: [OK] %s %s줄 (상한 %s)\n' "$f" "$n" "$LIMIT"
  fi
  break
done
exit 0
