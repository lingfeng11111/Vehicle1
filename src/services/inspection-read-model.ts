import {
  EXECUTION_STATUS_LABELS,
  isCompleteExecutionStatus,
  type ExecutionItemLike,
  type ExecutionStatus,
  type TemplateItemLike,
} from "@/services/inspection-engine";
import { getInspectionResultLabel, type InspectionFindingResultLike } from "@/services/inspection-result";
import { resolveInspectionSeverity } from "@/services/inspection-severity";

const EXECUTION_STATUS_SET = new Set<string>(Object.keys(EXECUTION_STATUS_LABELS));

export type InspectionReadModelExecutionItem = ExecutionItemLike & {
  basePriority?: number;
  professionalDescription?: string | null;
  consumerExplanation?: string | null;
  futureRisk?: string | null;
  repairSuggestion?: string | null;
  estimatedRepairCost?: number | null;
  operatorName?: string | null;
  reviewerName?: string | null;
  checkedAt?: Date | string | null;
  updatedAt?: Date | string;
  findings?: InspectionFindingResultLike[];
  evidence?: unknown[];
  findingMode?: string | null;
};

export type InspectionReadModelItem = InspectionReadModelExecutionItem & {
  resultStatus: ExecutionStatus;
  basePriority: number;
  professionalDescription: string | null;
  consumerExplanation: string | null;
  futureRisk: string | null;
  repairSuggestion: string | null;
  estimatedRepairCost: number | null;
  findings: InspectionFindingResultLike[];
  evidence: unknown[];
  findingMode: string;
};

export type InspectionSummary = {
  total: number;
  checked: number;
  recorded: number;
  implicitNormal: number;
  missing: number;
  unchecked: number;
  normal: number;
  abnormal: number;
  blocked: number;
  notApplicable: number;
  risk: number;
  completionPercent: number;
  complete: boolean;
};

function isConfirmedInspection(status: string) {
  return status === "COMPLETED" || status === "BLOCKED";
}

function statusFromItem(item: Pick<InspectionReadModelExecutionItem, "resultStatus" | "result" | "isAbnormal">): ExecutionStatus {
  if (EXECUTION_STATUS_SET.has(item.resultStatus)) return item.resultStatus as ExecutionStatus;
  if (item.result === "正常" || item.result === "正常通过" || item.result === "正常 · 默认通过") return "NORMAL";
  if (item.result === "不适用") return "NOT_APPLICABLE";
  if (item.result === "阻断" || item.result === "无法检查") return "BLOCKED";
  if (item.result === "未检" || item.result === "未检验") return "UNCHECKED";
  return item.isAbnormal ? "ABNORMAL" : "UNCHECKED";
}

function normalizeItem(item: InspectionReadModelExecutionItem, templateItem?: TemplateItemLike): InspectionReadModelItem {
  const resultStatus = statusFromItem(item);
  const isAbnormal = resultStatus === "ABNORMAL" || resultStatus === "BLOCKED";
  const severity = resolveInspectionSeverity({ status: resultStatus, storedSeverity: item.severity, findings: item.findings });

  return {
    ...item,
    ...(templateItem
      ? {
          checkItemId: templateItem.id,
          positionId: templateItem.position.id,
          zone: templateItem.position.code,
          category: templateItem.category,
          itemName: templateItem.name,
        }
      : {}),
    result: getInspectionResultLabel({
      result: item.result,
      resultStatus,
      isAbnormal,
      findings: item.findings,
    }) ?? EXECUTION_STATUS_LABELS[resultStatus],
    resultStatus,
    isAbnormal,
    severity,
    basePriority: item.basePriority ?? (templateItem?.accidentDecisionParticipant ? 5 : 1),
    professionalDescription: isAbnormal && resultStatus === "ABNORMAL" ? item.professionalDescription ?? null : null,
    consumerExplanation: isAbnormal && resultStatus === "ABNORMAL" ? item.consumerExplanation ?? null : null,
    futureRisk: isAbnormal && resultStatus === "ABNORMAL" ? item.futureRisk ?? null : null,
    repairSuggestion: isAbnormal && resultStatus === "ABNORMAL" ? item.repairSuggestion ?? null : null,
    estimatedRepairCost: isAbnormal && resultStatus === "ABNORMAL" ? item.estimatedRepairCost ?? null : null,
    findings: item.findings ?? [],
    evidence: item.evidence ?? [],
    findingMode: item.findingMode ?? "CRITERION",
  };
}

/**
 * Materialize the template and the sparse execution facts into one read model.
 * Completed inspections intentionally store only recorded exceptions and
 * evidence; their missing template rows are implicit normal results. Drafts
 * must remain unchecked so the UI never presents uninspected work as passed.
 */
export function materializeInspectionItems(
  templateItems: TemplateItemLike[],
  executionItems: InspectionReadModelExecutionItem[],
  confirmed: boolean,
): InspectionReadModelItem[] {
  const executionByCheckItem = new Map(
    executionItems.filter((item) => item.checkItemId).map((item) => [item.checkItemId as string, item]),
  );
  const materialized = templateItems.map((templateItem) => {
    const execution = executionByCheckItem.get(templateItem.id);
    if (execution) return normalizeItem(execution, templateItem);

    const resultStatus: ExecutionStatus = confirmed ? "NORMAL" : "UNCHECKED";
    return {
      id: `template-${templateItem.id}`,
      checkItemId: templateItem.id,
      positionId: templateItem.position.id,
      zone: templateItem.position.code,
      category: templateItem.category,
      itemName: templateItem.name,
      result: EXECUTION_STATUS_LABELS[resultStatus],
      resultStatus,
      isAbnormal: false,
      severity: 0,
      basePriority: templateItem.accidentDecisionParticipant ? 5 : 1,
      professionalDescription: null,
      consumerExplanation: null,
      futureRisk: null,
      repairSuggestion: null,
      estimatedRepairCost: null,
      notes: null,
      operatorName: null,
      reviewerName: null,
      checkedAt: null,
      findings: [],
      evidence: [],
      findingMode: "CRITERION",
    } satisfies InspectionReadModelItem;
  });

  const templateIds = new Set(templateItems.map((item) => item.id));
  const legacyItems = executionItems
    .filter((item) => !item.checkItemId || !templateIds.has(item.checkItemId))
    .map((item) => normalizeItem(item));

  return [...materialized, ...legacyItems];
}

export function buildInspectionSummary(args: {
  status: string;
  templateTotal: number;
  items: Array<Pick<InspectionReadModelExecutionItem, "checkItemId" | "resultStatus" | "result" | "isAbnormal">>;
}): InspectionSummary {
  const linkedItems = args.items.filter((item) => item.checkItemId);
  const total = Math.max(args.templateTotal, linkedItems.length);
  const abnormal = linkedItems.filter((item) => statusFromItem(item) === "ABNORMAL").length;
  const blocked = linkedItems.filter((item) => statusFromItem(item) === "BLOCKED").length;
  const notApplicable = linkedItems.filter((item) => statusFromItem(item) === "NOT_APPLICABLE").length;
  const recorded = linkedItems.filter((item) => isCompleteExecutionStatus(statusFromItem(item))).length;
  const complete = isConfirmedInspection(args.status);
  const checked = complete ? total : recorded;
  const normal = complete
    ? Math.max(0, total - abnormal - blocked - notApplicable)
    : linkedItems.filter((item) => statusFromItem(item) === "NORMAL").length;
  const missing = complete ? 0 : Math.max(0, total - checked);
  const implicitNormal = complete ? Math.max(0, total - recorded) : 0;
  const unchecked = complete ? 0 : missing;

  return {
    total,
    checked,
    recorded,
    implicitNormal,
    missing,
    unchecked,
    normal,
    abnormal,
    blocked,
    notApplicable,
    risk: abnormal + blocked,
    completionPercent: total ? Math.round((checked / total) * 1000) / 10 : 0,
    complete,
  };
}

export function countTemplateItems(templateVersion: {
  sections: Array<{ positions: Array<{ checkItems: Array<unknown> }> }>;
}) {
  return templateVersion.sections.reduce(
    (total, section) => total + section.positions.reduce((sectionTotal, position) => sectionTotal + position.checkItems.length, 0),
    0,
  );
}
