import { db } from "@/lib/db";
import { getMediaContentSummary } from "@/data/media-sandbox";
import { parseJsonList } from "@/lib/format";

export async function GET() {
  const [demands, abnormalItems, cases] = await Promise.all([
    db.customerDemand.findMany({ select: { focusTags: true, riskConcerns: true } }),
    db.inspectionItem.findMany({ where: { resultStatus: { in: ["ABNORMAL", "BLOCKED"] } }, select: { itemName: true, category: true, severity: true }, take: 100 }),
    db.salesCase.findMany({ select: { result: true } }),
  ]);
  const count = (values: string[]) => [...values.reduce((map, value) => map.set(value, (map.get(value) ?? 0) + 1), new Map<string, number>())].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  const focus = demands.flatMap((item) => [...parseJsonList(item.focusTags), ...parseJsonList(item.riskConcerns)]);
  const vehicle = abnormalItems.map((item) => item.category || item.itemName);
  return Response.json({
    customerSignals: count(focus).slice(0, 6),
    vehicleSignals: count(vehicle).slice(0, 6),
    content: getMediaContentSummary(),
    facts: { customers: demands.length, abnormalities: abnormalItems.length, cases: cases.length, converted: cases.filter((item) => item.result === "CONVERTED").length },
  });
}
