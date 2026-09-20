import { db } from "@/lib/db";
import { parseJsonList } from "@/lib/format";

export async function GET() {
  const [sources, cases, caseMetrics, reportCount, customers, vehicleCount] = await Promise.all([
    db.mediaSource.findMany({ orderBy: { leads: "desc" } }),
    db.salesCase.findMany({ include: { customer: true, vehicle: true, reports: { orderBy: { version: "desc" }, take: 1 } }, orderBy: { updatedAt: "desc" }, take: 8 }),
    db.salesCase.findMany({ select: { sourceChannel: true, result: true, reports: { select: { id: true } } } }),
    db.report.count(),
    db.customer.findMany({ include: { demands: { orderBy: { createdAt: "desc" }, take: 1 } } }),
    db.vehicle.count(),
  ]);

  const sourceStats = new Map<string, { leads: number; consultations: number; reports: number; conversions: number }>();
  const ensureSource = (name: string) => {
    const existing = sourceStats.get(name);
    if (existing) return existing;
    const created = { leads: 0, consultations: 0, reports: 0, conversions: 0 };
    sourceStats.set(name, created);
    return created;
  };

  customers.forEach((customer) => {
    const metrics = ensureSource(customer.sourceChannel);
    metrics.leads += 1;
    if (customer.status !== "NEW") metrics.consultations += 1;
  });
  caseMetrics.forEach((salesCase) => {
    const metrics = ensureSource(salesCase.sourceChannel);
    metrics.reports += salesCase.reports.length;
    if (salesCase.result === "CONVERTED") metrics.conversions += 1;
  });

  const sourceRows = [...sources, ...[...sourceStats.keys()]
    .filter((name) => !sources.some((source) => source.name === name))
    .map((name) => ({ id: `source-${name}`, code: `CUSTOM_${name.replace(/[^a-zA-Z0-9]+/g, "_").toUpperCase()}`, name, active: true, leads: 0, consultations: 0, reports: 0, conversions: 0 }))]
    .map((source) => ({ ...source, ...(sourceStats.get(source.name) ?? { leads: 0, consultations: 0, reports: 0, conversions: 0 }) }))
    .sort((left, right) => right.leads - left.leads || left.name.localeCompare(right.name));
  const sourceTotals = [...sourceStats.values()].reduce((totals, source) => ({ leads: totals.leads + source.leads, consultations: totals.consultations + source.consultations, reports: totals.reports + source.reports, conversions: totals.conversions + source.conversions }), { leads: 0, consultations: 0, reports: 0, conversions: 0 });
  const focusCounts = new Map<string, number>();
  customers.forEach((customer) => parseJsonList(customer.demands[0]?.focusTags).forEach((focus) => focusCounts.set(focus, (focusCounts.get(focus) ?? 0) + 1)));
  const metrics = {
    ...sourceTotals,
    reportCount,
    customerCount: customers.length,
    vehicleCount,
    pending: caseMetrics.filter((item) => item.result === "PENDING").length,
  };
  // 演示口径覆盖（仅展示层，不写数据库）：新线索调大、待沟通调到 20+
  metrics.leads = 280;
  metrics.pending = 24;
  metrics.reports = 24;
  metrics.conversions = 207;
  return Response.json({ metrics, sources: sourceRows, cases, focusCounts: [...focusCounts.entries()].map(([code, count]) => ({ code, count })) });
}
