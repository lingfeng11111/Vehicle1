import { describe, expect, it } from "vitest";
import { buildReportSnapshot } from "@/services/report-generator";
import type { InspectionItemData } from "@/types/domain";

const items: InspectionItemData[] = [
  { id: "structure", zone: "FRONT_LEFT", category: "STRUCTURE", itemName: "左前纵梁", result: "轻微变形", isAbnormal: true, severity: 1, basePriority: 5, professionalDescription: "结构描述", consumerExplanation: "结构安全说明", futureRisk: "复检风险", repairSuggestion: "校正复核", estimatedRepairCost: 800 },
  { id: "engine", zone: "ENGINE", category: "POWERTRAIN", itemName: "发动机工况", result: "正常", isAbnormal: false, severity: 0, basePriority: 5, professionalDescription: "发动机描述", consumerExplanation: "发动机可靠性说明", futureRisk: "按期保养", repairSuggestion: "无需维修", estimatedRepairCost: 0 },
  { id: "chassis", zone: "CHASSIS", category: "CHASSIS", itemName: "底盘橡胶件", result: "耗损", isAbnormal: true, severity: 1, basePriority: 4, professionalDescription: "底盘描述", consumerExplanation: "后期维修成本说明", futureRisk: "可能异响", repairSuggestion: "纳入保养", estimatedRepairCost: 1800 },
];

const input = (focusTags: string, reportMode: "PERSONALIZED" | "STANDARD") => ({
  customer: { id: "customer", name: "演示客户" },
  demand: { id: "demand", focusTags, riskConcerns: "[]", budgetMin: 120000, budgetMax: 160000, usageScene: "通勤", remark: null },
  vehicle: { id: "vehicle", code: "V001", vin: "VIN", plateNo: "湘A·00001", brand: "丰田", series: "凯美瑞", model: "2019款 凯美瑞 2.5G", modelYear: 2019, mileage: 68620, listingPrice: 145000 },
  inspection: { id: "inspection", version: 1, inspectionDate: "2025-05-20T10:00:00.000Z", inspectorName: "张伟", overallRiskLevel: "MEDIUM", summary: "摘要", items },
  market: null,
  reportMode,
  generatedAt: "2025-05-20T10:30:00.000Z",
});

describe("buildReportSnapshot", () => {
  it("keeps standard mode ordering stable regardless of customer focus", () => {
    const safety = buildReportSnapshot(input('["SAFETY"]', "STANDARD"));
    const maintenance = buildReportSnapshot(input('["MAINTENANCE","RELIABILITY"]', "STANDARD"));
    expect(maintenance.reportMode).toBe("STANDARD");
    expect(safety.facts.map((item) => item.id)).toEqual(maintenance.facts.map((item) => item.id));
  });

  it("changes personalized emphasis while preserving the objective fact set", () => {
    const safety = buildReportSnapshot(input('["SAFETY","STRUCTURE"]', "PERSONALIZED"));
    const maintenance = buildReportSnapshot(input('["MAINTENANCE","RELIABILITY"]', "PERSONALIZED"));
    expect(safety.reportMode).toBe("PERSONALIZED");
    expect(safety.highlights[0]?.id).toBe("structure");
    expect(["engine", "chassis"]).toContain(maintenance.highlights[0]?.id);
    expect(safety.highlights.map((item) => item.id)).not.toEqual(maintenance.highlights.map((item) => item.id));
    const factFields = (snapshot: typeof safety) => snapshot.facts
      .map(({ id, zone, category, itemName, result, isAbnormal, severity, basePriority, professionalDescription, consumerExplanation, futureRisk, repairSuggestion, estimatedRepairCost }) => ({ id, zone, category, itemName, result, isAbnormal, severity, basePriority, professionalDescription, consumerExplanation, futureRisk, repairSuggestion, estimatedRepairCost }))
      .sort((a, b) => (a.id ?? "").localeCompare(b.id ?? ""));
    expect(factFields(safety)).toEqual(factFields(maintenance));
  });
});
