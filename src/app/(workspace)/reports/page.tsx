"use client";

import Link from "next/link";
import { ArrowRight, Sparkles, Trash2, X, Award } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { FocusTag, StatusBadge } from "@/components/app/status-badge";
import { ReportGeneratorModal } from "@/components/features/report-generator-modal";
import { FOCUS_LABELS } from "@/config/report-rules";
import { getVehicleVisual, CAR_FALLBACK_SVG } from "@/config/vehicle-assets";
import { formatDateTime, formatMaskedName, parseJsonList } from "@/lib/format";

type Report = {
  id: string;
  version: number;
  reportMode: string;
  highlightTags: string;
  generatedAt: string;
  salesCase: { id: string; customer: { id?: string; name: string }; vehicle: { code: string; model: string; coverImage?: string | null; displayTags?: string | string[] | null } };
  inspection: { version: number; overallRiskLevel: string; templateItemCount?: number };
};
type Candidate = {
  id: string;
  customer: { name: string };
  vehicle: { code: string; model: string; coverImage?: string | null; displayTags?: string | string[] | null };
  reports: Array<{ id: string }>;
};

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [confirmingId, setConfirmingId] = useState("");
  const [deletingId, setDeletingId] = useState("");
  const [showGenerator, setShowGenerator] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[]>([]);

  const load = useCallback(
    () =>
      Promise.all([
        fetch("/api/reports").then((response) => response.json()),
        fetch("/api/sales-cases").then((response) => response.json()),
      ]).then(([nextReports, nextCandidates]) => {
        setReports(nextReports);
        setCandidates(nextCandidates);
      }),
    []
  );

  useEffect(() => {
    void load();
  }, [load]);

  async function remove(reportId: string) {
    if (confirmingId !== reportId) {
      setConfirmingId(reportId);
      return;
    }
    setDeletingId(reportId);
    const response = await fetch(`/api/reports/${reportId}`, { method: "DELETE" });
    if (response.ok) {
      setReports((current) => current.filter((report) => report.id !== reportId));
      setConfirmingId("");
    }
    setDeletingId("");
  }

  return (
    <div className="workspace-page w-full max-w-[1720px] 2xl:max-w-[1880px] mx-auto space-y-6">
      {/* 报告中心题头 */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-stone-200/80 bg-white p-6 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-xl bg-red-100 text-red-700 text-xs font-bold">
              告
            </span>
            <h2 className="text-xl font-bold tracking-tight text-stone-900 md:text-2xl">
              消费者报告
            </h2>
          </div>
          <p className="mt-1 text-xs text-stone-500">
            查看车辆鉴定结果，生成个性化购车报告。
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowGenerator((current) => !current)}
          className="inline-flex h-9 items-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-red-500 px-4 text-xs font-bold !text-white shadow-xs hover:from-red-700 hover:to-red-600 transition-all"
        >
          {showGenerator ? <X className="size-4" /> : <Sparkles className="size-4 text-amber-200" />}
          {showGenerator ? "收起" : "生成报告"}
        </button>
      </div>

      <ReportGeneratorModal
        open={showGenerator}
        candidates={candidates}
        onClose={() => setShowGenerator(false)}
      />

      {/* 报告卡片列表 */}
      <div className="space-y-4">
        {reports.map((report, index) => {
          const focus = parseJsonList(report.highlightTags);
          const visual = getVehicleVisual(report.salesCase.vehicle.code, report.salesCase.vehicle);
          const isLowRisk = report.inspection.overallRiskLevel === "LOW";
          const isMedRisk = report.inspection.overallRiskLevel === "MEDIUM";

          const cardTheme = isLowRisk
            ? {
                bg: "bg-gradient-to-r from-emerald-50/25 via-white to-white",
                badge: "text-emerald-800 bg-emerald-50 border-emerald-200/70",
                ring: "border-emerald-500/10",
              }
            : isMedRisk
            ? {
                bg: "bg-gradient-to-r from-amber-50/25 via-white to-white",
                badge: "text-amber-800 bg-amber-50 border-amber-200/70",
                ring: "border-amber-500/10",
              }
            : {
                bg: "bg-gradient-to-r from-rose-50/25 via-white to-white",
                badge: "text-rose-800 bg-rose-50 border-rose-200/70",
                ring: "border-rose-500/10",
              };

          return (
            <article
              key={report.id}
              className={`group relative overflow-hidden rounded-3xl border border-stone-200/80 ${cardTheme.bg} p-6 shadow-[0_8px_24px_-16px_rgba(28,25,23,0.35)] hover:-translate-y-0.5 hover:border-amber-300/70 hover:shadow-lg transition-all lg:grid lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_auto] lg:items-center gap-5`}
            >
              {/* 边角技术编号与几何同心圆装饰 */}
              <span className="pointer-events-none absolute right-4 top-3 font-mono text-[9px] text-stone-300 font-semibold select-none hidden sm:block">
                #REP-2025-{String(index + 1).padStart(2, "0")} · OFFICIAL APPRAISAL
              </span>
              <div
                className={`pointer-events-none absolute -right-8 -bottom-8 size-28 rounded-full border-[10px] ${cardTheme.ring} select-none`}
              />

              {/* 左侧：车辆实车写真缩略图 + 报告基本属性 */}
              <div className="flex min-w-0 items-start gap-4 relative z-10">
                <div className="relative size-16 sm:size-20 shrink-0 overflow-hidden rounded-2xl bg-stone-100 border border-stone-200/80 shadow-2xs group-hover:scale-102 transition-transform duration-300">
                  <img
                    src={visual.coverUrl}
                    alt={report.salesCase.vehicle.model}
                    onError={(e) => {
                      e.currentTarget.src = CAR_FALLBACK_SVG;
                    }}
                    className="size-full object-cover"
                  />
                  <span className="absolute bottom-0 inset-x-0 bg-black/70 text-center font-mono text-[9px] font-bold text-amber-300 py-0.2">
                    {report.salesCase.vehicle.code}
                  </span>
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-bold text-red-700 border border-red-200">
                      第 {report.version} 版
                    </span>
                    <StatusBadge value={report.reportMode === "PERSONALIZED" ? "REPORT_GENERATED" : "DRAFT"} />
                    <span className="rounded-full bg-amber-50/80 px-2 py-0.5 font-mono text-[10px] font-bold text-amber-900 border border-amber-200/60 hidden sm:inline-block">
                      {report.inspection.templateItemCount ? `${report.inspection.templateItemCount} 项认证` : "模板认证"}
                    </span>
                  </div>
                  <h3 className="mt-2 truncate text-base font-bold text-stone-900">
                    {formatMaskedName(report.salesCase.customer.name)} · {report.salesCase.vehicle.model}
                  </h3>
                  <div className="mt-1 flex items-center gap-2 text-xs text-stone-400 font-mono">
                    <span>生成日期：{formatDateTime(report.generatedAt)}</span>
                  </div>
                </div>
              </div>

              {/* 中间：鉴定指标与关注重点 */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs border-y border-stone-100/80 py-3 lg:border-0 lg:py-0 relative z-10">
                <div className="rounded-xl bg-white/90 p-2.5 border border-stone-100 shadow-2xs">
                  <span className="block text-[11px] text-stone-400">现场鉴定执行</span>
                  <span className="mt-0.5 block font-bold text-stone-800">
                    第 {report.inspection.version} 次 · 全车复验
                  </span>
                </div>
                <div className="rounded-xl bg-white/90 p-2.5 border border-stone-100 shadow-2xs">
                  <span className="block text-[11px] text-stone-400">综合车况评级</span>
                  <span
                    className={`mt-0.5 block font-bold ${
                      isLowRisk ? "text-emerald-700" : isMedRisk ? "text-amber-700" : "text-rose-700"
                    }`}
                  >
                    {isLowRisk
                      ? "✓ 低风险 · 放心了解"
                      : isMedRisk
                      ? "中风险 · 建议复核"
                      : "高风险 · 审慎决策"}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="block text-[11px] text-stone-400 mb-1 font-medium">客户核心关注点</span>
                  <div className="flex flex-wrap gap-1.5">
                    {focus.map((tag) => (
                      <FocusTag key={tag} label={FOCUS_LABELS[tag as keyof typeof FOCUS_LABELS] ?? tag} tone="amber" />
                    ))}
                    {focus.length === 0 && <span className="text-stone-400 text-xs">全车综合鉴定</span>}
                  </div>
                </div>
              </div>

              {/* 右侧：删除与进入查看报告 */}
              <div className="flex items-center justify-end gap-2.5 border-t border-stone-100/80 pt-3 lg:border-0 lg:pt-0 relative z-10">
                <button
                  type="button"
                  onClick={() => void remove(report.id)}
                  disabled={deletingId === report.id}
                  onBlur={() => setConfirmingId((current) => (current === report.id ? "" : current))}
                  className={`inline-flex h-9 items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition-colors ${
                    confirmingId === report.id
                      ? "border-rose-300 bg-rose-50 text-rose-800"
                      : "border-stone-200 text-stone-500 hover:text-rose-700 hover:border-rose-200 bg-white"
                  }`}
                >
                  <Trash2 className="size-3.5" />
                  {deletingId === report.id ? "删除中…" : confirmingId === report.id ? "确定删除？" : "删除"}
                </button>
                <Link
                  href={`/reports/${report.id}`}
                  className="inline-flex h-9.5 items-center gap-1.5 rounded-xl bg-gradient-to-r from-red-600 to-red-500 px-4 text-xs font-bold !text-white shadow-xs hover:from-red-700 hover:to-red-600 transition-all active:scale-[0.98]"
                >
                  <Award className="size-3.5 !text-amber-200" />
                  <span className="!text-white">查看消费者报告</span>
                  <ArrowRight className="size-3.5 !text-white" />
                </Link>
              </div>
            </article>
          );
        })}

        {reports.length === 0 && (
          <div className="rounded-3xl border border-dashed border-stone-200 bg-white p-16 text-center text-xs text-stone-500">
            当前没有消费者报告。请先在客户档案中选择意向车辆并生成报告。
          </div>
        )}
      </div>
    </div>
  );
}
