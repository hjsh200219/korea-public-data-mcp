/**
 * Skill: corporate_disclosure — 기업 공시 통합 조회
 * DART 6개 도구 + 공공데이터포털 주식배당 1개 = 7 actions
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  resolveCorpCode,
  searchDisclosures,
  getCompanyInfo,
  getFinancialStatements,
  getKeyAccounts,
  getDisclosureDocument,
} from "../../dart-api.js";
import { searchStockDividend } from "../../data20-api.js";
import { errorResponse, truncate } from "../../shared.js";
import { createDispatcher, requireParam, type SkillResult } from "./_shared.js";

const ACTIONS = [
  "resolve_corp_code",
  "search_disclosures",
  "get_company_info",
  "get_financial_statements",
  "get_document",
  "get_key_accounts",
  "search_stock_dividend",
] as const;

type CorporateDisclosureParams = {
  action: string;
  corp_name?: string;
  corp_code?: string;
  bgn_de?: string;
  end_de?: string;
  pblntf_ty?: string;
  page_no?: number;
  page_count?: number;
  bsns_year?: string;
  reprt_code?: string;
  fs_div?: "OFS" | "CFS";
  rcept_no?: string;
  stckIssuCmpyNm?: string;
  basDt?: string;
  crno?: string;
  pageNo?: number;
  numOfRows?: number;
};

function dartKeyGuard(dartApiKey?: string): SkillResult | null {
  if (!dartApiKey) {
    return {
      content: [{ type: "text", text: "DART_API_KEY가 설정되지 않았습니다" }],
      isError: true,
    };
  }
  return null;
}

function data20KeyGuard(data20ServiceKey?: string): SkillResult | null {
  if (!data20ServiceKey) {
    return {
      content: [{ type: "text", text: "DATA20_SERVICE_KEY가 설정되지 않았습니다" }],
      isError: true,
    };
  }
  return null;
}

// --- 포맷 헬퍼 (dart-tools.ts에서 복사) ---

function formatCorpCls(cls: string): string {
  const map: Record<string, string> = { Y: "유가증권", K: "코스닥", N: "코넥스", E: "기타" };
  return map[cls] || cls;
}

function formatAmount(val: string): string {
  if (!val || val === "-" || val.trim() === "") return "-";
  const num = Number(val.replace(/,/g, ""));
  if (isNaN(num)) return val;
  return num.toLocaleString("ko-KR") + "원";
}

function formatFinancialLine(item: { account_nm: string; thstrm_amount: string; frmtrm_amount: string; bfefrmtrm_amount: string; account_detail: string }): string {
  const detail = item.account_detail && item.account_detail !== "-" ? ` (${item.account_detail})` : "";
  return `  ${item.account_nm}${detail}: ${formatAmount(item.thstrm_amount)} (전기: ${formatAmount(item.frmtrm_amount)}, 전전기: ${formatAmount(item.bfefrmtrm_amount)})`;
}

function groupBySjNm(items: Array<{ sjNm: string; line: string }>): string {
  const sections = new Map<string, string[]>();
  for (const { sjNm, line } of items) {
    const arr = sections.get(sjNm) || [];
    arr.push(line);
    sections.set(sjNm, arr);
  }
  const parts: string[] = [];
  for (const [name, lines] of sections) {
    parts.push(`[${name}]\n${lines.join("\n")}`);
  }
  return parts.join("\n\n");
}

function s(val: unknown): string {
  if (val === null || val === undefined) return "-";
  const str = String(val).trim();
  return str || "-";
}

function handleResolveCorpCode(dartApiKey?: string) {
  return async (p: CorporateDisclosureParams): Promise<SkillResult> => {
    const keyErr = dartKeyGuard(dartApiKey);
    if (keyErr) return keyErr;
    const paramErr = requireParam(p as Record<string, unknown>, "corp_name", "resolve_corp_code");
    if (paramErr) return paramErr;
    try {
      const results = await resolveCorpCode(dartApiKey!, p.corp_name!);
      if (results.length === 0) {
        return {
          content: [{
            type: "text",
            text: `"${p.corp_name}"에 대한 검색 결과가 없습니다. 정확한 기업명을 확인해주세요.`,
          }],
        };
      }
      const lines = results.map((r) =>
        `• ${r.corpName} — 고유번호: ${r.corpCode}${r.stockCode ? ` (종목코드: ${r.stockCode})` : ""}`,
      );
      return {
        content: [{
          type: "text",
          text: `"${p.corp_name}" 검색 결과 (${results.length}건):\n\n${lines.join("\n")}`,
        }],
      };
    } catch (error) {
      return errorResponse("DART 기업코드 검색", error);
    }
  };
}

function handleSearchDisclosures(dartApiKey?: string) {
  return async (p: CorporateDisclosureParams): Promise<SkillResult> => {
    const keyErr = dartKeyGuard(dartApiKey);
    if (keyErr) return keyErr;
    try {
      const result = await searchDisclosures(dartApiKey!, {
        corp_code: p.corp_code,
        bgn_de: p.bgn_de,
        end_de: p.end_de,
        pblntf_ty: p.pblntf_ty,
        page_no: p.page_no,
        page_count: p.page_count,
      });
      if (!result.list || result.list.length === 0) {
        return { content: [{ type: "text", text: "해당 조건의 공시보고서가 없습니다." }] };
      }
      const header = `공시보고서 검색결과 — 총 ${result.total_count}건 (${result.page_no}/${result.total_page} 페이지)\n`;
      const items = result.list.map((d) =>
        `• [${d.rcept_dt}] ${d.corp_name} — ${d.report_nm}\n  접수번호: ${d.rcept_no} | 제출인: ${d.flr_nm}${d.rm ? ` | 비고: ${d.rm}` : ""}`,
      );
      return { content: [{ type: "text", text: header + "\n" + items.join("\n\n") }] };
    } catch (error) {
      return errorResponse("DART 공시검색", error);
    }
  };
}

function handleGetCompanyInfo(dartApiKey?: string) {
  return async (p: CorporateDisclosureParams): Promise<SkillResult> => {
    const keyErr = dartKeyGuard(dartApiKey);
    if (keyErr) return keyErr;
    const paramErr = requireParam(p as Record<string, unknown>, "corp_code", "get_company_info");
    if (paramErr) return paramErr;
    try {
      const info = await getCompanyInfo(dartApiKey!, p.corp_code!);
      const lines = [
        `기업명: ${info.corp_name} (${info.corp_name_eng})`,
        `종목명: ${info.stock_name || "-"}`,
        `종목코드: ${info.stock_code || "-"}`,
        `대표자: ${info.ceo_nm}`,
        `법인구분: ${formatCorpCls(info.corp_cls)}`,
        `법인등록번호: ${info.jurir_no}`,
        `사업자등록번호: ${info.bizr_no}`,
        `주소: ${info.adres}`,
        `홈페이지: ${info.hm_url || "-"}`,
        `전화번호: ${info.phn_no || "-"}`,
        `업종코드: ${info.induty_code}`,
        `설립일: ${info.est_dt}`,
        `결산월: ${info.acc_mt}월`,
      ];
      return { content: [{ type: "text", text: lines.join("\n") }] };
    } catch (error) {
      return errorResponse("DART 기업개황", error);
    }
  };
}

function handleGetFinancialStatements(dartApiKey?: string) {
  return async (p: CorporateDisclosureParams): Promise<SkillResult> => {
    const keyErr = dartKeyGuard(dartApiKey);
    if (keyErr) return keyErr;
    const err1 = requireParam(p as Record<string, unknown>, "corp_code", "get_financial_statements");
    if (err1) return err1;
    const err2 = requireParam(p as Record<string, unknown>, "bsns_year", "get_financial_statements");
    if (err2) return err2;
    const err3 = requireParam(p as Record<string, unknown>, "reprt_code", "get_financial_statements");
    if (err3) return err3;
    try {
      const result = await getFinancialStatements(dartApiKey!, {
        corp_code: p.corp_code!,
        bsns_year: p.bsns_year!,
        reprt_code: p.reprt_code!,
        fs_div: p.fs_div,
      });
      if (!result.list || result.list.length === 0) {
        return { content: [{ type: "text", text: "해당 조건의 재무제표 데이터가 없습니다." }] };
      }
      const grouped = groupBySjNm(result.list.map((item) => ({
        sjNm: item.sj_nm,
        line: formatFinancialLine(item),
      })));
      return {
        content: [{ type: "text", text: `${p.bsns_year}년 재무제표 (${p.fs_div || "CFS"})\n\n${grouped}` }],
      };
    } catch (error) {
      return errorResponse("DART 재무제표", error);
    }
  };
}

function handleGetDocument(dartApiKey?: string) {
  return async (p: CorporateDisclosureParams): Promise<SkillResult> => {
    const keyErr = dartKeyGuard(dartApiKey);
    if (keyErr) return keyErr;
    const paramErr = requireParam(p as Record<string, unknown>, "rcept_no", "get_document");
    if (paramErr) return paramErr;
    try {
      const result = await getDisclosureDocument(dartApiKey!, p.rcept_no!);
      const header = `## 공시서류 본문 (접수번호: ${p.rcept_no})\n\n` +
        `포함 파일: ${result.files.map((f) => f.filename).join(", ")}\n` +
        `---\n\n`;
      return { content: [{ type: "text", text: truncate(header + result.summary) }] };
    } catch (error) {
      return errorResponse("DART 공시서류 조회", error);
    }
  };
}

function handleGetKeyAccounts(dartApiKey?: string) {
  return async (p: CorporateDisclosureParams): Promise<SkillResult> => {
    const keyErr = dartKeyGuard(dartApiKey);
    if (keyErr) return keyErr;
    const err1 = requireParam(p as Record<string, unknown>, "corp_code", "get_key_accounts");
    if (err1) return err1;
    const err2 = requireParam(p as Record<string, unknown>, "bsns_year", "get_key_accounts");
    if (err2) return err2;
    const err3 = requireParam(p as Record<string, unknown>, "reprt_code", "get_key_accounts");
    if (err3) return err3;
    try {
      const result = await getKeyAccounts(dartApiKey!, {
        corp_code: p.corp_code!,
        bsns_year: p.bsns_year!,
        reprt_code: p.reprt_code!,
      });
      if (!result.list || result.list.length === 0) {
        return { content: [{ type: "text", text: "해당 조건의 주요계정 데이터가 없습니다." }] };
      }
      const grouped = groupBySjNm(result.list.map((item) => ({
        sjNm: item.sj_nm,
        line: `  ${item.account_nm}: ${formatAmount(item.thstrm_amount)} (전기: ${formatAmount(item.frmtrm_amount)}, 전전기: ${formatAmount(item.bfefrmtrm_amount)})`,
      })));
      return {
        content: [{ type: "text", text: `${p.bsns_year}년 주요계정\n\n${grouped}` }],
      };
    } catch (error) {
      return errorResponse("DART 주요계정", error);
    }
  };
}

function handleSearchStockDividend(data20ServiceKey?: string) {
  return async (p: CorporateDisclosureParams): Promise<SkillResult> => {
    const keyErr = data20KeyGuard(data20ServiceKey);
    if (keyErr) return keyErr;
    try {
      const result = await searchStockDividend(data20ServiceKey!, {
        stckIssuCmpyNm: p.stckIssuCmpyNm,
        basDt: p.basDt,
        crno: p.crno,
        pageNo: p.pageNo,
        numOfRows: p.numOfRows,
      });
      if (result.items.length === 0) {
        return { content: [{ type: "text", text: "검색 결과가 없습니다." }] };
      }
      const header = `주식배당정보 — 총 ${result.totalCount}건 (${result.pageNo}페이지)\n`;
      const lines = result.items.map((d) =>
        `• ${s(d.stckIssuCmpyNm)} (배당기준일: ${s(d.dvdnBasDt)})\n  배당종류: ${s(d.stckDvdnRcdNm)}\n  액면가: ${s(d.stckParPrc)}\n  보통주배당금: ${s(d.stckGenrDvdnAmt)}\n  현금배당률: ${s(d.stckGenrCashDvdnRt)}%\n  지급일: ${s(d.cashDvdnPayDt)}`,
      );
      return { content: [{ type: "text", text: truncate(header + "\n" + lines.join("\n\n")) }] };
    } catch (error) {
      return errorResponse("주식배당정보 조회", error);
    }
  };
}

export function createCorporateDisclosureHandler(
  dartApiKey?: string,
  data20ServiceKey?: string,
) {
  return createDispatcher<CorporateDisclosureParams>("corporate_disclosure", {
    resolve_corp_code: handleResolveCorpCode(dartApiKey),
    search_disclosures: handleSearchDisclosures(dartApiKey),
    get_company_info: handleGetCompanyInfo(dartApiKey),
    get_financial_statements: handleGetFinancialStatements(dartApiKey),
    get_document: handleGetDocument(dartApiKey),
    get_key_accounts: handleGetKeyAccounts(dartApiKey),
    search_stock_dividend: handleSearchStockDividend(data20ServiceKey),
  });
}

export function registerCorporateDisclosure(
  server: McpServer,
  dartApiKey?: string,
  data20ServiceKey?: string,
): void {
  const handler = createCorporateDisclosureHandler(dartApiKey, data20ServiceKey);

  server.tool(
    "corporate_disclosure",
    "기업 공시 — DART 기업 검색, 공시보고서, 기업개황, 재무제표, 주요계정, 공시서류 본문, 주식배당정보 조회 통합 도구",
    {
      action: z.enum(ACTIONS).describe(
        "resolve_corp_code=회사명→고유번호변환 | search_disclosures=공시검색(corp_code필수) | get_company_info=기업개황(corp_code필수) | get_financial_statements=재무제표(corp_code+year필수) | get_document=공시원문(receipt_no필수) | get_key_accounts=주요계정(corp_code+year필수) | search_stock_dividend=배당정보검색(corp_name필수)",
      ),
      corp_name: z.string().optional().describe("회사명 (resolve_corp_code)"),
      corp_code: z.string().optional().describe("DART 고유번호 8자리"),
      bgn_de: z.string().optional().describe("검색 시작일 YYYYMMDD"),
      end_de: z.string().optional().describe("검색 종료일 YYYYMMDD"),
      pblntf_ty: z.enum(["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"]).optional().describe("공시유형"),
      page_no: z.number().optional(),
      page_count: z.number().optional(),
      bsns_year: z.string().optional().describe("사업연도 YYYY"),
      reprt_code: z.enum(["11013", "11012", "11014", "11011"]).optional().describe("보고서코드"),
      fs_div: z.enum(["OFS", "CFS"]).optional().describe("재무제표구분"),
      rcept_no: z.string().optional().describe("접수번호 14자리"),
      stckIssuCmpyNm: z.string().optional().describe("회사명 (search_stock_dividend)"),
      basDt: z.string().optional().describe("기준일자 YYYYMMDD (search_stock_dividend)"),
      crno: z.string().optional().describe("법인등록번호 (search_stock_dividend)"),
      pageNo: z.number().optional(),
      numOfRows: z.number().optional(),
    },
    async (params) => handler(params as CorporateDisclosureParams),
  );
}
