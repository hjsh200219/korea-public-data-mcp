/**
 * Zod 기반 쿼리 파라미터 검증 미들웨어
 */

import type { Request, Response, NextFunction } from "express";
import type { ZodType } from "zod";

/**
 * Express 미들웨어 팩토리: req.query를 Zod 스키마로 검증한다.
 * 검증 실패 시 400 + 한글 에러 메시지 반환, 성공 시 파싱된 값으로 req.query 교체.
 * Express 5에서 req.query가 getter-only일 수 있으므로 Object.defineProperty 사용.
 */
export function validateQuery<T>(schema: ZodType<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      const details = result.error.issues.map((i) => ({
        field: i.path.join("."),
        message: i.message,
      }));
      res.status(400).json({
        error: "요청 파라미터가 올바르지 않습니다.",
        details,
      });
      return;
    }
    Object.defineProperty(req, "query", {
      value: result.data,
      writable: true,
      configurable: true,
    });
    next();
  };
}
