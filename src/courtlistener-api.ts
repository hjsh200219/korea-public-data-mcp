/**
 * CourtListener v4 REST API 클라이언트 (Free Law Project)
 *
 * - 미국 연방·주 법원 판례 검색/상세 조회
 * - 익명 모드 + 옵션 토큰 지원 (토큰 있으면 시간당 한도 ↑)
 * - cursor 페이지네이션 (v4 native)
 * - HTML fallback chain: plain_text → html_with_citations → html → xml_harvard
 *
 * 출처: https://www.courtlistener.com/help/api/rest/
 */

import { fetchWithRetry } from "./http-client.js";
import { stripHtmlTags } from "./shared.js";
import type {
  OpinionSearchParams,
  OpinionListItem,
  OpinionDetail,
  ClusterDetail,
  CourtListItem,
  CourtListenerClient,
  SearchOpinionsResult,
  GetOpinionOptions,
} from "./courtlistener-types.js";

const BASE_URL = "https://www.courtlistener.com/api/rest/v4";
const PUBLIC_BASE = "https://www.courtlistener.com";
const TIMEOUT_MS = 15_000;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1_000;

interface ClientOptions {
  token?: string;
  baseUrl?: string;
}

interface CourtListenerSearchHit {
  id?: number;
  cluster_id?: number;
  caseName?: string;
  case_name?: string;
  citation?: string[] | string | null;
  dateFiled?: string | null;
  date_filed?: string | null;
  court?: string;
  court_id?: string;
  jurisdiction?: string;
  status?: string;
  precedentialStatus?: string;
  snippet?: string | null;
  absolute_url?: string;
  citeCount?: number | null;
  citation_count?: number | null;
}

interface OpinionRaw {
  id?: number;
  cluster?: string | { id: number; case_name?: string; date_filed?: string };
  cluster_id?: number;
  type?: string;
  author_str?: string | null;
  joined_by_str?: string | null;
  per_curiam?: boolean;
  plain_text?: string | null;
  html?: string | null;
  html_with_citations?: string | null;
  xml_harvard?: string | null;
  absolute_url?: string;
  opinions_cited?: { id: number }[] | string[] | null;
}

interface ClusterRaw {
  id?: number;
  case_name?: string;
  case_name_short?: string | null;
  date_filed?: string | null;
  precedential_status?: string;
  judges?: string | null;
  citations?: { volume?: number; reporter?: string; page?: string }[] | string[];
  sub_opinions?: { id?: number; type?: string; absolute_url?: string }[] | string[];
  absolute_url?: string;
  court?: string;
  court_id?: string;
}

interface CourtRaw {
  id?: string;
  full_name?: string;
  short_name?: string;
  jurisdiction?: string;
}

function buildHeaders(token?: string): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "User-Agent": "k-public-data-mcp/1.0 (CourtListener-client)",
  };
  if (token) {
    headers.Authorization = `Token ${token}`;
  }
  return headers;
}

function jurisdictionFilter(j?: string): Record<string, string> {
  if (!j) return {};
  if (j === "us-scotus") return { court: "scotus" };
  if (j === "us-federal") return { court__jurisdiction: "F" };
  if (j === "us-state") return { court__jurisdiction: "S" };
  return {};
}

/** CourtListener 절대 경로 → public URL 결합 ("/opinion/123/" → "https://…/opinion/123/"). */
function publicUrl(path?: string): string {
  return path ? `${PUBLIC_BASE}${path}` : "";
}

/** 빈/공백 문자열 판별 — `.trim()` 사본 할당 회피용 (대용량 HTML 빈도 검사 최적화). */
function hasNonWhitespace(s: string | null | undefined): s is string {
  return typeof s === "string" && /\S/.test(s);
}

/** CourtListener URL의 마지막 숫자 ID 추출 (예: "/api/rest/v4/opinions/123/" → 123). */
function parseIdFromUrl(s: string): number {
  const m = s.match(/(\d+)\/?$/);
  return m ? parseInt(m[1], 10) : NaN;
}

/**
 * CourtListener의 polymorphic citations 필드 (string | string[] | {volume,reporter,page}[])
 * → flat 문자열 배열로 정규화.
 */
function flattenCitations(value: unknown): string[] {
  if (Array.isArray(value)) {
    const out: string[] = [];
    for (const c of value) {
      if (typeof c === "string") {
        out.push(c);
      } else if (c && typeof c === "object") {
        const v = c as { volume?: number; reporter?: string; page?: string };
        if (v.volume && v.reporter && v.page) {
          out.push(`${v.volume} ${v.reporter} ${v.page}`);
        }
      }
    }
    return out;
  }
  if (typeof value === "string") return [value];
  return [];
}

function pickFirstCitation(value: unknown): string | null {
  const arr = flattenCitations(value);
  return arr.length > 0 ? arr[0] : null;
}

function toOpinionListItem(hit: CourtListenerSearchHit): OpinionListItem {
  const courtSlug = hit.court_id ?? "";
  const courtName = hit.court ?? courtSlug;
  return {
    id: hit.id ?? 0,
    clusterId: hit.cluster_id ?? 0,
    caseName: hit.caseName ?? hit.case_name ?? "",
    citation: pickFirstCitation(hit.citation ?? null),
    decisionDate: hit.dateFiled ?? hit.date_filed ?? null,
    court: courtName,
    courtSlug,
    jurisdiction: hit.jurisdiction ?? "",
    precedentialStatus: hit.precedentialStatus ?? hit.status ?? "",
    snippet: hit.snippet ?? null,
    absoluteUrl: publicUrl(hit.absolute_url),
    citationCount: hit.citeCount ?? hit.citation_count ?? null,
  };
}

/**
 * 5xx/네트워크 오류 시 throw 하는 한국어 메시지 — 토큰 값을 절대 포함하지 않음.
 * 429 는 별도 한도 안내.
 */
function safeError(action: string, status: number | null, body?: string): Error {
  if (status === 429) {
    return new Error(
      "CourtListener API 시간당 요청 한도(5,000건)에 도달했습니다. 잠시 후 다시 시도해 주세요.",
    );
  }
  const statusPart = status !== null ? ` (HTTP ${status})` : "";
  const bodyPart = body ? `: ${body.substring(0, 200)}` : "";
  return new Error(`CourtListener ${action} 오류${statusPart}${bodyPart}`);
}

async function fetchJson<T>(
  url: string,
  token: string | undefined,
  action: string,
): Promise<T> {
  const headers = buildHeaders(token);
  const response = await fetchWithRetry(url, {
    timeoutMs: TIMEOUT_MS,
    maxRetries: MAX_RETRIES,
    retryDelayMs: RETRY_DELAY_MS,
    init: { method: "GET", headers },
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw safeError(action, response.status, text);
  }
  return (await response.json()) as T;
}

/**
 * HTML fallback chain — opinion 본문 추출.
 * plain_text가 비어 있을 때 html_with_citations → html → xml_harvard 순으로
 * stripHtmlTags 처리해 사용.
 */
function extractOpinionText(raw: OpinionRaw): string {
  if (hasNonWhitespace(raw.plain_text)) return raw.plain_text;
  if (hasNonWhitespace(raw.html_with_citations)) return stripHtmlTags(raw.html_with_citations);
  if (hasNonWhitespace(raw.html)) return stripHtmlTags(raw.html);
  if (hasNonWhitespace(raw.xml_harvard)) return stripHtmlTags(raw.xml_harvard);
  return "";
}

export function createCourtListenerClient(
  options: ClientOptions = {},
): CourtListenerClient {
  const baseUrl = options.baseUrl ?? BASE_URL;
  const token = options.token;

  return {
    async searchOpinions(
      params: OpinionSearchParams,
    ): Promise<SearchOpinionsResult> {
      const url = new URL(`${baseUrl}/search/`);
      url.searchParams.set("type", "o");
      url.searchParams.set("q", params.query);
      if (params.pageSize) {
        url.searchParams.set(
          "page_size",
          String(Math.min(params.pageSize, 100)),
        );
      }
      if (params.cursor) url.searchParams.set("cursor", params.cursor);
      if (params.dateFrom) url.searchParams.set("filed_after", params.dateFrom);
      if (params.dateTo) url.searchParams.set("filed_before", params.dateTo);
      if (params.precedentialStatus) {
        url.searchParams.set("precedential_status", params.precedentialStatus);
      }
      if (params.court) url.searchParams.set("court", params.court);
      // 명시적 court 가 있으면 그것을 우선 — jurisdiction 매핑은 보조.
      const jFilter = jurisdictionFilter(params.jurisdiction);
      for (const [k, v] of Object.entries(jFilter)) {
        if (!url.searchParams.has(k)) url.searchParams.set(k, v);
      }

      interface SearchEnvelope {
        count?: number;
        next?: string | null;
        results?: CourtListenerSearchHit[];
      }
      const data = await fetchJson<SearchEnvelope>(
        url.toString(),
        token,
        "Opinion 검색",
      );
      const items = (data.results ?? []).map(toOpinionListItem);
      const nextCursor = extractCursor(data.next ?? null);
      const result: SearchOpinionsResult = { items };
      if (nextCursor) result.nextCursor = nextCursor;
      if (typeof data.count === "number") result.totalCount = data.count;
      return result;
    },

    async getOpinion(
      opinionId: number,
      opts: GetOpinionOptions = {},
    ): Promise<OpinionDetail> {
      const url = `${baseUrl}/opinions/${opinionId}/`;
      const raw = await fetchJson<OpinionRaw>(url, token, "Opinion 상세 조회");

      // includeCluster 가 false (기본) 이면 cluster 추가 fetch 회피 → MCP plain_text-only 호출 N+1 방지.
      // REST 경로는 includeCluster=true 로 메타까지 풍부하게 반환.
      let cluster: ClusterRaw | null = null;
      if (opts.includeCluster) {
        if (typeof raw.cluster === "string") {
          try {
            cluster = await fetchJson<ClusterRaw>(
              raw.cluster,
              token,
              "Cluster 메타 조회",
            );
          } catch {
            cluster = null;
          }
        } else if (raw.cluster && typeof raw.cluster === "object") {
          cluster = raw.cluster as ClusterRaw;
        }
      } else if (raw.cluster && typeof raw.cluster === "object") {
        // 임베드된 객체로 온 경우는 추가 fetch 없이 활용 가능.
        cluster = raw.cluster as ClusterRaw;
      }

      const text = extractOpinionText(raw);
      const courtSlug = cluster?.court_id ?? "";
      const courtName = (typeof cluster?.court === "string" ? cluster.court : "") || courtSlug;

      const citedRaw = Array.isArray(raw.opinions_cited) ? raw.opinions_cited : [];
      const citedOpinions = citedRaw
        .map((entry) => {
          if (typeof entry === "string") return parseIdFromUrl(entry);
          return (entry as { id?: number }).id ?? NaN;
        })
        .filter((n): n is number => !Number.isNaN(n));

      const citationStr = pickFirstCitation(cluster?.citations ?? null);

      return {
        id: raw.id ?? opinionId,
        clusterId: raw.cluster_id ?? cluster?.id ?? 0,
        caseName: cluster?.case_name ?? "",
        citation: citationStr,
        decisionDate: cluster?.date_filed ?? null,
        court: courtName,
        courtSlug,
        precedentialStatus: cluster?.precedential_status ?? "",
        absoluteUrl: publicUrl(raw.absolute_url),
        judges: cluster?.judges ?? raw.author_str ?? null,
        plainText: text,
        citedOpinions,
      };
    },

    async getCluster(clusterId: number): Promise<ClusterDetail> {
      const url = `${baseUrl}/clusters/${clusterId}/`;
      const raw = await fetchJson<ClusterRaw>(url, token, "Cluster 조회");

      const subOps = Array.isArray(raw.sub_opinions) ? raw.sub_opinions : [];
      const subOpinions = subOps
        .map((entry) => {
          if (typeof entry === "string") {
            const id = parseIdFromUrl(entry);
            return { id: Number.isNaN(id) ? 0 : id, type: "", absoluteUrl: entry };
          }
          const obj = entry as { id?: number; type?: string; absolute_url?: string };
          return {
            id: obj.id ?? 0,
            type: obj.type ?? "",
            absoluteUrl: obj.absolute_url ?? "",
          };
        })
        .filter((s) => s.id > 0 || s.absoluteUrl);

      return {
        id: raw.id ?? clusterId,
        caseName: raw.case_name ?? "",
        caseNameShort: raw.case_name_short ?? null,
        decisionDate: raw.date_filed ?? null,
        court: typeof raw.court === "string" ? raw.court : "",
        courtSlug: raw.court_id ?? "",
        citations: flattenCitations(raw.citations),
        precedentialStatus: raw.precedential_status ?? "",
        judges: raw.judges ?? null,
        subOpinions,
        absoluteUrl: publicUrl(raw.absolute_url),
      };
    },

    async listCourts(jurisdiction?: string): Promise<CourtListItem[]> {
      const url = new URL(`${baseUrl}/courts/`);
      if (jurisdiction) {
        url.searchParams.set("jurisdiction", jurisdiction);
      }
      url.searchParams.set("page_size", "100");
      interface CourtsEnvelope {
        results?: CourtRaw[];
      }
      const data = await fetchJson<CourtsEnvelope>(
        url.toString(),
        token,
        "법원 목록 조회",
      );
      return (data.results ?? []).map((c) => ({
        id: c.id ?? "",
        fullName: c.full_name ?? "",
        shortName: c.short_name ?? "",
        jurisdiction: c.jurisdiction ?? "",
      }));
    },
  };
}

/**
 * CourtListener "next" URL 에서 cursor 토큰만 추출.
 * 외부에 절대 URL을 노출하지 않기 위해.
 */
function extractCursor(nextUrl: string | null): string | undefined {
  if (!nextUrl) return undefined;
  try {
    const u = new URL(nextUrl);
    const cursor = u.searchParams.get("cursor");
    return cursor ?? undefined;
  } catch {
    return undefined;
  }
}
