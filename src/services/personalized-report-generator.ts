import { buildReportSnapshot } from "@/services/report-generator";
import { generateDeepSeekReportNarrative } from "@/services/deepseek-report";
import type { ReportGenerationMethod } from "@/types/domain";

export type PersonalizedGenerationMethod = ReportGenerationMethod;
type ReportInput = Parameters<typeof buildReportSnapshot>[0];

export async function generatePersonalizedReport(input: ReportInput) {
  const baseSnapshot = buildReportSnapshot(input);
  if (baseSnapshot.reportMode !== "PERSONALIZED") {
    return { snapshot: { ...baseSnapshot, generationMethod: "RULE_ENGINE" as const }, generationMethod: "RULE_ENGINE" as const };
  }

  try {
    const narrative = await generateDeepSeekReportNarrative({ snapshot: baseSnapshot, decision: input.decision });
    return {
      snapshot: { ...baseSnapshot, ...narrative, generationMethod: "AI" as const },
      generationMethod: "AI" as const,
    };
  } catch (error) {
    // AI is an enhancement layer. A provider outage must not block report generation.
    if (process.env.NODE_ENV !== "test") {
      console.warn("[reports] DeepSeek narrative fallback", error instanceof Error ? error.message : "UNKNOWN_ERROR");
    }
  }

  return {
    snapshot: { ...baseSnapshot, generationMethod: "RULE_ENGINE" as const },
    generationMethod: "RULE_ENGINE" as PersonalizedGenerationMethod,
  };
}
