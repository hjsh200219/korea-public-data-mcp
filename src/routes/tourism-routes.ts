/**
 * 한국관광공사 KorService2 REST API 라우트 (/tourism/*)
 */

import type { Router } from "express";
import { handle } from "./route-helpers.js";
import {
  getAreaCode, getCategoryCode,
  searchAreaBased, searchKeyword, searchLocationBased,
  searchFestival, searchStay,
  getDetailCommon, getDetailIntro, getDetailInfo, getDetailImage,
  getAreaBasedSync, getLdongCode, getLclsSystmCode,
} from "../tourism-api.js";

export function registerTourismRoutes(router: Router, serviceKey: string): void {
  router.get("/tourism/area-code", handle(async (req) => {
    const q = req.query as Record<string, unknown>;
    return getAreaCode(serviceKey, {
      areaCode: q.areaCode as string | undefined,
      pageNo: Number(q.pageNo) || 1,
      numOfRows: Number(q.numOfRows) || 100,
    });
  }));

  router.get("/tourism/category-code", handle(async (req) => {
    const q = req.query as Record<string, unknown>;
    return getCategoryCode(serviceKey, {
      contentTypeId: q.contentTypeId as string | undefined,
      cat1: q.cat1 as string | undefined,
      cat2: q.cat2 as string | undefined,
      cat3: q.cat3 as string | undefined,
      pageNo: Number(q.pageNo) || 1,
      numOfRows: Number(q.numOfRows) || 100,
    });
  }));

  router.get("/tourism/area-based", handle(async (req) => {
    const q = req.query as Record<string, unknown>;
    return searchAreaBased(serviceKey, {
      areaCode: q.areaCode as string | undefined,
      sigunguCode: q.sigunguCode as string | undefined,
      contentTypeId: q.contentTypeId as string | undefined,
      cat1: q.cat1 as string | undefined,
      cat2: q.cat2 as string | undefined,
      cat3: q.cat3 as string | undefined,
      arrange: q.arrange as string | undefined,
      pageNo: Number(q.pageNo) || 1,
      numOfRows: Number(q.numOfRows) || 10,
    });
  }));

  router.get("/tourism/search-keyword", handle(async (req) => {
    const q = req.query as Record<string, unknown>;
    const keyword = (q.keyword as string | undefined)?.trim();
    if (!keyword) throw new Error("keyword는 필수입니다.");
    return searchKeyword(serviceKey, {
      keyword,
      areaCode: q.areaCode as string | undefined,
      sigunguCode: q.sigunguCode as string | undefined,
      contentTypeId: q.contentTypeId as string | undefined,
      cat1: q.cat1 as string | undefined,
      arrange: q.arrange as string | undefined,
      pageNo: Number(q.pageNo) || 1,
      numOfRows: Number(q.numOfRows) || 10,
    });
  }));

  router.get("/tourism/location-based", handle(async (req) => {
    const q = req.query as Record<string, unknown>;
    const mapX = q.mapX as string | undefined;
    const mapY = q.mapY as string | undefined;
    const radius = q.radius as string | undefined;
    if (!mapX || !mapY || !radius) throw new Error("mapX, mapY, radius는 필수입니다.");
    return searchLocationBased(serviceKey, {
      mapX, mapY, radius,
      contentTypeId: q.contentTypeId as string | undefined,
      areaCode: q.areaCode as string | undefined,
      arrange: q.arrange as string | undefined,
      pageNo: Number(q.pageNo) || 1,
      numOfRows: Number(q.numOfRows) || 10,
    });
  }));

  router.get("/tourism/festival", handle(async (req) => {
    const q = req.query as Record<string, unknown>;
    const eventStartDate = q.eventStartDate as string | undefined;
    if (!eventStartDate) throw new Error("eventStartDate는 필수입니다.");
    return searchFestival(serviceKey, {
      eventStartDate,
      eventEndDate: q.eventEndDate as string | undefined,
      areaCode: q.areaCode as string | undefined,
      sigunguCode: q.sigunguCode as string | undefined,
      arrange: q.arrange as string | undefined,
      pageNo: Number(q.pageNo) || 1,
      numOfRows: Number(q.numOfRows) || 10,
    });
  }));

  router.get("/tourism/stay", handle(async (req) => {
    const q = req.query as Record<string, unknown>;
    return searchStay(serviceKey, {
      areaCode: q.areaCode as string | undefined,
      sigunguCode: q.sigunguCode as string | undefined,
      arrange: q.arrange as string | undefined,
      pageNo: Number(q.pageNo) || 1,
      numOfRows: Number(q.numOfRows) || 10,
    });
  }));

  router.get("/tourism/detail-common", handle(async (req) => {
    const q = req.query as Record<string, unknown>;
    const contentId = (q.contentId as string | undefined)?.trim();
    if (!contentId) throw new Error("contentId는 필수입니다.");
    return getDetailCommon(serviceKey, { contentId });
  }));

  router.get("/tourism/detail-intro", handle(async (req) => {
    const q = req.query as Record<string, unknown>;
    const contentId = (q.contentId as string | undefined)?.trim();
    const contentTypeId = (q.contentTypeId as string | undefined)?.trim();
    if (!contentId || !contentTypeId) throw new Error("contentId, contentTypeId는 필수입니다.");
    return getDetailIntro(serviceKey, { contentId, contentTypeId });
  }));

  router.get("/tourism/detail-info", handle(async (req) => {
    const q = req.query as Record<string, unknown>;
    const contentId = (q.contentId as string | undefined)?.trim();
    const contentTypeId = (q.contentTypeId as string | undefined)?.trim();
    if (!contentId || !contentTypeId) throw new Error("contentId, contentTypeId는 필수입니다.");
    return getDetailInfo(serviceKey, {
      contentId, contentTypeId,
      pageNo: Number(q.pageNo) || 1,
      numOfRows: Number(q.numOfRows) || 10,
    });
  }));

  router.get("/tourism/detail-image", handle(async (req) => {
    const q = req.query as Record<string, unknown>;
    const contentId = (q.contentId as string | undefined)?.trim();
    if (!contentId) throw new Error("contentId는 필수입니다.");
    return getDetailImage(serviceKey, {
      contentId,
      pageNo: Number(q.pageNo) || 1,
      numOfRows: Number(q.numOfRows) || 10,
    });
  }));

  router.get("/tourism/area-sync", handle(async (req) => {
    const q = req.query as Record<string, unknown>;
    return getAreaBasedSync(serviceKey, {
      areaCode: q.areaCode as string | undefined,
      sigunguCode: q.sigunguCode as string | undefined,
      contentTypeId: q.contentTypeId as string | undefined,
      modifiedtime: q.modifiedtime as string | undefined,
      pageNo: Number(q.pageNo) || 1,
      numOfRows: Number(q.numOfRows) || 10,
    });
  }));

  router.get("/tourism/ldong-code", handle(async (req) => {
    const q = req.query as Record<string, unknown>;
    return getLdongCode(serviceKey, {
      areaCode: q.areaCode as string | undefined,
      sigunguCode: q.sigunguCode as string | undefined,
      pageNo: Number(q.pageNo) || 1,
      numOfRows: Number(q.numOfRows) || 100,
    });
  }));

  router.get("/tourism/lclssystm-code", handle(async (req) => {
    const q = req.query as Record<string, unknown>;
    return getLclsSystmCode(serviceKey, {
      lclsSystmCode: q.lclsSystmCode as string | undefined,
      pageNo: Number(q.pageNo) || 1,
      numOfRows: Number(q.numOfRows) || 100,
    });
  }));
}
