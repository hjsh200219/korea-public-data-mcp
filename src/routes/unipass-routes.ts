/**
 * 관세청 UNI-PASS REST API 라우트 (/unipass/*)
 */

import type { Router } from "express";
import { z } from "zod";
import { handle } from "./route-helpers.js";
import { validateQuery } from "./_validation.js";
import {
  getCargoTracking,
  getContainerInfo,
  verifyImportDeclaration,
  searchHsCode,
  getTariffRate,
  getCustomsExchangeRates,
  searchCompany,
  searchBroker,
  getInspectionInfo,
  getArrivalReport,
  searchAnimalPlantCompany,
  getBondedAreaStorage,
  getTaxPaymentInfo,
  getExportPerformance,
  getImportRequirement,
  getShedInfo,
  getForwarderList,
  getForwarderDetail,
  getAirlineList,
  getAirlineDetail,
  getOverseasSupplier,
  getBrokerDetail,
  getSimpleDrawbackRate,
  getSimpleDrawbackCompany,
  getExportPeriodShortTarget,
  getStatisticsCode,
  getBondedTransportVehicle,
  getPortEntryExit,
  getSingleWindowHistory,
  getShipCompanyList,
  getShipCompanyDetail,
  getCustomsCheckItems,
  getPostalCustoms,
  getAttachmentSubmitStatus,
  getReimportExportBalance,
  verifyExportDeclaration,
  getExportByVehicle,
  getPostalClearance,
  getUnloadingDeclarations,
  getSeaDeparturePermit,
  getAirDeparturePermit,
  getReexportDutyFreeBalance,
  getHsCodeNavigation,
  getAirArrivalReport,
  getReexportDeadline,
  getReexportCompletion,
  getBondedRelease,
  getCollateralRelease,
  getEcommerceExportLoad,
  getDeclarationCorrection,
  getLoadingInspection,
  getBondedTransportInfo,
} from "../unipass-api.js";

// --- 재사용 스키마 빌더 ---

function reqStr(fieldName: string) {
  return z.string().min(1, `${fieldName} 파라미터가 필요합니다`);
}

// --- 엔드포인트별 스키마 ---

const blNumberSchema = z.object({ bl_number: reqStr("bl_number") });
const hsCodeSchema = z.object({ hs_code: reqStr("hs_code") });
const querySchema = z.object({ query: reqStr("query") });
const nameSchema = z.object({ name: reqStr("name") });

const customsRateSchema = z.object({
  currencies: z.string().optional(),
});

const declarationSchema = z.object({ declaration_no: reqStr("declaration_no") });

const importReqSchema = z.object({
  req_apre_no: reqStr("req_apre_no"),
  imex_tpcd: reqStr("imex_tpcd"),
});

const shedInfoSchema = z.object({
  customs_code: z.string().optional(),
  shed_code: z.string().optional(),
});

const forwarderDetailSchema = z.object({ forwarder_code: reqStr("forwarder_code") });
const airlineDetailSchema = z.object({ airline_code: reqStr("airline_code") });

const overseasSupplierSchema = z.object({
  country_code: reqStr("country_code"),
  company_name: reqStr("company_name"),
});

const brokerDetailSchema = z.object({ lca_code: reqStr("lca_code") });

const simpleDrawbackSchema = z.object({
  base_date: reqStr("base_date"),
  hs_code: z.string().optional(),
});

const statisticsCodeSchema = z.object({
  code_type: reqStr("code_type"),
  value_name: z.string().optional(),
});

const bondedVehicleSchema = z.object({
  btco_code: z.string().optional(),
  vehicle_no: z.string().optional(),
});

const portEntryExitSchema = z.object({
  imo_no: reqStr("imo_no"),
  io_type: reqStr("io_type"),
  customs_code: z.string().optional(),
});

const customsCheckSchema = z.object({
  hs_code: reqStr("hs_code"),
  imex_type: reqStr("imex_type"),
});

const attachmentStatusSchema = z.object({
  doc_type_code: reqStr("doc_type_code"),
  submit_no: reqStr("submit_no"),
});

const reimportBalanceSchema = z.object({
  export_decl_no: reqStr("export_decl_no"),
  line_no: reqStr("line_no"),
  stsz_srno: z.string().optional(),
});

const verifyExportSchema = z.object({
  pubs_no: reqStr("pubs_no"),
  decl_no: reqStr("decl_no"),
  brno: reqStr("brno"),
  country: reqStr("country"),
  product: reqStr("product"),
  weight: reqStr("weight"),
});

const postalClearanceSchema = z.object({
  postal_type: reqStr("postal_type"),
  postal_no: reqStr("postal_no"),
});

const unloadingDeclSchema = z.object({
  entry_date: reqStr("entry_date"),
  customs_code: reqStr("customs_code"),
});

const seaDepartureSchema = z.object({
  submit_no: z.string().optional(),
  permit_no: z.string().optional(),
});

const airDepartureSchema = z.object({
  submit_no: z.string().optional(),
  flight: z.string().optional(),
});

const airArrivalReportSchema = z.object({
  flight_name: z.string().optional(),
  submit_no: z.string().optional(),
});

const reexportLineSchema = z.object({
  import_decl_no: reqStr("import_decl_no"),
  line_no: reqStr("line_no"),
});

const declarationCorrectionSchema = z.object({
  submit_no: reqStr("submit_no"),
  imex_type: reqStr("imex_type"),
  request_count: reqStr("request_count"),
  request_date: z.string().optional(),
});

const bondedTransportInfoSchema = z.object({
  start_date: reqStr("start_date"),
  end_date: reqStr("end_date"),
  btco_code: z.string().optional(),
});

export function registerUnipassRoutes(router: Router, keys: Record<string, string>): void {
  router.get("/unipass/cargo", validateQuery(blNumberSchema), handle(async (req) => {
    const q = req.query as unknown as z.infer<typeof blNumberSchema>;
    return getCargoTracking(keys, q.bl_number);
  }));

  router.get("/unipass/containers", validateQuery(blNumberSchema), handle(async (req) => {
    const q = req.query as unknown as z.infer<typeof blNumberSchema>;
    return getContainerInfo(keys, q.bl_number);
  }));

  router.get("/unipass/declaration", validateQuery(declarationSchema), handle(async (req) => {
    const q = req.query as unknown as z.infer<typeof declarationSchema>;
    return verifyImportDeclaration(keys, q.declaration_no);
  }));

  router.get("/unipass/hs-code", validateQuery(hsCodeSchema), handle(async (req) => {
    const q = req.query as unknown as z.infer<typeof hsCodeSchema>;
    return searchHsCode(keys, q.hs_code);
  }));

  router.get("/unipass/tariff-rate", validateQuery(hsCodeSchema), handle(async (req) => {
    const q = req.query as unknown as z.infer<typeof hsCodeSchema>;
    return getTariffRate(keys, q.hs_code);
  }));

  router.get("/unipass/customs-rate", validateQuery(customsRateSchema), handle(async (req) => {
    const q = req.query as unknown as z.infer<typeof customsRateSchema>;
    const currencies = q.currencies ? q.currencies.split(",") : undefined;
    const result = await getCustomsExchangeRates(keys, currencies);
    return result.rates;
  }));

  router.get("/unipass/company", validateQuery(querySchema), handle(async (req) => {
    const q = req.query as unknown as z.infer<typeof querySchema>;
    return searchCompany(keys, q.query);
  }));

  router.get("/unipass/broker", validateQuery(querySchema), handle(async (req) => {
    const q = req.query as unknown as z.infer<typeof querySchema>;
    return searchBroker(keys, q.query);
  }));

  router.get("/unipass/inspection", validateQuery(blNumberSchema), handle(async (req) => {
    const q = req.query as unknown as z.infer<typeof blNumberSchema>;
    return getInspectionInfo(keys, q.bl_number);
  }));

  router.get("/unipass/arrival-report", validateQuery(blNumberSchema), handle(async (req) => {
    const q = req.query as unknown as z.infer<typeof blNumberSchema>;
    return getArrivalReport(keys, q.bl_number);
  }));

  router.get("/unipass/animal-plant-company", validateQuery(z.object({ company_name: reqStr("company_name") })), handle(async (req) => {
    const q = req.query as unknown as { company_name: string };
    return searchAnimalPlantCompany(keys, q.company_name);
  }));

  router.get("/unipass/bonded-area", validateQuery(z.object({ cargo_no: reqStr("cargo_no") })), handle(async (req) => {
    const q = req.query as unknown as { cargo_no: string };
    return getBondedAreaStorage(keys, q.cargo_no);
  }));

  router.get("/unipass/tax-payment", validateQuery(declarationSchema), handle(async (req) => {
    const q = req.query as unknown as z.infer<typeof declarationSchema>;
    return getTaxPaymentInfo(keys, q.declaration_no);
  }));

  router.get("/unipass/export-performance", validateQuery(z.object({ export_declaration_no: reqStr("export_declaration_no") })), handle(async (req) => {
    const q = req.query as unknown as { export_declaration_no: string };
    return getExportPerformance(keys, q.export_declaration_no);
  }));

  router.get("/unipass/import-requirement", validateQuery(importReqSchema), handle(async (req) => {
    const q = req.query as unknown as z.infer<typeof importReqSchema>;
    return getImportRequirement(keys, q.req_apre_no, q.imex_tpcd);
  }));

  router.get("/unipass/shed-info", validateQuery(shedInfoSchema), handle(async (req) => {
    const q = req.query as unknown as z.infer<typeof shedInfoSchema>;
    return getShedInfo(keys, {
      jrsdCstmCd: q.customs_code,
      snarSgn: q.shed_code,
    });
  }));

  router.get("/unipass/forwarder-list", validateQuery(nameSchema), handle(async (req) => {
    const q = req.query as unknown as z.infer<typeof nameSchema>;
    return getForwarderList(keys, q.name);
  }));

  router.get("/unipass/forwarder-detail", validateQuery(forwarderDetailSchema), handle(async (req) => {
    const q = req.query as unknown as z.infer<typeof forwarderDetailSchema>;
    return getForwarderDetail(keys, q.forwarder_code);
  }));

  router.get("/unipass/airline-list", validateQuery(nameSchema), handle(async (req) => {
    const q = req.query as unknown as z.infer<typeof nameSchema>;
    return getAirlineList(keys, q.name);
  }));

  router.get("/unipass/airline-detail", validateQuery(airlineDetailSchema), handle(async (req) => {
    const q = req.query as unknown as z.infer<typeof airlineDetailSchema>;
    return getAirlineDetail(keys, q.airline_code);
  }));

  router.get("/unipass/overseas-supplier", validateQuery(overseasSupplierSchema), handle(async (req) => {
    const q = req.query as unknown as z.infer<typeof overseasSupplierSchema>;
    return getOverseasSupplier(keys, q.country_code, q.company_name);
  }));

  router.get("/unipass/broker-detail", validateQuery(brokerDetailSchema), handle(async (req) => {
    const q = req.query as unknown as z.infer<typeof brokerDetailSchema>;
    return getBrokerDetail(keys, q.lca_code);
  }));

  router.get("/unipass/simple-drawback", validateQuery(simpleDrawbackSchema), handle(async (req) => {
    const q = req.query as unknown as z.infer<typeof simpleDrawbackSchema>;
    return getSimpleDrawbackRate(keys, { baseDt: q.base_date, hsSgn: q.hs_code });
  }));

  router.get("/unipass/simple-drawback-company", validateQuery(z.object({ business_no: reqStr("business_no") })), handle(async (req) => {
    const q = req.query as unknown as { business_no: string };
    return getSimpleDrawbackCompany(keys, q.business_no);
  }));

  router.get("/unipass/export-period-short", validateQuery(hsCodeSchema), handle(async (req) => {
    const q = req.query as unknown as z.infer<typeof hsCodeSchema>;
    return getExportPeriodShortTarget(keys, q.hs_code);
  }));

  router.get("/unipass/statistics-code", validateQuery(statisticsCodeSchema), handle(async (req) => {
    const q = req.query as unknown as z.infer<typeof statisticsCodeSchema>;
    return getStatisticsCode(keys, { statsSgnTp: q.code_type, cdValtValNm: q.value_name });
  }));

  router.get("/unipass/bonded-vehicle", validateQuery(bondedVehicleSchema), handle(async (req) => {
    const q = req.query as unknown as z.infer<typeof bondedVehicleSchema>;
    return getBondedTransportVehicle(keys, { btcoSgn: q.btco_code, vhclNoSanm: q.vehicle_no });
  }));

  router.get("/unipass/port-entry-exit", validateQuery(portEntryExitSchema), handle(async (req) => {
    const q = req.query as unknown as z.infer<typeof portEntryExitSchema>;
    return getPortEntryExit(keys, {
      shipCallImoNo: q.imo_no,
      seaFlghIoprTpcd: q.io_type,
      cstmSgn: q.customs_code,
    });
  }));

  router.get("/unipass/single-window", validateQuery(z.object({ request_no: reqStr("request_no") })), handle(async (req) => {
    const q = req.query as unknown as { request_no: string };
    return getSingleWindowHistory(keys, q.request_no);
  }));

  router.get("/unipass/ship-company-list", validateQuery(nameSchema), handle(async (req) => {
    const q = req.query as unknown as z.infer<typeof nameSchema>;
    return getShipCompanyList(keys, q.name);
  }));

  router.get("/unipass/ship-company-detail", validateQuery(z.object({ ship_company_code: reqStr("ship_company_code") })), handle(async (req) => {
    const q = req.query as unknown as { ship_company_code: string };
    return getShipCompanyDetail(keys, q.ship_company_code);
  }));

  router.get("/unipass/customs-check", validateQuery(customsCheckSchema), handle(async (req) => {
    const q = req.query as unknown as z.infer<typeof customsCheckSchema>;
    return getCustomsCheckItems(keys, q.hs_code, q.imex_type);
  }));

  router.get("/unipass/postal-customs", validateQuery(z.object({ postal_code: reqStr("postal_code") })), handle(async (req) => {
    const q = req.query as unknown as { postal_code: string };
    return getPostalCustoms(keys, q.postal_code);
  }));

  router.get("/unipass/attachment-status", validateQuery(attachmentStatusSchema), handle(async (req) => {
    const q = req.query as unknown as z.infer<typeof attachmentStatusSchema>;
    return getAttachmentSubmitStatus(keys, q.doc_type_code, q.submit_no);
  }));

  router.get("/unipass/reimport-balance", validateQuery(reimportBalanceSchema), handle(async (req) => {
    const q = req.query as unknown as z.infer<typeof reimportBalanceSchema>;
    return getReimportExportBalance(keys, {
      expDclrNo: q.export_decl_no,
      expDclrLnNo: q.line_no,
      expDclrStszSrno: q.stsz_srno,
    });
  }));

  router.get("/unipass/verify-export", validateQuery(verifyExportSchema), handle(async (req) => {
    const q = req.query as unknown as z.infer<typeof verifyExportSchema>;
    return verifyExportDeclaration(keys, {
      expDclrCrfnPblsNo: q.pubs_no,
      expDclrNo: q.decl_no,
      txprBrno: q.brno,
      orcyCntyCd: q.country,
      prnm: q.product,
      ntwg: q.weight,
    });
  }));

  router.get("/unipass/export-by-vehicle", validateQuery(z.object({ vehicle_no: reqStr("vehicle_no") })), handle(async (req) => {
    const q = req.query as unknown as { vehicle_no: string };
    return getExportByVehicle(keys, { cbno: q.vehicle_no });
  }));

  router.get("/unipass/postal-clearance", validateQuery(postalClearanceSchema), handle(async (req) => {
    const q = req.query as unknown as z.infer<typeof postalClearanceSchema>;
    return getPostalClearance(keys, q.postal_type, q.postal_no);
  }));

  router.get("/unipass/unloading-declarations", validateQuery(unloadingDeclSchema), handle(async (req) => {
    const q = req.query as unknown as z.infer<typeof unloadingDeclSchema>;
    return getUnloadingDeclarations(keys, q.entry_date, q.customs_code);
  }));

  router.get("/unipass/sea-departure", validateQuery(seaDepartureSchema), handle(async (req) => {
    const q = req.query as unknown as z.infer<typeof seaDepartureSchema>;
    return getSeaDeparturePermit(keys, { ioprSbmtNo: q.submit_no, tkofPermNo: q.permit_no });
  }));

  router.get("/unipass/air-departure", validateQuery(airDepartureSchema), handle(async (req) => {
    const q = req.query as unknown as z.infer<typeof airDepartureSchema>;
    return getAirDeparturePermit(keys, { ioprSbmtNo: q.submit_no, shipFlgtNm: q.flight });
  }));

  router.get("/unipass/reexport-balance", validateQuery(z.object({ import_decl_no: reqStr("import_decl_no") })), handle(async (req) => {
    const q = req.query as unknown as { import_decl_no: string };
    return getReexportDutyFreeBalance(keys, q.import_decl_no);
  }));

  router.get("/unipass/hs-navigation", validateQuery(hsCodeSchema), handle(async (req) => {
    const q = req.query as unknown as z.infer<typeof hsCodeSchema>;
    return getHsCodeNavigation(keys, q.hs_code);
  }));

  router.get("/unipass/air-arrival-report", validateQuery(airArrivalReportSchema), handle(async (req) => {
    const q = req.query as unknown as z.infer<typeof airArrivalReportSchema>;
    return getAirArrivalReport(keys, { shipFlgtNm: q.flight_name, ioprSbmtNo: q.submit_no });
  }));

  router.get("/unipass/reexport-deadline", validateQuery(reexportLineSchema), handle(async (req) => {
    const q = req.query as unknown as z.infer<typeof reexportLineSchema>;
    return getReexportDeadline(keys, q.import_decl_no, q.line_no);
  }));

  router.get("/unipass/reexport-completion", validateQuery(reexportLineSchema), handle(async (req) => {
    const q = req.query as unknown as z.infer<typeof reexportLineSchema>;
    return getReexportCompletion(keys, q.import_decl_no, q.line_no);
  }));

  router.get("/unipass/bonded-release", validateQuery(z.object({ business_no: reqStr("business_no") })), handle(async (req) => {
    const q = req.query as unknown as { business_no: string };
    return getBondedRelease(keys, q.business_no);
  }));

  router.get("/unipass/collateral-release", validateQuery(z.object({ import_decl_no: reqStr("import_decl_no") })), handle(async (req) => {
    const q = req.query as unknown as { import_decl_no: string };
    return getCollateralRelease(keys, q.import_decl_no);
  }));

  router.get("/unipass/ecommerce-export-load", validateQuery(z.object({ ecommerce_decl_no: reqStr("ecommerce_decl_no") })), handle(async (req) => {
    const q = req.query as unknown as { ecommerce_decl_no: string };
    return getEcommerceExportLoad(keys, q.ecommerce_decl_no);
  }));

  router.get("/unipass/declaration-correction", validateQuery(declarationCorrectionSchema), handle(async (req) => {
    const q = req.query as unknown as z.infer<typeof declarationCorrectionSchema>;
    return getDeclarationCorrection(keys, {
      dcshSbmtNo: q.submit_no,
      imexTpcd: q.imex_type,
      mdfyRqstDgcnt: q.request_count,
      mdfyRqstDt: q.request_date,
    });
  }));

  router.get("/unipass/loading-inspection", validateQuery(z.object({ export_decl_no: reqStr("export_decl_no") })), handle(async (req) => {
    const q = req.query as unknown as { export_decl_no: string };
    return getLoadingInspection(keys, q.export_decl_no);
  }));

  router.get("/unipass/bonded-transport-info", validateQuery(bondedTransportInfoSchema), handle(async (req) => {
    const q = req.query as unknown as z.infer<typeof bondedTransportInfoSchema>;
    return getBondedTransportInfo(keys, {
      qryStrtDt: q.start_date,
      qryEndDt: q.end_date,
      btcoSgn: q.btco_code,
    });
  }));
}
