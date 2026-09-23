"use client";

import Link from "next/link";
import { ArrowRight, Search, UsersRound, Sparkles, CarFront, FileText, Calendar, Phone, Tag } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { CustomerDialog } from "@/components/features/customer-dialog";
import { FocusTag, StatusBadge } from "@/components/app/status-badge";
import { FOCUS_LABELS } from "@/config/report-rules";
import { getVehicleVisual } from "@/config/vehicle-assets";
import { formatDateTime, formatMaskedName, formatMoney, parseJsonList } from "@/lib/format";

type Customer = {
  id: string;
  name: string;
  phone: string;
  sourceChannel: string;
  sourceContent: string | null;
  status: string;
  updatedAt: string;
  demands: Array<{ id: string; focusTags: string; usageScene: string; budgetMin: number | null; budgetMax: number | null }>;
  salesCases: Array<{ id: string; vehicle: { code: string; model: string; coverImage?: string | null; displayTags?: string | string[] | null }; reports: Array<{ id: string }> }>;
};

const CAR_FALLBACK_SVG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23d6d3d1' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.2 10.6 15 10 12 10s-6.2.6-8.5 1.1C2.7 11.3 2 12.1 2 13v3c0 .6.4 1 1 1h2'/%3E%3Cpath d='M19 17H5'/%3E%3Cpath d='M5 17v2c0 .6.4 1 1 1h12c.6 0 1-.4 1-1v-2'/%3E%3C/svg%3E";

const CARD_THEMES = [
  {
    hoverBorder: "hover:border-rose-300",
    avatarBg: "from-rose-500 to-red-600",
    badgeTone: "text-rose-700 bg-rose-50 border-rose-200/60",
    cardBg: "bg-gradient-to-r from-rose-50/25 via-white to-white",
    watermark: "短视频线索",
    ringBorder: "border-rose-500/10",
  },
  {
    hoverBorder: "hover:border-amber-300",
    avatarBg: "from-amber-500 to-orange-600",
    badgeTone: "text-amber-800 bg-amber-50 border-amber-200/60",
    cardBg: "bg-gradient-to-r from-amber-50/25 via-white to-white",
    watermark: "小红书种草",
    ringBorder: "border-amber-500/10",
  },
  {
    hoverBorder: "hover:border-indigo-300",
    avatarBg: "from-indigo-500 to-blue-600",
    badgeTone: "text-indigo-700 bg-indigo-50 border-indigo-200/60",
    cardBg: "bg-gradient-to-r from-indigo-50/25 via-white to-white",
    watermark: "微信视频号",
    ringBorder: "border-indigo-500/10",
  },
  {
    hoverBorder: "hover:border-emerald-300",
    avatarBg: "from-emerald-600 to-teal-700",
    badgeTone: "text-emerald-800 bg-emerald-50 border-emerald-200/60",
    cardBg: "bg-gradient-to-r from-emerald-50/25 via-white to-white",
    watermark: "展厅到店客户",
    ringBorder: "border-emerald-500/10",
  },
];

function themeForSource(sourceChannel: string, index: number) {
  const sourceIndex = ["抖音", "小红书", "视频号", "线下到店"].indexOf(sourceChannel);
  return CARD_THEMES[sourceIndex >= 0 ? sourceIndex : index % CARD_THEMES.length];
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const load = () => {
    setIsLoading(true);
    return fetch("/api/customers")
      .then((response) => response.json())
      .then(setCustomers)
      .catch(() => setCustomers([]))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(
    () =>
      customers.filter((customer) =>
        `${customer.name}${customer.sourceChannel}${customer.sourceContent ?? ""}`
          .toLowerCase()
          .includes(query.toLowerCase())
      ),
    [customers, query]
  );

  return (
    <div className="workspace-page w-full max-w-[1720px] 2xl:max-w-[1880px] mx-auto space-y-6">
      {/* 顶部标题与快速建档栏 */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-stone-200/80 bg-white p-6 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-xl bg-red-100 text-red-700 text-xs font-bold">
              客
            </span>
            <h2 className="text-xl font-bold tracking-tight text-stone-900 md:text-2xl">
              客户线索
            </h2>
          </div>
          <p className="mt-1 text-xs text-stone-500">
            全网多渠道意向潜客建档、选车偏好与专属鉴定报告流转。
          </p>
        </div>
        <CustomerDialog onCreated={load} />
      </div>

      {/* 搜索与过滤工具条 */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-stone-200/80 bg-white px-4 py-3 shadow-xs">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-stone-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索客户姓名、联系方式或来源渠道…"
            className="h-9 w-full rounded-xl border border-stone-200 bg-[#faf8f5] pl-9 pr-4 text-xs text-stone-800 placeholder:text-stone-400 focus:border-red-500 focus:bg-white focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-amber-50 px-3.5 py-1 text-xs font-semibold text-amber-900 border border-amber-200/60">
            客户线索 {filtered.length} 位
          </span>
        </div>
      </div>

      {/* 客户横向卡片列表 (多样化配色与商业质感) */}
      <div className="space-y-3.5">
        {isLoading ? (
          <div className="space-y-3.5" aria-live="polite" aria-label="客户线索加载中">
            {[0, 1, 2].map((item) => (
              <div key={item} className="h-52 animate-pulse rounded-3xl border border-stone-200/80 bg-white" />
            ))}
          </div>
        ) : filtered.map((customer, index) => {
          const demand = customer.demands[0];
          const focusTags = parseJsonList(demand?.focusTags);
          const firstReport = customer.salesCases.flatMap((c) => c.reports)[0];
          const hasBudget = demand && (demand.budgetMin || demand.budgetMax);
          const theme = themeForSource(customer.sourceChannel, index);

          return (
            <article
              key={customer.id}
              className={`content-visibility-auto group relative overflow-hidden rounded-3xl border border-stone-200/80 ${theme.cardBg} p-5 shadow-[0_8px_24px_-16px_rgba(28,25,23,0.35)] ${theme.hoverBorder} hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200`}
            >
              {/* 卡片右上角商业编号与几何同心圆装饰 */}
              <span className="pointer-events-none absolute right-4 top-3 font-mono text-[10px] text-stone-300 font-semibold select-none hidden sm:block">
                #LEAD-{String(index + 1).padStart(2, "0")} · {theme.watermark}
              </span>
              <div
                className={`pointer-events-none absolute -right-6 -bottom-6 size-24 rounded-full border-[8px] ${theme.ringBorder} select-none`}
              />

              <div className="relative z-10 space-y-3.5">
                {/* 顶部行：客户身份信息 与 状态操作区（永不重叠） */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-stone-200/60">
                  {/* 左侧：客户身份与来源 */}
                  <div className="flex items-center gap-3">
                    <div
                      className={`relative flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${theme.avatarBg} text-white font-bold text-base shadow-sm`}
                    >
                      {formatMaskedName(customer.name).slice(0, 1)}
                      <span className="absolute -bottom-1 -right-1 flex size-3.5 items-center justify-center rounded-full bg-amber-400 text-[7px] font-bold text-amber-950 ring-2 ring-white">
                        ★
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          href={`/customers/${customer.id}`}
                          className="text-base font-bold text-stone-900 hover:text-red-700 transition-colors"
                        >
                          {formatMaskedName(customer.name)}
                        </Link>
                        <span className={`rounded-md px-2 py-0.5 text-[11px] font-semibold border ${theme.badgeTone}`}>
                          {customer.sourceChannel}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-stone-400 font-mono flex-wrap">
                        <span className="flex items-center gap-1">
                          <Phone className="size-3 text-stone-400" />
                          {customer.phone}
                        </span>
                        <span className="text-stone-300">·</span>
                        <span>更新：{formatDateTime(customer.updatedAt)}</span>
                      </div>
                    </div>
                  </div>

                  {/* 右侧：状态徽章与操作按钮 */}
                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    <StatusBadge value={customer.status} />

                    {firstReport && (
                      <Link
                        href={`/reports/${firstReport.id}`}
                        className="inline-flex h-8 items-center gap-1.5 rounded-xl bg-gradient-to-r from-red-600 to-red-500 px-3 text-xs font-bold !text-white shadow-2xs hover:from-red-700 hover:to-red-600 transition-all whitespace-nowrap"
                      >
                        <FileText className="size-3.5 !text-white" />
                        <span className="!text-white">查看消费者报告</span>
                      </Link>
                    )}
                    <Link
                      href={`/customers/${customer.id}`}
                      className="inline-flex h-8 items-center gap-1 rounded-xl border border-stone-200 bg-white px-3 text-xs font-bold text-stone-700 shadow-2xs hover:bg-stone-50 hover:border-stone-300 transition-colors whitespace-nowrap"
                    >
                      <span>查看客户档案</span>
                      <ArrowRight className="size-3.5" />
                    </Link>
                  </div>
                </div>

                {/* 底部双卡排版：需求场景 与 意向车源 并列布局，预留充裕横向空间 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-0.5">
                  {/* 需求场景与预算标签 */}
                  <div className="rounded-xl bg-white/95 p-3.5 border border-stone-100 shadow-2xs flex flex-col justify-between">
                    <div className="flex items-center justify-between text-xs gap-2">
                      <span className="font-semibold text-stone-800 truncate">
                        {demand?.usageScene || "日常通勤代步"}
                      </span>
                      {hasBudget && (
                        <span className="font-bold text-red-600 text-xs shrink-0 font-mono">
                          预算：{formatMoney(demand.budgetMin)} – {formatMoney(demand.budgetMax)}
                        </span>
                      )}
                    </div>
                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                      {focusTags.map((focus) => (
                        <FocusTag
                          key={focus}
                          label={FOCUS_LABELS[focus as keyof typeof FOCUS_LABELS] ?? "其他关注"}
                          tone="amber"
                        />
                      ))}
                      {focusTags.length === 0 && (
                        <span className="text-[11px] text-stone-400">综合车况诉求</span>
                      )}
                    </div>
                  </div>

                  {/* 匹配意向车源展示卡 */}
                  <div className="rounded-xl bg-white/95 p-3.5 border border-stone-100 shadow-2xs flex flex-col justify-center">
                    {customer.salesCases.length > 0 ? (
                      <div className="space-y-2">
                        {customer.salesCases.slice(0, 1).map((item) => {
                          const code = item.vehicle?.code || "V001";
                          const visual = getVehicleVisual(code, item.vehicle);
                          return (
                            <div
                              key={item.id}
                              className="group/v flex items-center justify-between gap-3"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="relative h-10 w-14 shrink-0 overflow-hidden rounded-lg bg-stone-100 border border-stone-200/60 shadow-2xs">
                                  <img
                                    src={visual.coverUrl}
                                    alt={item.vehicle?.model || "意向车辆"}
                                    loading="lazy"
                                    decoding="async"
                                    onError={(e) => {
                                      e.currentTarget.src = CAR_FALLBACK_SVG;
                                    }}
                                    className="size-full object-cover group-hover/v:scale-105 transition-transform duration-300"
                                  />
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="rounded bg-stone-100 px-1 py-0.2 font-mono text-[9px] font-bold text-stone-700">
                                      {code}
                                    </span>
                                    <span className="truncate text-xs font-bold text-stone-900 group-hover/v:text-red-700 transition-colors">
                                      {item.vehicle?.model || "认证车辆"}
                                    </span>
                                  </div>
                                  <div className="text-[10px] text-emerald-700 font-mono flex items-center gap-1 mt-0.5">
                                    <span className="size-1 rounded-full bg-emerald-500" />
                                    已关联鉴定车源
                                  </div>
                                </div>
                              </div>
                              <Link
                                href={`/customers/${customer.id}`}
                                className="text-[11px] font-bold text-stone-400 hover:text-red-600 transition-colors shrink-0"
                              >
                                详情 ↗
                              </Link>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <Link
                        href={`/customers/${customer.id}`}
                        className="flex items-center justify-between rounded-lg border border-dashed border-stone-300 bg-stone-50/50 p-2 text-xs text-stone-500 hover:border-amber-400 hover:bg-amber-50/50 hover:text-stone-800 transition-all"
                      >
                        <span className="flex items-center gap-1.5">
                          <CarFront className="size-3.5 text-stone-400" />
                          <span>待绑定意向车源</span>
                        </span>
                        <span className="text-[10px] font-bold text-amber-700">选车 ↗</span>
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </article>
          );
        })}

        {!isLoading && filtered.length === 0 && (
          <div className="rounded-3xl border border-dashed border-stone-200 bg-white flex flex-col items-center gap-3 px-6 py-16 text-center">
            <UsersRound className="size-8 text-stone-300" />
            <p className="text-xs font-semibold text-stone-500">当前没有匹配的客户线索。</p>
          </div>
        )}
      </div>
    </div>
  );
}
