---
name: railway-cli-scale-syntax
description: Railway CLI 리전 변경 명령어 정확한 문법
type: reference
created: 2026-04-26
---

리전 스케일링은 `railway scale` 명령으로 (service 키워드 없이):

```bash
# Amsterdam으로 이동, US East에서 제거
railway scale --europe-west4-drams3a 1 --us-east4-eqdc4a 0
```

플래그명은 `--{region-id}` 형식이고, CLI v4.35.0 기준 사용 가능한 region:
- `--europe-west4-drams3a` (Amsterdam)
- `--us-west2` (California)
- `--asia-southeast1-eqsg3a` (Singapore)
- `--us-east4-eqdc4a` (Virginia)

**Why:** `railway service scale`은 인터랙티브 모드만 지원하고 CLI 인자가 안 통함. `railway scale`이 진짜 명령. 헬프에 잘 안 보여서 헷갈리기 쉬움.

**How to apply:** Railway 리전 자동화/스크립트 작성 시 `railway scale --help`로 사용 가능한 리전 플래그 확인 후 명시.
