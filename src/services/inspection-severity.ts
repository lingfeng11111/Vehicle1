import type { InspectionFindingResultLike } from "@/services/inspection-result";

export const INSPECTION_SEVERITY_LABELS = ["正常", "轻微", "一般", "严重"] as const;

export type InspectionSeverity = 0 | 1 | 2 | 3;

export function clampInspectionSeverity(value: number | null | undefined): InspectionSeverity {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(3, Math.trunc(value as number))) as InspectionSeverity;
}

/**
 * Severity is an inspector-recorded assessment, not an AI guess. The resolver
 * only applies status floors and escalates a reached hard-stop criterion so
 * every read model and report uses the same conservative interpretation.
 */
export function resolveInspectionSeverity(args: {
  status?: string | null;
  storedSeverity?: number | null;
  findings?: readonly InspectionFindingResultLike[] | null;
}): InspectionSeverity {
  const status = args.status ?? "UNCHECKED";
  if (status === "NORMAL" || status === "NOT_APPLICABLE" || status === "UNCHECKED") return 0;

  const storedSeverity = clampInspectionSeverity(args.storedSeverity);
  if (status === "BLOCKED") return Math.max(storedSeverity, 3) as InspectionSeverity;

  if (status === "ABNORMAL") {
    const reachesHardStop = args.findings?.some(
      (finding) => finding.status === "REACHED" && finding.criterion?.hardStopCriterion === true,
    );
    return Math.max(storedSeverity, reachesHardStop ? 3 : 1) as InspectionSeverity;
  }

  return storedSeverity;
}

export function getInspectionSeverityLabel(value: number | null | undefined, zeroLabel = "正常") {
  const severity = clampInspectionSeverity(value);
  return severity === 0 ? zeroLabel : INSPECTION_SEVERITY_LABELS[severity];
}
