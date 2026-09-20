import { PrismaClient } from "@prisma/client";
import { TEMPLATE_SOURCE_MANIFEST } from "../prisma/template-catalog-loader";

const prisma = new PrismaClient();

class ValidationRollback extends Error {}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function templateCounts(code: string) {
  const where = { position: { section: { templateVersion: { template: { code } } } } };
  return {
    items: await prisma.inspectionCheckItem.count({ where }),
    criteria: await prisma.inspectionCriterion.count({ where: { checkItem: where } }),
    itemSources: await prisma.inspectionCheckItem.findMany({ where, select: { sourceSheet: true, sourceRow: true } }),
  };
}

async function verifyNullableCompositeUnique() {
  const inspection = await prisma.inspection.findFirst({ select: { id: true } });
  assert(inspection, "seed must provide an inspection for the nullable composite unique check");
  try {
    await prisma.$transaction(async (tx) => {
      const common = {
        inspectionId: inspection.id,
        checkItemId: null,
        positionId: null,
        zone: "VALIDATION",
        category: "VALIDATION",
        itemName: "nullable composite unique probe",
        result: "NORMAL",
        resultStatus: "NORMAL",
        isAbnormal: false,
        severity: 0,
        basePriority: 1,
        professionalDescription: "validation probe",
        consumerExplanation: "validation probe",
        futureRisk: "none",
        repairSuggestion: "none",
        estimatedRepairCost: 0,
      };
      await tx.inspectionItem.create({ data: common });
      await tx.inspectionItem.create({ data: common });
      const count = await tx.inspectionItem.count({ where: { inspectionId: inspection.id, zone: "VALIDATION" } });
      assert(count === 2, `nullable composite unique probe inserted ${count} rows instead of 2`);
      throw new ValidationRollback();
    });
  } catch (error) {
    if (!(error instanceof ValidationRollback)) throw error;
  }
}

async function verifyExecutionAlignment() {
  const items = await prisma.inspectionItem.findMany({
    where: { checkItemId: { not: null } },
    select: {
      id: true,
      itemName: true,
      category: true,
      zone: true,
      positionId: true,
      resultStatus: true,
      isAbnormal: true,
      findingMode: true,
      checkItem: {
        select: {
          id: true,
          name: true,
          category: true,
          positionId: true,
          position: { select: { code: true } },
          criteria: { where: { active: true }, select: { id: true } },
        },
      },
      findings: { where: { status: "REACHED" }, select: { criterion: { select: { checkItemId: true } } } },
    },
  });

  const sourceMismatches = items.filter((item) => {
    const source = item.checkItem;
    return !source
      || item.itemName !== source.name
      || item.category !== source.category
      || item.zone !== source.position.code
      || item.positionId !== source.positionId;
  });
  const statusMismatches = items.filter((item) => (item.resultStatus === "ABNORMAL" || item.resultStatus === "BLOCKED") !== item.isAbnormal);
  const criterionBackedAbnormalWithoutFinding = items.filter((item) => item.resultStatus === "ABNORMAL" && item.findingMode !== "DIRECT" && item.checkItem && item.checkItem.criteria.length > 0 && item.findings.length === 0);
  const nonAbnormalWithFinding = items.filter((item) => item.resultStatus !== "ABNORMAL" && item.findings.length > 0);
  const crossLinkedFindings = items.filter((item) => item.findings.some((finding) => finding.criterion.checkItemId !== item.checkItem?.id));
  const invalidDirectItems = items.filter((item) => item.findingMode === "DIRECT" && (item.resultStatus !== "ABNORMAL" || item.findings.length > 0));

  assert(sourceMismatches.length === 0, `execution item source fields drifted: ${JSON.stringify(sourceMismatches)}`);
  assert(statusMismatches.length === 0, `execution status flags drifted: ${JSON.stringify(statusMismatches)}`);
  assert(criterionBackedAbnormalWithoutFinding.length === 0, `criterion-backed abnormal items without reached findings: ${JSON.stringify(criterionBackedAbnormalWithoutFinding)}`);
  assert(nonAbnormalWithFinding.length === 0, `non-abnormal items retain reached findings: ${JSON.stringify(nonAbnormalWithFinding)}`);
  assert(crossLinkedFindings.length === 0, `findings are linked to another check item: ${JSON.stringify(crossLinkedFindings)}`);
  assert(invalidDirectItems.length === 0, `invalid DIRECT item exceptions: ${JSON.stringify(invalidDirectItems)}`);

  return {
    total: items.length,
    sourceMismatches: sourceMismatches.length,
    statusMismatches: statusMismatches.length,
    criterionBackedAbnormalWithoutFinding: criterionBackedAbnormalWithoutFinding.length,
    nonAbnormalWithFinding: nonAbnormalWithFinding.length,
    crossLinkedFindings: crossLinkedFindings.length,
    invalidDirectItems: invalidDirectItems.length,
  };
}

async function main() {
  assert(TEMPLATE_SOURCE_MANIFEST.totals.applicableSourceRows === 193, "source manifest row count drifted");
  assert(TEMPLATE_SOURCE_MANIFEST.totals.criteria === 751, "source manifest criterion count drifted");

  const standard = await templateCounts("STANDARD_VEHICLE");
  const newEnergy = await templateCounts("NEW_ENERGY_VEHICLE");
  assert(standard.items === 179 && standard.criteria === 710, `standard catalog mismatch: ${JSON.stringify(standard)}`);
  assert(newEnergy.items === 193 && newEnergy.criteria === 751, `new-energy catalog mismatch: ${JSON.stringify(newEnergy)}`);
  assert(standard.items + newEnergy.items === 372, "dual-template item total mismatch");
  assert(standard.criteria + newEnergy.criteria === 1461, "dual-template criterion total mismatch");
  assert(new Set(newEnergy.itemSources.map((item) => `${item.sourceSheet}:${item.sourceRow}`)).size === 193, "source row provenance is incomplete or duplicated");

  const [inspectionCount, standardSnapshots, reports, personalizedSnapshots, findings, assessments, evidence] = await Promise.all([
    prisma.inspection.count(),
    prisma.standardReportSnapshot.findMany({ select: { id: true, inspectionId: true, evaluationId: true, templateVersionId: true, snapshotJson: true } }),
    prisma.report.findMany({ select: { id: true, reportMode: true, standardReportSnapshotId: true, personalizedReportSnapshotId: true } }),
    prisma.personalizedReportSnapshot.findMany({ select: { id: true, standardReportSnapshotId: true } }),
    prisma.inspectionFinding.count(),
    prisma.inspectionAccidentAssessment.count(),
    prisma.inspectionEvidence.count(),
  ]);
  assert(inspectionCount === 6, `expected 6 inspections, got ${inspectionCount}`);
  assert(standardSnapshots.length === inspectionCount, "every seeded inspection must have one strict standard snapshot");
  assert(new Set(standardSnapshots.map((snapshot) => snapshot.inspectionId)).size === inspectionCount, "standard snapshots must cover distinct inspections");
  assert(standardSnapshots.every((snapshot) => snapshot.evaluationId && snapshot.templateVersionId), "standard snapshot lineage pointers must be non-null");
  assert(standardSnapshots.every((snapshot) => {
    const document = JSON.parse(snapshot.snapshotJson);
    return document.source.evaluationId === snapshot.evaluationId && document.source.templateVersionId === snapshot.templateVersionId;
  }), "standard snapshot JSON/evaluation/template lineage drifted");
  const standardIds = new Set(standardSnapshots.map((snapshot) => snapshot.id));
  const personalizedById = new Map(personalizedSnapshots.map((snapshot) => [snapshot.id, snapshot]));
  assert(reports.length === inspectionCount && reports.every((report) => report.standardReportSnapshotId && standardIds.has(report.standardReportSnapshotId)), "every seeded Report row must bridge to a standard snapshot");
  assert(personalizedSnapshots.length === inspectionCount, "every seeded sales case must have one personalized snapshot");
  assert(reports.filter((report) => report.reportMode === "PERSONALIZED").every((report) => {
    const personalized = report.personalizedReportSnapshotId ? personalizedById.get(report.personalizedReportSnapshotId) : undefined;
    return Boolean(personalized && personalized.standardReportSnapshotId === report.standardReportSnapshotId);
  }), "personalized reports must bridge to the same standard snapshot");
  const criterionBackedAbnormalWithoutFinding = await prisma.inspectionItem.count({
    where: {
      resultStatus: "ABNORMAL",
      findingMode: "CRITERION",
      checkItem: { criteria: { some: { active: true } } },
      findings: { none: { status: "REACHED" } },
    },
  });
  const statusFlagMismatches = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(`
    SELECT COUNT(*) AS count
    FROM "InspectionItem"
    WHERE ("resultStatus" IN ('ABNORMAL', 'BLOCKED') AND "isAbnormal" = 0)
       OR ("resultStatus" IN ('NORMAL', 'NOT_APPLICABLE', 'UNCHECKED') AND "isAbnormal" = 1)
  `);
  assert(findings === 9 && assessments === 2 && evidence === 5, "seed finding/evidence relational counts drifted");
  assert(criterionBackedAbnormalWithoutFinding === 0, `criterion-backed abnormal items without reached findings: ${criterionBackedAbnormalWithoutFinding}`);
  assert(Number(statusFlagMismatches[0]?.count ?? 0) === 0, "inspection resultStatus/isAbnormal flags drifted");
  assert(!(await prisma.riskTag.findUnique({ where: { code: "FIRE" } })), "fire must remain out of active seeded scope");

  const executionAlignment = await verifyExecutionAlignment();
  await verifyNullableCompositeUnique();

  console.log(JSON.stringify({
    source: { rows: 193, criteria: 751, activeRules: 3, excludedFireRows: 1 },
    catalog: { standardItems: standard.items, standardCriteria: standard.criteria, newEnergyItems: newEnergy.items, newEnergyCriteria: newEnergy.criteria, totalItems: 372, totalCriteria: 1461 },
    execution: { inspections: inspectionCount, findings, assessments, evidence, standardSnapshots: standardSnapshots.length, personalizedSnapshots: personalizedSnapshots.length, reports: reports.length, criterionBackedAbnormalWithoutFinding, statusFlagMismatches: Number(statusFlagMismatches[0]?.count ?? 0), alignment: executionAlignment },
    nullableCompositeUnique: "passed (two NULL checkItemId rows inserted and rolled back)",
  }, null, 2));
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => { await prisma.$disconnect(); });
