import { describe, expect, it } from "vitest";
import { getInspectionResultLabel } from "@/services/inspection-result";

describe("inspection result normalization", () => {
  it("keeps the selected criterion and item result aligned", () => {
    expect(getInspectionResultLabel({
      result: "轻微变形",
      resultStatus: "ABNORMAL",
      isAbnormal: true,
      findings: [{ status: "REACHED", label: "凹陷≥3cm²" }],
    })).toBe("凹陷≥3cm²");
  });

  it("shortens the source instruction when a persisted report stores a flat label", () => {
    expect(getInspectionResultLabel({
      result: "胶套老化",
      resultStatus: "ABNORMAL",
      isAbnormal: true,
      findings: [{ status: "REACHED", label: "原地或行驶中打方向，观察胶套开裂" }],
    })).toBe("胶套开裂");
  });
});
