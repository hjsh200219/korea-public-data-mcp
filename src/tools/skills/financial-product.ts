/**
 * Skill: financial_product — 금융감독원 금융상품 통합 비교공시
 *
 * 7개 금융감독원 금융상품 비교공시 API를 단일 스킬로 제공:
 *   - company            금융회사 조회
 *   - deposit            정기예금
 *   - saving             적금
 *   - annuity            연금저축
 *   - mortgage_loan      주택담보대출
 *   - rent_house_loan    전세자금대출
 *   - credit_loan        개인신용대출
 *
 * 공통 파라미터: top_fin_grp_no (필수, 권역코드), page_no (선택)
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  fetchCompanies,
  fetchDepositProducts,
  fetchSavingProducts,
  fetchAnnuityProducts,
  fetchMortgageLoanProducts,
  fetchRentHouseLoanProducts,
  fetchCreditLoanProducts,
} from "../../finlife-api.js";
import {
  TOP_FIN_GRP_LABELS,
  type TopFinGrpNo,
  type FinlifeSearchParams,
  type FinlifeDepositBase,
  type FinlifeDepositOption,
  type FinlifeSavingOption,
  type FinlifeAnnuityBase,
  type FinlifeAnnuityOption,
  type FinlifeMortgageBase,
  type FinlifeMortgageOption,
  type FinlifeRentLoanBase,
  type FinlifeRentLoanOption,
  type FinlifeCreditLoanBase,
  type FinlifeCreditLoanOption,
} from "../../finlife-types.js";
import { errorResponse, truncate } from "../../shared.js";
import {
  createDispatcher,
  emptyResultMessage,
  registerSkillTool,
  type SkillResult,
} from "./_shared.js";

const ACTIONS = [
  "company",
  "deposit",
  "saving",
  "annuity",
  "mortgage_loan",
  "rent_house_loan",
  "credit_loan",
] as const;

type FinancialParams = {
  action: string;
  top_fin_grp_no?: TopFinGrpNo;
  page_no?: number;
  fin_co_no?: string;
};

// ---------------------------------------------------------------------------
// 공통 유틸
// ---------------------------------------------------------------------------

function requireTopFinGrpNo(p: FinancialParams, action: string): SkillResult | null {
  if (!p.top_fin_grp_no) {
    return {
      content: [{
        type: "text",
        text: `"${action}" action에는 "top_fin_grp_no" 파라미터가 필요합니다. (020000=은행, 030200=여신전문, 030300=저축은행, 050000=보험, 060000=금융투자)`,
      }],
      isError: true,
    };
  }
  return null;
}

function toParams(p: FinancialParams): FinlifeSearchParams {
  return {
    topFinGrpNo: p.top_fin_grp_no!,
    pageNo: p.page_no,
    finCoNo: p.fin_co_no,
  };
}

function fmtPageFooter(now: number, max: number, total: number): string {
  return `\n\n_총 ${total}건 / 페이지 ${now}/${max}_`;
}

function grpLabel(grp: TopFinGrpNo): string {
  return `${TOP_FIN_GRP_LABELS[grp]} (${grp})`;
}

function pct(v: number | null): string {
  return v == null ? "-" : `${v}%`;
}

// ---------------------------------------------------------------------------
// 옵션 행 병합: baseList + optionList 를 상품 코드별로 그룹핑
// ---------------------------------------------------------------------------

function groupOptions<B extends { fin_prdt_cd: string; fin_co_no: string }, O extends { fin_prdt_cd: string; fin_co_no: string }>(
  baseList: B[],
  optionList: O[],
): Array<{ base: B; options: O[] }> {
  const grouped = new Map<string, { base: B; options: O[] }>();
  for (const base of baseList) {
    const key = `${base.fin_co_no}:${base.fin_prdt_cd}`;
    grouped.set(key, { base, options: [] });
  }
  for (const opt of optionList) {
    const key = `${opt.fin_co_no}:${opt.fin_prdt_cd}`;
    const entry = grouped.get(key);
    if (entry) entry.options.push(opt);
  }
  return Array.from(grouped.values());
}

// ---------------------------------------------------------------------------
// 1. 금융회사
// ---------------------------------------------------------------------------

function handleCompany(apiKey: string) {
  return async (p: FinancialParams): Promise<SkillResult> => {
    const err = requireTopFinGrpNo(p, "company");
    if (err) return err;
    try {
      const result = await fetchCompanies(apiKey, toParams(p));
      if (result.baseList.length === 0) {
        return emptyResultMessage("금융회사", {
          top_fin_grp_no: p.top_fin_grp_no,
          page_no: p.page_no ? String(p.page_no) : undefined,
        });
      }
      const lines = result.baseList.map((c) =>
        `- **${c.kor_co_nm}** (${c.fin_co_no}) | ☎ ${c.cal_tel || "-"} | ${c.homp_url || "-"}`,
      );
      const header = `## 금융회사 — ${grpLabel(p.top_fin_grp_no!)}`;
      const footer = fmtPageFooter(result.nowPageNo, result.maxPageNo, result.totalCount);
      return { content: [{ type: "text", text: truncate(`${header}\n\n${lines.join("\n")}${footer}`) }] };
    } catch (error) {
      return errorResponse("금융회사 조회", error);
    }
  };
}

// ---------------------------------------------------------------------------
// 2. 정기예금
// ---------------------------------------------------------------------------

function renderDepositOption(o: FinlifeDepositOption): string {
  return `  - ${o.save_trm}개월 / ${o.intr_rate_type_nm}: 기본 ${pct(o.intr_rate)} · 최고 ${pct(o.intr_rate2)}`;
}

function handleDeposit(apiKey: string) {
  return async (p: FinancialParams): Promise<SkillResult> => {
    const err = requireTopFinGrpNo(p, "deposit");
    if (err) return err;
    try {
      const result = await fetchDepositProducts(apiKey, toParams(p));
      if (result.baseList.length === 0) {
        return emptyResultMessage("정기예금", { top_fin_grp_no: p.top_fin_grp_no });
      }
      const groups = groupOptions<FinlifeDepositBase, FinlifeDepositOption>(
        result.baseList,
        result.optionList,
      );
      const blocks = groups.map(({ base, options }) => {
        const head = `### ${base.kor_co_nm} — ${base.fin_prdt_nm}`;
        const meta = `가입방법: ${base.join_way || "-"} | 가입대상: ${base.join_member || "-"}`;
        const spcl = base.spcl_cnd ? `우대조건: ${base.spcl_cnd}` : "";
        const opts = options.length > 0 ? options.map(renderDepositOption).join("\n") : "  - 옵션 없음";
        return [head, meta, spcl, opts].filter(Boolean).join("\n");
      });
      const header = `## 정기예금 — ${grpLabel(p.top_fin_grp_no!)}`;
      const footer = fmtPageFooter(result.nowPageNo, result.maxPageNo, result.totalCount);
      return { content: [{ type: "text", text: truncate(`${header}\n\n${blocks.join("\n\n")}${footer}`) }] };
    } catch (error) {
      return errorResponse("정기예금 조회", error);
    }
  };
}

// ---------------------------------------------------------------------------
// 3. 적금
// ---------------------------------------------------------------------------

function renderSavingOption(o: FinlifeSavingOption): string {
  return `  - ${o.save_trm}개월 / ${o.rsrv_type_nm} / ${o.intr_rate_type_nm}: 기본 ${pct(o.intr_rate)} · 최고 ${pct(o.intr_rate2)}`;
}

function handleSaving(apiKey: string) {
  return async (p: FinancialParams): Promise<SkillResult> => {
    const err = requireTopFinGrpNo(p, "saving");
    if (err) return err;
    try {
      const result = await fetchSavingProducts(apiKey, toParams(p));
      if (result.baseList.length === 0) {
        return emptyResultMessage("적금", { top_fin_grp_no: p.top_fin_grp_no });
      }
      const groups = groupOptions(result.baseList, result.optionList);
      const blocks = groups.map(({ base, options }) => {
        const head = `### ${base.kor_co_nm} — ${base.fin_prdt_nm}`;
        const meta = `가입방법: ${base.join_way || "-"} | 가입대상: ${base.join_member || "-"}`;
        const spcl = base.spcl_cnd ? `우대조건: ${base.spcl_cnd}` : "";
        const opts = options.length > 0 ? options.map(renderSavingOption).join("\n") : "  - 옵션 없음";
        return [head, meta, spcl, opts].filter(Boolean).join("\n");
      });
      const header = `## 적금 — ${grpLabel(p.top_fin_grp_no!)}`;
      const footer = fmtPageFooter(result.nowPageNo, result.maxPageNo, result.totalCount);
      return { content: [{ type: "text", text: truncate(`${header}\n\n${blocks.join("\n\n")}${footer}`) }] };
    } catch (error) {
      return errorResponse("적금 조회", error);
    }
  };
}

// ---------------------------------------------------------------------------
// 4. 연금저축
// ---------------------------------------------------------------------------

function renderAnnuityBase(base: FinlifeAnnuityBase): string {
  const lines = [
    `### ${base.kor_co_nm} — ${base.fin_prdt_nm}`,
    `연금종류: ${base.pnsn_kind_nm || "-"} | 상품유형: ${base.prdt_type_nm || "-"}`,
    `공시이율: ${base.dcls_rate || "-"} | 최저보증이율: ${base.guar_rate || "-"} | 평균수익률: ${pct(base.avg_prft_rate)}`,
  ];
  const btrm: string[] = [];
  if (base.btrm_prft_rate_1 != null) btrm.push(`1년 ${base.btrm_prft_rate_1}%`);
  if (base.btrm_prft_rate_2 != null) btrm.push(`2년 ${base.btrm_prft_rate_2}%`);
  if (base.btrm_prft_rate_3 != null) btrm.push(`3년 ${base.btrm_prft_rate_3}%`);
  if (btrm.length > 0) lines.push(`과거 수익률: ${btrm.join(" · ")}`);
  return lines.join("\n");
}

function renderAnnuityOption(o: FinlifeAnnuityOption): string {
  const amt = o.pnsn_recp_amt != null ? `월 ${o.pnsn_recp_amt.toLocaleString()}원` : "-";
  return `  - ${o.pnsn_entr_age_nm}세 가입 / ${o.paym_prd_nm} 납입 / ${o.pnsn_strt_age_nm}세 개시 / ${o.pnsn_recp_trm_nm} 수령: ${amt}`;
}

function handleAnnuity(apiKey: string) {
  return async (p: FinancialParams): Promise<SkillResult> => {
    const err = requireTopFinGrpNo(p, "annuity");
    if (err) return err;
    try {
      const result = await fetchAnnuityProducts(apiKey, toParams(p));
      if (result.baseList.length === 0) {
        return emptyResultMessage("연금저축", { top_fin_grp_no: p.top_fin_grp_no });
      }
      const groups = groupOptions(result.baseList, result.optionList);
      const blocks = groups.map(({ base, options }) => {
        const head = renderAnnuityBase(base);
        const opts = options.length > 0 ? options.map(renderAnnuityOption).join("\n") : "  - 옵션 없음";
        return `${head}\n${opts}`;
      });
      const header = `## 연금저축 — ${grpLabel(p.top_fin_grp_no!)}`;
      const footer = fmtPageFooter(result.nowPageNo, result.maxPageNo, result.totalCount);
      return { content: [{ type: "text", text: truncate(`${header}\n\n${blocks.join("\n\n")}${footer}`) }] };
    } catch (error) {
      return errorResponse("연금저축 조회", error);
    }
  };
}

// ---------------------------------------------------------------------------
// 5. 주택담보대출
// ---------------------------------------------------------------------------

function renderMortgageBase(base: FinlifeMortgageBase): string {
  return [
    `### ${base.kor_co_nm} — ${base.fin_prdt_nm}`,
    `가입방법: ${base.join_way || "-"} | 한도: ${base.loan_lmt || "-"}`,
    `중도상환수수료: ${base.erly_rpay_fee || "-"} | 연체이자율: ${base.dly_rate || "-"}`,
  ].join("\n");
}

function renderMortgageOption(o: FinlifeMortgageOption): string {
  return `  - ${o.mrtg_type_nm} / ${o.rpay_type_nm} / ${o.lend_rate_type_nm}: 최저 ${pct(o.lend_rate_min)} · 최고 ${pct(o.lend_rate_max)} · 평균 ${pct(o.lend_rate_avg)}`;
}

function handleMortgage(apiKey: string) {
  return async (p: FinancialParams): Promise<SkillResult> => {
    const err = requireTopFinGrpNo(p, "mortgage_loan");
    if (err) return err;
    try {
      const result = await fetchMortgageLoanProducts(apiKey, toParams(p));
      if (result.baseList.length === 0) {
        return emptyResultMessage("주택담보대출", { top_fin_grp_no: p.top_fin_grp_no });
      }
      const groups = groupOptions(result.baseList, result.optionList);
      const blocks = groups.map(({ base, options }) => {
        const head = renderMortgageBase(base);
        const opts = options.length > 0 ? options.map(renderMortgageOption).join("\n") : "  - 옵션 없음";
        return `${head}\n${opts}`;
      });
      const header = `## 주택담보대출 — ${grpLabel(p.top_fin_grp_no!)}`;
      const footer = fmtPageFooter(result.nowPageNo, result.maxPageNo, result.totalCount);
      return { content: [{ type: "text", text: truncate(`${header}\n\n${blocks.join("\n\n")}${footer}`) }] };
    } catch (error) {
      return errorResponse("주택담보대출 조회", error);
    }
  };
}

// ---------------------------------------------------------------------------
// 6. 전세자금대출
// ---------------------------------------------------------------------------

function renderRentLoanBase(base: FinlifeRentLoanBase): string {
  return [
    `### ${base.kor_co_nm} — ${base.fin_prdt_nm}`,
    `가입방법: ${base.join_way || "-"} | 한도: ${base.loan_lmt || "-"}`,
    `중도상환수수료: ${base.erly_rpay_fee || "-"} | 연체이자율: ${base.dly_rate || "-"}`,
  ].join("\n");
}

function renderRentLoanOption(o: FinlifeRentLoanOption): string {
  return `  - ${o.rpay_type_nm} / ${o.lend_rate_type_nm}: 최저 ${pct(o.lend_rate_min)} · 최고 ${pct(o.lend_rate_max)} · 평균 ${pct(o.lend_rate_avg)}`;
}

function handleRentLoan(apiKey: string) {
  return async (p: FinancialParams): Promise<SkillResult> => {
    const err = requireTopFinGrpNo(p, "rent_house_loan");
    if (err) return err;
    try {
      const result = await fetchRentHouseLoanProducts(apiKey, toParams(p));
      if (result.baseList.length === 0) {
        return emptyResultMessage("전세자금대출", { top_fin_grp_no: p.top_fin_grp_no });
      }
      const groups = groupOptions(result.baseList, result.optionList);
      const blocks = groups.map(({ base, options }) => {
        const head = renderRentLoanBase(base);
        const opts = options.length > 0 ? options.map(renderRentLoanOption).join("\n") : "  - 옵션 없음";
        return `${head}\n${opts}`;
      });
      const header = `## 전세자금대출 — ${grpLabel(p.top_fin_grp_no!)}`;
      const footer = fmtPageFooter(result.nowPageNo, result.maxPageNo, result.totalCount);
      return { content: [{ type: "text", text: truncate(`${header}\n\n${blocks.join("\n\n")}${footer}`) }] };
    } catch (error) {
      return errorResponse("전세자금대출 조회", error);
    }
  };
}

// ---------------------------------------------------------------------------
// 7. 개인신용대출
// ---------------------------------------------------------------------------

function renderCreditLoanBase(base: FinlifeCreditLoanBase): string {
  return [
    `### ${base.kor_co_nm} — ${base.fin_prdt_nm}`,
    `상품유형: ${base.crdt_prdt_type_nm || "-"} | CB사: ${base.cb_name || "-"}`,
    `가입방법: ${base.join_way || "-"}`,
  ].join("\n");
}

function renderCreditLoanOption(o: FinlifeCreditLoanOption): string {
  const grades: string[] = [];
  if (o.crdt_grad_1 != null) grades.push(`900초과 ${o.crdt_grad_1}%`);
  if (o.crdt_grad_4 != null) grades.push(`801~900 ${o.crdt_grad_4}%`);
  if (o.crdt_grad_5 != null) grades.push(`701~800 ${o.crdt_grad_5}%`);
  if (o.crdt_grad_6 != null) grades.push(`601~700 ${o.crdt_grad_6}%`);
  if (o.crdt_grad_10 != null) grades.push(`501~600 ${o.crdt_grad_10}%`);
  if (o.crdt_grad_11 != null) grades.push(`401~500 ${o.crdt_grad_11}%`);
  if (o.crdt_grad_12 != null) grades.push(`301~400 ${o.crdt_grad_12}%`);
  if (o.crdt_grad_13 != null) grades.push(`300이하 ${o.crdt_grad_13}%`);
  const gradeLine = grades.length > 0 ? `\n    · 신용점수별: ${grades.join(" / ")}` : "";
  return `  - ${o.crdt_lend_rate_type_nm}: 평균 ${pct(o.crdt_grad_avg)}${gradeLine}`;
}

function handleCreditLoan(apiKey: string) {
  return async (p: FinancialParams): Promise<SkillResult> => {
    const err = requireTopFinGrpNo(p, "credit_loan");
    if (err) return err;
    try {
      const result = await fetchCreditLoanProducts(apiKey, toParams(p));
      if (result.baseList.length === 0) {
        return emptyResultMessage("개인신용대출", { top_fin_grp_no: p.top_fin_grp_no });
      }
      const groups = groupOptions(result.baseList, result.optionList);
      const blocks = groups.map(({ base, options }) => {
        const head = renderCreditLoanBase(base);
        const opts = options.length > 0 ? options.map(renderCreditLoanOption).join("\n") : "  - 옵션 없음";
        return `${head}\n${opts}`;
      });
      const header = `## 개인신용대출 — ${grpLabel(p.top_fin_grp_no!)}`;
      const footer = fmtPageFooter(result.nowPageNo, result.maxPageNo, result.totalCount);
      return { content: [{ type: "text", text: truncate(`${header}\n\n${blocks.join("\n\n")}${footer}`) }] };
    } catch (error) {
      return errorResponse("개인신용대출 조회", error);
    }
  };
}

// ---------------------------------------------------------------------------
// 디스패처 + MCP 등록
// ---------------------------------------------------------------------------

export function createFinancialProductHandler(apiKey: string) {
  return createDispatcher<FinancialParams>("financial_product", {
    company: handleCompany(apiKey),
    deposit: handleDeposit(apiKey),
    saving: handleSaving(apiKey),
    annuity: handleAnnuity(apiKey),
    mortgage_loan: handleMortgage(apiKey),
    rent_house_loan: handleRentLoan(apiKey),
    credit_loan: handleCreditLoan(apiKey),
  });
}

export function registerFinancialProduct(
  server: McpServer,
  apiKey: string,
): void {
  const handler = createFinancialProductHandler(apiKey);

  registerSkillTool(server, {
    name: "financial_product",
    title: "Financial Product Comparison / 금융상품 비교공시",
    description: "Financial Product Comparison (FSS) — compare financial institutions, fixed deposits, savings, pension savings, mortgage loans, lease loans, and personal credit loans in one tool. / 금융감독원 금융상품 통합비교공시 — 금융회사, 정기예금, 적금, 연금저축, 주택담보대출, 전세자금대출, 개인신용대출을 하나의 도구로 조회합니다.",
    inputSchema: {
      action: z.enum(ACTIONS).describe(
        "company=금융회사목록 | deposit=정기예금 | saving=적금 | annuity=연금저축 | mortgage_loan=주택담보대출 | rent_house_loan=전세자금대출 | credit_loan=개인신용대출",
      ),
      top_fin_grp_no: z.enum(["020000", "030200", "030300", "050000", "060000"]).describe(
        "권역코드 (필수, 6자리) — 020000=은행 | 030200=여신전문(카드/캐피탈) | 030300=저축은행 | 050000=보험 | 060000=금융투자",
      ),
      page_no: z.number().int().min(1).optional().describe("페이지 번호 (기본 1)"),
      fin_co_no: z.string().optional().describe("금융회사 코드 필터 (company action에서 특정 회사만 조회)"),
    },
    callback: async (params) => handler(params as FinancialParams),
  });
}
