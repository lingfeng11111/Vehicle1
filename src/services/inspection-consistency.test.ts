import { describe, expect, it } from "vitest";
import { findInspectionDataIssues } from "@/services/inspection-consistency";
import type { ExecutionItemLike, TemplateItemLike } from "@/services/inspection-engine";

const criterion = {
  id: "criterion-1",
  code: "EXTE_01",
  label: "划痕",
  axis: "DISCLOSURE",
  criterionType: "EXTERIOR_DEFECT",
  countsAsDistinctFloodFinding: false,
  hardStopCriterion: false,
  sortOrder: 0,
};

const templateItem: TemplateItemLike = {
  id: "item-1",
  code: "RF_R40",
  name: "右前车门",
  category: "EXTERIOR",
  componentClass: "BODY",
  accidentDecisionParticipant: false,
  sortOrder: 0,
  position: { id: "position-1", code: "FRONT_RIGHT", name: "右前方位" },
  section: { code: "EXTERIOR", name: "外观", axis: "DISCLOSURE" },
  criteria: [criterion],
};

function execution(overrides: Partial<ExecutionItemLike> = {}): ExecutionItemLike {
  return {
    id: "execution-1",
    checkItemId: templateItem.id,
    positionId: templateItem.position.id,
    zone: templateItem.position.code,
    category: templateItem.category,
    itemName: templateItem.name,
    result: "异常",
    resultStatus: "ABNORMAL",
    isAbnormal: true,
    severity: 1,
    ...overrides,
  };
}

function finding(overrides: Partial<{ criterionId: string; status: string }> = {}) {
  return {
    id: "finding-1",
    inspectionItemId: "execution-1",
    criterionId: overrides.criterionId ?? criterion.id,
    status: overrides.status ?? "NOT_REACHED",
    criterion: { id: overrides.criterionId ?? criterion.id, label: criterion.label },
  };
}

describe("inspection consistency", () => {
  it("rejects an abnormal criterion-backed item without a reached criterion", () => {
    const result = findInspectionDataIssues({ templateItems: [templateItem], executionItems: [execution()], findings: [finding()] });
    expect(result.valid).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain("ABNORMAL_WITHOUT_CRITERION");
  });

  it("allows a documented direct exception without fabricating a rule hit", () => {
    const result = findInspectionDataIssues({
      templateItems: [templateItem],
      executionItems: [execution({ findingMode: "DIRECT" })],
      findings: [],
    });
    expect(result).toEqual({ valid: true, issues: [] });
  });

  it("rejects reached findings on normal items and findings from another criterion", () => {
    const normal = findInspectionDataIssues({
      templateItems: [templateItem],
      executionItems: [execution({ result: "正常", resultStatus: "NORMAL", isAbnormal: false })],
      findings: [finding({ status: "REACHED" })],
    });
    expect(normal.issues.map((issue) => issue.code)).toContain("REACHED_FINDING_ON_NON_ABNORMAL");

    const mismatched = findInspectionDataIssues({
      templateItems: [templateItem],
      executionItems: [execution()],
      findings: [finding({ criterionId: "criterion-from-another-item", status: "REACHED" })],
    });
    expect(mismatched.issues.map((issue) => issue.code)).toContain("FINDING_CRITERION_MISMATCH");
  });
});
