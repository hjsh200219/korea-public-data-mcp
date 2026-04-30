/**
 * Skill: tourism — 한국관광공사 KorService2 통합 도구
 * DATA20_SERVICE_KEY 재사용
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  getAreaCode, getCategoryCode,
  searchAreaBased, searchKeyword, searchLocationBased,
  searchFestival, searchStay,
  getDetailCommon, getDetailIntro, getDetailInfo, getDetailImage,
  getAreaBasedSync, getLdongCode, getLclsSystmCode,
} from "../../tourism-api.js";
import { errorResponse, truncate } from "../../shared.js";
import { createDispatcher, requireParam, type SkillResult } from "./_shared.js";

const ACTIONS = [
  "search_tourism_area",
  "search_tourism_keyword",
  "search_tourism_location",
  "search_tourism_festival",
  "search_tourism_stay",
  "get_tourism_detail",
  "get_tourism_codes",
] as const;

type TourismParams = {
  action: string;
  areaCode?: string;
  sigunguCode?: string;
  contentTypeId?: string;
  cat1?: string; cat2?: string; cat3?: string;
  keyword?: string;
  mapX?: string; mapY?: string; radius?: string;
  eventStartDate?: string; eventEndDate?: string;
  contentId?: string;
  /** common | intro | info | image */
  detailType?: string;
  /** area | category | ldong | lclssystm | sync */
  codeType?: string;
  lclsSystmCode?: string;
  modifiedtime?: string;
  arrange?: string;
  pageNo?: number;
  numOfRows?: number;
};

function s(val: unknown): string {
  if (val === null || val === undefined) return "-";
  const str = String(val).trim();
  return str || "-";
}

function handleSearchTourismArea(serviceKey: string) {
  return async (p: TourismParams): Promise<SkillResult> => {
    try {
      const result = await searchAreaBased(serviceKey, {
        areaCode: p.areaCode,
        sigunguCode: p.sigunguCode,
        contentTypeId: p.contentTypeId,
        cat1: p.cat1, cat2: p.cat2, cat3: p.cat3,
        arrange: p.arrange,
        pageNo: p.pageNo,
        numOfRows: p.numOfRows,
      });
      if (result.items.length === 0) return { content: [{ type: "text", text: "검색 결과가 없습니다." }] };
      const header = `지역기반 관광정보 — 총 ${result.totalCount}건 (${result.pageNo}페이지)\n`;
      const lines = result.items.map((i) =>
        `• ${s(i.title)} [${s(i.contenttypeid)}]\n  주소: ${s(i.addr1)}${i.addr2 ? " " + i.addr2 : ""}\n  좌표: ${s(i.mapx)}, ${s(i.mapy)}\n  전화: ${s(i.tel)}`,
      );
      return { content: [{ type: "text", text: truncate(header + "\n" + lines.join("\n\n")) }] };
    } catch (error) {
      return errorResponse("지역기반 관광정보 검색", error);
    }
  };
}

function handleSearchTourismKeyword(serviceKey: string) {
  return async (p: TourismParams): Promise<SkillResult> => {
    const err = requireParam(p as Record<string, unknown>, "keyword", "search_tourism_keyword");
    if (err) return err;
    try {
      const result = await searchKeyword(serviceKey, {
        keyword: p.keyword!,
        areaCode: p.areaCode,
        sigunguCode: p.sigunguCode,
        contentTypeId: p.contentTypeId,
        cat1: p.cat1, cat2: p.cat2, cat3: p.cat3,
        arrange: p.arrange,
        pageNo: p.pageNo,
        numOfRows: p.numOfRows,
      });
      if (result.items.length === 0) return { content: [{ type: "text", text: "검색 결과가 없습니다." }] };
      const header = `키워드 검색결과 — 총 ${result.totalCount}건 (${result.pageNo}페이지)\n`;
      const lines = result.items.map((i) =>
        `• ${s(i.title)} [${s(i.contenttypeid)}]\n  주소: ${s(i.addr1)}\n  전화: ${s(i.tel)}`,
      );
      return { content: [{ type: "text", text: truncate(header + "\n" + lines.join("\n\n")) }] };
    } catch (error) {
      return errorResponse("키워드 검색", error);
    }
  };
}

function handleSearchTourismLocation(serviceKey: string) {
  return async (p: TourismParams): Promise<SkillResult> => {
    const e1 = requireParam(p as Record<string, unknown>, "mapX", "search_tourism_location");
    if (e1) return e1;
    const e2 = requireParam(p as Record<string, unknown>, "mapY", "search_tourism_location");
    if (e2) return e2;
    const e3 = requireParam(p as Record<string, unknown>, "radius", "search_tourism_location");
    if (e3) return e3;
    try {
      const result = await searchLocationBased(serviceKey, {
        mapX: p.mapX!, mapY: p.mapY!, radius: p.radius!,
        contentTypeId: p.contentTypeId,
        areaCode: p.areaCode,
        arrange: p.arrange,
        pageNo: p.pageNo,
        numOfRows: p.numOfRows,
      });
      if (result.items.length === 0) return { content: [{ type: "text", text: "검색 결과가 없습니다." }] };
      const header = `위치기반 관광정보 — 총 ${result.totalCount}건 (${result.pageNo}페이지)\n`;
      const lines = result.items.map((i) =>
        `• ${s(i.title)} [${s(i.contenttypeid)}]\n  주소: ${s(i.addr1)}\n  거리: ${s(i.dist)}m\n  전화: ${s(i.tel)}`,
      );
      return { content: [{ type: "text", text: truncate(header + "\n" + lines.join("\n\n")) }] };
    } catch (error) {
      return errorResponse("위치기반 관광정보 검색", error);
    }
  };
}

function handleSearchTourismFestival(serviceKey: string) {
  return async (p: TourismParams): Promise<SkillResult> => {
    const err = requireParam(p as Record<string, unknown>, "eventStartDate", "search_tourism_festival");
    if (err) return err;
    try {
      const result = await searchFestival(serviceKey, {
        eventStartDate: p.eventStartDate!,
        eventEndDate: p.eventEndDate,
        areaCode: p.areaCode,
        sigunguCode: p.sigunguCode,
        arrange: p.arrange,
        pageNo: p.pageNo,
        numOfRows: p.numOfRows,
      });
      if (result.items.length === 0) return { content: [{ type: "text", text: "검색 결과가 없습니다." }] };
      const header = `축제·공연·행사 검색결과 — 총 ${result.totalCount}건 (${result.pageNo}페이지)\n`;
      const lines = result.items.map((i) =>
        `• ${s(i.title)}\n  주소: ${s(i.addr1)}\n  기간: ${s(i.eventstartdate)} ~ ${s(i.eventenddate)}\n  전화: ${s(i.tel)}`,
      );
      return { content: [{ type: "text", text: truncate(header + "\n" + lines.join("\n\n")) }] };
    } catch (error) {
      return errorResponse("축제·공연·행사 검색", error);
    }
  };
}

function handleSearchTourismStay(serviceKey: string) {
  return async (p: TourismParams): Promise<SkillResult> => {
    try {
      const result = await searchStay(serviceKey, {
        areaCode: p.areaCode,
        sigunguCode: p.sigunguCode,
        arrange: p.arrange,
        pageNo: p.pageNo,
        numOfRows: p.numOfRows,
      });
      if (result.items.length === 0) return { content: [{ type: "text", text: "검색 결과가 없습니다." }] };
      const header = `숙박 검색결과 — 총 ${result.totalCount}건 (${result.pageNo}페이지)\n`;
      const lines = result.items.map((i) =>
        `• ${s(i.title)}\n  주소: ${s(i.addr1)}\n  전화: ${s(i.tel)}${i.benikia === "1" ? "\n  [베니키아]" : ""}${i.goodstay === "1" ? "\n  [굿스테이]" : ""}${i.hanok === "1" ? "\n  [한옥]" : ""}`,
      );
      return { content: [{ type: "text", text: truncate(header + "\n" + lines.join("\n\n")) }] };
    } catch (error) {
      return errorResponse("숙박 검색", error);
    }
  };
}

function handleGetTourismDetail(serviceKey: string) {
  return async (p: TourismParams): Promise<SkillResult> => {
    const err = requireParam(p as Record<string, unknown>, "contentId", "get_tourism_detail");
    if (err) return err;
    const detailType = p.detailType || "common";
    try {
      if (detailType === "intro") {
        const ctid = p.contentTypeId || "12";
        const result = await getDetailIntro(serviceKey, { contentId: p.contentId!, contentTypeId: ctid });
        if (result.items.length === 0) return { content: [{ type: "text", text: "정보가 없습니다." }] };
        const item = result.items[0];
        const fields = Object.entries(item)
          .filter(([k]) => k !== "contentid" && k !== "contenttypeid")
          .map(([k, v]) => `  ${k}: ${s(v)}`).join("\n");
        return { content: [{ type: "text", text: truncate(`소개정보 — contentId: ${p.contentId}\n\n${fields}`) }] };
      }
      if (detailType === "info") {
        const ctid = p.contentTypeId || "12";
        const result = await getDetailInfo(serviceKey, { contentId: p.contentId!, contentTypeId: ctid, pageNo: p.pageNo, numOfRows: p.numOfRows });
        if (result.items.length === 0) return { content: [{ type: "text", text: "정보가 없습니다." }] };
        const lines = result.items.map((i) => `• ${s(i.infoname)}: ${s(i.infotext)}`);
        return { content: [{ type: "text", text: truncate(`반복정보 — 총 ${result.totalCount}건\n\n${lines.join("\n")}`) }] };
      }
      if (detailType === "image") {
        const result = await getDetailImage(serviceKey, { contentId: p.contentId!, pageNo: p.pageNo, numOfRows: p.numOfRows });
        if (result.items.length === 0) return { content: [{ type: "text", text: "이미지가 없습니다." }] };
        const lines = result.items.map((i) => `• ${s(i.imgname)}\n  원본: ${s(i.originimgurl)}\n  썸네일: ${s(i.smallimageurl)}`);
        return { content: [{ type: "text", text: truncate(`이미지정보 — 총 ${result.totalCount}건\n\n${lines.join("\n\n")}`) }] };
      }
      // common (기본값)
      const result = await getDetailCommon(serviceKey, { contentId: p.contentId! });
      if (result.items.length === 0) return { content: [{ type: "text", text: "정보가 없습니다." }] };
      const i = result.items[0];
      const text = [
        `공통정보 — ${s(i.title)}`,
        `  contentId: ${s(i.contentid)} / 타입: ${s(i.contenttypeid)}`,
        `  주소: ${s(i.addr1)}${i.addr2 ? " " + i.addr2 : ""}`,
        `  전화: ${s(i.tel)}`,
        `  홈페이지: ${s(i.homepage)}`,
        `  좌표: ${s(i.mapx)}, ${s(i.mapy)}`,
        `  개요: ${truncate(s(i.overview), 500)}`,
      ].join("\n");
      return { content: [{ type: "text", text: truncate(text) }] };
    } catch (error) {
      return errorResponse("관광정보 상세 조회", error);
    }
  };
}

function handleGetTourismCodes(serviceKey: string) {
  return async (p: TourismParams): Promise<SkillResult> => {
    const codeType = p.codeType || "area";
    try {
      if (codeType === "category") {
        const result = await getCategoryCode(serviceKey, { contentTypeId: p.contentTypeId, cat1: p.cat1, cat2: p.cat2, cat3: p.cat3, pageNo: p.pageNo, numOfRows: p.numOfRows });
        const lines = result.items.map((i) => `• ${s(i.code)}: ${s(i.name)}`);
        return { content: [{ type: "text", text: truncate(`서비스분류코드 — 총 ${result.items.length}건\n\n${lines.join("\n")}`) }] };
      }
      if (codeType === "sync") {
        const result = await getAreaBasedSync(serviceKey, { areaCode: p.areaCode, sigunguCode: p.sigunguCode, contentTypeId: p.contentTypeId, modifiedtime: p.modifiedtime, pageNo: p.pageNo, numOfRows: p.numOfRows });
        if (result.items.length === 0) return { content: [{ type: "text", text: "동기화 목록이 없습니다." }] };
        const lines = result.items.map((i) => `• [${s(i.contentid)}] ${s(i.title)} (수정: ${s(i.modifiedtime)})`);
        return { content: [{ type: "text", text: truncate(`지역기반 동기화목록 — 총 ${result.totalCount}건 (${result.pageNo}페이지)\n\n${lines.join("\n")}`) }] };
      }
      if (codeType === "ldong") {
        const result = await getLdongCode(serviceKey, { areaCode: p.areaCode, sigunguCode: p.sigunguCode, pageNo: p.pageNo, numOfRows: p.numOfRows });
        const lines = result.items.map((i) => `• ${s(i.code)}: ${s(i.name)}`);
        return { content: [{ type: "text", text: truncate(`법정동코드 — 총 ${result.items.length}건\n\n${lines.join("\n")}`) }] };
      }
      if (codeType === "lclssystm") {
        const result = await getLclsSystmCode(serviceKey, { lclsSystmCode: p.lclsSystmCode, pageNo: p.pageNo, numOfRows: p.numOfRows });
        const lines = result.items.map((i) => `• ${s(i.code)}: ${s(i.name)}`);
        return { content: [{ type: "text", text: truncate(`관광타입소분류코드 — 총 ${result.items.length}건\n\n${lines.join("\n")}`) }] };
      }
      // area (기본값)
      const result = await getAreaCode(serviceKey, { areaCode: p.areaCode, pageNo: p.pageNo, numOfRows: p.numOfRows });
      const lines = result.items.map((i) => `• ${s(i.code)}: ${s(i.name)}`);
      return { content: [{ type: "text", text: truncate(`지역코드 — 총 ${result.items.length}건\n\n${lines.join("\n")}`) }] };
    } catch (error) {
      return errorResponse("관광 코드 조회", error);
    }
  };
}

export function createTourismHandler(serviceKey: string) {
  return createDispatcher<TourismParams>("tourism", {
    search_tourism_area: handleSearchTourismArea(serviceKey),
    search_tourism_keyword: handleSearchTourismKeyword(serviceKey),
    search_tourism_location: handleSearchTourismLocation(serviceKey),
    search_tourism_festival: handleSearchTourismFestival(serviceKey),
    search_tourism_stay: handleSearchTourismStay(serviceKey),
    get_tourism_detail: handleGetTourismDetail(serviceKey),
    get_tourism_codes: handleGetTourismCodes(serviceKey),
  });
}

export function registerTourism(server: McpServer, serviceKey: string): void {
  const handler = createTourismHandler(serviceKey);

  server.tool(
    "tourism",
    "한국관광공사 KorService2 — 지역·키워드·위치 관광정보 검색, 축제/숙박, 상세정보(공통·소개·반복·이미지), 코드조회(지역·분류·법정동·소분류·동기화)",
    {
      action: z.enum(ACTIONS).describe(
        "search_tourism_area=지역기반검색(areaCode) | search_tourism_keyword=키워드검색(keyword필수) | search_tourism_location=위치기반검색(mapX·mapY·radius필수) | search_tourism_festival=축제검색(eventStartDate필수) | search_tourism_stay=숙박검색(areaCode) | get_tourism_detail=상세조회(contentId필수,detailType=common|intro|info|image) | get_tourism_codes=코드조회(codeType=area|category|ldong|lclssystm|sync)",
      ),
      areaCode: z.string().optional().describe("지역코드 (get_tourism_codes:area로 조회)"),
      sigunguCode: z.string().optional().describe("시군구코드"),
      contentTypeId: z.string().optional().describe("관광타입ID (12=관광지, 14=문화시설, 15=축제, 25=여행코스, 28=레포츠, 32=숙박, 38=쇼핑, 39=음식점)"),
      cat1: z.string().optional().describe("대분류 코드"),
      cat2: z.string().optional().describe("중분류 코드"),
      cat3: z.string().optional().describe("소분류 코드"),
      keyword: z.string().optional().describe("검색어 (search_tourism_keyword 필수)"),
      mapX: z.string().optional().describe("경도 WGS84 (search_tourism_location 필수)"),
      mapY: z.string().optional().describe("위도 WGS84 (search_tourism_location 필수)"),
      radius: z.string().optional().describe("반경 미터 최대 20000 (search_tourism_location 필수)"),
      eventStartDate: z.string().optional().describe("행사시작일 YYYYMMDD (search_tourism_festival 필수)"),
      eventEndDate: z.string().optional().describe("행사종료일 YYYYMMDD"),
      contentId: z.string().optional().describe("콘텐츠 ID (get_tourism_detail 필수)"),
      detailType: z.enum(["common", "intro", "info", "image"]).optional().describe("상세조회 유형 (기본값: common)"),
      codeType: z.enum(["area", "category", "ldong", "lclssystm", "sync"]).optional().describe("코드조회 유형 (기본값: area)"),
      lclsSystmCode: z.string().optional().describe("관광타입 소분류 코드 (get_tourism_codes:lclssystm)"),
      modifiedtime: z.string().optional().describe("수정일시 YYYYMMDDHHMMSS (get_tourism_codes:sync 필터)"),
      arrange: z.string().optional().describe("정렬 A=제목순 B=조회순 C=수정일순 D=생성일순 (기본값: A)"),
      pageNo: z.number().optional(),
      numOfRows: z.number().optional(),
    },
    async (params) => handler(params as TourismParams),
  );
}
