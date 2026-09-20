"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CarFront, Loader2, Plus, RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";
import { VehicleStatusPair } from "@/components/app/status-badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { formatMoney, INSPECTION_RESULT_LABELS, STATUS_LABELS } from "@/lib/format";

type ExistingCase = { id: string; demandId: string; vehicle: { id: string; code: string; model: string } };
type Vehicle = {
  id: string;
  code: string;
  brand: string;
  series: string;
  model: string;
  modelYear: number;
  mileage: number;
  listingPrice: number;
  status: string;
  inspections: Array<{ status: string; overallRiskLevel: string; _count: { items: number } }>;
};

export function IntentVehiclePicker({ customerId, demandId, existingCases }: { customerId: string; demandId: string; existingCases: ExistingCase[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [error, setError] = useState("");
  const [duplicateCaseId, setDuplicateCaseId] = useState("");

  const usedVehicleIds = useMemo(() => new Set(existingCases.filter((item) => item.demandId === demandId).map((item) => item.vehicle.id)), [demandId, existingCases]);
  const existingCaseByVehicleId = useMemo(() => new Map(existingCases.filter((item) => item.demandId === demandId).map((item) => [item.vehicle.id, item])), [demandId, existingCases]);

  async function loadVehicles() {
    setLoading(true);
    setError("");
    setDuplicateCaseId("");
    try {
      const response = await fetch("/api/vehicles", { cache: "no-store" });
      const next = await response.json() as Vehicle[] & { error?: string };
      if (!response.ok) throw new Error(next.error ?? "车辆列表加载失败");
      setVehicles(Array.isArray(next) ? next : []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "车辆列表加载失败");
    } finally {
      setLoading(false);
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) return;
    setSelectedVehicleId("");
    setError("");
    setDuplicateCaseId("");
    if (vehicles.length === 0) void loadVehicles();
  }

  async function createSalesCase() {
    if (!selectedVehicleId || saving) return;
    setSaving(true);
    setError("");
    setDuplicateCaseId("");
    try {
      const response = await fetch("/api/sales-cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId, demandId, vehicleId: selectedVehicleId }),
      });
      const next = await response.json() as { id?: string; error?: string; duplicate?: boolean; salesCaseId?: string };
      if (!response.ok) {
        if (next.duplicate && next.salesCaseId) setDuplicateCaseId(next.salesCaseId);
        throw new Error(next.error ?? "意向车辆关联失败");
      }
      if (!next.id) throw new Error("意向车辆已关联，但页面暂时无法继续，请刷新后重试");
      router.push(`/customers/${customerId}?case=${next.id}`);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "意向车辆关联失败");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-700 hover:text-red-800">
          <Plus className="size-3.5" />
          关联意向车辆
        </span>
      </DialogTrigger>
      <DialogContent className="max-w-3xl bg-white rounded-3xl border border-stone-200 shadow-xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-xl bg-red-100 text-red-700 text-xs font-bold">
              选
            </span>
            <DialogTitle className="text-lg font-bold text-stone-900">为当前客户选择意向车辆</DialogTitle>
          </div>
          <DialogDescription className="text-xs text-stone-600">
            从车辆档案中选择一辆已完成鉴定的车辆，继续跟进客户需求。
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-stone-600">
            <Loader2 className="size-4 animate-spin text-red-600" />
            <span>正在加载车辆档案和鉴定结果…</span>
          </div>
        )}

        {!loading && error && vehicles.length === 0 && (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-8 text-center text-sm text-rose-800" role="alert">
            <p>{error}</p>
            <Button type="button" variant="outline" size="sm" onClick={() => void loadVehicles()}>
              <RefreshCw className="size-3.5 mr-1" />
              重新加载
            </Button>
          </div>
        )}

        {!loading && !error && vehicles.length === 0 && (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-stone-200 px-5 py-12 text-center text-sm text-stone-600 bg-[#faf8f5]">
            <CarFront className="size-8 text-stone-400" />
            <p className="font-semibold text-stone-700">当前没有可选车辆</p>
            <p className="text-xs text-stone-500">请先在“车辆档案”中新建车辆并完成鉴定。</p>
          </div>
        )}

        {!loading && vehicles.length > 0 && (
          <div className="max-h-[min(60vh,520px)] space-y-3 overflow-y-auto pr-1" aria-label="可选意向车辆">
            {vehicles.map((vehicle) => {
              const inspection = vehicle.inspections[0];
              const existingCase = existingCaseByVehicleId.get(vehicle.id);
              const alreadyUsed = usedVehicleIds.has(vehicle.id);
              const selected = selectedVehicleId === vehicle.id;

              return (
                <div key={vehicle.id}>
                  <button
                    type="button"
                    disabled={alreadyUsed || saving}
                    onClick={() => setSelectedVehicleId(vehicle.id)}
                    aria-pressed={selected}
                    className={`w-full rounded-2xl border p-4 text-left transition-all ${
                      alreadyUsed
                        ? "cursor-not-allowed border-stone-200 bg-stone-100/70 opacity-60"
                        : selected
                        ? "border-red-600 bg-red-50/50 shadow-xs ring-2 ring-red-500/20"
                        : "border-stone-200 bg-white hover:border-amber-300 hover:bg-[#faf8f5]"
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <CarFront className="size-4 shrink-0 text-red-600" />
                          <span className="font-mono text-xs font-bold text-red-700">{vehicle.code}</span>
                          {alreadyUsed && (
                            <span className="rounded-full bg-stone-200/80 px-2 py-0.5 text-[10px] font-medium text-stone-600">
                              已关联
                            </span>
                          )}
                        </div>
                        <h4 className="mt-1 truncate text-sm font-bold text-stone-900">{vehicle.model}</h4>
                        <p className="mt-0.5 text-xs text-stone-500">
                          {vehicle.brand} · {vehicle.series} · {vehicle.modelYear} 年款
                        </p>
                      </div>

                      <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                        <VehicleStatusPair vehicleStatus={vehicle.status} inspectionStatus={inspection?.status} />
                        {selected && (
                          <span className="rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-2xs">
                            ✓ 已选择
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-3 border-t border-stone-100 pt-3 text-xs sm:grid-cols-3">
                      <div>
                        <span className="block text-[11px] text-stone-500">当前售价</span>
                        <span className="mt-0.5 block text-sm font-bold text-red-600">{formatMoney(vehicle.listingPrice)}</span>
                      </div>
                      <div>
                        <span className="block text-[11px] text-stone-500">行驶里程</span>
                        <span className="mt-0.5 block font-semibold text-stone-800">{vehicle.mileage.toLocaleString("zh-CN")} km</span>
                      </div>
                      <div>
                        <span className="block text-[11px] text-stone-500">鉴定项目</span>
                        <span className="mt-0.5 block font-semibold text-stone-800">
                          {inspection?._count.items ?? 0} 项{inspection?.overallRiskLevel ? ` · ${INSPECTION_RESULT_LABELS[inspection.overallRiskLevel] ?? STATUS_LABELS[inspection.overallRiskLevel] ?? "待更新"}` : ""}
                        </span>
                      </div>
                    </div>
                  </button>
                  {existingCase && (
                    <span className="mt-1 inline-flex px-2 text-[11px] text-stone-500">
                      该车辆已在本客户的购车方案中关联
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {error && vehicles.length > 0 && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800" role="alert">
            <p>{error}</p>
            {duplicateCaseId && <p className="mt-0.5 font-medium">当前客户已经关联过这辆车，请勿重复添加。</p>}
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            取消
          </Button>
          <Button
            type="button"
            onClick={() => void createSalesCase()}
            disabled={!selectedVehicleId || saving || loading}
            className="bg-gradient-to-r from-red-600 to-red-500 text-white shadow-xs font-semibold"
          >
            {saving ? (
              <>
                <Loader2 className="size-4 animate-spin mr-1.5" />
                正在关联车辆…
              </>
            ) : (
              "关联车辆并继续"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
