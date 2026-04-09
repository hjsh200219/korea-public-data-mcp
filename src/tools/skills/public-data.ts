/**
 * Skill: public_data — 공공데이터 통합 검색/조회
 * 기존 도구: data20_search_pharmacy, data20_search_hospital,
 *   data20_search_animal_hospital, data20_search_rare_medicine,
 *   data20_search_health_food, data20_search_bio_equivalence,
 *   data20_search_medicine_patent, data20_verify_business,
 *   data20_check_business_status, search_onbid_pbanc_cltr_detail,
 *   search_onbid_pbanc_list
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  searchPharmacy, searchHospital,
  searchRareMedicine, searchHealthFood,
  searchBioEquivalence, searchMedicinePatent,
  verifyBusiness, checkBusinessStatus,
  searchOnbidPbancCltrDetail,
  searchOnbidPbancList,
} from "../../data20-api.js";
import { errorResponse, truncate } from "../../shared.js";
import { createDispatcher, requireParam, type SkillResult } from "./_shared.js";

const ACTIONS = [
  "search_pharmacy",
  "search_hospital",
  "search_animal_hospital",
  "search_rare_medicine",
  "search_health_food",
  "search_bio_equivalence",
  "search_medicine_patent",
  "verify_business",
  "check_business_status",
  "search_onbid_pbanc_cltr_detail",
  "search_onbid_pbanc_list",
] as const;

type PublicDataParams = {
  action: string;
  Q0?: string;
  Q1?: string;
  QN?: string;
  yadmNm?: string;
  sidoCd?: string;
  sgguCd?: string;
  clCd?: string;
  dgsbjtCd?: string;
  item_name?: string;
  item_eng_name?: string;
  entp_name?: string;
  ingr_name?: string;
  ingr_eng_name?: string;
  prdlst_nm?: string;
  b_no?: string;
  start_dt?: string;
  p_nm?: string;
  b_nm?: string;
  pageNo?: number;
  numOfRows?: number;
  /** 온비드 공고관리번호 (search_onbid_pbanc_cltr_detail) */
  pbancMngNo?: string;
  /** 온비드 공고목록 추가 검색조건 — JSON 객체 문자열(명세의 영문 파라미터명) */
  onbid_list_filters_json?: string;
};

function s(val: unknown): string {
  if (val === null || val === undefined) return "-";
  const str = String(val).trim();
  return str || "-";
}

const STATUS_MAP: Record<string, string> = { "01": "계속사업자", "02": "휴업자", "03": "폐업자" };

function handleSearchPharmacy(serviceKey: string) {
  return async (p: PublicDataParams): Promise<SkillResult> => {
    try {
      const result = await searchPharmacy(serviceKey, p);
      if (result.items.length === 0) {
        return { content: [{ type: "text", text: "검색 결과가 없습니다." }] };
      }
      const header = `약국 검색결과 — 총 ${result.totalCount}건 (${result.pageNo}페이지)\n`;
      const lines = result.items.map((ph) =>
        `• ${s(ph.yadmNm)}\n  주소: ${s(ph.addr)}\n  전화: ${s(ph.telno)}\n  지역: ${[ph.sidoCdNm, ph.sgguCdNm, ph.emdongNm].filter(Boolean).join(" ")}`,
      );
      return { content: [{ type: "text", text: truncate(header + "\n" + lines.join("\n\n")) }] };
    } catch (error) {
      return errorResponse("약국 검색", error);
    }
  };
}

function handleSearchHospital(serviceKey: string) {
  return async (p: PublicDataParams): Promise<SkillResult> => {
    try {
      const result = await searchHospital(serviceKey, p);
      if (result.items.length === 0) {
        return { content: [{ type: "text", text: "검색 결과가 없습니다." }] };
      }
      const header = `병원 검색결과 — 총 ${result.totalCount}건 (${result.pageNo}페이지)\n`;
      const lines = result.items.map((h) =>
        `• ${s(h.yadmNm)} (${s(h.clCdNm)})\n  주소: ${s(h.addr)}\n  전화: ${s(h.telno)}\n  진료과목: ${s(h.dgsbjtCdNm)}\n  의사수: ${s(h.drTotCnt)}명`,
      );
      return { content: [{ type: "text", text: truncate(header + "\n" + lines.join("\n\n")) }] };
    } catch (error) {
      return errorResponse("병원 검색", error);
    }
  };
}

function handleSearchAnimalHospital(serviceKey: string) {
  return async (p: PublicDataParams): Promise<SkillResult> => {
    try {
      const result = await searchHospital(serviceKey, p);
      if (result.items.length === 0) {
        return { content: [{ type: "text", text: "검색 결과가 없습니다." }] };
      }
      const header = `동물병원 검색결과 — 총 ${result.totalCount}건 (${result.pageNo}페이지)\n`;
      const lines = result.items.map((h) =>
        `• ${s(h.yadmNm)} (${s(h.clCdNm)})\n  주소: ${s(h.addr)}\n  전화: ${s(h.telno)}`,
      );
      return { content: [{ type: "text", text: truncate(header + "\n" + lines.join("\n\n")) }] };
    } catch (error) {
      return errorResponse("동물병원 검색", error);
    }
  };
}

function handleSearchRareMedicine(serviceKey: string) {
  return async (p: PublicDataParams): Promise<SkillResult> => {
    try {
      const result = await searchRareMedicine(serviceKey, p);
      if (result.items.length === 0) {
        return { content: [{ type: "text", text: "검색 결과가 없습니다." }] };
      }
      const header = `희귀의약품 검색결과 — 총 ${result.totalCount}건 (${result.pageNo}페이지)\n`;
      const lines = result.items.map((m) =>
        `• ${s(m.PRODT_NAME)}${m.GOODS_NAME ? ` (${s(m.GOODS_NAME)})` : ""}\n  제조사: ${s(m.MANUF_NAME || m.MANUFPLACE_NAME)}\n  대상질환: ${truncate(s(m.TARGET_DISEASE), 200)}\n  지정일: ${s(m.APPOINT_DATE)}`,
      );
      return { content: [{ type: "text", text: truncate(header + "\n" + lines.join("\n\n")) }] };
    } catch (error) {
      return errorResponse("희귀의약품 검색", error);
    }
  };
}

function handleSearchHealthFood(serviceKey: string) {
  return async (p: PublicDataParams): Promise<SkillResult> => {
    try {
      const result = await searchHealthFood(serviceKey, p);
      if (result.items.length === 0) {
        return { content: [{ type: "text", text: "검색 결과가 없습니다." }] };
      }
      const header = `건강기능식품 검색결과 — 총 ${result.totalCount}건 (${result.pageNo}페이지)\n`;
      const lines = result.items.map((f) =>
        `• ${s(f.PRDUCT)}\n  업체: ${s(f.ENTRPS)}\n  기능성: ${truncate(s(f.MAIN_FNCTN), 200)}\n  유통기한: ${s(f.DISTB_PD)}\n  섭취방법: ${truncate(s(f.SRV_USE), 150)}`,
      );
      return { content: [{ type: "text", text: truncate(header + "\n" + lines.join("\n\n")) }] };
    } catch (error) {
      return errorResponse("건강식품 검색", error);
    }
  };
}

function handleSearchBioEquivalence(serviceKey: string) {
  return async (p: PublicDataParams): Promise<SkillResult> => {
    try {
      const result = await searchBioEquivalence(serviceKey, p);
      if (result.items.length === 0) {
        return { content: [{ type: "text", text: "검색 결과가 없습니다." }] };
      }
      const header = `생동성인정품목 검색결과 — 총 ${result.totalCount}건 (${result.pageNo}페이지)\n`;
      const lines = result.items.map((b) =>
        `• ${s(b.ITEM_NAME)}\n  업체: ${s(b.ENTP_NAME)}\n  성분: ${s(b.INGR_KOR_NAME)}\n  함량: ${s(b.INGR_QTY)}\n  제형: ${s(b.SHAPE_CODE_NAME)}\n  공고일: ${s(b.BIOEQ_PRODT_NOTICE_DATE)}`,
      );
      return { content: [{ type: "text", text: truncate(header + "\n" + lines.join("\n\n")) }] };
    } catch (error) {
      return errorResponse("생동성인정품목 검색", error);
    }
  };
}

function handleSearchMedicinePatent(serviceKey: string) {
  return async (p: PublicDataParams): Promise<SkillResult> => {
    try {
      const result = await searchMedicinePatent(serviceKey, p);
      if (result.items.length === 0) {
        return { content: [{ type: "text", text: "검색 결과가 없습니다." }] };
      }
      const header = `의약품 특허정보 검색결과 — 총 ${result.totalCount}건 (${result.pageNo}페이지)\n`;
      const lines = result.items.map((pt) =>
        `• ${s(pt.ITEM_NAME)}${pt.ITEM_ENG_NAME ? ` (${s(pt.ITEM_ENG_NAME)})` : ""}\n  업체: ${s(pt.ENTP_NAME)}\n  성분: ${s(pt.INGR_KOR_NAME)}${pt.INGR_ENG_NAME ? ` / ${s(pt.INGR_ENG_NAME)}` : ""}\n  특허번호: ${s(pt.PATENT_NO)}\n  특허일: ${s(pt.PATENT_DATE)}\n  만료일: ${s(pt.PATENT_EXPIRY_DATE)}\n  제형: ${s(pt.DOSAGE_FORM)}`,
      );
      return { content: [{ type: "text", text: truncate(header + "\n" + lines.join("\n\n")) }] };
    } catch (error) {
      return errorResponse("의약품 특허정보 검색", error);
    }
  };
}

function handleVerifyBusiness(serviceKey: string) {
  return async (p: PublicDataParams): Promise<SkillResult> => {
    const err1 = requireParam(p as Record<string, unknown>, "b_no", "verify_business");
    if (err1) return err1;
    const err2 = requireParam(p as Record<string, unknown>, "start_dt", "verify_business");
    if (err2) return err2;
    const err3 = requireParam(p as Record<string, unknown>, "p_nm", "verify_business");
    if (err3) return err3;
    try {
      const results = await verifyBusiness(serviceKey, [{ b_no: p.b_no!, start_dt: p.start_dt!, p_nm: p.p_nm!, b_nm: p.b_nm }]);
      if (results.length === 0) {
        return { content: [{ type: "text", text: "진위확인 결과를 받지 못했습니다." }] };
      }
      const r = results[0];
      return {
        content: [{
          type: "text",
          text: `사업자등록 진위확인 결과\n\n사업자번호: ${r.b_no}\n확인결과: ${r.valid_msg || r.valid}`,
        }],
      };
    } catch (error) {
      return errorResponse("사업자등록 진위확인", error);
    }
  };
}

function handleSearchOnbidPbancCltrDetail(serviceKey: string) {
  return async (p: PublicDataParams): Promise<SkillResult> => {
    const err = requireParam(p as Record<string, unknown>, "pbancMngNo", "search_onbid_pbanc_cltr_detail");
    if (err) return err;
    try {
      const result = await searchOnbidPbancCltrDetail(serviceKey, {
        pbancMngNo: p.pbancMngNo!.trim(),
        pageNo: p.pageNo,
        numOfRows: p.numOfRows,
      });
      if (result.items.length === 0) {
        return { content: [{ type: "text", text: "검색 결과가 없습니다." }] };
      }
      const header = `온비드 공고물건 상세 — 공고 ${p.pbancMngNo} / 총 ${result.totalCount}건 (${result.pageNo}페이지)\n`;
      const lines = result.items.map((row, idx) => {
        const snippet = truncate(JSON.stringify(row), 1200);
        return `• [${idx + 1}] ${snippet}`;
      });
      return { content: [{ type: "text", text: truncate(header + "\n" + lines.join("\n\n")) }] };
    } catch (error) {
      return errorResponse("온비드 공고물건상세 조회", error);
    }
  };
}

function handleSearchOnbidPbancList(serviceKey: string) {
  return async (p: PublicDataParams): Promise<SkillResult> => {
    let query: Record<string, string> | undefined;
    const raw = p.onbid_list_filters_json?.trim();
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Record<string, unknown>;
        if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
          return {
            content: [{ type: "text", text: "onbid_list_filters_json 은 JSON 객체여야 합니다." }],
            isError: true,
          };
        }
        query = {};
        for (const [k, v] of Object.entries(parsed)) {
          if (v === null || v === undefined) continue;
          const str = String(v).trim();
          if (str) query[k] = str;
        }
      } catch {
        return {
          content: [{ type: "text", text: "onbid_list_filters_json 파싱 실패: 유효한 JSON 객체인지 확인하세요." }],
          isError: true,
        };
      }
    }
    try {
      const result = await searchOnbidPbancList(serviceKey, {
        pageNo: p.pageNo,
        numOfRows: p.numOfRows,
        query,
      });
      if (result.items.length === 0) {
        return { content: [{ type: "text", text: "검색 결과가 없습니다." }] };
      }
      const header = `온비드 공고목록 — 총 ${result.totalCount}건 (${result.pageNo}페이지)\n`;
      const lines = result.items.map((row, idx) => {
        const snippet = truncate(JSON.stringify(row), 1200);
        return `• [${idx + 1}] ${snippet}`;
      });
      return { content: [{ type: "text", text: truncate(header + "\n" + lines.join("\n\n")) }] };
    } catch (error) {
      return errorResponse("온비드 공고목록 조회", error);
    }
  };
}

function handleCheckBusinessStatus(serviceKey: string) {
  return async (p: PublicDataParams): Promise<SkillResult> => {
    const err = requireParam(p as Record<string, unknown>, "b_no", "check_business_status");
    if (err) return err;
    try {
      const numbers = p.b_no!.split(",").map((n) => n.trim()).filter(Boolean);
      const results = await checkBusinessStatus(serviceKey, numbers);
      if (results.length === 0) {
        return { content: [{ type: "text", text: "상태조회 결과를 받지 못했습니다." }] };
      }
      const lines = results.map((r) =>
        `• ${r.b_no}: ${STATUS_MAP[r.b_stt_cd] || r.b_stt || "확인불가"}\n  과세유형: ${s(r.tax_type)}${r.end_dt ? `\n  폐업일: ${r.end_dt}` : ""}`,
      );
      return {
        content: [{ type: "text", text: `사업자등록 상태조회 결과\n\n${lines.join("\n\n")}` }],
      };
    } catch (error) {
      return errorResponse("사업자등록 상태조회", error);
    }
  };
}

export function createPublicDataHandler(serviceKey: string) {
  return createDispatcher<PublicDataParams>("public_data", {
    search_pharmacy: handleSearchPharmacy(serviceKey),
    search_hospital: handleSearchHospital(serviceKey),
    search_animal_hospital: handleSearchAnimalHospital(serviceKey),
    search_rare_medicine: handleSearchRareMedicine(serviceKey),
    search_health_food: handleSearchHealthFood(serviceKey),
    search_bio_equivalence: handleSearchBioEquivalence(serviceKey),
    search_medicine_patent: handleSearchMedicinePatent(serviceKey),
    verify_business: handleVerifyBusiness(serviceKey),
    check_business_status: handleCheckBusinessStatus(serviceKey),
    search_onbid_pbanc_cltr_detail: handleSearchOnbidPbancCltrDetail(serviceKey),
    search_onbid_pbanc_list: handleSearchOnbidPbancList(serviceKey),
  });
}

export function registerPublicData(
  server: McpServer,
  serviceKey: string,
): void {
  const handler = createPublicDataHandler(serviceKey);

  server.tool(
    "public_data",
    "공공데이터 — 약국, 병원, 동물병원, 희귀의약품, 건강식품, 생동성인정품목, 의약품 특허, 온비드 공고목록/공고물건상세, 사업자등록 진위확인/상태조회 통합 도구",
    {
      action: z.enum(ACTIONS).describe(
        "search_pharmacy=약국검색(Q0=시도명) | search_hospital=병원검색(yadmNm=병원명) | search_animal_hospital=동물병원검색(QN=병원명) | search_rare_medicine=희귀의약품검색(item_name) | search_health_food=건강기능식품검색(prdlst_nm) | search_bio_equivalence=생동성인정품목검색(item_name) | search_medicine_patent=의약품특허정보검색(item_name) | search_onbid_pbanc_list=온비드공고목록(선택:onbid_list_filters_json) | search_onbid_pbanc_cltr_detail=온비드공고물건상세(pbancMngNo필수) | verify_business=사업자등록진위확인(b_no필수) | check_business_status=사업자등록상태조회(b_no필수)",
      ),
      Q0: z.string().optional().describe("시도명 (search_pharmacy)"),
      Q1: z.string().optional().describe("시군구명 (search_pharmacy)"),
      QN: z.string().optional().describe("약국명 (search_pharmacy)"),
      yadmNm: z.string().optional().describe("기관명 (search_hospital, search_animal_hospital)"),
      sidoCd: z.string().optional().describe("시도코드"),
      sgguCd: z.string().optional().describe("시군구코드"),
      clCd: z.string().optional().describe("종별코드"),
      dgsbjtCd: z.string().optional().describe("진료과목코드"),
      item_name: z.string().optional().describe("품목/제품명"),
      item_eng_name: z.string().optional().describe("품목 영문명"),
      entp_name: z.string().optional().describe("업체명"),
      ingr_name: z.string().optional().describe("성분명 한글"),
      ingr_eng_name: z.string().optional().describe("성분명 영문"),
      prdlst_nm: z.string().optional().describe("제품명 (search_health_food)"),
      b_no: z.string().optional().describe("사업자등록번호 (verify_business, check_business_status)"),
      start_dt: z.string().optional().describe("개업일자 (verify_business)"),
      p_nm: z.string().optional().describe("대표자명 (verify_business)"),
      b_nm: z.string().optional().describe("상호명 (verify_business)"),
      pbancMngNo: z.string().optional().describe("온비드 공고관리번호 (search_onbid_pbanc_cltr_detail, 예: 202406-21411-00)"),
      onbid_list_filters_json: z.string().optional().describe(
        "온비드 공고목록 추가 검색조건 JSON 객체 문자열 (search_onbid_pbanc_list, 공공데이터포털 명세의 영문 파라미터명 사용)",
      ),
      pageNo: z.number().optional(),
      numOfRows: z.number().optional(),
    },
    async (params) => handler(params as PublicDataParams),
  );
}
