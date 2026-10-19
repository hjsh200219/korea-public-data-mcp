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

/** /cases/search/ 결과의 본문 일치 구간 (`<em>` 강조 포함) */
interface DESnippet {
  text: string;
  offset?: number;
  length?: number;
}

/**
 * /cases/search/?text= 응답 항목 (2026-10-19 실측 형상).
 * court 는 법원 코드 문자열이고 file_number·ecli 는 없다 — 상세(/cases/{id}/)에서 본다.
 */
export interface DECaseSearchItem {
  id: number;
  slug: string;
  /** 법원 코드 (예: "BGH", "BVerfG") */
  court: string;
  court_jurisdiction?: string | null;
  /** "Bundesgericht", "Oberlandesgericht", "Landgericht", "Amtsgericht" 등 */
  court_level_of_appeal?: string | null;
  date: string;
  /** "Urteil", "Beschluss" 등 */
  decision_type?: string | null;
  citing_cases_count?: number;
  snippets?: DESnippet[];
}

export interface DECaseSearchResult {
  count: number;
  next?: string | null;
  previous?: string | null;
  results: DECaseSearchItem[];
}

/** /cases/{id}/ 응답 */
export interface DECaseDetail {
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
  content?: string;
  prev_decision?: number | null;
  source_url?: string;
  pdf_url?: string;
}

export interface SearchDECasesParams {
  query: string;
  page?: number;
  pageSize?: number;
  /** 법원 코드 (예: "BGH", "BVerfG") — 대소문자 구분. 연방법원 7곳은 대소문자 무관 입력 허용 */
  court?: string;
  /** 심급 (court_level_of_appeal, 예: "Bundesgericht") */
  courtLevel?: string;
  dateFrom?: string;
  dateTo?: string;
}
