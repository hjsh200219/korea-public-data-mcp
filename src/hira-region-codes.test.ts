import { describe, it, expect } from "vitest";
import { resolveHiraRegionCode, HIRA_SIDO_CODES, HIRA_SGGU_CODES } from "./hira-region-codes.js";

describe("HIRA 지역코드 매핑", () => {
  describe("HIRA_SIDO_CODES seed", () => {
    it("서울_110000", () => expect(HIRA_SIDO_CODES["서울"]).toBe("110000"));
    it("대전_250000", () => expect(HIRA_SIDO_CODES["대전"]).toBe("250000"));
    it("경기_310000", () => expect(HIRA_SIDO_CODES["경기"]).toBe("310000"));
  });

  describe("HIRA_SGGU_CODES seed", () => {
    it("강남구_110001", () => expect(HIRA_SGGU_CODES["강남구"]).toBe("110001"));
    it("성남중원구_310402", () => expect(HIRA_SGGU_CODES["성남중원구"]).toBe("310402"));
    it("하남시_311300", () => expect(HIRA_SGGU_CODES["하남시"]).toBe("311300"));
    it("시흥시_311700", () => expect(HIRA_SGGU_CODES["시흥시"]).toBe("311700"));
    it("파주시_312200", () => expect(HIRA_SGGU_CODES["파주시"]).toBe("312200"));
  });

  describe("resolveHiraRegionCode()", () => {
    it("Q0_Q1_둘다매핑성공_raw코드반환", () => {
      const r = resolveHiraRegionCode({ Q0: "경기", Q1: "하남시" });
      expect(r).toEqual({ sidoCd: "310000", sgguCd: "311300", matched: true });
    });

    it("Q0_Q1_부분명_정확매칭만_시도", () => {
      // 하남 → 하남시 폴백 (suffix '시'/'도'/'특별시'/'광역시' 자동 시도)
      const r = resolveHiraRegionCode({ Q0: "경기", Q1: "하남" });
      expect(r).toEqual({ sidoCd: "310000", sgguCd: "311300", matched: true });
    });

    it("Q0만_입력_sidoCd만반환", () => {
      const r = resolveHiraRegionCode({ Q0: "서울" });
      expect(r).toEqual({ sidoCd: "110000", matched: true });
    });

    it("Q1만_입력_sgguCd만반환", () => {
      const r = resolveHiraRegionCode({ Q1: "강남구" });
      expect(r).toEqual({ sgguCd: "110001", matched: true });
    });

    it("Q0_미지매핑_matched_false", () => {
      const r = resolveHiraRegionCode({ Q0: "외계행성" });
      expect(r.matched).toBe(false);
    });

    it("Q1_미지매핑_matched_false", () => {
      const r = resolveHiraRegionCode({ Q0: "경기", Q1: "외계동" });
      expect(r.matched).toBe(false);
    });

    it("입력없음_matched_false", () => {
      const r = resolveHiraRegionCode({});
      expect(r.matched).toBe(false);
    });

    it("공백트림", () => {
      const r = resolveHiraRegionCode({ Q0: "  경기  ", Q1: "  하남시  " });
      expect(r).toEqual({ sidoCd: "310000", sgguCd: "311300", matched: true });
    });

    it("부분명_suffix_시_자동시도_파주", () => {
      const r = resolveHiraRegionCode({ Q0: "경기", Q1: "파주" });
      expect(r).toEqual({ sidoCd: "310000", sgguCd: "312200", matched: true });
    });
  });
});
