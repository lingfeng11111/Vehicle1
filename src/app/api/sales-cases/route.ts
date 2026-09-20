import { z } from "zod";
import { db } from "@/lib/db";

const caseSchema = z.object({ customerId: z.string(), demandId: z.string(), vehicleId: z.string() });

export async function GET() {
  const cases = await db.salesCase.findMany({ include: { customer: true, demand: true, vehicle: true, reports: { orderBy: { version: "desc" } }, events: { orderBy: { eventTime: "desc" } } }, orderBy: { updatedAt: "desc" } });
  return Response.json(cases);
}

export async function POST(request: Request) {
  const parsed = caseSchema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: "请选择客户、需求和车辆" }, { status: 400 });
  const { customerId, demandId, vehicleId } = parsed.data;
  const [customer, demand, vehicle] = await Promise.all([db.customer.findUnique({ where: { id: customerId } }), db.customerDemand.findUnique({ where: { id: demandId } }), db.vehicle.findUnique({ where: { id: vehicleId } })]);
  if (!customer || !demand || !vehicle) return Response.json({ error: "关联对象不存在" }, { status: 404 });
  if (demand.customerId !== customerId) return Response.json({ error: "客户与需求不匹配" }, { status: 400 });
  const existingCase = await db.salesCase.findFirst({ where: { customerId, demandId, vehicleId }, select: { id: true } });
  if (existingCase) return Response.json({ error: "该客户需求已关联此意向车辆", duplicate: true, salesCaseId: existingCase.id }, { status: 409 });
  const existingCases = await db.salesCase.findMany({ where: { id: { startsWith: "SC-" } }, select: { id: true } });
  let maxNum = 0;
  for (const item of existingCases) {
    const match = item.id.match(/^SC-(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) maxNum = num;
    }
  }
  const id = `SC-${String(maxNum + 1).padStart(4, "0")}`;
  const salesCase = await db.salesCase.create({ data: { id, customerId, demandId, vehicleId, sourceChannel: customer.sourceChannel, stage: "INTERESTED", result: "IN_PROGRESS", events: { create: [{ eventType: "VEHICLE_SELECTED", metadata: JSON.stringify({ vehicle: vehicle.code }) }] } }, include: { customer: true, demand: true, vehicle: true, events: true } });
  await db.customer.update({ where: { id: customer.id }, data: { status: "INTERESTED" } });
  return Response.json(salesCase, { status: 201 });
}
