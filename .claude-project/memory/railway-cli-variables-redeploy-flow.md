---
name: railway-cli-variables-redeploy-flow
description: Railway CLI — --skip-deploys로 환경변수 설정 + 명시적 redeploy 분리
type: reference
created: 2026-04-28
---

Railway CLI 환경변수 워크플로:

```bash
# 1) 환경변수만 추가 (자동 재배포 차단)
railway variables --set "KEY=VALUE" --skip-deploys

# 2) 검토 후 명시적으로 재배포
railway redeploy

# 3) 검증
railway status --json | jq '.environments.edges[0].node.serviceInstances.edges[0].node.latestDeployment.status'
railway variables --kv | grep -E '^(KEY1|KEY2)='
```

- `--skip-deploys` 없이 set하면 변수 하나마다 즉시 새 배포 트리거 → 다중 변수 변경 시 빌드 폭주
- 라이브 도메인은 `RAILWAY_PUBLIC_DOMAIN` 환경변수로 노출 (헬스체크/외부 호출에 사용)
- 변수당 32 KB 리밋(`railway-env-var-32kb-limit` 메모 참고)

**Why:** 여러 키를 한 번에 추가할 때 매번 재배포되어 시간/쿼터 낭비. 또 검토 없이 prod 갱신 위험.
**How to apply:** 새 도메인 키 추가(예: 외국 판례 토큰들) 시 `--skip-deploys`로 모두 set한 뒤 한 번에 redeploy.
