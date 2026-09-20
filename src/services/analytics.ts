export type FunnelRow = { label: string; value: number; color: "blue" | "sky" | "teal" | "amber" };

export function conversionRate(numerator: number, denominator: number) {
  return denominator === 0 ? 0 : Math.round((numerator / denominator) * 1000) / 10;
}

export function buildFunnelRows(counts: { leads: number; contacted: number; reports: number; converted: number }): FunnelRow[] {
  return [
    { label: "新线索", value: counts.leads, color: "blue" },
    { label: "已沟通", value: counts.contacted, color: "sky" },
    { label: "已生成报告", value: counts.reports, color: "sky" },
    { label: "成交", value: counts.converted, color: "teal" },
  ];
}
