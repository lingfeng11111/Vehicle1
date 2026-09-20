export const FOCUS_LABELS = {
  SAFETY: "安全",
  STRUCTURE: "结构风险",
  MAINTENANCE: "后期维修成本",
  AFTER_COST: "后期维修成本",
  RELIABILITY: "可靠性",
  PRICE: "价格",
  ENERGY: "油耗 / 能耗",
  APPEARANCE: "外观",
  EXTERIOR: "外观",
  SPACE: "空间",
  VALUE: "保值率",
  RESALE_VALUE: "保值率",
  COMFORT: "舒适性",
  POWER: "动力性能",
  CONFIGURATION: "智能配置",
  AFTER_SALES: "售后保障",
} as const;

export type FocusCode = keyof typeof FOCUS_LABELS;

export const FOCUS_RULES: Record<FocusCode, { bonus: number; categories: string[]; keywords: string[] }> = {
  SAFETY: { bonus: 5, categories: ["STRUCTURE", "DOCUMENT"], keywords: ["安全", "纵梁", "结构", "气囊", "制动"] },
  STRUCTURE: { bonus: 5, categories: ["STRUCTURE"], keywords: ["纵梁", "结构", "翼子板", "车身"] },
  MAINTENANCE: { bonus: 5, categories: ["CHASSIS", "POWERTRAIN", "MECHANICAL"], keywords: ["耗损", "维修", "成本", "橡胶", "油液"] },
  AFTER_COST: { bonus: 5, categories: ["CHASSIS", "POWERTRAIN", "MECHANICAL"], keywords: ["耗损", "维修", "成本", "橡胶", "油液"] },
  RELIABILITY: { bonus: 4, categories: ["POWERTRAIN", "ELECTRICAL", "MECHANICAL"], keywords: ["发动机", "工况", "电器", "渗漏", "故障"] },
  PRICE: { bonus: 3, categories: ["EXTERIOR", "STRUCTURE"], keywords: ["价格", "补漆", "更换", "市场"] },
  ENERGY: { bonus: 3, categories: ["POWERTRAIN"], keywords: ["发动机", "油耗", "能耗"] },
  APPEARANCE: { bonus: 3, categories: ["EXTERIOR"], keywords: ["漆", "外观", "翼子板", "车门"] },
  EXTERIOR: { bonus: 3, categories: ["EXTERIOR"], keywords: ["漆", "外观", "翼子板", "车门"] },
  SPACE: { bonus: 2, categories: ["CABIN"], keywords: ["座舱", "空间", "内饰"] },
  VALUE: { bonus: 2, categories: ["DOCUMENT", "EXTERIOR"], keywords: ["里程", "保值", "价格"] },
  RESALE_VALUE: { bonus: 2, categories: ["DOCUMENT", "EXTERIOR"], keywords: ["里程", "保值", "价格"] },
  COMFORT: { bonus: 2, categories: ["CABIN", "CHASSIS"], keywords: ["舒适", "隔音", "座椅", "悬挂"] },
  POWER: { bonus: 3, categories: ["POWERTRAIN"], keywords: ["动力", "马力", "加速", "发动机"] },
  CONFIGURATION: { bonus: 2, categories: ["ELECTRICAL", "CABIN"], keywords: ["智能", "车机", "辅助驾驶", "雷达"] },
  AFTER_SALES: { bonus: 2, categories: ["DOCUMENT"], keywords: ["质保", "售后", "延保", "保养"] },
};

export const SEVERITY_LABELS = ["正常", "轻微", "一般", "严重"] as const;

export function getFocusLabel(code: string) {
  return FOCUS_LABELS[code as FocusCode] ?? code;
}
