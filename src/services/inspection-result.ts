export type InspectionFindingResultLike = {
  status?: string | null;
  label?: string | null;
  valueText?: string | null;
  criterion?: {
    label?: string | null;
    sortOrder?: number | null;
    hardStopCriterion?: boolean | null;
  } | null;
};

export type InspectionResultInput = {
  result?: string | null;
  resultStatus?: string | null;
  isAbnormal?: boolean | null;
  findings?: readonly InspectionFindingResultLike[] | null;
};

function normalizedText(value: string | null | undefined) {
  const text = value?.trim();
  return text || null;
}

function criterionResultLabel(criterion: InspectionFindingResultLike["criterion"]) {
  const label = normalizedText(criterion?.label);
  if (!label) return null;
  // The source workbook stores the full inspection instruction as SAFE_01's
  // label. Keep that instruction in the criterion card, but use a concise
  // result label in tables and reports.
  if (label.includes("胶套开裂") && label.includes("观察")) return "胶套开裂";
  return label;
}

/**
 * The finding criterion is the observable fact selected by the inspector.
 * Keep its order deterministic so every consumer sees the same result when
 * an item has more than one reached criterion.
 */
export function getReachedCriterionLabels(findings: readonly InspectionFindingResultLike[] | null | undefined) {
  if (!findings?.length) return [];

  return findings
    .map((finding, index) => ({ finding, index }))
    .filter(({ finding }) => finding.status === "REACHED")
    .sort((left, right) => {
      const leftOrder = left.finding.criterion?.sortOrder ?? Number.MAX_SAFE_INTEGER;
      const rightOrder = right.finding.criterion?.sortOrder ?? Number.MAX_SAFE_INTEGER;
      return leftOrder - rightOrder || left.index - right.index;
    })
    .map(({ finding }) => criterionResultLabel(finding.criterion) ?? criterionResultLabel({ label: finding.label }) ?? normalizedText(finding.label))
    .filter((label): label is string => Boolean(label))
    .filter((label, index, labels) => labels.indexOf(label) === index);
}

/**
 * Resolve the user-facing inspection result from the canonical status and
 * any selected criterion. A criterion can only override the item summary for
 * an abnormal item; blocked, normal and not-applicable states keep their own
 * status result.
 */
export function getInspectionResultLabel(input: InspectionResultInput) {
  const canUseReachedCriterion = input.resultStatus === "ABNORMAL"
    || (!input.resultStatus && input.isAbnormal === true);
  if (canUseReachedCriterion) {
    const reachedLabels = getReachedCriterionLabels(input.findings);
    if (reachedLabels.length) return reachedLabels.join("、");
  }

  return normalizedText(input.result);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function resultInputFromRecord(record: Record<string, unknown>): InspectionResultInput {
  return {
    result: typeof record.result === "string" ? record.result : null,
    resultStatus: typeof record.resultStatus === "string" ? record.resultStatus : null,
    isAbnormal: record.isAbnormal === true,
    findings: Array.isArray(record.findings) ? record.findings as InspectionFindingResultLike[] : [],
  };
}

/**
 * Normalize persisted report JSON at the API boundary as well. Older report
 * snapshots may predate the result/finding synchronization, so this keeps
 * historical reports readable without mutating their immutable snapshots.
 */
export function normalizeSnapshotFacts(snapshot: unknown, canonicalSnapshot?: unknown) {
  if (!isRecord(snapshot)) return snapshot;

  const canonicalFacts = isRecord(canonicalSnapshot) && Array.isArray(canonicalSnapshot.facts)
    ? canonicalSnapshot.facts.filter(isRecord)
    : [];
  const canonicalById = new Map(canonicalFacts.map((fact) => [typeof fact.id === "string" ? fact.id : "", fact]));

  const normalizeFact = (value: unknown) => {
    if (!isRecord(value)) return value;
    const id = typeof value.id === "string" ? value.id : "";
    const canonical = canonicalById.get(id);
    const canonicalResult = canonical
      ? getInspectionResultLabel(resultInputFromRecord(canonical))
      : null;
    const result = canonicalResult ?? getInspectionResultLabel(resultInputFromRecord(value));
    return result ? { ...value, result } : value;
  };

  return {
    ...snapshot,
    ...(Array.isArray(snapshot.facts) ? { facts: snapshot.facts.map(normalizeFact) } : {}),
    ...(Array.isArray(snapshot.highlights) ? { highlights: snapshot.highlights.map(normalizeFact) } : {}),
  };
}
