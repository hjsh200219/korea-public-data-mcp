/**
 * Skill: procurement — 나라장터 입찰공고·낙찰정보 조회
 * 조달청 G2B API 기반 (물품/용역/공사/외자)
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getBidPublicList, getScsbidList } from "../../g2b-api.js";
import { BID_TYPE_LABELS, type BidType } from "../../g2b-types.js";
import { errorResponse, truncate } from "../../shared.js";
import { createDispatcher, emptyResultMessage, type SkillResult } from "./_shared.js";

const ACTIONS = [
  "bid_list",
  "award_list",
] as const;

type ProcurementParams = {
  action: string;
  bid_type?: string;
  begin_date: string;
  end_date: string;
  keyword?: string;
  num_of_rows?: string;
  page_no?: string;
};

function formatBidItem(i: { bidNtceNo: string; bidNtceNm: string; ntceInsttNm?: string; dminsttNm: string; bidNtceDt?: string; presmptPrce?: string; bidMethdNm?: string; bidClseDt?: string; bidNtceDtlUrl?: string }): string {
  const price = i.presmptPrce ? Number(i.presmptPrce).toLocaleString() : "-";
  return [
    `### ${i.bidNtceNm}`,
    `- 공고번호: ${i.bidNtceNo}`,
    `- 수요기관: ${i.dminsttNm}`,
    i.ntceInsttNm ? `- 공고기관: ${i.ntceInsttNm}` : "",
    i.bidNtceDt ? `- 공고일: ${i.bidNtceDt}` : "",
    i.bidClseDt ? `- 입찰마감: ${i.bidClseDt}` : "",
    i.bidMethdNm ? `- 입찰방법: ${i.bidMethdNm}` : "",
    `- 추정가격: ${price}원`,
    i.bidNtceDtlUrl ? `- [상세보기](${i.bidNtceDtlUrl})` : "",
  ].filter(Boolean).join("\n");
}

function formatAwardItem(i: { bidNtceNo: string; bidNtceNm: string; dminsttNm: string; bidwinnrNm: string; sucsfbidAmt: string; sucsfbidRate: string; prtcptCnum: string; rlOpengDt: string; fnlSucsfDate: string }): string {
  const amt = Number(i.sucsfbidAmt).toLocaleString();
  return [
    `### ${i.bidNtceNm}`,
    `- 공고번호: ${i.bidNtceNo}`,
    `- 수요기관: ${i.dminsttNm}`,
    `- 낙찰업체: ${i.bidwinnrNm}`,
    `- 낙찰금액: ${amt}원 (${i.sucsfbidRate}%)`,
    `- 참여업체수: ${i.prtcptCnum}`,
    `- 개찰일: ${i.rlOpengDt}`,
    `- 최종낙찰일: ${i.fnlSucsfDate}`,
  ].join("\n");
}

function resolveBidType(value?: string): BidType {
  if (!value) return "thng";
  const map: Record<string, BidType> = {
    thng: "thng", 물품: "thng",
    servc: "servc", 용역: "servc",
    cnstwk: "cnstwk", 공사: "cnstwk",
    frgcpt: "frgcpt", 외자: "frgcpt",
  };
  return map[value] ?? "thng";
}

function handleBidList(serviceKey: string) {
  return async (p: ProcurementParams): Promise<SkillResult> => {
    const bidType = resolveBidType(p.bid_type);
    try {
      const result = await getBidPublicList(serviceKey, bidType, {
        inqryDiv: "1",
        inqryBgnDt: p.begin_date,
        inqryEndDt: p.end_date,
        bidNtceNm: p.keyword,
        numOfRows: p.num_of_rows ?? "10",
        pageNo: p.page_no ?? "1",
      });
      const items = result.response.body.items;
      if (!items || items.length === 0) {
        return emptyResultMessage("입찰공고", { bid_type: BID_TYPE_LABELS[bidType], begin_date: p.begin_date, end_date: p.end_date, keyword: p.keyword });
      }
      const total = result.response.body.totalCount;
      const header = `## 입찰공고 [${BID_TYPE_LABELS[bidType]}] (총 ${total}건, ${items.length}건 표시)\n`;
      const body = items.map(formatBidItem).join("\n\n");
      return { content: [{ type: "text", text: truncate(header + body) }] };
    } catch (error) {
      return errorResponse("입찰공고 조회", error);
    }
  };
}

function handleAwardList(serviceKey: string) {
  return async (p: ProcurementParams): Promise<SkillResult> => {
    const bidType = resolveBidType(p.bid_type);
    try {
      const result = await getScsbidList(serviceKey, bidType, {
        inqryDiv: "1",
        inqryBgnDt: p.begin_date,
        inqryEndDt: p.end_date,
        bidNtceNm: p.keyword,
        numOfRows: p.num_of_rows ?? "10",
        pageNo: p.page_no ?? "1",
      });
      const items = result.response.body.items;
      if (!items || items.length === 0) {
        return emptyResultMessage("낙찰정보", { bid_type: BID_TYPE_LABELS[bidType], begin_date: p.begin_date, end_date: p.end_date, keyword: p.keyword });
      }
      const total = result.response.body.totalCount;
      const header = `## 낙찰정보 [${BID_TYPE_LABELS[bidType]}] (총 ${total}건, ${items.length}건 표시)\n`;
      const body = items.map(formatAwardItem).join("\n\n");
      return { content: [{ type: "text", text: truncate(header + body) }] };
    } catch (error) {
      return errorResponse("낙찰정보 조회", error);
    }
  };
}

export function createProcurementHandler(serviceKey: string) {
  return createDispatcher<ProcurementParams>("procurement", {
    bid_list: handleBidList(serviceKey),
    award_list: handleAwardList(serviceKey),
  });
}

export function registerProcurement(
  server: McpServer,
  serviceKey: string,
): void {
  const handler = createProcurementHandler(serviceKey);

  server.tool(
    "procurement",
    "나라장터 입찰공고·낙찰정보 조회 — 조달청 G2B 물품/용역/공사/외자 입찰공고 검색 및 낙찰결과를 조회합니다.",
    {
      action: z.enum(ACTIONS).describe(
        "bid_list=입찰공고목록(기간필수) | award_list=낙찰정보목록(기간필수)",
      ),
      bid_type: z.string().optional().describe("입찰유형: thng(물품,기본값) | servc(용역) | cnstwk(공사) | frgcpt(외자)"),
      begin_date: z.string().describe("조회시작일시 (YYYYMMDDHHmm, 예: 202604080000)"),
      end_date: z.string().describe("조회종료일시 (YYYYMMDDHHmm, 예: 202604100000)"),
      keyword: z.string().optional().describe("공고명 키워드 검색"),
      num_of_rows: z.string().optional().describe("한 페이지 결과 수 (기본 10)"),
      page_no: z.string().optional().describe("페이지 번호 (기본 1)"),
    },
    async (params) => handler(params as ProcurementParams),
  );
}
