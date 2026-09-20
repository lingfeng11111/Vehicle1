import { z } from "zod";
import { db } from "@/lib/db";

const updateSchema = z.object({ result: z.enum(["PENDING", "REJECTED", "CONVERTED", "IN_PROGRESS"]), lostReason: z.string().optional() });

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const salesCase = await db.salesCase.findUnique({ where: { id }, include: { customer: true, demand: true, vehicle: true, reports: { orderBy: { version: "desc" } }, events: { orderBy: { eventTime: "desc" } } } });
  if (!salesCase) return Response.json({ error: "销售案例不存在" }, { status: 404 });
  return Response.json(salesCase);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = updateSchema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: "销售结果不合法" }, { status: 400 });
  const { result, lostReason } = parsed.data;
  const stage = result === "CONVERTED" ? "CONVERTED" : result === "PENDING" ? "PENDING" : result === "REJECTED" ? "REJECTED" : "REPORT_GENERATED";
  const eventType = result === "CONVERTED" ? "CONVERTED" : result === "PENDING" ? "PENDING" : result === "REJECTED" ? "REJECTED" : "FOLLOW_UP";
  const customerStatus = result === "CONVERTED" ? "CONVERTED" : result === "PENDING" ? "PENDING" : result === "REJECTED" ? "REJECTED" : "REPORT_GENERATED";
  const salesCase = await db.$transaction(async (tx) => {
    const updated = await tx.salesCase.update({ where: { id }, data: { result, stage, lostReason: result === "REJECTED" ? lostReason ?? "OTHER" : null, events: { create: { eventType, metadata: JSON.stringify({ lostReason }) } } }, include: { customer: true, demand: true, vehicle: true, reports: { orderBy: { version: "desc" } }, events: { orderBy: { eventTime: "desc" } } } });
    await tx.customer.update({ where: { id: updated.customerId }, data: { status: customerStatus } });
    return updated;
  });
  return Response.json(salesCase);
}
