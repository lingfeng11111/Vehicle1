import { buildDefaultItemFields, type TemplateItemLike } from "@/services/inspection-engine";
import { getInspectionResultLabel } from "@/services/inspection-result";
import { resolveInspectionSeverity } from "@/services/inspection-severity";
import { REPORT_INSPECTOR_NAME, REPORT_REVIEWER_NAME } from "@/config/report-people";

export type StandardReportExecutionItem = {
  id: string;
  checkItemId: string | null;
  positionId: string | null;
  zone: string;
  category: string;
  itemName: string;
  result: string;
  resultStatus: string;
  findingMode?: string | null;
  isAbnormal: boolean;
  severity: number;
  basePriority: number;
  professionalDescription: string | null;
  consumerExplanation: string | null;
  futureRisk: string | null;
  repairSuggestion: string | null;
  estimatedRepairCost: number | null;
  notes: string | null;
  mediaUrl?: string | null;
  operatorName: string | null;
  reviewerName: string | null;
  findings: Array<{
    id: string;
    criterionId: string;
    status: string;
    valueText: string | null;
    note: string | null;
    criterion: { code: string; label: string; axis: string; hardStopCriterion?: boolean | null };
  }>;
  evidence: Array<{ id: string; uri: string; mediaType: string; caption: string | null }>;
};

export function materializeStandardReportItems(
  templateItems: TemplateItemLike[],
  executionItems: StandardReportExecutionItem[],
): StandardReportExecutionItem[] {
  const executionByCheckItem = new Map(executionItems.filter((item) => item.checkItemId).map((item) => [item.checkItemId as string, item]));
  const materialized = templateItems.map((templateItem) => {
    const execution = executionByCheckItem.get(templateItem.id);
    if (execution) return normalizeReportItem(execution);

    const defaults = buildDefaultItemFields(templateItem);
    return {
      id: "template-" + templateItem.id,
      checkItemId: templateItem.id,
      positionId: templateItem.position.id,
      zone: templateItem.position.code,
      category: templateItem.category,
      itemName: templateItem.name,
      result: "正常",
      resultStatus: "NORMAL",
      findingMode: "CRITERION",
      isAbnormal: false,
      severity: 0,
      basePriority: defaults.basePriority,
      professionalDescription: defaults.professionalDescription,
      consumerExplanation: defaults.consumerExplanation,
      futureRisk: defaults.futureRisk,
      repairSuggestion: defaults.repairSuggestion,
      estimatedRepairCost: null,
      notes: null,
      mediaUrl: null,
      operatorName: null,
      reviewerName: null,
      findings: [],
      evidence: [],
    };
  });
  const templateIds = new Set(templateItems.map((item) => item.id));
  const legacyItems = executionItems.filter((item) => !item.checkItemId || !templateIds.has(item.checkItemId));
  return [...materialized, ...legacyItems.map(normalizeReportItem)];
}

function normalizeReportItem(item: StandardReportExecutionItem): StandardReportExecutionItem {
  const isAbnormal = item.resultStatus === "ABNORMAL" || item.resultStatus === "BLOCKED";
  const hasDetailedAnalysis = item.resultStatus === "ABNORMAL";
  const result = getInspectionResultLabel({
    result: item.result,
    resultStatus: item.resultStatus,
    isAbnormal,
    findings: item.findings,
  });
  const severity = resolveInspectionSeverity({
    status: item.resultStatus,
    storedSeverity: item.severity,
    findings: item.findings,
  });
  const normalized = result
    ? { ...item, result, severity, isAbnormal, findingMode: item.findingMode ?? "CRITERION" }
    : { ...item, severity, isAbnormal, findingMode: item.findingMode ?? "CRITERION" };
  if (hasDetailedAnalysis) return normalized;
  return {
    ...normalized,
    professionalDescription: null,
    consumerExplanation: null,
    futureRisk: null,
    repairSuggestion: null,
    estimatedRepairCost: null,
  };
}

export type StandardReportInput = {
  vehicle: {
    id: string;
    code: string;
    vin: string;
    plateNo: string;
    brand: string;
    series: string;
    model: string;
    modelYear: number;
    mileage: number;
    listingPrice: number;
    energyType: string;
    coverImage?: string | null;
    displayTags?: string | string[] | null;
  };
  inspection: {
    id: string;
    version: number;
    inspectionDate: Date;
    inspectorName: string;
    reviewerName: string | null;
    overallRiskLevel: string;
    summary: string;
    items: StandardReportExecutionItem[];
  };
  templateItems: TemplateItemLike[];
  templateVersionId: string;
  evaluation: {
    id: string;
    version: number;
    ruleSetVersionId: string;
    legalTradeabilityStatus: string;
    hardStop: boolean;
    hardStopCode: string | null;
    accidentClassification: string;
    floodStatus: string;
    floodFindingCount: number;
    currentSafetyConclusion: string;
    functionConclusion: string;
    circulationRecommendation: string;
    recommendationReason: string | null;
    outcomes: Array<{
      code: string;
      axis: string;
      status: string;
      isBlocking: boolean;
      valueText: string | null;
      reason: string | null;
    }>;
  };
  market: {
    newCarReferencePrice: number;
    marketLow: number;
    marketMedian: number;
    marketHigh: number;
    conditionAdjustedLow: number;
    conditionAdjustedHigh: number;
    source: string;
    capturedAt: Date;
  } | null;
  generatedAt: Date;
};

export function buildStandardReportDocument(input: StandardReportInput) {
  const facts = materializeStandardReportItems(input.templateItems, input.inspection.items)
    .map((item, index) => ({
      index,
      fact: {
        id: item.id,
        source: { checkItemId: item.checkItemId, positionId: item.positionId },
        zone: item.zone,
        category: item.category,
        itemName: item.itemName,
        result: item.result,
        resultStatus: item.resultStatus,
        findingMode: item.findingMode ?? "CRITERION",
        isAbnormal: item.isAbnormal,
        severity: item.severity,
        basePriority: item.basePriority,
        mediaUrl: item.mediaUrl ?? null,
        ...(item.resultStatus === "ABNORMAL" && item.isAbnormal
          ? {
              professionalDescription: item.professionalDescription,
              consumerExplanation: item.consumerExplanation,
              futureRisk: item.futureRisk,
              repairSuggestion: item.repairSuggestion,
              estimatedRepairCost: item.estimatedRepairCost,
            }
          : {}),
        notes: item.notes,
        operatorName: item.operatorName ? REPORT_INSPECTOR_NAME : item.operatorName,
        reviewerName: item.reviewerName ? REPORT_REVIEWER_NAME : item.reviewerName,
        findings: item.findings.map((finding) => ({
          id: finding.id,
          criterionId: finding.criterionId,
          code: finding.criterion.code,
          label: finding.criterion.label,
          axis: finding.criterion.axis,
          hardStopCriterion: finding.criterion.hardStopCriterion ?? false,
          status: finding.status,
          valueText: finding.valueText,
          note: finding.note,
        })),
        evidence: item.evidence,
      },
    }))
    .sort((left, right) => {
      const abnormalOrder = Number(right.fact.isAbnormal) - Number(left.fact.isAbnormal);
      if (abnormalOrder !== 0) return abnormalOrder;
      if (left.fact.isAbnormal) {
        return right.fact.severity - left.fact.severity || right.fact.basePriority - left.fact.basePriority || left.index - right.index;
      }
      return left.index - right.index;
    })
    .map(({ fact }) => fact);

  return {
    snapshotVersion: "1.0.0",
    reportMode: "STANDARD" as const,
    generatedAt: input.generatedAt.toISOString(),
    source: {
      inspectionId: input.inspection.id,
      inspectionVersion: input.inspection.version,
      evaluationId: input.evaluation.id,
      evaluationVersion: input.evaluation.version,
      ruleSetVersionId: input.evaluation.ruleSetVersionId,
      templateVersionId: input.templateVersionId,
    },
    vehicle: input.vehicle,
    inspection: {
      id: input.inspection.id,
      version: input.inspection.version,
      inspectionDate: input.inspection.inspectionDate.toISOString(),
      inspectorName: REPORT_INSPECTOR_NAME,
      reviewerName: REPORT_REVIEWER_NAME,
      overallRiskLevel: input.inspection.overallRiskLevel,
      summary: input.inspection.summary,
    },
    decision: {
      legalTradeabilityStatus: input.evaluation.legalTradeabilityStatus,
      hardStop: input.evaluation.hardStop,
      hardStopCode: input.evaluation.hardStopCode,
      accidentClassification: input.evaluation.accidentClassification,
      floodStatus: input.evaluation.floodStatus,
      floodFindingCount: input.evaluation.floodFindingCount,
      currentSafetyConclusion: input.evaluation.currentSafetyConclusion,
      functionConclusion: input.evaluation.functionConclusion,
      circulationRecommendation: input.evaluation.circulationRecommendation,
      recommendationReason: input.evaluation.recommendationReason,
    },
    outcomes: input.evaluation.outcomes,
    market: input.market
      ? { ...input.market, capturedAt: input.market.capturedAt.toISOString() }
      : null,
    facts,
    disclaimer: "本报告根据现场检查结果和市场参考信息整理，用于了解车况与购车风险；实际购买前请现场看车、试驾并以合同为准。",
  };
}
