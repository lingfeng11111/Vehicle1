"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function CaseResultActions({ caseId, current, onUpdated }: { caseId: string; current: string; onUpdated: () => void }) {
  const [saving, setSaving] = useState(false);
  async function update(result: "PENDING" | "REJECTED" | "CONVERTED") {
    const lostReason = result === "REJECTED" ? window.prompt("未成交原因（如：价格、结构安全、后期维修成本）", "价格") ?? "其他" : undefined;
    if (result === "REJECTED" && !lostReason) return;
    setSaving(true); await fetch(`/api/sales-cases/${caseId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ result, lostReason }) }); setSaving(false); onUpdated();
  }
  return <div className="flex flex-wrap gap-2" aria-busy={saving}><Button variant="outline" disabled={saving || current === "PENDING"} onClick={() => update("PENDING")}>{saving ? "处理中…" : "暂缓跟进"}</Button><Button variant="destructive" disabled={saving || current === "REJECTED"} onClick={() => update("REJECTED")}>{saving ? "处理中…" : "记录未成交"}</Button><Button disabled={saving || current === "CONVERTED"} onClick={() => update("CONVERTED")}>{saving ? "处理中…" : "记录成交"}</Button></div>;
}
