import { LOST_REASON_LABELS, RESULT_LABELS, STATUS_LABELS } from "@/lib/format";
import {
  INSPECTION_STATUS_DOT_TONES,
  INSPECTION_STATUS_LABELS,
  INSPECTION_STATUS_TONES,
  isInspectionStatus,
} from "@/config/inspection-status";

export function StatusBadge({ value }: { value: string }) {
  const label =
    (isInspectionStatus(value) ? INSPECTION_STATUS_LABELS[value] : undefined) ??
    STATUS_LABELS[value] ??
    RESULT_LABELS[value] ??
    LOST_REASON_LABELS[value] ??
    "待更新";

  let colorStyle = "border-line bg-secondary text-foreground";
  let dotColor = "bg-stone-400";

  if (isInspectionStatus(value)) {
    colorStyle = INSPECTION_STATUS_TONES[value];
    dotColor = INSPECTION_STATUS_DOT_TONES[value];
  } else if (value === "CONVERTED" || value === "COMPLETED" || value === "AVAILABLE" || value === "PASS" || value === "CLEAR") {
    colorStyle = "border-emerald-200 bg-emerald-50 text-emerald-800";
    dotColor = "bg-emerald-500";
  } else if (value === "HIGH" || value === "ABNORMAL") {
    colorStyle = "border-red-200 bg-red-50 text-red-700";
    dotColor = "bg-red-500";
  } else if (value === "REJECTED" || value === "STOPPED") {
    colorStyle = "border-rose-200 bg-rose-50 text-rose-800";
    dotColor = "bg-rose-500";
  } else if (value === "PENDING" || value === "MEDIUM" || value === "REVIEW_REQUIRED" || value === "HOLD_FOR_REVIEW" || value === "REPAIR_REVIEW") {
    colorStyle = "border-amber-200 bg-amber-50 text-amber-900";
    dotColor = "bg-amber-500";
  } else if (value === "LOW") {
    colorStyle = "border-emerald-200 bg-emerald-50 text-emerald-800";
    dotColor = "bg-emerald-500";
  } else if (value === "NEW" || value === "COMMUNICATING") {
    colorStyle = "border-red-200 bg-red-50 text-red-700";
    dotColor = "bg-red-500";
  }

  return (
    <span className={`inline-flex shrink-0 whitespace-nowrap items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium tracking-tight shadow-xs ${colorStyle}`}>
      <span className={`size-1.5 shrink-0 rounded-full ${dotColor}`} aria-hidden="true" />
      <span className="whitespace-nowrap">{label}</span>
    </span>
  );
}

export function VehicleStatusPair({ vehicleStatus, inspectionStatus }: { vehicleStatus: string; inspectionStatus?: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center gap-1.5">
        <span className="text-[11px] font-medium text-muted-foreground">车辆状态</span>
        <StatusBadge value={vehicleStatus} />
      </span>
      {inspectionStatus && (
        <span className="inline-flex items-center gap-1.5">
          <span className="text-[11px] font-medium text-muted-foreground">鉴定状态</span>
          <StatusBadge value={inspectionStatus} />
        </span>
      )}
    </div>
  );
}

export function FocusTag({ label, tone = "blue" }: { label: string; tone?: "blue" | "teal" | "amber" }) {
  let classes = "border-red-200 bg-red-50/80 text-red-800";
  if (tone === "teal") {
    classes = "border-emerald-200 bg-emerald-50/80 text-emerald-800";
  } else if (tone === "amber") {
    classes = "border-amber-200 bg-amber-50/80 text-amber-900";
  }

  return (
    <span className={`inline-flex items-center rounded-lg border px-2.5 py-1 text-xs font-medium shadow-xs ${classes}`}>
      {label}
    </span>
  );
}
