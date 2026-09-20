"use client";

import Link from "next/link";
import {
  ArrowLeft,
  CarFront,
  Check,
  CheckCircle2,
  Clock,
  Compass,
  Edit3,
  FileText,
  Loader2,
  Phone,
  Save,
  ShieldAlert,
  Sparkles,
  Tag,
  Trash2,
  UserCheck,
  UserRound,
  Wallet,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FocusTag, StatusBadge } from "@/components/app/status-badge";
import { SopStepper, type SopStepKey } from "@/components/features/sop-stepper";
import { FOCUS_LABELS, type FocusCode } from "@/config/report-rules";
import { getVehicleVisual, CAR_FALLBACK_SVG } from "@/config/vehicle-assets";
import { formatDateTime, formatMaskedName, formatMoney, parseJsonList } from "@/lib/format";

type VehicleOption = {
  id: string;
  code: string;
  brand: string;
  series: string;
  model: string;
  listingPrice: number;
  plateNo: string;
  mileage?: number;
  coverImage?: string | null;
  displayTags?: string | string[] | null;
};

type Customer = {
  id: string;
  name: string;
  phone: string;
  sourceChannel: string;
  sourceContent: string | null;
  status: string;
  createdAt: string;
  demands: Array<{
    id: string;
    focusTags: string;
    riskConcerns: string;
    budgetMin: number | null;
    budgetMax: number | null;
    usageScene: string;
    purchaseTime: string;
    remark: string | null;
  }>;
  salesCases: Array<{
    id: string;
    demandId: string;
    stage: string;
    result: string;
    vehicle: {
      id: string;
      code: string;
      brand?: string;
      series?: string;
      model: string;
      listingPrice?: number;
      plateNo?: string;
      mileage?: number;
      coverImage?: string | null;
      displayTags?: string | string[] | null;
    };
    reports: Array<{ id: string; version: number }>;
    updatedAt: string;
  }>;
};

const COMMON_RISKS = ["重大事故隐患", "涉水泡水", "火烧痕迹", "调表翻新", "底盘老化", "机械渗漏"];
const COMMON_SCENES = ["日常家庭代步", "商务接待出行", "长途自驾巡航", "多人口全家出行", "新手练车代步"];
const COMMON_TIMELINES = ["近期 1-2 周内急提", "本月内完成选购", "1-3 个月内对比", "持续观望阶段"];
const STATUS_OPTIONS = [
  { value: "NEW", label: "新线索" },
  { value: "COMMUNICATING", label: "沟通中" },
  { value: "INTERESTED", label: "待选车" },
  { value: "INSPECTING", label: "待鉴定" },
  { value: "REPORT_GENERATED", label: "待沟通" },
  { value: "PENDING", label: "暂缓跟进" },
  { value: "CONVERTED", label: "已成交" },
  { value: "REJECTED", label: "未成交" },
];

export default function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [availableVehicles, setAvailableVehicles] = useState<VehicleOption[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!customer) return;
    if (!confirm("确定要删除这个客户吗？删除后不可恢复。")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/customers/${customer.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("删除失败");
      router.push("/customers");
      router.refresh();
    } catch (e) {
      setDeleting(false);
      setError(e instanceof Error ? e.message : "删除失败");
    }
  }

  // 编辑表单本地状态
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [editSourceChannel, setEditSourceChannel] = useState("");
  const [editBudgetMin, setEditBudgetMin] = useState<number | "">("");
  const [editBudgetMax, setEditBudgetMax] = useState<number | "">("");
  const [editUsageScene, setEditUsageScene] = useState("");
  const [editPurchaseTime, setEditPurchaseTime] = useState("");
  const [editFocusTags, setEditFocusTags] = useState<string[]>([]);
  const [editRiskConcerns, setEditRiskConcerns] = useState<string[]>([]);
  const [editRemark, setEditRemark] = useState("");
  const [editVehicleId, setEditVehicleId] = useState("");

  const loadData = () => {
    // 加载全部展厅在售车源选项供选择修改
    fetch("/api/vehicles")
      .then((res) => res.json())
      .then((vList: VehicleOption[]) => {
        if (Array.isArray(vList)) setAvailableVehicles(vList);
      })
      .catch(() => {});

    params
      .then(({ id }) => fetch(`/api/customers/${id}`))
      .then((response) => response.json())
      .then((data: Customer) => {
        setCustomer(data);
        const demand = data.demands[0];
        const activeVehicle = data.salesCases[0]?.vehicle;
        setEditName(data.name);
        setEditPhone(data.phone);
        setEditStatus(data.status);
        setEditSourceChannel(data.sourceChannel);
        setEditBudgetMin(demand?.budgetMin ?? "");
        setEditBudgetMax(demand?.budgetMax ?? "");
        setEditUsageScene(demand?.usageScene || "日常家庭代步");
        setEditPurchaseTime(demand?.purchaseTime || "近期 1-2 周内急提");
        setEditFocusTags(parseJsonList(demand?.focusTags));
        setEditRiskConcerns(parseJsonList(demand?.riskConcerns));
        setEditRemark(demand?.remark || "");
        setEditVehicleId(activeVehicle?.id || "");
      });
  };

  useEffect(() => {
    loadData();
  }, [params]);

  if (!customer) {
    return (
      <div className="workspace-page w-full max-w-[1600px] 2xl:max-w-[1760px] mx-auto py-20 text-center text-xs font-semibold text-stone-500">
        正在加载客户档案…
      </div>
    );
  }

  const demand = customer.demands[0];
  const focusTags = parseJsonList(demand?.focusTags);
  const risks = parseJsonList(demand?.riskConcerns);

  // 计算当前 SOP 阶段流水
  let currentStep: SopStepKey = "lead";
  if (customer.status === "CONVERTED" || customer.salesCases.some((c) => c.result === "CONVERTED")) {
    currentStep = "deal";
  } else if (customer.salesCases.some((c) => c.reports.length > 0)) {
    currentStep = "report";
  } else if (customer.salesCases.length > 0) {
    currentStep = "inspection";
  } else if (demand) {
    currentStep = "matching";
  }

  const toggleFocusTag = (tag: string) => {
    setEditFocusTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  const toggleRisk = (risk: string) => {
    setEditRiskConcerns((prev) => (prev.includes(risk) ? prev.filter((r) => r !== risk) : [...prev, risk]));
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSuccessMsg("");
    try {
      const response = await fetch(`/api/customers/${customer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          phone: editPhone,
          status: editStatus,
          sourceChannel: editSourceChannel,
          budgetMin: editBudgetMin === "" ? null : Number(editBudgetMin),
          budgetMax: editBudgetMax === "" ? null : Number(editBudgetMax),
          usageScene: editUsageScene,
          purchaseTime: editPurchaseTime,
          focusTags: editFocusTags,
          riskConcerns: editRiskConcerns,
          remark: editRemark,
          vehicleId: editVehicleId,
        }),
      });

      if (!response.ok) {
        throw new Error("保存客户档案失败，请稍后重试");
      }

      const updated = (await response.json()) as Customer;
      setCustomer(updated);
      setIsEditing(false);
      setSuccessMsg("客户档案已保存。");
      setTimeout(() => setSuccessMsg(""), 3500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setError("");
    const currentDemand = customer.demands[0];
    const activeVehicle = customer.salesCases[0]?.vehicle;
    setEditName(customer.name);
    setEditPhone(customer.phone);
    setEditStatus(customer.status);
    setEditSourceChannel(customer.sourceChannel);
    setEditBudgetMin(currentDemand?.budgetMin ?? "");
    setEditBudgetMax(currentDemand?.budgetMax ?? "");
    setEditUsageScene(currentDemand?.usageScene || "日常家庭代步");
    setEditPurchaseTime(currentDemand?.purchaseTime || "近期 1-2 周内急提");
    setEditFocusTags(parseJsonList(currentDemand?.focusTags));
    setEditRiskConcerns(parseJsonList(currentDemand?.riskConcerns));
    setEditRemark(currentDemand?.remark || "");
    setEditVehicleId(activeVehicle?.id || "");
  };

  const activeCase = customer.salesCases[0];
  const currentVehicle = activeCase?.vehicle;
  const latestReport = activeCase?.reports?.[0];

  return (
    <div className="workspace-page w-full max-w-[1600px] 2xl:max-w-[1760px] mx-auto space-y-6">
      {/* 顶部操作栏 */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white px-5 py-3 rounded-2xl border border-stone-200/80 shadow-xs">
        <Link
          href="/customers"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-600 hover:text-red-700 transition-colors"
        >
          <ArrowLeft className="size-4" />
          返回客户线索
        </Link>

        <div className="flex items-center gap-2">
          {successMsg && (
            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-200">
              <Check className="size-3.5" />
              {successMsg}
            </span>
          )}
          {error && <span className="text-xs font-bold text-red-600 mr-2">{error}</span>}

          {!isEditing ? (
            <>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-4 text-xs font-bold text-red-700 hover:bg-red-100 transition-colors disabled:opacity-50"
            >
              <Trash2 className="size-3.5" />
              <span>{deleting ? "删除中…" : "删除客户"}</span>
            </button>
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="inline-flex h-8 items-center gap-1.5 rounded-xl bg-stone-900 px-4 text-xs font-bold !text-white shadow-2xs hover:bg-stone-800 transition-colors"
            >
              <Edit3 className="size-3.5 !text-white" />
              <span>修改客户档案</span>
            </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCancel}
                disabled={saving}
                className="inline-flex h-8 items-center gap-1 rounded-xl border border-stone-200 bg-white px-3 text-xs font-semibold text-stone-700 hover:bg-stone-50"
              >
                <X className="size-3.5" />
                取消
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="inline-flex h-8 items-center gap-1.5 rounded-xl bg-gradient-to-r from-red-600 to-red-500 px-4 text-xs font-bold !text-white shadow-xs hover:from-red-700 hover:to-red-600 disabled:opacity-50"
              >
                {saving ? <Loader2 className="size-3.5 animate-spin !text-white" /> : <Save className="size-3.5 !text-white" />}
                <span>{saving ? "正在保存…" : "保存修改"}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 业务流水 SOP 步进器 */}
      <SopStepper currentStep={currentStep} />

      {/* 客户个人卡头 Masthead */}
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-stone-200/80 bg-white p-6 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="relative flex size-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-amber-600 text-white shadow-md shadow-red-500/15">
            <UserRound className="size-7" />
            <span className="absolute -bottom-1 -right-1 flex size-5 items-center justify-center rounded-full bg-amber-400 text-[10px] font-bold text-amber-950 ring-2 ring-white">
              ★
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              {!isEditing ? (
                <h2 className="text-2xl font-bold tracking-tight text-stone-900">{formatMaskedName(customer.name)}</h2>
              ) : (
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="客户姓名"
                  className="text-xl font-bold border-b-2 border-red-500 px-1 py-0.5 outline-none bg-amber-50/40 text-stone-900"
                />
              )}
              <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-900 border border-amber-200/70">
                {demand ? "需求已建档" : "待补充需求"}
              </span>
            </div>

            <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-stone-500">
              {!isEditing ? (
                <span className="flex items-center gap-1 font-mono">
                  <Phone className="size-3 text-stone-400" />
                  {customer.phone}
                </span>
              ) : (
                <div className="flex items-center gap-1">
                  <Phone className="size-3 text-stone-400" />
                  <input
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="联系方式"
                    className="border-b border-stone-300 font-mono text-xs px-1 outline-none text-stone-800"
                  />
                </div>
              )}
              <span>·</span>
              <span className="flex items-center gap-1">
                <Tag className="size-3 text-stone-400" />
                获客渠道：{customer.sourceChannel}
              </span>
              <span>·</span>
              <span className="font-mono text-stone-400">建档：{formatDateTime(customer.createdAt)}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-stone-500">商机阶段：</span>
          {!isEditing ? (
            <StatusBadge value={customer.status} />
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setEditStatus(opt.value)}
                  className={`rounded-xl px-2.5 py-1 text-xs font-bold transition-all ${
                    editStatus === opt.value
                      ? "bg-stone-900 !text-white shadow-xs"
                      : "bg-stone-100 text-stone-600 border border-stone-200 hover:bg-stone-200/60"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* ============================================================ */}
      {/* 客户需求档案主体 */}
      {/* ============================================================ */}
      <article className="rounded-3xl border border-stone-200/80 bg-white p-6 sm:p-8 shadow-xs space-y-6">
        {/* 画像文件题头 */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-amber-600 text-white shadow-2xs">
              <UserCheck className="size-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-stone-900">客户需求与意向</h3>
              <p className="text-[11px] text-stone-400 font-mono">客户关注与购车需求</p>
            </div>
          </div>
          <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-900 border border-amber-200/60">
            {isEditing ? "正在编辑" : "已保存"}
          </span>
        </div>

        {/* 1. 客户关注重点 */}
        <div className="rounded-2xl border border-amber-200/70 bg-gradient-to-br from-[#fffdfa] via-[#fefbf6] to-[#fef8f0] p-5 shadow-2xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="rounded-lg bg-amber-500/15 px-2.5 py-1 text-xs font-bold text-amber-950">
              {demand?.usageScene || "未填写使用场景"} · 购车需求
            </span>
            <span className="text-xs text-amber-900/70 font-medium">
              · 重点：{focusTags.length ? focusTags.map((focus) => FOCUS_LABELS[focus as keyof typeof FOCUS_LABELS] ?? "其他关注").join("、") : "综合车况"}
            </span>
          </div>
          <p className="mt-2.5 text-xs leading-relaxed text-stone-800 font-medium">
            客户重点关注<strong>{focusTags.length ? focusTags.map((focus) => FOCUS_LABELS[focus as keyof typeof FOCUS_LABELS] ?? "其他关注").join("、") : "整车车况"}</strong>，主要用于<strong>{demand?.usageScene || "日常使用"}</strong>。
            {risks.length ? <>当前重点核实<strong>{risks.join("、")}</strong>，沟通时优先说明对应的鉴定事实。</> : "沟通时优先说明与实际需求相关的鉴定事实。"}
          </p>
        </div>

        {/* 2. 意向匹配车源 (内置集成字段，可直接查看与切换修改) */}
        <div className="rounded-2xl border border-stone-100 bg-[#faf8f5] p-5 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-stone-400 pb-2.5 border-b border-stone-200/60">
            <span className="flex items-center gap-1.5 font-bold text-stone-700">
              <CarFront className="size-4 text-red-600" />
              意向车辆
            </span>
            <span className="text-[10px] font-mono">意向车辆</span>
          </div>

          {!isEditing ? (
            currentVehicle ? (
              <div className="mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-amber-50/20 via-white to-white p-4 rounded-2xl border border-stone-200/80 shadow-xs">
                <div className="flex items-center gap-3.5">
                  <div className="relative h-14 w-20 shrink-0 overflow-hidden rounded-xl bg-stone-100 border border-stone-200 shadow-2xs group">
                    <img
                      src={getVehicleVisual(currentVehicle.code, currentVehicle).coverUrl}
                      alt={currentVehicle.model}
                      onError={(e) => {
                        e.currentTarget.src = CAR_FALLBACK_SVG;
                      }}
                      className="size-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <span className="absolute bottom-0 inset-x-0 bg-black/70 text-center font-mono text-[9px] font-bold text-amber-300 py-0.2">
                      {currentVehicle.code}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-stone-900">
                        {currentVehicle.brand ? `${currentVehicle.brand} ` : ""}{currentVehicle.model}
                      </span>
                      {currentVehicle.plateNo && (
                        <span className="rounded bg-stone-100 px-2 py-0.5 text-[11px] font-mono text-stone-600">
                          {currentVehicle.plateNo}
                        </span>
                      )}
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                        已关联鉴定车源
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-stone-500 font-mono flex items-center gap-2 flex-wrap">
                      {currentVehicle.listingPrice !== undefined && (
                        <span>当前售价：<strong className="text-red-600 font-bold">{formatMoney(currentVehicle.listingPrice)}</strong></span>
                      )}
                      {currentVehicle.mileage !== undefined && (
                        <span>· 行驶里程：{(currentVehicle.mileage / 10000).toFixed(1)}万公里</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {latestReport && (
                    <Link
                      href={`/reports/${latestReport.id}`}
                      className="inline-flex items-center gap-1 text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors border border-red-200/60"
                    >
                      <FileText className="size-3.5" />
                      查看消费者报告
                    </Link>
                  )}
                  <Link
                    href={`/vehicles/${currentVehicle.id}`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    车辆档案 ↗
                  </Link>
                </div>
              </div>
            ) : (
              <div className="mt-3 flex items-center justify-between bg-white p-4 rounded-xl border border-dashed border-stone-300 text-xs text-stone-500">
                <span>当前还没有意向车辆</span>
                <span className="text-[11px] text-amber-800 font-semibold bg-amber-50 px-2.5 py-0.5 rounded border border-amber-200/60">待选择</span>
              </div>
            )
          ) : (
            <div className="mt-3 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-stone-700">选择展厅在售车源进行意向绑定（点击卡片即刻选定）：</span>
                {editVehicleId && (
                  <button
                    type="button"
                    onClick={() => setEditVehicleId("")}
                    className="text-[11px] font-bold text-stone-400 hover:text-red-600 transition-colors"
                  >
                    清空 / 暂不绑定
                  </button>
                )}
              </div>

              {/* 暂不指定具体车源 */}
              <button
                type="button"
                onClick={() => setEditVehicleId("")}
                className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                  !editVehicleId
                    ? "border-red-500 bg-red-50/60 ring-2 ring-red-500/20"
                    : "border-dashed border-stone-200 bg-white hover:bg-stone-50"
                }`}
              >
                <div className="flex items-center gap-2 text-xs">
                  <span className={`size-2.5 rounded-full ${!editVehicleId ? "bg-red-600" : "bg-stone-300"}`} />
                  <span className={`font-bold ${!editVehicleId ? "text-red-950" : "text-stone-500"}`}>
                    暂不指定具体车源（自由匹配中）
                  </span>
                </div>
                {!editVehicleId && <span className="text-[11px] font-bold text-red-600">✓ 当前选择</span>}
              </button>

              {/* 展厅在售车源卡片网格 */}
              <div className="grid gap-2 sm:grid-cols-2 max-h-64 overflow-y-auto pr-1">
                {availableVehicles.map((v) => {
                  const selected = editVehicleId === v.id;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setEditVehicleId(v.id)}
                      className={`flex items-start justify-between p-3 rounded-xl border text-left transition-all ${
                        selected
                          ? "border-red-500 bg-red-50/70 ring-2 ring-red-500/20 shadow-xs"
                          : "border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50/70"
                      }`}
                    >
                      <div className="min-w-0 flex items-start gap-2.5">
                        <span
                          className={`flex size-7 shrink-0 items-center justify-center rounded-lg font-mono text-[11px] font-bold ${
                            selected ? "bg-red-600 text-white" : "bg-stone-100 text-stone-700"
                          }`}
                        >
                          {v.code}
                        </span>
                        <div className="min-w-0">
                          <p className={`text-xs font-bold truncate ${selected ? "text-red-950" : "text-stone-900"}`}>
                            {v.brand} {v.model}
                          </p>
                          <div className="mt-1 flex items-center gap-2 text-[11px]">
                            <span className="font-bold text-red-600">{formatMoney(v.listingPrice)}</span>
                            <span className="font-mono text-stone-400">{v.plateNo}</span>
                          </div>
                        </div>
                      </div>
                      {selected && <span className="shrink-0 text-red-600 font-bold text-xs ml-1">✓</span>}
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-stone-400">
                绑定意向车源后，系统将自动关联该车车况事实与检测数据，并可随时出具个性化客户解读报告。
              </p>
            </div>
          )}
        </div>

        {/* 3. 核心置车诉求与决策参数 2x2 网格 */}
        <div className="grid gap-4 sm:grid-cols-2">
          {/* 预算区间 */}
          <div className="rounded-2xl border border-stone-100 bg-[#faf8f5] p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-stone-400">
              <span className="flex items-center gap-1.5 font-medium">
                <Wallet className="size-3.5 text-red-500" />
                购车预算区间
              </span>
              <span className="text-[10px] font-mono">BUDGET</span>
            </div>
            {!isEditing ? (
              <div className="mt-3 text-lg font-black text-red-600">
                {formatMoney(demand?.budgetMin)} – {formatMoney(demand?.budgetMax)}
              </div>
            ) : (
              <div className="mt-2 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-400">¥</span>
                    <input
                      type="number"
                      step={1000}
                      value={editBudgetMin}
                      onChange={(e) => setEditBudgetMin(e.target.value === "" ? "" : Number(e.target.value))}
                      placeholder="最低预算"
                      className="h-9 w-full rounded-xl border border-stone-300 bg-white pl-6 pr-2 text-xs font-bold text-stone-900 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/10"
                    />
                  </div>
                  <span className="text-stone-400 font-bold">—</span>
                  <div className="relative flex-1">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-400">¥</span>
                    <input
                      type="number"
                      step={1000}
                      value={editBudgetMax}
                      onChange={(e) => setEditBudgetMax(e.target.value === "" ? "" : Number(e.target.value))}
                      placeholder="最高预算"
                      className="h-9 w-full rounded-xl border border-stone-300 bg-white pl-6 pr-2 text-xs font-bold text-stone-900 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/10"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {[
                    { l: "8-12万", min: 80000, max: 120000 },
                    { l: "12-16万", min: 120000, max: 160000 },
                    { l: "16-22万", min: 160000, max: 220000 },
                    { l: "22万+", min: 220000, max: 350000 },
                  ].map((b) => (
                    <button
                      key={b.l}
                      type="button"
                      onClick={() => {
                        setEditBudgetMin(b.min);
                        setEditBudgetMax(b.max);
                      }}
                      className="rounded-lg bg-stone-100 hover:bg-stone-200/70 px-2 py-0.5 text-[10px] font-bold text-stone-600"
                    >
                      {b.l}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 用车场景 */}
          <div className="rounded-2xl border border-stone-100 bg-[#faf8f5] p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-stone-400">
              <span className="flex items-center gap-1.5 font-medium">
                <Compass className="size-3.5 text-amber-600" />
                主要用车场景
              </span>
              <span className="text-[10px] font-mono">SCENARIO</span>
            </div>
            {!isEditing ? (
              <div className="mt-3 text-sm font-bold text-stone-800">
                {demand?.usageScene || "日常家庭高频代步"}
              </div>
            ) : (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {COMMON_SCENES.map((scene) => (
                  <button
                    key={scene}
                    type="button"
                    onClick={() => setEditUsageScene(scene)}
                    className={`rounded-xl px-2.5 py-1 text-xs font-semibold transition-all ${
                      editUsageScene === scene
                        ? "bg-amber-600 !text-white font-bold shadow-xs ring-2 ring-amber-400/30"
                        : "bg-white text-stone-600 border border-stone-200 hover:bg-stone-50"
                    }`}
                  >
                    {scene}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 决策周期 */}
          <div className="rounded-2xl border border-stone-100 bg-[#faf8f5] p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-stone-400">
              <span className="flex items-center gap-1.5 font-medium">
                <Clock className="size-3.5 text-emerald-600" />
                计划购车时间
              </span>
              <span className="text-[10px] font-mono">TIMELINE</span>
            </div>
            {!isEditing ? (
              <div className="mt-3 text-sm font-bold text-stone-800">
                {demand?.purchaseTime || "近期 1-2 周内急提"}
              </div>
            ) : (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {COMMON_TIMELINES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setEditPurchaseTime(t)}
                    className={`rounded-xl px-2.5 py-1 text-xs font-semibold transition-all ${
                      editPurchaseTime === t
                        ? "bg-emerald-600 !text-white font-bold shadow-xs ring-2 ring-emerald-400/30"
                        : "bg-white text-stone-600 border border-stone-200 hover:bg-stone-50"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 防坑排查底线 */}
          <div className="rounded-2xl border border-stone-100 bg-[#faf8f5] p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-stone-400">
              <span className="flex items-center gap-1.5 font-medium">
                <ShieldAlert className="size-3.5 text-rose-500" />
                主要风险顾虑
              </span>
              <span className="text-[10px] font-mono">风险</span>
            </div>
            {!isEditing ? (
              <div className="mt-3 text-xs font-bold text-stone-800">
                {risks.join("、") || "暂未记录风险顾虑"}
              </div>
            ) : (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {COMMON_RISKS.map((risk) => (
                  <button
                    key={risk}
                    type="button"
                    onClick={() => toggleRisk(risk)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                      editRiskConcerns.includes(risk)
                        ? "bg-rose-600 !text-white"
                        : "bg-white text-stone-600 border border-stone-200 hover:bg-stone-50"
                    }`}
                  >
                    {risk}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 3. 客户关注重点 */}
        <div className="rounded-2xl border border-stone-100 bg-[#faf8f5] p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-stone-700">客户关注重点</span>
            {isEditing && <span className="text-[11px] text-stone-400">点击标签切换选中状态</span>}
          </div>

          {!isEditing ? (
            <div className="flex flex-wrap gap-2">
              {focusTags.length ? (
                focusTags.map((focus) => (
                  <FocusTag
                    key={focus}
                    label={FOCUS_LABELS[focus as keyof typeof FOCUS_LABELS] ?? "其他关注"}
                    tone="amber"
                  />
                ))
              ) : (
                <span className="text-xs text-stone-400">综合全车机械素质与安全健康度</span>
              )}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {(Object.keys(FOCUS_LABELS) as FocusCode[]).map((code) => {
                const active = editFocusTags.includes(code);
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => toggleFocusTag(code)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                      active
                        ? "bg-amber-600 !text-white shadow-2xs ring-2 ring-amber-400/40"
                        : "bg-white text-stone-600 border border-stone-200 hover:bg-stone-50"
                    }`}
                  >
                    {FOCUS_LABELS[code]}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 4. 跟进备注与线索来源 */}
        <div className="grid gap-4 sm:grid-cols-2">
          {/* 跟进备注 */}
          <div className="rounded-2xl border border-amber-200/60 bg-[#fffdfa] p-5 shadow-2xs">
            <div className="flex items-center justify-between text-xs font-bold text-amber-950 pb-2.5 border-b border-amber-200/40">
              <span className="flex items-center gap-1.5">
                <FileText className="size-3.5 text-amber-700" />
                跟进备注
              </span>
              <span className="text-[10px] font-mono text-amber-900/60">客户备注</span>
            </div>
            {!isEditing ? (
              <p className="mt-3 text-xs leading-relaxed text-stone-800 font-medium whitespace-pre-line">
                {demand?.remark || "客户重视车辆检查细节，重点关注后排空间和底盘舒适性。"}
              </p>
            ) : (
              <textarea
                value={editRemark}
                onChange={(e) => setEditRemark(e.target.value)}
                placeholder="记录客户沟通内容…"
                rows={3}
                className="mt-2.5 w-full rounded-xl border border-stone-300 bg-white p-2.5 text-xs text-stone-800 outline-none focus:border-red-500"
              />
            )}
          </div>

          {/* 客户原始咨询留言留存 */}
          <div className="rounded-2xl border border-stone-100 bg-[#faf8f5] p-5 flex flex-col justify-between">
            <div>
              <span className="block text-xs font-semibold text-stone-500 pb-2.5 border-b border-stone-200/60">
                客户留言
              </span>
              <p className="mt-3 text-xs leading-relaxed text-stone-700 font-medium">
                {customer.sourceContent ? `“${customer.sourceContent}”` : "当前没有客户留言。"}
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-stone-200/60 text-[11px] text-stone-400 font-mono">
              来源渠道：{customer.sourceChannel}
            </div>
          </div>
        </div>
      </article>
    </div>
  );
}
