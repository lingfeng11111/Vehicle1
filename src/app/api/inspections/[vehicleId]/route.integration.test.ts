import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { TEMPLATE_DEFINITIONS, type TemplateDefinitionSeed } from "../../../../../prisma/template-catalog-loader";

const projectRoot = process.cwd();
const testDirectory = mkdtempSync(path.join(os.tmpdir(), "vehicle-inspection-api-"));
const testDatabasePath = path.join(testDirectory, "test.db");
const testDatabaseUrl = `file:${testDatabasePath}`;
process.env.DATABASE_URL = testDatabaseUrl;

type RouteModule = typeof import("./route");
type TemplateItem = {
  id: string;
  name: string;
  category: string;
  description: string | null;
  accidentDecisionParticipant: boolean;
  position: { id: string; code: string };
  criteria: Array<{ id: string; label: string; criterionType: string; hardStopCriterion: boolean }>;
};

let route: Pick<RouteModule, "GET" | "PATCH" | "POST">;
let testDb!: PrismaClient;
let templateVersionId!: string;
let templateItems!: TemplateItem[];
let testCounter = 0;

async function createTemplate(definition: TemplateDefinitionSeed) {
  const template = await testDb.inspectionTemplate.create({
    data: {
      code: definition.code,
      name: definition.name,
      description: definition.description,
      energyTypeScope: definition.energyTypeScope,
      versions: {
        create: {
          version: 1,
          status: "PUBLISHED",
          effectiveFrom: new Date("2025-05-01T00:00:00.000Z"),
          sections: {
            create: definition.sections.map((section, sectionIndex) => ({
              code: section.code,
              name: section.name,
              axis: section.axis,
              description: section.description,
              sortOrder: sectionIndex,
              positions: {
                create: section.positions.map((position, positionIndex) => ({
                  code: position.code,
                  name: position.name,
                  side: position.side,
                  floodAggregationKey: position.floodAggregationKey,
                  sortOrder: positionIndex,
                  checkItems: {
                    create: position.checkItems.map((item, itemIndex) => ({
                      code: item.code,
                      name: item.name,
                      category: item.category,
                      description: item.description,
                      componentClass: item.componentClass,
                      accidentDecisionParticipant: item.accidentDecisionParticipant,
                      sortOrder: itemIndex,
                      sourceSheet: item.sourceSheet,
                      sourceRow: item.sourceRow,
                      sourceSection: item.sourceSection,
                      sourceText: item.sourceText,
                      criteria: {
                        create: item.criteria.map((criterion, criterionIndex) => ({
                          code: criterion.code,
                          label: criterion.label,
                          axis: criterion.axis,
                          criterionType: criterion.criterionType,
                          description: criterion.description,
                          ruleKey: criterion.ruleKey,
                          countsAsDistinctFloodFinding: criterion.countsAsDistinctFloodFinding,
                          hardStopCriterion: criterion.hardStopCriterion,
                          sortOrder: criterionIndex,
                          sourceSheet: criterion.sourceSheet,
                          sourceRow: criterion.sourceRow,
                          sourceColumn: criterion.sourceColumn,
                          sourcePartIndex: criterion.sourcePartIndex,
                          sourceText: criterion.sourceText,
                          sourceNote: criterion.sourceNote,
                        })),
                      },
                    })),
                  },
                })),
              },
            })),
          },
        },
      },
    },
    include: { versions: true },
  });
  const version = template.versions[0];
  if (!version) throw new Error("test template version was not created");
  return testDb.inspectionTemplateVersion.findUniqueOrThrow({
    where: { id: version.id },
    include: {
      sections: {
        orderBy: { sortOrder: "asc" },
        include: {
          positions: {
            orderBy: { sortOrder: "asc" },
            include: {
              checkItems: {
                orderBy: { sortOrder: "asc" },
                include: { criteria: { orderBy: { sortOrder: "asc" } } },
              },
            },
          },
        },
      },
    },
  });
}

async function createFixture(options: { complete?: boolean } = {}) {
  testCounter += 1;
  const suffix = String(testCounter).padStart(3, "0");
  const vehicle = await testDb.vehicle.create({
    data: {
      id: `test-vehicle-${suffix}`,
      code: `TEST-${suffix}`,
      vin: `TESTVIN${suffix}000000000000000`,
      plateNo: `测A·${suffix}`,
      brand: "测试",
      series: "鉴定",
      model: "API 测试车",
      modelYear: 2022,
      registrationDate: new Date("2022-01-01T00:00:00.000Z"),
      mileage: 10000,
      listingPrice: 100000,
      energyType: "ICE",
    },
  });
  const inspection = await testDb.inspection.create({
    data: {
      id: `test-inspection-${suffix}`,
      vehicleId: vehicle.id,
      templateVersionId,
      version: 1,
      inspectionDate: new Date("2026-09-05T00:00:00.000Z"),
      inspectorName: "测试员",
      overallRiskLevel: "UNASSESSED",
      summary: "测试鉴定尚未完成。",
      status: "DRAFT",
    },
  });

  if (options.complete) {
    await testDb.inspectionItem.createMany({
      data: templateItems.map((item, itemIndex) => ({
        id: `${inspection.id}-item-${itemIndex}`,
        inspectionId: inspection.id,
        checkItemId: item.id,
        positionId: item.position.id,
        zone: item.position.code,
        category: item.category,
        itemName: item.name,
        result: "正常",
        resultStatus: "NORMAL",
        isAbnormal: false,
        severity: 0,
        basePriority: item.accidentDecisionParticipant ? 5 : 1,
        professionalDescription: item.description ?? "测试现场核验记录。",
        consumerExplanation: "测试消费者解释。",
        futureRisk: "测试后续风险。",
        repairSuggestion: "无需维修。",
        estimatedRepairCost: null,
        operatorName: "测试员",
        checkedAt: new Date("2026-09-05T00:00:00.000Z"),
      })),
    });
  }

  return { vehicle, inspection };
}

function request(body: unknown) {
  return new Request("http://localhost/api/inspections/TEST", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function postRequest() {
  return new Request("http://localhost/api/inspections/TEST", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "EVALUATE", evaluatorName: "评估员" }),
  });
}

function context(vehicleId: string) {
  return { params: Promise.resolve({ vehicleId }) };
}

async function responseJson(response: Response) {
  return response.json() as Promise<Record<string, unknown>>;
}

describe("inspection route", () => {
  beforeAll(async () => {
    const migrationSql = [
      "prisma/migrations/20260904091112_init/migration.sql",
      "prisma/migrations/20260905071612_appraisal_foundation/migration.sql",
      "prisma/migrations/20260912093632_make_inspection_texts_nullable/migration.sql",
      "prisma/migrations/20260912200000_align_inspection_facts/migration.sql",
      "prisma/migrations/20260912211500_add_vehicle_display_tags/migration.sql",
    ].map((file) => readFileSync(path.join(projectRoot, file), "utf8")).join("\n");
    execFileSync("sqlite3", [testDatabasePath], { cwd: projectRoot, input: `${migrationSql}\nPRAGMA foreign_keys = ON;` });
    testDb = new PrismaClient({ datasources: { db: { url: testDatabaseUrl } } });
    await testDb.$connect();

    const templateVersion = await createTemplate(TEMPLATE_DEFINITIONS.standard);
    templateVersionId = templateVersion.id;
    templateItems = templateVersion.sections.flatMap((section) => section.positions.flatMap((position) => position.checkItems.map((item) => ({
      id: item.id,
      name: item.name,
      category: item.category,
      description: item.description,
      accidentDecisionParticipant: item.accidentDecisionParticipant,
      position: { id: position.id, code: position.code },
      criteria: item.criteria.map((criterion) => ({ id: criterion.id, label: criterion.label, criterionType: criterion.criterionType, hardStopCriterion: criterion.hardStopCriterion })),
    }))));
    await testDb.appraisalRuleSet.create({
      data: {
        code: "TEST_BASELINE",
        name: "测试基线规则",
        versions: { create: { version: 1, status: "PUBLISHED", configJson: "{}", effectiveFrom: new Date("2025-05-01T00:00:00.000Z") } },
      },
    });
    route = await import("./route");
  });

  afterAll(async () => {
    const routeDb = (globalThis as typeof globalThis & { prisma?: PrismaClient }).prisma;
    await routeDb?.$disconnect();
    await testDb?.$disconnect();
    rmSync(testDirectory, { recursive: true, force: true });
  });

  it("returns the complete current catalog with sparse execution", async () => {
    const fixture = await createFixture();
    const response = await route.GET(new Request("http://localhost/api/inspections/TEST"), context(fixture.vehicle.code));
    expect(response.status).toBe(200);
    const body = await responseJson(response) as unknown as {
      template: { sections: Array<{ positions: Array<{ checkItems: Array<{ criteria: unknown[] }> }> }> };
      inspection: { items: unknown[] };
      progress: { total: number; checked: number; complete: boolean };
    };
    const catalogItems = body.template.sections.flatMap((section) => section.positions.flatMap((position) => position.checkItems));
    const catalogCriteria = catalogItems.reduce((count, item) => count + item.criteria.length, 0);
    expect(catalogItems).toHaveLength(179);
    expect(catalogCriteria).toBe(710);
    expect(body.inspection.items).toHaveLength(0);
    expect(body.progress).toMatchObject({ total: 179, checked: 0, complete: false });
  });

  it("upserts execution, records reached findings, and persists a plain NORMAL result", async () => {
    const fixture = await createFixture();
    const item = templateItems[0];
    const criterion = item.criteria[0];
    if (!item || !criterion) throw new Error("test catalog is empty");

    const abnormalResponse = await route.PATCH(request({
      checkItemId: item.id,
      resultStatus: "ABNORMAL",
      result: "异常",
      status: "IN_PROGRESS",
      findingUpdates: [{ criterionId: criterion.id, status: "REACHED", valueText: "测试达到" }],
    }), context(fixture.vehicle.code));
    expect(abnormalResponse.status).toBe(200);
    expect(await testDb.inspectionItem.count({ where: { inspectionId: fixture.inspection.id } })).toBe(1);
    expect(await testDb.inspectionFinding.count({ where: { inspectionItem: { inspectionId: fixture.inspection.id }, status: "REACHED" } })).toBe(1);
    expect((await testDb.inspectionItem.findFirstOrThrow({ where: { inspectionId: fixture.inspection.id } })).result).toBe(criterion.label);
    expect((await testDb.inspection.findUniqueOrThrow({ where: { id: fixture.inspection.id } })).status).toBe("IN_PROGRESS");

    const normalResponse = await route.PATCH(request({ itemId: (await testDb.inspectionItem.findFirstOrThrow({ where: { inspectionId: fixture.inspection.id } })).id, resultStatus: "NORMAL" }), context(fixture.vehicle.code));
    expect(normalResponse.status).toBe(200);
    const normalItem = await testDb.inspectionItem.findFirstOrThrow({ where: { inspectionId: fixture.inspection.id } });
    expect(normalItem.resultStatus).toBe("NORMAL");
    expect(normalItem.result).toBe("正常");
  });

  it("confirms a sparse inspection and snapshots the full standard catalog", async () => {
    const fixture = await createFixture();
    const item = templateItems[0];
    if (!item) throw new Error("test catalog is empty");

    const response = await route.PATCH(request({ checkItemId: item.id, resultStatus: "NORMAL", status: "COMPLETED", evidence: { uri: "test://should-rollback" } }), context(fixture.vehicle.code));
    expect(response.status).toBe(200);
    expect(await testDb.inspectionItem.count({ where: { inspectionId: fixture.inspection.id } })).toBe(1);
    expect(await testDb.inspectionEvidence.count({ where: { inspectionId: fixture.inspection.id } })).toBe(1);
    expect(await testDb.inspectionEvaluation.count({ where: { inspectionId: fixture.inspection.id } })).toBe(1);
    const snapshot = await testDb.standardReportSnapshot.findFirstOrThrow({ where: { inspectionId: fixture.inspection.id } });
    expect(JSON.parse(snapshot.snapshotJson).facts).toHaveLength(179);
    expect((await testDb.inspection.findUniqueOrThrow({ where: { id: fixture.inspection.id } })).status).toBe("COMPLETED");
  });

  it("persists NORMAL notes and keeps the explicit result when notes are cleared", async () => {
    const fixture = await createFixture();
    const item = templateItems[0];
    if (!item) throw new Error("test catalog is empty");

    const specialNormal = await route.PATCH(request({ checkItemId: item.id, resultStatus: "NORMAL", notes: "现场无异常，但记录了复核说明。" }), context(fixture.vehicle.code));
    expect(specialNormal.status).toBe(200);
    const execution = await testDb.inspectionItem.findFirstOrThrow({ where: { inspectionId: fixture.inspection.id } });
    expect(execution.resultStatus).toBe("NORMAL");
    expect(execution.notes).toBe("现场无异常，但记录了复核说明。");

    const cleared = await route.PATCH(request({ itemId: execution.id, resultStatus: "NORMAL", notes: null }), context(fixture.vehicle.code));
    expect(cleared.status).toBe(200);
    const clearedExecution = await testDb.inspectionItem.findFirstOrThrow({ where: { inspectionId: fixture.inspection.id } });
    expect(clearedExecution.resultStatus).toBe("NORMAL");
    expect(clearedExecution.notes).toBeNull();
  });

  it("clears abnormal analysis fields when an item is changed to a non-abnormal status", async () => {
    const fixture = await createFixture();
    const item = templateItems.find((candidate) => candidate.criteria.some((criterion) => !criterion.hardStopCriterion));
    const criterion = item?.criteria.find((candidate) => !candidate.hardStopCriterion);
    if (!item || !criterion) throw new Error("test catalog is empty");

    const abnormal = await route.PATCH(request({
      checkItemId: item.id,
      resultStatus: "ABNORMAL",
      professionalDescription: "现场缺陷事实",
      consumerExplanation: "需要关注使用影响",
      futureRisk: "可能继续扩大",
      repairSuggestion: "建议安排维修",
      estimatedRepairCost: 1200,
      findingUpdates: [{ criterionId: criterion.id, status: "REACHED" }],
    }), context(fixture.vehicle.code));
    expect(abnormal.status).toBe(200);

    const normal = await route.PATCH(request({ checkItemId: item.id, resultStatus: "NORMAL", notes: "现场复核正常" }), context(fixture.vehicle.code));
    expect(normal.status).toBe(200);
    const execution = await testDb.inspectionItem.findFirstOrThrow({ where: { inspectionId: fixture.inspection.id } });
    expect(execution).toMatchObject({ resultStatus: "NORMAL", isAbnormal: false, severity: 0, professionalDescription: null, consumerExplanation: null, futureRisk: null, repairSuggestion: null, estimatedRepairCost: null, notes: "现场复核正常" });
    expect(await testDb.inspectionFinding.count({ where: { inspectionItemId: execution.id } })).toBe(0);
  });

  it("keeps blocked and not-applicable criterion markers without abnormal analysis", async () => {
    const fixture = await createFixture();
    const item = templateItems[0];
    const criterion = item?.criteria[0];
    if (!item || !criterion) throw new Error("test catalog is empty");

    expect((await route.PATCH(request({
      checkItemId: item.id,
      resultStatus: "ABNORMAL",
      professionalDescription: "异常事实",
      consumerExplanation: "异常解读",
      findingUpdates: [{ criterionId: criterion.id, status: "REACHED" }],
    }), context(fixture.vehicle.code))).status).toBe(200);

    expect((await route.PATCH(request({
      checkItemId: item.id,
      resultStatus: "BLOCKED",
      findingUpdates: [{ criterionId: criterion.id, status: "BLOCKED" }],
    }), context(fixture.vehicle.code))).status).toBe(200);
    let execution = await testDb.inspectionItem.findFirstOrThrow({ where: { inspectionId: fixture.inspection.id } });
    expect(execution).toMatchObject({ resultStatus: "BLOCKED", isAbnormal: true, professionalDescription: null, consumerExplanation: null });
    expect((await testDb.inspectionFinding.findFirstOrThrow({ where: { inspectionItemId: execution.id } })).status).toBe("BLOCKED");

    expect((await route.PATCH(request({
      checkItemId: item.id,
      resultStatus: "NOT_APPLICABLE",
      findingUpdates: [{ criterionId: criterion.id, status: "NOT_APPLICABLE" }],
    }), context(fixture.vehicle.code))).status).toBe(200);
    execution = await testDb.inspectionItem.findFirstOrThrow({ where: { inspectionId: fixture.inspection.id } });
    expect(execution).toMatchObject({ resultStatus: "NOT_APPLICABLE", isAbnormal: false, severity: 0, professionalDescription: null, consumerExplanation: null });
    expect((await testDb.inspectionFinding.findFirstOrThrow({ where: { inspectionItemId: execution.id } })).status).toBe("NOT_APPLICABLE");
  });

  it("confirms the remaining inspection with an operator name", async () => {
    const fixture = await createFixture();

    const response = await route.PATCH(request({ status: "COMPLETED", operatorName: "测试检验员" }), context(fixture.vehicle.code));

    expect(response.status).toBe(200);
    expect((await testDb.inspection.findUniqueOrThrow({ where: { id: fixture.inspection.id } })).status).toBe("COMPLETED");
    expect(await testDb.inspectionEvaluation.count({ where: { inspectionId: fixture.inspection.id } })).toBe(1);
  });

  it("reopens a completed inspection when an explicit result is edited", async () => {
    const fixture = await createFixture();
    const item = templateItems.find((candidate) => candidate.criteria.some((criterion) => !criterion.hardStopCriterion));
    const criterion = item?.criteria.find((candidate) => !candidate.hardStopCriterion);
    if (!item || !criterion) throw new Error("test catalog is empty");

    expect((await route.PATCH(request({ status: "COMPLETED" }), context(fixture.vehicle.code))).status).toBe(200);
    expect((await testDb.inspection.findUniqueOrThrow({ where: { id: fixture.inspection.id } })).status).toBe("COMPLETED");

    const explicitNormal = await route.PATCH(request({ checkItemId: item.id, resultStatus: "NORMAL" }), context(fixture.vehicle.code));
    expect(explicitNormal.status).toBe(200);
    expect((await testDb.inspection.findUniqueOrThrow({ where: { id: fixture.inspection.id } })).status).toBe("IN_PROGRESS");
    expect(await testDb.inspectionItem.count({ where: { inspectionId: fixture.inspection.id } })).toBe(1);

    const abnormal = await route.PATCH(request({ checkItemId: item.id, resultStatus: "ABNORMAL", result: "异常" }), context(fixture.vehicle.code));
    expect(abnormal.status).toBe(200);
    expect((await testDb.inspection.findUniqueOrThrow({ where: { id: fixture.inspection.id } })).status).toBe("IN_PROGRESS");

    const inconsistentCompletion = await route.PATCH(request({ status: "COMPLETED" }), context(fixture.vehicle.code));
    expect(inconsistentCompletion.status).toBe(409);
    expect((await responseJson(inconsistentCompletion)).code).toBe("INSPECTION_DATA_INCONSISTENT");

    const repaired = await route.PATCH(request({
      checkItemId: item.id,
      resultStatus: "ABNORMAL",
      findingUpdates: [{ criterionId: criterion.id, status: "REACHED" }],
    }), context(fixture.vehicle.code));
    expect(repaired.status).toBe(200);
    expect((await route.PATCH(request({ status: "COMPLETED" }), context(fixture.vehicle.code))).status).toBe(200);
    expect((await testDb.inspection.findUniqueOrThrow({ where: { id: fixture.inspection.id } })).status).toBe("COMPLETED");
  });

  it("rolls back a sparse upsert, finding, evidence, and status for an invalid criterion", async () => {
    const fixture = await createFixture();
    const item = templateItems[0];
    if (!item) throw new Error("test catalog is empty");

    const response = await route.PATCH(request({
      checkItemId: item.id,
      resultStatus: "ABNORMAL",
      status: "IN_PROGRESS",
      findingUpdates: [{ criterionId: "criterion-not-in-template", status: "REACHED" }],
      evidence: { uri: "test://invalid-criterion" },
    }), context(fixture.vehicle.code));
    expect(response.status).toBe(400);
    expect(await testDb.inspectionItem.count({ where: { inspectionId: fixture.inspection.id } })).toBe(0);
    expect(await testDb.inspectionFinding.count({ where: { inspectionItem: { inspectionId: fixture.inspection.id } } })).toBe(0);
    expect(await testDb.inspectionEvidence.count({ where: { inspectionId: fixture.inspection.id } })).toBe(0);
    expect((await testDb.inspection.findUniqueOrThrow({ where: { id: fixture.inspection.id } })).status).toBe("DRAFT");
  });

  it("rejects a damage group from another inspection without leaving partial writes", async () => {
    const fixture = await createFixture();
    const foreignFixture = await createFixture();
    const item = templateItems[0];
    const criterion = item?.criteria[0];
    if (!item || !criterion) throw new Error("test catalog is empty");
    const foreignGroup = await testDb.inspectionDamageGroup.create({ data: { inspectionId: foreignFixture.inspection.id, groupCode: "FOREIGN", label: "外部组" } });

    const response = await route.PATCH(request({
      checkItemId: item.id,
      resultStatus: "ABNORMAL",
      status: "IN_PROGRESS",
      findingUpdates: [{ criterionId: criterion.id, status: "REACHED" }],
      accidentAssessment: { criterionId: criterion.id, damageGroupId: foreignGroup.id, classification: "ORDINARY" },
      evidence: { uri: "test://foreign-group" },
    }), context(fixture.vehicle.code));
    expect(response.status).toBe(400);
    expect(await testDb.inspectionItem.count({ where: { inspectionId: fixture.inspection.id } })).toBe(0);
    expect(await testDb.inspectionFinding.count({ where: { inspectionItem: { inspectionId: fixture.inspection.id } } })).toBe(0);
    expect(await testDb.inspectionEvidence.count({ where: { inspectionId: fixture.inspection.id } })).toBe(0);
    expect(await testDb.inspectionAccidentAssessment.count({ where: { inspectionId: fixture.inspection.id } })).toBe(0);
    expect((await testDb.inspection.findUniqueOrThrow({ where: { id: fixture.inspection.id } })).status).toBe("DRAFT");
  });

  it("requires explicit completion confirmation before EVALUATE", async () => {
    const fixture = await createFixture();
    const response = await route.POST(postRequest(), context(fixture.vehicle.code));
    expect(response.status).toBe(409);
    const body = await responseJson(response);
    expect(body.code).toBe("INSPECTION_CONFIRM_REQUIRED");
    expect(body.missing).toHaveLength(179);
    expect(await testDb.inspectionEvaluation.count({ where: { inspectionId: fixture.inspection.id } })).toBe(0);
    expect(await testDb.standardReportSnapshot.count({ where: { inspectionId: fixture.inspection.id } })).toBe(0);
  });

  it("creates evaluations and immutable standard snapshot versions in one transaction", async () => {
    const fixture = await createFixture({ complete: true });
    const completionResponse = await route.PATCH(request({ status: "COMPLETED" }), context(fixture.vehicle.code));
    expect(completionResponse.status).toBe(200);
    expect(await testDb.inspectionEvaluation.count({ where: { inspectionId: fixture.inspection.id } })).toBe(1);
    expect(await testDb.inspectionRuleOutcome.count({ where: { evaluation: { inspectionId: fixture.inspection.id } } })).toBe(8);
    expect(await testDb.standardReportSnapshot.findMany({ where: { inspectionId: fixture.inspection.id }, orderBy: { version: "asc" }, select: { version: true, evaluationId: true, snapshotJson: true } })).toHaveLength(1);
    const firstSnapshot = await testDb.standardReportSnapshot.findFirstOrThrow({ where: { inspectionId: fixture.inspection.id } });
    expect(firstSnapshot.version).toBe(1);
    const firstSnapshotJson = firstSnapshot.snapshotJson;
    expect((await testDb.inspection.findUniqueOrThrow({ where: { id: fixture.inspection.id } })).status).toBe("COMPLETED");

    const secondResponse = await route.POST(postRequest(), context(fixture.vehicle.code));
    expect(secondResponse.status).toBe(200);
    const snapshots = await testDb.standardReportSnapshot.findMany({ where: { inspectionId: fixture.inspection.id }, orderBy: { version: "asc" } });
    const evaluations = await testDb.inspectionEvaluation.findMany({ where: { inspectionId: fixture.inspection.id }, orderBy: { version: "asc" } });
    expect(evaluations.map((evaluation) => evaluation.version)).toEqual([1, 2]);
    expect(snapshots.map((snapshot) => snapshot.version)).toEqual([1, 2]);
    expect(snapshots[0]?.id).not.toBe(snapshots[1]?.id);
    expect(snapshots[0]?.snapshotJson).toBe(firstSnapshotJson);
    expect(snapshots[0]?.snapshotJson).not.toBe(snapshots[1]?.snapshotJson);
  });
});
