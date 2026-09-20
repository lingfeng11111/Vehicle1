"use client";

import Link from "next/link";
import { ArrowLeft, CarFront, ClipboardCheck, FileText, Pencil, Search, ShieldAlert, Sparkles, Trash2, TrendingUp, Video,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { StatusBadge } from "@/components/app/status-badge";
import { REPORT_INSPECTOR_NAME } from "@/config/report-people";
import { formatDate, formatMaskedName, formatMoney, INSPECTION_RESULT_LABELS, STATUS_LABELS } from "@/lib/format";
import { getVehicleDisplayTags, getVehicleVisual } from "@/config/vehicle-assets";
import { getInspectionZoneLabel } from "@/config/inspection-zones";
import {
  INSPECTION_STATUS_ICONS,
  INSPECTION_STATUS_ICON_TONES,
  INSPECTION_STATUS_TONES,
  isInspectionStatus,
  type InspectionStatus,
} from "@/config/inspection-status";
import { CertifiedStamp } from "@/components/app/certified-stamp";
import { getInspectionResultLabel } from "@/services/inspection-result";
import { getInspectionSeverityLabel } from "@/services/inspection-severity";

type Fact = {
  id: string;
  checkItemId: string | null;
  itemName: string;
  result: string;
  resultStatus?: string;
  isAbnormal: boolean;
  severity: number;
  zone: string;
  mediaUrl?: string | null;
  findings?: Array<{
    status?: string | null;
    criterion?: { label?: string | null; sortOrder?: number | null } | null;
  }>;
};

type InspectionSummary = {
  total: number;
  checked: number;
  normal: number;
  abnormal: number;
  blocked: number;
  risk: number;
  completionPercent: number;
};

type InspectionMeta = {
  id: string;
  version: number;
  status: string;
  inspectionDate: string;
  inspectorName: string;
  overallRiskLevel: string;
  summary: string;
  items: Fact[];
  inspectionSummary?: InspectionSummary;
};

type Vehicle = {
  id: string;
  code: string;
  vin: string;
  plateNo: string;
  brand: string;
  series: string;
  model: string;
  modelYear: number;
  registrationDate: string;
  mileage: number;
  listingPrice: number;
  newCarPrice?: number | null;
  energyType: string;
  coverImage?: string | null;
  displayTags?: string | string[] | null;
  status: string;
  inspections: InspectionMeta[];
  marketSnapshots: Array<{
    marketLow: number;
    marketMedian: number;
    marketHigh: number;
    conditionAdjustedLow: number;
    conditionAdjustedHigh: number;
    source: string;
    capturedAt: string;
  }>;
  salesCases: Array<{
    id: string;
    customer: { id: string; name: string };
    reports: Array<{ id: string; version: number }>;
  }>;
  inspectionSummary?: InspectionSummary | null;
};

type InspectionCatalog = {
  template?: {
    sections: Array<{
      code: string;
      name: string;
      positions: Array<{
        code: string;
        name: string;
        checkItems: Array<{ id: string; name: string }>;
      }>;
    }>;
  };
  inspection?: InspectionMeta;
  facts?: Fact[];
  summary?: InspectionSummary;
};

function factStatus(fact: Pick<Fact, "resultStatus" | "result" | "isAbnormal">) {
  if (isInspectionStatus(fact.resultStatus)) {
    return fact.resultStatus;
  }
  if (fact.result === "正常") return "NORMAL";
  if (fact.result === "不适用") return "NOT_APPLICABLE";
  if (fact.result === "无法检查" || fact.result === "阻断") return "BLOCKED";
  if (fact.result === "待检查" || fact.result === "未检") return "UNCHECKED";
  return fact.isAbnormal ? "ABNORMAL" : "UNCHECKED";
}

function isRiskFact(fact: Pick<Fact, "resultStatus" | "result" | "isAbnormal">) {
  const status = factStatus(fact);
  return status === "ABNORMAL" || status === "BLOCKED";
}

export default function VehicleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [catalog, setCatalog] = useState<InspectionCatalog | null>(null);
  const [factFilter, setFactFilter] = useState<"ALL" | "ABNORMAL" | "NORMAL">("ALL");
  const [query, setQuery] = useState("");

  useEffect(() => {
    void params.then(async ({ id }) => {
      const [vehicleResponse, inspectionResponse] = await Promise.all([
        fetch(`/api/vehicles/${id}`),
        fetch(`/api/inspections/${id}`),
      ]);
      if (vehicleResponse.ok) setVehicle(await vehicleResponse.json());
      if (inspectionResponse.ok) setCatalog(await inspectionResponse.json());
    });
  }, [params]);

  const completeFacts = useMemo(() => {
    if (catalog?.facts) {
      return [...catalog.facts]
        .filter((item) => item.checkItemId)
        .sort((a, b) => Number(isRiskFact(b)) - Number(isRiskFact(a)) || b.severity - a.severity);
    }
    return catalog?.inspection?.items ?? vehicle?.inspections[0]?.items ?? [];
  }, [catalog, vehicle]);

  const filteredFacts = useMemo(() => {
    const q = query.trim().toLowerCase();
    return completeFacts.filter((fact) => {
      if (factFilter === "ABNORMAL" && !isRiskFact(fact)) return false;
      if (factFilter === "NORMAL" && factStatus(fact) !== "NORMAL") return false;
      if (!q) return true;
      const zoneLabel = getInspectionZoneLabel(fact.zone).toLowerCase();
      return fact.itemName.toLowerCase().includes(q) || fact.zone.toLowerCase().includes(q) || zoneLabel.includes(q);
    });
  }, [completeFacts, factFilter, query]);

  if (!vehicle) {
    return <div className="workspace-page w-full max-w-[1720px] 2xl:max-w-[1880px] mx-auto text-xs text-stone-500 py-12">正在加载车辆档案与鉴定结果…</div>;
  }

  const inspection = catalog?.inspection ?? vehicle.inspections[0];
  const inspectionSummary = catalog?.summary ?? vehicle.inspectionSummary ?? inspection?.inspectionSummary;
  const market = vehicle.marketSnapshots[0];
  const yearsOld = Math.max(0, 2026 - vehicle.modelYear);
  const newCarPrice = vehicle.newCarPrice ?? (market ? Math.round(market.marketMedian / Math.max(0.3, 1 - yearsOld * 0.07)) : 0);
  const abnormalCount = inspectionSummary?.risk ?? completeFacts.filter(isRiskFact).length;
  const normalCount = inspectionSummary?.normal ?? completeFacts.filter((item) => factStatus(item) === "NORMAL").length;
  const totalFactCount = inspectionSummary?.total ?? completeFacts.length;
  const blockedCount = inspectionSummary?.blocked ?? completeFacts.filter((item) => factStatus(item) === "BLOCKED").length;
  const overallInspectionStatus: InspectionStatus =
    blockedCount > 0 ? "BLOCKED" : abnormalCount > 0 ? "ABNORMAL" : inspection?.status === "COMPLETED" ? "NORMAL" : "UNCHECKED";
  const OverallInspectionIcon = INSPECTION_STATUS_ICONS[overallInspectionStatus];

  return (
    <div className="workspace-page w-full max-w-[1720px] 2xl:max-w-[1880px] mx-auto space-y-6">
      {/* 顶部导航与元信息 */}
      <div className="flex items-center justify-between">
        <Link
          href="/vehicles"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-600 hover:text-red-700 transition-colors"
        >
          <ArrowLeft className="size-4" />
          返回车辆档案
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href={`/vehicles/${vehicle.id}/edit`}
            className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 shadow-2xs hover:bg-[#faf8f5] hover:text-red-700 transition-colors"
          >
            <Pencil className="size-3.5 text-amber-600" />
            编辑档案
          </Link>
          <button
            type="button"
            onClick={async () => {
              if (!confirm(`确认删除车辆「${vehicle.brand}${vehicle.series} ${vehicle.model}」？\n\n删除后关联的鉴定记录、消费者报告、客户匹配都会一并删除，此操作不可恢复。`)) return;
              const res = await fetch(`/api/vehicles/${vehicle.id}`, { method: 'DELETE' });
              if (res.ok) {
                window.location.href = '/vehicles';
              } else {
                alert('删除失败，请重试');
              }
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 shadow-2xs hover:bg-red-100 transition-colors"
          >
            <Trash2 className="size-3.5" />
            删除车辆
          </button>
          <span className="text-xs text-stone-400 font-mono">车辆档案</span>
        </div>
      </div>

      {/* 车辆档案高定摄影封面与认证印章 Hero */}
      <header className="overflow-hidden rounded-3xl border border-stone-200/80 bg-white shadow-xs">
        {(() => {
          const visual = getVehicleVisual(vehicle.code, vehicle);
          return (
            <>
              <div className="relative aspect-[21/9] sm:aspect-[24/8] w-full overflow-hidden bg-stone-900">
                <img
                  src={visual.coverUrl}
                  alt={vehicle.model}
                  className="size-full object-cover opacity-90 transition-transform duration-700 hover:scale-105"
                />
                {/* 几何圆环暗纹 */}
                <div className="absolute -right-16 -top-16 size-64 rounded-full border-[28px] border-white/20 pointer-events-none" />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/40 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-stone-950/70 via-transparent to-stone-950/50" />

                {/* 右侧官方防伪质检印章与快捷编辑 */}
                <div className="absolute right-4 sm:right-6 top-4 sm:top-6 z-10 flex items-center gap-2.5">
                  <Link
                    href={`/vehicles/${vehicle.id}/edit`}
                    className="inline-flex h-9 items-center gap-1.5 rounded-full bg-stone-950/70 hover:bg-stone-950/90 border border-white/20 backdrop-blur-md px-3.5 text-xs font-semibold text-white shadow-md transition-all hover:scale-105 hover:border-white/40"
                    title="编辑车辆档案"
                  >
                    <Pencil className="size-3.5 text-amber-300" />
                    <span>编辑档案</span>
                  </Link>
                  <div className="hidden sm:block">
                    <CertifiedStamp itemCount={totalFactCount} className="scale-100 shadow-lg" />
                  </div>
                </div>

                {/* 悬浮在摄影图下方的车辆信息 */}
                <div className="absolute bottom-4 sm:bottom-6 left-4 sm:left-6 right-4 sm:right-6 flex flex-col md:flex-row md:items-end justify-between gap-4 text-white">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-white bg-red-600/90 px-2.5 py-0.5 rounded-lg shadow-sm">
                        {vehicle.code}
                      </span>
                      {getVehicleDisplayTags(vehicle.code, vehicle).map((tag) => (
                        <span key={tag} className="rounded-full bg-white/20 backdrop-blur-xs px-2.5 py-0.5 text-xs font-semibold text-white border border-white/30">
                          {tag}
                        </span>
                      ))}
                      <span className="rounded-full bg-amber-400/90 text-stone-900 px-2.5 py-0.5 text-xs font-bold shadow-sm">
                        {vehicle.modelYear} 款
                      </span>
                    </div>
                    <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-white drop-shadow-md truncate">
                      {vehicle.model}
                    </h2>
                    <div className="mt-2 flex flex-wrap items-center gap-2.5 sm:gap-3 text-xs text-white/80 font-mono">
                      <span>车牌：<strong className="text-white">{vehicle.plateNo}</strong></span>
                      <span>·</span>
                      <span>车架号：<strong className="text-white">{vehicle.vin}</strong></span>
                      <span>·</span>
                      <span>行驶里程：{vehicle.mileage.toLocaleString()} km</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 shrink-0">
                    <div className="text-right hidden sm:block mr-2">
                      <div className="text-[10px] text-white/70">展厅指导价</div>
                      <div className="text-2xl font-black text-amber-300 drop-shadow-sm">
                        {formatMoney(vehicle.listingPrice)}
                      </div>
                    </div>
                    <StatusBadge value={vehicle.status} />
                    {inspection && (
                      <Link
                        href={`/inspections/${vehicle.id}`}
                        className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-gradient-to-r from-red-600 to-red-500 px-4 text-xs font-bold !text-white shadow-md hover:from-red-700 hover:to-red-600 transition-all"
                      >
                        <ClipboardCheck className="size-4" />
                        进入实车鉴定台 ➔
                      </Link>
                    )}
                  </div>
                </div>
              </div>

              {/* 车辆质检现场实拍多图横廊 (Gallery Preview Strip) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-[#faf8f5] p-3.5 border-t border-stone-200/80">
                {visual.gallery.map((url, i) => (
                  <div key={i} className="group relative aspect-[16/9] overflow-hidden rounded-xl bg-stone-200 border border-stone-200/70 shadow-2xs">
                    <img
                      src={url}
                      alt="质检细节"
                      className="size-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute bottom-1.5 left-2 rounded bg-stone-900/75 backdrop-blur-xs px-2 py-0.5 text-[10px] font-medium text-white shadow-xs">
                      {({ V001: ["实车姿态", "机舱", "座舱", "后备箱"], V002: ["实车姿态", "仪表台", "后排座椅", "车尾"], V003: ["实车姿态", "驾驶舱", "仪表台", "后排内饰"], V004: ["实车姿态", "仪表台", "后排内饰", "驾驶舱"], V006: ["实车姿态", "前机舱", "仪表台", "后备箱"] } as Record<string, string[]>)[vehicle.code]?.[i] ?? "外观工况"}
                    </div>
                  </div>
                ))}
              </div>
            </>
          );
        })()}
      </header>

      {/* 核心指标 Bento-Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* 卡片 1：车辆核心规格参数 */}
        <section className="rounded-3xl border border-stone-200/80 bg-white p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h3 className="text-base font-bold text-stone-900">车辆基本信息</h3>
              <span className="text-xs font-mono text-stone-400">基础信息</span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3.5">
              <SpecBox label="当前售价" value={formatMoney(vehicle.listingPrice)} highlight />
              <SpecBox label="表显里程" value={`${vehicle.mileage.toLocaleString("zh-CN")} km`} />
              <SpecBox label="品牌系列" value={`${vehicle.brand} ${vehicle.series}`} />
              <SpecBox label="款型年款" value={`${vehicle.modelYear} 款`} />
              <SpecBox label="车辆状态" value={STATUS_LABELS[vehicle.status] ?? "待更新"} />
              <SpecBox label="车辆编号" value={vehicle.code} />
              <SpecBox label="首次挂牌" value={formatDate(vehicle.registrationDate)} />
              <SpecBox label="能源类型" value={vehicle.energyType === "NEW_ENERGY" ? "新能源" : "燃油 / 混动"} />
            </div>
          </div>
        </section>

        {/* 卡片 2：质检评估综合结论 */}
        <section className="rounded-3xl border border-stone-200/80 bg-white p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <OverallInspectionIcon className={`size-4 ${INSPECTION_STATUS_ICON_TONES[overallInspectionStatus]}`} />
                <h3 className="text-base font-bold text-stone-900">鉴定结果</h3>
              </div>
              {inspection && <StatusBadge value={inspection.overallRiskLevel} />}
            </div>

            <p className="mt-4 text-xs leading-relaxed text-stone-700 bg-[#faf8f5] p-3.5 rounded-2xl border border-stone-200/60 font-medium">
              {inspection?.summary ?? "尚未录入鉴定摘要，请先完成鉴定作业。"}
            </p>

            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl border border-stone-100 bg-[#faf8f5] p-2.5">
                <span className="block text-[11px] text-stone-400">鉴定项目</span>
                <span className="mt-0.5 block text-base font-bold text-stone-900">{completeFacts.length}</span>
              </div>
              <div className="rounded-xl border border-stone-100 bg-[#faf8f5] p-2.5">
                <span className="block text-[11px] text-stone-400">正常项目</span>
                <span className="mt-0.5 block text-base font-bold text-emerald-700">{normalCount}</span>
              </div>
              <div className="rounded-xl border border-stone-100 bg-[#faf8f5] p-2.5">
                <span className="block text-[11px] text-stone-400">异常项目</span>
                <span className={`mt-0.5 block text-base font-bold ${abnormalCount > 0 ? "text-red-700" : "text-stone-400"}`}>
                  {abnormalCount}
                </span>
              </div>
            </div>

            <Link
              href={`/inspections/${vehicle.id}`}
              className="mt-3.5 flex items-center justify-center gap-1.5 w-full py-2 rounded-xl bg-red-50 text-red-700 hover:bg-red-100/80 border border-red-200/60 font-bold text-xs transition-colors"
            >
              <ClipboardCheck className="size-3.5 text-red-600" />
              进入实车鉴定作业台 ➔
            </Link>
          </div>

          <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
            <span>鉴定人员：{REPORT_INSPECTOR_NAME}</span>
            <span>{inspection ? `第${inspection.version}次鉴定 · ${formatDate(inspection.inspectionDate)}` : "待鉴定"}</span>
          </div>
        </section>

        {/* 卡片 3：行情公允估值模型 */}
        <section className="rounded-3xl border border-stone-200/80 bg-white p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <TrendingUp className="size-4 text-amber-600" />
                <h3 className="text-base font-bold text-stone-900">价格参考</h3>
              </div>
              <span className="text-[11px] text-stone-400">市场参考</span>
            </div>

            {market ? (
              <div className="mt-4 space-y-3">
                <div className="rounded-2xl border border-stone-100 bg-[#faf8f5] p-3.5">
                  <span className="block text-[11px] text-stone-400">新车指导价</span>
                  <div className="mt-1 text-lg font-bold text-stone-900">
                    {formatMoney(newCarPrice)}
                  </div>
                  <div className="mt-0.5 text-[10px] text-stone-400 font-mono">当年新车落地参考价</div>
                </div>

                <div className="rounded-2xl border border-stone-100 bg-[#faf8f5] p-3.5">
                  <span className="block text-[11px] text-stone-400">二手车市场价</span>
                  <div className="mt-1 text-lg font-bold text-stone-900">
                    {formatMoney(market.marketMedian)}
                  </div>
                  <div className="mt-0.5 text-[10px] text-stone-400 font-mono">市场区间 {(market.marketLow / 10000).toFixed(1)} – {(market.marketHigh / 10000).toFixed(1)} 万元</div>
                </div>

                <div className="rounded-2xl border border-amber-200/60 bg-gradient-to-r from-amber-50 to-orange-50 p-3.5">
                  <span className="block text-[11px] font-semibold text-amber-900">结合车况的价格区间</span>
                  <div className="mt-1 text-lg font-extrabold text-red-600">
                    {formatMoney(market.conditionAdjustedLow)} – {formatMoney(market.conditionAdjustedHigh)}
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-stone-400">当前没有价格参考</div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-stone-100 text-[11px] text-stone-400">
            当前售价 / 市场中位数：{market ? `${Math.round((vehicle.listingPrice / market.marketMedian) * 100)}%` : "—"}
          </div>
        </section>
      </div>

      {/* 意向客户商机关联 */}
      <section className="rounded-3xl border border-stone-200/80 bg-white p-6 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-stone-100">
          <div>
            <h3 className="text-base font-bold text-stone-900">关联客户</h3>
            <p className="mt-0.5 text-xs text-stone-500">已有 {vehicle.salesCases.length} 位客户将这辆车列为意向车辆</p>
          </div>
          <span className="text-xs font-semibold text-stone-400">客户关联</span>
        </div>

        <div className="mt-4 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {vehicle.salesCases.map((item) => (
            <Link
              key={item.id}
              href={`/customers/${item.customer.id}`}
              className="group flex items-center justify-between rounded-2xl border border-stone-200/80 bg-[#faf8f5] p-4 hover:border-amber-300 hover:shadow-2xs transition-all"
            >
              <div>
                <div className="mt-1 text-sm font-bold text-stone-900 group-hover:text-red-700 transition-colors">
                  {formatMaskedName(item.customer.name)}
                </div>
              </div>
              <div className="flex items-center gap-1.5 rounded-xl bg-white px-2.5 py-1 text-xs font-semibold text-stone-700 border border-stone-200/60 shadow-2xs">
                <FileText className="size-3.5 text-red-600" />
                <span>{item.reports.length} 份报告</span>
              </div>
            </Link>
          ))}
          {vehicle.salesCases.length === 0 && (
            <div className="col-span-full py-8 text-center text-xs text-stone-400">
              当前没有关联客户，可在客户档案中选择这辆车。
            </div>
          )}
        </div>
      </section>

      {/* 完整全车技术质检细目表 */}
      <section className="overflow-hidden rounded-3xl border border-stone-200/80 bg-white shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 p-5 sm:px-6">
          <div>
            <h3 className="text-base font-bold text-stone-900">车辆鉴定明细</h3>
            <p className="mt-0.5 text-xs text-stone-500">
              异常项目优先显示 · 共 {totalFactCount} 项
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={`/inspections/${vehicle.id}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-red-600 to-red-500 text-white text-xs font-bold shadow-2xs hover:from-red-700 hover:to-red-600 transition-all"
            >
              <ClipboardCheck className="size-3.5 !text-white" />
              <span>进入作业台编辑</span>
            </Link>
            <div className="flex rounded-xl border border-stone-200 bg-[#faf8f5] p-1 text-xs">
              <button
                type="button"
                onClick={() => setFactFilter("ALL")}
                className={`rounded-lg px-3 py-1 font-semibold transition-all ${
                  factFilter === "ALL" ? "bg-white text-stone-900 shadow-2xs" : "text-stone-500 hover:text-stone-900"
                }`}
              >
                全部 ({totalFactCount})
              </button>
              <button
                type="button"
                onClick={() => setFactFilter("ABNORMAL")}
                className={`rounded-lg px-3 py-1 font-semibold transition-all ${
                  factFilter === "ABNORMAL" ? "bg-red-600 !text-white shadow-2xs" : "text-stone-500 hover:text-red-700"
                }`}
              >
                异常 ({abnormalCount})
              </button>
              <button
                type="button"
                onClick={() => setFactFilter("NORMAL")}
                className={`rounded-lg px-3 py-1 font-semibold transition-all ${
                  factFilter === "NORMAL" ? "bg-white text-stone-900 shadow-2xs" : "text-stone-500 hover:text-stone-900"
                }`}
              >
                正常 ({normalCount})
              </button>
            </div>

            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-stone-400" />
              <input
                aria-label="搜索鉴定项目或部位"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="搜索鉴定项目或部位…"
                className="h-8 rounded-xl border border-stone-200 bg-[#faf8f5] pl-8 pr-3 text-xs outline-none focus:border-red-500 focus:bg-white text-stone-900"
              />
            </div>
          </div>
        </div>

        <div className="max-h-[580px] overflow-auto">
          <table className="w-full min-w-[700px] text-left text-xs">
            <thead className="sticky top-0 z-10 border-b border-stone-100 bg-[#faf8f5] text-stone-500">
              <tr>
                <th className="px-6 py-3 font-semibold align-middle">部位分区</th>
                <th className="px-6 py-3 font-semibold align-middle">鉴定项目</th>
                <th className="px-6 py-3 font-semibold align-middle">检查结果</th>
                <th className="px-6 py-3 font-semibold align-middle">风险等级</th>
                <th className="px-6 py-3 font-semibold align-middle">当前状态</th>
                <th className="px-6 py-3 font-semibold align-middle">现场影像</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredFacts.map((item) => {
                const status = factStatus(item);
                const result = getInspectionResultLabel({
                  result: item.result,
                  resultStatus: item.resultStatus,
                  isAbnormal: item.isAbnormal,
                  findings: item.findings,
                });
                return (
                <tr key={item.id} className="hover:bg-amber-50/20 transition-colors">
                  <td className="px-6 py-3.5 text-stone-500 align-middle">{getInspectionZoneLabel(item.zone)}</td>
                  <td className="px-6 py-3.5 font-bold text-stone-900 align-middle">{item.itemName}</td>
                  <td className="px-6 py-3.5 align-middle">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${INSPECTION_STATUS_TONES[status]}`}
                    >
                      {INSPECTION_RESULT_LABELS[result ?? ""] ?? result ?? "待更新"}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 text-stone-500 align-middle">
                    {getInspectionSeverityLabel(item.severity, "—")}
                  </td>
                  <td className="px-6 py-3.5 align-middle">
                    <StatusBadge value={status} />
                  </td>
                  <td className="px-6 py-3.5 align-middle">
                    {item.mediaUrl ? (
                      item.mediaUrl.endsWith('.mp4') ? (
                        <a href={item.mediaUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:underline">
                          <Video className="size-3.5" /> 查看视频
                        </a>
                      ) : (
                        <a href={item.mediaUrl} target="_blank" rel="noreferrer">
                          <img src={item.mediaUrl} alt={item.itemName} className="size-12 rounded-lg object-cover border border-stone-200 hover:scale-105 transition-transform" />
                        </a>
                      )
                    ) : (
                      <span className="text-stone-300 text-[11px]">—</span>
                    )}
                  </td>
                </tr>
                );
              })}
              {filteredFacts.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs text-stone-400">
                    没有符合筛选条件的鉴定项目
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function SpecBox({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded-xl border border-stone-100 bg-[#faf8f5] p-3">
      <span className="block text-[11px] text-stone-400">{label}</span>
      <span className={`mt-0.5 block text-sm font-bold ${highlight ? "text-red-600 text-base" : "text-stone-900"}`}>
        {value}
      </span>
    </div>
  );
}
