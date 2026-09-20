import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { REPORT_INSPECTOR_NAME, REPORT_REVIEWER_NAME } from "@/config/report-people";
import { db } from "@/lib/db";
import {
  buildDefaultItemFields,
  checkInspectionCompletion,
  evaluateInspection,
  type ExecutionItemLike,
  type TemplateItemLike,
} from "@/services/inspection-engine";
import {
  buildInspectionSummary,
  materializeInspectionItems,
  type InspectionReadModelExecutionItem,
} from "@/services/inspection-read-model";
import { findInspectionDataIssues, type InspectionConsistencyIssue } from "@/services/inspection-consistency";
import { getInspectionResultLabel } from "@/services/inspection-result";
import { resolveInspectionSeverity } from "@/services/inspection-severity";
import { buildStandardReportDocument } from "@/services/standard-report";

const executionStatuses = ["UNCHECKED", "NORMAL", "ABNORMAL", "NOT_APPLICABLE", "BLOCKED"] as const;
const findingStatuses = ["UNCHECKED", "REACHED", "NOT_REACHED", "NOT_APPLICABLE", "BLOCKED"] as const;

const itemPatchFields = [
  "result",
  "resultStatus",
  "isAbnormal",
  "severity",
  "findingMode",
  "estimatedRepairCost",
  "notes",
  "professionalDescription",
  "consumerExplanation",
  "futureRisk",
  "repairSuggestion",
] as const;

const patchSchema = z.object({
  checkItemId: z.string().optional(),
  itemId: z.string().optional(),
  result: z.string().trim().min(1).max(80).optional(),
  resultStatus: z.enum(executionStatuses).optional(),
  isAbnormal: z.boolean().optional(),
  severity: z.number().int().min(0).max(3).optional(),
  findingMode: z.enum(["CRITERION", "DIRECT"]).optional(),
  estimatedRepairCost: z.number().int().nonnegative().nullable().optional(),
  notes: z.string().max(1200).nullable().optional(),
  professionalDescription: z.string().max(1200).nullable().optional(),
  consumerExplanation: z.string().max(1200).nullable().optional(),
  futureRisk: z.string().max(1200).nullable().optional(),
  repairSuggestion: z.string().max(1200).nullable().optional(),
  operatorName: z.string().trim().max(40).nullable().optional(),
  status: z.enum(["DRAFT", "IN_PROGRESS", "COMPLETED"]).optional(),
  findingUpdates: z.array(z.object({
    criterionId: z.string(),
    status: z.enum(findingStatuses),
    valueText: z.string().max(400).nullable().optional(),
    note: z.string().max(1000).nullable().optional(),
    selectedBy: z.string().trim().max(40).nullable().optional(),
  })).max(30).optional(),
  accidentAssessment: z.object({
    findingId: z.string().optional(),
    criterionId: z.string().optional(),
    classification: z.enum(["NONE", "ORDINARY", "MAJOR"]),
    decisionParticipant: z.boolean().default(true),
    damageGroupId: z.string().nullable().optional(),
    groupCode: z.string().trim().max(80).nullable().optional(),
    groupLabel: z.string().trim().max(120).nullable().optional(),
    notes: z.string().max(1000).nullable().optional(),
    confirmedBy: z.string().trim().max(40).nullable().optional(),
  }).optional(),
  evidence: z.object({
    uri: z.string().trim().min(1).max(500),
    mediaType: z.string().trim().min(1).max(80).default("image/jpeg"),
    caption: z.string().trim().max(200).nullable().optional(),
    capturedBy: z.string().trim().max(40).nullable().optional(),
  }).optional(),
});

const evaluateSchema = z.object({
  action: z.literal("EVALUATE"),
  evaluatorName: z.string().trim().max(40).optional(),
});

type PatchInput = z.infer<typeof patchSchema>;
type ExecutionStatusValue = (typeof executionStatuses)[number];
type ExistingExecutionItem = { resultStatus: string; severity: number; findingMode?: string | null };

type DatabaseClient = typeof db | Prisma.TransactionClient;
type InspectionBundle = NonNullable<Awaited<ReturnType<typeof loadInspectionBundle>>>;
type EvaluationResult = ReturnType<typeof evaluateInspection>;
type EvaluationWithOutcomes = Prisma.InspectionEvaluationGetPayload<{ include: { outcomes: true } }>;

class InspectionIncompleteError extends Error {
  constructor(readonly result: EvaluationResult) {
    super(`仍有 ${result.missing.length} 个必检项未完成`);
    this.name = "InspectionIncompleteError";
  }
}

class RuleSetUnavailableError extends Error {
  constructor() {
    super("没有可用的已发布规则版本");
    this.name = "RuleSetUnavailableError";
  }
}

class InspectionDataConsistencyError extends Error {
  constructor(readonly issues: InspectionConsistencyIssue[]) {
    super("鉴定结果与异常准则记录不一致，请先修正项目状态或准则记录");
    this.name = "InspectionDataConsistencyError";
  }
}

function isInspectionConfirmed(status: string) {
  return status === "COMPLETED" || status === "BLOCKED";
}

function isExecutionStatus(value: string | undefined): value is ExecutionStatusValue {
  return Boolean(value && (executionStatuses as readonly string[]).includes(value));
}

function bundleFindings(bundle: InspectionBundle) {
  return bundle.inspection.items.flatMap((item) => item.findings.map((finding) => ({ ...finding, criterion: finding.criterion })));
}

async function findVehicle(vehicleId: string, client: DatabaseClient = db) {
  return client.vehicle.findFirst({
    where: { OR: [{ id: vehicleId }, { code: vehicleId }] },
    include: { marketSnapshots: { orderBy: { capturedAt: "desc" }, take: 1 } },
  });
}

async function loadInspectionBundle(vehicleId: string, client: DatabaseClient = db) {
  const vehicle = await findVehicle(vehicleId, client);
  if (!vehicle) return null;
  const inspection = await client.inspection.findFirst({
    where: { vehicleId: vehicle.id },
    orderBy: { version: "desc" },
    include: {
      items: { include: { findings: { include: { criterion: true, accidentAssessment: { include: { damageGroup: true } } } }, evidence: { orderBy: [{ capturedAt: "desc" }, { createdAt: "desc" }] } }, orderBy: { createdAt: "asc" } },
      evidence: { orderBy: { capturedAt: "desc" } },
      damageGroups: { orderBy: { createdAt: "asc" } },
      evaluations: { orderBy: { version: "desc" }, take: 5, include: { outcomes: true } },
      templateVersion: {
        include: {
          template: true,
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
  if (!inspection?.templateVersion) return null;

  const templateVersion = inspection.templateVersion;
  const templateItems: TemplateItemLike[] = templateVersion.sections.flatMap((section) => section.positions.flatMap((position) => position.checkItems.map((item) => ({
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

  return { vehicle, inspection, templateVersion, templateItems };
}

function serializeTemplate(templateVersion: NonNullable<Awaited<ReturnType<typeof loadInspectionBundle>>>["templateVersion"]) {
  return {
    id: templateVersion.template.id,
    code: templateVersion.template.code,
    name: templateVersion.template.name,
    energyTypeScope: templateVersion.template.energyTypeScope,
    versionId: templateVersion.id,
    version: templateVersion.version,
    status: templateVersion.status,
    effectiveFrom: templateVersion.effectiveFrom,
    sections: templateVersion.sections.map((section) => ({
      id: section.id,
      code: section.code,
      name: section.name,
      axis: section.axis,
      sortOrder: section.sortOrder,
      description: section.description,
      positions: section.positions.map((position) => ({
        id: position.id,
        code: position.code,
        name: position.name,
        side: position.side,
        sortOrder: position.sortOrder,
        floodAggregationKey: position.floodAggregationKey,
        checkItems: position.checkItems.map((item) => ({
          id: item.id,
          code: item.code,
          name: item.name,
          category: item.category,
          componentClass: item.componentClass,
          accidentDecisionParticipant: item.accidentDecisionParticipant,
          sortOrder: item.sortOrder,
          active: item.active,
          description: item.description,
          sourceSheet: item.sourceSheet,
          sourceRow: item.sourceRow,
          sourceSection: item.sourceSection,
          sourceText: item.sourceText,
          criteria: item.criteria,
        })),
      })),
    })),
  };
}

function serializeBundle(bundle: NonNullable<Awaited<ReturnType<typeof loadInspectionBundle>>>) {
  const executionItems = bundle.inspection.items as unknown as InspectionReadModelExecutionItem[];
  const completion = checkInspectionCompletion(bundle.templateItems, executionItems);
  const confirmed = isInspectionConfirmed(bundle.inspection.status);
  const summary = buildInspectionSummary({ status: bundle.inspection.status, templateTotal: bundle.templateItems.length, items: executionItems });
  const facts = materializeInspectionItems(bundle.templateItems, executionItems, confirmed);
  const consistency = findInspectionDataIssues({ templateItems: bundle.templateItems, executionItems, findings: bundleFindings(bundle) });
  const normalizedById = new Map(facts.map((fact) => [fact.id, fact]));
  const normalizedInspectionItems = bundle.inspection.items.map((item) => {
    const normalized = normalizedById.get(item.id);
    return normalized ? { ...item, ...normalized } : item;
  });
  return {
    vehicle: bundle.vehicle,
    inspection: { ...bundle.inspection, items: normalizedInspectionItems },
    template: serializeTemplate(bundle.templateVersion),
    facts,
    summary,
    consistency,
    progress: {
      total: summary.total,
      checked: summary.checked,
      recorded: summary.recorded,
      implicitNormal: summary.implicitNormal,
      complete: confirmed,
      missing: confirmed ? [] : completion.missing,
    },
    evaluation: bundle.inspection.evaluations[0] ?? null,
    evaluationHistory: bundle.inspection.evaluations,
  };
}

function deriveStatus(result: string | undefined, isAbnormal: boolean | undefined): (typeof executionStatuses)[number] | undefined {
  if (result === "未检" || result === "未检验") return "UNCHECKED";
  if (result === "正常" || result === "正常通过" || result === "正常 · 默认通过") return "NORMAL";
  if (result === "不适用") return "NOT_APPLICABLE";
  if (result === "阻断" || result === "无法检查") return "BLOCKED";
  if (result !== undefined) return "ABNORMAL";
  if (isAbnormal !== undefined) return isAbnormal ? "ABNORMAL" : "NORMAL";
  return undefined;
}

function buildExecutionPatch(input: PatchInput, executionStatus: ExecutionStatusValue | undefined, existingItem?: ExistingExecutionItem) {
  const resultLabels: Record<ExecutionStatusValue, string> = { NORMAL: "正常", ABNORMAL: "异常", NOT_APPLICABLE: "不适用", BLOCKED: "无法检查", UNCHECKED: "未检" };
  const isAbnormal = executionStatus === "ABNORMAL" || executionStatus === "BLOCKED";
  const shouldClearAnalysis = executionStatus !== undefined && executionStatus !== "ABNORMAL";
  const severity = executionStatus === "NORMAL" || executionStatus === "NOT_APPLICABLE"
    ? 0
    : executionStatus === "ABNORMAL"
      ? Math.max(input.severity ?? existingItem?.severity ?? 0, 1)
      : executionStatus === "BLOCKED"
        ? input.severity ?? Math.max(existingItem?.severity ?? 0, 3)
        : input.severity;
  const findingMode = executionStatus === undefined
    ? undefined
    : executionStatus === "ABNORMAL"
      ? input.findingMode ?? existingItem?.findingMode ?? "CRITERION"
      : "CRITERION";

  return {
    ...(executionStatus ? { resultStatus: executionStatus, result: input.result ?? resultLabels[executionStatus] } : {}),
    ...(input.result !== undefined ? { result: input.result } : {}),
    ...(executionStatus ? { isAbnormal } : input.isAbnormal !== undefined ? { isAbnormal: input.isAbnormal } : {}),
    ...(severity !== undefined ? { severity } : {}),
    ...(findingMode ? { findingMode } : {}),
    ...(input.notes !== undefined ? { notes: input.notes } : {}),
    ...(shouldClearAnalysis
      ? {
          professionalDescription: null,
          consumerExplanation: null,
          futureRisk: null,
          repairSuggestion: null,
          estimatedRepairCost: null,
        }
      : {
          ...(input.estimatedRepairCost !== undefined ? { estimatedRepairCost: input.estimatedRepairCost } : {}),
          ...(input.professionalDescription !== undefined ? { professionalDescription: input.professionalDescription } : {}),
          ...(input.consumerExplanation !== undefined ? { consumerExplanation: input.consumerExplanation } : {}),
          ...(input.futureRisk !== undefined ? { futureRisk: input.futureRisk } : {}),
          ...(input.repairSuggestion !== undefined ? { repairSuggestion: input.repairSuggestion } : {}),
        }),
    ...(input.operatorName !== undefined ? { operatorName: REPORT_INSPECTOR_NAME } : {}),
    ...(executionStatus && executionStatus !== "UNCHECKED" ? { checkedAt: new Date() } : {}),
  };
}

function evaluationRisk(result: EvaluationResult) {
  if (!result.complete) return "UNASSESSED";
  if (result.hardStop || result.accidentClassification === "MAJOR") return "HIGH";
  if (result.circulationRecommendation === "HOLD_FOR_REVIEW" || result.circulationRecommendation === "REPAIR_REVIEW") return "MEDIUM";
  return "LOW";
}

async function createStandardSnapshot(tx: Prisma.TransactionClient, bundle: InspectionBundle, evaluation: EvaluationWithOutcomes, result: EvaluationResult) {
  const standardDocument = buildStandardReportDocument({
    vehicle: {
      id: bundle.vehicle.id,
      code: bundle.vehicle.code,
      vin: bundle.vehicle.vin,
      plateNo: bundle.vehicle.plateNo,
      brand: bundle.vehicle.brand,
      series: bundle.vehicle.series,
      model: bundle.vehicle.model,
      modelYear: bundle.vehicle.modelYear,
      mileage: bundle.vehicle.mileage,
      listingPrice: bundle.vehicle.listingPrice,
      energyType: bundle.vehicle.energyType,
      coverImage: bundle.vehicle.coverImage,
      displayTags: bundle.vehicle.displayTags,
    },
    inspection: {
      id: bundle.inspection.id,
      version: bundle.inspection.version,
      inspectionDate: bundle.inspection.inspectionDate,
      inspectorName: REPORT_INSPECTOR_NAME,
      reviewerName: REPORT_REVIEWER_NAME,
      overallRiskLevel: evaluationRisk(result),
      summary: bundle.inspection.summary,
      items: bundle.inspection.items,
    },
    templateItems: bundle.templateItems,
    templateVersionId: bundle.templateVersion.id,
    evaluation,
    market: bundle.vehicle.marketSnapshots[0] ?? null,
    generatedAt: new Date(),
  });
  const latest = await tx.standardReportSnapshot.findFirst({ where: { inspectionId: bundle.inspection.id }, orderBy: { version: "desc" } });
  return tx.standardReportSnapshot.create({
    data: {
      inspectionId: bundle.inspection.id,
      evaluationId: evaluation.id,
      templateVersionId: bundle.templateVersion.id,
      version: (latest?.version ?? 0) + 1,
      snapshotVersion: standardDocument.snapshotVersion,
      snapshotJson: JSON.stringify(standardDocument),
      generatedAt: new Date(standardDocument.generatedAt),
      generatedBy: "rule-engine",
    },
  });
}

async function evaluateAndSnapshot(tx: Prisma.TransactionClient, vehicleId: string, confirmedComplete = false) {
  const bundle = await loadInspectionBundle(vehicleId, tx);
  if (!bundle) throw new Error("车辆不存在或尚未绑定模板版本");

  const executionItems = bundle.inspection.items as ExecutionItemLike[];
  const findings = bundleFindings(bundle);
  const accidentAssessments = bundle.inspection.items.flatMap((item) => item.findings.flatMap((finding) => {
    const assessment = finding.accidentAssessment;
    return assessment ? [{ findingId: finding.id, classification: assessment.classification, decisionParticipant: assessment.decisionParticipant, damageGroupId: assessment.damageGroupId }] : [];
  }));
  const consistency = findInspectionDataIssues({ templateItems: bundle.templateItems, executionItems, findings });
  if (!consistency.valid) throw new InspectionDataConsistencyError(consistency.issues);

  const result = evaluateInspection({
    templateItems: bundle.templateItems,
    executionItems,
    findings,
    accidentAssessments,
    requireComplete: true,
    confirmedComplete: confirmedComplete || isInspectionConfirmed(bundle.inspection.status),
  });
  if (!result.complete) throw new InspectionIncompleteError(result);

  const publishedRuleSet = await tx.appraisalRuleSetVersion.findFirst({ where: { status: "PUBLISHED", ruleSet: { active: true } }, orderBy: [{ effectiveFrom: "desc" }, { version: "desc" }] });
  if (!publishedRuleSet) throw new RuleSetUnavailableError();

  const latestEvaluation = await tx.inspectionEvaluation.findFirst({ where: { inspectionId: bundle.inspection.id }, orderBy: { version: "desc" }, select: { version: true } });
  const evaluation = await tx.inspectionEvaluation.create({
    data: {
      inspectionId: bundle.inspection.id,
      ruleSetVersionId: publishedRuleSet.id,
      version: (latestEvaluation?.version ?? 0) + 1,
      status: "COMPLETED",
      legalTradeabilityStatus: result.legalTradeabilityStatus,
      hardStop: result.hardStop,
      hardStopCode: result.hardStopCode,
      accidentClassification: result.accidentClassification,
      floodStatus: result.floodStatus,
      floodFindingCount: result.floodFindingCount,
      currentSafetyConclusion: result.currentSafetyConclusion,
      functionConclusion: result.functionConclusion,
      circulationRecommendation: result.circulationRecommendation,
      recommendationReason: result.recommendationReason,
      outcomeJson: JSON.stringify(result.outcomes),
      evaluatorName: REPORT_REVIEWER_NAME,
      outcomes: { create: result.outcomes.map((item) => ({ code: item.code, axis: item.axis, status: item.status, isBlocking: item.isBlocking, valueText: item.valueText ?? null, reason: item.reason, detailsJson: JSON.stringify(item.details ?? {}) })) },
    },
    include: { outcomes: true },
  });
  await tx.inspection.update({ where: { id: bundle.inspection.id }, data: { status: result.hardStop ? "BLOCKED" : "COMPLETED", overallRiskLevel: evaluationRisk(result), completedAt: new Date(), lastSavedAt: new Date(), summary: `已完成 ${bundle.templateItems.length} 项模板核验。${result.recommendationReason}` } });

  const updatedBundle = await loadInspectionBundle(vehicleId, tx);
  if (!updatedBundle) throw new Error("评估后无法读取鉴定记录");
  await createStandardSnapshot(tx, updatedBundle, evaluation, result);
  return evaluation;
}

export async function GET(_request: Request, { params }: { params: Promise<{ vehicleId: string }> }) {
  const { vehicleId } = await params;
  const bundle = await loadInspectionBundle(vehicleId);
  if (!bundle) return Response.json({ error: "车辆不存在或尚未绑定模板版本" }, { status: 404 });
  return Response.json(serializeBundle(bundle));
}

export async function PATCH(request: Request, { params }: { params: Promise<{ vehicleId: string }> }) {
  const { vehicleId } = await params;
  const parsed = patchSchema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: "鉴定项数据不合法", issues: parsed.error.flatten() }, { status: 400 });
  const bundle = await loadInspectionBundle(vehicleId);
  if (!bundle) return Response.json({ error: "车辆不存在或尚未绑定模板版本" }, { status: 404 });

  const input = parsed.data;
  const existingByItemId = input.itemId ? bundle.inspection.items.find((item) => item.id === input.itemId) : undefined;
  const itemIdIsTemplateId = Boolean(input.itemId && bundle.templateItems.some((item) => item.id === input.itemId));
  const checkItemId = input.checkItemId ?? existingByItemId?.checkItemId ?? (itemIdIsTemplateId ? input.itemId : undefined);
  const existingByCheckItemId = checkItemId ? bundle.inspection.items.find((item) => item.checkItemId === checkItemId) : undefined;
  const existingById = existingByItemId ?? existingByCheckItemId;
  const templateItem = checkItemId ? bundle.templateItems.find((item) => item.id === checkItemId) : undefined;
  const hasItemPatch = itemPatchFields.some((field) => input[field] !== undefined);
  if ((input.itemId || input.checkItemId || hasItemPatch || input.findingUpdates?.length || input.evidence || input.accidentAssessment) && !templateItem) {
    return Response.json({ error: "鉴定项不属于当前模板版本" }, { status: 400 });
  }
  if (existingById && input.checkItemId && existingById.checkItemId !== input.checkItemId) {
    return Response.json({ error: "itemId 与 checkItemId 不匹配" }, { status: 400 });
  }
  if (input.itemId && !existingByItemId && !itemIdIsTemplateId) {
    return Response.json({ error: "鉴定执行项不存在" }, { status: 400 });
  }
  try {
    await db.$transaction(async (tx) => {
      let executionItemId = existingById?.id;
      let executionStatus: (typeof executionStatuses)[number] | undefined;
      let didMutateExecutionItem = false;
      if (templateItem) {
        const customTextFields = ["professionalDescription", "consumerExplanation", "futureRisk", "repairSuggestion"] as const;
        const hasReachedFinding = input.findingUpdates?.some((finding) => finding.status === "REACHED") ?? false;
        const hasAbnormalDetails = Boolean(input.evidence)
          || (input.estimatedRepairCost !== undefined && input.estimatedRepairCost !== null && input.estimatedRepairCost > 0)
          || customTextFields.some((field) => Boolean(input[field]?.trim()));
        const hasNormalDetails = Boolean(input.notes?.trim());
        const existingStatusValue = existingById?.resultStatus;
        const existingStatus = isExecutionStatus(existingStatusValue) ? existingStatusValue : undefined;
        executionStatus = input.resultStatus
          ?? deriveStatus(input.result, input.isAbnormal)
          ?? existingStatus
          ?? (hasReachedFinding || hasAbnormalDetails ? "ABNORMAL" : hasNormalDetails ? "NORMAL" : undefined);
      }

      if (templateItem && executionItemId) {
        const defaults = buildDefaultItemFields(templateItem, REPORT_INSPECTOR_NAME);
        const patch = buildExecutionPatch(input, executionStatus, existingById);
        const executionItem = await tx.inspectionItem.upsert({
          where: { inspectionId_checkItemId: { inspectionId: bundle.inspection.id, checkItemId: templateItem.id } },
          create: { inspectionId: bundle.inspection.id, checkItemId: templateItem.id, positionId: templateItem.position.id, ...defaults, ...patch },
          update: patch,
        });
        executionItemId = executionItem.id;
        didMutateExecutionItem = true;
      } else if (templateItem && !executionItemId && executionStatus !== undefined) {
        const defaults = buildDefaultItemFields(templateItem, REPORT_INSPECTOR_NAME);
        const patch = buildExecutionPatch(input, executionStatus);
        const executionItem = await tx.inspectionItem.create({
          data: { inspectionId: bundle.inspection.id, checkItemId: templateItem.id, positionId: templateItem.position.id, ...defaults, ...patch },
        });
        executionItemId = executionItem.id;
        didMutateExecutionItem = true;
      }

      if (!executionItemId && (input.findingUpdates?.some((finding) => finding.status !== "NOT_REACHED") || input.evidence || input.accidentAssessment)) throw new Error("找不到可写入的执行项");
      const keepsCriterionState = executionStatus === "ABNORMAL" || executionStatus === "NOT_APPLICABLE" || executionStatus === "BLOCKED";
      if (executionItemId && input.findingUpdates?.length) {
        for (const findingUpdate of input.findingUpdates) {
          const criterion = templateItem?.criteria.find((item) => item.id === findingUpdate.criterionId);
          if (!criterion) throw new Error("criterion 不属于当前鉴定项");
          if (!keepsCriterionState) continue;
          await tx.inspectionFinding.upsert({
            where: { inspectionItemId_criterionId: { inspectionItemId: executionItemId, criterionId: criterion.id } },
            create: { inspectionItemId: executionItemId, criterionId: criterion.id, status: findingUpdate.status, valueText: findingUpdate.valueText ?? null, note: findingUpdate.note ?? null, selectedBy: REPORT_INSPECTOR_NAME },
            update: { status: findingUpdate.status, valueText: findingUpdate.valueText ?? null, note: findingUpdate.note ?? null, selectedBy: findingUpdate.selectedBy !== undefined ? REPORT_INSPECTOR_NAME : undefined, updatedAt: new Date() },
          });
        }
      }
      if (executionItemId && (executionStatus === "NORMAL" || executionStatus === "UNCHECKED")) {
        if (input.findingUpdates?.some((finding) => finding.status === "REACHED")) throw new Error("非异常项不能记录达到的 criterion");
        await tx.inspectionFinding.deleteMany({ where: { inspectionItemId: executionItemId } });
      }

      if (executionItemId && executionStatus === "ABNORMAL") {
        const reachedFindings = await tx.inspectionFinding.findMany({
          where: { inspectionItemId: executionItemId, status: "REACHED" },
          include: { criterion: { select: { label: true, sortOrder: true, hardStopCriterion: true } } },
          orderBy: { updatedAt: "asc" },
        });
        const syncedResult = getInspectionResultLabel({
          result: input.result,
          resultStatus: executionStatus,
          isAbnormal: true,
          findings: reachedFindings,
        });
        const syncedSeverity = resolveInspectionSeverity({
          status: executionStatus,
          storedSeverity: input.severity ?? existingById?.severity,
          findings: reachedFindings,
        });
        await tx.inspectionItem.update({
          where: { id: executionItemId },
          data: { ...(syncedResult ? { result: syncedResult } : {}), severity: syncedSeverity },
        });
      }

      if (executionItemId && input.accidentAssessment) {
        const assessmentInput = input.accidentAssessment;
        if (assessmentInput.criterionId && !templateItem?.criteria.some((criterion) => criterion.id === assessmentInput.criterionId)) {
          throw new Error("criterion 不属于当前鉴定项");
        }
        const criterionId = assessmentInput.criterionId ?? input.findingUpdates?.find((finding) => finding.status === "REACHED" && templateItem?.criteria.some((criterion) => criterion.id === finding.criterionId && criterion.criterionType === "ACCIDENT_DEFECT"))?.criterionId;
        const finding = assessmentInput.findingId
          ? await tx.inspectionFinding.findFirst({ where: { id: assessmentInput.findingId, inspectionItemId: executionItemId }, select: { id: true, criterionId: true } })
          : criterionId
            ? await tx.inspectionFinding.findUnique({ where: { inspectionItemId_criterionId: { inspectionItemId: executionItemId, criterionId } }, select: { id: true, criterionId: true } })
            : null;
        if (!finding) throw new Error("事故评估必须关联已记录的 criterion finding");
        if (!templateItem?.criteria.some((criterion) => criterion.id === finding.criterionId)) throw new Error("finding 的 criterion 不属于当前模板版本");
        if (assessmentInput.criterionId && finding.criterionId !== assessmentInput.criterionId) throw new Error("事故评估 criterion 与 finding 不匹配");
        let damageGroupId = assessmentInput.damageGroupId ?? null;
        if (damageGroupId) {
          const damageGroup = await tx.inspectionDamageGroup.findFirst({ where: { id: damageGroupId, inspectionId: bundle.inspection.id }, select: { id: true } });
          if (!damageGroup) throw new Error("damageGroupId 不属于当前鉴定");
        }
        if (!damageGroupId && assessmentInput.groupCode) {
          const group = await tx.inspectionDamageGroup.upsert({
            where: { inspectionId_groupCode: { inspectionId: bundle.inspection.id, groupCode: assessmentInput.groupCode } },
            create: { inspectionId: bundle.inspection.id, groupCode: assessmentInput.groupCode, label: assessmentInput.groupLabel || assessmentInput.groupCode, notes: assessmentInput.notes ?? null, confirmedBy: REPORT_REVIEWER_NAME, confirmedAt: new Date() },
            update: { label: assessmentInput.groupLabel || assessmentInput.groupCode, notes: assessmentInput.notes ?? undefined, confirmedBy: assessmentInput.confirmedBy !== undefined ? REPORT_REVIEWER_NAME : undefined, confirmedAt: new Date() },
          });
          damageGroupId = group.id;
        }
        await tx.inspectionAccidentAssessment.upsert({
          where: { findingId: finding.id },
          create: { inspectionId: bundle.inspection.id, findingId: finding.id, damageGroupId, classification: assessmentInput.classification, decisionParticipant: assessmentInput.decisionParticipant, notes: assessmentInput.notes ?? null, confirmedBy: REPORT_REVIEWER_NAME, confirmedAt: new Date() },
          update: { damageGroupId, classification: assessmentInput.classification, decisionParticipant: assessmentInput.decisionParticipant, notes: assessmentInput.notes ?? null, confirmedBy: assessmentInput.confirmedBy !== undefined ? REPORT_REVIEWER_NAME : undefined, confirmedAt: new Date() },
        });
      }

      if (executionItemId && input.evidence) {
        await tx.inspectionEvidence.create({ data: { inspectionId: bundle.inspection.id, inspectionItemId: executionItemId, uri: input.evidence.uri, mediaType: input.evidence.mediaType, caption: input.evidence.caption ?? null, capturedBy: REPORT_INSPECTOR_NAME, capturedAt: new Date() } });
      }

      if (input.status === "COMPLETED") {
        await evaluateAndSnapshot(tx, vehicleId, true);
      } else if (templateItem || input.status) {
        const reopensConfirmedInspection = Boolean(templateItem && input.status === undefined && didMutateExecutionItem && isInspectionConfirmed(bundle.inspection.status));
        await tx.inspection.update({
          where: { id: bundle.inspection.id },
          data: {
            ...(input.status ? { status: input.status } : reopensConfirmedInspection ? { status: "IN_PROGRESS", completedAt: null } : {}),
            lastSavedAt: new Date(),
          },
        });
      }
    });
  } catch (error) {
    if (error instanceof InspectionIncompleteError) {
      return Response.json({ error: error.message, code: "INSPECTION_INCOMPLETE", missing: error.result.missing }, { status: 409 });
    }
    if (error instanceof RuleSetUnavailableError) {
      return Response.json({ error: error.message }, { status: 409 });
    }
    if (error instanceof InspectionDataConsistencyError) {
      return Response.json({ error: error.message, code: "INSPECTION_DATA_INCONSISTENT", issues: error.issues }, { status: 409 });
    }
    const message = error instanceof Error ? error.message : "鉴定项保存失败";
    return Response.json({ error: message }, { status: 400 });
  }

  const updated = await loadInspectionBundle(vehicleId);
  if (!updated) return Response.json({ error: "保存后无法读取鉴定记录" }, { status: 500 });
  return Response.json(serializeBundle(updated));
}

export async function POST(request: Request, { params }: { params: Promise<{ vehicleId: string }> }) {
  const { vehicleId } = await params;
  const parsed = evaluateSchema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: "评估动作不合法" }, { status: 400 });
  const bundle = await loadInspectionBundle(vehicleId);
  if (!bundle) return Response.json({ error: "车辆不存在或尚未绑定模板版本" }, { status: 404 });
  if (!isInspectionConfirmed(bundle.inspection.status)) {
    const completion = checkInspectionCompletion(bundle.templateItems, bundle.inspection.items as ExecutionItemLike[]);
    return Response.json({
      error: "请先确认其余未单独记录项目正常并完成鉴定",
      code: "INSPECTION_CONFIRM_REQUIRED",
      missing: completion.missing,
    }, { status: 409 });
  }

  let createdEvaluation: EvaluationWithOutcomes;
  try {
    createdEvaluation = await db.$transaction((tx) => evaluateAndSnapshot(tx, vehicleId));
  } catch (error) {
    if (error instanceof InspectionIncompleteError) {
      return Response.json({ error: error.message, code: "INSPECTION_INCOMPLETE", missing: error.result.missing }, { status: 409 });
    }
    if (error instanceof RuleSetUnavailableError) {
      return Response.json({ error: error.message }, { status: 409 });
    }
    if (error instanceof InspectionDataConsistencyError) {
      return Response.json({ error: error.message, code: "INSPECTION_DATA_INCONSISTENT", issues: error.issues }, { status: 409 });
    }
    return Response.json({ error: error instanceof Error ? error.message : "评估失败" }, { status: 400 });
  }

  const updated = await loadInspectionBundle(vehicleId);
  if (!updated) return Response.json({ error: "评估后无法读取鉴定记录" }, { status: 500 });
  return Response.json({ ...serializeBundle(updated), evaluation: createdEvaluation });
}
