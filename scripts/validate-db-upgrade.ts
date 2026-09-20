import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function tableNames() {
  const rows = await prisma.$queryRawUnsafe<Array<{ name: string }>>("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name");
  return new Set(rows.map((row) => row.name));
}

async function appliedMigrations() {
  const rows = await prisma.$queryRawUnsafe<Array<{ migration_name: string }>>("SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL ORDER BY migration_name");
  return rows.map((row) => row.migration_name);
}

async function main() {
  const tables = await tableNames();
  for (const table of ["InspectionTemplate", "InspectionTemplateVersion", "InspectionCheckItem", "InspectionCriterion", "InspectionFinding", "InspectionEvidence", "InspectionEvaluation", "InspectionRuleOutcome", "StandardReportSnapshot", "PersonalizedReportSnapshot"]) {
    assert(tables.has(table), `missing upgraded table: ${table}`);
  }

  const migrations = await appliedMigrations();
  assert(migrations.includes("20260904091112_init"), "initial migration is not recorded as applied");
  assert(migrations.includes("20260905071612_appraisal_foundation"), "appraisal foundation migration is not recorded as applied");
  assert(migrations.includes("20260906124000_legacy_status_compatibility"), "legacy compatibility migration is not recorded as applied");
  assert(migrations.includes("20260912200000_align_inspection_facts"), "inspection fact alignment migration is not recorded as applied");
  assert(migrations.includes("20260912211500_add_vehicle_display_tags"), "vehicle display tags migration is not recorded as applied");

  const legacyMode = process.argv.includes("--expect-legacy");
  const [vehicles, inspections, items, reports, templates, templateVersions, evaluations, standardSnapshots, personalizedSnapshots] = await Promise.all([
    prisma.vehicle.count(),
    prisma.inspection.count(),
    prisma.inspectionItem.count(),
    prisma.report.count(),
    prisma.inspectionTemplate.count(),
    prisma.inspectionTemplateVersion.count(),
    prisma.inspectionEvaluation.count(),
    prisma.standardReportSnapshot.count(),
    prisma.personalizedReportSnapshot.count(),
  ]);

  if (legacyMode) {
    const legacyInspection = await prisma.inspection.findUnique({ where: { id: "legacy-inspection-001" }, select: { id: true, templateVersionId: true, items: { select: { id: true, checkItemId: true, positionId: true, result: true, resultStatus: true }, orderBy: { id: "asc" } } } });
    const legacyReport = await prisma.report.findUnique({ where: { id: "legacy-report-001" }, select: { id: true, standardReportSnapshotId: true, personalizedReportSnapshotId: true, generatedSnapshot: true } });
    assert(legacyInspection, "legacy inspection row was not preserved");
    assert(legacyInspection.templateVersionId === null, "legacy inspection unexpectedly acquired a template pointer");
    assert(legacyInspection.items.length === 3, `legacy inspection item count changed: ${legacyInspection.items.length}`);
    const statuses = new Map(legacyInspection.items.map((item) => [item.result, item.resultStatus]));
    assert(statuses.get("未检") === "UNCHECKED", `legacy 未检 mapping drifted: ${statuses.get("未检")}`);
    assert(statuses.get("正常") === "NORMAL", `legacy 正常 mapping drifted: ${statuses.get("正常")}`);
    assert(statuses.get("异常") === "ABNORMAL", `legacy 异常 mapping drifted: ${statuses.get("异常")}`);
    assert(legacyInspection.items.every((item) => item.checkItemId === null && item.positionId === null), "legacy execution pointers were not preserved as NULL");
    assert(legacyReport, "legacy report row was not preserved");
    assert(legacyReport.standardReportSnapshotId === null && legacyReport.personalizedReportSnapshotId === null, "legacy report pointers must remain nullable");
    assert(legacyReport.generatedSnapshot.length > 0, "legacy report snapshot was lost");
  }

  const nullableUniqueInspection = await prisma.inspection.findFirst({ select: { id: true } });
  assert(nullableUniqueInspection, "upgrade validation requires an inspection row");
  const duplicateNullRows = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(`SELECT COUNT(*) AS count FROM "InspectionItem" WHERE "inspectionId" = '${nullableUniqueInspection.id}' AND "checkItemId" IS NULL`);
  if (legacyMode) assert(Number(duplicateNullRows[0]?.count ?? 0) >= 3, "legacy nullable checkItemId rows were collapsed");

  console.log(JSON.stringify({
    databaseUrl: process.env.DATABASE_URL?.replace(/password=[^;]+/gi, "password=<redacted>"),
    migrations,
    tables: tables.size,
    counts: { vehicles, inspections, items, reports, templates, templateVersions, evaluations, standardSnapshots, personalizedSnapshots },
    mode: legacyMode ? "legacy-upgrade" : "schema-upgrade",
    nullableCompositeUnique: "verified by legacy NULL pointer preservation",
  }, null, 2));
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => { await prisma.$disconnect(); });
