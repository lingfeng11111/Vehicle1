export const INSPECTION_ZONES = [
  { code: "FRONT_LEFT", label: "左前方位", shortLabel: "左前", side: "left" },
  { code: "FRONT_RIGHT", label: "右前方位", shortLabel: "右前", side: "right" },
  { code: "REAR_LEFT", label: "左后方位", shortLabel: "左后", side: "left" },
  { code: "REAR_RIGHT", label: "右后方位", shortLabel: "右后", side: "right" },
  { code: "CABIN", label: "中央座舱", shortLabel: "座舱", side: "left" },
  { code: "ENGINE", label: "发动机舱", shortLabel: "机舱", side: "top" },
  { code: "TRUNK", label: "行李舱", shortLabel: "行李舱", side: "bottom" },
  { code: "POWER_ON", label: "启动通电", shortLabel: "通电", side: "right" },
  { code: "CHASSIS", label: "底盘", shortLabel: "底盘", side: "right" },
  { code: "DOCUMENTS", label: "证件与手续", shortLabel: "手续", side: "bottom" },
] as const;

export type InspectionZoneCode = (typeof INSPECTION_ZONES)[number]["code"];

export const INSPECTION_ZONE_LABELS: Record<string, string> = {
  ...Object.fromEntries(INSPECTION_ZONES.map((zone) => [zone.code, zone.label])),
  BODY: "车身",
  STRUCTURE: "车身结构",
  EXTERIOR: "外观",
  INTERIOR: "内饰",
  POWERTRAIN: "动力系统",
  ELECTRICAL: "电气系统",
  NEW_ENERGY: "新能源专项",
  GENERAL: "整车通用",
};

export function getInspectionZoneLabel(value: string | null | undefined, fallback = "车身") {
  const normalized = value?.trim();
  if (!normalized) return fallback;
  return INSPECTION_ZONE_LABELS[normalized] ?? normalized;
}
