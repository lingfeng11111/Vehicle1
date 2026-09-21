import { z } from "zod";
import { REPORT_INSPECTOR_NAME, REPORT_REVIEWER_NAME } from "@/config/report-people";
import { VEHICLE_PRICE_MAP } from "@/config/vehicle-prices";
import { db } from "@/lib/db";
import { buildInspectionSummary, countTemplateItems } from "@/services/inspection-read-model";

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
};

const vehicleSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2, "车辆编号至少 2 位")
    .max(30, "车辆编号最多 30 位")
    .regex(/^[A-Za-z0-9_-]+$/, "车辆编号只能包含字母、数字、短横线或下划线（如 V007）")
    .transform((val) => val.toUpperCase()),
  vin: z
    .string()
    .trim()
    .min(8, "车架号（VIN）至少 8 位")
    .max(40, "车架号（VIN）最多 40 位")
    .transform((val) => val.toUpperCase()),
  plateNo: z.string().trim().min(2, "车牌信息至少 2 位").max(20, "车牌信息最多 20 位"),
  brand: z.string().trim().min(1, "品牌不能为空").max(30, "品牌最多 30 字"),
  series: z.string().trim().min(1, "车系不能为空").max(30, "车系最多 30 字"),
  model: z.string().trim().min(1, "车型不能为空").max(60, "车型最多 60 字"),
  modelYear: z.coerce
    .number()
    .min(1990, "年款需在 1990 至 2030 之间")
    .max(2030, "年款需在 1990 至 2030 之间")
    .transform((val) => Math.round(val)),
  mileage: z.coerce
    .number()
    .nonnegative("表显里程必须大于或等于 0")
    .transform((val) => Math.round(val)),
  listingPrice: z.coerce
    .number()
    .positive("展厅指导价必须大于 0")
    .transform((val) => Math.round(val)),
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
    ),
  displayTags: z
    .array(z.string().trim())
    .transform((tags) => tags.filter((t) => t.length > 0))
    .pipe(z.array(z.string().min(1).max(30)).max(6))
    .default([]),
  energyType: z.enum(["ICE", "NEW_ENERGY"]).default("ICE"),
});

const PLATE_PREFIXES = [
  "湘A", "川A", "贵A", "云A", "鄂A", "粤B", "浙B", "苏A", "沪C",
  "京N", "冀A", "鲁A", "豫A", "陕A", "皖A", "闽A", "赣A", "黑A", "辽A",
  "吉A", "晋A", "甘A", "桂A", "琼A", "蒙A", "宁A", "新A", "青A", "藏A",
];

function plateFor(code: string, original: string): string {
  const m = code.match(/(\d+)/);
  const n = m ? parseInt(m[1], 10) : 0;
  const prefix = PLATE_PREFIXES[n % PLATE_PREFIXES.length];
  const parts = original.split("·");
  if (parts.length >= 2) {
    return `${prefix}·${parts.slice(1).join("·")}`;
  }
  if (/^[\u4e00-\u9fa5][A-Z]/.test(original)) {
    return prefix + original.slice(2);
  }
  return original;
}

export async function GET() {
  const vehicles = await db.vehicle.findMany({
    include: {
      inspections: {
        orderBy: { version: "desc" },
        take: 1,
        include: {
          items: { select: { checkItemId: true, resultStatus: true, result: true, isAbnormal: true } },
          templateVersion: {
            select: {
              sections: {
                select: { positions: { select: { checkItems: { select: { id: true } } } } },
              },
            },
          },
          _count: { select: { items: true } },
        },
      },
      marketSnapshots: { orderBy: { capturedAt: "desc" }, take: 1 },
      _count: { select: { salesCases: true } },
    },
    orderBy: { code: "asc" },
  });

  return Response.json(
    vehicles.map((vehicle) => {
      const price = VEHICLE_PRICE_MAP[vehicle.code];
      const marketSnapshots = (vehicle.marketSnapshots ?? []).map((snap) =>
        price
          ? {
              ...snap,
              marketLow: price.marketLow,
              marketMedian: price.marketMedian,
              marketHigh: price.marketHigh,
              conditionAdjustedLow: price.conditionAdjustedLow ?? Math.round(price.marketMedian * 0.61),
              conditionAdjustedHigh: price.conditionAdjustedHigh ?? Math.round(price.marketMedian * 0.69),
            }
          : snap,
      );
      return {
        ...vehicle,
        plateNo: plateFor(vehicle.code, vehicle.plateNo),
        newCarPrice: price?.newCarPrice ?? null,
        marketSnapshots,
        inspections: vehicle.inspections.map((inspection) => {
          const templateItemCount = inspection.templateVersion
            ? countTemplateItems(inspection.templateVersion)
            : inspection._count.items;
          const inspectionSummary = buildInspectionSummary({
            status: inspection.status,
            templateTotal: templateItemCount,
            items: inspection.items,
          });
          return { ...inspection, templateVersion: undefined, templateItemCount, inspectionSummary };
        }),
      };
    }),
  );
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return Response.json({ error: "请求格式不正确，需传入 JSON 数据" }, { status: 400 });
  }

  const parsed = vehicleSchema.safeParse(body);
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
  try {
    const created = await db.$transaction(async (tx) => {
      // 预先排查编号或 VIN 重复并给出明确提示
      const duplicate = await tx.vehicle.findFirst({
        where: {
          OR: [{ code: data.code }, { vin: data.vin }],
        },
        select: { code: true, vin: true },
      });
      if (duplicate) {
        if (duplicate.code === data.code) throw new Error(`车辆编号「${data.code}」已被占用，请使用其他编号`);
        throw new Error(`车架号（VIN）「${data.vin}」已存在于系统中`);
      }

      const templateCode = data.energyType === "NEW_ENERGY" ? "NEW_ENERGY_VEHICLE" : "STANDARD_VEHICLE";
      const templateVersion = await tx.inspectionTemplateVersion.findFirst({
        where: { status: "PUBLISHED", template: { code: templateCode, active: true } },
        orderBy: { version: "desc" },
      });
      if (!templateVersion) throw new Error("所选能源类型没有可用的已发布鉴定模板");

      const registrationDate = data.registrationDate
        ? new Date(`${data.registrationDate}T00:00:00.000Z`)
        : new Date(`${data.modelYear}-01-01T00:00:00.000Z`);
      if (Number.isNaN(registrationDate.getTime())) throw new Error("首次挂牌日期不合法");

      const vehicle = await tx.vehicle.create({
        data: {
          code: data.code,
          vin: data.vin,
          plateNo: data.plateNo,
          brand: data.brand,
          series: data.series,
          model: data.model,
          modelYear: data.modelYear,
          registrationDate,
          mileage: data.mileage,
          listingPrice: data.listingPrice,
          coverImage: data.coverImage ?? null,
          displayTags: JSON.stringify(data.displayTags),
          energyType: data.energyType,
          status: "AVAILABLE",
        },
      });

      const inspection = await tx.inspection.create({
        data: {
          vehicleId: vehicle.id,
          templateVersionId: templateVersion.id,
          version: 1,
          inspectionDate: new Date(),
          inspectorName: REPORT_INSPECTOR_NAME,
          reviewerName: REPORT_REVIEWER_NAME,
          overallRiskLevel: "UNASSESSED",
          summary: "尚未完成全量模板核验。",
          status: "DRAFT",
          startedAt: new Date(),
          lastSavedAt: new Date(),
        },
      });

      return {
        vehicle,
        inspection,
        templateVersion: { id: templateVersion.id, version: templateVersion.version, code: templateCode },
      };
    });

    return Response.json(created, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("已被占用") || error.message.includes("已存在于系统中")) {
        return Response.json({ error: error.message }, { status: 409 });
      }
      if (error.message.includes("没有可用的已发布鉴定模板")) {
        return Response.json({ error: error.message }, { status: 409 });
      }
      if (error.message.includes("首次挂牌日期不合法")) {
        return Response.json({ error: error.message }, { status: 400 });
      }
    }
    return Response.json({ error: "车辆编号或 VIN 已存在，请检查后重试" }, { status: 409 });
  }
}
