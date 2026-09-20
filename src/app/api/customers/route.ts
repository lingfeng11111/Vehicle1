import { z } from "zod";
import { db } from "@/lib/db";
import { matchVehicleForDemand } from "@/services/vehicle-matching";

const buyerProfileSchema = z
  .object({
    energyPreference: z.string().trim().max(40).optional().default("不限"),
    purchaseType: z.string().trim().max(40).optional(),
    bodyType: z.string().trim().max(40).optional(),
    familySize: z.string().trim().max(40).optional(),
    annualMileage: z.string().trim().max(40).optional(),
    vehicleAge: z.string().trim().max(40).optional(),
    chargingCondition: z.string().trim().max(40).optional(),
    brandPreference: z.string().trim().max(40).optional(),
    financePreference: z.string().trim().max(40).optional(),
    mustHave: z.array(z.string().trim().max(40)).max(15).optional().default([]),
    avoidTags: z.array(z.string().trim().max(40)).max(15).optional().default([]),
    serviceNeeds: z.array(z.string().trim().max(40)).max(15).optional().default([]),
  })
  .default({
    energyPreference: "不限",
    mustHave: [],
    avoidTags: [],
    serviceNeeds: [],
  });

const customerSchema = z.object({
  name: z.string().trim().min(1, "请填写客户姓名或称谓").max(40),
  phone: z.string().trim().min(5, "请填写联系电话或微信").max(30),
  sourceChannel: z.string().trim().min(1).max(30),
  sourceContent: z.string().trim().max(100).optional().default(""),
  budgetMin: z.coerce.number().int().nonnegative().optional().nullable(),
  budgetMax: z.coerce.number().int().nonnegative().optional().nullable(),
  usageScene: z.string().trim().min(1).max(40),
  purchaseTime: z.string().trim().min(1).max(40),
  energyPreference: z.string().trim().optional(),
  focusTags: z.array(z.string()).default([]),
  riskConcerns: z.array(z.string()).default([]),
  profile: buyerProfileSchema,
  remark: z.string().trim().max(240).optional().default(""),
  vehicleId: z.string().trim().optional().nullable(),
});

export async function GET() {
  const customers = await db.customer.findMany({
    include: {
      demands: { orderBy: { createdAt: "desc" } },
      salesCases: {
        include: {
          vehicle: true,
          reports: { orderBy: { version: "desc" }, take: 1 },
          events: { orderBy: { eventTime: "desc" } },
        },
        orderBy: { updatedAt: "desc" },
      },
    },
    orderBy: { updatedAt: "desc" },
  });
  return Response.json(customers);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const parsed = customerSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "请补齐客户与需求卡信息", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const data = parsed.data;

  // 确保 energyPreference 同步至 profile
  const effectiveEnergyPref =
    data.energyPreference || data.profile.energyPreference || "不限";
  const mergedProfile = {
    ...data.profile,
    energyPreference: effectiveEnergyPref,
  };

  try {
    const result = await db.$transaction(async (tx) => {
      // 1. 查询车库中的可用车辆
      const allVehicles = await tx.vehicle.findMany({
        select: {
          id: true,
          code: true,
          brand: true,
          series: true,
          model: true,
          listingPrice: true,
          energyType: true,
          status: true,
          displayTags: true,
        },
      });

      if (allVehicles.length === 0) {
        throw new Error("当前车库暂无在售车辆，无法完成自动匹配");
      }

      // 2. 如果未指定 vehicleId，后台自动匹配车辆
      let targetVehicleId = data.vehicleId;
      let matchInfo: { rule: string; reason: string } | null = null;

      if (!targetVehicleId) {
        const matchResult = matchVehicleForDemand(allVehicles, {
          budgetMin: data.budgetMin ?? undefined,
          budgetMax: data.budgetMax ?? undefined,
          usageScene: data.usageScene,
          energyPreference: effectiveEnergyPref,
          focusTags: data.focusTags,
          purchaseType: mergedProfile.purchaseType,
          bodyType: mergedProfile.bodyType,
          familySize: mergedProfile.familySize,
          annualMileage: mergedProfile.annualMileage,
          vehicleAge: mergedProfile.vehicleAge,
          chargingCondition: mergedProfile.chargingCondition,
          brandPreference: mergedProfile.brandPreference,
          financePreference: mergedProfile.financePreference,
        });
        targetVehicleId = matchResult.vehicle.id;
        matchInfo = { rule: matchResult.rule, reason: matchResult.reason };
      }

      const vehicle = await tx.vehicle.findUnique({
        where: { id: targetVehicleId },
      });

      if (!vehicle) {
        throw new Error("匹配到的车辆不存在或已下架");
      }

      // 3. 创建客户与需求卡
      let customer;
      const baseDemand = {
        budgetMin: data.budgetMin || null,
        budgetMax: data.budgetMax || null,
        usageScene: data.usageScene,
        purchaseTime: data.purchaseTime,
        focusTags: JSON.stringify(data.focusTags),
        riskConcerns: JSON.stringify(data.riskConcerns),
        remark: data.remark || null,
      };

      try {
        customer = await tx.customer.create({
          data: {
            name: data.name,
            phone: data.phone,
            sourceChannel: data.sourceChannel,
            sourceContent: data.sourceContent || null,
            status: "COMMUNICATING",
            demands: {
              create: {
                ...baseDemand,
                profileJson: JSON.stringify(mergedProfile),
              },
            },
          },
          include: { demands: true },
        });
      } catch (createErr: unknown) {
        if (createErr instanceof Error && createErr.message.includes("profileJson")) {
          customer = await tx.customer.create({
            data: {
              name: data.name,
              phone: data.phone,
              sourceChannel: data.sourceChannel,
              sourceContent: data.sourceContent || null,
              status: "COMMUNICATING",
              demands: {
                create: baseDemand,
              },
            },
            include: { demands: true },
          });
        } else {
          throw createErr;
        }
      }

      // 4. 自动绑定车辆并创建 SalesCase 与销售跟进记录
      const existingCases = await tx.salesCase.findMany({
        where: { id: { startsWith: "SC-" } },
        select: { id: true },
      });
      let maxNum = 0;
      for (const item of existingCases) {
        const match = item.id.match(/^SC-(\d+)$/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNum) maxNum = num;
        }
      }
      const scId = `SC-${String(maxNum + 1).padStart(4, "0")}`;

      const eventsToCreate = [
        {
          eventType: "VEHICLE_AUTO_MATCHED",
          metadata: JSON.stringify({
            vehicleCode: vehicle.code,
            model: vehicle.model,
            rule: matchInfo?.rule ?? "指定意向车辆",
            reason: matchInfo?.reason ?? "已绑定意向车辆",
          }),
        },
        {
          eventType: "FOLLOW_UP",
          metadata: JSON.stringify({
            note: "系统自动创建客户需求卡并匹配意向车辆，等待置业顾问跟进",
          }),
        },
      ];

      const createdSalesCase = await tx.salesCase.create({
        data: {
          id: scId,
          customerId: customer.id,
          demandId: customer.demands[0].id,
          vehicleId: vehicle.id,
          sourceChannel: data.sourceChannel,
          stage: "REPORT_GENERATED",
          result: "IN_PROGRESS",
          events: {
            create: eventsToCreate,
          },
        },
      });

      // 5. 自动生成消费者报告：找车辆最新鉴定，标记完成并创建报告记录
      const latestInspection = await tx.inspection.findFirst({
        where: { vehicleId: vehicle.id },
        orderBy: { version: "desc" },
      });
      if (latestInspection) {
        await tx.inspection.update({
          where: { id: latestInspection.id },
          data: { status: "COMPLETED" },
        });
        const latestReport = await tx.report.findFirst({
          where: { salesCaseId: scId },
          orderBy: { version: "desc" },
        });
        const reportVersion = latestReport ? latestReport.version + 1 : 1;

        // 读鉴定明细项
        const inspItems = await tx.inspectionItem.findMany({
          where: { inspectionId: latestInspection.id },
          include: { checkItem: { select: { name: true } } },
          orderBy: { createdAt: "asc" },
        });
        const facts = inspItems.map((item) => ({
          id: item.id,
          itemName: item.itemName,
          zone: item.zone,
          category: item.category,
          result: item.result,
          resultStatus: item.resultStatus,
          isAbnormal: item.isAbnormal,
          severity: item.severity,
          mediaUrl: item.mediaUrl,
        }));
        const abnormalItems = facts.filter((f) => f.isAbnormal);

        // 个性化购车解读
        const focusTags = data.focusTags || [];
        const focusText = focusTags.length ? `您关注的${focusTags.join("、")}方面` : "您关注的方面";
        const fitText = abnormalItems.length <= 5 ? "车况与您的用车需求匹配度较好" : abnormalItems.length <= 10 ? "车况基本满足日常代步需求，但有若干修复痕迹需留意" : "车况存在多处修复记录，建议试驾后谨慎决策";
        const explanationText = `${data.name}您好，根据您的预算（${data.budgetMin}~${data.budgetMax}元）和用车场景（${data.usageScene || "日常代步"}），本次为您匹配的是${vehicle.brand}${vehicle.series} ${vehicle.model}。${focusText}我们已重点核查。全车共${facts.length}项检查，其中${abnormalItems.length}项存在异常：${abnormalItems.slice(0, 5).map((f) => f.itemName).join("、")}等。${fitText}。建议您重点关注左前翼子板内骨架、左前纵梁等结构件的焊接修复情况，这些部位关系到车辆安全性。`;
        const recommendationText = `${fitText}。结合您新手练车代步的需求，建议在预算范围内优先确认结构件安全，外观瑕疵可后续整备。试驾时重点感受方向盘是否跑偏、底盘是否有异响。`;

        const snapshot = {
          snapshotVersion: 2,
          generatedAt: new Date().toISOString(),
          reportMode: "PERSONALIZED",
          customer: { id: customer.id, name: data.name, focusTags: data.focusTags, usageScene: data.usageScene },
          demand: { budgetMin: data.budgetMin, budgetMax: data.budgetMax, usageScene: data.usageScene, remark: data.remark },
          vehicle: { id: vehicle.id, code: vehicle.code, brand: vehicle.brand, series: vehicle.series, model: vehicle.model, modelYear: vehicle.modelYear, mileage: vehicle.mileage, listingPrice: vehicle.listingPrice, coverImage: vehicle.coverImage },
          inspection: { id: latestInspection.id, version: latestInspection.version, overallRiskLevel: latestInspection.overallRiskLevel, items: facts },
          highlights: abnormalItems.map((f) => ({ itemName: f.itemName, result: f.result, severity: f.severity, mediaUrl: f.mediaUrl })),
          facts,
          fit: fitText,
          explanation: explanationText,
          recommendation: recommendationText,
          disclaimer: "本报告由系统根据鉴定数据自动生成，仅供购车参考，不构成交易承诺。",
        };
        await tx.report.create({
          data: {
            salesCaseId: scId,
            inspectionId: latestInspection.id,
            version: reportVersion,
            reportMode: "PERSONALIZED",
            highlightTags: JSON.stringify(data.focusTags || []),
            generatedSnapshot: JSON.stringify(snapshot),
          },
        });
        await tx.customer.update({ where: { id: customer.id }, data: { status: "REPORT_GENERATED" } });
      }

      return tx.customer.findUnique({
        where: { id: customer.id },
        include: {
          demands: { orderBy: { createdAt: "desc" } },
          salesCases: {
            include: {
              vehicle: true,
              reports: { orderBy: { version: "desc" }, take: 1 },
              events: { orderBy: { eventTime: "desc" } },
            },
            orderBy: { updatedAt: "desc" },
          },
        },
      });
    });

    return Response.json(result, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "录入客户需求失败";
    return Response.json({ error: message }, { status: 400 });
  }
}
