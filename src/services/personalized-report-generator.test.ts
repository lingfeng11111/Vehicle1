import { afterEach, describe, expect, it, vi } from "vitest";
import { generatePersonalizedReport } from "@/services/personalized-report-generator";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("generatePersonalizedReport", () => {
  it("falls back to the rule engine when DeepSeek is not configured", async () => {
    vi.stubEnv("DEEPSEEK_API_KEY", "");

    const result = await generatePersonalizedReport({
      customer: { id: "customer-1", name: "测试用户" },
      demand: { id: "demand-1", focusTags: "[\"SAFETY\"]", riskConcerns: "[]", budgetMin: 100000, budgetMax: 150000, usageScene: "家庭出行", remark: null },
      vehicle: { id: "vehicle-1", code: "V001", vin: "VIN", plateNo: "PLATE", brand: "示例品牌", series: "示例车系", model: "示例车型", modelYear: 2020, mileage: 50000, listingPrice: 140000 },
      inspection: { id: "inspection-1", version: 1, inspectionDate: "2026-09-12T00:00:00.000Z", inspectorName: "检查员", overallRiskLevel: "LOW", summary: "检查完成", items: [] },
      market: null,
      reportMode: "PERSONALIZED",
    });

    expect(result.generationMethod).toBe("RULE_ENGINE");
    expect(result.snapshot.generationMethod).toBe("RULE_ENGINE");
  });
});
