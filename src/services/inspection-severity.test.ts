import { describe, expect, it } from "vitest";
import { getInspectionSeverityLabel, resolveInspectionSeverity } from "@/services/inspection-severity";

describe("inspection severity", () => {
  it("keeps non-abnormal statuses at normal severity", () => {
    expect(resolveInspectionSeverity({ status: "NORMAL", storedSeverity: 3 })).toBe(0);
    expect(resolveInspectionSeverity({ status: "NOT_APPLICABLE", storedSeverity: 2 })).toBe(0);
    expect(resolveInspectionSeverity({ status: "UNCHECKED", storedSeverity: 1 })).toBe(0);
  });

  it("applies conservative floors for abnormal and blocked items", () => {
    expect(resolveInspectionSeverity({ status: "ABNORMAL", storedSeverity: 0 })).toBe(1);
    expect(resolveInspectionSeverity({ status: "ABNORMAL", storedSeverity: 2 })).toBe(2);
    expect(resolveInspectionSeverity({ status: "BLOCKED", storedSeverity: 0 })).toBe(3);
  });

  it("escalates an abnormal item when a reached criterion is a hard stop", () => {
    expect(resolveInspectionSeverity({
      status: "ABNORMAL",
      storedSeverity: 1,
      findings: [{ status: "REACHED", criterion: { hardStopCriterion: true } }],
    })).toBe(3);
  });

  it("uses one display label mapping for every consumer", () => {
    expect(getInspectionSeverityLabel(0)).toBe("正常");
    expect(getInspectionSeverityLabel(1)).toBe("轻微");
    expect(getInspectionSeverityLabel(3)).toBe("严重");
    expect(getInspectionSeverityLabel(null, "—")).toBe("—");
  });
});
