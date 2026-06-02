/**
 * Contract test — 실제 plus.gov.kr AI 엔드포인트 라이브 호출.
 * GOV24_AI_ENABLED=true 일 때만 실행 (describe.skipIf). CI baseline 영향 0.
 *
 * 실행: GOV24_AI_ENABLED=true npx vitest run src/gov24-ai-api.contract.test.ts
 */
import { describe, it, expect } from "vitest";
import { askGov24Ai } from "./gov24-ai-api.js";

const enabled = process.env.GOV24_AI_ENABLED === "true";

describe.skipIf(!enabled)("gov24-ai contract (live)", () => {
  it(
    "location_있음_실답변_링크_반환",
    async () => {
      const r = await askGov24Ai("주민등록등본과 초본의 차이", "경기도 하남시");
      expect(r.answer.length).toBeGreaterThan(0);
      expect(r.links.length).toBeGreaterThanOrEqual(1);
      expect(typeof r.remainingQuestions).toBe("number");
    },
    40_000,
  );

  it(
    "location_빈값_실답변_반환",
    async () => {
      const r = await askGov24Ai("여권 발급 방법", "");
      expect(r.answer.length).toBeGreaterThan(0);
      expect(typeof r.remainingQuestions).toBe("number");
    },
    40_000,
  );
});
