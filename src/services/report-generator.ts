import { FOCUS_RULES, getFocusLabel } from "@/config/report-rules";
import { FEATURE_FLAGS } from "@/config/feature-flags";
import { REPORT_INSPECTOR_NAME } from "@/config/report-people";
import { getInspectionResultLabel } from "@/services/inspection-result";
import type { FocusCode, InspectionItemData, ReportDecisionContext, ReportSnapshot } from "@/types/domain";

export type ReportInput = {
  customer: { id: string; name: string };
  demand: { id: string; focusTags: string; riskConcerns: string; budgetMin: number | null; budgetMax: number | null; usageScene: string; remark: string | null };
  vehicle: ReportSnapshot["vehicle"];
  inspection: ReportSnapshot["inspection"] & { items: InspectionItemData[] };
  market: ReportSnapshot["market"];
  reportMode: ReportSnapshot["reportMode"];
  decision?: ReportDecisionContext;
  generatedAt?: string;
};

function parseList(value: string) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function scoreItem(item: InspectionItemData, focuses: string[]) {
  const focusBonus = focuses.reduce((score, focus) => {
    const rule = FOCUS_RULES[focus as FocusCode];
    if (!rule) return score;
    const matchesCategory = rule.categories.includes(item.category);
    const matchesKeyword = rule.keywords.some((keyword) => item.itemName.includes(keyword) || (item.consumerExplanation ?? "").includes(keyword));
    return score + (matchesCategory || matchesKeyword ? rule.bonus : 0);
  }, 0);
  return item.basePriority + item.severity * 2 + focusBonus;
}

export function buildReportSnapshot(input: ReportInput): ReportSnapshot {
  const focusTags = parseList(input.demand.focusTags);
  const riskConcerns = parseList(input.demand.riskConcerns);
  const personalized = input.reportMode === "PERSONALIZED" && FEATURE_FLAGS.ENABLE_PERSONALIZED_REPORT;
  const rankedItems = input.inspection.items
    .map((item) => ({
      ...item,
      isAbnormal: item.resultStatus === "ABNORMAL" || item.resultStatus === "BLOCKED",
      result: getInspectionResultLabel({
        result: item.result,
        resultStatus: item.resultStatus,
        isAbnormal: item.resultStatus === "ABNORMAL" || item.resultStatus === "BLOCKED",
        findings: item.findings,
      }) ?? item.result,
    }))
    .sort((a, b) => (personalized ? scoreItem(b, focusTags) - scoreItem(a, focusTags) : scoreItem(b, [] ) - scoreItem(a, [])));
  const highlights = rankedItems.slice(0, 4);
  const focusLabels = focusTags.map(getFocusLabel).join("、") || "整体车况";
  const safetyFirst = focusTags.some((focus) => focus === "SAFETY" || focus === "STRUCTURE");
  const maintenanceFirst = focusTags.some((focus) => focus === "MAINTENANCE" || focus === "RELIABILITY");
  const firstAbnormal = rankedItems.find((item) => item.isAbnormal);
  const explanation = !personalized
    ? "这份报告展示车辆鉴定结果，帮助您了解车况和购买风险。"
    : safetyFirst
    ? `根据您关注的【${focusLabels}】，报告重点整理了${firstAbnormal?.itemName ?? "车身结构和安全相关项目"}的检查结果，方便您判断可能的使用影响。`
    : maintenanceFirst
      ? `根据您关注的【${focusLabels}】，报告重点整理了主要机械部件和损耗情况${firstAbnormal?.itemName ? `，请重点留意${firstAbnormal.itemName}` : ""}。购买前建议确认维修安排，并预留后续费用。`
      : `报告已根据您关注的【${focusLabels}】整理车辆鉴定结果，帮助您快速了解与购车需求相关的重点。`;

  return {
    snapshotVersion: "0.1.0",
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    reportMode: personalized ? "PERSONALIZED" : "STANDARD",
    customer: { id: input.customer.id, name: input.customer.name, focusTags, usageScene: input.demand.usageScene },
    demand: { id: input.demand.id, focusTags, riskConcerns, budgetMin: input.demand.budgetMin, budgetMax: input.demand.budgetMax, remark: input.demand.remark },
    vehicle: input.vehicle,
    inspection: { id: input.inspection.id, version: input.inspection.version, inspectionDate: input.inspection.inspectionDate, inspectorName: REPORT_INSPECTOR_NAME, overallRiskLevel: input.inspection.overallRiskLevel, summary: input.inspection.summary },
    market: input.market,
    highlights,
    facts: rankedItems,
    explanation,
    disclaimer: "本报告根据现场检查结果和市场参考信息整理，用于了解车况与购车风险；实际购买前请现场看车、试驾并以合同为准。",
  };
}

export function getDisplayPriority(item: InspectionItemData, focusTags: string[], reportMode: ReportSnapshot["reportMode"] = "PERSONALIZED") {
  return scoreItem(item, reportMode === "PERSONALIZED" && FEATURE_FLAGS.ENABLE_PERSONALIZED_REPORT ? focusTags : []);
}
