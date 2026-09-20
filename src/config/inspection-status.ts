import { AlertTriangle, Ban, CheckCircle2, Clock, ShieldAlert, type LucideIcon } from "lucide-react";

export const INSPECTION_STATUSES = ["UNCHECKED", "NORMAL", "ABNORMAL", "NOT_APPLICABLE", "BLOCKED"] as const;

export type InspectionStatus = (typeof INSPECTION_STATUSES)[number];

export const INSPECTION_STATUS_LABELS: Record<InspectionStatus, string> = {
  UNCHECKED: "待检查",
  NORMAL: "正常通过",
  ABNORMAL: "发现问题",
  NOT_APPLICABLE: "不适用",
  BLOCKED: "无法检查",
};

export const INSPECTION_STATUS_TONES: Record<InspectionStatus, string> = {
  UNCHECKED: "border-sky-200 bg-sky-50 text-sky-700",
  NORMAL: "border-emerald-200/80 bg-emerald-50 text-emerald-800",
  ABNORMAL: "border-red-200/80 bg-red-50 text-red-700",
  NOT_APPLICABLE: "border-slate-200 bg-slate-100 text-slate-600",
  BLOCKED: "border-amber-200 bg-amber-50 text-amber-800",
};

export const INSPECTION_STATUS_ICONS: Record<InspectionStatus, LucideIcon> = {
  UNCHECKED: Clock,
  NORMAL: CheckCircle2,
  ABNORMAL: ShieldAlert,
  NOT_APPLICABLE: Ban,
  BLOCKED: AlertTriangle,
};

export const INSPECTION_STATUS_ICON_TONES: Record<InspectionStatus, string> = {
  UNCHECKED: "text-sky-600",
  NORMAL: "text-emerald-600",
  ABNORMAL: "text-red-600",
  NOT_APPLICABLE: "text-slate-500",
  BLOCKED: "text-amber-600",
};

export const INSPECTION_STATUS_WRAPPER_TONES: Record<InspectionStatus, string> = {
  UNCHECKED: "bg-sky-50",
  NORMAL: "bg-emerald-50",
  ABNORMAL: "bg-red-50",
  NOT_APPLICABLE: "bg-slate-100",
  BLOCKED: "bg-amber-50",
};

export const INSPECTION_STATUS_DOT_TONES: Record<InspectionStatus, string> = {
  UNCHECKED: "bg-sky-500",
  NORMAL: "bg-emerald-500",
  ABNORMAL: "bg-red-500",
  NOT_APPLICABLE: "bg-slate-500",
  BLOCKED: "bg-amber-500",
};

export function isInspectionStatus(value: unknown): value is InspectionStatus {
  return typeof value === "string" && (INSPECTION_STATUSES as readonly string[]).includes(value);
}
