import { z } from "zod";
import { VEHICLE_PRICE_MAP } from "@/config/vehicle-prices";
import { db } from "@/lib/db";
import { buildInspectionSummary, countTemplateItems } from "@/services/inspection-read-model";
import { getInspectionResultLabel } from "@/services/inspection-result";
import { resolveInspectionSeverity } from "@/services/inspection-severity";

const FIELD_LABELS: Record<string, string> = {
  code: "车辆编号",
  vin: "车架号（VIN）",
  plateNo: "车牌/挂牌信息",
  brand: "品牌",
  series: "车系",
  model: "车型",
  modelYear: "年款",
  mileage: "表显里程",
  listingPrice: "展厅指导价",
  registrationDate: "首次挂牌日期",
  coverImage: "封面图片",
  displayTags: "展示标签",
  energyType: "能源类型",
  status: "车辆状态",
};

const updateVehicleSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2, "车辆编号至少 2 位")
    .max(30, "车辆编号最多 30 位")
    .regex(/^[A-Za-z0-9_-]+$/, "车辆编号只能包含字母、数字、短横线或下划线（如 V007）")
    .transform((val) => val.toUpperCase())
    .optional(),
  vin: z
    .string()
    .trim()
    .min(8, "车架号（VIN）至少 8 位")
    .max(40, "车架号（VIN）最多 40 位")
    .transform((val) => val.toUpperCase())
    .optional(),
  plateNo: z.string().trim().min(2, "车牌信息至少 2 位").max(20, "车牌信息最多 20 位").optional(),
  brand: z.string().trim().min(1, "品牌不能为空").max(30, "品牌最多 30 字").optional(),
  series: z.string().trim().min(1, "车系不能为空").max(30, "车系最多 30 字").optional(),
  model: z.string().trim().min(1, "车型不能为空").max(60, "车型最多 60 字").optional(),
  modelYear: z.coerce
    .number()
    .min(1990, "年款需在 1990 至 2030 之间")
    .max(2030, "年款需在 1990 至 2030 之间")
    .transform((val) => Math.round(val))
    .optional(),
  mileage: z.coerce
    .number()
    .nonnegative("表显里程必须大于或等于 0")
    .transform((val) => Math.round(val))
    .optional(),
  listingPrice: z.coerce
    .number()
    .positive("展厅指导价必须大于 0")
    .transform((val) => Math.round(val))
    .optional(),
  registrationDate: z
    .string()
    .trim()
    .optional()
    .nullable()
    .transform((val) => (val && val.trim().length > 0 ? val.trim() : undefined))
    .pipe(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "首次挂牌日期需为 YYYY-MM-DD 格式").optional()),
  coverImage: z
    .string()
    .trim()
    .max(500)
    .nullable()
    .optional()
    .transform((val) => (val && val.trim().length > 0 ? val.trim() : null))
    .refine(
      (value) => !value || value.startsWith("/api/media/"),
      "封面地址不合法，请先上传图片",
    )
    .optional(),
  displayTags: z
    .union([
      z.array(z.string().trim()),
      z.string().transform((str) => {
        try {
          const parsed = JSON.parse(str);
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      }),
    ])
    .transform((tags) => (tags as string[]).filter((t) => typeof t === "string" && t.trim().length > 0))
    .pipe(z.array(z.string().min(1).max(30)).max(6))
    .optional(),
  energyType: z.enum(["ICE", "NEW_ENERGY"]).optional(),
  status: z.enum(["AVAILABLE", "RESERVED", "SOLD", "REVIEW_REQUIRED"]).optional(),
});


export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const vehicle = await db.vehicle.findFirst({
    where: { OR: [{ id }, { code: id }] },
    include: {
      inspections: {
        orderBy: { version: "desc" },
        include: {
          items: { include: { findings: { include: { criterion: { select: { label: true, sortOrder: true, hardStopCriterion: true } } } } } },
          templateVersion: {
            select: {
              sections: {
                select: { positions: { select: { checkItems: { select: { id: true } } } } },
              },
            },
          },
        },
      },
      marketSnapshots: { orderBy: { capturedAt: "desc" } },
      salesCases: { include: { customer: true, demand: true, reports: { orderBy: { version: "desc" } } }, orderBy: { updatedAt: "desc" } },
    },
  });
  if (!vehicle) return Response.json({ error: "车辆不存在" }, { status: 404 });

  const inspections = vehicle.inspections.map((inspection) => {
    const templateItemCount = inspection.templateVersion
      ? countTemplateItems(inspection.templateVersion)
      : inspection.items.length;
    const items = inspection.items.map((item) => ({
      ...item,
      isAbnormal: item.resultStatus === "ABNORMAL" || item.resultStatus === "BLOCKED",
      severity: resolveInspectionSeverity({
        status: item.resultStatus,
        storedSeverity: item.severity,
        findings: item.findings,
      }),
      result: getInspectionResultLabel({
        result: item.result,
        resultStatus: item.resultStatus,
        isAbnormal: item.resultStatus === "ABNORMAL" || item.resultStatus === "BLOCKED",
        findings: item.findings,
      }) ?? item.result,
    }));
    const inspectionSummary = buildInspectionSummary({
      status: inspection.status,
      templateTotal: templateItemCount,
      items,
    });
    return { ...inspection, items, templateVersion: undefined, templateItemCount, inspectionSummary };
  });

  const price = VEHICLE_PRICE_MAP[vehicle.code];
  const abnormalCount = inspections[0]?.items?.filter((i: { isAbnormal?: boolean }) => i.isAbnormal).length ?? 0;
  let lowF = 0.82;
  let highF = 0.90;
  if (abnormalCount > 10) { lowF = 0.61; highF = 0.69; }
  else if (abnormalCount <= 5) { lowF = 0.92; highF = 0.98; }
  const existingSnaps = vehicle.marketSnapshots ?? [];
  const marketSnapshots = existingSnaps.length > 0
    ? existingSnaps.map((s) =>
        price
          ? {
              ...s,
              marketLow: price.marketLow,
              marketMedian: price.marketMedian,
              marketHigh: price.marketHigh,
              conditionAdjustedLow: price.conditionAdjustedLow ?? Math.round(price.marketMedian * lowF),
              conditionAdjustedHigh: price.conditionAdjustedHigh ?? Math.round(price.marketMedian * highF),
            }
          : s,
      )
    : price
      ? [
          {
            id: "virtual",
            vehicleId: vehicle.id,
            marketLow: price.marketLow,
            marketMedian: price.marketMedian,
            marketHigh: price.marketHigh,
            conditionAdjustedLow: price.conditionAdjustedLow ?? Math.round(price.marketMedian * lowF),
            conditionAdjustedHigh: price.conditionAdjustedHigh ?? Math.round(price.marketMedian * highF),
            source: "市场行情参考",
            capturedAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ]
      : existingSnaps;

  return Response.json({
    ...vehicle,
    inspections,
    inspectionSummary: inspections[0]?.inspectionSummary ?? null,
    marketSnapshots,
    newCarPrice: price?.newCarPrice ?? null,
  });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const vehicle = await db.vehicle.findFirst({
    where: { OR: [{ id }, { code: id }] },
  });
  if (!vehicle) return Response.json({ error: "车辆不存在" }, { status: 404 });

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return Response.json({ error: "请求格式不正确，需传入 JSON 数据" }, { status: 400 });
  }

  const parsed = updateVehicleSchema.safeParse(body);
  if (!parsed.success) {
    const flattened = parsed.error.flatten();
    const errorDetails = Object.entries(flattened.fieldErrors)
      .map(([field, msgs]) => `${FIELD_LABELS[field] || field}：${msgs?.[0] || "格式不正确"}`)
      .join("；");
    return Response.json(
      {
        error: errorDetails ? `请检查车辆档案字段（${errorDetails}）` : "请检查车辆档案字段",
        issues: flattened,
      },
      { status: 400 },
    );
  }

  const data = parsed.data;

  // 查重：若修改了编号或 VIN，排查是否被其他车辆占用
  if (data.code && data.code !== vehicle.code) {
    const duplicate = await db.vehicle.findFirst({
      where: { code: data.code, id: { not: vehicle.id } },
      select: { code: true },
    });
    if (duplicate) {
      return Response.json({ error: `车辆编号「${data.code}」已被占用，请使用其他编号` }, { status: 400 });
    }
  }

  if (data.vin && data.vin !== vehicle.vin) {
    const duplicate = await db.vehicle.findFirst({
      where: { vin: data.vin, id: { not: vehicle.id } },
      select: { vin: true },
    });
    if (duplicate) {
      return Response.json({ error: `车架号（VIN）「${data.vin}」已存在于系统中` }, { status: 400 });
    }
  }

  const updateData: Record<string, unknown> = {};
  if (data.code !== undefined) updateData.code = data.code;
  if (data.vin !== undefined) updateData.vin = data.vin;
  if (data.plateNo !== undefined) updateData.plateNo = data.plateNo;
  if (data.brand !== undefined) updateData.brand = data.brand;
  if (data.series !== undefined) updateData.series = data.series;
  if (data.model !== undefined) updateData.model = data.model;
  if (data.modelYear !== undefined) updateData.modelYear = data.modelYear;
  if (data.mileage !== undefined) updateData.mileage = data.mileage;
  if (data.listingPrice !== undefined) updateData.listingPrice = data.listingPrice;
  if (data.energyType !== undefined) updateData.energyType = data.energyType;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.coverImage !== undefined) updateData.coverImage = data.coverImage;
  if (data.displayTags !== undefined) updateData.displayTags = JSON.stringify(data.displayTags);
  if (data.registrationDate !== undefined) {
    if (data.registrationDate) {
      const regDate = new Date(`${data.registrationDate}T00:00:00.000Z`);
      if (Number.isNaN(regDate.getTime())) {
        return Response.json({ error: "首次挂牌日期不合法" }, { status: 400 });
      }
      updateData.registrationDate = regDate;
    }
  }

  const updatedVehicle = await db.vehicle.update({
    where: { id: vehicle.id },
    data: updateData,
  });

  return Response.json(updatedVehicle);
}


export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const vehicle = await db.vehicle.findFirst({ where: { OR: [{ id }, { code: id }] } });
  if (!vehicle) return Response.json({ error: "车辆不存在" }, { status: 404 });

  await db.$transaction(async (tx) => {
    // 找关联的所有 inspection
    const inspections = await tx.inspection.findMany({ where: { vehicleId: vehicle.id }, select: { id: true } });
    const inspectionIds = inspections.map((i) => i.id);

    // 找关联的所有 salesCase
    const salesCases = await tx.salesCase.findMany({ where: { vehicleId: vehicle.id }, select: { id: true } });
    const salesCaseIds = salesCases.map((s) => s.id);

    // 删报告（含个性化快照、标准快照）
    if (salesCaseIds.length > 0) {
      const reports = await tx.report.findMany({ where: { salesCaseId: { in: salesCaseIds } }, select: { id: true, personalizedReportSnapshotId: true } });
      const reportIds = reports.map((r) => r.id);
      const snapIds = reports.map((r) => r.personalizedReportSnapshotId).filter((id): id is string => Boolean(id));
      if (reportIds.length > 0) await tx.report.deleteMany({ where: { id: { in: reportIds } } });
      if (snapIds.length > 0) await tx.personalizedReportSnapshot.deleteMany({ where: { id: { in: snapIds } } });
    }

    // 删标准报告快照
    if (inspectionIds.length > 0) {
      await tx.standardReportSnapshot.deleteMany({ where: { inspectionId: { in: inspectionIds } } });
    }

    // 删鉴定项和鉴定
    if (inspectionIds.length > 0) {
      await tx.inspectionItem.deleteMany({ where: { inspectionId: { in: inspectionIds } } });
      await tx.inspection.deleteMany({ where: { id: { in: inspectionIds } } });
    }

    // 删 salesCase
    if (salesCaseIds.length > 0) {
      await tx.salesCase.deleteMany({ where: { id: { in: salesCaseIds } } });
    }

    // 删市场价格快照
    await tx.marketPriceSnapshot.deleteMany({ where: { vehicleId: vehicle.id } });

    // 删车辆本身
    await tx.vehicle.delete({ where: { id: vehicle.id } });
  });

  return Response.json({ ok: true });
}
