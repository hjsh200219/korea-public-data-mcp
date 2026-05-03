/**
 * MCP Prompts — 워크플로 가이드
 * LLM이 복합 조회 시나리오를 step-by-step으로 수행하도록 안내
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function registerSkillPrompts(server: McpServer): void {
  server.prompt(
    "수입통관_워크플로",
    "B/L 기반 수입통관 전체 확인 가이드",
    { bl_number: z.string().describe("B/L 번호") },
    async ({ bl_number }) => ({
      messages: [{
        role: "user",
        content: {
          type: "text",
          text: [
            `B/L ${bl_number} 수입통관 확인 절차:`,
            "",
            "1. import_clearance(action: \"track_cargo\", bl_number) → 화물통관 진행상태 확인",
            "2. import_clearance(action: \"get_containers\", bl_number) → 컨테이너 내역 조회",
            "3. import_clearance(action: \"get_arrival_report\", bl_number) → 입항보고 내역",
            "4. import_clearance(action: \"get_inspection\", bl_number) → 검사검역 결과",
            "5. 수입신고번호 확인 후 → import_clearance(action: \"verify_declaration\", declaration_no)",
            "6. import_clearance(action: \"get_tax_payment\", declaration_no) → 제세 납부 여부",
            "",
            "각 단계 결과에 따라 다음 단계를 진행하세요.",
          ].join("\n"),
        },
      }],
    }),
  );

  server.prompt(
    "기업분석_워크플로",
    "기업명으로 DART 기업 분석 가이드",
    { corp_name: z.string().describe("회사명") },
    async ({ corp_name }) => ({
      messages: [{
        role: "user",
        content: {
          type: "text",
          text: [
            `"${corp_name}" 기업 분석 절차:`,
            "",
            "1. corporate_disclosure(action: \"resolve_corp_code\", corp_name) → 고유번호 확인",
            "2. corporate_disclosure(action: \"get_company_info\", corp_code) → 기업개황",
            "3. corporate_disclosure(action: \"get_key_accounts\", corp_code, bsns_year, reprt_code: \"11011\") → 주요 재무지표",
            "4. corporate_disclosure(action: \"search_disclosures\", corp_code) → 최근 공시 목록",
            "5. corporate_disclosure(action: \"search_stock_dividend\", stckIssuCmpyNm) → 배당정보 (선택)",
            "",
            "필요 시 get_financial_statements로 전체 재무제표를 조회하세요.",
          ].join("\n"),
        },
      }],
    }),
  );

  server.prompt(
    "법령리서치_워크플로",
    "키워드 기반 법령 종합 리서치 가이드",
    { keyword: z.string().describe("법령 관련 검색 키워드") },
    async ({ keyword }) => ({
      messages: [{
        role: "user",
        content: {
          type: "text",
          text: [
            `"${keyword}" 법령 종합 리서치 절차:`,
            "",
            "1. legal_research(action: \"search_laws\", query) → 관련 법령 검색",
            "2. legal_research(action: \"get_law_detail\", law_id) → 법령 조문 확인",
            "3. case_research(action: \"search_cases\", query) → 관련 판례 검색",
            "4. case_research(action: \"search_interpretations\", query) → 법령해석례 확인",
            "5. law_amendment(action: \"search_law_system\", query) → 상하위법 체계도 확인",
            "6. law_amendment(action: \"search_three_way_comp\", query) → 3단비교 (법률·시행령·시행규칙)",
            "",
            "각 단계에서 발견된 법령 ID를 사용하여 상세 조회를 진행하세요.",
          ].join("\n"),
        },
      }],
    }),
  );

  server.prompt(
    "HS코드_관세_워크플로",
    "HS 코드 기반 관세율·환율 종합 조회 가이드",
    { hs_code: z.string().describe("HS 부호") },
    async ({ hs_code }) => ({
      messages: [{
        role: "user",
        content: {
          type: "text",
          text: [
            `HS코드 "${hs_code}" 관세 종합 조회 절차:`,
            "",
            "1. tariff_lookup(action: \"search_hs\", hs_code) → HS코드 검색·분류 확인",
            "2. tariff_lookup(action: \"tariff_rate\", hs_code) → 기본 관세율 조회 (10자리 필요)",
            "3. tariff_lookup(action: \"customs_rate\") → 현재 적용 관세환율",
            "4. tariff_lookup(action: \"market_exchange\") → 시장 환율 (수출입은행)",
            "5. tariff_lookup(action: \"hs_navigation\", hs_code) → 관련 품목 내비게이션",
            "6. import_clearance(action: \"customs_check\", hs_code, imex_type) → 세관장확인 대상 여부",
            "",
            "간이정액 환급율이 필요하면 tariff_lookup(action: \"simple_drawback\")을 추가로 조회하세요.",
          ].join("\n"),
        },
      }],
    }),
  );

  server.prompt(
    "수출통관_워크플로",
    "수출신고번호 기반 수출통관 확인 가이드",
    { export_decl_no: z.string().describe("수출신고번호") },
    async ({ export_decl_no }) => ({
      messages: [{
        role: "user",
        content: {
          type: "text",
          text: [
            `수출신고번호 "${export_decl_no}" 수출통관 확인 절차:`,
            "",
            "1. export_clearance(action: \"export_performance\", export_declaration_no) → 수출이행 내역",
            "2. export_clearance(action: \"loading_inspection\", export_decl_no) → 적재지 검사 대상 여부",
            "3. shipping_logistics(action: \"sea_departure\") 또는 shipping_logistics(action: \"air_departure\") → 출항허가 확인",
            "",
            "수출신고필증 검증이 필요하면 export_clearance(action: \"verify_export\")를 사용하세요.",
          ].join("\n"),
        },
      }],
    }),
  );

  server.prompt(
    "제품리뷰_워크플로",
    "제품명으로 유튜브 리뷰 + 쿠팡 구매 링크 통합 조회 가이드",
    { product: z.string().describe("검색할 제품명 (예: '무선 마우스', '에어팟')") },
    async ({ product }) => ({
      messages: [{
        role: "user",
        content: {
          type: "text",
          text: [
            `"${product}" 제품 리뷰 조회 절차:`,
            "",
            "1. product_review(action: \"full_review\", query: \"${product}\") 를 **먼저** 호출하세요.",
            "   → 유튜브 리뷰 자막 + 쿠팡 구매 링크를 한 번에 가져옵니다.",
            "2. 반환된 자막을 바탕으로 장단점을 항목별로 요약하세요.",
            "3. 쿠팡 상품 링크를 함께 노출하세요 (파트너스 고지 포함).",
            "",
            "주의사항:",
            "- youtube 스킬의 search action이 아닌 product_review 스킬을 사용하세요.",
            "- 찾은 영상은 전부 요약하세요. 임의로 줄이지 마세요.",
            "- 영상을 못 찾으면 product_review(action: \"coupang_search\", query) 로 쿠팡만 조회하세요.",
          ].join("\n"),
        },
      }],
    }),
  );

  server.prompt(
    "해외판례_비교법_워크플로",
    "한국 판례를 기반으로 미국(CourtListener) 해외 판례를 비교법 참조하는 가이드",
    { keyword: z.string().describe("쟁점 키워드 (예: '표현의 자유', '평등권', '데이터 보호')") },
    async ({ keyword }) => ({
      messages: [{
        role: "user",
        content: {
          type: "text",
          text: [
            `"${keyword}" 비교법 리서치 절차 (한국 ↔ 미국):`,
            "",
            "1. case_research(action: \"search_cases\", query: \"${keyword}\") → 한국 판례 검색",
            "2. case_research(action: \"get_case_detail\", case_id) → 한국 판례 본문에서 핵심 쟁점·영문 키워드 추출",
            "3. foreign_case_research(action: \"search_us_cases\", query: \"<영문 키워드>\", jurisdiction: \"us-scotus\") → 미국 연방대법원 판례 검색 (cursor 페이지네이션)",
            "4. foreign_case_research(action: \"get_us_case_detail\", opinion_id) → 미국 판례 본문 (truncate 적용; offset 으로 후속 윈도우 조회)",
            "5. 한국 판결요지 + 미국 holding 을 인용 표기와 함께 비교 정리",
            "",
            "주의: 해외 판례는 비교법 참조용입니다. 법적 효력은 한국 판례에 따릅니다.",
            "독일 판례(OpenLegalData)도 비교법 참조 가능: foreign_case_research(action: \"search_de_cases\", query: \"<독일어 키워드>\").",
          ].join("\n"),
        },
      }],
    }),
  );
}
