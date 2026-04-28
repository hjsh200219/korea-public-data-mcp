/**
 * CourtListener REST API v4 타입 정의
 * https://www.courtlistener.com/api/rest/v4/
 *
 * Phase 0 검증된 응답 스키마 기반.
 */

/** /search/?type=o 의 results 항목 */
export interface USCaseSearchItem {
  /** 클러스터 ID — opinions[].id와 별개 */
  cluster_id: number;
  caseName: string;
  caseNameFull?: string;
  citation?: string[];
  citeCount?: number;
  /** 법원 표시 이름 (예: "Supreme Court of the United States") */
  court: string;
  /** 법원 슬러그 (예: "scotus", "ca1") */
  court_id: string;
  court_citation_string?: string;
  court_jurisdiction?: string | null;
  dateFiled?: string;
  dateArgued?: string | null;
  docketNumber?: string;
  docket_id?: number;
  judge?: string;
  absolute_url?: string;
  /** 의견(opinion) 배열 — 각 의견에 PDF/스니펫 포함 */
  opinions?: USCaseSearchOpinion[];
}

export interface USCaseSearchOpinion {
  id: number;
  author_id?: number | null;
  download_url?: string;
  local_path?: string;
  per_curiam?: boolean;
  snippet?: string;
  sha1?: string;
}

export interface USCaseSearchResult {
  count: number;
  next?: string | null;
  previous?: string | null;
  results: USCaseSearchItem[];
}

/** /opinions/{id}/ 응답 */
export interface USCaseDetail {
  id: number;
  resource_uri?: string;
  cluster_id?: number;
  cluster?: string;
  author_id?: number | null;
  per_curiam?: boolean;
  type?: string;
  /** 본문 (HTML/일반/Lawbox 변형 중 하나가 채워짐) */
  plain_text?: string;
  html?: string;
  html_lawbox?: string;
  html_columbia?: string;
  download_url?: string;
  local_path?: string;
  date_created?: string;
  date_modified?: string;
  sha1?: string;
}

/** searchUSCases 파라미터 */
export interface SearchUSCasesParams {
  query: string;
  page?: number;
  pageSize?: number;
  /** 법원 슬러그 (예: "scotus", "ca1") */
  court?: string;
  /** YYYY-MM-DD */
  dateFiledAfter?: string;
  dateFiledBefore?: string;
}
