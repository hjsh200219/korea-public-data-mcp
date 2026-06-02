/**
 * 정부24 plus AI 검색(beta) — SSE 응답 파싱 결과 타입
 *
 * 비공식 reverse-engineered 엔드포인트(`/ai/search_beta/api/fabrix/chat`)의
 * text/event-stream 응답을 구조화한 결과. 원본 `sourceInfo.additionalInfo`는
 * 필드가 매우 크므로(구비서류·처리절차 등 수 KB) 유용 필드만 추려 trim한다.
 */

/** RAG 출처 1건 — 민원 안내 문서 + 트림된 메타 */
export interface Gov24AiReference {
  title: string;
  filename?: string;
  docId?: string;
  rank?: number;
  searchScore?: number;
  rerankScore?: number;
  /** sourceInfo.additionalInfo.service_name (사무명) */
  serviceName?: string;
  /** managing_org_name (소관기관) */
  managingOrgName?: string;
  /** legal_basis (법적근거) — trim */
  legalBasis?: string;
  /** fee_detail (수수료 상세) — trim */
  feeDetail?: string;
  /** application_channel (신청방법) */
  applicationChannel?: string;
  /** inquiry_contact (문의처) */
  inquiryContact?: string;
  /** notice (gov.kr 안내 URL) */
  noticeUrl?: string;
}

/** 공식 gov.kr 안내 링크 1건 */
export interface Gov24AiLink {
  url: string;
  title: string;
  serviceId?: string;
  managingOrgName?: string;
}

/** SSE 전체 파싱 결과 */
export interface Gov24AiResult {
  /** CHUNK content 조각을 이어붙인 최종 답변 텍스트 */
  answer: string;
  /** 신뢰도 점수 (0~100), 미수신 시 null */
  confidence: number | null;
  /** 신뢰도 라벨 (높음/중간/낮음 등), 미수신 시 null */
  confidenceLevel: string | null;
  /** "Q: ...\nA: ..." 요약, 미수신 시 null */
  summary: string | null;
  /** 답변 유형 마커 (OK = 정상, 그 외 = 가드레일/거부) */
  anstyp: string | null;
  /** 상위 RAG 출처 (trim) */
  references: Gov24AiReference[];
  /** 공식 gov.kr 링크 */
  links: Gov24AiLink[];
  /** 진단용 trace id */
  traceId?: string;
  /** 세션 잔여 질문 횟수 */
  remainingQuestions?: number;
}
