/**
 * CourtListener REST API v4 — 정규화 도메인 타입
 * https://www.courtlistener.com/api/rest/v4/
 *
 * 정규화 원칙:
 * - camelCase 필드 (원본 응답의 snake_case/camelCase 혼재를 통일)
 * - cursor 페이지네이션 (v4 native — page 모델 미사용)
 * - List item 과 Detail 을 별개 인터페이스로 분리 (의미가 다른 필드 혼동 방지)
 */

export const JURISDICTION_VALUES = [
  "us-federal",
  "us-state",
  "us-scotus",
] as const;

export const PRECEDENTIAL_STATUS_VALUES = [
  "Published",
  "Unpublished",
  "Errata",
  "Separate",
  "In-chambers",
  "Relating-to",
  "Unknown",
] as const;

export type Jurisdiction = (typeof JURISDICTION_VALUES)[number];
export type PrecedentialStatus = (typeof PRECEDENTIAL_STATUS_VALUES)[number];

export interface OpinionSearchParams {
  query: string;
  cursor?: string;
  pageSize?: number; // CourtListener 최대 100
  jurisdiction?: Jurisdiction;
  court?: string; // CourtListener 법원 slug (예: "scotus", "ca9")
  dateFrom?: string; // YYYY-MM-DD
  dateTo?: string;
  precedentialStatus?: PrecedentialStatus;
}

export interface OpinionListItem {
  id: number; // opinion id
  clusterId: number;
  caseName: string;
  citation: string | null;
  decisionDate: string | null;
  court: string;
  courtSlug: string;
  jurisdiction: string;
  precedentialStatus: string;
  snippet: string | null;
  absoluteUrl: string;
  citationCount: number | null;
}

/**
 * Opinion 상세 — list item 과 별개의 fresh 인터페이스.
 * (extends 하지 않는다: list 에서 의미 있던 snippet/citationCount 등은 detail 에서 미사용.)
 */
export interface OpinionDetail {
  id: number;
  clusterId: number;
  caseName: string;
  citation: string | null;
  decisionDate: string | null;
  court: string;
  courtSlug: string;
  precedentialStatus: string;
  absoluteUrl: string;
  judges: string | null;
  plainText: string;
  citedOpinions: number[];
}

export interface ClusterDetail {
  id: number;
  caseName: string;
  caseNameShort: string | null;
  decisionDate: string | null;
  court: string;
  courtSlug: string;
  citations: string[];
  precedentialStatus: string;
  judges: string | null;
  subOpinions: { id: number; type: string; absoluteUrl: string }[];
  absoluteUrl: string;
}

export interface CourtListItem {
  id: string; // court slug
  fullName: string;
  shortName: string;
  jurisdiction: string;
}

/**
 * Cursor 페이지네이션 응답 — page 필드 없음.
 * CourtListener v4 is cursor-native; page-based mapping would require client-side state.
 * totalCount? is optional because cursor responses don't always include it.
 */
export interface SearchOpinionsResult {
  items: OpinionListItem[];
  nextCursor?: string;
  totalCount?: number;
}

/**
 * getOpinion 옵션. includeCluster=false (기본) 면 cluster 메타데이터를
 * 추가 fetch하지 않고 본문만 빠르게 반환 → MCP plain_text-only 호출에서 N+1 방지.
 */
export interface GetOpinionOptions {
  includeCluster?: boolean;
}

export interface CourtListenerClient {
  searchOpinions(params: OpinionSearchParams): Promise<SearchOpinionsResult>;
  getOpinion(opinionId: number, options?: GetOpinionOptions): Promise<OpinionDetail>;
  getCluster(clusterId: number): Promise<ClusterDetail>;
  listCourts(jurisdiction?: string): Promise<CourtListItem[]>;
}
