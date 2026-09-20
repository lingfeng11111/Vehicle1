"use client";

import { Check, Flag, LockKeyhole, RotateCcw, Settings2, Sliders, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { FEATURE_FLAGS, FEATURE_FLAG_LABELS, type FeatureFlagKey } from "@/config/feature-flags";

export default function SettingsPage() {
  const [flags, setFlags] = useState<Record<FeatureFlagKey, boolean>>({ ...FEATURE_FLAGS });

  return (
    <div className="workspace-page w-full max-w-[1720px] 2xl:max-w-[1880px] mx-auto space-y-6">
      {/* 顶部标题栏 */}
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-stone-200/80 bg-white p-6 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-xl bg-red-100 text-red-700 text-xs font-bold">
              设
            </span>
            <h2 className="text-xl font-bold tracking-tight text-stone-900 md:text-2xl">
              设置
            </h2>
          </div>
          <p className="mt-1 text-xs text-stone-500">
            配置报告、价格参考和内容分析功能。
          </p>
        </div>
        <button
          type="button"
          onClick={() => setFlags({ ...FEATURE_FLAGS })}
          className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3.5 text-xs font-semibold text-stone-700 shadow-2xs hover:bg-stone-50 transition-colors"
        >
          <RotateCcw className="size-3.5 text-stone-500" />
          恢复默认设置
        </button>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        {/* 左侧：业务功能开关 */}
        <section className="rounded-3xl border border-stone-200/80 bg-white p-6 shadow-xs">
          <div className="flex items-center gap-3 pb-4 border-b border-stone-100">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-amber-600 text-white shadow-xs">
              <Sliders className="size-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900">功能设置</h3>
              <p className="text-xs text-stone-500">选择当前要使用的功能</p>
            </div>
          </div>

          <div className="mt-4 divide-y divide-stone-100">
            {(Object.keys(flags) as FeatureFlagKey[]).map((key) => {
              const active = flags[key];
              return (
                <div key={key} className="flex items-center justify-between gap-4 py-4">
                  <div>
                    <span className="text-sm font-bold text-stone-900">{FEATURE_FLAG_LABELS[key]}</span>
                    <p className="text-xs text-stone-400 mt-0.5">开启或关闭这项功能</p>
                  </div>
                  <button
                    type="button"
                    aria-pressed={active}
                    onClick={() => setFlags((current) => ({ ...current, [key]: !current[key] }))}
                    className={`inline-flex h-8 min-w-[76px] items-center justify-center gap-1.5 rounded-xl px-3 text-xs font-bold transition-all shadow-2xs ${
                      active
                        ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                        : "bg-stone-100 text-stone-500 hover:bg-stone-200"
                    }`}
                  >
                    {active && <Check className="size-3.5" />}
                    {active ? "已开启" : "已关闭"}
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        {/* 右侧：架构规则与数据说明 */}
        <section className="rounded-3xl border border-stone-200/80 bg-white p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 pb-4 border-b border-stone-100">
              <div className="flex size-10 items-center justify-center rounded-2xl bg-stone-100 text-stone-800">
                <ShieldCheck className="size-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-stone-900">使用说明</h3>
                <p className="text-xs text-stone-500">鉴定结果和报告的使用规则</p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              <Rule text="车辆鉴定结果来自现场记录，不因客户偏好改变" />
              <Rule text="每次生成报告都会保留当时的鉴定结果" />
              <Rule text="价格区间仅作参考，购买前请结合现场车况判断" />
              <Rule text="流程：客户线索 → 购车需求 → 意向车辆 → 鉴定 → 报告 → 跟进" />
            </div>

            <div className="mt-6 rounded-2xl border border-amber-200/60 bg-gradient-to-r from-amber-50 to-orange-50/50 p-4">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-950">
                <LockKeyhole className="size-4 text-amber-700" />
                客户信息保护
              </div>
              <p className="mt-1.5 text-xs text-stone-600 leading-relaxed">
                客户联系方式等信息会做保护处理。
              </p>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-stone-100 text-xs text-stone-400">
            二手车销售与鉴定平台
          </div>
        </section>
      </div>
    </div>
  );
}

function Rule({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl bg-[#faf8f5] p-3 text-xs border border-stone-100">
      <Check className="size-4 text-emerald-600 shrink-0 mt-0.5" />
      <span className="font-medium text-stone-800 leading-relaxed">{text}</span>
    </div>
  );
}
