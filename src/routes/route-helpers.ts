/**
 * REST API 라우트 공통 헬퍼
 */

import type { Request, Response } from "express";
import { createLogger } from "../logger.js";

const log = createLogger("routes");

/** 비동기 핸들러 래퍼 — 에러를 500 JSON으로 변환 */
export function handle(fn: (req: Request) => Promise<unknown>) {
  return async (req: Request, res: Response) => {
    try {
      res.json(await fn(req));
    } catch (error) {
      log.error("REST handler error", {
        path: req.path,
        method: req.method,
        message: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json({ error: error instanceof Error ? error.message : "오류" });
    }
  };
}
