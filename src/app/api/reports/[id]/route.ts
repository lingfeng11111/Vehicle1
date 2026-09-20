import { db } from "@/lib/db";
import { normalizeSnapshotFacts } from "@/services/inspection-result";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const report = await db.report.findUnique({ where: { id }, include: { salesCase: { include: { customer: true, demand: true, vehicle: true, events: { orderBy: { eventTime: "desc" } } } }, inspection: true, standardReportSnapshot: true, personalizedReportSnapshot: true } });
  if (!report) return Response.json({ error: "报告不存在" }, { status: 404 });
  const standardSnapshot = report.standardReportSnapshot ? normalizeSnapshotFacts(JSON.parse(report.standardReportSnapshot.snapshotJson)) : null;
  const personalizedSnapshot = report.personalizedReportSnapshot
    ? normalizeSnapshotFacts(JSON.parse(report.personalizedReportSnapshot.snapshotJson), standardSnapshot)
    : null;
  return Response.json({
    ...report,
    snapshot: normalizeSnapshotFacts(JSON.parse(report.generatedSnapshot), standardSnapshot),
    standardSnapshot,
    personalizedSnapshot,
  });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const report = await db.report.findUnique({ where: { id }, select: { id: true, salesCaseId: true, personalizedReportSnapshotId: true, salesCase: { select: { customerId: true } } } });
  if (!report) return Response.json({ error: "报告不存在" }, { status: 404 });
  await db.$transaction(async (tx) => {
    await tx.report.delete({ where: { id } });
    if (report.personalizedReportSnapshotId) await tx.personalizedReportSnapshot.delete({ where: { id: report.personalizedReportSnapshotId } });
    const remainingReports = await tx.report.count({ where: { salesCaseId: report.salesCaseId } });
    await tx.salesCase.update({ where: { id: report.salesCaseId }, data: { stage: remainingReports ? "REPORT_GENERATED" : "INTERESTED", events: { create: { eventType: "REPORT_DELETED", metadata: JSON.stringify({ reportId: id }) } } } });
    const customerReportCount = await tx.report.count({ where: { salesCase: { customerId: report.salesCase.customerId } } });
    if (!customerReportCount) await tx.customer.update({ where: { id: report.salesCase.customerId }, data: { status: "INTERESTED" } });
  });
  return Response.json({ ok: true });
}
