---
name: korservice2-data20-key-reuse
description: 한국관광공사 KorService2 API는 DATA20_SERVICE_KEY를 그대로 재사용 (별도 환경변수 불필요)
type: reference
created: 2026-04-30
---

KorService2 API (https://apis.data.go.kr/B551011/KorService2)는 공공데이터포털(data.go.kr)
서비스 키 인증 체계를 따르므로, `DATA20_SERVICE_KEY` 하나로 관광 API도 커버된다.
새 환경변수를 추가하지 않고 config.ts의 `data20ServiceKey` 필드를 재사용하면 된다.

**Why:** 공공데이터포털 산하 API는 동일한 서비스키를 공유하므로 키 관리 오버헤드를 줄일 수 있다.
**How to apply:** 신규 공공데이터포털 API 통합 시, 별도 환경변수 추가 전 `DATA20_SERVICE_KEY`로
먼저 시도한다. 새 도메인 API client에서 `config.data20ServiceKey`를 그대로 주입하면 된다.
