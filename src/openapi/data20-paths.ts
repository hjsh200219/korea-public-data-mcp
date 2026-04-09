/**
 * 공공데이터포털 OpenAPI 경로 정의
 */

import { apiPath, jsonResponse, paginationParams, param } from "./shared.js";
import type { OpenApiPaths } from "./shared.js";

const BUSINESS_VERIFY_BODY = {
  required: true,
  content: {
    "application/json": {
      schema: {
        type: "object",
        properties: {
          businesses: {
            type: "array",
            items: {
              type: "object",
              properties: {
                b_no: { type: "string", description: "사업자등록번호 (10자리)" },
                start_dt: { type: "string", description: "개업일자 (YYYYMMDD)" },
                p_nm: { type: "string", description: "대표자명" },
                b_nm: { type: "string", description: "상호명" },
              },
              required: ["b_no", "start_dt", "p_nm"],
            },
          },
        },
      },
    },
  },
} as const;

const BUSINESS_STATUS_BODY = {
  required: true,
  content: {
    "application/json": {
      schema: {
        type: "object",
        properties: {
          b_no: { type: "array", items: { type: "string" }, description: "사업자등록번호 배열" },
        },
      },
    },
  },
} as const;

export function getData20Paths(): OpenApiPaths {
  return {
    ...apiPath({
      path: "/api/data20/pharmacy",
      operationId: "data20SearchPharmacy",
      summary: "약국 검색",
      description: "전국 약국 정보를 지역명·약국명으로 검색합니다.",
      parameters: [param("Q0", "시도명"), param("Q1", "시군구명"), param("QN", "약국명"), ...paginationParams],
      responses: jsonResponse("약국 검색 결과"),
    }),
    ...apiPath({
      path: "/api/data20/hospital",
      operationId: "data20SearchHospital",
      summary: "병원 검색",
      description: "전국 병원·의원 정보를 기관명·지역·종별·진료과목으로 검색합니다.",
      parameters: [
        param("yadmNm", "기관명"),
        param("sidoCd", "시도코드"),
        param("sgguCd", "시군구코드"),
        param("clCd", "종별코드"),
        param("dgsbjtCd", "진료과목코드"),
        ...paginationParams,
      ],
      responses: jsonResponse("병원 검색 결과"),
    }),
    ...apiPath({
      path: "/api/data20/stock-dividend",
      operationId: "data20SearchStockDividend",
      summary: "주식배당정보 조회",
      description: "상장기업의 주식 배당금·배당률 정보를 조회합니다.",
      parameters: [
        param("stckIssuCmpyNm", "회사명"),
        param("basDt", "기준일자 (YYYYMMDD)", { schema: { type: "string", pattern: "^\\d{8}$" } }),
        param("crno", "법인등록번호"),
        ...paginationParams,
      ],
      responses: jsonResponse("주식배당정보"),
    }),
    ...apiPath({
      path: "/api/data20/rare-medicine",
      operationId: "data20SearchRareMedicine",
      summary: "희귀의약품 검색",
      description: "희귀의약품의 품목명·업체명·효능효과 등을 검색합니다.",
      parameters: [param("item_name", "품목명"), param("entp_name", "업체명"), ...paginationParams],
      responses: jsonResponse("희귀의약품 검색 결과"),
    }),
    ...apiPath({
      path: "/api/data20/health-food",
      operationId: "data20SearchHealthFood",
      summary: "건강기능식품 검색",
      description: "건강기능식품의 제품명·업체명·원재료 등을 검색합니다.",
      parameters: [param("prdlst_nm", "제품명"), ...paginationParams],
      responses: jsonResponse("건강기능식품 검색 결과"),
    }),
    ...apiPath({
      path: "/api/data20/bio-equivalence",
      operationId: "data20SearchBioEquivalence",
      summary: "생동성인정품목 검색",
      description: "생물학적 동등성이 인정된 의약품(제네릭)의 품목기준코드·성분명·제형 등을 검색합니다.",
      parameters: [param("item_name", "제품명"), ...paginationParams],
      responses: jsonResponse("생동성인정품목 검색 결과"),
    }),
    ...apiPath({
      path: "/api/data20/medicine-patent",
      operationId: "data20SearchMedicinePatent",
      summary: "의약품 특허정보 검색",
      description: "의약품 국내 특허번호·특허일자·만료일·성분명 등을 검색합니다.",
      parameters: [
        param("item_name", "제품명 (한글)"),
        param("item_eng_name", "제품명 (영문)"),
        param("ingr_name", "성분명 (한글)"),
        param("ingr_eng_name", "성분명 (영문)"),
        ...paginationParams,
      ],
      responses: jsonResponse("의약품 특허정보 검색 결과"),
    }),
    ...apiPath({
      path: "/api/data20/onbid-pbanc-cltr-detail",
      operationId: "data20SearchOnbidPbancCltrDetail",
      summary: "온비드 공고물건상세 조회",
      description:
        "한국자산관리공사 차세대 온비드 공고관리번호(pbancMngNo) 기준 공매 물건 상세 목록을 조회합니다. (apis.data.go.kr B010003/OnbidPbancCltrDtlSrvc2/getPbancCltrInf2)",
      parameters: [
        param("pbancMngNo", "공고관리번호 (예: 202406-21411-00)", { required: true }),
        ...paginationParams,
      ],
      responses: jsonResponse("온비드 공고물건 상세 목록"),
    }),
    ...apiPath({
      path: "/api/data20/onbid-pbanc-list",
      operationId: "data20SearchOnbidPbancList",
      summary: "온비드 공고목록 조회",
      description:
        "차세대 온비드 공매 공고 목록을 조회합니다. 물건유형·재산유형·공고기간 등 추가 조건은 공공데이터포털 명세의 요청변수명을 쿼리스트링으로 넣으면 그대로 전달됩니다. (apis.data.go.kr B010003/OnbidPbancListSrvc2/getPbancList2)",
      parameters: [...paginationParams],
      responses: jsonResponse("온비드 공고 목록"),
    }),
    ...apiPath({
      path: "/api/data20/business-verify",
      method: "post",
      operationId: "data20VerifyBusiness",
      summary: "사업자등록 진위확인",
      description: "사업자등록번호·대표자명·개업일자로 진위를 확인합니다.",
      requestBody: { ...BUSINESS_VERIFY_BODY },
      responses: jsonResponse("사업자등록 진위확인 결과"),
    }),
    ...apiPath({
      path: "/api/data20/business-status",
      method: "post",
      operationId: "data20CheckBusinessStatus",
      summary: "사업자등록 상태조회",
      description: "사업자등록번호로 사업 상태(계속/휴업/폐업)를 조회합니다.",
      requestBody: { ...BUSINESS_STATUS_BODY },
      responses: jsonResponse("사업자등록 상태조회 결과"),
    }),
  };
}
