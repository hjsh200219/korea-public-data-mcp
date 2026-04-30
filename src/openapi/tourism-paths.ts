/**
 * 한국관광공사 KorService2 OpenAPI 경로 정의
 */

import { apiPath, jsonResponse, paginationParams, param } from "./shared.js";
import type { OpenApiPaths } from "./shared.js";

const CONTENT_TYPE_ID_DESC = "관광타입ID (12=관광지, 14=문화시설, 15=축제, 25=여행코스, 28=레포츠, 32=숙박, 38=쇼핑, 39=음식점)";
const ARRANGE_DESC = "정렬 A=제목순 B=조회순 C=수정일순 D=생성일순";

export function getTourismPaths(): OpenApiPaths {
  return {
    ...apiPath({
      path: "/api/tourism/area-code",
      operationId: "tourismGetAreaCode",
      summary: "지역코드 조회",
      description: "시도·시군구 지역코드를 조회합니다. areaCode 미입력 시 시도 목록, 입력 시 해당 시도의 시군구 목록 반환.",
      parameters: [param("areaCode", "시도코드 (미입력 시 전체 시도 목록)"), ...paginationParams],
      responses: jsonResponse("지역코드 목록"),
    }),
    ...apiPath({
      path: "/api/tourism/category-code",
      operationId: "tourismGetCategoryCode",
      summary: "서비스분류코드 조회",
      description: "관광 서비스 대·중·소 분류코드를 조회합니다.",
      parameters: [
        param("contentTypeId", CONTENT_TYPE_ID_DESC),
        param("cat1", "대분류 코드"),
        param("cat2", "중분류 코드"),
        param("cat3", "소분류 코드"),
        ...paginationParams,
      ],
      responses: jsonResponse("서비스분류코드 목록"),
    }),
    ...apiPath({
      path: "/api/tourism/area-based",
      operationId: "tourismSearchAreaBased",
      summary: "지역기반 관광정보 조회",
      description: "지역코드·관광타입·분류코드 기준으로 관광정보 목록을 조회합니다.",
      parameters: [
        param("areaCode", "지역코드"),
        param("sigunguCode", "시군구코드"),
        param("contentTypeId", CONTENT_TYPE_ID_DESC),
        param("cat1", "대분류"), param("cat2", "중분류"), param("cat3", "소분류"),
        param("arrange", ARRANGE_DESC),
        ...paginationParams,
      ],
      responses: jsonResponse("지역기반 관광정보 목록"),
    }),
    ...apiPath({
      path: "/api/tourism/search-keyword",
      operationId: "tourismSearchKeyword",
      summary: "키워드 관광정보 검색",
      description: "키워드로 관광정보를 검색합니다.",
      parameters: [
        param("keyword", "검색어", { required: true }),
        param("areaCode", "지역코드"),
        param("sigunguCode", "시군구코드"),
        param("contentTypeId", CONTENT_TYPE_ID_DESC),
        param("cat1", "대분류"),
        param("arrange", ARRANGE_DESC),
        ...paginationParams,
      ],
      responses: jsonResponse("키워드 검색 결과"),
    }),
    ...apiPath({
      path: "/api/tourism/location-based",
      operationId: "tourismSearchLocationBased",
      summary: "위치기반 관광정보 조회",
      description: "GPS 좌표(WGS84) 기준 반경 내 관광정보를 조회합니다.",
      parameters: [
        param("mapX", "경도 WGS84", { required: true }),
        param("mapY", "위도 WGS84", { required: true }),
        param("radius", "반경 (미터, 최대 20000)", { required: true }),
        param("contentTypeId", CONTENT_TYPE_ID_DESC),
        param("areaCode", "지역코드"),
        param("arrange", ARRANGE_DESC),
        ...paginationParams,
      ],
      responses: jsonResponse("위치기반 관광정보 목록"),
    }),
    ...apiPath({
      path: "/api/tourism/festival",
      operationId: "tourismSearchFestival",
      summary: "축제·공연·행사 검색",
      description: "행사 시작일 기준으로 축제·공연·행사 정보를 검색합니다.",
      parameters: [
        param("eventStartDate", "행사시작일 YYYYMMDD", { required: true, schema: { type: "string", pattern: "^\\d{8}$" } }),
        param("eventEndDate", "행사종료일 YYYYMMDD", { schema: { type: "string", pattern: "^\\d{8}$" } }),
        param("areaCode", "지역코드"),
        param("sigunguCode", "시군구코드"),
        param("arrange", ARRANGE_DESC),
        ...paginationParams,
      ],
      responses: jsonResponse("축제·공연·행사 목록"),
    }),
    ...apiPath({
      path: "/api/tourism/stay",
      operationId: "tourismSearchStay",
      summary: "숙박 검색",
      description: "지역코드 기준으로 숙박 정보를 검색합니다.",
      parameters: [
        param("areaCode", "지역코드"),
        param("sigunguCode", "시군구코드"),
        param("arrange", ARRANGE_DESC),
        ...paginationParams,
      ],
      responses: jsonResponse("숙박 목록"),
    }),
    ...apiPath({
      path: "/api/tourism/detail-common",
      operationId: "tourismGetDetailCommon",
      summary: "관광정보 공통정보 조회",
      description: "contentId 기준으로 관광정보 공통정보(제목·주소·개요·이미지·좌표 등)를 조회합니다.",
      parameters: [param("contentId", "콘텐츠 ID", { required: true })],
      responses: jsonResponse("공통정보"),
    }),
    ...apiPath({
      path: "/api/tourism/detail-intro",
      operationId: "tourismGetDetailIntro",
      summary: "관광정보 소개정보 조회",
      description: "contentId·contentTypeId 기준으로 타입별 소개정보를 조회합니다.",
      parameters: [
        param("contentId", "콘텐츠 ID", { required: true }),
        param("contentTypeId", CONTENT_TYPE_ID_DESC, { required: true }),
      ],
      responses: jsonResponse("소개정보"),
    }),
    ...apiPath({
      path: "/api/tourism/detail-info",
      operationId: "tourismGetDetailInfo",
      summary: "관광정보 반복정보 조회",
      description: "contentId·contentTypeId 기준으로 반복 제공 정보(체험, 주차 등)를 조회합니다.",
      parameters: [
        param("contentId", "콘텐츠 ID", { required: true }),
        param("contentTypeId", CONTENT_TYPE_ID_DESC, { required: true }),
        ...paginationParams,
      ],
      responses: jsonResponse("반복정보"),
    }),
    ...apiPath({
      path: "/api/tourism/detail-image",
      operationId: "tourismGetDetailImage",
      summary: "관광정보 이미지정보 조회",
      description: "contentId 기준으로 이미지 목록을 조회합니다.",
      parameters: [param("contentId", "콘텐츠 ID", { required: true }), ...paginationParams],
      responses: jsonResponse("이미지 목록"),
    }),
    ...apiPath({
      path: "/api/tourism/area-sync",
      operationId: "tourismGetAreaBasedSync",
      summary: "지역기반 동기화 목록 조회",
      description: "수정일시 이후 변경된 관광정보 목록을 조회합니다 (콘텐츠 동기화용).",
      parameters: [
        param("areaCode", "지역코드"),
        param("sigunguCode", "시군구코드"),
        param("contentTypeId", CONTENT_TYPE_ID_DESC),
        param("modifiedtime", "수정일시 YYYYMMDDHHMMSS"),
        ...paginationParams,
      ],
      responses: jsonResponse("동기화 목록"),
    }),
    ...apiPath({
      path: "/api/tourism/ldong-code",
      operationId: "tourismGetLdongCode",
      summary: "법정동코드 조회",
      description: "법정동코드 목록을 조회합니다.",
      parameters: [param("areaCode", "지역코드"), param("sigunguCode", "시군구코드"), ...paginationParams],
      responses: jsonResponse("법정동코드 목록"),
    }),
    ...apiPath({
      path: "/api/tourism/lclssystm-code",
      operationId: "tourismGetLclsSystmCode",
      summary: "관광타입 소분류 코드 조회",
      description: "관광타입ID별 소분류 시스템코드를 조회합니다.",
      parameters: [param("lclsSystmCode", "소분류코드"), ...paginationParams],
      responses: jsonResponse("소분류코드 목록"),
    }),
  };
}
