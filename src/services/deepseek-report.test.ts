import { afterEach, describe, expect, it, vi } from "vitest";
import { generateDeepSeekReportNarrative } from "@/services/deepseek-report";
import type { ReportSnapshot } from "@/types/domain";

const snapshot: ReportSnapshot = {
  snapshotVersion: "0.1.0",
  generatedAt: "2026-09-12T00:00:00.000Z",
  reportMode: "PERSONALIZED",
  customer: { id: "customer-1", name: "测试用户", focusTags: ["SAFETY"], usageScene: "家庭出行" },
  demand: { id: "demand-1", focusTags: ["SAFETY"], riskConcerns: ["重大事故"], budgetMin: 120000, budgetMax: 160000, remark: "希望安全边界清楚。" },
  vehicle: { id: "vehicle-1", code: "V001", vin: "SECRET-VIN", plateNo: "SECRET-PLATE", brand: "示例品牌", series: "示例车系", model: "示例车型", modelYear: 2020, mileage: 50000, listingPrice: 140000 },
  inspection: { id: "inspection-1", version: 2, inspectionDate: "2026-09-11T00:00:00.000Z", inspectorName: "检查员", overallRiskLevel: "LOW", summary: "结构检查未见重大异常。" },
  market: null,
  highlights: [],
  facts: [{ id: "fact-1", resultStatus: "ABNORMAL", zone: "前部", category: "STRUCTURE", itemName: "左前翼子板", result: "补漆", isAbnormal: true, severity: 1, basePriority: 2, professionalDescription: "存在补漆痕迹。", consumerExplanation: "属于外观修复。", futureRisk: null, repairSuggestion: "按外观需求处理。", estimatedRepairCost: 600 }],
  explanation: "规则引擎说明",
  disclaimer: "购买前请现场确认。",
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("generateDeepSeekReportNarrative", () => {
  it("calls the OpenAI-compatible endpoint and keeps sensitive vehicle identifiers out of the prompt", async () => {
    vi.stubEnv("DEEPSEEK_API_KEY", "test-key");
    vi.stubEnv("DEEPSEEK_MODEL", "deepseek-v4-flash");
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      choices: [{ message: { content: JSON.stringify({ fit: "适合重视安全的家庭用户。", recommendation: "购买前继续核对现场资料。", explanation: "外观项存在补漆，当前信息未指向结构异常。" }) } }],
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await generateDeepSeekReportNarrative({ snapshot });
    expect(result.fit).toContain("家庭用户");

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.deepseek.com/chat/completions");
    expect(init.method).toBe("POST");
    const body = JSON.parse(String(init.body)) as { model: string; response_format: { type: string }; thinking: { type: string }; messages: Array<{ content: string }> };
    expect(body.model).toBe("deepseek-v4-flash");
    expect(body.response_format).toEqual({ type: "json_object" });
    expect(body.thinking).toEqual({ type: "disabled" });
    expect(body.messages[0]?.content).toContain("JSON");
    expect(body.messages[1]?.content).not.toContain("SECRET-VIN");
    expect(body.messages[1]?.content).not.toContain("SECRET-PLATE");
  });

  it("fails closed when no API key is configured", async () => {
    await expect(generateDeepSeekReportNarrative({ snapshot })).rejects.toThrow("MISSING_API_KEY");
  });
});
