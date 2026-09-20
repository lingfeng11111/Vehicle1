import { describe, expect, it } from "vitest";
import type { TemplateItemLike } from "@/services/inspection-engine";
import { buildInspectionSummary, materializeInspectionItems, type InspectionReadModelExecutionItem } from "@/services/inspection-read-model";

const templateItems: TemplateItemLike[] = [
  {
    id: "check-1",
    code: "CHECK_1",
    name: "左前纵梁",
    category: "STRUCTURE",
    componentClass: "BODY",
    accidentDecisionParticipant: true,
    sortOrder: 0,
    position: { id: "position-1", code: "FRONT_LEFT", name: "左前方位" },
    section: { code: "BODY", name: "车身结构", axis: "STRUCTURE" },
    criteria: [],
  },
  {
    id: "check-2",
    code: "CHECK_2",
    name: "发动机工况",
    category: "POWERTRAIN",
    componentClass: "ENGINE",
    accidentDecisionParticipant: false,
    sortOrder: 1,
    position: { id: "position-2", code: "ENGINE", name: "动力系统" },
    section: { code: "POWERTRAIN", name: "动力系统", axis: "FUNCTION" },
    criteria: [],
  },
];

const abnormalExecution: InspectionReadModelExecutionItem = {
  id: "execution-1",
  checkItemId: "check-1",
  positionId: "position-1",
  zone: "FRONT_LEFT",
  category: "STRUCTURE",
  itemName: "左前纵梁",
  result: "轻微变形",
  resultStatus: "ABNORMAL",
  isAbnormal: true,
  severity: 1,
  notes: "已拍照留档",
  professionalDescription: "存在轻微变形。",
  consumerExplanation: "需要结合结构复检理解。",
  futureRisk: "需关注定位数据。",
  repairSuggestion: "建议复检。",
  estimatedRepairCost: 800,
};

describe("inspection read model", () => {
  it("materializes sparse completed inspections as normal only for missing template rows", () => {
    const facts = materializeInspectionItems(templateItems, [abnormalExecution], true);
    const summary = buildInspectionSummary({ status: "COMPLETED", templateTotal: templateItems.length, items: [abnormalExecution] });

    expect(facts).toHaveLength(2);
    expect(facts[0]?.resultStatus).toBe("ABNORMAL");
    expect(facts[0]?.professionalDescription).toBe("存在轻微变形。");
    expect(facts[1]?.resultStatus).toBe("NORMAL");
    expect(facts[1]?.professionalDescription).toBeNull();
    expect(summary).toMatchObject({ total: 2, checked: 2, recorded: 1, implicitNormal: 1, missing: 0, normal: 1, abnormal: 1, risk: 1, complete: true });
  });

  it("keeps missing rows unchecked while an inspection is still a draft", () => {
    const facts = materializeInspectionItems(templateItems, [abnormalExecution], false);
    const summary = buildInspectionSummary({ status: "IN_PROGRESS", templateTotal: templateItems.length, items: [abnormalExecution] });

    expect(facts[1]?.resultStatus).toBe("UNCHECKED");
    expect(facts[1]?.result).toBe("未检");
    expect(summary).toMatchObject({ total: 2, checked: 1, recorded: 1, missing: 1, unchecked: 1, normal: 0, abnormal: 1, complete: false });
  });

  it("uses the reached criterion as the abnormal result shown to every reader", () => {
    const facts = materializeInspectionItems(
      templateItems,
      [{
        ...abnormalExecution,
        result: "轻微变形",
        findings: [{ status: "REACHED", criterion: { label: "凹陷≥3cm²", sortOrder: 1 } }],
      }],
      true,
    );

    expect(facts[0]?.result).toBe("凹陷≥3cm²");
  });
});
