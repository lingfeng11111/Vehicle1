import type {
  ExecutionItemLike,
  FindingLike,
  TemplateItemLike,
} from "@/services/inspection-engine";

export type InspectionConsistencyIssueCode =
  | "ABNORMAL_WITHOUT_CRITERION"
  | "REACHED_FINDING_ON_NON_ABNORMAL"
  | "BLOCKED_WITH_REACHED_CRITERION"
  | "STATUS_ABNORMALITY_MISMATCH"
  | "FINDING_CRITERION_MISMATCH";

export type InspectionConsistencyIssue = {
  code: InspectionConsistencyIssueCode;
  message: string;
  itemId: string;
  checkItemId: string | null;
  itemName: string;
  criterionId?: string;
};

export type InspectionConsistencyResult = {
  valid: boolean;
  issues: InspectionConsistencyIssue[];
};

function isAbnormalStatus(status: string) {
  return status === "ABNORMAL" || status === "BLOCKED";
}

/**
 * Validate the relationship between the item status and its criterion rows.
 * This is intentionally separate from the rule evaluator: drafts may be
 * temporarily incomplete, while completion/evaluation must be consistent.
 */
export function findInspectionDataIssues(args: {
  templateItems: TemplateItemLike[];
  executionItems: Array<ExecutionItemLike & { findingMode?: string | null }>;
  findings: Array<FindingLike & { criterion?: { id?: string; label?: string | null } | null }>;
}): InspectionConsistencyResult {
  const templateById = new Map(args.templateItems.map((item) => [item.id, item]));
  const findingsByItemId = new Map<string, Array<FindingLike & { criterion?: { id?: string; label?: string | null } | null }>>();
  const issues: InspectionConsistencyIssue[] = [];

  for (const finding of args.findings) {
    const existing = findingsByItemId.get(finding.inspectionItemId) ?? [];
    existing.push(finding);
    findingsByItemId.set(finding.inspectionItemId, existing);
  }

  for (const item of args.executionItems) {
    if (!item.checkItemId) continue;
    const templateItem = templateById.get(item.checkItemId);
    if (!templateItem) continue;

    const expectedAbnormal = isAbnormalStatus(item.resultStatus);
    if (item.isAbnormal !== expectedAbnormal) {
      issues.push({
        code: "STATUS_ABNORMALITY_MISMATCH",
        message: `项目状态 ${item.resultStatus} 与 isAbnormal 标记不一致。`,
        itemId: item.id,
        checkItemId: item.checkItemId,
        itemName: item.itemName,
      });
    }

    const itemFindings = findingsByItemId.get(item.id) ?? [];
    const validCriterionIds = new Set(templateItem.criteria.map((criterion) => criterion.id));
    for (const finding of itemFindings) {
      if (!validCriterionIds.has(finding.criterionId)) {
        issues.push({
          code: "FINDING_CRITERION_MISMATCH",
          message: "finding 引用的准则不属于当前模板项目。",
          itemId: item.id,
          checkItemId: item.checkItemId,
          itemName: item.itemName,
          criterionId: finding.criterionId,
        });
      }
    }

    const reachedFindings = itemFindings.filter((finding) => finding.status === "REACHED");
    if ((item.resultStatus === "NORMAL" || item.resultStatus === "NOT_APPLICABLE" || item.resultStatus === "UNCHECKED") && reachedFindings.length) {
      issues.push({
        code: "REACHED_FINDING_ON_NON_ABNORMAL",
        message: "正常、不适用或待检查项目不能保留已达到的异常准则。",
        itemId: item.id,
        checkItemId: item.checkItemId,
        itemName: item.itemName,
      });
    }

    if (item.resultStatus === "BLOCKED" && reachedFindings.length) {
      issues.push({
        code: "BLOCKED_WITH_REACHED_CRITERION",
        message: "无法检查项目不能同时保留已达到的异常准则。",
        itemId: item.id,
        checkItemId: item.checkItemId,
        itemName: item.itemName,
      });
    }

    if (item.resultStatus === "ABNORMAL" && templateItem.criteria.length > 0 && reachedFindings.length === 0 && item.findingMode !== "DIRECT") {
      issues.push({
        code: "ABNORMAL_WITHOUT_CRITERION",
        message: "发现问题项目尚未选择具体异常准则；若模板无法覆盖，应明确记录为项目级异常。",
        itemId: item.id,
        checkItemId: item.checkItemId,
        itemName: item.itemName,
      });
    }
  }

  return { valid: issues.length === 0, issues };
}
