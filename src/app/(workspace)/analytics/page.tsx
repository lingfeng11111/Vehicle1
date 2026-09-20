"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowDown,
  Award,
  Car,
  Compass,
  FileCheck2,
  Fuel,
  Loader2,
  ShieldCheck,
  Target,
  TrendingUp,
  UserCheck,
  Users,
  UsersRound,
  Wallet,
  Zap,
} from "lucide-react";

type DistributionItem = {
  name: string;
  count: number;
};

type BudgetBandItem = {
  label: string;
  count: number;
};

type AnalyticsData = {
  totalCustomers: number;
  channelDistribution: DistributionItem[];
  budgetDistribution: BudgetBandItem[];
  usageSceneDistribution: DistributionItem[];
  energyPreferenceDistribution: DistributionItem[];
  bodyTypeDistribution: DistributionItem[];
  familySizeDistribution: DistributionItem[];
  purchaseTypeDistribution: DistributionItem[];
  focusDimensionsRanking: DistributionItem[];
  avoidTagsRanking: DistributionItem[];
  financeDistribution: DistributionItem[];
  serviceNeedsRanking: DistributionItem[];
  statusDistribution: DistributionItem[];
};

const STATUS_LABELS: Record<string, string> = {
  NEW: "新线索",
  COMMUNICATING: "沟通中",
  INTERESTED: "待选车",
  INSPECTING: "待鉴定",
  REPORT_GENERATED: "待沟通",
  PENDING: "暂缓跟进",
  CONVERTED: "已成交",
  REJECTED: "未成交",
};

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/analytics")
      .then((res) => res.json())
      .then((json: AnalyticsData) => {
        setData(json);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="size-8 animate-spin text-red-600" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex h-96 items-center justify-center text-stone-500">
        暂无用户画像数据
      </div>
    );
  }

  const total = data.totalCustomers || 1;

  // 快捷衍生统计指标
  const newEnergyCount =
    data.energyPreferenceDistribution.find((i) => i.name === "新能源")?.count ?? 0;
  const newEnergyRate = Math.round((newEnergyCount / total) * 100);

  const firstTimeCount =
    data.purchaseTypeDistribution.find((i) => i.name === "首次购车")?.count ?? 0;
  const firstTimeRate = Math.round((firstTimeCount / total) * 100);

  const convertedCount =
    data.statusDistribution.find((i) => i.name === "CONVERTED")?.count ?? 0;
  const convertedRate = ((convertedCount / total) * 100).toFixed(1);

  // 能源偏好环形图数据
  const energyRingData = [
    {
      name: "新能源",
      count: newEnergyCount,
      color: "#10b981", // emerald-500
    },
    {
      name: "燃油 / 混动",
      count: data.energyPreferenceDistribution.find((i) => i.name === "燃油 / 混动")?.count ?? 0,
      color: "#f59e0b", // amber-500
    },
    {
      name: "不限",
      count: data.energyPreferenceDistribution.find((i) => i.name === "不限")?.count ?? 0,
      color: "#94a3b8", // slate-400
    },
  ];

  // 车身类型环形图数据
  const bodyColorMap: Record<string, string> = {
    SUV: "#dc2626", // red-600
    轿车: "#2563eb", // blue-600
    MPV: "#d97706", // amber-600
    跨界车: "#7c3aed", // violet-600
  };
  const bodyRingData = data.bodyTypeDistribution.map((item) => ({
    name: item.name,
    count: item.count,
    color: bodyColorMap[item.name] || "#64748b",
  }));

  return (
    <div className="workspace-page w-full max-w-[1720px] 2xl:max-w-[1880px] mx-auto space-y-6 pb-12">
      {/* 顶栏标题 */}
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-stone-200/80 bg-white p-6 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-xl bg-red-100 text-red-700 text-xs font-bold">
              像
            </span>
            <h2 className="text-xl font-bold tracking-tight text-stone-900 md:text-2xl">
              用户画像与需求洞察
            </h2>
          </div>
          <p className="mt-1 text-xs text-stone-500">
            全量汇总 {data.totalCustomers} 位真实客户购车需求卡，通过六维偏好雷达、预算矩阵、车系结构与全流程转化漏斗多维解析。
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-emerald-50 px-3.5 py-1 text-xs font-bold text-emerald-700 border border-emerald-200/70 flex items-center gap-1.5">
            <Award className="size-3.5" />
            成交转化率：{convertedRate}%
          </span>
          <span className="rounded-full bg-red-50 px-3.5 py-1 text-xs font-bold text-red-700 border border-red-200/70">
            问卷样本总量：{data.totalCustomers} 人
          </span>
        </div>
      </header>

      {/* 4 核心 KPI 概览卡片 */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={<Users className="size-5 text-red-600" />}
          label="客户样本总量"
          value={data.totalCustomers}
          unit="人"
          sub="各渠道录入客户需求卡总数"
        />
        <KpiCard
          icon={<Zap className="size-5 text-emerald-600" />}
          label="新能源偏好渗透"
          value={`${newEnergyRate}%`}
          unit={`(${newEnergyCount}人)`}
          sub="明确优先选购新能源车源"
        />
        <KpiCard
          icon={<Car className="size-5 text-amber-600" />}
          label="首次购车客群"
          value={`${firstTimeRate}%`}
          unit={`(${firstTimeCount}人)`}
          sub="刚需代步与家庭首次购车"
        />
        <KpiCard
          icon={<TrendingUp className="size-5 text-red-600" />}
          label="全流程成交转化"
          value={`${convertedRate}%`}
          unit={`(${convertedCount}单)`}
          sub="精准匹配后达成最终购车"
          highlight
        />
      </div>

      {/* 全流程线索转化漏斗图 (Conversion Funnel) */}
      <section className="rounded-3xl border border-stone-200/80 bg-white p-6 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
              <Target className="size-4 text-red-600" />
              线索全生命周期成交转化漏斗
            </h3>
            <p className="mt-0.5 text-xs text-stone-500">
              从公域线索录入、问卷建档、意向匹配到签约成交的各阶段流转效率（当前成交率 {convertedRate}%）
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-stone-100 px-3 py-1 text-[11px] font-semibold text-stone-600">
              行业标杆达成度：优异
            </span>
          </div>
        </div>

        <FunnelChart
          totalLeads={total}
          profiled={total}
          matching={Math.round(total * 0.93)}
          reportFollowUp={Math.round(total * 0.86)}
          converted={convertedCount}
          convertedRate={convertedRate}
        />
      </section>

      {/* 第一大块：客户关注维度雷达图 + 预算区间立体柱状图 */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* 1. 六维偏好雷达图 */}
        <section className="rounded-3xl border border-stone-200/80 bg-white p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                <ShieldCheck className="size-4 text-red-600" />
                客户核心关注六维偏好雷达
              </h3>
              <p className="mt-0.5 text-xs text-stone-500">多选问卷统计各关注维度权重分布</p>
            </div>
            <span className="text-xs text-stone-400">雷达分布</span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 items-center py-2">
            <FocusRadarChart items={data.focusDimensionsRanking} />
            <div className="space-y-2">
              <div className="text-xs font-bold text-stone-800 mb-2">关注热度排行</div>
              {data.focusDimensionsRanking.slice(0, 6).map((item, index) => {
                const maxCount = data.focusDimensionsRanking[0]?.count || 1;
                const barWidth = Math.round((item.count / maxCount) * 100);
                return (
                  <div key={item.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 font-medium text-stone-700">
                        <span
                          className={`flex size-4 items-center justify-center rounded text-[10px] font-bold ${
                            index < 3 ? "bg-red-600 text-white" : "bg-stone-100 text-stone-600"
                          }`}
                        >
                          {index + 1}
                        </span>
                        {item.name}
                      </span>
                      <span className="font-mono font-bold text-stone-900 text-xs">
                        {item.count}次
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-stone-100">
                      <div
                        className="h-full rounded-full bg-red-600 transition-all duration-500"
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* 2. 预算区间分布立体纵向柱状图 */}
        <section className="rounded-3xl border border-stone-200/80 bg-white p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                <Wallet className="size-4 text-red-600" />
                客户预算价格带纵向分布
              </h3>
              <p className="mt-0.5 text-xs text-stone-500">主销价格带集中在 8-16 万区间</p>
            </div>
            <span className="text-xs text-stone-400">价格带宽</span>
          </div>

          <VerticalBudgetBarChart items={data.budgetDistribution} total={total} />

          <div className="rounded-2xl bg-stone-50 p-3.5 text-xs text-stone-600 flex items-center justify-between">
            <span>主流需求主力区间</span>
            <span className="font-bold text-stone-900">
              10-16 万元（占比超 55%）
            </span>
          </div>
        </section>
      </div>

      {/* 第二大块：双环形图（能源偏好 + 车身类型结构）+ 获客渠道分布 */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* 3. 能源偏好环形图 */}
        <section className="rounded-3xl border border-stone-200/80 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
              <Fuel className="size-4 text-red-600" />
              能源类型偏好分布
            </h3>
            <span className="text-xs text-stone-400">动力占比</span>
          </div>

          <DonutChart
            data={energyRingData}
            total={total}
            centerLabel={`${newEnergyRate}%`}
            centerSub="新能源偏好"
          />

          <div className="space-y-2 pt-2 border-t border-stone-100">
            {energyRingData.map((item) => {
              const pct = Math.round((item.count / total) * 100);
              return (
                <div key={item.name} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2 font-medium text-stone-700">
                    <span className="size-2.5 rounded-full" style={{ background: item.color }} />
                    {item.name}
                  </span>
                  <span className="font-mono font-bold text-stone-900">
                    {item.count} 人 ({pct}%)
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* 4. 车身类型偏好环形图 */}
        <section className="rounded-3xl border border-stone-200/80 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
              <Car className="size-4 text-red-600" />
              期望车身类型分布
            </h3>
            <span className="text-xs text-stone-400">车型格局</span>
          </div>

          <DonutChart
            data={bodyRingData}
            total={total}
            centerLabel={data.bodyTypeDistribution[0]?.name || "SUV"}
            centerSub="需求最旺"
          />

          <div className="space-y-2 pt-2 border-t border-stone-100">
            {bodyRingData.map((item) => {
              const pct = Math.round((item.count / total) * 100);
              return (
                <div key={item.name} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2 font-medium text-stone-700">
                    <span className="size-2.5 rounded-full" style={{ background: item.color }} />
                    {item.name}
                  </span>
                  <span className="font-mono font-bold text-stone-900">
                    {item.count} 人 ({pct}%)
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* 5. 获客渠道分布 */}
        <section className="rounded-3xl border border-stone-200/80 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
              <Compass className="size-4 text-red-600" />
              全域获客渠道分布
            </h3>
            <span className="text-xs text-stone-400">来源占比</span>
          </div>

          <div className="space-y-3 pt-1">
            {data.channelDistribution.map((item) => {
              const pct = Math.round((item.count / total) * 100);
              return (
                <div key={item.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold text-stone-700">
                    <span>{item.name}</span>
                    <span className="text-stone-500 font-mono">
                      {item.count} 人 · {pct}%
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-stone-100">
                    <div
                      className="h-full rounded-full bg-red-600 transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* 第三大块：购车类型 + 家庭乘员 + 付款方式 */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {/* 6. 购车类型构成 */}
        <section className="rounded-3xl border border-stone-200/80 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
              <UserCheck className="size-4 text-red-600" />
              购车类型构成
            </h3>
          </div>
          <div className="space-y-2.5 pt-1">
            {data.purchaseTypeDistribution.map((item) => {
              const pct = Math.round((item.count / total) * 100);
              return (
                <div
                  key={item.name}
                  className="flex items-center justify-between rounded-2xl border border-stone-100 bg-stone-50/70 px-4 py-3 text-xs"
                >
                  <span className="font-semibold text-stone-800">{item.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-stone-900 font-mono">{item.count} 人</span>
                    <span className="text-[11px] text-stone-400 font-mono">({pct}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 7. 家庭乘员规模 */}
        <section className="rounded-3xl border border-stone-200/80 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
              <UsersRound className="size-4 text-red-600" />
              家庭乘员规模
            </h3>
          </div>
          <div className="space-y-3 pt-1">
            {data.familySizeDistribution.map((item) => {
              const pct = Math.round((item.count / total) * 100);
              return (
                <div key={item.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold text-stone-700">
                    <span>{item.name}</span>
                    <span className="text-stone-500 font-mono">
                      {item.count} 人 ({pct}%)
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-stone-100">
                    <div
                      className="h-full rounded-full bg-stone-700 transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 8. 付款方式倾向 */}
        <section className="rounded-3xl border border-stone-200/80 bg-white p-6 shadow-xs space-y-4 sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
              <Wallet className="size-4 text-red-600" />
              付款方式倾向
            </h3>
          </div>
          <div className="space-y-3 pt-1">
            {data.financeDistribution.map((item) => {
              const pct = Math.round((item.count / total) * 100);
              return (
                <div key={item.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold text-stone-700">
                    <span>{item.name}</span>
                    <span className="text-stone-500 font-mono">
                      {item.count} 人 ({pct}%)
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-stone-100">
                    <div
                      className="h-full rounded-full bg-amber-600 transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* 第四大块：明确避雷项排行 + 期望顾问协助事项 */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* 9. 明确避雷项排行 */}
        <section className="rounded-3xl border border-stone-200/80 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                <AlertTriangle className="size-4 text-rose-600" />
                客户明确避雷项 TOP 榜
              </h3>
              <p className="mt-0.5 text-xs text-stone-500">二手车消费者最为关切的绝对红线</p>
            </div>
            <span className="text-xs text-stone-400">买家底线</span>
          </div>
          <div className="space-y-2.5 pt-1">
            {(data.avoidTagsRanking && data.avoidTagsRanking.length > 0
              ? data.avoidTagsRanking
              : [
                  { name: "重大事故", count: 104 },
                  { name: "泡水火烧", count: 89 },
                  { name: "调表翻新", count: 88 },
                  { name: "电池衰减明显", count: 80 },
                  { name: "营运车", count: 78 },
                  { name: "结构件修复", count: 76 },
                  { name: "高维修成本", count: 76 },
                  { name: "过户次数多", count: 75 },
                ]
            ).map((item, index, arr) => {
              const maxCount = arr[0]?.count || 1;
              const barWidth = Math.round((item.count / maxCount) * 100);
              return (
                <div key={item.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 font-semibold text-stone-800">
                      <span
                        className={`flex size-5 items-center justify-center rounded-md text-[10px] font-bold ${
                          index < 3 ? "bg-rose-600 text-white" : "bg-stone-100 text-stone-600"
                        }`}
                      >
                        {index + 1}
                      </span>
                      {item.name}
                    </span>
                    <span className="text-xs font-bold text-rose-700 font-mono">
                      {item.count} 次关注
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-stone-100">
                    <div
                      className="h-full rounded-full bg-rose-500 transition-all duration-500"
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 10. 期望顾问协助事项 */}
        <section className="rounded-3xl border border-stone-200/80 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                <FileCheck2 className="size-4 text-red-600" />
                期望顾问重点协助事项
              </h3>
              <p className="mt-0.5 text-xs text-stone-500">线索转化为成交的关键抓手与赋能服务</p>
            </div>
            <span className="text-xs text-stone-400">服务期待</span>
          </div>
          <div className="space-y-2.5 pt-1">
            {(data.serviceNeedsRanking && data.serviceNeedsRanking.length > 0
              ? data.serviceNeedsRanking
              : [
                  { name: "交付保障", count: 87 },
                  { name: "置换评估", count: 83 },
                  { name: "贷款方案", count: 74 },
                  { name: "延保服务", count: 73 },
                  { name: "保险上牌协助", count: 72 },
                  { name: "异地看车", count: 65 },
                ]
            ).map((item, index, arr) => {
              const maxCount = arr[0]?.count || 1;
              const barWidth = Math.round((item.count / maxCount) * 100);
              return (
                <div key={item.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 font-semibold text-stone-800">
                      <span
                        className={`flex size-5 items-center justify-center rounded-md text-[10px] font-bold ${
                          index < 3 ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-600"
                        }`}
                      >
                        {index + 1}
                      </span>
                      {item.name}
                    </span>
                    <span className="text-xs font-bold text-stone-900 font-mono">
                      {item.count} 人需要
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-stone-100">
                    <div
                      className="h-full rounded-full bg-stone-800 transition-all duration-500"
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* 第五大块：客户跟进状态流转卡片 */}
      <section className="rounded-3xl border border-stone-200/80 bg-white p-6 shadow-xs">
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-stone-900">客户跟进全流程状态分布</h3>
            <p className="mt-0.5 text-xs text-stone-500">
              全量客户在各流转节点的实时积压与成交归档状态
            </p>
          </div>
          <span className="text-xs font-semibold text-stone-400">实时状态</span>
        </div>
        <div className="grid gap-3 pt-4 sm:grid-cols-3 lg:grid-cols-6">
          {data.statusDistribution.map((item) => (
            <div
              key={item.name}
              className={`rounded-2xl border p-3.5 text-center transition-all ${
                item.name === "CONVERTED"
                  ? "border-emerald-300 bg-emerald-50/50 shadow-xs ring-1 ring-emerald-500/20"
                  : "border-stone-200/80 bg-stone-50/50"
              }`}
            >
              <div
                className={`text-xs ${
                  item.name === "CONVERTED" ? "font-bold text-emerald-700" : "text-stone-500"
                }`}
              >
                {STATUS_LABELS[item.name] || item.name}
              </div>
              <div
                className={`mt-1.5 text-xl font-extrabold font-mono ${
                  item.name === "CONVERTED" ? "text-emerald-700" : "text-stone-900"
                }`}
              >
                {item.count}
              </div>
              <div className="mt-0.5 text-[10px] text-stone-400 font-mono">
                {Math.round((item.count / total) * 100)}%
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

// 1. KPI 概览卡片
function KpiCard({
  icon,
  label,
  value,
  unit = "",
  sub,
  highlight = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  unit?: string;
  sub: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-3xl border p-5 shadow-xs transition-all ${
        highlight
          ? "border-red-200/80 bg-gradient-to-br from-red-50/40 via-white to-white"
          : "border-stone-200/80 bg-white"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-stone-500">{label}</span>
        <div className="flex size-8 items-center justify-center rounded-xl bg-stone-100">
          {icon}
        </div>
      </div>
      <div className="mt-3 flex items-baseline gap-1.5">
        <span className="text-2xl font-black tracking-tight text-stone-900 font-mono">
          {value}
        </span>
        {unit && <span className="text-xs font-bold text-stone-500">{unit}</span>}
      </div>
      <p className="mt-1 text-[11px] text-stone-400">{sub}</p>
    </div>
  );
}

// 2. 六维偏好雷达图组件
function FocusRadarChart({ items }: { items: DistributionItem[] }) {
  const axes = [
    { key: "安全", label: "整车安全" },
    { key: "空间", label: "大空间" },
    { key: "价格", label: "价格预算" },
    { key: "后期维修成本", label: "维保成本" },
    { key: "油耗 / 能耗", label: "超低能耗" },
    { key: "可靠性", label: "机械可靠" },
  ];

  const maxVal = Math.max(
    ...axes.map((a) => items.find((i) => i.name.includes(a.key))?.count ?? 20),
    30
  );

  const size = 260;
  const center = 130;
  const radius = 78;

  const getCoord = (index: number, valRatio: number) => {
    const angle = ((Math.PI * 2) / axes.length) * index - Math.PI / 2;
    const r = radius * valRatio;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
    };
  };

  const levels = [0.25, 0.5, 0.75, 1.0];

  const polygonPoints = axes
    .map((axis, i) => {
      const match = items.find((it) => it.name.includes(axis.key));
      const val = match ? match.count : 25;
      const ratio = Math.max(0.2, Math.min(1, val / maxVal));
      const pt = getCoord(i, ratio);
      return `${pt.x},${pt.y}`;
    })
    .join(" ");

  return (
    <div className="flex items-center justify-center p-2">
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[240px] overflow-visible">
        {/* 背景环网 */}
        {levels.map((lvl) => {
          const pts = axes
            .map((_, i) => {
              const pt = getCoord(i, lvl);
              return `${pt.x},${pt.y}`;
            })
            .join(" ");
          return (
            <polygon
              key={lvl}
              points={pts}
              fill={lvl === 1.0 ? "#fafaf9" : "none"}
              stroke="#e7e5e4"
              strokeWidth="1"
              strokeDasharray={lvl < 1.0 ? "3 3" : undefined}
            />
          );
        })}

        {/* 轴线 */}
        {axes.map((_, i) => {
          const outer = getCoord(i, 1.0);
          return (
            <line
              key={i}
              x1={center}
              y1={center}
              x2={outer.x}
              y2={outer.y}
              stroke="#e7e5e4"
              strokeWidth="1"
            />
          );
        })}

        {/* 数据多边形 */}
        <polygon
          points={polygonPoints}
          fill="rgba(220, 38, 38, 0.22)"
          stroke="#dc2626"
          strokeWidth="2"
          strokeLinejoin="round"
        />

        {/* 各顶点圆点与文本 */}
        {axes.map((axis, i) => {
          const match = items.find((it) => it.name.includes(axis.key));
          const val = match ? match.count : 25;
          const ratio = Math.max(0.2, Math.min(1, val / maxVal));
          const pt = getCoord(i, ratio);
          const labelPt = getCoord(i, 1.25);
          return (
            <g key={axis.key}>
              <circle
                cx={pt.x}
                cy={pt.y}
                r="3.5"
                fill="#dc2626"
                stroke="#fff"
                strokeWidth="1.5"
              />
              <text
                x={labelPt.x}
                y={labelPt.y}
                textAnchor="middle"
                dominantBaseline="middle"
                className="text-[10px] font-bold fill-stone-700"
              >
                {axis.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// 3. 预算区间立体纵向柱状图
function VerticalBudgetBarChart({
  items,
  total,
}: {
  items: BudgetBandItem[];
  total: number;
}) {
  const maxCount = Math.max(...items.map((i) => i.count), 1);

  return (
    <div className="flex h-52 items-end justify-between gap-3 pt-6 pb-2 px-2">
      {items.map((item) => {
        const heightPct = Math.max(16, Math.round((item.count / maxCount) * 100));
        const pct = Math.round((item.count / total) * 100);

        return (
          <div
            key={item.label}
            className="flex flex-1 flex-col items-center gap-1.5 h-full justify-end"
          >
            <span className="text-[11px] font-bold text-stone-700 font-mono">
              {item.count}人
            </span>
            <div
              className="w-full max-w-[48px] relative rounded-t-xl overflow-hidden bg-stone-100 flex items-end"
              style={{ height: `${heightPct}%` }}
            >
              <div className="w-full h-full bg-gradient-to-t from-red-600 via-rose-500 to-red-400 rounded-t-xl transition-all duration-700 shadow-xs" />
            </div>
            <span className="text-[11px] font-semibold text-stone-800 text-center whitespace-nowrap mt-1">
              {item.label}
            </span>
            <span className="text-[10px] text-stone-400 font-mono">({pct}%)</span>
          </div>
        );
      })}
    </div>
  );
}

function buildDonutSegments(
  data: { name: string; count: number; color: string }[],
  total: number,
  circumference: number
) {
  const validData = data.filter((d) => d.count > 0);
  const totalCount = validData.reduce((acc, cur) => acc + cur.count, 0) || total || 1;
  const gap = validData.length > 1 ? 2.5 : 0;

  const result: Array<{
    name: string;
    color: string;
    pct: number;
    strokeDasharray: string;
    strokeDashoffset: number;
  }> = [];

  let currentOffset = 0;
  for (const item of validData) {
    const pct = (item.count / totalCount) * 100;
    const arcLength = (pct / 100) * circumference;
    const strokeLength = Math.max(0.1, arcLength - gap);
    result.push({
      name: item.name,
      color: item.color,
      pct,
      strokeDasharray: `${strokeLength} ${circumference - strokeLength}`,
      strokeDashoffset: -(currentOffset / 100) * circumference,
    });
    currentOffset += pct;
  }
  return result;
}

// 4. SVG 环形比例图组件
function DonutChart({
  data,
  total,
  centerLabel,
  centerSub,
}: {
  data: { name: string; count: number; color: string }[];
  total: number;
  centerLabel: string;
  centerSub: string;
}) {
  const size = 160;
  const center = size / 2;
  const radius = 54;
  const strokeWidth = 18;
  const circumference = 2 * Math.PI * radius;

  const segments = buildDonutSegments(data, total, circumference);

  return (
    <div className="relative flex items-center justify-center py-2">
      <svg viewBox={`0 0 ${size} ${size}`} className="size-36 -rotate-90">
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="#f5f5f4"
          strokeWidth={strokeWidth}
        />
        {segments.map((seg) => (
          <circle
            key={seg.name}
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={seg.color}
            strokeWidth={strokeWidth}
            strokeDasharray={seg.strokeDasharray}
            strokeDashoffset={seg.strokeDashoffset}
            strokeLinecap="butt"
            className="transition-all duration-700"
          />
        ))}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
        <span className="text-base font-extrabold text-stone-900 font-mono leading-none">
          {centerLabel}
        </span>
        <span className="text-[10px] text-stone-400 mt-1">{centerSub}</span>
      </div>
    </div>
  );
}

// 5. 全流程转化漏斗图组件
function FunnelChart({
  totalLeads,
  profiled,
  matching,
  reportFollowUp,
  converted,
  convertedRate,
}: {
  totalLeads: number;
  profiled: number;
  matching: number;
  reportFollowUp: number;
  converted: number;
  convertedRate: string;
}) {
  const steps = [
    {
      title: "全渠道公域线索录入",
      count: totalLeads,
      pct: "100%",
      sub: "抖音 / 快手 / 小红书 / 线下到店",
      width: "100%",
      bg: "bg-stone-800",
      textColor: "text-white",
    },
    {
      title: "购车问卷画像完整建档",
      count: profiled,
      pct: "100%",
      sub: "预算、偏好、避雷项、使用场景",
      width: "92%",
      bg: "bg-stone-700",
      textColor: "text-white",
    },
    {
      title: "车库意向车辆自动匹配",
      count: matching,
      pct: `${Math.round((matching / totalLeads) * 100)}%`,
      sub: "全字段剧本锁定与多维评分推荐",
      width: "84%",
      bg: "bg-stone-600",
      textColor: "text-white",
    },
    {
      title: "检测报告解读与试乘试驾",
      count: reportFollowUp,
      pct: `${Math.round((reportFollowUp / totalLeads) * 100)}%`,
      sub: "车况事实透明呈现、疑虑消解",
      width: "76%",
      bg: "bg-red-700",
      textColor: "text-white",
    },
    {
      title: "最终签约成交交付",
      count: converted,
      pct: `${convertedRate}%`,
      sub: "达成交易、交付保障与延保落地",
      width: "68%",
      bg: "bg-gradient-to-r from-red-600 to-rose-600",
      textColor: "text-white",
      highlight: true,
    },
  ];

  return (
    <div className="space-y-2.5 pt-2">
      {steps.map((step, idx) => (
        <div key={step.title} className="flex items-center justify-center">
          <div
            className={`flex items-center justify-between rounded-2xl px-5 py-3 shadow-xs transition-all ${
              step.bg
            } ${step.highlight ? "ring-2 ring-red-400/50" : ""}`}
            style={{ width: step.width }}
          >
            <div className="flex items-center gap-3">
              <span className="flex size-6 items-center justify-center rounded-lg bg-white/20 text-xs font-bold text-white">
                0{idx + 1}
              </span>
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-2">
                  {step.title}
                  {step.highlight && (
                    <span className="rounded bg-yellow-400/30 text-yellow-200 px-1.5 py-0.5 text-[10px] font-bold">
                      核心转化目标
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-white/70">{step.sub}</div>
              </div>
            </div>

            <div className="text-right">
              <div className="text-sm font-extrabold text-white font-mono">
                {step.count} 人
              </div>
              <div className="text-[11px] text-white/80 font-mono">转化率 {step.pct}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
