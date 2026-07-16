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
  searchPharmacy, searchHospital, getHospitalDetail,
  searchRareMedicine, searchHealthFood,
  searchBioEquivalence, searchMedicinePatent,
  verifyBusiness, checkBusinessStatus,
  searchOnbidPbancCltrDetail,
  searchOnbidPbancList,
} from "../../data20-api.js";
import type { PharmacyItem, HospitalItem } from "../../data20-types.js";
import { errorResponse, truncate } from "../../shared.js";
import { resolveHiraRegionCode } from "../../hira-region-codes.js";
import { createDispatcher, requireParam, registerSkillTool, type SkillResult } from "./_shared.js";

const ACTIONS = [
  "search_pharmacy",
  "search_hospital",
  "get_hospital_detail",
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
  /** 암호화 요양기호 — get_hospital_detail 상세조회 키 (search_hospital 결과에서 획득) */
  ykiho?: string;
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

/**
 * HIRA 약국/병원 API가 Q0/Q1을 무시하고 전국 결과를 반환하는 경우가 잦아,
 * 응답의 sidoCdNm/sgguCdNm 한글 텍스트로 클라이언트 사이드에서 부분일치 재필터.
 */
function filterByRegion<T extends { sidoCdNm?: string; sgguCdNm?: string }>(
  items: T[],
  sido?: string,
  sggu?: string,
): T[] {
  const sd = sido?.trim();
  const sg = sggu?.trim();
  if (!sd && !sg) return items;
  return items.filter((it) => {
    if (sd && !String(it.sidoCdNm ?? "").includes(sd)) return false;
    if (sg && !String(it.sgguCdNm ?? "").includes(sg)) return false;
    return true;
  });
}

/** Q0/Q1 입력 시 최대 페이지 수 (원격 HIRA 부하 방지) */
const REGION_FILTER_MAX_PAGES = 3;
/** Q0/Q1 입력 시 페이지당 기본 행 수 (재필터 후 충분한 매칭 확보) */
const REGION_FILTER_NUM_ROWS = 100;

/**
 * Q0/Q1 → HIRA raw sidoCd/sgguCd 매핑 시도. 매핑 성공 시:
 * - raw 코드 주입
 * - Q0/Q1 비움 (HIRA가 한글 파라미터를 무시하므로 함께 보내도 무관하지만 명시적 제거)
 * - 사용자가 이미 raw 코드 직접 지정 시 매핑 skip
 */
function applyRegionCodeMapping(p: PublicDataParams): { params: PublicDataParams; mapped: boolean } {
  const userProvidedRawCode = Boolean(p.sidoCd || p.sgguCd);
  if (userProvidedRawCode) return { params: p, mapped: false };
  const r = resolveHiraRegionCode({ Q0: p.Q0, Q1: p.Q1 });
  if (!r.matched) return { params: p, mapped: false };
  const next: PublicDataParams = { ...p, Q0: "", Q1: "" };
  if (r.sidoCd) next.sidoCd = r.sidoCd;
  if (r.sgguCd) next.sgguCd = r.sgguCd;
  return { params: next, mapped: true };
}

/**
 * Q0/Q1 입력 + pageNo 미지정 시 자동으로 최대 N페이지 수집.
 * 원격 totalCount가 한 페이지로 충분하거나 pageNo 명시 시 단일 호출.
 * raw 코드 매핑 성공 시 서버측 필터가 동작하므로 다중 페이지 수집 skip.
 */
async function collectPagesPharmacy(
  serviceKey: string,
  raw: PublicDataParams,
): Promise<{ items: PharmacyItem[]; totalCount: number; pageNo: number; pagesFetched: number; rawCodeMapped: boolean }> {
  const { params: p, mapped } = applyRegionCodeMapping(raw);
  const hasRegion = Boolean(raw.Q0 || raw.Q1);
  // 매핑 성공 시 서버측 필터 동작 → 큰 페이지 불필요 (10이면 충분), 다중페이지도 불필요
  const numRows = p.numOfRows ?? (hasRegion && !mapped ? REGION_FILTER_NUM_ROWS : 10);
  const startPage = p.pageNo ?? 1;
  const first = await searchPharmacy(serviceKey, { ...p, numOfRows: numRows, pageNo: startPage });
  if (!hasRegion || mapped || p.pageNo !== undefined) {
    return { items: first.items, totalCount: first.totalCount, pageNo: first.pageNo, pagesFetched: 1, rawCodeMapped: mapped };
  }
  const totalPages = Math.ceil(first.totalCount / numRows);
  const maxPages = Math.min(REGION_FILTER_MAX_PAGES, totalPages);
  const aggregated = [...first.items];
  for (let pg = 2; pg <= maxPages; pg++) {
    const more = await searchPharmacy(serviceKey, { ...p, numOfRows: numRows, pageNo: pg });
    aggregated.push(...more.items);
  }
  return { items: aggregated, totalCount: first.totalCount, pageNo: first.pageNo, pagesFetched: maxPages, rawCodeMapped: mapped };
}

async function collectPagesHospital(
  serviceKey: string,
  raw: PublicDataParams,
): Promise<{ items: HospitalItem[]; totalCount: number; pageNo: number; pagesFetched: number; rawCodeMapped: boolean }> {
  const { params: p, mapped } = applyRegionCodeMapping(raw);
  const hasRegion = Boolean(raw.Q0 || raw.Q1);
  const numRows = p.numOfRows ?? (hasRegion && !mapped ? REGION_FILTER_NUM_ROWS : 10);
  const startPage = p.pageNo ?? 1;
  const first = await searchHospital(serviceKey, { ...p, numOfRows: numRows, pageNo: startPage });
  if (!hasRegion || mapped || p.pageNo !== undefined) {
    return { items: first.items, totalCount: first.totalCount, pageNo: first.pageNo, pagesFetched: 1, rawCodeMapped: mapped };
  }
  const totalPages = Math.ceil(first.totalCount / numRows);
  const maxPages = Math.min(REGION_FILTER_MAX_PAGES, totalPages);
  const aggregated = [...first.items];
  for (let pg = 2; pg <= maxPages; pg++) {
    const more = await searchHospital(serviceKey, { ...p, numOfRows: numRows, pageNo: pg });
    aggregated.push(...more.items);
  }
  return { items: aggregated, totalCount: first.totalCount, pageNo: first.pageNo, pagesFetched: maxPages, rawCodeMapped: mapped };
}

function regionFilterNote(
  filtered: number,
  rawLen: number,
  totalCount: number,
  sido?: string,
  sggu?: string,
): string {
  const label = [sido, sggu].filter(Boolean).join(" ");
  if (!label) return "";
  if (filtered < rawLen) {
    return `※ 원격 API가 지역 필터(${label})를 무시한 응답으로 보여, 시도/시군구 명칭이 일치하는 ${filtered}건만 표시합니다 (원격 totalCount=${totalCount}).\n\n`;
  }
  if (totalCount > 1000) {
    return `※ totalCount=${totalCount}이 비정상적으로 큽니다. 원격 API가 지역 필터(${label})를 반영하지 않았을 수 있습니다.\n\n`;
  }
  return "";
}

function handleSearchPharmacy(serviceKey: string) {
  return async (p: PublicDataParams): Promise<SkillResult> => {
    try {
      const result = await collectPagesPharmacy(serviceKey, p);
      if (result.items.length === 0) {
        return { content: [{ type: "text", text: "검색 결과가 없습니다." }] };
      }
      const filtered = filterByRegion(result.items, p.Q0, p.Q1);
      if (filtered.length === 0 && result.items.length > 0 && (p.Q0 || p.Q1)) {
        const label = [p.Q0, p.Q1].filter(Boolean).join(" ");
        return {
          content: [{
            type: "text",
            text:
              `「${label}」에 해당하는 약국이 응답에 없습니다. ` +
              `원격 API는 ${result.pagesFetched}페이지(${result.items.length}건)를 반환했으나 시도/시군구 명칭 일치 항목이 없습니다 (원격 totalCount=${result.totalCount}). ` +
              `Q0(시도명)·Q1(시군구명)에 한글 명칭을 정확히 입력했는지 확인하세요. HIRA getParmacyBasisList가 해당 파라미터를 무시하는 경우가 있어, 클라이언트에서 재필터합니다.`,
          }],
        };
      }
      const note = regionFilterNote(filtered.length, result.items.length, result.totalCount, p.Q0, p.Q1);
      const displayTotal = (p.Q0 || p.Q1) ? filtered.length : result.totalCount;
      const pageInfo = result.pagesFetched > 1
        ? `${result.pagesFetched}페이지 수집`
        : `${result.pageNo}페이지`;
      const header = `${note}약국 검색결과 — 총 ${displayTotal}건 (${pageInfo})\n`;
      const lines = filtered.map((ph) =>
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
      const result = await collectPagesHospital(serviceKey, p);
      if (result.items.length === 0) {
        return { content: [{ type: "text", text: "검색 결과가 없습니다." }] };
      }
      const filtered = filterByRegion(result.items, p.Q0, p.Q1);
      if (filtered.length === 0 && result.items.length > 0 && (p.Q0 || p.Q1)) {
        const label = [p.Q0, p.Q1].filter(Boolean).join(" ");
        return {
          content: [{
            type: "text",
            text:
              `「${label}」에 해당하는 병원이 응답에 없습니다. ` +
              `원격 API는 ${result.pagesFetched}페이지(${result.items.length}건)를 반환했으나 시도/시군구 명칭 일치 항목이 없습니다 (원격 totalCount=${result.totalCount}). ` +
              `Q0/Q1은 한글 시도·시군구명, sidoCd/sgguCd는 HIRA 자체 코드(행안부 법정동코드 아님)입니다. yadmNm(병원명) 또는 clCd(28=요양병원, 01=상급종합 등) 동시 지정도 권장합니다.`,
          }],
        };
      }
      const note = regionFilterNote(filtered.length, result.items.length, result.totalCount, p.Q0, p.Q1);
      const displayTotal = (p.Q0 || p.Q1) ? filtered.length : result.totalCount;
      const pageInfo = result.pagesFetched > 1
        ? `${result.pagesFetched}페이지 수집`
        : `${result.pageNo}페이지`;
      const header = `${note}병원 검색결과 — 총 ${displayTotal}건 (${pageInfo})\n`;
      const lines = filtered.map((h) =>
        `• ${s(h.yadmNm)} (${s(h.clCdNm)})\n  주소: ${s(h.addr)}\n  전화: ${s(h.telno)}\n  진료과목: ${s(h.dgsbjtCdNm)}\n  의사수: ${s(h.drTotCnt)}명\n  ykiho: ${s(h.ykiho)}`,
      );
      const footer =
        "\n\n[상세정보 더보기] action=get_hospital_detail, ykiho=위 값 → 세부·시설·진료과목·의료장비·교통 상세 조회";
      return { content: [{ type: "text", text: truncate(header + "\n" + lines.join("\n\n") + footer) }] };
    } catch (error) {
      return errorResponse("병원 검색", error);
    }
  };
}

/** 상세 섹션 항목을 key=value 압축 렌더 (오퍼레이션별 필드 상이 → 제네릭) */
function renderDetailItems(items: Record<string, unknown>[]): string {
  return items
    .map((it, idx) => {
      const pairs = Object.entries(it)
        .filter(([, v]) => v !== null && v !== undefined && String(v).trim() !== "")
        .map(([k, v]) => `${k}=${String(v).trim()}`);
      return `    [${idx + 1}] ${pairs.join(", ")}`;
    })
    .join("\n");
}

function handleGetHospitalDetail(serviceKey: string) {
  return async (p: PublicDataParams): Promise<SkillResult> => {
    const err = requireParam(p as Record<string, unknown>, "ykiho", "get_hospital_detail");
    if (err) return err;
    try {
      const ykiho = p.ykiho!.trim();
      const sections = await getHospitalDetail(serviceKey, ykiho);
      // 전 섹션이 접근거부(평문 Forbidden 또는 HTTP 403) → 활용신청 미승인 안내
      // (로컬 egress는 평문 "Forbidden", Railway egress는 HTTP 403으로 응답)
      if (sections.every((sec) => sec.error && /forbidden|403/i.test(sec.error))) {
        return {
          content: [{
            type: "text",
            text:
              "의료기관별상세정보서비스(data.go.kr 15001699) 활용신청이 승인되지 않았습니다. " +
              "DATA20_SERVICE_KEY 소유 계정으로 15001699 활용신청 후(개발계정 즉시 승인, 게이트웨이 반영 최대 수십 분) 재시도하세요.",
          }],
        };
      }
      const blocks = sections.map((sec) => {
        if (sec.error) return `■ ${sec.label}\n    (조회 실패: ${sec.error})`;
        if (sec.items.length === 0) return `■ ${sec.label}\n    (데이터 없음)`;
        return `■ ${sec.label} — ${sec.items.length}건\n${renderDetailItems(sec.items)}`;
      });
      const header = `의료기관 상세정보 (ykiho=${truncate(ykiho, 40)})\n`;
      return { content: [{ type: "text", text: truncate(header + "\n" + blocks.join("\n\n")) }] };
    } catch (error) {
      return errorResponse("의료기관 상세정보 조회", error);
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

      const q = p.prdlst_nm?.trim();
      let items = result.items;
      let headerNote = "";
      let displayTotal = result.totalCount;

      if (q) {
        const filtered = result.items.filter((f) => String(f.PRDUCT ?? "").includes(q));
        if (filtered.length === 0) {
          return {
            content: [{
              type: "text",
              text:
                `제품명에「${q}」이(가) 포함된 항목이 없습니다. 원격 API는 ${result.items.length}건을 반환했으나 제품명(PRDUCT)에 검색어가 없습니다. ` +
                `HtfsInfoService03/getHtfsItem01이 prdlst_nm을 무시하는 경우가 있어, 공공데이터포털 명세·데이터 개선요청을 참고하세요.`,
            }],
          };
        }
        if (filtered.length < result.items.length) {
          headerNote =
            "※ 원격 API가 제품명(prdlst_nm) 필터를 반영하지 않은 응답으로 보여, 제품명에 검색어가 포함된 항목만 표시합니다.\n\n";
          displayTotal = filtered.length;
        }
        items = filtered;
      }

      const header =
        `${headerNote}건강기능식품 검색결과 — 총 ${displayTotal}건 (${result.pageNo}페이지)\n`;
      const lines = items.map((f) =>
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
    get_hospital_detail: handleGetHospitalDetail(serviceKey),
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

  registerSkillTool(server, {
    name: "public_data",
    title: "Public Data / 공공데이터 통합",
    description: "Public Data — pharmacies, hospitals, veterinary clinics, rare drugs, health foods, bioequivalence items, drug patents, OnBid auction listings, and business registration verification. / 공공데이터 — 약국, 병원, 동물병원, 희귀의약품, 건강식품, 생동성인정품목, 의약품 특허, 온비드 공고목록/공고물건상세, 사업자등록 진위확인/상태조회 통합 도구",
    inputSchema: {
      action: z.enum(ACTIONS).describe(
        "search_pharmacy=약국검색(Q0=시도명한글,Q1=시군구명한글) | search_hospital=병원검색(yadmNm=병원명, Q0/Q1=지역재필터, 결과에 ykiho 포함) | get_hospital_detail=병원상세정보더보기(ykiho필수 — 세부·시설·진료과목·의료장비·교통) | search_animal_hospital=동물병원검색(QN=병원명) | search_rare_medicine=희귀의약품검색(item_name) | search_health_food=건강기능식품검색(prdlst_nm) | search_bio_equivalence=생동성인정품목검색(item_name) | search_medicine_patent=의약품특허정보검색(item_name) | search_onbid_pbanc_list=온비드공고목록(선택:onbid_list_filters_json) | search_onbid_pbanc_cltr_detail=온비드공고물건상세(pbancMngNo필수) | verify_business=사업자등록진위확인(b_no필수) | check_business_status=사업자등록상태조회(b_no필수)",
      ),
      Q0: z.string().optional().describe(
        "시도명 한글 텍스트 (예: '서울', '경기'). search_pharmacy/search_hospital의 지역 필터. HIRA 원격 API가 무시하는 경우가 잦아 클라이언트에서 응답의 sidoCdNm으로 부분일치 재필터됨",
      ),
      Q1: z.string().optional().describe(
        "시군구명 한글 텍스트 (예: '강남구', '하남'). search_pharmacy/search_hospital의 지역 필터. 클라이언트에서 응답의 sgguCdNm으로 부분일치 재필터됨",
      ),
      QN: z.string().optional().describe("약국명 (search_pharmacy)"),
      yadmNm: z.string().optional().describe("기관명 (search_hospital, search_animal_hospital)"),
      sidoCd: z.string().optional().describe(
        "HIRA 자체 시도코드 (예: '110000' 서울, 행안부 법정동코드 아님). 코드를 모르면 Q0(시도명 한글) 사용 권장",
      ),
      sgguCd: z.string().optional().describe(
        "HIRA 자체 시군구코드 (행안부 법정동코드 아님). 코드를 모르면 Q1(시군구명 한글) 사용 권장",
      ),
      clCd: z.string().optional().describe(
        "HIRA 종별코드 — 01=상급종합병원, 11=종합병원, 21=병원, 28=요양병원, 31=의원, 41=치과병원, 51=치과의원, 71=한방병원, 81=한의원, 91=조산원, 92=보건소 등. clCd 미지정 시 응답이 매우 커서 타임아웃 가능",
      ),
      dgsbjtCd: z.string().optional().describe(
        "HIRA 진료과목코드 — 01=내과, 02=신경과, 03=정신건강의학과, 04=외과, 05=정형외과, 14=재활의학과 등",
      ),
      ykiho: z.string().optional().describe(
        "암호화 요양기호 (get_hospital_detail 필수). search_hospital 결과의 ykiho 값을 그대로 사용",
      ),
      item_name: z.string().optional().describe("품목/제품명"),
      item_eng_name: z.string().optional().describe("품목 영문명"),
      entp_name: z.string().optional().describe("업체명"),
      ingr_name: z.string().optional().describe("성분명 한글"),
      ingr_eng_name: z.string().optional().describe("성분명 영문"),
      prdlst_nm: z.string().optional().describe(
        "제품명 부분일치 (search_health_food 권장 — 미입력 시 전체 목록에 가깝게 나올 수 있음)",
      ),
      b_no: z.string().optional().describe("사업자등록번호 (verify_business, check_business_status)"),
      start_dt: z.string().optional().describe("개업일자 (verify_business)"),
      p_nm: z.string().optional().describe("대표자명 (verify_business)"),
      b_nm: z.string().optional().describe("상호명 (verify_business)"),
      pbancMngNo: z.string().optional().describe("온비드 공고관리번호 (search_onbid_pbanc_cltr_detail, 예: 202406-21411-00)"),
      onbid_list_filters_json: z.string().optional().describe(
        "온비드 공고목록 추가 검색조건 JSON 객체 문자열 (search_onbid_pbanc_list, 공공데이터포털 명세의 영문 파라미터명 사용)",
      ),
      pageNo: z.number().optional().describe("페이지 번호 (기본값: 1)"),
      numOfRows: z.number().optional().describe("페이지당 결과 수 (기본값: 10)"),
    },
    callback: async (params) => handler(params as PublicDataParams),
  });
}
