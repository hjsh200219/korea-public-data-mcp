/**
 * CourtListener OpenAPI 경로 정의 (미국 판례)
 *
 * v4 cursor 페이지네이션 + 정규화 도메인 응답 (camelCase).
 */

import { apiPath, jsonResponse, param } from "./shared.js";
import type { OpenApiPaths } from "./shared.js";

const COURTLISTENER_TAG = ["courtlistener"];

export function getCourtlistenerPaths(): OpenApiPaths {
  return {
    ...apiPath({
      path: "/api/courtlistener/search",
      operationId: "courtlistenerSearch",
      summary: "미국 판례 검색 (CourtListener)",
      description:
        "CourtListener REST API v4를 통해 미국 판례를 검색합니다. cursor 페이지네이션, 본문/메타데이터는 영어 원문으로 제공됩니다.",
      parameters: [
        param("q", "검색어", { required: true, schema: { type: "string" } }),
        param("cursor", "페이지네이션 cursor 토큰 (CourtListener v4 native)", {
          schema: { type: "string" },
        }),
        param("page_size", "페이지당 결과 수 (최대 100)", {
          schema: { type: "integer", default: 20 },
        }),
        param("jurisdiction", "관할", {
          schema: {
            type: "string",
            enum: ["us-federal", "us-state", "us-scotus"],
          },
        }),
        param("court", "법원 슬러그 (예: scotus, ca1, ca9, dcd)", {
          schema: { type: "string" },
        }),
        param("filed_after", "판결일 시작 (YYYY-MM-DD)", {
          schema: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
        }),
        param("filed_before", "판결일 종료 (YYYY-MM-DD)", {
          schema: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
        }),
        param("precedential_status", "선판례 상태 필터", {
          schema: {
            type: "string",
            enum: [
              "Published",
              "Unpublished",
              "Errata",
              "Separate",
              "In-chambers",
              "Relating-to",
              "Unknown",
            ],
          },
        }),
      ],
      responses: jsonResponse("미국 판례 검색 결과 (정규화 OpinionListItem 배열 + nextCursor)"),
      tags: COURTLISTENER_TAG,
    }),
    ...apiPath({
      path: "/api/courtlistener/opinions/{opinionId}",
      operationId: "courtlistenerGetOpinion",
      summary: "미국 판례 Opinion 상세",
      description:
        "Opinion ID로 판례 본문(영어 원문) 및 cluster 메타데이터를 조회합니다. REST는 full text 반환 (MCP 측에서만 truncate).",
      parameters: [
        param("opinionId", "opinion_id (CourtListener)", {
          in: "path",
          required: true,
          schema: { type: "integer" },
        }),
      ],
      responses: jsonResponse("정규화 OpinionDetail (plainText + 메타데이터)"),
      tags: COURTLISTENER_TAG,
    }),
    ...apiPath({
      path: "/api/courtlistener/clusters/{clusterId}",
      operationId: "courtlistenerGetCluster",
      summary: "미국 판례 Cluster 상세",
      description:
        "Cluster ID로 판례군 메타데이터(케이스명, 인용, 서브 의견 목록)를 조회합니다.",
      parameters: [
        param("clusterId", "cluster_id (CourtListener)", {
          in: "path",
          required: true,
          schema: { type: "integer" },
        }),
      ],
      responses: jsonResponse("정규화 ClusterDetail"),
      tags: COURTLISTENER_TAG,
    }),
    ...apiPath({
      path: "/api/courtlistener/courts",
      operationId: "courtlistenerListCourts",
      summary: "CourtListener 법원 목록",
      description:
        "CourtListener에 등록된 법원 목록을 jurisdiction 코드로 필터링하여 조회합니다.",
      parameters: [
        param(
          "jurisdiction",
          "CourtListener jurisdiction 코드 (F=federal, S=state 등)",
          { schema: { type: "string" } },
        ),
      ],
      responses: jsonResponse("CourtListItem 배열"),
      tags: COURTLISTENER_TAG,
    }),
  };
}
