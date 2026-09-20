import { describe, expect, it } from "vitest";
import { TEMPLATE_DEFINITIONS } from "../../prisma/template-catalog-loader";
import type { TemplateItemLike } from "@/services/inspection-engine";
import { buildStandardReportDocument, materializeStandardReportItems, type StandardReportExecutionItem } from "@/services/standard-report";

function templateItems(definition: typeof TEMPLATE_DEFINITIONS.standard): TemplateItemLike[] {
  return definition.sections.flatMap((section) => section.positions.flatMap((position) => position.checkItems.map((item, sortOrder) => ({
    id: `${item.sourceSheet}:${item.sourceRow}`,
    code: item.code,
    name: item.name,
    category: item.category,
    componentClass: item.componentClass ?? "OTHER",
    accidentDecisionParticipant: item.accidentDecisionParticipant ?? false,
    description: item.description,
    sortOrder,
    position: { id: `${position.code}-id`, code: position.code, name: position.name, floodAggregationKey: position.floodAggregationKey },
    section: { code: section.code, name: section.name, axis: section.axis },
    criteria: item.criteria.map((criterion, criterionSortOrder) => ({
      id: `${criterion.sourceSheet}:${criterion.sourceRow}:${criterion.sourceColumn}:${criterion.sourcePartIndex}`,
      code: criterion.code,
      label: criterion.label,
      axis: criterion.axis,
      criterionType: criterion.criterionType,
      description: criterion.description,
      ruleKey: criterion.ruleKey,
      countsAsDistinctFloodFinding: criterion.countsAsDistinctFloodFinding ?? false,
      hardStopCriterion: criterion.hardStopCriterion ?? false,
      sortOrder: criterionSortOrder,
    })),
  }))));
}

function execution(item: TemplateItemLike, abnormal = false): StandardReportExecutionItem {
  return {
    id: `execution-${item.id}`,
    checkItemId: item.id,
    positionId: item.position.id,
    zone: item.position.code,
    category: item.category,
    itemName: item.name,
    result: abnormal ? "异常" : "正常",
    resultStatus: abnormal ? "ABNORMAL" : "NORMAL",
    isAbnormal: abnormal,
    severity: abnormal ? 2 : 0,
    basePriority: abnormal ? 5 : 1,
    professionalDescription: "测试现场事实。",
    consumerExplanation: abnormal ? "需要关注该项目。" : "当前未发现该项目异常。",
    futureRisk: abnormal ? "需要复核后续风险。" : "当前未发现明确的后续风险。",
    repairSuggestion: abnormal ? "建议复核。" : "无需维修。",
    estimatedRepairCost: abnormal ? 1000 : null,
    notes: null,
    operatorName: "测试员",
    reviewerName: null,
    findings: [],
    evidence: [],
  };
}

function standardInput(template: TemplateItemLike[], items: StandardReportExecutionItem[]) {
  return {
    vehicle: { id: "vehicle-1", code: "TEST-001", vin: "VIN-001", plateNo: "测A·001", brand: "测试", series: "系列", model: "车型", modelYear: 2022, mileage: 10000, listingPrice: 100000, energyType: "ICE" },
    inspection: { id: "inspection-1", version: 1, inspectionDate: new Date("2026-09-05T00:00:00.000Z"), inspectorName: "测试员", reviewerName: null, overallRiskLevel: "LOW", summary: "测试摘要", items },
    templateItems: template,
    templateVersionId: "template-version-1",
    evaluation: { id: "evaluation-1", version: 1, ruleSetVersionId: "rules-1", legalTradeabilityStatus: "CLEAR", hardStop: false, hardStopCode: null, accidentClassification: "NONE", floodStatus: "NONE", floodFindingCount: 0, currentSafetyConclusion: "PASS", functionConclusion: "PASS", circulationRecommendation: "CIRCULATE", recommendationReason: "测试结论", outcomes: [] },
    market: null,
    generatedAt: new Date("2026-09-05T00:00:00.000Z"),
  };
}

describe("standard report materialization", () => {
  it("materializes the full standard and new-energy catalogs while keeping abnormal facts first", () => {
    const standardTemplate = templateItems(TEMPLATE_DEFINITIONS.standard);
    const newEnergyTemplate = templateItems(TEMPLATE_DEFINITIONS.newEnergy);
    const abnormal = execution(standardTemplate[20] as TemplateItemLike, true);
    const materialized = materializeStandardReportItems(standardTemplate, [abnormal]);
    const document = buildStandardReportDocument(standardInput(standardTemplate, [abnormal]));

    expect(standardTemplate).toHaveLength(179);
    expect(newEnergyTemplate).toHaveLength(193);
    expect(materialized).toHaveLength(179);
    expect(document.facts).toHaveLength(179);
    expect(document.facts[0]?.isAbnormal).toBe(true);
    expect(document.facts.filter((fact) => !fact.isAbnormal).map((fact) => fact.source.checkItemId)).toEqual(standardTemplate.filter((item) => item.id !== abnormal.checkItemId).map((item) => item.id));

    const normalExecution = execution(standardTemplate[0] as TemplateItemLike);
    const normalizedNormal = materializeStandardReportItems(standardTemplate, [normalExecution])[0];
    expect(normalizedNormal).toMatchObject({ professionalDescription: null, consumerExplanation: null, futureRisk: null, repairSuggestion: null, estimatedRepairCost: null });

    const normalFact = document.facts.find((fact) => fact.source.checkItemId === standardTemplate[0]?.id);
    expect(normalFact).not.toHaveProperty("professionalDescription");
    expect(normalFact).not.toHaveProperty("consumerExplanation");
  });

  it("keeps the reached criterion aligned in standard report facts", () => {
    const standardTemplate = templateItems(TEMPLATE_DEFINITIONS.standard);
    const abnormal = {
      ...execution(standardTemplate[0] as TemplateItemLike, true),
      result: "轻微变形",
      findings: [{
        id: "finding-1",
        criterionId: "criterion-1",
        status: "REACHED",
        valueText: null,
        note: null,
        criterion: { code: "ACCI_01", label: "凹陷≥3cm²", axis: "ACCIDENT_HISTORY" },
      }],
    };

    const materialized = materializeStandardReportItems(standardTemplate, [abnormal]);

    expect(materialized.find((item) => item.checkItemId === standardTemplate[0]?.id)?.result).toBe("凹陷≥3cm²");
  });
});
