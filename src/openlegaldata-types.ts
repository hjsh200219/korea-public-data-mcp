/**
 * OpenLegalData API 타입 정의 (독일 판례)
 * https://de.openlegaldata.io/api/
 *
 * Phase 0 검증된 응답 스키마 기반.
 */

interface DECourtRef {
  id: number;
  name: string;
  slug: string;
  city?: number;
  state?: number;
  jurisdiction?: string;
  level_of_appeal?: string | null;
}

export interface DECaseSearchItem {
  id: number;
  slug: string;
  court: DECourtRef;
  /** Aktenzeichen */
  file_number: string;
  date: string;
  created_date?: string;
  updated_date?: string;
  /** "Urteil", "Beschluss" 등 */
  type: string;
  ecli?: string;
}

export interface DECaseSearchResult {
  count: number;
  next?: string | null;
  previous?: string | null;
  results: DECaseSearchItem[];
}

/** /cases/{id}/ 응답 */
export interface DECaseDetail extends DECaseSearchItem {
  content?: string;
  prev_decision?: number | null;
  source_url?: string;
  pdf_url?: string;
}

export interface SearchDECasesParams {
  query: string;
  page?: number;
  pageSize?: number;
  /** 법원 슬러그 (예: "bgh") */
  court?: string;
  dateFrom?: string;
  dateTo?: string;
}
