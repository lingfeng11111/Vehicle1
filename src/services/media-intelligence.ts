import { OPPORTUNITIES } from "@/data/media-sandbox";

export type MediaWeights = { history: number; customer: number; vehicle: number; goal: number };
export type MediaContext = { goal: string; audience: string; platforms: string[]; weights: MediaWeights };

export function rankOpportunities(context: MediaContext) {
  const total = Math.max(1, Object.values(context.weights).reduce((sum, value) => sum + value, 0));
  return OPPORTUNITIES.map((item) => {
    let score = item.base.reduce((sum, value, index) => sum + value * Object.values(context.weights)[index], 0) / total;
    if (context.goal === "获取线索" && ["选车攻略", "成本拆解"].includes(item.type)) score += 4;
    if (context.goal === "建立专业信任" && ["风险解释", "知识科普"].includes(item.type)) score += 4;
    if (context.audience === "首次购车" && ["车况判断", "购车预算"].includes(item.topic)) score += 3;
    if (context.audience === "家庭用户" && ["维修成本", "购车预算"].includes(item.topic)) score += 3;
    const scoreValue = Math.min(99, Math.round(score));
    return { ...item, score: scoreValue, reasons: [`客户关注度 ${item.base[1]}`, `车辆事实匹配 ${item.base[2]}`, `${context.goal}目标适配 ${item.base[3]}`] };
  }).sort((a, b) => b.score - a.score);
}
