import { PrismaClient } from "@prisma/client";
import { REPORT_INSPECTOR_NAME, REPORT_REVIEWER_NAME } from "../src/config/report-people";
import { buildReportSnapshot } from "../src/services/report-generator";
import { buildStandardReportDocument, materializeStandardReportItems, type StandardReportExecutionItem } from "../src/services/standard-report";
import type { TemplateItemLike } from "../src/services/inspection-engine";
import { TEMPLATE_DEFINITIONS, TEMPLATE_SOURCE_MANIFEST, type TemplateDefinitionSeed } from "./template-catalog-loader";
import { seedMediaAssets } from "./media-assets";

const prisma = new PrismaClient();
const demoDate = new Date("2025-05-20T10:30:00.000Z");

const v001Items = [
  { zone: "FRONT_LEFT", category: "STRUCTURE", itemName: "左前纵梁", result: "凹陷≥3cm²", isAbnormal: true, severity: 1, basePriority: 5, professionalDescription: "左前纵梁存在达到判定标准的凹陷，未见切割、焊接或更换痕迹。", consumerExplanation: "属于结构件受力异常的迹象，建议结合修复记录与复检结论理解安全边界。", futureRisk: "长期使用前建议关注修复后尺寸与四轮定位数据。", repairSuggestion: "建议由专业车身修复机构进行校正复核，复检后再交付。", estimatedRepairCost: 800 },
  { zone: "FRONT_LEFT", category: "EXTERIOR", itemName: "左前翼子板", result: "划痕", isAbnormal: true, severity: 1, basePriority: 2, professionalDescription: "左前翼子板漆面存在划痕、色差与轻微流痕，未见结构件更换。", consumerExplanation: "属于外观修复信息，不等同于结构损伤。", futureRisk: "漆面老化后可能出现色差加重。", repairSuggestion: "无需立即维修，可根据外观需求进行局部处理。", estimatedRepairCost: 600 },
  { zone: "FRONT_RIGHT", category: "POWERTRAIN", itemName: "怠速工况", result: "正常", isAbnormal: false, severity: 0, basePriority: 5, professionalDescription: "启动顺畅，怠速稳定，动力输出平顺，未见明显异响与渗漏。", consumerExplanation: "动力系统是本次检测中的稳定项，当前未发现影响可靠性的异常。", futureRisk: "按周期更换机油、机滤并观察冷却液状态。", repairSuggestion: "按保养周期维护，无需额外维修。", estimatedRepairCost: 0 },
  { zone: "REAR_RIGHT", category: "EXTERIOR", itemName: "右后翼子板（外 覆）", result: "色差1-3级", isAbnormal: true, severity: 1, basePriority: 2, professionalDescription: "右后翼子板外覆漆面存在色差，表面有轻微流痕，未见明显钣金切割痕迹。", consumerExplanation: "属于外观修复，可与结构检测结果区分理解。", futureRisk: "漆面可能在长期日晒后出现色差。", repairSuggestion: "无需立即维修，可按外观要求维护。", estimatedRepairCost: 600 },
  { zone: "CHASSIS", category: "CHASSIS", itemName: "下摆臂胶套", result: "胶套开裂", isAbnormal: true, severity: 1, basePriority: 4, professionalDescription: "下摆臂胶套存在老化并伴随轻微开裂，暂未影响行驶稳定性。", consumerExplanation: "属于使用过程中的底盘维护项目，建议纳入近期保养预算。", futureRisk: "继续使用后可能出现异响或底盘松旷感。", repairSuggestion: "建议纳入近期保养计划，按需更换相关衬套。", estimatedRepairCost: 1800 },
  { zone: "DOCUMENTS", category: "DOCUMENT", itemName: "表显里程匹配度", result: "基本匹配", isAbnormal: false, severity: 0, basePriority: 3, professionalDescription: "仪表里程 68,620 公里，与现有维保节点基本匹配。", consumerExplanation: "当前记录未发现明显里程矛盾，仍建议核验原始凭证。", futureRisk: "历史资料不完整时，后续保值判断会有不确定性。", repairSuggestion: "签约前核对维保与过户资料。", estimatedRepairCost: 0 },
];

type TemplateLookup = {
  templateId: string;
  versionId: string;
  itemByCode: Map<string, { id: string; positionId: string; name: string; category: string; zone: string }>;
  criterionByKey: Map<string, { id: string; axis: string; criterionType: string }>;
  itemBySourceKey: Map<string, { id: string; positionId: string; name: string; category: string; zone: string }>;
  criterionBySourceKey: Map<string, { id: string; axis: string; criterionType: string }>;
};

async function createTemplate(definition: TemplateDefinitionSeed): Promise<TemplateLookup> {
  const template = await prisma.inspectionTemplate.create({
    data: {
      code: definition.code,
      name: definition.name,
      description: definition.description,
      energyTypeScope: definition.energyTypeScope,
      active: true,
      versions: {
        create: {
          version: 1,
          status: "PUBLISHED",
          effectiveFrom: new Date("2025-05-01T00:00:00.000Z"),
          definitionSnapshot: JSON.stringify({
            sourceWorkbook: "十字格鉴定22 (1)(3).xlsx",
            sourceSheets: ["整车通用", "左前方位", "左后方位", "右前方位", "右后方位", "三大件专项", "新能源专项", "判定总则"],
            importScope: "complete applicable workbook catalog; fire rule excluded from active scope",
            sourceTotals: TEMPLATE_SOURCE_MANIFEST.totals,
          }),
          sections: {
            create: definition.sections.map((section, sectionIndex) => ({
              code: section.code,
              name: section.name,
              axis: section.axis,
              description: section.description,
              sortOrder: sectionIndex,
              positions: {
                create: section.positions.map((position, positionIndex) => ({
                  code: position.code,
                  name: position.name,
                  side: position.side ?? null,
                  floodAggregationKey: position.floodAggregationKey ?? null,
                  sortOrder: positionIndex,
                  checkItems: {
                    create: position.checkItems.map((item, itemIndex) => ({
                      code: item.code,
                      name: item.name,
                      category: item.category,
                      description: item.description,
                      componentClass: item.componentClass ?? "OTHER",
                      accidentDecisionParticipant: item.accidentDecisionParticipant ?? false,
                      sortOrder: itemIndex,
                      sourceSheet: item.sourceSheet,
                      sourceRow: item.sourceRow,
                      sourceSection: item.sourceSection,
                      sourceText: item.sourceText,
                      criteria: {
                        create: item.criteria.map((criterionItem, criterionIndex) => ({
                          code: criterionItem.code,
                          label: criterionItem.label,
                          axis: criterionItem.axis,
                          criterionType: criterionItem.criterionType,
                          description: criterionItem.description,
                          ruleKey: criterionItem.ruleKey ?? null,
                          countsAsDistinctFloodFinding: criterionItem.countsAsDistinctFloodFinding ?? false,
                          hardStopCriterion: criterionItem.hardStopCriterion ?? false,
                          sortOrder: criterionIndex,
                          sourceSheet: criterionItem.sourceSheet,
                          sourceRow: criterionItem.sourceRow,
                          sourceColumn: criterionItem.sourceColumn,
                          sourcePartIndex: criterionItem.sourcePartIndex,
                          sourceText: criterionItem.sourceText,
                          sourceNote: criterionItem.sourceNote,
                        })),
                      },
                    })),
                  },
                })),
              },
            })),
          },
        },
      },
    },
    include: { versions: true },
  });
  const version = template.versions[0];
  if (!version) throw new Error(`Template ${definition.code} did not create a version`);
  const hydrated = await prisma.inspectionTemplateVersion.findUniqueOrThrow({
    where: { id: version.id },
    include: { sections: { include: { positions: { include: { checkItems: { include: { criteria: true } } } } } } },
  });
  const itemByCode = new Map<string, { id: string; positionId: string; name: string; category: string; zone: string }>();
  const criterionByKey = new Map<string, { id: string; axis: string; criterionType: string }>();
  const itemBySourceKey = new Map<string, { id: string; positionId: string; name: string; category: string; zone: string }>();
  const criterionBySourceKey = new Map<string, { id: string; axis: string; criterionType: string }>();
  hydrated.sections.forEach((section) => section.positions.forEach((position) => position.checkItems.forEach((item) => {
    const lookup = { id: item.id, positionId: position.id, name: item.name, category: item.category, zone: position.code };
    itemByCode.set(item.code, lookup);
    if (item.sourceSheet && item.sourceRow) itemBySourceKey.set(`${item.sourceSheet}:${item.sourceRow}`, lookup);
    item.criteria.forEach((criterionItem) => {
      criterionByKey.set(`${item.code}:${criterionItem.code}`, { id: criterionItem.id, axis: criterionItem.axis, criterionType: criterionItem.criterionType });
      if (criterionItem.sourceSheet && criterionItem.sourceRow && criterionItem.sourceColumn) criterionBySourceKey.set(`${criterionItem.sourceSheet}:${criterionItem.sourceRow}:${criterionItem.sourceColumn}:${criterionItem.sourcePartIndex}`, { id: criterionItem.id, axis: criterionItem.axis, criterionType: criterionItem.criterionType });
    });
  })));
  return { templateId: template.id, versionId: version.id, itemByCode, criterionByKey, itemBySourceKey, criterionBySourceKey };
}

const itemSourceByName: Record<string, string> = {
  "左前纵梁": "左前方位:4",
  "左前翼子板": "左前方位:42",
  "左前大灯": "左前方位:45",
  "右前车门": "右前方位:40",
  "怠速工况": "三大件专项:5",
  "机体渗漏": "三大件专项:8",
  "变速箱工况": "三大件专项:17",
  "右后翼子板（外 覆）": "右后方位:37",
  "右后纵梁": "右后方位:4",
  "驾驶舱内线束及 插接件（左半）": "左前方位:34",
  "下摆臂胶套": "三大件专项:21",
  "备胎/工具/千斤顶/三角 警示牌/灭火器/随车钥 匙": "左后方位:27",
  "表显里程匹配度": "整车通用:7",
  "证件与手续": "整车通用:4",
  "动力电池包": "新能源专项:4",
};

type SeedExecutionStatus = "UNCHECKED" | "NORMAL" | "ABNORMAL" | "NOT_APPLICABLE" | "BLOCKED";
type LegacyInspectionItem = (typeof v001Items)[number] & {
  resultStatus?: SeedExecutionStatus;
  findingMode?: "CRITERION" | "DIRECT";
  notes?: string | null;
};

const makeItems = (items: LegacyInspectionItem[], catalog: TemplateLookup, operatorName: string, checkedAt: Date) => items.map((item) => {
  const sourceKey = itemSourceByName[item.itemName];
  if (!sourceKey) throw new Error(`Seed item is missing a canonical template source mapping: ${item.itemName}`);
  const templateItem = catalog.itemBySourceKey.get(sourceKey);
  if (!templateItem) throw new Error(`Seed item source mapping does not exist in this template: ${item.itemName} -> ${sourceKey}`);
  const resultStatus = item.resultStatus ?? (item.isAbnormal ? "ABNORMAL" : "NORMAL");
  const isAbnormal = resultStatus === "ABNORMAL" || resultStatus === "BLOCKED";
  return {
    ...item,
    // The template catalog owns the canonical display name, category, and
    // zone. Seed data may describe a business scenario, but it must never
    // create a second vocabulary for the same inspection check item.
    itemName: templateItem.name,
    category: templateItem.category,
    zone: templateItem.zone,
    resultStatus,
    findingMode: resultStatus === "ABNORMAL" ? item.findingMode ?? "CRITERION" : "CRITERION",
    isAbnormal,
    severity: resultStatus === "NORMAL" || resultStatus === "NOT_APPLICABLE"
      ? 0
      : resultStatus === "BLOCKED"
        ? Math.max(item.severity, 3)
        : Math.max(item.severity, 1),
    ...(isAbnormal && resultStatus === "ABNORMAL"
      ? {}
      : {
          professionalDescription: null,
          consumerExplanation: null,
          futureRisk: null,
          repairSuggestion: null,
          estimatedRepairCost: null,
        }),
    operatorName,
    checkedAt,
    checkItemId: templateItem.id,
    positionId: templateItem.positionId,
  };
});

async function createBaselineRuleSet() {
  const config = {
    accident: { classifications: ["NONE", "ORDINARY", "MAJOR"], decisionParticipantOnly: true, grouping: "inspector-confirmed" },
    flood: { count: "distinct selected criterion", aggregateBy: "position", fireRules: "out-of-scope" },
    circulationGates: ["LEGAL_TRADEABILITY", "CURRENT_SAFETY", "CORE_FUNCTION", "DISCLOSURE", "REPAIR_ECONOMICS"],
    personalization: "explanation-order-fit-only",
  };
  const ruleSet = await prisma.appraisalRuleSet.create({
    data: {
      code: "BASELINE_CIRCULATION",
      name: "基础流通建议规则",
      description: "非个性化硬门槛与事实维度的可解释基线规则。",
      versions: {
        create: {
          version: 1,
          status: "PUBLISHED",
          configJson: JSON.stringify(config),
          effectiveFrom: new Date("2025-05-01T00:00:00.000Z"),
        },
      },
    },
    include: { versions: true },
  });
  const version = ruleSet.versions[0];
  if (!version) throw new Error("Baseline rule set did not create a version");
  return version;
}

type EvaluationValues = {
  legalTradeabilityStatus: string;
  hardStop: boolean;
  hardStopCode?: string;
  accidentClassification: "NONE" | "ORDINARY" | "MAJOR";
  floodStatus: string;
  floodFindingCount: number;
  currentSafetyConclusion: string;
  functionConclusion: string;
  circulationRecommendation: string;
  recommendationReason: string;
  outcomes: Array<{ code: string; axis: string; status: string; isBlocking?: boolean; valueText?: string; reason: string }>;
};

function completedEvaluation(reason: string, maintenance = false): EvaluationValues {
  return {
    legalTradeabilityStatus: "CLEAR", hardStop: false, accidentClassification: "NONE", floodStatus: "NONE", floodFindingCount: 0,
    currentSafetyConclusion: "PASS", functionConclusion: maintenance ? "PASS_WITH_MAINTENANCE" : "PASS", circulationRecommendation: "CIRCULATE", recommendationReason: reason,
    outcomes: [
      { code: "LEGAL_TRADEABILITY", axis: "LEGAL_TRADEABILITY", status: "CLEAR", reason: "手续核验未见当前硬停止项。" },
      { code: "ACCIDENT_HISTORY", axis: "ACCIDENT_HISTORY", status: "NONE", valueText: "NONE", reason: "未发现重大事故判定项。" },
      { code: "FLOOD_DAMAGE", axis: "FLOOD_DAMAGE", status: "NONE", valueText: "0", reason: "未发现水泡判定项。" },
      { code: "CURRENT_SAFETY", axis: "CURRENT_SAFETY", status: "PASS", reason: "当前安全相关项目通过检查。" },
      { code: "CORE_FUNCTION", axis: "CORE_FUNCTION", status: maintenance ? "PASS_WITH_MAINTENANCE" : "PASS", reason: maintenance ? "核心功能正常，使用耗损纳入整备。" : "核心功能状态正常。" },
      { code: "DISCLOSURE", axis: "DISCLOSURE", status: "STANDARD", reason: "按标准报告披露检查事实。" },
      { code: "REPAIR_ECONOMICS", axis: "REPAIR_ECONOMICS", status: maintenance ? "MAINTENANCE" : "LOW", reason: maintenance ? "存在可控的近期维护成本。" : "当前无明显维修预算压力。" },
      { code: "CIRCULATION_RECOMMENDATION", axis: "CIRCULATION", status: "CIRCULATE", reason },
    ],
  };
}

async function createEvaluation(inspectionId: string, ruleSetVersionId: string, values: EvaluationValues) {
  return prisma.inspectionEvaluation.create({
    data: {
      inspectionId,
      ruleSetVersionId,
      version: 1,
      legalTradeabilityStatus: values.legalTradeabilityStatus,
      hardStop: values.hardStop,
      hardStopCode: values.hardStopCode ?? null,
      accidentClassification: values.accidentClassification,
      floodStatus: values.floodStatus,
      floodFindingCount: values.floodFindingCount,
      currentSafetyConclusion: values.currentSafetyConclusion,
      functionConclusion: values.functionConclusion,
      circulationRecommendation: values.circulationRecommendation,
      recommendationReason: values.recommendationReason,
      outcomeJson: JSON.stringify({
        legalTradeabilityStatus: values.legalTradeabilityStatus,
        hardStop: values.hardStop,
        accidentClassification: values.accidentClassification,
        floodStatus: values.floodStatus,
        floodFindingCount: values.floodFindingCount,
        currentSafetyConclusion: values.currentSafetyConclusion,
        functionConclusion: values.functionConclusion,
        circulationRecommendation: values.circulationRecommendation,
      }),
      evaluatorName: REPORT_REVIEWER_NAME,
      outcomes: { create: values.outcomes.map((outcome) => ({ ...outcome, isBlocking: outcome.isBlocking ?? false, valueText: outcome.valueText ?? null })) },
    },
    include: { outcomes: true },
  });
}

async function createFinding(args: {
  inspectionId: string;
  inspectionItemId: string;
  criterionId: string;
  note: string;
  selectedBy: string;
  accident?: { damageGroupId: string; classification: "NONE" | "ORDINARY" | "MAJOR"; notes: string };
  evidence?: { uri: string; caption: string };
}) {
  const finding = await prisma.inspectionFinding.create({
    data: {
      inspectionItemId: args.inspectionItemId,
      criterionId: args.criterionId,
      status: "REACHED",
      note: args.note,
      selectedBy: args.selectedBy,
    },
  });
  if (args.accident) {
    await prisma.inspectionAccidentAssessment.create({
      data: {
        inspectionId: args.inspectionId,
        findingId: finding.id,
        damageGroupId: args.accident.damageGroupId,
        classification: args.accident.classification,
        decisionParticipant: true,
        notes: args.accident.notes,
        confirmedBy: REPORT_REVIEWER_NAME,
        confirmedAt: new Date("2025-05-20T11:00:00.000Z"),
      },
    });
  }
  if (args.evidence) {
    await prisma.inspectionEvidence.create({
      data: {
        inspectionId: args.inspectionId,
        inspectionItemId: args.inspectionItemId,
        findingId: finding.id,
        uri: args.evidence.uri,
        mediaType: "image/jpeg",
        caption: args.evidence.caption,
        capturedBy: args.selectedBy,
        capturedAt: new Date("2025-05-20T10:45:00.000Z"),
      },
    });
  }
  return finding;
}

async function loadInspectionForSnapshot(inspectionId: string) {
  return prisma.inspection.findUniqueOrThrow({
    where: { id: inspectionId },
    include: { items: { include: { findings: { include: { criterion: true } }, evidence: true } } },
  });
}

async function loadTemplateItemsForSnapshot(templateVersionId: string): Promise<TemplateItemLike[]> {
  const templateVersion = await prisma.inspectionTemplateVersion.findUniqueOrThrow({
    where: { id: templateVersionId },
    include: { sections: { orderBy: { sortOrder: "asc" }, include: { positions: { orderBy: { sortOrder: "asc" }, include: { checkItems: { orderBy: { sortOrder: "asc" }, include: { criteria: { orderBy: { sortOrder: "asc" } } } } } } } } },
  });
  return templateVersion.sections.flatMap((section) => section.positions.flatMap((position) => position.checkItems.map((item) => ({
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
}

async function createStandardSnapshot(args: {
  vehicle: { id: string; code: string; vin: string; plateNo: string; brand: string; series: string; model: string; modelYear: number; mileage: number; listingPrice: number; energyType: string; coverImage?: string | null; displayTags?: string | null };
  inspection: Awaited<ReturnType<typeof loadInspectionForSnapshot>>;
  templateVersionId: string;
  evaluation: Awaited<ReturnType<typeof createEvaluation>>;
  market: { newCarReferencePrice: number; marketLow: number; marketMedian: number; marketHigh: number; conditionAdjustedLow: number; conditionAdjustedHigh: number; source: string; capturedAt: string } | null;
  generatedAt: Date;
}) {
  const templateItems = await loadTemplateItemsForSnapshot(args.templateVersionId);
  const snapshot = buildStandardReportDocument({
    vehicle: args.vehicle,
    inspection: {
      id: args.inspection.id,
      version: args.inspection.version,
      inspectionDate: args.inspection.inspectionDate,
      inspectorName: args.inspection.inspectorName,
      reviewerName: args.inspection.reviewerName,
      overallRiskLevel: args.inspection.overallRiskLevel,
      summary: args.inspection.summary,
      items: args.inspection.items as unknown as StandardReportExecutionItem[],
    },
    templateItems,
    templateVersionId: args.templateVersionId,
    evaluation: args.evaluation,
    market: args.market ? { ...args.market, capturedAt: new Date(args.market.capturedAt) } : null,
    generatedAt: args.generatedAt,
  });
  return prisma.standardReportSnapshot.create({
    data: { inspectionId: args.inspection.id, evaluationId: args.evaluation.id, templateVersionId: args.templateVersionId, version: 1, snapshotVersion: "1.0.0", snapshotJson: JSON.stringify(snapshot), generatedAt: args.generatedAt, generatedBy: "seed" },
  });
}

async function createPersonalizedSeedReport(args: {
  salesCaseId: string;
  standardReportSnapshotId: string;
  customer: { id: string; name: string };
  demand: { id: string; focusTags: string; riskConcerns: string; budgetMin: number | null; budgetMax: number | null; usageScene: string; remark: string | null };
  vehicle: { id: string; code: string; vin: string; plateNo: string; brand: string; series: string; model: string; modelYear: number; mileage: number; listingPrice: number; coverImage?: string | null; displayTags?: string | null };
  inspection: Awaited<ReturnType<typeof loadInspectionForSnapshot>>;
  market: { newCarReferencePrice: number; marketLow: number; marketMedian: number; marketHigh: number; conditionAdjustedLow: number; conditionAdjustedHigh: number; source: string; capturedAt: string };
  generatedAt: Date;
}) {
  const templateItems = await loadTemplateItemsForSnapshot(args.inspection.templateVersionId as string);
  const items = materializeStandardReportItems(templateItems, args.inspection.items as unknown as StandardReportExecutionItem[]);
  const snapshot = buildReportSnapshot({ customer: args.customer, demand: args.demand, vehicle: args.vehicle, inspection: { id: args.inspection.id, version: args.inspection.version, inspectionDate: args.inspection.inspectionDate.toISOString(), inspectorName: args.inspection.inspectorName, overallRiskLevel: args.inspection.overallRiskLevel, summary: args.inspection.summary, items }, market: args.market, reportMode: "PERSONALIZED", generatedAt: args.generatedAt.toISOString() });
  const personalized = await prisma.personalizedReportSnapshot.create({ data: { salesCaseId: args.salesCaseId, standardReportSnapshotId: args.standardReportSnapshotId, version: 1, focusTagsJson: args.demand.focusTags, generationMethod: "RULE_ENGINE", snapshotJson: JSON.stringify(snapshot), generatedAt: args.generatedAt, generatedBy: "seed" } });
  return prisma.report.create({ data: { salesCaseId: args.salesCaseId, inspectionId: args.inspection.id, standardReportSnapshotId: args.standardReportSnapshotId, personalizedReportSnapshotId: personalized.id, version: 1, reportMode: "PERSONALIZED", highlightTags: args.demand.focusTags, generatedSnapshot: JSON.stringify(snapshot), generatedAt: args.generatedAt } });
}

async function main() {
  await seedMediaAssets(prisma);
  await prisma.salesEvent.deleteMany();
  await prisma.report.deleteMany();
  await prisma.personalizedReportSnapshot.deleteMany();
  await prisma.standardReportSnapshot.deleteMany();
  await prisma.inspectionRuleOutcome.deleteMany();
  await prisma.inspectionEvaluation.deleteMany();
  await prisma.inspectionAccidentAssessment.deleteMany();
  await prisma.inspectionDamageGroup.deleteMany();
  await prisma.inspectionEvidence.deleteMany();
  await prisma.inspectionFinding.deleteMany();
  await prisma.salesCase.deleteMany();
  await prisma.customerDemand.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.marketPriceSnapshot.deleteMany();
  await prisma.inspectionItem.deleteMany();
  await prisma.inspection.deleteMany();
  await prisma.appraisalRuleSetVersion.deleteMany();
  await prisma.appraisalRuleSet.deleteMany();
  await prisma.inspectionCriterion.deleteMany();
  await prisma.inspectionCheckItem.deleteMany();
  await prisma.inspectionTemplatePosition.deleteMany();
  await prisma.inspectionTemplateSection.deleteMany();
  await prisma.inspectionTemplateVersion.deleteMany();
  await prisma.inspectionTemplate.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.riskTag.deleteMany();
  await prisma.mediaSource.deleteMany();

  await prisma.riskTag.createMany({ data: [
    { code: "ACCIDENT", name: "事故", category: "STRUCTURE", defaultSeverity: 3, defaultPriority: 4, consumerTemplate: "需要结合结构件与安全边界判断。" },
    { code: "WATER", name: "水泡", category: "ELECTRICAL", defaultSeverity: 3, defaultPriority: 4, consumerTemplate: "建议重点关注线束、电器与长期可靠性。" },
    { code: "ODOMETER", name: "调表", category: "DOCUMENT", defaultSeverity: 2, defaultPriority: 4, consumerTemplate: "建议复核维保记录和里程可信度。" },
    { code: "STRUCTURE_DAMAGE", name: "结构件变形", category: "STRUCTURE", defaultSeverity: 2, defaultPriority: 4, consumerTemplate: "结构件变化需要结合安全影响和修复记录理解。" },
    { code: "BODY_REPAIR", name: "钣金", category: "EXTERIOR", defaultSeverity: 1, defaultPriority: 2, consumerTemplate: "通常影响外观与后续漆面维护。" },
    { code: "PAINT", name: "喷漆", category: "EXTERIOR", defaultSeverity: 1, defaultPriority: 1, consumerTemplate: "属于外观修复信息，不等同于结构损伤。" },
    { code: "CHASSIS_WEAR", name: "底盘耗损", category: "CHASSIS", defaultSeverity: 1, defaultPriority: 3, consumerTemplate: "属于使用耗损，建议纳入近期保养计划。" },
  ] });
  await prisma.mediaSource.createMany({ data: [
    { code: "DOUYIN", name: "抖音", leads: 2, consultations: 2, reports: 2, conversions: 1 },
    { code: "XIAOHONGSHU", name: "小红书", leads: 2, consultations: 2, reports: 2, conversions: 0 },
    { code: "VIDEO", name: "视频号", leads: 1, consultations: 1, reports: 1, conversions: 0 },
    { code: "OFFLINE", name: "线下到店", leads: 1, consultations: 1, reports: 1, conversions: 0 },
  ] });

  const standardTemplate = await createTemplate(TEMPLATE_DEFINITIONS.standard);
  const newEnergyTemplate = await createTemplate(TEMPLATE_DEFINITIONS.newEnergy);
  const ruleSetVersion = await createBaselineRuleSet();

  const v001 = await prisma.vehicle.create({ data: { code: "V001", vin: "LVGBE40K5KG123456", plateNo: "湘A·482Q9", brand: "丰田", series: "凯美瑞", model: "2019款 凯美瑞 2.5G", modelYear: 2019, registrationDate: new Date("2019-05-18T00:00:00.000Z"), mileage: 68620, listingPrice: 145000, coverImage: "/api/media/vehicle-v001-cover", displayTags: JSON.stringify(["B级家用标杆", "舒适型轿车"]), energyType: "ICE", status: "AVAILABLE" } });
  const v002 = await prisma.vehicle.create({ data: { code: "V002", vin: "LSGZJ53L7MA234567", plateNo: "湘A·173K2", brand: "大众", series: "途观L", model: "2020款 途观L 330TSI", modelYear: 2020, registrationDate: new Date("2020-08-12T00:00:00.000Z"), mileage: 52180, listingPrice: 168000, coverImage: "/api/media/vehicle-v002-cover", displayTags: JSON.stringify(["德系大五座SUV", "长途出行"]), energyType: "ICE", status: "AVAILABLE" } });
  const v003 = await prisma.vehicle.create({ data: { code: "V003", vin: "LHGCM56478A345678", plateNo: "湘A·609M8", brand: "本田", series: "雅阁", model: "2018款 雅阁 260TURBO", modelYear: 2018, registrationDate: new Date("2018-11-03T00:00:00.000Z"), mileage: 82400, listingPrice: 108000, coverImage: "/api/media/vehicle-v003-cover", displayTags: JSON.stringify(["运动商务座驾", "资料待复核"]), energyType: "ICE", status: "REVIEW_REQUIRED" } });
  const v004 = await prisma.vehicle.create({ data: { code: "V004", vin: "LFMAYACC8M0124786", plateNo: "湘A·6R52P", brand: "丰田", series: "卡罗拉", model: "2021款 卡罗拉 1.2T 精英版", modelYear: 2021, registrationDate: new Date("2021-06-22T00:00:00.000Z"), mileage: 49820, listingPrice: 89800, coverImage: "/api/media/vehicle-v004-cover", displayTags: JSON.stringify(["高保值省油代步", "紧凑型家用"]), energyType: "ICE", status: "AVAILABLE" } });
  const v005 = await prisma.vehicle.create({ data: { code: "V005", vin: "LGXCE6DB8N0125934", plateNo: "湘D·3M81Q", brand: "比亚迪", series: "秦PLUS", model: "2022款 秦PLUS DM-i 55KM尊贵型", modelYear: 2022, registrationDate: new Date("2022-03-16T00:00:00.000Z"), mileage: 46350, listingPrice: 76800, coverImage: "/api/media/vehicle-v005-cover", displayTags: JSON.stringify(["插电超低油耗", "新能源通勤"]), energyType: "NEW_ENERGY", status: "AVAILABLE" } });
  const v006 = await prisma.vehicle.create({ data: { code: "V006", vin: "LS5A3DKE9LA276315", plateNo: "渝A·9K27N", brand: "长安", series: "CS75 PLUS", model: "2020款 CS75 PLUS 1.5T 自动豪华型", modelYear: 2020, registrationDate: new Date("2020-10-09T00:00:00.000Z"), mileage: 71560, listingPrice: 79800, coverImage: "/api/media/vehicle-v006-cover", displayTags: JSON.stringify(["蓝鲸黄金动力SUV", "城市多功能SUV"]), energyType: "ICE", status: "AVAILABLE" } });

  const inspection001 = await prisma.inspection.create({ data: { vehicleId: v001.id, templateVersionId: standardTemplate.versionId, version: 1, inspectionDate: demoDate, inspectorName: REPORT_INSPECTOR_NAME, reviewerName: REPORT_REVIEWER_NAME, reviewedAt: new Date("2025-05-20T11:00:00.000Z"), startedAt: new Date("2025-05-20T09:30:00.000Z"), completedAt: demoDate, lastSavedAt: demoDate, overallRiskLevel: "MEDIUM", summary: "发动机与主要电器工况正常；左前纵梁存在凹陷≥3cm²，右后翼子板存在色差，底盘胶套存在开裂。", status: "COMPLETED", items: { create: makeItems(v001Items, standardTemplate, REPORT_INSPECTOR_NAME, demoDate) } }, include: { items: true } });
  const inspection002 = await prisma.inspection.create({ data: { vehicleId: v002.id, templateVersionId: standardTemplate.versionId, version: 1, inspectionDate: new Date("2025-05-19T09:20:00.000Z"), inspectorName: REPORT_INSPECTOR_NAME, reviewerName: REPORT_REVIEWER_NAME, reviewedAt: new Date("2025-05-19T10:00:00.000Z"), completedAt: new Date("2025-05-19T09:20:00.000Z"), lastSavedAt: new Date("2025-05-19T09:20:00.000Z"), overallRiskLevel: "LOW", summary: "整体车况良好，未发现重大事故、水泡及明显动力系统异常；火烧类判定不纳入本版鉴定范围。", status: "COMPLETED", items: { create: makeItems([
    { zone: "ENGINE", category: "POWERTRAIN", itemName: "怠速工况", result: "正常", isAbnormal: false, severity: 0, basePriority: 5, professionalDescription: "工况平稳。", consumerExplanation: "动力系统当前表现正常。", futureRisk: "按周期维护。", repairSuggestion: "无需维修。", estimatedRepairCost: 0 },
    { zone: "DOCUMENTS", category: "DOCUMENT", itemName: "证件与手续", result: "正常", isAbnormal: false, severity: 0, basePriority: 3, professionalDescription: "手续资料基本齐全。", consumerExplanation: "资料当前未发现明显缺项。", futureRisk: "过户前复核原件。", repairSuggestion: "交付前复核即可。", estimatedRepairCost: 0 },
  ], standardTemplate, REPORT_INSPECTOR_NAME, new Date("2025-05-19T09:20:00.000Z")) } }, include: { items: true } });
  const inspection003 = await prisma.inspection.create({ data: { vehicleId: v003.id, templateVersionId: standardTemplate.versionId, version: 1, inspectionDate: new Date("2025-05-18T14:15:00.000Z"), inspectorName: REPORT_INSPECTOR_NAME, reviewerName: REPORT_REVIEWER_NAME, reviewedAt: new Date("2025-05-18T15:00:00.000Z"), completedAt: new Date("2025-05-18T14:15:00.000Z"), lastSavedAt: new Date("2025-05-18T14:15:00.000Z"), overallRiskLevel: "HIGH", summary: "检测到机体渗漏与右后纵梁结构修复痕迹，另有资料待补充，建议进一步复检后再进入销售沟通。", status: "COMPLETED", items: { create: makeItems([
    { zone: "REAR_RIGHT", category: "STRUCTURE", itemName: "右后纵梁", result: "凹陷≥3cm²", isAbnormal: true, severity: 2, basePriority: 5, professionalDescription: "右后纵梁存在达到判定标准的凹陷与修复痕迹，需进一步核对修复范围。", consumerExplanation: "涉及车身结构边界，建议在明确修复范围前谨慎决策。", futureRisk: "可能影响后续结构复检与保值判断。", repairSuggestion: "建议补充测量与维修记录。", estimatedRepairCost: 3500 },
    { zone: "ENGINE", category: "POWERTRAIN", itemName: "机体渗漏", result: "缸盖外机油滴漏", isAbnormal: true, severity: 2, basePriority: 5, professionalDescription: "发动机下部存在缸盖外机油滴漏痕迹。", consumerExplanation: "可能带来近期维修与持续使用成本。", futureRisk: "渗漏扩大可能影响发动机附件。", repairSuggestion: "建议安排举升检查并确认维修方案。", estimatedRepairCost: 4200 },
    { zone: "CHASSIS", category: "CHASSIS", itemName: "下摆臂胶套", result: "胶套开裂", isAbnormal: true, severity: 1, basePriority: 4, professionalDescription: "下摆臂胶套存在明显老化并伴随轻微开裂。", consumerExplanation: "属于需要纳入预算的底盘维护项目。", futureRisk: "可能出现异响与行驶质感下降。", repairSuggestion: "建议近期保养时处理。", estimatedRepairCost: 1800 },
    { zone: "DOCUMENTS", category: "DOCUMENT", itemName: "证件与手续", result: "资料待补充", isAbnormal: true, resultStatus: "ABNORMAL", findingMode: "DIRECT", severity: 1, basePriority: 3, professionalDescription: "部分历史资料待补充。", consumerExplanation: "资料缺口会增加里程与保值判断的不确定性。", futureRisk: "后续交易核验时间可能增加。", repairSuggestion: "补充原始维保与过户资料。", estimatedRepairCost: 0, notes: "部分历史资料待补充，未使用细分准则记录。" },
  ], standardTemplate, REPORT_INSPECTOR_NAME, new Date("2025-05-18T14:15:00.000Z")) } }, include: { items: true } });
  const inspection004 = await prisma.inspection.create({ data: { vehicleId: v004.id, templateVersionId: standardTemplate.versionId, version: 1, inspectionDate: new Date("2025-05-17T10:20:00.000Z"), inspectorName: REPORT_INSPECTOR_NAME, reviewerName: REPORT_REVIEWER_NAME, reviewedAt: new Date("2025-05-17T11:10:00.000Z"), completedAt: new Date("2025-05-17T11:00:00.000Z"), overallRiskLevel: "LOW", summary: "手续、动力系统与结构件状态正常，右前车门存在局部色差，不影响当前功能与安全。", status: "COMPLETED", items: { create: makeItems([{ zone: "FRONT_RIGHT", category: "EXTERIOR", itemName: "右前车门", result: "色差1-3级", isAbnormal: true, severity: 1, basePriority: 2, professionalDescription: "右前车门漆面存在局部修复痕迹，门框及连接位置未见异常。", consumerExplanation: "属于常见外观修复，不影响当前开闭功能。", futureRisk: "长期日晒后可能出现轻微色差。", repairSuggestion: "无需立即处理，可按外观需求维护。", estimatedRepairCost: 500 }], standardTemplate, REPORT_INSPECTOR_NAME, new Date("2025-05-17T11:00:00.000Z")) } }, include: { items: true } });
  const inspection005 = await prisma.inspection.create({ data: { vehicleId: v005.id, templateVersionId: newEnergyTemplate.versionId, version: 1, inspectionDate: new Date("2025-05-16T14:30:00.000Z"), inspectorName: REPORT_INSPECTOR_NAME, reviewerName: REPORT_REVIEWER_NAME, reviewedAt: new Date("2025-05-16T15:20:00.000Z"), completedAt: new Date("2025-05-16T15:10:00.000Z"), overallRiskLevel: "LOW", summary: "整车结构与高压系统外观检查正常，充放电功能正常，电池健康状态满足当前使用需求。", status: "COMPLETED", items: { create: makeItems([{ zone: "NEW_ENERGY", category: "ENERGY", itemName: "动力电池包", result: "正常", isAbnormal: false, severity: 0, basePriority: 5, professionalDescription: "动力电池外观、固定与充放电状态正常，未见碰撞和渗漏痕迹。", consumerExplanation: "当前电池状态能够满足日常城市通勤。", futureRisk: "续航会随使用年限逐步衰减。", repairSuggestion: "按厂家周期进行高压系统检查。", estimatedRepairCost: 0 }], newEnergyTemplate, REPORT_INSPECTOR_NAME, new Date("2025-05-16T15:10:00.000Z")) } }, include: { items: true } });
  const inspection006 = await prisma.inspection.create({ data: { vehicleId: v006.id, templateVersionId: standardTemplate.versionId, version: 1, inspectionDate: new Date("2025-05-15T09:40:00.000Z"), inspectorName: REPORT_INSPECTOR_NAME, reviewerName: REPORT_REVIEWER_NAME, reviewedAt: new Date("2025-05-15T10:30:00.000Z"), completedAt: new Date("2025-05-15T10:20:00.000Z"), lastSavedAt: new Date("2025-05-15T10:20:00.000Z"), overallRiskLevel: "MEDIUM", summary: "未发现重大事故及水泡痕迹，发动机工况正常；下摆臂胶套存在开裂，建议纳入近期整备。", status: "COMPLETED", items: { create: makeItems([{ zone: "CHASSIS", category: "CHASSIS", itemName: "下摆臂胶套", result: "胶套开裂", isAbnormal: true, severity: 1, basePriority: 4, professionalDescription: "下摆臂胶套存在老化并伴随轻微开裂，路试暂未出现明显跑偏。", consumerExplanation: "属于车龄和里程对应的常见维护项目。", futureRisk: "继续使用可能出现异响或松旷感。", repairSuggestion: "建议交付前完成底盘整备。", estimatedRepairCost: 1600 }], standardTemplate, REPORT_INSPECTOR_NAME, new Date("2025-05-15T10:20:00.000Z")) } }, include: { items: true } });

  const leftFrontBeam = inspection001.items.find((item) => item.itemName === "左前纵梁");
  const leftFrontBeamCriterion = standardTemplate.criterionBySourceKey.get("左前方位:4:B:1");
  const leftFrontFender = inspection001.items.find((item) => item.itemName === "左前翼子板");
  const leftFrontFenderCriterion = standardTemplate.criterionBySourceKey.get("左前方位:42:D:1");
  if (!leftFrontBeam || !leftFrontBeamCriterion || !leftFrontFender || !leftFrontFenderCriterion) throw new Error("V001 catalog links are incomplete");
  const damageGroup001 = await prisma.inspectionDamageGroup.create({
    data: {
      inspectionId: inspection001.id,
      groupCode: "FRONT_LEFT_STRUCTURE_01",
      label: "左前结构局部受力痕迹",
      notes: "按同一受力区域归组；最终事故等级由复核人确认。",
      confirmedBy: REPORT_REVIEWER_NAME,
      confirmedAt: new Date("2025-05-20T11:00:00.000Z"),
    },
  });
  await createFinding({
    inspectionId: inspection001.id,
    inspectionItemId: leftFrontBeam.id,
    criterionId: leftFrontBeamCriterion.id,
    note: "左前纵梁存在轻微变形，已拍照并转入事故判定复核。",
    selectedBy: REPORT_INSPECTOR_NAME,
    accident: { damageGroupId: damageGroup001.id, classification: "ORDINARY", notes: "参与事故判定；当前证据不足以直接升级为重大事故。" },
    evidence: { uri: "seed://inspection/V001/left-front-rail.jpg", caption: "左前纵梁轻微变形记录" },
  });
  await createFinding({
    inspectionId: inspection001.id,
    inspectionItemId: leftFrontFender.id,
    criterionId: leftFrontFenderCriterion.id,
    note: "漆面存在补漆痕迹，但未作为结构事故结论。",
    selectedBy: REPORT_INSPECTOR_NAME,
    evidence: { uri: "seed://inspection/V001/left-front-fender.jpg", caption: "左前翼子板漆面记录" },
  });

  const rightRearFender = inspection001.items.find((item) => item.itemName === "右后翼子板（外 覆）");
  const rightRearFenderCriterion = standardTemplate.criterionByKey.get("RR_R37:EXTE_04");
  const frontChassisRubber = inspection001.items.find((item) => item.itemName === "下摆臂胶套");
  const frontChassisCriterion = standardTemplate.criterionByKey.get("POWER_R21:SAFE_01");
  if (!rightRearFender || !rightRearFenderCriterion || !frontChassisRubber || !frontChassisCriterion) throw new Error("V001 finding links are incomplete");
  await createFinding({
    inspectionId: inspection001.id,
    inspectionItemId: rightRearFender.id,
    criterionId: rightRearFenderCriterion.id,
    note: "右后翼子板外覆存在色差，未见结构件切割痕迹。",
    selectedBy: REPORT_INSPECTOR_NAME,
    evidence: { uri: "seed://inspection/V001/right-rear-fender.jpg", caption: "右后翼子板漆面记录" },
  });
  await createFinding({
    inspectionId: inspection001.id,
    inspectionItemId: frontChassisRubber.id,
    criterionId: frontChassisCriterion.id,
    note: "下摆臂胶套存在老化并伴随轻微开裂，暂未影响行驶稳定性。",
    selectedBy: REPORT_INSPECTOR_NAME,
  });

  const rearSide = inspection003.items.find((item) => item.itemName === "右后纵梁");
  const rearSideCriterion = standardTemplate.criterionBySourceKey.get("右后方位:4:B:1");
  const engineLeak = inspection003.items.find((item) => item.itemName === "机体渗漏");
  const engineLeakCriterion = standardTemplate.criterionBySourceKey.get("三大件专项:8:C:1");
  if (!rearSide || !rearSideCriterion || !engineLeak || !engineLeakCriterion) throw new Error("V003 catalog links are incomplete");
  const damageGroup003 = await prisma.inspectionDamageGroup.create({
    data: {
      inspectionId: inspection003.id,
      groupCode: "REAR_RIGHT_STRUCTURE_01",
      label: "右后纵梁结构修复痕迹",
      notes: "需要补充修复范围与尺寸测量。",
      confirmedBy: REPORT_REVIEWER_NAME,
      confirmedAt: new Date("2025-05-18T15:00:00.000Z"),
    },
  });
  await createFinding({
    inspectionId: inspection003.id,
    inspectionItemId: rearSide.id,
    criterionId: rearSideCriterion.id,
    note: "右后纵梁存在凹陷与修复痕迹，待补充测量资料。",
    selectedBy: REPORT_INSPECTOR_NAME,
    accident: { damageGroupId: damageGroup003.id, classification: "ORDINARY", notes: "参与事故判定；复检前保持审慎流通建议。" },
    evidence: { uri: "seed://inspection/V003/right-rear-longitudinal-beam.jpg", caption: "右后纵梁修复痕迹记录" },
  });
  await createFinding({
    inspectionId: inspection003.id,
    inspectionItemId: engineLeak.id,
    criterionId: engineLeakCriterion.id,
    note: "发动机下部发现油液渗漏，建议举升复检。",
    selectedBy: REPORT_INSPECTOR_NAME,
    evidence: { uri: "seed://inspection/V003/engine-leak.jpg", caption: "发动机下部渗漏记录" },
  });

  const chassis003 = inspection003.items.find((item) => item.itemName === "下摆臂胶套");
  const chassis003Criterion = standardTemplate.criterionByKey.get("POWER_R21:SAFE_01");
  if (!chassis003 || !chassis003Criterion) throw new Error("V003 chassis finding link is incomplete");
  await createFinding({
    inspectionId: inspection003.id,
    inspectionItemId: chassis003.id,
    criterionId: chassis003Criterion.id,
    note: "前悬挂胶套存在明显老化并伴随轻微开裂，需纳入整备预算。",
    selectedBy: REPORT_INSPECTOR_NAME,
  });

  const door004 = inspection004.items.find((item) => item.itemName === "右前车门");
  const door004Criterion = standardTemplate.criterionByKey.get("RF_R40:EXTE_04");
  if (!door004 || !door004Criterion) throw new Error("V004 finding link is incomplete");
  await createFinding({
    inspectionId: inspection004.id,
    inspectionItemId: door004.id,
    criterionId: door004Criterion.id,
    note: "右前车门存在局部色差，门框及连接位置未见异常。",
    selectedBy: REPORT_INSPECTOR_NAME,
  });

  const chassis006 = inspection006.items.find((item) => item.itemName === "下摆臂胶套");
  const chassis006Criterion = standardTemplate.criterionByKey.get("POWER_R21:SAFE_01");
  if (!chassis006 || !chassis006Criterion) throw new Error("V006 chassis finding link is incomplete");
  await createFinding({
    inspectionId: inspection006.id,
    inspectionItemId: chassis006.id,
    criterionId: chassis006Criterion.id,
    note: "前悬挂胶套存在老化并伴随轻微开裂，路试暂未出现明显跑偏。",
    selectedBy: REPORT_INSPECTOR_NAME,
  });

  const evaluation001 = await createEvaluation(inspection001.id, ruleSetVersion.id, {
    legalTradeabilityStatus: "CLEAR",
    hardStop: false,
    accidentClassification: "ORDINARY",
    floodStatus: "NONE",
    floodFindingCount: 0,
    currentSafetyConclusion: "ISSUE_FOUND",
    functionConclusion: "PASS",
    circulationRecommendation: "HOLD_FOR_REVIEW",
    recommendationReason: "左前纵梁缺陷已进入事故复核，底盘胶套开裂已命中当前安全准则；当前未触发硬停止，完成结构与底盘复核后再流通。",
    outcomes: [
      { code: "LEGAL_TRADEABILITY", axis: "LEGAL_TRADEABILITY", status: "CLEAR", reason: "整车通用手续核对未见当前硬停止项。" },
      { code: "ACCIDENT_HISTORY", axis: "ACCIDENT_HISTORY", status: "ORDINARY", valueText: "ORDINARY", reason: "左前纵梁缺陷已关联至事故判定参与部件。" },
      { code: "FLOOD_DAMAGE", axis: "FLOOD_DAMAGE", status: "NONE", valueText: "0", reason: "当前样例未选择水泡缺陷。" },
      { code: "CURRENT_SAFETY", axis: "CURRENT_SAFETY", status: "ISSUE_FOUND", reason: "底盘胶套开裂已命中当前安全准则，需要复核。" },
      { code: "CORE_FUNCTION", axis: "CORE_FUNCTION", status: "PASS", reason: "动力系统工况正常，底盘项目已单独归入当前安全轴。" },
      { code: "DISCLOSURE", axis: "DISCLOSURE", status: "REQUIRED", reason: "标准报告应披露结构异常与外观修复的事实边界。" },
      { code: "REPAIR_ECONOMICS", axis: "REPAIR_ECONOMICS", status: "REVIEW_REQUIRED", reason: "预计维修项需要结合复检与报价确认。" },
      { code: "CIRCULATION_RECOMMENDATION", axis: "CIRCULATION", status: "HOLD_FOR_REVIEW", reason: "当前安全轴存在需复核的底盘准则，完成结构与底盘复核后再进入销售沟通。" },
    ],
  });
  const evaluation002 = await createEvaluation(inspection002.id, ruleSetVersion.id, {
    legalTradeabilityStatus: "CLEAR",
    hardStop: false,
    accidentClassification: "NONE",
    floodStatus: "NONE",
    floodFindingCount: 0,
    currentSafetyConclusion: "PASS",
    functionConclusion: "PASS",
    circulationRecommendation: "CIRCULATE",
    recommendationReason: "已完成本版适用的事故、水泡、当前安全与核心功能核查；火烧类规则不在本版鉴定范围。",
    outcomes: [
      { code: "LEGAL_TRADEABILITY", axis: "LEGAL_TRADEABILITY", status: "CLEAR", reason: "手续核验未见当前硬停止项。" },
      { code: "ACCIDENT_HISTORY", axis: "ACCIDENT_HISTORY", status: "NONE", valueText: "NONE", reason: "本次适用的事故判定部件未选择缺陷。" },
      { code: "FLOOD_DAMAGE", axis: "FLOOD_DAMAGE", status: "NONE", valueText: "0", reason: "本次未选择水泡缺陷。" },
      { code: "CURRENT_SAFETY", axis: "CURRENT_SAFETY", status: "PASS", reason: "底盘状态样例未见明显当前安全异常。" },
      { code: "CORE_FUNCTION", axis: "CORE_FUNCTION", status: "PASS", reason: "动力系统样例工况正常。" },
      { code: "DISCLOSURE", axis: "DISCLOSURE", status: "STANDARD", reason: "标准报告记录适用范围与未发现事项。" },
      { code: "REPAIR_ECONOMICS", axis: "REPAIR_ECONOMICS", status: "LOW", reason: "当前样例未形成明确维修预算压力。" },
      { code: "CIRCULATION_RECOMMENDATION", axis: "CIRCULATION", status: "CIRCULATE", reason: "满足当前规则门槛，可进入销售流转。" },
    ],
  });
  const evaluation003 = await createEvaluation(inspection003.id, ruleSetVersion.id, {
    legalTradeabilityStatus: "CLEAR",
    hardStop: false,
    accidentClassification: "ORDINARY",
    floodStatus: "NONE",
    floodFindingCount: 0,
    currentSafetyConclusion: "ISSUE_FOUND",
    functionConclusion: "ISSUE_FOUND",
    circulationRecommendation: "HOLD_FOR_REVIEW",
    recommendationReason: "右后纵梁结构修复与机体渗漏均需补充复检资料，另有证件资料待补充，暂缓销售承诺。",
    outcomes: [
      { code: "LEGAL_TRADEABILITY", axis: "LEGAL_TRADEABILITY", status: "CLEAR", reason: "当前手续样例未触发硬停止。" },
      { code: "ACCIDENT_HISTORY", axis: "ACCIDENT_HISTORY", status: "ORDINARY", valueText: "ORDINARY", reason: "右后纵梁修复痕迹已进入事故判定参与链路。" },
      { code: "FLOOD_DAMAGE", axis: "FLOOD_DAMAGE", status: "NONE", valueText: "0", reason: "当前样例未选择水泡缺陷。" },
      { code: "CURRENT_SAFETY", axis: "CURRENT_SAFETY", status: "ISSUE_FOUND", reason: "底盘胶套开裂已命中当前安全准则，需要复核。" },
      { code: "CORE_FUNCTION", axis: "CORE_FUNCTION", status: "ISSUE_FOUND", reason: "机体渗漏已命中核心功能准则，需要举升复检。" },
      { code: "DISCLOSURE", axis: "DISCLOSURE", status: "REQUIRED", reason: "标准报告应披露结构修复、渗漏与资料缺口。" },
      { code: "REPAIR_ECONOMICS", axis: "REPAIR_ECONOMICS", status: "REVIEW_REQUIRED", reason: "维修成本需以复检结果和报价为准。" },
      { code: "CIRCULATION_RECOMMENDATION", axis: "CIRCULATION", status: "HOLD_FOR_REVIEW", reason: "补充复检资料前暂缓流通承诺。" },
    ],
  });
  const evaluation004 = await createEvaluation(inspection004.id, ruleSetVersion.id, completedEvaluation("车辆结构与核心功能正常，局部外观修复已如实披露，可进入销售跟进。"));
  const evaluation005 = await createEvaluation(inspection005.id, ruleSetVersion.id, completedEvaluation("车辆结构、高压系统与充放电功能完成检查，可进入销售跟进。"));
  const evaluation006 = await createEvaluation(inspection006.id, ruleSetVersion.id, {
    legalTradeabilityStatus: "CLEAR",
    hardStop: false,
    accidentClassification: "NONE",
    floodStatus: "NONE",
    floodFindingCount: 0,
    currentSafetyConclusion: "ISSUE_FOUND",
    functionConclusion: "PASS",
    circulationRecommendation: "HOLD_FOR_REVIEW",
    recommendationReason: "下摆臂胶套开裂已命中当前安全准则；当前未触发硬停止，建议完成底盘整备并复核后再进入流通。",
    outcomes: [
      { code: "LEGAL_TRADEABILITY", axis: "LEGAL_TRADEABILITY", status: "CLEAR", reason: "手续核验未见当前硬停止项。" },
      { code: "ACCIDENT_HISTORY", axis: "ACCIDENT_HISTORY", status: "NONE", valueText: "NONE", reason: "未发现重大事故判定项。" },
      { code: "FLOOD_DAMAGE", axis: "FLOOD_DAMAGE", status: "NONE", valueText: "0", reason: "未发现水泡判定项。" },
      { code: "CURRENT_SAFETY", axis: "CURRENT_SAFETY", status: "ISSUE_FOUND", reason: "底盘胶套开裂已命中当前安全准则，需要复核。" },
      { code: "CORE_FUNCTION", axis: "CORE_FUNCTION", status: "PASS", reason: "动力系统工况正常，未记录核心功能轴异常。" },
      { code: "DISCLOSURE", axis: "DISCLOSURE", status: "REQUIRED", reason: "标准报告应披露底盘胶套开裂与对应整备建议。" },
      { code: "REPAIR_ECONOMICS", axis: "REPAIR_ECONOMICS", status: "LOW", reason: "当前异常属于可控底盘整备项目，费用已在项目中记录。" },
      { code: "CIRCULATION_RECOMMENDATION", axis: "CIRCULATION", status: "HOLD_FOR_REVIEW", reason: "完成底盘整备与复核后再进入销售流转。" },
    ],
  });

  const market = { newCarReferencePrice: 179800, marketLow: 120000, marketMedian: 134500, marketHigh: 146000, conditionAdjustedLow: 138000, conditionAdjustedHigh: 156000, source: "ManualMarketPriceProvider", capturedAt: demoDate.toISOString() } as const;
  const marketV002 = { newCarReferencePrice: 219800, marketLow: 151000, marketMedian: 168000, marketHigh: 181000, conditionAdjustedLow: 164000, conditionAdjustedHigh: 175000, source: "ManualMarketPriceProvider", capturedAt: "2025-05-19T09:20:00.000Z" } as const;
  const marketV003 = { newCarReferencePrice: 189800, marketLow: 92000, marketMedian: 106000, marketHigh: 118000, conditionAdjustedLow: 98000, conditionAdjustedHigh: 111000, source: "ManualMarketPriceProvider", capturedAt: "2025-05-18T14:15:00.000Z" } as const;
  const marketV004 = { newCarReferencePrice: 128800, marketLow: 82000, marketMedian: 89500, marketHigh: 96000, conditionAdjustedLow: 86500, conditionAdjustedHigh: 93000, source: "ManualMarketPriceProvider", capturedAt: "2025-05-17T11:00:00.000Z" } as const;
  const marketV005 = { newCarReferencePrice: 115800, marketLow: 70000, marketMedian: 77500, marketHigh: 84000, conditionAdjustedLow: 73500, conditionAdjustedHigh: 81000, source: "ManualMarketPriceProvider", capturedAt: "2025-05-16T15:10:00.000Z" } as const;
  const marketV006 = { newCarReferencePrice: 124900, marketLow: 72000, marketMedian: 80500, marketHigh: 88000, conditionAdjustedLow: 75000, conditionAdjustedHigh: 83000, source: "ManualMarketPriceProvider", capturedAt: "2025-05-15T10:20:00.000Z" } as const;
  await prisma.marketPriceSnapshot.create({ data: { vehicleId: v001.id, ...market, capturedAt: demoDate } });
  await prisma.marketPriceSnapshot.create({ data: { vehicleId: v002.id, ...marketV002, capturedAt: new Date(marketV002.capturedAt) } });
  await prisma.marketPriceSnapshot.create({ data: { vehicleId: v003.id, ...marketV003, capturedAt: new Date(marketV003.capturedAt) } });
  await prisma.marketPriceSnapshot.create({ data: { vehicleId: v004.id, ...marketV004, capturedAt: new Date(marketV004.capturedAt) } });
  await prisma.marketPriceSnapshot.create({ data: { vehicleId: v005.id, ...marketV005, capturedAt: new Date(marketV005.capturedAt) } });
  await prisma.marketPriceSnapshot.create({ data: { vehicleId: v006.id, ...marketV006, capturedAt: new Date(marketV006.capturedAt) } });

  const standard001 = await createStandardSnapshot({ vehicle: v001, inspection: await loadInspectionForSnapshot(inspection001.id), templateVersionId: standardTemplate.versionId, evaluation: evaluation001, market, generatedAt: demoDate });
  const standard002 = await createStandardSnapshot({ vehicle: v002, inspection: await loadInspectionForSnapshot(inspection002.id), templateVersionId: standardTemplate.versionId, evaluation: evaluation002, market: marketV002, generatedAt: new Date(marketV002.capturedAt) });
  const standard003 = await createStandardSnapshot({ vehicle: v003, inspection: await loadInspectionForSnapshot(inspection003.id), templateVersionId: standardTemplate.versionId, evaluation: evaluation003, market: marketV003, generatedAt: new Date(marketV003.capturedAt) });
  const standard004 = await createStandardSnapshot({ vehicle: v004, inspection: await loadInspectionForSnapshot(inspection004.id), templateVersionId: standardTemplate.versionId, evaluation: evaluation004, market: marketV004, generatedAt: new Date(marketV004.capturedAt) });
  const standard005 = await createStandardSnapshot({ vehicle: v005, inspection: await loadInspectionForSnapshot(inspection005.id), templateVersionId: newEnergyTemplate.versionId, evaluation: evaluation005, market: marketV005, generatedAt: new Date(marketV005.capturedAt) });
  await createStandardSnapshot({ vehicle: v006, inspection: await loadInspectionForSnapshot(inspection006.id), templateVersionId: standardTemplate.versionId, evaluation: evaluation006, market: marketV006, generatedAt: new Date(marketV006.capturedAt) });

  const customerA = await prisma.customer.create({ data: { name: "李振海", phone: "138****4821", sourceChannel: "抖音", sourceContent: "家庭用车避坑短视频", status: "CONVERTED", demands: { create: { budgetMin: 130000, budgetMax: 160000, usageScene: "家庭出行", purchaseTime: "一周内", focusTags: JSON.stringify(["SAFETY", "STRUCTURE"]), riskConcerns: JSON.stringify(["重大事故", "结构件变形"]), remark: "家人乘坐频率高，希望先把安全边界讲清楚。" } } }, include: { demands: true } });
  const customerB = await prisma.customer.create({ data: { name: "王丽华", phone: "139****7316", sourceChannel: "小红书", sourceContent: "通勤养车成本笔记", status: "REPORT_GENERATED", demands: { create: { budgetMin: 120000, budgetMax: 150000, usageScene: "城市通勤", purchaseTime: "一个月内", focusTags: JSON.stringify(["MAINTENANCE", "RELIABILITY"]), riskConcerns: JSON.stringify(["后期维修成本", "发动机故障"]), remark: "每天通勤，希望预估后续养车压力。" } } }, include: { demands: true } });
  const customerC = await prisma.customer.create({ data: { name: "周子明", phone: "186****2057", sourceChannel: "视频号", sourceContent: "七座与大空间车型直播咨询", status: "REPORT_GENERATED", demands: { create: { budgetMin: 150000, budgetMax: 180000, usageScene: "家庭长途与周末出行", purchaseTime: "两周内", focusTags: JSON.stringify(["SPACE", "RELIABILITY", "VALUE"]), riskConcerns: JSON.stringify(["底盘异响", "保值率"]), remark: "家中有两名儿童，重视后排空间、可靠性和长途舒适度。" } } }, include: { demands: true } });
  const customerD = await prisma.customer.create({ data: { name: "陈晓雯", phone: "137****6943", sourceChannel: "线下到店", sourceContent: "到店置换咨询", status: "PENDING", demands: { create: { budgetMin: 90000, budgetMax: 115000, usageScene: "商务通勤", purchaseTime: "本月内", focusTags: JSON.stringify(["PRICE", "MAINTENANCE", "APPEARANCE"]), riskConcerns: JSON.stringify(["结构修复", "维修预算"]), remark: "对雅阁有明确偏好，希望明确右后侧修复范围与整备成本。" } } }, include: { demands: true } });
  const customerE = await prisma.customer.create({ data: { name: "赵启航", phone: "158****4139", sourceChannel: "抖音", sourceContent: "十万元家用轿车选购直播", status: "REJECTED", demands: { create: { budgetMin: 75000, budgetMax: 100000, usageScene: "上下班与接送孩子", purchaseTime: "一个月内", focusTags: JSON.stringify(["SAFETY", "VALUE"]), riskConcerns: JSON.stringify(["事故记录", "油耗"]), remark: "首次购买二手车，希望报告表达直观、不要使用过多专业术语。" } } }, include: { demands: true } });
  const customerF = await prisma.customer.create({ data: { name: "何雨晴", phone: "135****8274", sourceChannel: "小红书", sourceContent: "新能源二手车避坑清单", status: "REPORT_GENERATED", demands: { create: { budgetMin: 70000, budgetMax: 90000, usageScene: "城市短途通勤", purchaseTime: "三个月内", focusTags: JSON.stringify(["ENERGY", "MAINTENANCE", "PRICE"]), riskConcerns: JSON.stringify(["电池衰减", "充电便利性"]), remark: "日均通勤约三十公里，家中具备安装充电桩条件。" } } }, include: { demands: true } });

  const caseA = await prisma.salesCase.create({ data: { id: "SC-0001", customerId: customerA.id, demandId: customerA.demands[0].id, vehicleId: v001.id, sourceChannel: "抖音", stage: "CONVERTED", result: "CONVERTED", createdAt: demoDate, updatedAt: demoDate } });
  const caseB = await prisma.salesCase.create({ data: { id: "SC-0002", customerId: customerB.id, demandId: customerB.demands[0].id, vehicleId: v001.id, sourceChannel: "小红书", stage: "REPORT_GENERATED", result: "IN_PROGRESS", createdAt: new Date("2025-05-20T09:15:00.000Z"), updatedAt: new Date("2025-05-20T09:15:00.000Z") } });
  const caseC = await prisma.salesCase.create({ data: { id: "SC-0003", customerId: customerC.id, demandId: customerC.demands[0].id, vehicleId: v002.id, sourceChannel: "视频号", stage: "REPORT_GENERATED", result: "IN_PROGRESS", createdAt: new Date("2025-05-19T16:20:00.000Z"), updatedAt: new Date("2025-05-20T08:40:00.000Z") } });
  const caseD = await prisma.salesCase.create({ data: { id: "SC-0004", customerId: customerD.id, demandId: customerD.demands[0].id, vehicleId: v003.id, sourceChannel: "线下到店", stage: "PENDING", result: "PENDING", createdAt: new Date("2025-05-18T16:10:00.000Z"), updatedAt: new Date("2025-05-20T09:05:00.000Z") } });
  const caseE = await prisma.salesCase.create({ data: { id: "SC-0005", customerId: customerE.id, demandId: customerE.demands[0].id, vehicleId: v004.id, sourceChannel: "抖音", stage: "REJECTED", result: "REJECTED", lostReason: "PRICE", createdAt: new Date("2025-05-17T13:20:00.000Z"), updatedAt: new Date("2025-05-20T09:20:00.000Z") } });
  const caseF = await prisma.salesCase.create({ data: { id: "SC-0006", customerId: customerF.id, demandId: customerF.demands[0].id, vehicleId: v005.id, sourceChannel: "小红书", stage: "REPORT_GENERATED", result: "IN_PROGRESS", createdAt: new Date("2025-05-16T16:00:00.000Z"), updatedAt: new Date("2025-05-20T09:35:00.000Z") } });

  const vehicleSnapshot = { id: v001.id, code: v001.code, vin: v001.vin, plateNo: v001.plateNo, brand: v001.brand, series: v001.series, model: v001.model, modelYear: v001.modelYear, mileage: v001.mileage, listingPrice: v001.listingPrice, coverImage: v001.coverImage, displayTags: v001.displayTags };
  const standardTemplateItems = await loadTemplateItemsForSnapshot(standardTemplate.versionId);
  const inspection001ForSnapshot = await loadInspectionForSnapshot(inspection001.id);
  const standardReportItems = materializeStandardReportItems(standardTemplateItems, inspection001ForSnapshot.items as unknown as StandardReportExecutionItem[]);
  const inspectionSnapshot = { id: inspection001.id, version: inspection001.version, inspectionDate: inspection001.inspectionDate.toISOString(), inspectorName: inspection001.inspectorName, overallRiskLevel: inspection001.overallRiskLevel, summary: inspection001.summary, items: standardReportItems.map((item) => ({ id: item.id, zone: item.zone, category: item.category, itemName: item.itemName, result: item.result, resultStatus: item.resultStatus, isAbnormal: item.isAbnormal, severity: item.severity, basePriority: item.basePriority, professionalDescription: item.professionalDescription, consumerExplanation: item.consumerExplanation, futureRisk: item.futureRisk, repairSuggestion: item.repairSuggestion, estimatedRepairCost: item.estimatedRepairCost, findings: item.findings })) };
  const reportA = buildReportSnapshot({ customer: { id: customerA.id, name: customerA.name }, demand: { ...customerA.demands[0], focusTags: customerA.demands[0].focusTags, riskConcerns: customerA.demands[0].riskConcerns }, vehicle: vehicleSnapshot, inspection: inspectionSnapshot, market, reportMode: "PERSONALIZED", generatedAt: "2025-05-20T10:30:00.000Z" });
  const reportB = buildReportSnapshot({ customer: { id: customerB.id, name: customerB.name }, demand: { ...customerB.demands[0], focusTags: customerB.demands[0].focusTags, riskConcerns: customerB.demands[0].riskConcerns }, vehicle: vehicleSnapshot, inspection: inspectionSnapshot, market, reportMode: "PERSONALIZED", generatedAt: "2025-05-20T10:36:00.000Z" });
  const personalizedA = await prisma.personalizedReportSnapshot.create({ data: { salesCaseId: caseA.id, standardReportSnapshotId: standard001.id, version: 1, focusTagsJson: JSON.stringify(["SAFETY", "STRUCTURE"]), generationMethod: "RULE_ENGINE", snapshotJson: JSON.stringify(reportA), generatedAt: new Date("2025-05-20T10:30:00.000Z"), generatedBy: "seed" } });
  const personalizedB = await prisma.personalizedReportSnapshot.create({ data: { salesCaseId: caseB.id, standardReportSnapshotId: standard001.id, version: 1, focusTagsJson: JSON.stringify(["MAINTENANCE", "RELIABILITY"]), generationMethod: "RULE_ENGINE", snapshotJson: JSON.stringify(reportB), generatedAt: new Date("2025-05-20T10:36:00.000Z"), generatedBy: "seed" } });
  await prisma.report.create({ data: { salesCaseId: caseA.id, inspectionId: inspection001.id, standardReportSnapshotId: standard001.id, personalizedReportSnapshotId: personalizedA.id, version: 1, reportMode: "PERSONALIZED", highlightTags: JSON.stringify(["SAFETY", "STRUCTURE"]), generatedSnapshot: JSON.stringify(reportA), generatedAt: new Date("2025-05-20T10:30:00.000Z") } });
  await prisma.report.create({ data: { salesCaseId: caseB.id, inspectionId: inspection001.id, standardReportSnapshotId: standard001.id, personalizedReportSnapshotId: personalizedB.id, version: 1, reportMode: "PERSONALIZED", highlightTags: JSON.stringify(["MAINTENANCE", "RELIABILITY"]), generatedSnapshot: JSON.stringify(reportB), generatedAt: new Date("2025-05-20T10:36:00.000Z") } });
  await createPersonalizedSeedReport({ salesCaseId: caseC.id, standardReportSnapshotId: standard002.id, customer: customerC, demand: customerC.demands[0], vehicle: v002, inspection: await loadInspectionForSnapshot(inspection002.id), market: marketV002, generatedAt: new Date("2025-05-20T08:45:00.000Z") });
  await createPersonalizedSeedReport({ salesCaseId: caseD.id, standardReportSnapshotId: standard003.id, customer: customerD, demand: customerD.demands[0], vehicle: v003, inspection: await loadInspectionForSnapshot(inspection003.id), market: marketV003, generatedAt: new Date("2025-05-20T09:10:00.000Z") });
  await createPersonalizedSeedReport({ salesCaseId: caseE.id, standardReportSnapshotId: standard004.id, customer: customerE, demand: customerE.demands[0], vehicle: v004, inspection: await loadInspectionForSnapshot(inspection004.id), market: marketV004, generatedAt: new Date("2025-05-20T09:25:00.000Z") });
  await createPersonalizedSeedReport({ salesCaseId: caseF.id, standardReportSnapshotId: standard005.id, customer: customerF, demand: customerF.demands[0], vehicle: v005, inspection: await loadInspectionForSnapshot(inspection005.id), market: marketV005, generatedAt: new Date("2025-05-20T09:40:00.000Z") });
  await prisma.salesEvent.createMany({ data: [
    { salesCaseId: caseA.id, eventType: "LEAD_CREATED", eventTime: new Date("2025-05-20T09:40:00.000Z"), metadata: JSON.stringify({ channel: "抖音" }) },
    { salesCaseId: caseA.id, eventType: "DEMAND_RECORDED", eventTime: new Date("2025-05-20T10:05:00.000Z") },
    { salesCaseId: caseA.id, eventType: "REPORT_GENERATED", eventTime: new Date("2025-05-20T10:30:00.000Z") },
    { salesCaseId: caseA.id, eventType: "CONVERTED", eventTime: new Date("2025-05-20T11:20:00.000Z"), metadata: JSON.stringify({ note: "客户确认车况与预算，进入成交" }) },
    { salesCaseId: caseB.id, eventType: "LEAD_CREATED", eventTime: new Date("2025-05-20T08:40:00.000Z"), metadata: JSON.stringify({ channel: "小红书" }) },
    { salesCaseId: caseB.id, eventType: "DEMAND_RECORDED", eventTime: new Date("2025-05-20T09:00:00.000Z") },
    { salesCaseId: caseB.id, eventType: "REPORT_GENERATED", eventTime: new Date("2025-05-20T10:36:00.000Z") },
    { salesCaseId: caseC.id, eventType: "VEHICLE_SELECTED", eventTime: new Date("2025-05-19T16:20:00.000Z"), metadata: JSON.stringify({ vehicle: "V002" }) },
    { salesCaseId: caseC.id, eventType: "FOLLOW_UP", eventTime: new Date("2025-05-20T08:40:00.000Z"), metadata: JSON.stringify({ note: "已预约周末到店看车" }) },
    { salesCaseId: caseD.id, eventType: "VEHICLE_SELECTED", eventTime: new Date("2025-05-18T16:10:00.000Z"), metadata: JSON.stringify({ vehicle: "V003" }) },
    { salesCaseId: caseD.id, eventType: "PENDING", eventTime: new Date("2025-05-20T09:05:00.000Z"), metadata: JSON.stringify({ reason: "等待结构复检结果" }) },
    { salesCaseId: caseE.id, eventType: "REPORT_GENERATED", eventTime: new Date("2025-05-20T09:25:00.000Z") },
    { salesCaseId: caseE.id, eventType: "REJECTED", eventTime: new Date("2025-05-20T10:10:00.000Z"), metadata: JSON.stringify({ reason: "PRICE" }) },
    { salesCaseId: caseF.id, eventType: "REPORT_GENERATED", eventTime: new Date("2025-05-20T09:40:00.000Z") },
  ] });

  console.log(`Seed complete: 6 completed vehicles, 6 customer profiles, 6 customer-vehicle profiles and 6 personalized reports.`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => { await prisma.$disconnect(); });
