# Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `LAW_API_OC` | **Yes** | law.go.kr API 인증코드 |
| `DART_API_KEY` | No | DART 전자공시 API key |
| `DATA20_SERVICE_KEY` | No | 공공데이터포털 service key |
| `UNIPASS_KEY_API*` | No | 관세청 UNI-PASS API 인증키 (API번호별 개별 키) |
| `MAFRA_API_KEY` | No | 농림축산식품부 API key |
| `EXCHANGE_RATE_API_KEY` | No | 수출입은행 환율 API key |
| `FINLIFE_API_KEY` | No | 금융감독원 금융상품 비교공시 API key |
| `YOUTUBE_API_KEY` | No | YouTube Data API v3 key (없으면 자막만 사용 가능) |
| `YOUTUBE_COOKIES_FROM_BROWSER` | No | 자막 봇 차단 우회 — 로컬 브라우저 (`chrome`/`firefox`/`safari`/`brave`/`edge`/`chromium`). 로컬 stdio용 |
| `YOUTUBE_COOKIES` | No | 자막 봇 차단 우회 — Netscape cookies.txt 텍스트. Railway 서버 배포용. `YOUTUBE_COOKIES_FROM_BROWSER` 설정 시 무시 |
| `COURTLISTENER_API_TOKEN` | No | CourtListener API 토큰 (미국 판례, 시간당 5,000건) |
| `OPENLEGALDATA_API_TOKEN` | No | OpenLegalData 토큰 (독일 판례, 익명 접근 가능) |
| `FOREIGN_CASE_ENABLED` | No | `true` 설정 시 토큰 없이도 독일 판례 활성화 |
| `COUPANG_ACCESS_KEY` | No | 쿠팡 파트너스 Access Key |
| `COUPANG_SECRET_KEY` | No | 쿠팡 파트너스 Secret Key |
| `ASSEMBLY_API_KEY` | No | 국회 Open API key (open.assembly.go.kr) — 의안/법률안/표결/국회의원 조회 |
| `PORT` | No | HTTP server port (default: 3000) |
