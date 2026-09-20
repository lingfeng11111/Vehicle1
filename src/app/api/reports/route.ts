import { z } from "zod";
import { REPORT_INSPECTOR_NAME, REPORT_REVIEWER_NAME } from "@/config/report-people";
import { FEATURE_FLAGS } from "@/config/feature-flags";
import { db } from "@/lib/db";
import { checkInspectionCompletion, type ExecutionItemLike, type TemplateItemLike } from "@/services/inspection-engine";
import { MockMarketPriceProvider } from "@/services/market-price-provider";
import { generatePersonalizedReport } from "@/services/personalized-report-generator";
import { countTemplateItems } from "@/services/inspection-read-model";
import { buildStandardReportDocument, materializeStandardReportItems } from "@/services/standard-report";

export async function GET() {
  const reports = await db.report.findMany({
    include: {
      salesCase: { include: { customer: true, vehicle: true } },
      inspection: {
        select: {
          id: true,
          version: true,
          status: true,
          overallRiskLevel: true,
          templateVersion: {
            select: {
              sections: {
                select: { positions: { select: { checkItems: { select: { id: true } } } } },
              },
            },
          },
        },
      },
      standardReportSnapshot: { select: { id: true, version: true, snapshotVersion: true } },
      personalizedReportSnapshot: { select: { id: true, version: true, snapshotVersion: true } },
    },
    orderBy: { generatedAt: "desc" },
  });

  // 补充：把已完成但没有关联客户的鉴定也作为一条"系统综合鉴定"记录列出来
  const reportInspectionIds = new Set(reports.map((r) => r.inspectionId));
  const orphanInspections = await db.inspection.findMany({
    where: { status: "COMPLETED", id: { notIn: [...reportInspectionIds] } },
    include: {
      vehicle: { select: { id: true, code: true, brand: true, series: true, model: true, modelYear: true, coverImage: true, displayTags: true } },
      templateVersion: { select: { sections: { select: { positions: { select: { checkItems: { select: { id: true } } } } } } } },
      standardReports: { orderBy: { version: "desc" }, take: 1 },
    },
  });

  const virtualReports = orphanInspections.map((inspection) => {
    const snap = inspection.standardReports[0];
    const { templateVersion, ...inspectionRest } = inspection as typeof inspection & { templateVersion: unknown };
    return {
      id: `sys-${inspection.id}`,
      salesCaseId: null as string | null,
      inspectionId: inspection.id,
      standardReportSnapshotId: snap?.id ?? null,
      personalizedReportSnapshotId: null,
      version: 1,
      reportMode: "STANDARD" as const,
      highlightTags: "[]",
      generatedSnapshot: snap?.snapshotJson ?? "{}",
      generatedAt: snap?.generatedAt ?? inspection.updatedAt,
      salesCase: {
        customer: { id: "sys", name: "系统综合鉴定", phone: "", sourceChannel: "SYSTEM", status: "COMPLETED" },
        vehicle: inspection.vehicle,
      },
      inspection: {
        ...inspectionRest,
        templateItemCount: templateVersion ? countTemplateItems(templateVersion as never) : 0,
      },
      standardReportSnapshot: snap ? { id: snap.id, version: snap.version, snapshotVersion: snap.snapshotVersion } : null,
      personalizedReportSnapshot: null,
    };
  });

  const all = [...reports, ...virtualReports].sort(
    (a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime(),
  );

  return Response.json(
    all.map((report) => {
      const { templateVersion, ...inspection } = (report as { inspection: { templateVersion?: unknown } }).inspection ?? {};
      return {
        ...report,
        inspection: {
          ...inspection,
          templateItemCount: templateVersion ? countTemplateItems(templateVersion as never) : 0,
        },
      };
    }),
  );
}

export async function POST(request: Request) {
  const parsed = z.object({ salesCaseId: z.string(), reportMode: z.enum(["PERSONALIZED", "STANDARD"]).optional() }).safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: "缺少销售案例" }, { status: 400 });
  const salesCase = await db.salesCase.findUnique({ where: { id: parsed.data.salesCaseId }, include: { customer: true, demand: true, vehicle: true, reports: true } });
  if (!salesCase) return Response.json({ error: "销售案例不存在" }, { status: 404 });
  const inspection = await db.inspection.findFirst({
    where: { vehicleId: salesCase.vehicleId },
    orderBy: { version: "desc" },
    include: {
      items: { include: { findings: { include: { criterion: true } }, evidence: true } },
      evaluations: { orderBy: { version: "desc" }, take: 1, include: { outcomes: true } },
      standardReports: { orderBy: { version: "desc" }, take: 1 },
      templateVersion: {
        include: {
          sections: {
            orderBy: { sortOrder: "asc" },
            include: {
              positions: {
                orderBy: { sortOrder: "asc" },
                include: { checkItems: { orderBy: { sortOrder: "asc" }, include: { criteria: { orderBy: { sortOrder: "asc" } } } } },
              },
            },
          },
        },
      },
    },
  });
  if (!inspection) return Response.json({ error: "车辆尚未完成鉴定" }, { status: 409 });
  if (!inspection.templateVersionId) return Response.json({ error: "鉴定缺少模板版本，无法生成标准报告" }, { status: 409 });
  if (!inspection.templateVersion) return Response.json({ error: "鉴定模板版本不存在，无法生成标准报告" }, { status: 409 });
  const templateItems: TemplateItemLike[] = inspection.templateVersion.sections.flatMap((section) => section.positions.flatMap((position) => position.checkItems.map((item) => ({
    id: item.id,
    code: item.code,
    name: item.name,
    category: item.category,
    componentClass: item.componentClass,
    accidentDecisionParticipant: item.accidentDecisionParticipant,
    description: item.description,
    sortOrder: item.sortOrder,
    position: { id: position.id, code: position.code, name: position.name, floodAggregationKey: position.floodAggregationKey },
    section: { code: section.code, name: section.name, axis: section.axis },
    criteria: item.criteria,
  }))));
  if (inspection.status !== "COMPLETED" && inspection.status !== "BLOCKED") {
    const completion = checkInspectionCompletion(templateItems, inspection.items as ExecutionItemLike[]);
    return Response.json({ error: "请先确认其余未单独记录项目正常并完成鉴定", code: "INSPECTION_CONFIRM_REQUIRED", missing: completion.missing }, { status: 409 });
  }
  const templateVersionId = inspection.templateVersionId;
  const evaluation = inspection.evaluations[0];
  if (!evaluation) return Response.json({ error: "鉴定尚未完成规则评估，无法生成标准报告" }, { status: 409 });
  let market = await db.marketPriceSnapshot.findFirst({ where: { vehicleId: salesCase.vehicleId }, orderBy: { capturedAt: "desc" } });
  if (!market && FEATURE_FLAGS.ENABLE_MARKET_PRICE) {
    const provided = await new MockMarketPriceProvider().getSnapshot(salesCase.vehicle.code, salesCase.vehicle.listingPrice);
    market = await db.marketPriceSnapshot.create({ data: { vehicleId: salesCase.vehicleId, ...provided } });
  }
  const reportItems = materializeStandardReportItems(templateItems, inspection.items);
  const reportMode = FEATURE_FLAGS.ENABLE_PERSONALIZED_REPORT && parsed.data.reportMode !== "STANDARD" ? "PERSONALIZED" : "STANDARD";
  const standardDocument = buildStandardReportDocument({
    vehicle: { id: salesCase.vehicle.id, code: salesCase.vehicle.code, vin: salesCase.vehicle.vin, plateNo: salesCase.vehicle.plateNo, brand: salesCase.vehicle.brand, series: salesCase.vehicle.series, model: salesCase.vehicle.model, modelYear: salesCase.vehicle.modelYear, mileage: salesCase.vehicle.mileage, listingPrice: salesCase.vehicle.listingPrice, energyType: salesCase.vehicle.energyType, coverImage: salesCase.vehicle.coverImage, displayTags: salesCase.vehicle.displayTags },
    inspection: { id: inspection.id, version: inspection.version, inspectionDate: inspection.inspectionDate, inspectorName: REPORT_INSPECTOR_NAME, reviewerName: REPORT_REVIEWER_NAME, overallRiskLevel: inspection.overallRiskLevel, summary: inspection.summary, items: reportItems },
    templateItems,
    templateVersionId,
    evaluation,
    market,
    generatedAt: new Date(),
  });
  const { snapshot, generationMethod } = await generatePersonalizedReport({
    customer: { id: salesCase.customer.id, name: salesCase.customer.name },
    demand: { id: salesCase.demand.id, focusTags: salesCase.demand.focusTags, riskConcerns: salesCase.demand.riskConcerns, budgetMin: salesCase.demand.budgetMin, budgetMax: salesCase.demand.budgetMax, usageScene: salesCase.demand.usageScene, remark: salesCase.demand.remark },
    vehicle: { id: salesCase.vehicle.id, code: salesCase.vehicle.code, vin: salesCase.vehicle.vin, plateNo: salesCase.vehicle.plateNo, brand: salesCase.vehicle.brand, series: salesCase.vehicle.series, model: salesCase.vehicle.model, modelYear: salesCase.vehicle.modelYear, mileage: salesCase.vehicle.mileage, listingPrice: salesCase.vehicle.listingPrice, coverImage: salesCase.vehicle.coverImage, displayTags: salesCase.vehicle.displayTags },
    inspection: { id: inspection.id, version: inspection.version, inspectionDate: inspection.inspectionDate.toISOString(), inspectorName: REPORT_INSPECTOR_NAME, overallRiskLevel: inspection.overallRiskLevel, summary: inspection.summary, items: reportItems.map((item) => ({ id: item.id, checkItemId: item.checkItemId, zone: item.zone, category: item.category, itemName: item.itemName, result: item.result, resultStatus: item.resultStatus, findingMode: item.findingMode, isAbnormal: item.isAbnormal, severity: item.severity, basePriority: item.basePriority, professionalDescription: item.professionalDescription, consumerExplanation: item.consumerExplanation, futureRisk: item.futureRisk, repairSuggestion: item.repairSuggestion, estimatedRepairCost: item.estimatedRepairCost })) },
    market: market ? { newCarReferencePrice: market.newCarReferencePrice, marketLow: market.marketLow, marketMedian: market.marketMedian, marketHigh: market.marketHigh, conditionAdjustedLow: market.conditionAdjustedLow, conditionAdjustedHigh: market.conditionAdjustedHigh, source: market.source as "MockMarketPriceProvider" | "ManualMarketPriceProvider", capturedAt: market.capturedAt.toISOString() } : null,
    reportMode,
    decision: {
      accidentClassification: evaluation.accidentClassification,
      floodStatus: evaluation.floodStatus,
      currentSafetyConclusion: evaluation.currentSafetyConclusion,
      functionConclusion: evaluation.functionConclusion,
      legalTradeabilityStatus: evaluation.legalTradeabilityStatus,
      circulationRecommendation: evaluation.circulationRecommendation,
      recommendationReason: evaluation.recommendationReason,
      outcomes: evaluation.outcomes.map((outcome) => ({ code: outcome.code, axis: outcome.axis, status: outcome.status, reason: outcome.reason })),
    },
  });
  const version = salesCase.reports.reduce((max, report) => Math.max(max, report.version), 0) + 1;
  const report = await db.$transaction(async (tx) => {
    let standardSnapshot = inspection.standardReports[0];
    if (!standardSnapshot || standardSnapshot.evaluationId !== evaluation.id || standardSnapshot.templateVersionId !== templateVersionId) {
      const latestStandard = await tx.standardReportSnapshot.findFirst({ where: { inspectionId: inspection.id }, orderBy: { version: "desc" } });
      standardSnapshot = await tx.standardReportSnapshot.create({ data: { inspectionId: inspection.id, evaluationId: evaluation.id, templateVersionId, version: (latestStandard?.version ?? 0) + 1, snapshotVersion: standardDocument.snapshotVersion, snapshotJson: JSON.stringify(standardDocument), generatedAt: new Date(standardDocument.generatedAt), generatedBy: "api" } });
    }
    const personalizedSnapshot = reportMode === "PERSONALIZED"
      ? await tx.personalizedReportSnapshot.create({ data: { salesCaseId: salesCase.id, standardReportSnapshotId: standardSnapshot.id, version, focusTagsJson: JSON.stringify(snapshot.customer.focusTags), generationMethod, snapshotJson: JSON.stringify(snapshot), generatedAt: new Date(snapshot.generatedAt), generatedBy: "api" } })
      : null;
    const createdReport = await tx.report.create({ data: { salesCaseId: salesCase.id, inspectionId: inspection.id, standardReportSnapshotId: standardSnapshot.id, personalizedReportSnapshotId: personalizedSnapshot?.id ?? null, version, reportMode: snapshot.reportMode, highlightTags: JSON.stringify(snapshot.customer.focusTags), generatedSnapshot: JSON.stringify(snapshot), generatedAt: new Date(snapshot.generatedAt) } });
    await tx.salesCase.update({ where: { id: salesCase.id }, data: { stage: "REPORT_GENERATED", result: "IN_PROGRESS", events: { create: { eventType: "REPORT_GENERATED", metadata: JSON.stringify({ reportId: createdReport.id, version }) } } } });
    await tx.customer.update({ where: { id: salesCase.customerId }, data: { status: "REPORT_GENERATED" } });
    return createdReport;
  });
  return Response.json(report, { status: 201 });
}
