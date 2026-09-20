export const EXECUTION_STATUS_LABELS = {
  UNCHECKED: "未检",
  NORMAL: "正常",
  ABNORMAL: "异常",
  NOT_APPLICABLE: "不适用",
  BLOCKED: "无法检查",
} as const;

export type ExecutionStatus = keyof typeof EXECUTION_STATUS_LABELS;
export type AccidentClassification = "NONE" | "ORDINARY" | "MAJOR";

export type TemplateCriterionLike = {
  id: string;
  code: string;
  label: string;
  axis: string;
  criterionType: string;
  description?: string | null;
  ruleKey?: string | null;
  countsAsDistinctFloodFinding: boolean;
  hardStopCriterion: boolean;
  sortOrder: number;
};

export type TemplateItemLike = {
  id: string;
  code: string;
  name: string;
  category: string;
  componentClass: string;
  accidentDecisionParticipant: boolean;
  description?: string | null;
  sortOrder: number;
  position: {
    id: string;
    code: string;
    name: string;
    floodAggregationKey?: string | null;
  };
  section: {
    code: string;
    name: string;
    axis: string;
  };
  criteria: TemplateCriterionLike[];
};

export type ExecutionItemLike = {
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
  notes?: string | null;
};

export type FindingLike = {
  id: string;
  inspectionItemId: string;
  criterionId: string;
  status: string;
  valueText?: string | null;
  note?: string | null;
};

export type AccidentAssessmentLike = {
  findingId: string;
  classification: string;
  decisionParticipant: boolean;
  damageGroupId?: string | null;
};

export type CompletionCheck = {
  complete: boolean;
  missing: Array<{
    id: string;
    code: string;
    name: string;
    positionCode: string;
    positionName: string;
    sectionName: string;
  }>;
};

export type InspectionEvaluationResult = {
  complete: boolean;
  missing: CompletionCheck["missing"];
  legalTradeabilityStatus: "CLEAR" | "BLOCKED" | "UNASSESSED";
  hardStop: boolean;
  hardStopCode: string | null;
  accidentClassification: AccidentClassification | "UNASSESSED";
  floodStatus: "NONE" | "DETECTED" | "UNASSESSED";
  floodFindingCount: number;
  currentSafetyConclusion: "PASS" | "ISSUE_FOUND" | "UNASSESSED";
  functionConclusion: "PASS" | "ISSUE_FOUND" | "UNASSESSED";
  circulationRecommendation: "CIRCULATE" | "REPAIR_REVIEW" | "HOLD_FOR_REVIEW" | "STOPPED" | "UNASSESSED";
  recommendationReason: string;
  outcomes: Array<{
    code: string;
    axis: string;
    status: string;
    isBlocking: boolean;
    valueText?: string;
    reason: string;
    details?: Record<string, unknown>;
  }>;
};

const COMPLETE_STATUSES = new Set<ExecutionStatus>(["NORMAL", "ABNORMAL", "NOT_APPLICABLE", "BLOCKED"]);
const ACCIDENT_RANK: Record<AccidentClassification, number> = { NONE: 0, ORDINARY: 1, MAJOR: 2 };
const FLOOD_POSITION_CODES = ["FRONT_LEFT", "REAR_LEFT", "FRONT_RIGHT", "REAR_RIGHT"] as const;

type ActiveFinding = FindingLike & {
  criterion: TemplateCriterionLike;
  execution: ExecutionItemLike;
  templateItem: TemplateItemLike;
};

export function isCompleteExecutionStatus(status: string | null | undefined): status is Exclude<ExecutionStatus, "UNCHECKED"> {
  return Boolean(status && COMPLETE_STATUSES.has(status as ExecutionStatus));
}

export function getExecutionStatusLabel(status: string | null | undefined) {
  return EXECUTION_STATUS_LABELS[status as ExecutionStatus] ?? EXECUTION_STATUS_LABELS.UNCHECKED;
}

export function buildDefaultItemFields(item: TemplateItemLike, operatorName: string | null = null) {
  return {
    zone: item.position.code,
    category: item.category,
    itemName: item.name,
    result: EXECUTION_STATUS_LABELS.UNCHECKED,
    resultStatus: "UNCHECKED" as const,
    findingMode: "CRITERION" as const,
    isAbnormal: false,
    severity: 0,
    basePriority: item.accidentDecisionParticipant ? 5 : 1,
    professionalDescription: null,
    consumerExplanation: null,
    futureRisk: null,
    repairSuggestion: null,
    estimatedRepairCost: null,
    operatorName,
  };
}

export function checkInspectionCompletion(templateItems: TemplateItemLike[], executionItems: ExecutionItemLike[]): CompletionCheck {
  const executionByCheckItem = new Map(executionItems.filter((item) => item.checkItemId).map((item) => [item.checkItemId as string, item]));
  const missing = templateItems
    .filter((item) => !isCompleteExecutionStatus(executionByCheckItem.get(item.id)?.resultStatus))
    .map((item) => ({
      id: item.id,
      code: item.code,
      name: item.name,
      positionCode: item.position.code,
      positionName: item.position.name,
      sectionName: item.section.name,
    }));
  return { complete: missing.length === 0, missing };
}

function maxAccidentClassification(values: AccidentClassification[]) {
  return values.reduce<AccidentClassification>((current, value) => (ACCIDENT_RANK[value] > ACCIDENT_RANK[current] ? value : current), "NONE");
}

function isExcludedFireCriterion(criterion: TemplateCriterionLike) {
  const normalized = [criterion.code, criterion.label, criterion.axis, criterion.criterionType, criterion.ruleKey]
    .filter(Boolean)
    .join(" ")
    .toUpperCase();
  return criterion.criterionType === "FIRE_FINDING"
    || criterion.axis === "FIRE_DAMAGE"
    || criterion.ruleKey === "FIRE_DAMAGE"
    || normalized.includes("FIRE")
    || normalized.includes("火烧");
}

function getFloodEvaluation(findings: ActiveFinding[]) {
  const distinctFindingKeys = new Set<string>();
  const counts = new Map<(typeof FLOOD_POSITION_CODES)[number], number>();

  for (const finding of findings) {
    if (!finding.criterion.countsAsDistinctFloodFinding) continue;
    const positionCode = finding.templateItem.position.code;
    if (!(FLOOD_POSITION_CODES as readonly string[]).includes(positionCode)) continue;
    const key = `${positionCode}:${finding.inspectionItemId}:${finding.criterionId}`;
    if (distinctFindingKeys.has(key)) continue;
    distinctFindingKeys.add(key);
    counts.set(positionCode as (typeof FLOOD_POSITION_CODES)[number], (counts.get(positionCode as (typeof FLOOD_POSITION_CODES)[number]) ?? 0) + 1);
  }

  const countAt = (positionCode: (typeof FLOOD_POSITION_CODES)[number]) => counts.get(positionCode) ?? 0;
  const leftCount = countAt("FRONT_LEFT") + countAt("REAR_LEFT");
  const rightCount = countAt("FRONT_RIGHT") + countAt("REAR_RIGHT");
  const frontPairMatches = countAt("FRONT_LEFT") >= 3 && countAt("FRONT_RIGHT") >= 3;
  let threePositionMatches = false;

  for (let first = 0; first < FLOOD_POSITION_CODES.length; first += 1) {
    for (let second = first + 1; second < FLOOD_POSITION_CODES.length; second += 1) {
      for (let third = second + 1; third < FLOOD_POSITION_CODES.length; third += 1) {
        const selected = [FLOOD_POSITION_CODES[first], FLOOD_POSITION_CODES[second], FLOOD_POSITION_CODES[third]];
        const total = selected.reduce((sum, positionCode) => sum + countAt(positionCode), 0);
        const selectedLeft = selected.reduce((sum, positionCode) => sum + (positionCode.endsWith("LEFT") ? countAt(positionCode) : 0), 0);
        const selectedRight = selected.reduce((sum, positionCode) => sum + (positionCode.endsWith("RIGHT") ? countAt(positionCode) : 0), 0);
        if (total >= 5 && selectedLeft >= 2 && selectedRight >= 2) {
          threePositionMatches = true;
        }
      }
    }
  }

  return {
    distinctFindingKeys,
    counts: Object.fromEntries(FLOOD_POSITION_CODES.map((positionCode) => [positionCode, countAt(positionCode)])),
    leftCount,
    rightCount,
    matchedRule: frontPairMatches ? "FRONT_PAIR" : threePositionMatches ? "THREE_POSITIONS" : null,
    detected: frontPairMatches || threePositionMatches,
  };
}

function outcome(
  code: string,
  axis: string,
  status: string,
  reason: string,
  options: { isBlocking?: boolean; valueText?: string; details?: Record<string, unknown> } = {},
) {
  return {
    code,
    axis,
    status,
    isBlocking: options.isBlocking ?? false,
    valueText: options.valueText,
    reason,
    details: options.details,
  };
}

export function evaluateInspection(args: {
  templateItems: TemplateItemLike[];
  executionItems: ExecutionItemLike[];
  findings: Array<FindingLike & { criterion: TemplateCriterionLike }>;
  accidentAssessments: AccidentAssessmentLike[];
  requireComplete?: boolean;
  confirmedComplete?: boolean;
}): InspectionEvaluationResult {
  const completion = checkInspectionCompletion(args.templateItems, args.executionItems);
  const requireComplete = args.requireComplete ?? true;
  const complete = completion.complete || args.confirmedComplete === true;
  const executionById = new Map(args.executionItems.map((item) => [item.id, item]));
  const templateById = new Map(args.templateItems.map((item) => [item.id, item]));
  const findings: ActiveFinding[] = args.findings.flatMap((finding) => {
    if (finding.status !== "REACHED" || isExcludedFireCriterion(finding.criterion)) return [];
    const execution = executionById.get(finding.inspectionItemId);
    const templateItem = execution?.checkItemId ? templateById.get(execution.checkItemId) : undefined;
    const canonicalCriterion = templateItem?.criteria.find((criterion) => criterion.id === finding.criterionId);
    return execution && templateItem && canonicalCriterion ? [{ ...finding, criterion: canonicalCriterion, execution, templateItem }] : [];
  });
  const accidentAssessments = new Map(args.accidentAssessments.map((assessment) => [assessment.findingId, assessment]));

  const hardStopFinding = findings.find((finding) => finding.criterion.hardStopCriterion);
  const blockedItem = args.executionItems.find((item) => item.resultStatus === "BLOCKED" && item.checkItemId && templateById.has(item.checkItemId));
  const hardStop = Boolean(hardStopFinding || blockedItem);
  const hardStopCode = hardStopFinding?.criterion.code ?? (blockedItem?.checkItemId ? templateById.get(blockedItem.checkItemId)?.code ?? null : null);

  const accidentFindings = findings.filter((finding) => finding.criterion.criterionType === "ACCIDENT_DEFECT" && finding.templateItem.accidentDecisionParticipant);
  const accidentGroups = new Map<string, { positionCode: string; damageGroupId: string | null; findingIds: string[]; classification: AccidentClassification }>();
  for (const finding of accidentFindings) {
    const assessment = accidentAssessments.get(finding.id);
    if (!assessment?.decisionParticipant) continue;
    const classification = assessment.classification === "NONE" || assessment.classification === "ORDINARY" || assessment.classification === "MAJOR"
      ? assessment.classification
      : null;
    if (!classification) continue;
    const positionCode = finding.templateItem.position.code;
    // A damage-group id is only meaningful inside the position where it was confirmed.
    // This prevents unrelated positions from becoming one implicit accident bucket.
    const groupKey = `${positionCode}:${assessment.damageGroupId ?? finding.id}`;
    const existing = accidentGroups.get(groupKey);
    if (existing) {
      existing.findingIds.push(finding.id);
      existing.classification = maxAccidentClassification([existing.classification, classification]);
    } else {
      accidentGroups.set(groupKey, { positionCode, damageGroupId: assessment.damageGroupId ?? null, findingIds: [finding.id], classification });
    }
  }
  const accidentClassifications = [...accidentGroups.values()].map((group) => group.classification);
  const accidentClassification: InspectionEvaluationResult["accidentClassification"] = !complete && requireComplete
    ? "UNASSESSED"
    : maxAccidentClassification(accidentClassifications);

  const floodEvaluation = getFloodEvaluation(findings);
  const floodFindingCount = floodEvaluation.distinctFindingKeys.size;
  const floodStatus: InspectionEvaluationResult["floodStatus"] = !complete && requireComplete ? "UNASSESSED" : floodEvaluation.detected ? "DETECTED" : "NONE";

  const safetyFindings = findings.filter((finding) => finding.criterion.axis === "CURRENT_SAFETY" || finding.criterion.ruleKey === "CURRENT_SAFETY_GATE");
  const functionFindings = findings.filter((finding) => finding.criterion.axis === "CORE_FUNCTION" || finding.criterion.ruleKey === "CORE_FUNCTION_GATE");
  const currentSafetyConclusion: InspectionEvaluationResult["currentSafetyConclusion"] = !complete && requireComplete ? "UNASSESSED" : safetyFindings.length > 0 ? "ISSUE_FOUND" : "PASS";
  const functionConclusion: InspectionEvaluationResult["functionConclusion"] = !complete && requireComplete ? "UNASSESSED" : functionFindings.length > 0 ? "ISSUE_FOUND" : "PASS";
  const legalTradeabilityStatus: InspectionEvaluationResult["legalTradeabilityStatus"] = !complete && requireComplete ? "UNASSESSED" : hardStop ? "BLOCKED" : "CLEAR";

  let circulationRecommendation: InspectionEvaluationResult["circulationRecommendation"] = "UNASSESSED";
  if (complete || !requireComplete) {
    circulationRecommendation = hardStop || accidentClassification === "MAJOR" ? "STOPPED" : floodStatus === "DETECTED" || currentSafetyConclusion === "ISSUE_FOUND" ? "HOLD_FOR_REVIEW" : functionConclusion === "ISSUE_FOUND" || accidentClassification === "ORDINARY" ? "REPAIR_REVIEW" : "CIRCULATE";
  }

  const reasons = [
    hardStop ? `存在硬停止项${hardStopCode ? `（${hardStopCode}）` : ""}，禁止进入流通建议。` : "未触发法律可交易性硬停止。",
    accidentClassification === "UNASSESSED" ? "完整核验前不输出事故结论。" : `事故轴结论为${accidentClassification === "NONE" ? "无已确认事故缺陷" : accidentClassification === "ORDINARY" ? "普通事故复核" : "重大事故"}。`,
    floodStatus === "UNASSESSED" ? "完整核验前不输出水泡结论。" : floodStatus === "DETECTED" ? `记录到 ${floodFindingCount} 个彼此独立的水泡现象，满足${floodEvaluation.matchedRule === "FRONT_PAIR" ? "左右前方位" : "任意三个位置平衡"}规则。` : floodFindingCount > 0 ? `记录到 ${floodFindingCount} 个彼此独立的水泡现象，但尚未满足泡水车门槛。` : "未记录水泡现象。",
    currentSafetyConclusion === "ISSUE_FOUND" ? "当前安全轴存在达到的异常现象，需要复核。" : currentSafetyConclusion === "PASS" ? "当前安全轴未记录达到的异常现象。" : "完整核验前不输出当前安全结论。",
    functionConclusion === "ISSUE_FOUND" ? "核心功能轴存在达到的异常现象，需要维修评估。" : functionConclusion === "PASS" ? "核心功能轴未记录达到的异常现象。" : "完整核验前不输出核心功能结论。",
  ];

  const outcomes = [
    outcome("LEGAL_TRADEABILITY", "LEGAL_TRADEABILITY", legalTradeabilityStatus, reasons[0], { isBlocking: hardStop, valueText: legalTradeabilityStatus }),
    outcome("ACCIDENT_HISTORY", "ACCIDENT_HISTORY", accidentClassification, reasons[1], { valueText: accidentClassification, details: { participantFindings: accidentFindings.map((finding) => finding.id), damageGroups: [...accidentGroups.values()] } }),
    outcome("FLOOD_DAMAGE", "FLOOD_DAMAGE", floodStatus, reasons[2], { valueText: String(floodFindingCount), details: { distinctFindingKeys: [...floodEvaluation.distinctFindingKeys], countsByPosition: floodEvaluation.counts, leftCount: floodEvaluation.leftCount, rightCount: floodEvaluation.rightCount, matchedRule: floodEvaluation.matchedRule } }),
    outcome("CURRENT_SAFETY", "CURRENT_SAFETY", currentSafetyConclusion, reasons[3], { isBlocking: currentSafetyConclusion === "ISSUE_FOUND", details: { reachedFindingIds: safetyFindings.map((finding) => finding.id) } }),
    outcome("CORE_FUNCTION", "CORE_FUNCTION", functionConclusion, reasons[4], { details: { reachedFindingIds: functionFindings.map((finding) => finding.id) } }),
    outcome("DISCLOSURE", "DISCLOSURE", hardStop || accidentClassification !== "NONE" || floodFindingCount > 0 ? "REQUIRED" : "STANDARD", "标准报告必须完整披露事故、水泡、安全、功能和流通轴结论；个性化只调整解释顺序。"),
    outcome("REPAIR_ECONOMICS", "REPAIR_ECONOMICS", functionConclusion === "ISSUE_FOUND" || accidentClassification === "ORDINARY" ? "REVIEW_REQUIRED" : "LOW", functionConclusion === "ISSUE_FOUND" || accidentClassification === "ORDINARY" ? "存在需要结合维修成本复核的事实。" : "当前规则输入未形成明确维修经济性压力。"),
    outcome("CIRCULATION_RECOMMENDATION", "CIRCULATION", circulationRecommendation, complete || !requireComplete ? reasons.join(" ") : "仍有 " + completion.missing.length + " 个模板项未完成，暂不生成流通建议。", { isBlocking: circulationRecommendation === "STOPPED", valueText: circulationRecommendation }),
  ];

  return {
    complete,
    missing: args.confirmedComplete ? [] : completion.missing,
    legalTradeabilityStatus,
    hardStop,
    hardStopCode,
    accidentClassification,
    floodStatus,
    floodFindingCount,
    currentSafetyConclusion,
    functionConclusion,
    circulationRecommendation,
    recommendationReason: reasons.join(" "),
    outcomes,
  };
}
