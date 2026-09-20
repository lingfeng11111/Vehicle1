"use client";

import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";
import { useState } from "react";

const STAGES = ["整理客户需求", "匹配车辆事实", "生成个性化解读", "完成报告"];

export function AiReportButton({ salesCaseId, hasReport = false }: { salesCaseId: string; hasReport?: boolean }) {
  const router = useRouter();
  const [generating, setGenerating] = useState(false);
  const [stage, setStage] = useState(0);
  const [error, setError] = useState("");

  async function generate() {
    setGenerating(true);
    setStage(0);
    setError("");
    const timers = [window.setTimeout(() => setStage(1), 400), window.setTimeout(() => setStage(2), 800)];
    try {
      const [response] = await Promise.all([
        fetch("/api/reports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ salesCaseId, reportMode: "PERSONALIZED" }) }),
        new Promise((resolve) => window.setTimeout(resolve, 1150)),
      ]);
      const report = await response.json() as { id?: string; error?: string };
      if (!response.ok || !report.id) throw new Error(report.error ?? "报告生成失败");
      setStage(3);
      router.push(`/reports/${report.id}`);
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : "报告生成失败");
      setGenerating(false);
    } finally {
      timers.forEach(window.clearTimeout);
    }
  }

  return <div className="min-w-0">
    <button type="button" onClick={generate} disabled={generating} className="inline-flex h-9 items-center gap-2 rounded-[10px] bg-brand px-3 text-sm font-medium !text-white hover:bg-brand-strong disabled:opacity-70">{generating ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}{generating ? STAGES[stage] : hasReport ? "重新生成报告" : "生成报告"}</button>
    {generating ? <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-brand-soft"><div className="h-full rounded-full bg-brand transition-[width] duration-300" style={{ width: `${((stage + 1) / STAGES.length) * 100}%` }} /></div> : null}
    {error ? <p className="mt-2 text-xs text-danger">{error}</p> : null}
  </div>;
}
