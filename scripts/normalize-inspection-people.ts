import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import { REPORT_INSPECTOR_NAME, REPORT_REVIEWER_NAME } from "../src/config/report-people";

function loadDatabaseUrl() {
  if (process.env.DATABASE_URL) return;
  const envPath = resolve(process.cwd(), ".env");
  const line = readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .find((entry) => /^\s*(?:export\s+)?DATABASE_URL\s*=/.test(entry));
  if (!line) throw new Error(".env 中缺少 DATABASE_URL");
  const value = line.slice(line.indexOf("=") + 1).trim();
  process.env.DATABASE_URL = value.replace(/^(['"])(.*)\1$/, "$2");
}

loadDatabaseUrl();
const prisma = new PrismaClient();

const INSPECTOR_KEYS = new Set(["operatorName", "selectedBy", "capturedBy"]);
const REVIEWER_KEYS = new Set(["evaluatorName", "confirmedBy"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function normalizeJsonValue(value: unknown): { value: unknown; changed: boolean } {
  if (Array.isArray(value)) {
    let changed = false;
    const next = value.map((item) => {
      const normalized = normalizeJsonValue(item);
      changed ||= normalized.changed;
      return normalized.value;
    });
    return { value: next, changed };
  }
  if (!isRecord(value)) return { value, changed: false };

  let changed = false;
  const next: Record<string, unknown> = {};
  for (const [key, nestedValue] of Object.entries(value)) {
    if (key === "inspectorName" && nestedValue !== REPORT_INSPECTOR_NAME) {
      next[key] = REPORT_INSPECTOR_NAME;
      changed = true;
      continue;
    }
    if (key === "reviewerName" && typeof nestedValue === "string" && nestedValue !== REPORT_REVIEWER_NAME) {
      next[key] = REPORT_REVIEWER_NAME;
      changed = true;
      continue;
    }
    if (INSPECTOR_KEYS.has(key) && typeof nestedValue === "string" && nestedValue.trim() && nestedValue !== REPORT_INSPECTOR_NAME) {
      next[key] = REPORT_INSPECTOR_NAME;
      changed = true;
      continue;
    }
    if (REVIEWER_KEYS.has(key) && typeof nestedValue === "string" && nestedValue.trim() && nestedValue !== REPORT_REVIEWER_NAME) {
      next[key] = REPORT_REVIEWER_NAME;
      changed = true;
      continue;
    }
    const normalized = normalizeJsonValue(nestedValue);
    next[key] = normalized.value;
    changed ||= normalized.changed;
  }
  return { value: next, changed };
}

function normalizeSnapshotJson(raw: string) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  const normalized = normalizeJsonValue(parsed);
  if (!isRecord(normalized.value) || !isRecord(normalized.value.inspection)) {
    return normalized.changed ? JSON.stringify(normalized.value) : null;
  }

  const inspection = { ...normalized.value.inspection };
  let changed = normalized.changed;
  if (inspection.inspectorName !== REPORT_INSPECTOR_NAME) {
    inspection.inspectorName = REPORT_INSPECTOR_NAME;
    changed = true;
  }
  if ("reviewerName" in inspection && inspection.reviewerName !== REPORT_REVIEWER_NAME) {
    inspection.reviewerName = REPORT_REVIEWER_NAME;
    changed = true;
  }
  if (!changed) return null;
  return JSON.stringify({ ...normalized.value, inspection });
}

async function updateSnapshotRows(
  rows: Array<{ id: string; snapshotJson: string }>,
  update: (id: string, snapshotJson: string) => Promise<unknown>,
) {
  let updated = 0;
  for (const row of rows) {
    const snapshotJson = normalizeSnapshotJson(row.snapshotJson);
    if (!snapshotJson) continue;
    await update(row.id, snapshotJson);
    updated += 1;
  }
  return updated;
}

async function main() {
  const result = await prisma.$transaction(async (tx) => {
    const inspections = await tx.inspection.updateMany({ data: { inspectorName: REPORT_INSPECTOR_NAME, reviewerName: REPORT_REVIEWER_NAME } });
    const evaluations = await tx.inspectionEvaluation.updateMany({ data: { evaluatorName: REPORT_REVIEWER_NAME } });
    const items = await tx.inspectionItem.updateMany({ where: { operatorName: { not: null } }, data: { operatorName: REPORT_INSPECTOR_NAME } });
    const reviewedItems = await tx.inspectionItem.updateMany({ where: { reviewerName: { not: null } }, data: { reviewerName: REPORT_REVIEWER_NAME } });
    const findings = await tx.inspectionFinding.updateMany({ where: { selectedBy: { not: null } }, data: { selectedBy: REPORT_INSPECTOR_NAME } });
    const evidence = await tx.inspectionEvidence.updateMany({ where: { capturedBy: { not: null } }, data: { capturedBy: REPORT_INSPECTOR_NAME } });
    const damageGroups = await tx.inspectionDamageGroup.updateMany({ where: { confirmedBy: { not: null } }, data: { confirmedBy: REPORT_REVIEWER_NAME } });
    const assessments = await tx.inspectionAccidentAssessment.updateMany({ where: { confirmedBy: { not: null } }, data: { confirmedBy: REPORT_REVIEWER_NAME } });

    const standardRows = await tx.standardReportSnapshot.findMany({ select: { id: true, snapshotJson: true } });
    const standardSnapshots = await updateSnapshotRows(standardRows, (id, snapshotJson) => tx.standardReportSnapshot.update({ where: { id }, data: { snapshotJson } }));
    const personalizedRows = await tx.personalizedReportSnapshot.findMany({ select: { id: true, snapshotJson: true } });
    const personalizedSnapshots = await updateSnapshotRows(personalizedRows, (id, snapshotJson) => tx.personalizedReportSnapshot.update({ where: { id }, data: { snapshotJson } }));
    const reportRows = await tx.report.findMany({ select: { id: true, generatedSnapshot: true } });
    const reports = await updateSnapshotRows(reportRows.map((row) => ({ id: row.id, snapshotJson: row.generatedSnapshot })), (id, snapshotJson) => tx.report.update({ where: { id }, data: { generatedSnapshot: snapshotJson } }));

    return {
      inspections: inspections.count,
      evaluations: evaluations.count,
      items: items.count + reviewedItems.count,
      findings: findings.count,
      evidence: evidence.count,
      damageGroups: damageGroups.count,
      assessments: assessments.count,
      standardSnapshots,
      personalizedSnapshots,
      reports,
    };
  });

  console.log(`Inspection people normalized: ${JSON.stringify(result)}`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
