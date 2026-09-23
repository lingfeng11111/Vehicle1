"use client";

import Link from "next/link";
import { ArrowRight, CarFront, ClipboardCheck, Pencil, ShieldCheck, Sparkles, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { VehicleDialog } from "@/components/features/vehicle-dialog";
import { StatusBadge, VehicleStatusPair } from "@/components/app/status-badge";
import { formatDate, formatMoney, STATUS_LABELS } from "@/lib/format";

import { CAR_FALLBACK_SVG, getVehicleDisplayTags, getVehicleVisual } from "@/config/vehicle-assets";

type Vehicle = {
  id: string;
  code: string;
  vin: string;
  plateNo: string;
  brand: string;
  series: string;
  model: string;
  modelYear: number;
  mileage: number;
  listingPrice: number;
  coverImage?: string | null;
  displayTags?: string | string[] | null;
  status: string;
  inspections: Array<{
    version: number;
    status: string;
    inspectionDate: string;
    _count: { items: number };
    templateItemCount?: number;
    inspectionSummary?: { total: number; checked: number; risk: number; completionPercent: number };
  }>;
  marketSnapshots: Array<{ marketMedian: number; conditionAdjustedLow: number; conditionAdjustedHigh: number; source: string }>;
  _count: { salesCases: number };
};

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const ORDER_KEY = "vehicle-display-order-v1";
  const KIA_926_PLACEMENT_KEY = "vehicle-display-order-926-row3-second-v1";

  const loadOrder = (): string[] => {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem(ORDER_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const applyOrder = (list: Vehicle[], order: string[]): Vehicle[] => {
    if (!order.length) return list;
    const map = new Map(list.map((v) => [v.id, v]));
    const ordered = order.map((id) => map.get(id)).filter((v): v is Vehicle => Boolean(v));
    const rest = list.filter((v) => !order.includes(v.id));
    return [...ordered, ...rest];
  };

  const persistOrder = (list: Vehicle[]) => {
    try {
      window.localStorage.setItem(ORDER_KEY, JSON.stringify(list.map((v) => v.id)));
    } catch {
      /* ignore */
    }
  };

  const moveVehicleToIndex = (list: Vehicle[], code: string, targetIndex: number): Vehicle[] => {
    const currentIndex = list.findIndex((vehicle) => vehicle.code === code);
    if (currentIndex < 0 || currentIndex === targetIndex) return list;

    const next = [...list];
    const [vehicle] = next.splice(currentIndex, 1);
    if (!vehicle) return list;
    next.splice(Math.min(targetIndex, next.length), 0, vehicle);
    return next;
  };

  const handleDrop = (dropIndex: number) => {
    if (dragIndex === null || dragIndex === dropIndex) return;
    const next = [...vehicles];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(dropIndex, 0, moved);
    setVehicles(next);
    persistOrder(next);
    setDragIndex(null);
  };

  const load = () => {
    setIsLoading(true);
    return fetch("/api/vehicles")
      .then((response) => response.json())
      .then((data: Vehicle[]) => {
        const orderedVehicles = applyOrder(Array.isArray(data) ? data : [], loadOrder());
        let placementDone = false;
        try {
          placementDone = window.localStorage.getItem(KIA_926_PLACEMENT_KEY) === "done";
        } catch {
          /* continue without browser persistence */
        }

        if (!placementDone && orderedVehicles.some((vehicle) => vehicle.code === "926")) {
          const next = moveVehicleToIndex(orderedVehicles, "926", 7);
          setVehicles(next);
          persistOrder(next);
          try {
            window.localStorage.setItem(KIA_926_PLACEMENT_KEY, "done");
          } catch {
            /* continue without browser persistence */
          }
          return;
        }

        setVehicles(orderedVehicles);
      })
      .catch(() => setVehicles([]))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="workspace-page w-full max-w-[1720px] 2xl:max-w-[1880px] mx-auto space-y-6">
      {/* 顶部标题与新建车源 */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-stone-200/80 bg-white p-6 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-xl bg-red-100 text-red-700 text-xs font-bold">
              车
            </span>
            <h2 className="text-xl font-bold tracking-tight text-stone-900 md:text-2xl">
              车辆档案
            </h2>
          </div>
          <p className="mt-1 text-xs text-stone-500">
            查看展厅实车摄影、核心工况与对应车型模板的官方鉴定档案。
          </p>
          <p className="mt-0.5 text-[11px] text-amber-600/90 font-medium">
            小提示：直接拖动卡片可手动调整展厅展示顺序，刷新后保持。
          </p>
        </div>
        <div className="flex items-center gap-3">
          <VehicleDialog onCreated={load} />
        </div>
      </div>

      {/* 车辆展厅网格卡片 */}
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {isLoading ? (
          <div className="col-span-full grid gap-5 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4" aria-live="polite" aria-label="车辆档案加载中">
            {[0, 1, 2, 3].map((item) => (
              <div key={item} className="h-[32rem] animate-pulse rounded-3xl border border-stone-200/80 bg-white" />
            ))}
          </div>
        ) : vehicles.map((vehicle, index) => {
          const inspection = vehicle.inspections[0];
          const market = vehicle.marketSnapshots[0];
          const visual = getVehicleVisual(vehicle.code, vehicle);
          const inspectionSummary = inspection?.inspectionSummary;

          return (
            <article
              key={vehicle.id}
              draggable
              onDragStart={() => setDragIndex(index)}
              onDragEnd={() => setDragIndex(null)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(index)}
              className={`content-visibility-auto group flex flex-col rounded-3xl border border-stone-200/80 bg-white shadow-xs hover:shadow-xl hover:border-amber-300/80 active:border-amber-300/80 active:scale-[0.99] transition-all duration-200 overflow-hidden ${dragIndex === index ? "opacity-50 ring-2 ring-amber-400" : ""}`}
            >
              {/* 顶部高定真实车辆摄影封套 */}
              <div className="relative aspect-[16/9] w-full overflow-hidden bg-stone-100">
                <img
                  src={visual.coverUrl}
                  alt={vehicle.model}
                  loading="lazy"
                  decoding="async"
                  onError={(event) => {
                    event.currentTarget.src = CAR_FALLBACK_SVG;
                  }}
                  className="size-full object-cover transition-transform duration-700 group-hover:scale-108 group-active:scale-105"
                />
                {/* 几何圆环暗纹与微渐变遮罩 */}
                <div className="absolute -right-8 -top-8 size-36 rounded-full border-[18px] border-white/25 pointer-events-none" />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/25 to-transparent" />

                {/* 悬浮标签：车辆编号 + 最多1个核心卖点标签（超长自动截断） */}
                <div className="absolute left-3.5 top-3.5 flex items-center gap-1.5 max-w-[65%] z-10">
                  <span className="shrink-0 rounded-full bg-white/95 px-2.5 py-0.5 text-[11px] font-bold text-red-700 shadow-sm">
                    {vehicle.code}
                  </span>
                  {getVehicleDisplayTags(vehicle.code, vehicle).slice(0, 1).map((tag) => (
                    <span
                      key={tag}
                      className="truncate max-w-[130px] rounded-full bg-stone-900/80 backdrop-blur-xs px-2.5 py-0.5 text-[10px] font-medium text-white border border-white/15"
                      title={tag}
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {/* 右侧：专属编辑按钮 */}
                <div className="absolute right-3.5 top-3.5 z-10">
                  <Link
                    href={`/vehicles/${vehicle.id}/edit`}
                    className="inline-flex items-center gap-1 rounded-full bg-stone-950/75 hover:bg-stone-950/95 active:scale-95 border border-white/20 backdrop-blur-md px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm transition-all hover:scale-105"
                    title="编辑车辆档案"
                  >
                    <Pencil className="size-3 text-amber-300" />
                    <span>编辑</span>
                  </Link>
                </div>

                {/* 底部悬浮车名与价格 */}
                <div className="absolute bottom-3 left-3.5 right-3.5 flex items-end justify-between text-white">
                  <div className="min-w-0 pr-2">
                    <div className="text-[10px] text-white/75 font-mono">
                      {vehicle.plateNo} · {vehicle.modelYear}款
                    </div>
                    <h3 className="truncate text-sm font-bold tracking-tight text-white drop-shadow-xs">
                      {vehicle.model}
                    </h3>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-[9px] text-white/70">展厅挂牌价</div>
                    <div className="text-base font-extrabold text-amber-300 drop-shadow-xs">
                      {formatMoney(vehicle.listingPrice)}
                    </div>
                  </div>
                </div>
              </div>

              {/* 状态徽章条：车辆状态 + 鉴定状态与质检采样项（如 179/179项 或 鉴定中 8/179项） */}
              <div className="flex items-center gap-2 px-5 pt-3.5 pb-1 flex-wrap">
                <StatusBadge value={vehicle.status} />
                {inspection ? (
                  <span
                    className={`inline-flex shrink-0 whitespace-nowrap items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium tracking-tight shadow-xs ${
                      inspection.status === "COMPLETED"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                        : inspection.status === "IN_PROGRESS"
                        ? "border-sky-200 bg-sky-50 text-sky-800"
                        : "border-amber-200 bg-amber-50 text-amber-900"
                    }`}
                  >
                    <span
                      className={`size-1.5 shrink-0 rounded-full ${
                        inspection.status === "COMPLETED"
                          ? "bg-emerald-500"
                          : inspection.status === "IN_PROGRESS"
                          ? "bg-sky-500"
                          : "bg-amber-500"
                      }`}
                      aria-hidden="true"
                    />
                    <span>{STATUS_LABELS[inspection.status] ?? inspection.status}</span>
                    <span className="font-mono text-[11px] font-semibold opacity-85">
                      {inspectionSummary
                        ? `${inspectionSummary.checked}/${inspectionSummary.total} 项`
                        : `${inspection.templateItemCount ?? inspection._count.items} 项`}
                    </span>
                  </span>
                ) : (
                  <StatusBadge value="DRAFT" />
                )}
              </div>

              {/* 核心指标 2x2 网格 */}
              <div className="grid grid-cols-2 gap-3 p-5 pt-2 text-xs">
                <div className="rounded-xl border border-stone-100 bg-[#faf8f5] p-3">
                  <span className="block text-[11px] text-stone-400">展厅挂牌价</span>
                  <span className="mt-0.5 block text-base font-extrabold text-red-600">
                    {formatMoney(vehicle.listingPrice)}
                  </span>
                </div>

                <div className="rounded-xl border border-stone-100 bg-[#faf8f5] p-3">
                  <span className="block text-[11px] text-stone-400">表显行驶里程</span>
                  <span className="mt-0.5 block text-sm font-bold text-stone-800">
                    {vehicle.mileage.toLocaleString("zh-CN")} km
                  </span>
                </div>

                <div className="rounded-xl border border-stone-100 bg-[#faf8f5] p-3">
                  <span className="block text-[11px] text-stone-400">市场行情估价</span>
                  <span className="mt-0.5 block font-semibold text-stone-800">
                    {market ? (
                      <span className="text-sm font-bold text-stone-900 font-mono">
                        {formatMoney(market.marketMedian)}
                      </span>
                    ) : (
                      <span className="text-xs text-stone-400 font-normal">暂无估值数据</span>
                    )}
                  </span>
                </div>

                <div className="rounded-xl border border-stone-100 bg-[#faf8f5] p-3">
                  <span className="block text-[11px] text-stone-400">意向客户跟进</span>
                  <span className="mt-0.5 block font-semibold text-stone-800">
                    {vehicle._count.salesCases > 0 ? (
                      <span className="inline-flex items-center gap-1.5 text-amber-700 font-bold text-xs">
                        <Users className="size-3 text-amber-600" />
                        {vehicle._count.salesCases} 位客户关注
                      </span>
                    ) : (
                      <span className="text-xs text-stone-400">暂无关联客户</span>
                    )}
                  </span>
                </div>
              </div>

              {/* 卡片底部操作栏 */}
              <div className="mt-auto grid grid-cols-2 gap-2.5 border-t border-stone-100 bg-[#faf8f5]/60 p-3.5 text-xs">
                <Link
                  href={`/vehicles/${vehicle.id}`}
                  className="inline-flex h-8.5 items-center justify-center rounded-xl border border-stone-200 bg-white font-semibold text-stone-700 shadow-2xs hover:bg-stone-50 hover:text-stone-900 active:scale-[0.97] active:bg-stone-100 transition-all"
                >
                  查看档案
                </Link>
                {inspection ? (
                  <Link
                    href={`/inspections/${vehicle.id}`}
                    className="inline-flex h-8.5 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-red-600 to-red-500 font-semibold !text-white shadow-2xs hover:from-red-700 hover:to-red-600 active:scale-[0.97] active:opacity-90 transition-all"
                  >
                    <ClipboardCheck className="size-3.5" />
                    {inspection.status === "COMPLETED"
                      ? "查看鉴定"
                      : inspectionSummary && inspectionSummary.checked > 0
                      ? "继续鉴定"
                      : "开始鉴定"}
                  </Link>
                ) : (
                  <Link
                    href={`/inspections/${vehicle.id}`}
                    className="inline-flex h-8.5 items-center justify-center gap-1.5 rounded-xl border border-dashed border-stone-200 bg-white font-semibold text-stone-500 hover:bg-stone-50 active:scale-[0.97] transition-all"
                  >
                    创建鉴定
                  </Link>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {!isLoading && vehicles.length === 0 && (
        <div className="rounded-3xl border border-dashed border-stone-200 bg-white px-6 py-16 text-center text-stone-400">
          <CarFront className="size-8 mx-auto text-stone-300" />
          <p className="mt-2 text-xs font-semibold text-stone-600">暂无入库车辆档案</p>
        </div>
      )}
    </div>
  );
}
