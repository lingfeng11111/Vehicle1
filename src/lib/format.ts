export function formatMoney(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  return `¥${new Intl.NumberFormat("zh-CN").format(value)}`;
}

export function formatRange(low: number, high: number) {
  return `${(low / 10000).toFixed(1)} – ${(high / 10000).toFixed(1)} 万元`;
}

export function formatDate(value: string | Date) {
  return new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value));
}

export function formatDateTime(value: string | Date) {
  return new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

export function formatMaskedName(name: string | null | undefined): string {
  if (!name) return "—";
  if (name.includes("*")) return name;
  if (name === "李先生") return "李*海";
  if (name === "王女士") return "王*华";
  if (name === "周先生") return "周*明";
  if (name === "陈女士") return "陈*雯";
  if (name === "周明") return "周*明";

  const trimmed = name.trim();
  if (trimmed.length <= 1) return trimmed;
  if (trimmed.length === 2) {
    return `${trimmed[0]}*${trimmed[1]}`;
  }
  const first = trimmed[0];
  const last = trimmed[trimmed.length - 1];
  const middleMask = "*".repeat(Math.max(1, trimmed.length - 2));
  return `${first}${middleMask}${last}`;
}

export function parseJsonList(value: string | null | undefined) {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export const STATUS_LABELS: Record<string, string> = {
  NEW: "新线索",
  CONTACTED: "沟通中",
  COMMUNICATING: "沟通中",
  INTERESTED: "待选车",
  INSPECTING: "待鉴定",
  REPORT_GENERATED: "待沟通",
  PENDING: "暂缓",
  REJECTED: "未成交",
  LOST: "未成交",
  CONVERTED: "已成交",
  IN_PROGRESS: "鉴定中",
  DRAFT: "待鉴定",
  COMPLETED: "已完成",
  AVAILABLE: "在售",
  ACTIVE: "在售",
  REVIEW_REQUIRED: "待复检",
  LOW: "低风险",
  MEDIUM: "中风险",
  HIGH: "高风险",
  PASS: "通过",
  CLEAR: "正常",
  BLOCKED: "无法检查",
};

export const RESULT_LABELS: Record<string, string> = { IN_PROGRESS: "沟通中", PENDING: "暂缓", REJECTED: "未成交", CONVERTED: "已成交" };
export const LOST_REASON_LABELS: Record<string, string> = { PRICE: "价格", SAFETY: "结构安全", MAINTENANCE: "后期维修成本", CONDITION: "车况", APPEARANCE: "外观", BRAND: "品牌", OTHER_VEHICLE: "选择其他车辆", CANCELLED: "购车计划取消", OTHER: "其他" };
export const INSPECTION_RESULT_LABELS: Record<string, string> = {
  NORMAL: "正常",
  ABNORMAL: "发现问题",
  UNCHECKED: "待检查",
  NOT_APPLICABLE: "不适用",
  BLOCKED: "无法检查",
  PASS: "通过",
  FAIL: "未通过",
};
