"use client";

import { ArrowRight, Check, Cpu, Loader2, RefreshCw, X, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatMaskedName } from "@/lib/format";

const STAGES = ["整理客户需求", "匹配车辆事实", "生成完整解读", "完成报告"];

export type ReportGeneratorCandidate = {
  id: string;
  customer: { name: string };
  vehicle: { code: string; model: string };
  reports: Array<{ id: string }>;
};

type ReportGeneratorModalProps = {
  open: boolean;
  candidates: ReportGeneratorCandidate[];
  onClose: () => void;
};

export function ReportGeneratorModal({ open, candidates, onClose }: ReportGeneratorModalProps) {
  if (!open) return null;

  return <ReportGeneratorModalContent candidates={candidates} onClose={onClose} />;
}

function ReportGeneratorModalContent({
  candidates,
  onClose,
}: Omit<ReportGeneratorModalProps, "open">) {
  const router = useRouter();
  const [selected, setSelected] = useState<ReportGeneratorCandidate | null>(null);
  const [generating, setGenerating] = useState(false);
  const [stage, setStage] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !generating) onClose();
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [generating, onClose]);

  async function startGeneration(candidate: ReportGeneratorCandidate) {
    setSelected(candidate);
    setGenerating(true);
    setStage(0);
    setError("");

    const timers = [
      window.setTimeout(() => setStage(1), 450),
      window.setTimeout(() => setStage(2), 1_200),
    ];

    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ salesCaseId: candidate.id, reportMode: "PERSONALIZED" }),
      });
      const payload = (await response.json().catch(() => ({}))) as { id?: string; error?: string };
      if (!response.ok || !payload.id) {
        throw new Error(payload.error || "报告生成失败，请稍后重试");
      }

      setStage(3);
      router.push(`/reports/${payload.id}`);
    } catch (generationError) {
      setGenerating(false);
      setError(generationError instanceof Error ? generationError.message : "报告生成失败，请稍后重试");
    } finally {
      timers.forEach((timer) => window.clearTimeout(timer));
    }
  }

  const progress = generating ? Math.max(8, Math.round(((stage + 1) / STAGES.length) * 100)) : 100;

  return (
    <div
      className="fixed inset-0 z-[100] flex min-h-screen items-center justify-center bg-stone-950/25 p-4 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !generating) onClose();
      }}
    >
      <div
        className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-stone-200/80 bg-[#fffdfa] text-stone-900 shadow-[0_24px_80px_-24px_rgba(120,53,15,0.28)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-generator-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="report-generator-grid pointer-events-none absolute inset-0 opacity-30" />
        <div className="report-generator-scanline pointer-events-none absolute inset-x-0 top-[-45%] h-[70%] opacity-40" />
        <div className="pointer-events-none absolute -right-28 -top-28 size-64 rounded-full border border-amber-300/20 shadow-[0_0_80px_rgba(245,158,11,0.12)]" />
        <div className="pointer-events-none absolute -bottom-40 -left-24 size-72 rounded-full border border-red-200/30" />

        <div className="relative p-5 sm:p-7">
          <header className="flex items-start justify-between gap-4 border-b border-stone-200/80 pb-5">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 text-red-600 shadow-[0_0_28px_rgba(245,158,11,0.16)]">
                <Cpu className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="font-mono text-[10px] font-semibold tracking-[0.22em] text-red-600/80">
                  AI REPORT / LIVE BUILD
                </p>
                <h2 id="report-generator-title" className="mt-1 truncate text-lg font-bold tracking-tight text-stone-900 sm:text-xl">
                  智能报告生成
                </h2>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={generating}
              aria-label="关闭生成报告"
              className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-stone-200 text-stone-500 transition-colors hover:border-red-200 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <X className="size-4" />
            </button>
          </header>

          {!selected ? (
            <div className="pt-6">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-stone-400">SELECT DATA SOURCE</p>
                  <h3 className="mt-1 text-base font-bold text-stone-900">选择客户和意向车辆</h3>
                  <p className="mt-1 text-xs text-stone-500">系统会结合客户需求与车辆鉴定事实，生成完整购车解读。</p>
                </div>
                <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 font-mono text-[10px] font-semibold text-amber-900">
                  {candidates.length} 个档案
                </span>
              </div>

              <div className="mt-5 grid max-h-[min(52vh,420px)] gap-2.5 overflow-y-auto pr-1">
                {candidates.map((candidate) => (
                  <div
                    key={candidate.id}
                    className="group flex items-center justify-between gap-3 rounded-2xl border border-amber-100 bg-white p-3.5 shadow-2xs transition-colors hover:border-amber-300 hover:bg-amber-50/30"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-sm font-bold text-stone-900">{formatMaskedName(candidate.customer.name)}</span>
                        <span className="rounded-md border border-amber-200 bg-amber-50 px-1.5 py-0.5 font-mono text-[10px] font-bold text-amber-900">
                          {candidate.vehicle.code}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-xs text-stone-600">{candidate.vehicle.model}</p>
                      <p className="mt-1 text-[10px] text-stone-400">
                        {candidate.reports.length > 0 ? `已有 ${candidate.reports.length} 份报告，可重新生成` : "尚未生成报告"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void startGeneration(candidate)}
                      className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl bg-gradient-to-r from-red-600 to-red-500 px-3 text-xs font-bold !text-white shadow-xs transition-all hover:from-red-700 hover:to-red-600 active:scale-[0.98]"
                    >
                      {candidate.reports.length > 0 ? "重新生成" : "生成报告"}
                      <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                    </button>
                  </div>
                ))}
                {candidates.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-stone-200 bg-white p-10 text-center text-xs text-stone-500">
                    暂无可生成报告的客户车辆档案。
                  </div>
                )}
              </div>

              <div className="mt-5 flex items-center gap-2 border-t border-stone-200/80 pt-4 text-[10px] text-stone-500">
                <Zap className="size-3.5 text-amber-600" />
                <span>快速生成模式 · 输出完整的需求匹配、购买建议与重点车况解读</span>
              </div>
            </div>
          ) : (
            <div className="pt-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-red-600/80">TARGET PROFILE</p>
                  <h3 className="mt-1 truncate text-base font-bold text-stone-900">
                    {formatMaskedName(selected.customer.name)} · {selected.vehicle.model}
                  </h3>
                  <p className="mt-1 font-mono text-[10px] text-stone-400">VEHICLE ID / {selected.vehicle.code}</p>
                </div>
                {generating && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 font-mono text-[10px] font-bold text-red-700">
                    <span className="size-1.5 animate-pulse rounded-full bg-red-500" /> LIVE
                  </span>
                )}
              </div>

              {generating ? (
                <>
                  <div className="mt-7 flex flex-col items-center justify-center gap-5 sm:flex-row sm:gap-7">
                    <div className="relative flex size-28 shrink-0 items-center justify-center rounded-full border border-amber-200 bg-amber-50/70 shadow-[0_0_55px_rgba(245,158,11,0.16)]">
                      <div className="absolute inset-2 animate-ping rounded-full border border-amber-300/30" />
                      <div className="absolute inset-4 rounded-full border border-dashed border-amber-300/50" />
                      <Cpu className="size-8 text-red-600" />
                      <Loader2 className="absolute -inset-1 size-[calc(100%+0.5rem)] animate-spin text-amber-600/60" />
                    </div>
                    <div className="text-center sm:text-left">
                      <p className="font-mono text-xs font-bold tracking-[0.16em] text-red-700">{STAGES[stage]}</p>
                      <p className="mt-2 text-sm font-semibold text-stone-900">正在生成消费者报告</p>
                      <p className="mt-1 max-w-sm text-xs leading-5 text-stone-500">正在读取已确认的鉴定事实并组织成完整、易读的购车建议，请稍候。</p>
                    </div>
                  </div>

                  <div className="mt-8 space-y-2.5">
                    {STAGES.map((stageName, index) => {
                      const complete = index < stage;
                      const active = index === stage;
                      return (
                        <div key={stageName} className="flex items-center gap-3">
                          <span
                            className={`flex size-6 shrink-0 items-center justify-center rounded-full border font-mono text-[10px] font-bold ${
                              complete
                                ? "border-emerald-300/40 bg-emerald-300/10 text-emerald-200"
                                : active
                                ? "border-red-200 bg-red-50 text-red-700 shadow-[0_0_18px_rgba(220,38,38,0.12)]"
                                : "border-stone-200 bg-stone-50 text-stone-400"
                            }`}
                          >
                            {complete ? <Check className="size-3.5" /> : String(index + 1).padStart(2, "0")}
                          </span>
                          <span className={`text-xs ${complete || active ? "text-stone-700" : "text-stone-400"}`}>{stageName}</span>
                          {active && <Loader2 className="ml-auto size-3.5 animate-spin text-red-600" />}
                          {complete && <span className="ml-auto font-mono text-[10px] text-emerald-300/70">DONE</span>}
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-6">
                    <div className="mb-2 flex items-center justify-between font-mono text-[10px] text-stone-400">
                      <span>BUILD PROGRESS</span>
                      <span className="text-red-700">{progress}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-stone-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-red-600 via-red-500 to-amber-500 shadow-[0_0_14px_rgba(220,38,38,0.35)] transition-[width] duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div className="mt-7 rounded-2xl border border-rose-200 bg-rose-50 p-4">
                  <div className="flex items-center gap-2 text-sm font-bold text-rose-800">
                    <Zap className="size-4 text-rose-600" />
                    报告生成未完成
                  </div>
                  <p className="mt-2 text-xs leading-5 text-rose-700/80">{error || "请重试一次；如果仍然失败，请检查模型服务配置。"}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void startGeneration(selected)}
                      className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-gradient-to-r from-red-600 to-red-500 px-3 text-xs font-bold !text-white transition-colors hover:from-red-700 hover:to-red-600"
                    >
                      <RefreshCw className="size-3.5" />
                      重新生成
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelected(null);
                        setError("");
                      }}
                      className="inline-flex h-9 items-center rounded-xl border border-stone-200 px-3 text-xs font-semibold text-stone-600 transition-colors hover:border-stone-300 hover:text-stone-900"
                    >
                      返回选择
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
