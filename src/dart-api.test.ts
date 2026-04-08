import { describe, it, expect, vi, afterEach } from "vitest";
import JSZip from "jszip";
import {
  searchDisclosures,
  getCompanyInfo,
  getFinancialStatements,
  getKeyAccounts,
  getDisclosureDocument,
} from "./dart-api.js";

function jsonResponse(data: unknown, status = 200): Response {
  const ok = status >= 200 && status < 300;
  return {
    ok,
    status,
    headers: new Headers(),
    json: async () => data,
    text: async () => JSON.stringify(data),
    arrayBuffer: async () => new ArrayBuffer(0),
  } as any;
}

describe("dart-api", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("searchDisclosures_성공_파싱된데이터반환", async () => {
    const body = {
      status: "000",
      list: [{ corp_name: "테스트" }],
      page_count: 1,
      page_no: 1,
      total_page: 1,
      total_count: 1,
    };
    globalThis.fetch = vi.fn().mockResolvedValue(jsonResponse(body)) as any;

    const result = await searchDisclosures("k", {
      corp_code: "00123456",
      bgn_de: "20240101",
      page_no: 2,
      page_count: 10,
    });

    expect(result).toEqual(body);
    const url = (globalThis.fetch as any).mock.calls[0][0] as string;
    expect(url).toContain("list.json");
    expect(url).toContain("crtfc_key=k");
    expect(url).toContain("corp_code=00123456");
    expect(url).toContain("bgn_de=20240101");
    expect(url).toContain("page_no=2");
    expect(url).toContain("page_count=10");
  });

  it("searchDisclosures_모든선택파라미터_URL포함", async () => {
    const body = { status: "000", list: [], total_count: 0 };
    globalThis.fetch = vi.fn().mockResolvedValue(jsonResponse(body)) as any;

    await searchDisclosures("k", {
      corp_code: "00123456",
      bgn_de: "20240101",
      end_de: "20241231",
      last_reprt_at: "Y",
      pblntf_ty: "A",
      pblntf_detail_ty: "A001",
      corp_cls: "Y",
      sort: "date",
      sort_mth: "desc",
    });

    const url = (globalThis.fetch as any).mock.calls[0][0] as string;
    expect(url).toContain("end_de=20241231");
    expect(url).toContain("last_reprt_at=Y");
    expect(url).toContain("pblntf_ty=A");
    expect(url).toContain("pblntf_detail_ty=A001");
    expect(url).toContain("corp_cls=Y");
    expect(url).toContain("sort=date");
    expect(url).toContain("sort_mth=desc");
  });

  it("searchDisclosures_status013_에러없이반환", async () => {
    const body = { status: "013", message: "조회된 데이터가 없습니다." };
    globalThis.fetch = vi.fn().mockResolvedValue(jsonResponse(body)) as any;

    const result = await searchDisclosures("k", {});
    expect(result.status).toBe("013");
  });

  it("searchDisclosures_DART오류상태_예외", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(jsonResponse({ status: "010" })) as any;

    await expect(searchDisclosures("bad", {})).rejects.toThrow(/등록되지 않은 인증키/);
  });

  it("searchDisclosures_HTTP오류_예외", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(jsonResponse({}, 500)) as any;

    await expect(searchDisclosures("k", {})).rejects.toThrow(/HTTP 500/);
  });

  it("getCompanyInfo_성공_URL에corp_code포함", async () => {
    const body = { status: "000", corp_name: "ACME", ceo_nm: "홍길동" };
    globalThis.fetch = vi.fn().mockResolvedValue(jsonResponse(body)) as any;

    const result = await getCompanyInfo("key1", "00998877");
    expect(result.corp_name).toBe("ACME");
    const url = (globalThis.fetch as any).mock.calls[0][0] as string;
    expect(url).toContain("company.json");
    expect(url).toContain("crtfc_key=key1");
    expect(url).toContain("corp_code=00998877");
  });

  it("getFinancialStatements_성공_파라미터전달", async () => {
    const body = { status: "000", list: [{ account_nm: "매출" }] };
    globalThis.fetch = vi.fn().mockResolvedValue(jsonResponse(body)) as any;

    const result = await getFinancialStatements("k", {
      corp_code: "001",
      bsns_year: "2023",
      reprt_code: "11011",
      fs_div: "OFS",
    });
    expect(result.list).toHaveLength(1);
    const url = (globalThis.fetch as any).mock.calls[0][0] as string;
    expect(url).toContain("fnlttSinglAcntAll.json");
    expect(url).toContain("fs_div=OFS");
  });

  it("getKeyAccounts_성공", async () => {
    const body = { status: "000", list: [{ account_id: "a" }] };
    globalThis.fetch = vi.fn().mockResolvedValue(jsonResponse(body)) as any;

    await getKeyAccounts("k", {
      corp_code: "002",
      bsns_year: "2022",
      reprt_code: "11012",
    });
    const url = (globalThis.fetch as any).mock.calls[0][0] as string;
    expect(url).toContain("fnlttSinglAcnt.json");
    expect(url).toContain("reprt_code=11012");
  });

  it("getDisclosureDocument_HTTP실패_예외", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      headers: new Headers(),
    } as any);

    await expect(getDisclosureDocument("k", "r1")).rejects.toThrow(/404/);
  });

  it("getDisclosureDocument_성공_ZIP에서본문추출", async () => {
    const zip = new JSZip();
    zip.file("a.html", "<p>본문텍스트</p>");
    const buf = await zip.generateAsync({ type: "arraybuffer" });

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => "application/zip" },
      arrayBuffer: async () => buf,
    } as any);

    const result = await getDisclosureDocument("k", "RCEPT01");
    expect(result.rcept_no).toBe("RCEPT01");
    expect(result.files.length).toBeGreaterThan(0);
    expect(result.summary).toContain("본문텍스트");
    const url = (globalThis.fetch as any).mock.calls[0][0] as string;
    expect(url).toContain("document.xml");
    expect(url).toContain("rcept_no=RCEPT01");
  });
});

describe("resolveCorpCode", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("기업명으로corpCode조회_캐시", async () => {
    const xml = `<?xml version="1.0"?><result><list>
      <corp_code>12345678</corp_code>
      <corp_name>테스트주식회사</corp_name>
      <stock_code>000000</stock_code>
      <modify_date>20240101</modify_date>
    </list></result>`;
    const zip = new JSZip();
    zip.file("CORPCODE.xml", xml);
    const buf = await zip.generateAsync({ type: "arraybuffer" });

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      arrayBuffer: async () => buf,
    } as any);

    const { resolveCorpCode: resolve } = await import("./dart-api.js");
    const exact = await resolve("apikey", "테스트주식회사");
    expect(exact[0]?.corpCode).toBe("12345678");

    const fetchCalls = (globalThis.fetch as any).mock.calls.length;
    await resolve("apikey", "테스트주식회사");
    expect((globalThis.fetch as any).mock.calls.length).toBe(fetchCalls);
  });
});
