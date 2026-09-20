import { spawnSync } from "node:child_process";
import { existsSync, lstatSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { PrismaClient } from "@prisma/client";

const repoRoot = resolve(process.cwd());
const packagePath = join(repoRoot, "package.json");
const schemaPath = join(repoRoot, "prisma", "schema.prisma");
const expectedDatabasePath = resolve(repoRoot, "prisma", "dev.db");

function fail(message: string): never {
  throw new Error("[demo:reset] " + message);
}

function readDotEnvValue(name: string): string | undefined {
  const envPath = join(repoRoot, ".env");
  if (!existsSync(envPath)) return undefined;

  const line = readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .find((entry) => new RegExp("^\\s*(?:export\\s+)?" + name + "\\s*=").test(entry));
  if (!line) return undefined;

  const value = line.slice(line.indexOf("=") + 1).trim();
  return value.replace(/^(['"])(.*)\1$/, "$2");
}

function assertSafeRepository() {
  if (!existsSync(packagePath) || !existsSync(schemaPath)) {
    fail("请从 Vehicle 项目根目录运行此命令。");
  }

  const packageJson = JSON.parse(readFileSync(packagePath, "utf8")) as { name?: string };
  if (packageJson.name !== "checheng-digital-assistant") {
    fail("当前目录不是受保护的演示项目。");
  }
  if (process.env.NODE_ENV === "production") {
    fail("禁止在 NODE_ENV=production 下重置演示库。");
  }
  if (process.argv.slice(2).length > 0) {
    fail("不接受额外参数；目标数据库由脚本固定解析。");
  }

  const schema = readFileSync(schemaPath, "utf8");
  if (!/provider\s*=\s*["']sqlite["']/.test(schema) || !/url\s*=\s*env\(["']DATABASE_URL["']\)/.test(schema)) {
    fail("schema 不是预期的 SQLite + DATABASE_URL 配置，已停止。");
  }
}

function resolveDemoDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL ?? readDotEnvValue("DATABASE_URL");
  if (!databaseUrl) fail("未找到 DATABASE_URL；请配置本地 .env 后重试。");
  if (!databaseUrl.startsWith("file:")) {
    fail("演示重置只接受 SQLite file: URL。");
  }

  const rawPath = databaseUrl.slice("file:".length);
  if (!rawPath) fail("SQLite 路径为空，已停止。");
  if (/[?#]/.test(rawPath)) fail("不接受带查询参数或片段的 SQLite URL。");

  const resolvedPath = resolve(repoRoot, "prisma", rawPath);
  if (resolvedPath !== expectedDatabasePath) {
    const displayedPath = relative(repoRoot, resolvedPath) || resolvedPath;
    fail("只允许操作 prisma/dev.db，当前配置指向 " + displayedPath + "。");
  }
  if (existsSync(expectedDatabasePath) && lstatSync(expectedDatabasePath).isSymbolicLink()) {
    fail("prisma/dev.db 不能是符号链接，已停止。");
  }

  return databaseUrl;
}

async function verifyFixedDemoState(databaseUrl: string) {
  process.env.DATABASE_URL = databaseUrl;
  const prisma = new PrismaClient();

  try {
    const [vehicles, inspections, evaluations, salesCases, reports, personalizedSnapshots, standardSnapshots, templates] =
      await Promise.all([
        prisma.vehicle.findMany({
          orderBy: { code: "asc" },
          select: { code: true, model: true, status: true },
        }),
        prisma.inspection.findMany({
          select: {
            status: true,
            overallRiskLevel: true,
            vehicle: { select: { code: true } },
          },
        }),
        prisma.inspectionEvaluation.findMany({
          select: {
            status: true,
            inspection: { select: { vehicle: { select: { code: true } } } },
          },
        }),
        prisma.salesCase.findMany({
          orderBy: { id: "asc" },
          select: {
            id: true,
            result: true,
            stage: true,
            vehicle: { select: { code: true, status: true } },
          },
        }),
        prisma.report.count(),
        prisma.personalizedReportSnapshot.count(),
        prisma.standardReportSnapshot.count(),
        prisma.inspectionTemplate.count(),
      ]);

    const inspectionSignature = inspections
      .sort((left, right) => left.vehicle.code.localeCompare(right.vehicle.code))
      .map(({ status, overallRiskLevel, vehicle }) => ({ code: vehicle.code, status, overallRiskLevel }));
    const evaluationSignature = evaluations
      .sort((left, right) => left.inspection.vehicle.code.localeCompare(right.inspection.vehicle.code))
      .map(({ status, inspection }) => ({ code: inspection.vehicle.code, status }));
    const caseSignature = salesCases.map(({ id, result, stage, vehicle }) => ({
      id,
      result,
      stage,
      vehicleCode: vehicle.code,
      vehicleStatus: vehicle.status,
    }));

    const expectedVehicles = [
      { code: "V001", model: "2019款 凯美瑞 2.5G", status: "AVAILABLE" },
      { code: "V002", model: "2020款 途观L 330TSI", status: "AVAILABLE" },
      { code: "V003", model: "2018款 雅阁 260TURBO", status: "REVIEW_REQUIRED" },
      { code: "V004", model: "2021款 卡罗拉 1.2T 精英版", status: "AVAILABLE" },
      { code: "V005", model: "2022款 秦PLUS DM-i 55KM尊贵型", status: "AVAILABLE" },
      { code: "V006", model: "2020款 CS75 PLUS 1.5T 自动豪华型", status: "AVAILABLE" },
    ];
    const expectedInspections = [
      { code: "V001", status: "COMPLETED", overallRiskLevel: "MEDIUM" },
      { code: "V002", status: "COMPLETED", overallRiskLevel: "LOW" },
      { code: "V003", status: "COMPLETED", overallRiskLevel: "HIGH" },
      { code: "V004", status: "COMPLETED", overallRiskLevel: "LOW" },
      { code: "V005", status: "COMPLETED", overallRiskLevel: "LOW" },
      { code: "V006", status: "COMPLETED", overallRiskLevel: "MEDIUM" },
    ];
    const expectedEvaluations = [
      { code: "V001", status: "COMPLETED" },
      { code: "V002", status: "COMPLETED" },
      { code: "V003", status: "COMPLETED" },
      { code: "V004", status: "COMPLETED" },
      { code: "V005", status: "COMPLETED" },
      { code: "V006", status: "COMPLETED" },
    ];
    const expectedCases = [
      { id: "SC-0001", result: "CONVERTED", stage: "CONVERTED", vehicleCode: "V001", vehicleStatus: "AVAILABLE" },
      { id: "SC-0002", result: "IN_PROGRESS", stage: "REPORT_GENERATED", vehicleCode: "V001", vehicleStatus: "AVAILABLE" },
      { id: "SC-0003", result: "IN_PROGRESS", stage: "REPORT_GENERATED", vehicleCode: "V002", vehicleStatus: "AVAILABLE" },
      { id: "SC-0004", result: "PENDING", stage: "PENDING", vehicleCode: "V003", vehicleStatus: "REVIEW_REQUIRED" },
      { id: "SC-0005", result: "REJECTED", stage: "REJECTED", vehicleCode: "V004", vehicleStatus: "AVAILABLE" },
      { id: "SC-0006", result: "IN_PROGRESS", stage: "REPORT_GENERATED", vehicleCode: "V005", vehicleStatus: "AVAILABLE" },
    ];

    if (JSON.stringify(vehicles) !== JSON.stringify(expectedVehicles)) {
      fail("seed 后车辆固定状态校验失败。");
    }
    if (JSON.stringify(inspectionSignature) !== JSON.stringify(expectedInspections)) {
      fail("seed 后鉴定固定状态校验失败。");
    }
    if (JSON.stringify(evaluationSignature) !== JSON.stringify(expectedEvaluations)) {
      fail("seed 后评估固定状态校验失败。");
    }
    if (JSON.stringify(caseSignature) !== JSON.stringify(expectedCases)) {
      fail("seed 后销售案例固定状态校验失败。");
    }
    if (
      reports !== 6 ||
      personalizedSnapshots !== 6 ||
      standardSnapshots !== 6 ||
      templates !== 2 ||
      inspections.length !== 6 ||
      evaluations.length !== 6 ||
      salesCases.length !== 6 ||
      vehicles.length !== 6
    ) {
      fail(
        "seed 后固定数量校验失败：inspections=" +
          inspections.length +
          ", evaluations=" +
          evaluations.length +
          ", standardSnapshots=" +
          standardSnapshots +
          ", personalizedSnapshots=" +
          personalizedSnapshots +
          ", reports=" +
          reports +
          ", salesCases=" +
          salesCases.length +
          ", templates=" +
          templates,
      );
    }
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  assertSafeRepository();
  const databaseUrl = resolveDemoDatabaseUrl();
  const prismaBinary = join(repoRoot, "node_modules", ".bin", process.platform === "win32" ? "prisma.cmd" : "prisma");
  if (!existsSync(prismaBinary)) fail("未找到本地 Prisma CLI，请先安装依赖。");

  console.log("Resetting local demo database: " + relative(repoRoot, expectedDatabasePath));
  const result = spawnSync(prismaBinary, ["migrate", "reset", "--force", "--schema", schemaPath], {
    cwd: repoRoot,
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: "inherit",
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    process.exitCode = result.status ?? 1;
    return;
  }

  await verifyFixedDemoState(databaseUrl);
  console.log("Demo database restored to the fixed seed state.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
