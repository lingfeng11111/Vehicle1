import { db } from "@/lib/db";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const customer = await db.customer.findUnique({ where: { id }, include: { demands: { orderBy: { createdAt: "desc" } }, salesCases: { include: { vehicle: true, reports: { orderBy: { version: "desc" } }, events: { orderBy: { eventTime: "desc" } } }, orderBy: { updatedAt: "desc" } } } });
  if (!customer) return Response.json({ error: "客户不存在" }, { status: 404 });
  return Response.json(customer);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const customer = await db.customer.findUnique({ where: { id }, include: { salesCases: { select: { id: true } } } });
  if (!customer) return Response.json({ error: "客户不存在" }, { status: 404 });
  await db.customer.delete({ where: { id } });
  return Response.json({ ok: true });
}
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await request.json()) as Record<string, unknown>;

  const customer = await db.customer.findUnique({
    where: { id },
    include: {
      demands: { orderBy: { createdAt: "desc" }, take: 1 },
      salesCases: {
        include: { reports: true },
        orderBy: { updatedAt: "desc" },
      },
    },
  });
  if (!customer) return Response.json({ error: "客户不存在" }, { status: 404 });

  const updatedCustomer = await db.$transaction(async (tx) => {
    const customerData: Record<string, unknown> = {};
    if (body.name !== undefined) customerData.name = String(body.name);
    if (body.phone !== undefined) customerData.phone = String(body.phone);
    if (body.status !== undefined) customerData.status = String(body.status);
    if (body.sourceChannel !== undefined) customerData.sourceChannel = String(body.sourceChannel);
    if (body.sourceContent !== undefined) customerData.sourceContent = body.sourceContent ? String(body.sourceContent) : null;

    if (Object.keys(customerData).length > 0) {
      await tx.customer.update({ where: { id }, data: customerData });
    }

    const demand = customer.demands[0];
    const demandData: Record<string, unknown> = {};
    if (body.budgetMin !== undefined) demandData.budgetMin = body.budgetMin ? Number(body.budgetMin) : null;
    if (body.budgetMax !== undefined) demandData.budgetMax = body.budgetMax ? Number(body.budgetMax) : null;
    if (body.usageScene !== undefined) demandData.usageScene = String(body.usageScene);
    if (body.purchaseTime !== undefined) demandData.purchaseTime = String(body.purchaseTime);
    if (body.focusTags !== undefined) {
      demandData.focusTags = typeof body.focusTags === "string" ? body.focusTags : JSON.stringify(body.focusTags);
    }
    if (body.riskConcerns !== undefined) {
      demandData.riskConcerns = typeof body.riskConcerns === "string" ? body.riskConcerns : JSON.stringify(body.riskConcerns);
    }
    if (body.profile !== undefined) {
      demandData.profileJson = typeof body.profile === "string" ? body.profile : JSON.stringify(body.profile);
    }
    if (body.remark !== undefined) demandData.remark = body.remark ? String(body.remark) : null;

    let activeDemandId = demand?.id;
    if (Object.keys(demandData).length > 0) {
      if (demand) {
        await tx.customerDemand.update({ where: { id: demand.id }, data: demandData });
      } else {
        const createdDemand = await tx.customerDemand.create({
          data: {
            customerId: id,
            usageScene: (body.usageScene as string) || "日常家庭代步",
            purchaseTime: (body.purchaseTime as string) || "近期 1-2 周内",
            ...demandData,
          },
        });
        activeDemandId = createdDemand.id;
      }
    }

    if (body.vehicleId !== undefined) {
      const vehicleId = body.vehicleId ? String(body.vehicleId).trim() : null;
      if (vehicleId) {
        const vehicle = await tx.vehicle.findUnique({ where: { id: vehicleId } });
        if (vehicle) {
          const existingCase = await tx.salesCase.findFirst({
            where: { customerId: id, vehicleId },
          });

          if (existingCase) {
            await tx.salesCase.update({
              where: { id: existingCase.id },
              data: { updatedAt: new Date() },
            });
          } else {
            const primaryCase = customer.salesCases[0];
            if (primaryCase && (!primaryCase.reports || primaryCase.reports.length === 0)) {
              await tx.salesCase.update({
                where: { id: primaryCase.id },
                data: { vehicleId, updatedAt: new Date() },
              });
            } else {
              const latest = await tx.salesCase.findFirst({ orderBy: { id: "desc" }, select: { id: true } });
              const nextNumber = latest ? Number(latest.id.replace("SC-", "")) + 1 : 1;
              const scId = `SC-${String(nextNumber).padStart(4, "0")}`;
              const targetDemandId = activeDemandId || customer.demands[0]?.id;
              if (targetDemandId) {
                await tx.salesCase.create({
                  data: {
                    id: scId,
                    customerId: id,
                    demandId: targetDemandId,
                    vehicleId,
                    sourceChannel: customer.sourceChannel,
                    stage: "INTERESTED",
                    result: "IN_PROGRESS",
                    events: {
                      create: [{ eventType: "VEHICLE_SELECTED", metadata: JSON.stringify({ vehicle: vehicle.code }) }],
                    },
                  },
                });
              }
            }
          }
        }
      }
    }

    return tx.customer.findUnique({
      where: { id },
      include: {
        demands: { orderBy: { createdAt: "desc" } },
        salesCases: {
          include: {
            vehicle: true,
            reports: { orderBy: { version: "desc" } },
            events: { orderBy: { eventTime: "desc" } },
          },
          orderBy: { updatedAt: "desc" },
        },
      },
    });
  });

  return Response.json(updatedCustomer);
}
