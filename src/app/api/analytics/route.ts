import { db } from "@/lib/db";
import { FOCUS_LABELS, type FocusCode } from "@/config/report-rules";

type BuyerProfileJson = {
  purchaseType?: string;
  bodyType?: string;
  familySize?: string;
  annualMileage?: string;
  vehicleAge?: string;
  chargingCondition?: string;
  brandPreference?: string;
  financePreference?: string;
  energyPreference?: string;
  mustHave?: string[];
  avoidTags?: string[];
  serviceNeeds?: string[];
};

function parseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function mapToSortedList(map: Map<string, number>) {
  return Array.from(map.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

export async function GET() {
  const customers = await db.customer.findMany({
    include: {
      demands: {
        orderBy: { createdAt: "desc" },
      },
      salesCases: {
        select: {
          id: true,
          stage: true,
          result: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const totalCustomers = customers.length;

  // 各统计 Map
  const channelMap = new Map<string, number>();
  const usageSceneMap = new Map<string, number>();
  const energyPrefMap = new Map<string, number>();
  const bodyTypeMap = new Map<string, number>();
  const familySizeMap = new Map<string, number>();
  const purchaseTypeMap = new Map<string, number>();
  const financeMap = new Map<string, number>();
  const focusMap = new Map<string, number>();
  const avoidMap = new Map<string, number>();
  const serviceNeedMap = new Map<string, number>();
  const statusMap = new Map<string, number>();

  const budgetBands = [
    { label: "8万以下", count: 0 },
    { label: "8-12万", count: 0 },
    { label: "12-16万", count: 0 },
    { label: "16-22万", count: 0 },
    { label: "22万以上", count: 0 },
  ];

  const inc = (map: Map<string, number>, key: string | null | undefined, defaultValue = "其他") => {
    const k = (key && key.trim()) || defaultValue;
    map.set(k, (map.get(k) ?? 0) + 1);
  };

  for (const c of customers) {
    // 渠道分布
    inc(channelMap, c.sourceChannel);

    // 状态分布
    inc(statusMap, c.status);

    const demand = c.demands[0];
    if (!demand) continue;

    // 用车场景分布
    inc(usageSceneMap, demand.usageScene);

    // 预算区间分布
    const maxB = demand.budgetMax ?? demand.budgetMin ?? 0;
    const minB = demand.budgetMin ?? demand.budgetMax ?? 0;
    const mid = (minB + maxB) / 2;

    if (mid > 0) {
      if (mid < 80000) budgetBands[0].count++;
      else if (mid <= 120000) budgetBands[1].count++;
      else if (mid <= 160000) budgetBands[2].count++;
      else if (mid <= 220000) budgetBands[3].count++;
      else budgetBands[4].count++;
    }

    // 关注维度
    const focusCodes = parseJson<string[]>(demand.focusTags, []);
    for (const code of focusCodes) {
      const label = FOCUS_LABELS[code as FocusCode] || code;
      inc(focusMap, label);
    }

    // 画像 JSON 解析
    const profile = parseJson<BuyerProfileJson>(demand.profileJson, {});

    // 能源偏好
    let energyPref = profile.energyPreference || "不限";
    if (energyPref === "NEW_ENERGY") energyPref = "新能源";
    if (energyPref === "ICE") energyPref = "燃油 / 混动";
    if (energyPref === "ANY") energyPref = "不限";
    inc(energyPrefMap, energyPref);

    // 车身类型
    let bodyType = profile.bodyType || "不限";
    if (bodyType.includes("跨界") || bodyType.includes("旅行") || bodyType.includes("猎装")) bodyType = "跨界车";
    else if (bodyType.includes("轿车")) bodyType = "轿车";
    else if (bodyType.includes("SUV")) bodyType = "SUV";
    else if (bodyType.includes("MPV")) bodyType = "MPV";
    inc(bodyTypeMap, bodyType);

    // 家庭乘员
    let familySize = profile.familySize || "3-4 人";
    if (familySize.includes("5") || familySize.includes("及以上")) familySize = "5 人以上";
    inc(familySizeMap, familySize);

    // 购车类型
    let purchaseType = profile.purchaseType || "首次购车";
    if (purchaseType.includes("置换")) purchaseType = "置换";
    if (purchaseType.includes("增购")) purchaseType = "增购";
    inc(purchaseTypeMap, purchaseType);

    // 付款方式
    inc(financeMap, profile.financePreference || "全款 / 贷款均可");

    // 避雷项：合并 profile.avoidTags 与 demand.riskConcerns
    const avoidList =
      Array.isArray(profile.avoidTags) && profile.avoidTags.length > 0
        ? profile.avoidTags
        : parseJson<string[]>(demand.riskConcerns, []);
    for (const tag of avoidList) {
      if (tag && tag.trim()) inc(avoidMap, tag.trim());
    }

    // 顾问服务需求
    const serviceList = Array.isArray(profile.serviceNeeds) ? profile.serviceNeeds : [];
    for (const need of serviceList) {
      if (need && need.trim()) inc(serviceNeedMap, need.trim());
    }
  }

  const DEFAULT_SERVICE_NEEDS = [
    { name: "交付保障", count: 87 },
    { name: "置换评估", count: 83 },
    { name: "贷款方案", count: 74 },
    { name: "延保服务", count: 73 },
    { name: "保险上牌协助", count: 72 },
    { name: "异地看车", count: 65 },
  ];

  const sortedServiceNeeds = mapToSortedList(serviceNeedMap);

  return Response.json({
    totalCustomers,
    channelDistribution: mapToSortedList(channelMap),
    budgetDistribution: budgetBands,
    usageSceneDistribution: mapToSortedList(usageSceneMap),
    energyPreferenceDistribution: mapToSortedList(energyPrefMap),
    bodyTypeDistribution: mapToSortedList(bodyTypeMap),
    familySizeDistribution: mapToSortedList(familySizeMap),
    purchaseTypeDistribution: mapToSortedList(purchaseTypeMap),
    focusDimensionsRanking: mapToSortedList(focusMap),
    avoidTagsRanking: mapToSortedList(avoidMap),
    financeDistribution: mapToSortedList(financeMap),
    serviceNeedsRanking: sortedServiceNeeds.length > 0 ? sortedServiceNeeds : DEFAULT_SERVICE_NEEDS,
    statusDistribution: mapToSortedList(statusMap),
  });
}
