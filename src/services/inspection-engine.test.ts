import { describe, expect, it } from "vitest";
import { evaluateInspection, type ExecutionItemLike, type TemplateItemLike } from "@/services/inspection-engine";

function templateItem(args: {
  id: string;
  code: string;
  positionCode: string;
  axis?: string;
  accident?: boolean;
  criteria?: TemplateItemLike["criteria"];
}): TemplateItemLike {
  return {
    id: args.id,
    code: args.code,
    name: args.code,
    category: args.axis === "CORE_FUNCTION" ? "POWERTRAIN" : "STRUCTURE",
    componentClass: args.accident ? "STRUCTURAL" : "OTHER",
    accidentDecisionParticipant: args.accident ?? false,
    description: "test",
    sortOrder: 1,
    position: { id: `position-${args.positionCode}`, code: args.positionCode, name: args.positionCode, floodAggregationKey: args.positionCode },
    section: { code: `section-${args.positionCode}`, name: args.positionCode, axis: args.axis ?? "POSITIONAL_INSPECTION" },
    criteria: args.criteria ?? [{ id: `${args.id}-criterion`, code: "CRITERION", label: "test", axis: args.axis ?? "EXTERIOR_INTERIOR", criterionType: "OBSERVATION", ruleKey: "POSITIONAL_OBSERVATION", countsAsDistinctFloodFinding: false, hardStopCriterion: false, sortOrder: 1 }],
  };
}

function execution(item: TemplateItemLike, id = `execution-${item.id}`, resultStatus = "NORMAL"): ExecutionItemLike {
  return { id, checkItemId: item.id, positionId: item.position.id, zone: item.position.code, category: item.category, itemName: item.name, result: resultStatus === "NORMAL" ? "正常" : "异常", resultStatus, isAbnormal: resultStatus === "ABNORMAL", severity: resultStatus === "ABNORMAL" ? 1 : 0 };
}

function finding(item: ExecutionItemLike, criterion: TemplateItemLike["criteria"][number], id: string) {
  return { id, inspectionItemId: item.id, criterionId: criterion.id, status: "REACHED", criterion };
}

describe("inspection rule engine", () => {
  it("does not turn ordinary findings in different positions into a major accident", () => {
    const left = templateItem({ id: "left", code: "LEFT", positionCode: "FRONT_LEFT", accident: true, criteria: [{ id: "left-accident", code: "ACCI_01", label: "变形", axis: "ACCIDENT_HISTORY", criterionType: "ACCIDENT_DEFECT", ruleKey: "ACCIDENT_COMPONENT_DEFECT", countsAsDistinctFloodFinding: false, hardStopCriterion: false, sortOrder: 1 }] });
    const right = templateItem({ id: "right", code: "RIGHT", positionCode: "REAR_RIGHT", accident: true, criteria: [{ id: "right-accident", code: "ACCI_01", label: "变形", axis: "ACCIDENT_HISTORY", criterionType: "ACCIDENT_DEFECT", ruleKey: "ACCIDENT_COMPONENT_DEFECT", countsAsDistinctFloodFinding: false, hardStopCriterion: false, sortOrder: 1 }] });
    const leftExecution = execution(left, "left-execution", "ABNORMAL");
    const rightExecution = execution(right, "right-execution", "ABNORMAL");
    const result = evaluateInspection({
      templateItems: [left, right],
      executionItems: [leftExecution, rightExecution],
      findings: [finding(leftExecution, left.criteria[0], "left-finding"), finding(rightExecution, right.criteria[0], "right-finding")],
      accidentAssessments: [
        { findingId: "left-finding", classification: "ORDINARY", decisionParticipant: true, damageGroupId: null },
        { findingId: "right-finding", classification: "ORDINARY", decisionParticipant: true, damageGroupId: null },
      ],
    });
    expect(result.complete).toBe(true);
    expect(result.accidentClassification).toBe("ORDINARY");
    expect(result.circulationRecommendation).toBe("REPAIR_REVIEW");
  });

  it("groups related accident findings only inside the same position", () => {
    const first = templateItem({ id: "same-position-first", code: "SAME_POSITION_FIRST", positionCode: "FRONT_LEFT", accident: true, criteria: [{ id: "same-position-first-criterion", code: "ACCI_01", label: "变形", axis: "ACCIDENT_HISTORY", criterionType: "ACCIDENT_DEFECT", ruleKey: "ACCIDENT_COMPONENT_DEFECT", countsAsDistinctFloodFinding: false, hardStopCriterion: false, sortOrder: 1 }] });
    const second = templateItem({ id: "same-position-second", code: "SAME_POSITION_SECOND", positionCode: "FRONT_LEFT", accident: true, criteria: [{ id: "same-position-second-criterion", code: "ACCI_02", label: "修复痕迹", axis: "ACCIDENT_HISTORY", criterionType: "ACCIDENT_DEFECT", ruleKey: "ACCIDENT_COMPONENT_DEFECT", countsAsDistinctFloodFinding: false, hardStopCriterion: false, sortOrder: 1 }] });
    const firstExecution = execution(first, "same-position-first-execution", "ABNORMAL");
    const secondExecution = execution(second, "same-position-second-execution", "ABNORMAL");
    const result = evaluateInspection({
      templateItems: [first, second],
      executionItems: [firstExecution, secondExecution],
      findings: [finding(firstExecution, first.criteria[0], "same-position-first-finding"), finding(secondExecution, second.criteria[0], "same-position-second-finding")],
      accidentAssessments: [
        { findingId: "same-position-first-finding", classification: "ORDINARY", decisionParticipant: true, damageGroupId: "front-left-group" },
        { findingId: "same-position-second-finding", classification: "ORDINARY", decisionParticipant: true, damageGroupId: "front-left-group" },
      ],
    });
    const accidentOutcome = result.outcomes.find((outcome) => outcome.code === "ACCIDENT_HISTORY");
    const groups = accidentOutcome?.details?.damageGroups as Array<{ positionCode: string; damageGroupId: string | null; findingIds: string[] }> | undefined;
    expect(result.accidentClassification).toBe("ORDINARY");
    expect(groups).toHaveLength(1);
    expect(groups?.[0]).toMatchObject({ positionCode: "FRONT_LEFT", damageGroupId: "front-left-group", findingIds: ["same-position-first-finding", "same-position-second-finding"] });
  });

  it("counts multiple distinct flood phenomena on the same component separately", () => {
    const item = templateItem({ id: "flood-item", code: "FLOOD_ITEM", positionCode: "FRONT_LEFT", criteria: [
      { id: "mud", code: "FLOOD_01", label: "泥沙", axis: "FLOOD_DAMAGE", criterionType: "FLOOD_FINDING", ruleKey: "FLOOD_DISTINCT_FINDING", countsAsDistinctFloodFinding: true, hardStopCriterion: false, sortOrder: 1 },
      { id: "mildew", code: "FLOOD_02", label: "霉斑", axis: "FLOOD_DAMAGE", criterionType: "FLOOD_FINDING", ruleKey: "FLOOD_DISTINCT_FINDING", countsAsDistinctFloodFinding: true, hardStopCriterion: false, sortOrder: 2 },
    ] });
    const itemExecution = execution(item, "flood-execution", "ABNORMAL");
    const result = evaluateInspection({
      templateItems: [item],
      executionItems: [itemExecution],
      findings: [finding(itemExecution, item.criteria[0], "mud-finding"), finding(itemExecution, item.criteria[1], "mildew-finding")],
      accidentAssessments: [],
    });
    expect(result.floodFindingCount).toBe(2);
    expect(result.floodStatus).toBe("NONE");
    expect(result.outcomes.find((outcome) => outcome.code === "FLOOD_DAMAGE")?.valueText).toBe("2");
  });

  it("keeps fire out of the active evaluation outcome set even when a fire finding is supplied", () => {
    const item = templateItem({ id: "fire", code: "FIRE", positionCode: "FRONT_LEFT", criteria: [{ id: "fire-criterion", code: "FIRE_01", label: "火烧痕迹", axis: "FIRE_DAMAGE", criterionType: "FIRE_FINDING", ruleKey: "FIRE_DAMAGE", countsAsDistinctFloodFinding: false, hardStopCriterion: true, sortOrder: 1 }] });
    const itemExecution = execution(item, "fire-execution", "ABNORMAL");
    const result = evaluateInspection({ templateItems: [item], executionItems: [execution(item)], findings: [], accidentAssessments: [] });
    const withFireFinding = evaluateInspection({ templateItems: [item], executionItems: [itemExecution], findings: [finding(itemExecution, item.criteria[0], "fire-finding")], accidentAssessments: [] });
    expect(result.accidentClassification).toBe("NONE");
    expect(withFireFinding.hardStop).toBe(false);
    expect(withFireFinding.outcomes.some((outcome) => outcome.code.includes("FIRE") || outcome.axis.includes("FIRE"))).toBe(false);
  });

  it("blocks circulation when a hard-stop criterion is reached", () => {
    const item = templateItem({ id: "legal", code: "GENERAL_R04", positionCode: "GENERAL", axis: "LEGAL_TRADEABILITY", criteria: [{ id: "legal-hard-stop", code: "GENERAL_01", label: "手续缺失", axis: "LEGAL_TRADEABILITY", criterionType: "HARD_STOP", ruleKey: "LEGAL_HARD_STOP", countsAsDistinctFloodFinding: false, hardStopCriterion: true, sortOrder: 1 }] });
    const itemExecution = execution(item, "legal-execution", "ABNORMAL");
    const result = evaluateInspection({ templateItems: [item], executionItems: [itemExecution], findings: [finding(itemExecution, item.criteria[0], "legal-finding")], accidentAssessments: [] });
    expect(result.hardStop).toBe(true);
    expect(result.legalTradeabilityStatus).toBe("BLOCKED");
    expect(result.circulationRecommendation).toBe("STOPPED");
  });

  it("keeps current safety, core function, and circulation conclusions independent", () => {
    const safety = templateItem({ id: "safety", code: "SAFETY", positionCode: "CABIN", axis: "CURRENT_SAFETY", criteria: [{ id: "safety-criterion", code: "SAFETY_01", label: "安全异常", axis: "CURRENT_SAFETY", criterionType: "SAFETY_FINDING", ruleKey: "CURRENT_SAFETY_GATE", countsAsDistinctFloodFinding: false, hardStopCriterion: false, sortOrder: 1 }] });
    const functionItem = templateItem({ id: "function", code: "FUNCTION", positionCode: "ENGINE", axis: "CORE_FUNCTION", criteria: [{ id: "function-criterion", code: "FUNCTION_01", label: "功能异常", axis: "CORE_FUNCTION", criterionType: "FUNCTION_FINDING", ruleKey: "CORE_FUNCTION_GATE", countsAsDistinctFloodFinding: false, hardStopCriterion: false, sortOrder: 1 }] });
    const safetyExecution = execution(safety, "safety-execution", "ABNORMAL");
    const functionExecution = execution(functionItem, "function-execution", "ABNORMAL");
    const both = evaluateInspection({
      templateItems: [safety, functionItem],
      executionItems: [safetyExecution, functionExecution],
      findings: [finding(safetyExecution, safety.criteria[0], "safety-finding"), finding(functionExecution, functionItem.criteria[0], "function-finding")],
      accidentAssessments: [],
    });
    expect(both.currentSafetyConclusion).toBe("ISSUE_FOUND");
    expect(both.functionConclusion).toBe("ISSUE_FOUND");
    expect(both.circulationRecommendation).toBe("HOLD_FOR_REVIEW");

    const functionOnly = evaluateInspection({ templateItems: [functionItem], executionItems: [functionExecution], findings: [finding(functionExecution, functionItem.criteria[0], "function-only-finding")], accidentAssessments: [] });
    expect(functionOnly.currentSafetyConclusion).toBe("PASS");
    expect(functionOnly.functionConclusion).toBe("ISSUE_FOUND");
    expect(functionOnly.circulationRecommendation).toBe("REPAIR_REVIEW");
  });

  it("requires every template item to have an explicit execution status", () => {
    const first = templateItem({ id: "first", code: "FIRST", positionCode: "FRONT_LEFT" });
    const second = templateItem({ id: "second", code: "SECOND", positionCode: "REAR_LEFT" });
    const result = evaluateInspection({ templateItems: [first, second], executionItems: [execution(first)], findings: [], accidentAssessments: [] });
    expect(result.complete).toBe(false);
    expect(result.missing).toHaveLength(1);
    expect(result.missing[0]?.code).toBe("SECOND");
    expect(result.circulationRecommendation).toBe("UNASSESSED");
  });

  it("treats missing template items as implicit normal only after explicit confirmation", () => {
    const first = templateItem({ id: "confirmed-first", code: "CONFIRMED_FIRST", positionCode: "FRONT_LEFT" });
    const second = templateItem({ id: "confirmed-second", code: "CONFIRMED_SECOND", positionCode: "REAR_LEFT" });
    const result = evaluateInspection({ templateItems: [first, second], executionItems: [execution(first)], findings: [], accidentAssessments: [], confirmedComplete: true });
    expect(result.complete).toBe(true);
    expect(result.missing).toEqual([]);
    expect(result.circulationRecommendation).not.toBe("UNASSESSED");
  });
});
