"use client";

import Link from "next/link";
import { ArrowRight, BarChart3, CarFront, Clock3, Plus, RadioTower, Sparkles, Target, UsersRound, TrendingUp, Flame, ShieldCheck } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { FOCUS_LABELS } from "@/config/report-rules";
import { formatDateTime, formatMaskedName, formatMoney, RESULT_LABELS, STATUS_LABELS } from "@/lib/format";
import { getVehicleVisual } from "@/config/vehicle-assets";

type Overview = {
  metrics: { leads: number; consultations: number; reports: number; conversions: number; reportCount: number; customerCount: number; vehicleCount: number; pending: number };
  sources: Array<{ code: string; name: string; leads: number; consultations: number; reports: number; conversions: number }>;
  focusCounts: Array<{ code: string; count: number }>;
  cases: Array<{ id: string; customer: { id: string; name: string }; vehicle: { model: string }; stage: string; result: string; updatedAt: string }>;
};

type DashboardVehicle = {
  id: string;
  code: string;
  brand: string;
  series: string;
  model: string;
  modelYear: number;
  plateNo: string;
  listingPrice: number;
  coverImage?: string | null;
  displayTags?: string | string[] | null;
  energyType: string;
  status: string;
  inspections?: Array<{
    status: string;
    inspectionSummary?: { total: number; risk: number; completionPercent: number };
  }>;
};

type MetricKey = "leads" | "consultations" | "reports" | "conversions";

const metricItems: Array<{ key: MetricKey; label: string; desc: string }> = [
  { key: "leads", label: "新线索", desc: "新增客户" },
  { key: "consultations", label: "沟通中", desc: "已完成沟通" },
  { key: "reports", label: "待沟通", desc: "已生成报告" },
  { key: "conversions", label: "已成交", desc: "成交客户" },
];

const defaultMetrics: Overview["metrics"] = { leads: 0, consultations: 0, reports: 0, conversions: 0, reportCount: 0, customerCount: 0, vehicleCount: 0, pending: 0 };
const featuredVehicleOrder: string[] = ["001", "V004", "V001"];

export default function DashboardPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [vehicles, setVehicles] = useState<DashboardVehicle[]>([]);

  useEffect(() => {
    void Promise.all([fetch("/api/overview"), fetch("/api/vehicles")])
      .then(async ([overviewResponse, vehiclesResponse]) => {
        const [overview, vehicleList] = await Promise.all([overviewResponse.json(), vehiclesResponse.json()]);
        setData(overview);
        setVehicles(Array.isArray(vehicleList) ? vehicleList : []);
      })
      .catch(() => {
        setData(null);
        setVehicles([]);
      });
  }, []);

  const metrics = data?.metrics ?? defaultMetrics;
  const focusItems = [...(data?.focusCounts ?? [])].sort((left, right) => right.count - left.count).slice(0, 3);
  const maxFocusCount = Math.max(...focusItems.map((focus) => focus.count), 1);
  const conversionRateValue = metrics.leads ? Math.min(100, Math.max(0, (metrics.conversions / metrics.leads) * 100)) : 0;
  const conversionRate = conversionRateValue.toFixed(1);
  const availableVehicles = vehicles.filter((vehicle) => vehicle.status === "AVAILABLE");
  const featuredVehicleCodes = new Set(featuredVehicleOrder);
  const featuredVehicles = [
    ...featuredVehicleOrder
      .map((code) => availableVehicles.find((vehicle) => vehicle.code === code))
      .filter((vehicle): vehicle is DashboardVehicle => vehicle !== undefined),
    ...availableVehicles.filter((vehicle) => !featuredVehicleCodes.has(vehicle.code)),
  ].slice(0, 3);

  return (
    <div className="min-w-0 bg-[#faf8f5] w-full max-w-[1720px] 2xl:max-w-[1880px] mx-auto space-y-6">
      {/* 经营决策大盘 Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-stone-200/80 bg-white shadow-xs" aria-label="经营决策总览">
        {/* 工业技术四角标 */}
        <span className="pointer-events-none absolute left-3 top-3 font-mono text-xs text-stone-300 select-none">┌</span>
        <span className="pointer-events-none absolute right-3 top-3 font-mono text-xs text-stone-300 select-none">┐</span>
        <span className="pointer-events-none absolute left-3 bottom-3 font-mono text-xs text-stone-300 select-none">└</span>
        <span className="pointer-events-none absolute right-3 bottom-3 font-mono text-xs text-stone-300 select-none">┘</span>

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 px-6 py-4 relative z-10 bg-gradient-to-r from-stone-50/60 via-white to-white">
          <div className="flex items-center gap-2.5">
            <span className="flex size-7 items-center justify-center rounded-xl bg-red-100 text-red-700 text-xs font-bold shadow-2xs">
              盘
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight text-stone-900">经营工作台</h2>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200/70 flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  实时运转中
                </span>
              </div>
              <p className="text-[11px] text-stone-400 font-mono">车城全域线索调度、全量实车采样与转化漏斗总览</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-900 border border-amber-200/70">
              今日动态流
            </span>
            <Button
              nativeButton={false}
              render={<Link href="/customers" />}
              className="rounded-xl bg-gradient-to-r from-red-600 to-red-500 px-4 text-xs font-bold text-white shadow-sm hover:from-red-700 hover:to-red-600"
            >
              <Plus className="size-3.5 mr-1" />
              新建客户线索
            </Button>
          </div>
        </div>

        <div className="grid min-w-0 xl:grid-cols-[minmax(0,1fr)_340px] 2xl:grid-cols-[minmax(0,1fr)_380px]">
          {/* 左侧 4 阶段漏斗 */}
          <div className="grid grid-cols-2 divide-x divide-y divide-stone-100 sm:grid-cols-4 sm:divide-y-0 bg-white">
            {metricItems.map((item, index) => (
              <ConversionStage
                key={item.key}
                index={index}
                label={item.label}
                desc={item.desc}
                value={metrics[item.key]}
                retention={retentionLabel(metrics[item.key], index === 0 ? undefined : metrics[metricItems[index - 1].key])}
                progress={metrics.leads ? (metrics[item.key] / metrics.leads) * 100 : 0}
                accent={item.key === "conversions"}
              />
            ))}
          </div>

          {/* 右侧转化率概览 */}
          <aside className="relative overflow-hidden flex min-w-0 flex-col border-t border-stone-100 bg-gradient-to-br from-[#fffdfa] via-[#fffaf0] to-[#fef5e7] p-5 xl:border-l xl:border-t-0" aria-label="转化结果">
            {/* 几何圆环暗纹 */}
            <div className="absolute -right-10 -top-10 size-40 rounded-full border-[22px] border-amber-500/10 pointer-events-none" />
            <div className="absolute -right-4 top-16 size-24 rounded-full border-[10px] border-red-500/5 pointer-events-none" />

            <div className="relative flex items-start justify-between">
              <div>
                <span className="text-xs font-semibold text-amber-950 flex items-center gap-1">
                  <TrendingUp className="size-3.5 text-red-600" />
                  整体成交率
                </span>
                <div className="mt-2 text-4xl font-extrabold tracking-tight text-red-600">
                  {conversionRate}
                  <span className="text-base font-bold ml-1 text-stone-600">%</span>
                </div>
              </div>
              <Link href="/customers" className="inline-flex items-center gap-1 text-xs font-bold text-red-700 hover:underline">
                查看客户线索 <ArrowRight className="size-3.5" />
              </Link>
            </div>

            <div className="relative mt-3 h-2 overflow-hidden rounded-full bg-amber-200/50">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-500 to-red-600 transition-all duration-500"
                style={{ width: `${conversionRateValue}%` }}
              />
            </div>

            <div className="relative mt-5 grid grid-cols-3 divide-x divide-amber-200/60 rounded-2xl bg-white/80 p-2 border border-amber-200/60 shadow-2xs">
              <ConsoleStat label="待跟进" value={metrics.pending} icon={<Clock3 className="size-3.5" />} />
              <ConsoleStat label="车源库" value={metrics.vehicleCount} icon={<CarFront className="size-3.5" />} />
              <ConsoleStat label="客户数" value={metrics.customerCount} icon={<UsersRound className="size-3.5" />} />
            </div>
          </aside>
        </div>
      </section>

      {/* 展厅在售主打车源展台（高质量真实汽车摄影 + 几何封套） */}
      <section className="space-y-3" aria-label="展厅在售主打车源">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="flex size-6 items-center justify-center rounded-lg bg-red-100 text-red-700 text-xs font-bold">
              展
            </span>
            <h3 className="text-sm font-bold text-stone-900 tracking-tight">展厅在售精选 · 真实车源</h3>
          </div>
          <Link href="/vehicles" className="inline-flex items-center gap-1 text-xs font-bold text-red-700 hover:underline">
            进入完整车源库 ({metrics.vehicleCount}) <ArrowRight className="size-3.5" />
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {featuredVehicles.map((car) => {
            const visual = getVehicleVisual(car.code, car);
            const inspection = car.inspections?.[0];
            const inspectionSummary = inspection?.inspectionSummary;
            const vehicleTag = car.energyType === "NEW_ENERGY" ? "新能源" : car.series;
            const inspectionLabel = inspection?.status === "COMPLETED" || inspection?.status === "BLOCKED" ? "已完成鉴定" : "待完成鉴定";
            return (
              <Link
                key={car.code}
                href={`/vehicles/${car.id}`}
                className="group relative overflow-hidden rounded-3xl border border-stone-200/80 bg-white shadow-xs transition-all duration-300 hover:border-amber-300/80 hover:shadow-lg"
              >
                <div className="relative aspect-[16/9] w-full overflow-hidden bg-stone-100">
                  <img
                    src={visual.coverUrl}
                    alt={`${car.brand} ${car.model}`}
                    className="size-full object-cover transition-transform duration-700 group-hover:scale-108"
                  />
                  <div className="absolute -right-8 -top-8 size-32 rounded-full border-[16px] border-white/20 pointer-events-none" />
                  <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/20 to-transparent" />

                  <div className="absolute left-3 top-3 flex items-center gap-1.5">
                    <span className="rounded-full bg-white/95 px-2.5 py-0.5 text-[10px] font-bold text-red-700 shadow-sm">
                      {car.code}
                    </span>
                    <span className="rounded-full bg-stone-900/80 backdrop-blur-xs px-2 py-0.5 text-[10px] font-medium text-white border border-white/15">
                      {vehicleTag}
                    </span>
                  </div>

                  <div className="absolute right-3 top-3">
                    <span className={`rounded-full backdrop-blur-xs px-2 py-0.5 text-[10px] font-semibold text-white flex items-center gap-1 shadow-sm border ${inspectionLabel === "已完成鉴定" ? "bg-emerald-600/90 border-emerald-400/30" : "bg-amber-600/90 border-amber-400/30"}`}>
                      {inspectionLabel === "已完成鉴定" ? <ShieldCheck className="size-3" /> : <Clock3 className="size-3" />}
                      {inspectionLabel}
                    </span>
                  </div>

                  <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between text-white">
                    <div className="min-w-0 pr-2">
                      <div className="text-[10px] text-white/70 font-mono">{car.plateNo} · {car.modelYear}款{inspectionSummary ? ` · ${inspectionSummary.total}项` : ""}</div>
                      <h4 className="truncate text-xs font-bold text-white drop-shadow-xs">{car.brand} {car.model}</h4>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-[9px] text-white/70">展厅指导</div>
                      <div className="text-sm font-extrabold text-amber-300 drop-shadow-xs">{formatMoney(car.listingPrice)}</div>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
          {!vehicles.length && <div className="col-span-full rounded-2xl border border-dashed border-stone-200 bg-white py-10 text-center text-xs text-stone-500">正在加载在售车源…</div>}
          {vehicles.length > 0 && featuredVehicles.length === 0 && <div className="col-span-full rounded-2xl border border-dashed border-stone-200 bg-white py-10 text-center text-xs text-stone-500">当前暂无在售车源。</div>}
        </div>
      </section>

      {/* 业务分析：渠道成效与客户偏好 */}
      <section className="grid min-w-0 gap-6 xl:grid-cols-[1.15fr_0.85fr] 2xl:grid-cols-[1.25fr_0.75fr]" aria-label="业务分析">
        {/* 渠道成效 */}
        <section className="rounded-3xl border border-stone-200/80 bg-white p-6 shadow-xs">
          <SectionHeading
            title="渠道与成交效率"
            action={<Link href="/analytics" className="text-xs font-bold text-red-700 hover:underline">查看用户画像</Link>}
          />
          <div className="mt-5 min-w-0">
            <div className="grid grid-cols-[5rem_minmax(0,1fr)_3rem] gap-x-3 gap-y-2 border-b border-stone-100 pb-2.5 text-[11px] font-semibold text-stone-500 sm:grid-cols-[5.5rem_minmax(0,1fr)_2.5rem_2.5rem_2.5rem_3rem] sm:items-center">
              <span>来源渠道</span>
              <span>报告进度</span>
              <span className="text-right">成交率</span>
              <div className="col-span-3 grid grid-cols-3 gap-3 text-right sm:contents">
                <span>线索</span>
                <span>报告</span>
                <span>成交</span>
              </div>
            </div>
            {(data?.sources ?? []).map((source) => {
              const reportRate = source.leads ? (source.reports / source.leads) * 100 : 0;
              const sourceConversionRate = source.leads ? (source.conversions / source.leads) * 100 : 0;
              return (
                <div
                  key={source.code}
                  className="grid grid-cols-[5rem_minmax(0,1fr)_3rem] gap-x-3 gap-y-2 border-b border-stone-50 py-3.5 transition-colors last:border-0 hover:bg-[#faf8f5] sm:grid-cols-[5.5rem_minmax(0,1fr)_2.5rem_2.5rem_2.5rem_3rem] sm:items-center text-xs"
                >
                  <span className="font-bold text-stone-900 truncate">{source.name}</span>
                  <div className="min-w-0">
                    <div className="relative h-2 overflow-hidden rounded-full bg-stone-100" aria-label={`${source.name} 进度`}>
                      <div className="absolute inset-y-0 left-0 rounded-full bg-amber-400/70" style={{ width: `${reportRate}%` }} />
                      <div className="absolute inset-y-0 left-0 rounded-full bg-red-600" style={{ width: `${sourceConversionRate}%` }} />
                    </div>
                  </div>
                  <span className="text-right font-bold text-red-600 tabular-nums">
                    {source.leads ? `${Math.round(sourceConversionRate)}%` : "0%"}
                  </span>
                  <div className="col-span-3 grid grid-cols-3 gap-3 text-right font-medium text-stone-600 sm:contents">
                    <span>{source.leads}</span>
                    <span>{source.reports}</span>
                    <span className="font-bold text-stone-900">{source.conversions}</span>
                  </div>
                </div>
              );
            })}
            {!data && <div className="py-6 text-center text-xs text-stone-500">正在加载渠道数据…</div>}
            {data?.sources.length === 0 && <div className="py-6 text-center text-xs text-stone-500">当前没有渠道数据。</div>}
          </div>
        </section>

        {/* 客户关注偏好 */}
        <section className="rounded-3xl border border-stone-200/80 bg-white p-6 shadow-xs" aria-label="客户关注重点">
          <SectionHeading
            title="客户关注重点"
            action={<Link href="/analytics" className="text-xs font-bold text-red-700 hover:underline">查看关注重点</Link>}
          />
          <div className="mt-5 space-y-4">
            {focusItems.map((focus, index) => (
              <div key={focus.code} className="rounded-2xl border border-stone-100 bg-[#faf8f5] p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`flex size-6 items-center justify-center rounded-lg text-xs font-bold ${index === 0 ? "bg-red-600 text-white shadow-2xs" : "bg-amber-100 text-amber-900"}`}>
                      0{index + 1}
                    </span>
                    <span className="font-bold text-sm text-stone-900">
                      {FOCUS_LABELS[focus.code as keyof typeof FOCUS_LABELS] ?? "通用偏好"}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-red-700">{focus.count} 位客户关注</span>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-stone-200">
                  <div
                    className={`h-full rounded-full ${index === 0 ? "bg-gradient-to-r from-red-600 to-amber-500" : "bg-amber-500"}`}
                    style={{ width: `${(focus.count / maxFocusCount) * 100}%` }}
                  />
                </div>
              </div>
            ))}
            {!data && <div className="p-6 text-center text-xs text-stone-500">正在统计重点偏好…</div>}
            {data && focusItems.length === 0 && <div className="p-6 text-center text-xs text-stone-500">暂无客户关注数据</div>}
          </div>
        </section>
      </section>

      {/* 近期客户跟进 */}
      <section className="overflow-hidden rounded-3xl border border-stone-200/80 bg-white shadow-xs" aria-label="近期客户跟进">
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-stone-100">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-stone-900">近期客户跟进</h2>
            <p className="text-[11px] text-stone-400">查看客户、意向车辆和报告进展。</p>
          </div>
          <Link href="/customers" className="inline-flex items-center gap-1 text-xs font-bold text-red-700 hover:underline">
            查看客户线索 <ArrowRight className="size-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-xs">
            <thead className="bg-[#faf8f5] text-stone-500 border-b border-stone-100">
              <tr>
                <th className="px-6 py-3.5 font-semibold">跟进记录</th>
                <th className="px-6 py-3.5 font-semibold">客户姓名</th>
                <th className="px-6 py-3.5 font-semibold">意向车辆</th>
                <th className="px-6 py-3.5 font-semibold">当前状态</th>
                <th className="px-6 py-3.5 font-semibold">跟进结果</th>
                <th className="px-6 py-3.5 font-semibold">最近更新</th>
                <th className="px-6 py-3.5 text-right font-semibold">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {(data?.cases ?? []).map((item) => (
                <tr key={item.id} className="hover:bg-amber-50/20 transition-colors">
                  <td className="px-6 py-4 font-bold text-red-700">客户跟进</td>
                  <td className="px-6 py-4 font-bold text-stone-900">{formatMaskedName(item.customer.name)}</td>
                  <td className="px-6 py-4 text-stone-700">{item.vehicle.model}</td>
                  <td className="px-6 py-4">
                    <StageLabel value={item.stage} />
                  </td>
                  <td className="px-6 py-4">
                    <ResultLabel value={item.result} />
                  </td>
                  <td className="px-6 py-4 text-stone-400 text-[11px]">{formatDateTime(item.updatedAt)}</td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/customers/${item.customer.id}`}
                      className="inline-flex items-center gap-1 rounded-xl bg-stone-100 px-3 py-1 font-bold text-stone-800 hover:bg-red-600 hover:text-white transition-all shadow-2xs"
                    >
                      查看详情
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 px-6 py-3.5 text-xs text-stone-500">
          <span>共 {data?.cases.length ?? 0} 条跟进记录 · {metrics.vehicleCount} 辆车已完成鉴定记录</span>
          <Link href="/vehicles" className="inline-flex items-center gap-1 font-bold text-red-700 hover:underline">
            查看车辆档案 <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </section>

      {/* 底部数字化运营入口 */}
      <Link
        href="/media-intelligence"
        className="group block overflow-hidden rounded-3xl bg-gradient-to-r from-stone-900 via-stone-850 to-amber-950 p-6 text-white shadow-md transition-all hover:shadow-lg hover:-translate-y-0.5"
        aria-label="进入新媒体运营"
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-amber-500 text-white shadow-md font-bold">
              <RadioTower className="size-6" />
            </div>
            <div>
              <div className="text-[11px] font-bold tracking-widest text-amber-300">内容运营</div>
              <h3 className="text-xl font-bold tracking-tight text-white mt-0.5">新媒体运营</h3>
              <p className="text-xs text-stone-300 mt-1">
                查看内容表现，并把有效内容带来的线索接入客户跟进。
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-6 border-l border-white/20 pl-6 text-xs">
              <div>
                <div className="text-stone-400">待做选题</div>
                <div className="text-base font-bold text-amber-300">5 个</div>
              </div>
              <div>
                <div className="text-stone-400">内容表现</div>
                <div className="text-base font-bold text-white">98.4K</div>
              </div>
            </div>
            <span className="rounded-xl bg-white/10 px-4 py-2 text-xs font-bold text-white backdrop-blur-md group-hover:bg-red-600 transition-colors">
              查看新媒体 →
            </span>
          </div>
        </div>
      </Link>
    </div>
  );
}

const STAGE_THEMES = [
  { topBorder: "border-t-2 border-t-rose-500", hover: "hover:bg-rose-50/20", bar: "bg-rose-500", code: "STAGE 01" },
  { topBorder: "border-t-2 border-t-amber-500", hover: "hover:bg-amber-50/20", bar: "bg-amber-500", code: "STAGE 02" },
  { topBorder: "border-t-2 border-t-blue-500", hover: "hover:bg-blue-50/20", bar: "bg-blue-500", code: "STAGE 03" },
  { topBorder: "border-t-2 border-t-emerald-600", hover: "bg-emerald-50/30 hover:bg-emerald-50/50", bar: "bg-gradient-to-r from-emerald-500 to-teal-600", code: "STAGE 04 · 成交" },
];

function ConversionStage({
  index,
  label,
  desc,
  value,
  retention,
  progress,
  accent,
}: {
  index: number;
  label: string;
  desc?: string;
  value: number;
  retention: string;
  progress: number;
  accent?: boolean;
}) {
  const theme = STAGE_THEMES[index % STAGE_THEMES.length];
  return (
    <div
      className={`relative flex min-h-36 min-w-0 flex-col p-5 transition-all duration-200 ${theme.topBorder} ${
        accent ? "bg-emerald-50/20" : "bg-white"
      } ${theme.hover}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className={`text-xs font-bold ${accent ? "text-emerald-800" : "text-stone-700"}`}>
          {label}
        </span>
        <span className="font-mono text-[9px] font-bold text-stone-300 tracking-wider">
          {theme.code}
        </span>
      </div>
      <div className={`mt-3 text-3xl font-black tracking-tight ${accent ? "text-emerald-700" : "text-stone-900"}`}>
        {value}
      </div>
      <div className="mt-1 text-[11px] font-medium text-stone-400">{retention}</div>
      <div className="mt-auto pt-3">
        <div className="h-1.5 overflow-hidden rounded-full bg-stone-100">
          <div
            className={`h-full rounded-full transition-all duration-500 ${theme.bar}`}
            style={{ width: `${Math.min(100, progress)}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function ConsoleStat({ label, value, icon }: { label: string; value: number; icon: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-1 p-2 text-center">
      <span className="flex items-center gap-1 text-[11px] font-medium text-stone-500">
        <span className="text-red-600">{icon}</span>
        <span>{label}</span>
      </span>
      <strong className="text-base font-bold text-stone-900">{value}</strong>
    </div>
  );
}

function SectionHeading({ title, action }: { title: string; action: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h3 className="text-base font-bold tracking-tight text-stone-900">{title}</h3>
      {action}
    </div>
  );
}

function retentionLabel(current: number, previous: number | undefined) {
  if (previous === undefined) return "当前线索总量";
  if (previous === 0) return "进入下一步 0%";
  return `进入下一步 ${Math.round((current / previous) * 100)}%`;
}

function StageLabel({ value }: { value: string }) {
  const label = STATUS_LABELS[value] ?? "待更新";
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-700">
      <span className="size-1.5 rounded-full bg-amber-500" />
      {label}
    </span>
  );
}

function ResultLabel({ value }: { value: string }) {
  const label = RESULT_LABELS[value] ?? "待更新";
  let color = "text-stone-600 bg-stone-100";
  if (value === "CONVERTED") color = "text-emerald-800 bg-emerald-50 border border-emerald-200";
  if (value === "PENDING") color = "text-amber-800 bg-amber-50 border border-amber-200";
  if (value === "REJECTED") color = "text-rose-800 bg-rose-50 border border-rose-200";

  return <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${color}`}>{label}</span>;
}
