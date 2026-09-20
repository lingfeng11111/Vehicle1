"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  FileVideo,
  Lightbulb,
  Radio,
  RefreshCw,
  SearchCheck,
  Sparkles,
} from "lucide-react";
import { getMediaPlatformSummary, MEDIA_POSTS, OPPORTUNITIES, type MediaPlatform } from "@/data/media-sandbox";

type Platform = MediaPlatform;
type PlatformData = {
  name: Platform;
  handle: string;
  followers: string;
  followerNum: number;
  followerChange: string;
  exposure: string;
  exposureNum: number;
  interaction: string;
  interactionNum: number;
  leads: number;
  consultations: number;
  posts: number;
  color: string;
  series: number[];
};

const ACCOUNT_PROFILES: Array<Omit<PlatformData, "leads" | "consultations" | "posts">> = [
  {
    name: "抖音",
    handle: "九宫立序二手车",
    followers: "13,247",
    followerNum: 13247,
    followerChange: "+46",
    exposure: "128,450",
    exposureNum: 128450,
    interaction: "8.3%",
    interactionNum: 8.3,
    color: "#d73a45",
    series: [62, 65, 63, 67, 66, 70, 69, 73, 72, 75, 77, 76, 80, 79, 83, 82, 85, 87, 86, 89.4],
  },
  {
    name: "快手",
    handle: "车诚万家鉴定",
    followers: "9,183",
    followerNum: 9183,
    followerChange: "+32",
    exposure: "96,320",
    exposureNum: 96320,
    interaction: "7.8%",
    interactionNum: 7.8,
    color: "#e67e22",
    series: [50, 52, 51, 55, 53, 56, 58, 57, 60, 62, 61, 64, 66, 65, 68, 70, 69, 72, 74, 73.6],
  },
  {
    name: "小红书",
    handle: "九宫立序选车",
    followers: "7,156",
    followerNum: 7156,
    followerChange: "+38",
    exposure: "114,280",
    exposureNum: 114280,
    interaction: "9.5%",
    interactionNum: 9.5,
    color: "#c85d89",
    series: [54, 56, 55, 58, 60, 59, 63, 62, 66, 68, 67, 71, 70, 74, 76, 75, 78, 81, 80, 83.2],
  },
  {
    name: "视频号",
    handle: "小俊说二手车",
    followers: "9,241",
    followerNum: 9241,
    followerChange: "+21",
    exposure: "65,140",
    exposureNum: 65140,
    interaction: "7.2%",
    interactionNum: 7.2,
    color: "#268f82",
    series: [42, 44, 43, 46, 48, 47, 50, 49, 52, 54, 53, 56, 58, 57, 60, 62, 61, 64, 66, 65.8],
  },
];

const MEDIA_SUMMARY = getMediaPlatformSummary();
const INITIAL: PlatformData[] = ACCOUNT_PROFILES.map((profile) => {
  const summary = MEDIA_SUMMARY.find((item) => item.platform === profile.name);
  return {
    ...profile,
    leads: (summary?.leads ?? 0) * 3 + 12,
    consultations: (summary?.consultations ?? 0) * 3 + 28,
    posts: (summary?.posts ?? 0) + 15,
  };
});

const WORKSPACES = [
  { href: "/media-intelligence/content", title: "内容库", copy: "查看历史视频，选中单条内容进行复盘", icon: FileVideo, count: `${MEDIA_POSTS.length} 条内容` },
  { href: "/media-intelligence/opportunities", title: "内容机会", copy: "根据客户关注与车辆鉴定结果筛选下一条选题", icon: Lightbulb, count: `${OPPORTUNITIES.length} 个机会` },
  { href: "/media-intelligence/analysis", title: "数据分析", copy: "拆解平台、内容、咨询与成交的关联", icon: SearchCheck, count: "1 组分析" },
];

const LIVE_SCRAPE_LOGS = [
  { platform: "抖音", text: "视频《底盘维修最容易漏掉的三笔钱》新增 2 条购车意向咨询", time: "刚刚" },
  { platform: "小红书", text: "笔记《十万元家用二手车怎么选》互动量上升，已被推荐至同城二手车专题", time: "1分钟前" },
  { platform: "快手", text: "《八万预算如何判断整备成本》完播率稳定在 69%", time: "3分钟前" },
  { platform: "视频号", text: "收到 1 条私信询问检测报告真实性，已分配至线索列表", time: "5分钟前" },
  { platform: "抖音", text: "评论区监测：近期“结构件”、“漆膜厚度”关键词提及频次较高", time: "7分钟前" },
];

export default function MediaIntelligencePage() {
  const [platforms, setPlatforms] = useState<PlatformData[]>(() => {
    if (typeof window === "undefined") return INITIAL;
    try {
      const saved = window.localStorage.getItem("media-followers-v1");
      if (!saved) return INITIAL;
      const map = JSON.parse(saved) as Record<string, number>;
      return INITIAL.map((p) => (map[p.name] ? { ...p, followerNum: map[p.name], followers: map[p.name].toLocaleString("zh-CN") } : p));
    } catch { return INITIAL; }
  });
  const [selected, setSelected] = useState<Platform>("抖音");
  const [lastSync, setLastSync] = useState("等待同步");
  const [lastUpdatedPlatform, setLastUpdatedPlatform] = useState<string>("抖音");
  const [syncing, setSyncing] = useState(false);
  const [activeLogIdx, setActiveLogIdx] = useState(0);

  // 每个平台独立的气泡与震动状态，完全解耦并发
  const [platformPopups, setPlatformPopups] = useState<Record<string, { id: number; active: boolean }>>({
    抖音: { id: 0, active: false },
    快手: { id: 0, active: false },
    小红书: { id: 0, active: false },
    视频号: { id: 0, active: false },
  });

  const active = platforms.find((item) => item.name === selected) ?? platforms[0];
  const totalLeads = platforms.reduce((sum, item) => sum + item.leads, 0);

  // Dynamic log rotating
  useEffect(() => {
    const logTimer = window.setInterval(() => {
      setActiveLogIdx((prev) => (prev + 1) % LIVE_SCRAPE_LOGS.length);
    }, 3600);
    return () => window.clearInterval(logTimer);
  }, []);

  const triggerPlatformGrowth = (targetName: Platform) => {
    setPlatforms((current) => {
      const targetIndex = current.findIndex((p) => p.name === targetName);
      if (targetIndex === -1) return current;

      const item = current[targetIndex];
      const nextFollowers = item.followerNum + (2 + Math.floor(Math.random() * 9));
      const waveExp = Math.sin(Date.now() / 3000 + targetIndex * 1.5) * 120 + (Math.random() - 0.45) * 60;
      const nextExpNum = Math.max(1000, Math.round(item.exposureNum + waveExp));
      const waveInt = Math.sin(Date.now() / 2500 + targetIndex * 2.2) * 0.1;
      const nextIntNum = Number(Math.max(4.0, Math.min(15.0, item.interactionNum + waveInt)).toFixed(1));

      const latest = item.series.at(-1) ?? 60;
      const wave = Math.sin(Date.now() / 4000 + targetIndex * 2.1) * 1.2 + (Math.random() - 0.48) * 0.8;
      const upwardDrift = 0.08 + (targetIndex % 3) * 0.03;
      const nextSeriesVal = Number(Math.max(35, Math.min(96, latest + wave * 0.5 + upwardDrift)).toFixed(1));
      const baseChange = parseInt(item.followerChange.replace("+", ""), 10) || 20;

      const updatedItem: PlatformData = {
        ...item,
        followerNum: nextFollowers,
        followers: nextFollowers.toLocaleString("zh-CN"),
        followerChange: `+${baseChange + 1}`,
        exposureNum: nextExpNum,
        exposure: nextExpNum.toLocaleString("zh-CN"),
        interactionNum: nextIntNum,
        interaction: `${nextIntNum}%`,
        series: [...item.series.slice(1), nextSeriesVal],
      };

      // 持久化粉丝数到 localStorage，跨页面不重置
      try {
        const saved: Record<string, number> = {};
        current.forEach((p, idx) => { saved[(idx === targetIndex ? updatedItem : p).name] = (idx === targetIndex ? updatedItem : p).followerNum; });
        window.localStorage.setItem("media-followers-v1", JSON.stringify(saved));
      } catch {}
      return current.map((p, idx) => (idx === targetIndex ? updatedItem : p));
    });

    setLastUpdatedPlatform(targetName);
    setLastSync(formatLocalTime());

    // 触发该平台的专属独立气泡与震动
    const bubbleId = Date.now();
    setPlatformPopups((prev) => ({
      ...prev,
      [targetName]: { id: bubbleId, active: true },
    }));

    window.setTimeout(() => {
      setPlatformPopups((prev) => ({
        ...prev,
        [targetName]: { ...prev[targetName], active: false },
      }));
    }, 1100);
  };

  // 各平台独立错峰定时器：打乱顺序，全随机首发与离散周期
  useEffect(() => {
    const platformList: Platform[] = ["抖音", "快手", "小红书", "视频号"];
    // 随机打乱平台顺序，确保每次刷新首个浮现的平台完全不可预测
    const shuffled = [...platformList].sort(() => Math.random() - 0.5);
    const timerIds: number[] = [];

    shuffled.forEach((name, i) => {
      const schedulePlatform = () => {
        // 每个平台独立随机 6.0 ~ 15.0 秒自然增长，模拟真实公域离散特征
        const randomDelay = Math.floor(280000 + Math.random() * 40000);
        const tid = window.setTimeout(() => {
          triggerPlatformGrowth(name);
          schedulePlatform();
        }, randomDelay);
        timerIds.push(tid);
      };

      // 首发时间完全离散随机化（2.0s ~ 10.0s，平台先后次序完全随机）
      // 避免出现固定先抖音再快手再小红书再视频号的机械感
      const firstDelay = Math.floor(2000 + i * 2200 + Math.random() * 2000);
      const initialTid = window.setTimeout(() => {
        triggerPlatformGrowth(name);
        schedulePlatform();
      }, firstDelay);
      timerIds.push(initialTid);
    });

    return () => {
      timerIds.forEach((id) => window.clearTimeout(id));
    };
  }, []);

  function handleManualSync() {
    setSyncing(true);
    const platformList: Platform[] = ["抖音", "快手", "小红书", "视频号"];
    platformList.forEach((name, idx) => {
      window.setTimeout(() => {
        triggerPlatformGrowth(name);
      }, idx * 180);
    });
    window.setTimeout(() => setSyncing(false), 900);
  }

  const chartSummary = useMemo(
    () => ({
      current: active.series.at(-1) ?? 0,
      change: ((active.series.at(-1) ?? 0) - active.series[0]).toFixed(1),
    }),
    [active]
  );

  return (
    <div className="min-w-0 bg-dashboard-surface px-3 py-4 text-dashboard-ink sm:px-4 lg:px-6 xl:px-7">
      <style>{`
        @keyframes numberVibrate {
          0%, 100% { transform: translateY(0); }
          25% { transform: translateY(-1.5px); }
          50% { transform: translateY(1px); }
          75% { transform: translateY(-0.5px); }
        }
        @keyframes popFloatUp {
          0% { opacity: 0; transform: translateY(5px) scale(0.85); }
          20% { opacity: 1; transform: translateY(-2px) scale(1.04); }
          70% { opacity: 0.95; transform: translateY(-13px) scale(1); }
          100% { opacity: 0; transform: translateY(-20px) scale(0.9); }
        }
        .animate-number-vibrate {
          display: inline-block;
          animation: numberVibrate 0.45s ease-out both;
          transform-origin: left bottom;
        }
        .animate-pop-float {
          animation: popFloatUp 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      <div className="mx-auto w-full max-w-[1720px] 2xl:max-w-[1880px] space-y-4">

        {/* Real-Time Live Status Banner */}
        <div className="relative overflow-hidden rounded-[20px] border border-dashboard-line bg-white p-4 shadow-[0_6px_20px_rgba(28,35,40,.04)]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="relative flex size-9 items-center justify-center rounded-xl bg-dashboard-red/10 text-dashboard-red">
                <Radio className="size-5 animate-pulse" />
                <span className="absolute -right-0.5 -top-0.5 flex size-2.5">
                  <span className="absolute size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative size-2.5 rounded-full bg-emerald-500" />
                </span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-semibold tracking-[-0.02em]">新媒体运营中心</h2>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 border border-emerald-200">
                    <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    监控运行中
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-dashboard-muted">
                  查看各平台内容表现、近期热度趋势与选题机会
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs">
              <div className="hidden items-center gap-6 sm:flex">
                <div className="text-right">
                  <div className="text-[10px] text-dashboard-muted">已接入平台</div>
                  <div className="font-semibold text-dashboard-ink">4 个</div>
                </div>
                <div className="h-6 w-px bg-dashboard-line" />
                <div className="text-right">
                  <div className="text-[10px] text-dashboard-muted">在库内容</div>
                  <div className="font-semibold text-dashboard-ink">{MEDIA_POSTS.length} 条</div>
                </div>
                <div className="h-6 w-px bg-dashboard-line" />
                <div className="text-right">
                  <div className="text-[10px] text-dashboard-muted">转化线索</div>
                  <div className="font-semibold text-dashboard-red">{totalLeads} 条</div>
                </div>
              </div>

              <button
                onClick={() => handleManualSync()}
                disabled={syncing}
                className="inline-flex h-9 items-center gap-2 rounded-xl border border-dashboard-line bg-white px-3.5 text-xs font-medium text-dashboard-ink shadow-sm transition hover:border-dashboard-red/40 hover:text-dashboard-red disabled:opacity-60"
              >
                <RefreshCw className={`size-3.5 ${syncing ? "animate-spin text-dashboard-red" : ""}`} />
                {syncing ? "同步中..." : "同步数据"}
              </button>
            </div>
          </div>

          {/* Live Dynamic Stream Ticker */}
          <div className="mt-3.5 flex items-center gap-2.5 rounded-xl border border-slate-100 bg-slate-50/80 px-3.5 py-2 text-xs">
            <span className="flex items-center gap-1.5 font-medium text-dashboard-red shrink-0">
              <Sparkles className="size-3.5" />
              实时动态
            </span>
            <div className="h-3 w-px bg-slate-200 shrink-0" />
            <div className="min-w-0 flex-1 overflow-hidden">
              <div
                key={activeLogIdx}
                className="flex items-center gap-2 truncate animate-in fade-in slide-in-from-bottom-2 duration-300"
              >
                <span className="rounded bg-white px-1.5 py-0.5 text-[10px] font-medium border border-slate-200 text-dashboard-ink shrink-0">
                  {LIVE_SCRAPE_LOGS[activeLogIdx].platform}
                </span>
                <span className="truncate text-dashboard-charcoal">
                  {LIVE_SCRAPE_LOGS[activeLogIdx].text}
                </span>
                <span className="ml-auto text-[10px] text-dashboard-muted shrink-0">
                  {LIVE_SCRAPE_LOGS[activeLogIdx].time}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Platform Metric Cards */}
        <section className="overflow-hidden rounded-[20px] border border-dashboard-line bg-white shadow-[0_10px_30px_rgba(28,35,40,.055)]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-dashboard-line px-5 py-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-dashboard-ink">平台表现</h3>
                <span className="flex items-center gap-1.5 rounded-full bg-dashboard-red-soft px-2 py-0.5 text-[10px] font-medium text-dashboard-red">
                  <span className="size-1.5 rounded-full bg-dashboard-red animate-pulse" />
                  实时更新
                </span>
              </div>
              <p className="mt-1 text-xs text-dashboard-muted flex items-center gap-2">
                <span>各平台表现独立统计</span>
                <span className="text-dashboard-line">·</span>
                <span className="text-emerald-700 font-semibold flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-emerald-500" />
                  刚刚捕获 [{lastUpdatedPlatform}] 实时流
                </span>
                <span className="text-dashboard-line">·</span>
                <span>同步时间：{lastSync}</span>
              </p>
            </div>
            <div className="flex gap-5 text-xs text-dashboard-muted">
              <span>
                有效线索总数 <strong className="ml-1 text-dashboard-ink font-semibold">{totalLeads}</strong>
              </span>
              <span>
                本周发布内容 <strong className="ml-1 text-dashboard-ink font-semibold">{MEDIA_POSTS.length}</strong>
              </span>
            </div>
          </div>

          <div className="grid gap-px bg-dashboard-line md:grid-cols-2 xl:grid-cols-4">
            {platforms.map((item) => {
              const popup = platformPopups[item.name];
              const isVibrating = popup?.active;
              return (
                <button
                  key={item.name}
                  onClick={() => setSelected(item.name)}
                  className={`relative min-w-0 overflow-hidden bg-white p-5 text-left transition-all duration-300 hover:z-10 hover:shadow-[0_10px_28px_rgba(28,35,40,.08)] ${
                    selected === item.name
                      ? "z-10 shadow-[inset_0_3px_0_var(--dashboard-red),0_10px_28px_rgba(28,35,40,.07)] ring-1 ring-dashboard-red/20"
                      : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm font-semibold">
                      <span
                        className="size-2.5 rounded-full shadow-[0_0_0_4px_rgba(179,38,48,.07)]"
                        style={{ background: item.color }}
                      />
                      {item.name}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {lastUpdatedPlatform === item.name && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700 border border-emerald-200">
                          <span className="size-1 rounded-full bg-emerald-500" />
                          实时更新
                        </span>
                      )}
                      <span
                        className={`max-w-[120px] truncate rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          selected === item.name
                            ? "bg-dashboard-red text-white"
                            : "bg-dashboard-surface text-dashboard-muted"
                        }`}
                      >
                        {selected === item.name ? "正在查看" : item.handle}
                      </span>
                    </div>
                  </div>

                  <div className="mt-5 flex items-end justify-between relative">
                    <div className="relative">
                      {/* Floating +1 Rising Bubble Badge */}
                      {isVibrating && (
                        <span
                          key={`pop-${item.name}-${popup?.id ?? 0}`}
                          className="animate-pop-float absolute -top-4.5 left-0 z-30 inline-flex items-center rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-xs pointer-events-none"
                        >
                          +1
                        </span>
                      )}
                      <div className="text-[11px] text-dashboard-muted">粉丝数</div>
                      <strong
                        key={`num-${item.name}-${popup?.id ?? 0}`}
                        className={`mt-1 block text-[26px] font-semibold tracking-[-.05em] text-dashboard-ink ${
                          isVibrating ? "animate-number-vibrate" : ""
                        }`}
                      >
                        {item.followers}
                      </strong>
                    </div>
                    <span className="mb-1 rounded-md bg-dashboard-red-soft px-2 py-0.5 text-xs font-semibold text-dashboard-red">
                      {item.followerChange}
                    </span>
                  </div>

                  {/* Smooth Mini Trend */}
                  <SmoothMiniTrend values={item.series} color={item.color} active={selected === item.name} />

                  <div className="mt-3 grid grid-cols-3 border-t border-dashboard-line pt-3 text-[11px]">
                    <Metric label="曝光" value={item.exposure} />
                    <Metric label="互动率" value={item.interaction} />
                    <Metric label="线索" value={item.leads} />
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Center: Trend Chart & Right Column (Well-Balanced Height, No Awkward Void) */}
        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_360px] 2xl:grid-cols-[minmax(0,1.6fr)_420px]">

          {/* Main Trend Chart */}
          <div className="overflow-hidden rounded-[20px] border border-dashboard-line bg-white shadow-[0_8px_24px_rgba(28,35,40,.05)]">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-dashboard-line px-5 py-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="size-2.5 rounded-full" style={{ background: active.color }} />
                  <h3 className="font-semibold text-dashboard-ink">{active.name} · 内容热度走势</h3>
                </div>
                <p className="mt-1 text-xs text-dashboard-muted">
                  账号：{active.handle} · 综合播放与互动表现
                </p>
              </div>
              <div className="text-right">
                <div className="text-xs text-dashboard-muted">当前热度</div>
                <div className="flex items-baseline justify-end gap-1.5 mt-0.5">
                  <strong
                    key={`chart-heat-${platformPopups[active.name]?.id ?? 0}`}
                    className={`text-2xl font-semibold tracking-[-.04em] ${
                      platformPopups[active.name]?.active ? "animate-number-vibrate" : ""
                    }`}
                    style={{ color: active.color }}
                  >
                    {chartSummary.current.toFixed(1)}
                  </strong>
                  <span className="text-xs font-medium text-dashboard-red">+{chartSummary.change}</span>
                </div>
              </div>
            </div>

            <SmoothPlatformChart values={active.series} color={active.color} syncTime={lastSync} />
          </div>

          {/* Right Column: Clean Operations Summary & Recommendations (Naturally Balanced Height) */}
          <aside className="flex flex-col justify-between rounded-[20px] border border-dashboard-line bg-white p-5 shadow-[0_8px_24px_rgba(28,35,40,.05)]">
            <div>
              <div className="flex items-center gap-2 border-b border-dashboard-line pb-3.5 font-semibold text-dashboard-ink">
                <CalendarDays className="size-4 text-dashboard-red" />
                <span>今日运营建议</span>
              </div>

              <div className="mt-4 rounded-xl bg-dashboard-surface p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-dashboard-muted">当前监测平台</span>
                  <span className="text-xs font-semibold" style={{ color: active.color }}>
                    {active.name}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-5 text-dashboard-muted">
                  该平台近期车况解读类内容完播率表现稳定，适合继续发布车况事实解读与真实作业视频。
                </p>
              </div>

              <div className="mt-4 space-y-3">
                    <SummaryRow label="待复盘内容" value={`${MEDIA_POSTS.filter((post) => post.completion < 70).length} 条`} />
                    <SummaryRow label="内容带来的咨询" value={`${active.consultations} 条`} />
                <SummaryRow label="建议发布时间" value="19:30–21:00" />
                <SummaryRow label="重点关注选题" value="底盘工况 / 整备成本" />
              </div>
            </div>

            <Link
              href="/media-intelligence/content"
              className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-dashboard-charcoal px-4 py-3 text-sm font-medium !text-white transition hover:bg-dashboard-red hover:!text-white shadow-sm"
            >
              查看内容库 <ArrowRight className="size-4" />
            </Link>
          </aside>
        </section>

        {/* Bottom Workspaces */}
        <section className="grid gap-4 md:grid-cols-3">
          {WORKSPACES.map((workspace) => {
            const Icon = workspace.icon;
            return (
              <Link
                key={workspace.href}
                href={workspace.href}
                className="group rounded-[18px] border border-dashboard-line bg-white p-5 shadow-[0_7px_20px_rgba(28,35,40,.04)] transition-all hover:-translate-y-0.5 hover:border-dashboard-red/35"
              >
                <div className="flex items-start justify-between">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-dashboard-red-soft text-dashboard-red">
                    <Icon className="size-5" />
                  </span>
                  <span className="text-xs text-dashboard-muted">{workspace.count}</span>
                </div>
                <h3 className="mt-5 font-semibold text-dashboard-ink">{workspace.title}</h3>
                <p className="mt-2 min-h-10 text-sm leading-5 text-dashboard-muted">{workspace.copy}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-dashboard-red">
                  查看工作区 <ArrowRight className="size-3.5" />
                </span>
              </Link>
            );
          })}
        </section>
      </div>
    </div>
  );
}

/**
 * Generate smooth Cubic Bézier curve SVG path from an array of 2D points
 */
function getSmoothCurvePath(points: Array<{ x: number; y: number }>): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x},${points[0].y}`;
  let d = `M ${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];

    // Catmull-Rom to Cubic Bezier conversion
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }
  return d;
}

function SmoothMiniTrend({ values, color, active }: { values: number[]; color: string; active: boolean }) {
  const width = 220;
  const bottom = 74;
  const x = (index: number) => 8 + index * ((width - 16) / (values.length - 1));
  const min = Math.min(...values) - 4;
  const max = Math.max(...values) + 4;
  const y = (value: number) => 7 + ((max - value) / Math.max(1, max - min)) * 53;

  const points = values.map((val, idx) => ({ x: x(idx), y: y(val) }));
  const smoothCurve = getSmoothCurvePath(points);
  const smoothArea = `${smoothCurve} L ${points.at(-1)?.x ?? width},${bottom} L ${points[0].x},${bottom} Z`;

  const last = values.length - 1;
  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  const gradId = `mini-${color.replace("#", "")}`;

  return (
    <svg viewBox="0 0 220 78" className="mt-4 h-[78px] w-full overflow-visible">
      <defs>
        <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity={active ? ".28" : ".14"} />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <line x1="8" x2="212" y1={y(average)} y2={y(average)} stroke={color} strokeOpacity=".2" strokeDasharray="3 4" />
      <path d={smoothArea} fill={`url(#${gradId})`} className="transition-all duration-[1200ms] ease-out" />
      <path
        d={smoothCurve}
        fill="none"
        stroke={color}
        strokeWidth={active ? 2.5 : 1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="transition-all duration-[1200ms] ease-out"
      />
      <circle cx={x(last)} cy={y(values[last])} r="3.5" fill="#fff" stroke={color} strokeWidth="2">
        <animate attributeName="r" values="3;5;3" dur="2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="1;.55;1" dur="2s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

function SmoothPlatformChart({ values, color, syncTime }: { values: number[]; color: string; syncTime: string }) {
  const width = 900;
  const height = 340;
  const chartTop = 32;
  const chartBottom = 232;
  const lastIndex = values.length - 1;

  const yFor = (value: number) => chartBottom - ((value - 20) / 80) * (chartBottom - chartTop);
  const xFor = (index: number) => index * (width / lastIndex);

  const points = values.map((val, idx) => ({ x: xFor(idx), y: yFor(val) }));
  const smoothCurve = getSmoothCurvePath(points);
  const smoothArea = `${smoothCurve} L ${width},${chartBottom} L 0,${chartBottom} Z`;

  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  const current = values[lastIndex];
  const volumes = values.map((value, index) => Math.max(16, ((value + index * 7) % 32) + 12));
  const gradientId = `area-${color.replace("#", "")}`;
  const glowId = `main-glow-${color.replace("#", "")}`;

  return (
    <div className="relative h-[310px] overflow-hidden bg-[#fafbfc] p-4 md:h-[370px] md:p-6">
      <div className="absolute left-6 top-5 flex items-center gap-4 text-[11px] text-dashboard-muted">
        <span className="flex items-center gap-1.5">
          <i className="size-2 rounded-full" style={{ background: color }} />
          实时热度
        </span>
        <span className="flex items-center gap-1.5">
          <i className="h-px w-3 bg-dashboard-muted/60" />
          平均值
        </span>
      </div>
      <div className="absolute right-6 top-5 text-right">
        <div className="text-[10px] text-dashboard-muted">最近更新</div>
        <div className="mt-0.5 text-xs font-medium tabular-nums text-dashboard-ink">{syncTime}</div>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        className="h-full w-full pt-7"
        role="img"
        aria-label="平台内容走势图"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor={color} stopOpacity=".28" />
            <stop offset=".5" stopColor={color} stopOpacity=".1" />
            <stop offset="1" stopColor={color} stopOpacity="0" />
          </linearGradient>
          <filter id={glowId} x="-20%" y="-30%" width="140%" height="160%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Horizontal grid guide lines */}
        {[20, 40, 60, 80, 100].map((value) => {
          const y = yFor(value);
          return (
            <g key={value}>
              <line x1="0" x2={width} y1={y} y2={y} stroke="#edf0f2" strokeDasharray="3 6" />
              <text x="6" y={y - 7} fill="#9aa2a8" fontSize="10">
                {value}
              </text>
            </g>
          );
        })}

        {/* Vertical time marks */}
        {[0, 4, 8, 12, lastIndex].map((index) => (
          <g key={index}>
            <line x1={xFor(index)} x2={xFor(index)} y1={chartTop} y2={chartBottom} stroke="#f2f4f6" />
            <text
              x={xFor(index)}
              y="323"
              textAnchor={index === 0 ? "start" : index === lastIndex ? "end" : "middle"}
              fill="#9aa2a8"
              fontSize="10"
            >
              {["15:00", "15:20", "15:40", "16:00", "16:20"][Math.min(4, Math.round(index / 4))]}
            </text>
          </g>
        ))}

        {/* Area under smooth curve */}
        <path d={smoothArea} fill={`url(#${gradientId})`} className="transition-all duration-[1200ms] ease-out" />

        {/* Average line */}
        <line
          x1="0"
          x2={width}
          y1={yFor(average)}
          y2={yFor(average)}
          stroke="#858d93"
          strokeWidth="1.2"
          strokeDasharray="6 5"
        />
        <text x={width - 5} y={yFor(average) - 6} textAnchor="end" fill="#858d93" fontSize="10">
          均线 {average.toFixed(1)}
        </text>

        {/* Bottom Volume Bars */}
        {volumes.map((volume, index) => (
          <rect
            key={index}
            x={xFor(index) - 8}
            y={294 - volume}
            width="16"
            height={volume}
            rx="3"
            fill={color}
            opacity={index === lastIndex ? ".55" : ".18"}
            className="transition-all duration-[1200ms]"
          />
        ))}

        {/* Smooth Glow Background Curve */}
        <path
          d={smoothCurve}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity=".15"
          filter={`url(#${glowId})`}
          className="transition-all duration-[1200ms] ease-out"
        />

        {/* Smooth Main Curve */}
        <path
          d={smoothCurve}
          fill="none"
          stroke={color}
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="transition-all duration-[1200ms] ease-out"
        />

        {/* Sample Point Dots */}
        {values.map((value, index) => (
          <circle
            key={index}
            cx={xFor(index)}
            cy={yFor(value)}
            r={index === lastIndex ? 6 : 2.5}
            fill={index === lastIndex ? color : "#fff"}
            stroke={color}
            strokeWidth="2"
            className="transition-all duration-[1200ms] ease-out"
          />
        ))}

        {/* Dynamic Scanning Wave */}
        <line x1="0" x2="0" y1={chartTop} y2={chartBottom} stroke={color} strokeWidth="1" opacity=".16">
          <animate attributeName="x1" values={`0;${width}`} dur="6s" repeatCount="indefinite" />
          <animate attributeName="x2" values={`0;${width}`} dur="6s" repeatCount="indefinite" />
        </line>

        {/* Active Node Ping Wave */}
        <line
          x1={xFor(lastIndex)}
          x2={xFor(lastIndex)}
          y1={chartTop}
          y2={chartBottom}
          stroke={color}
          strokeDasharray="3 4"
          opacity=".5"
        />
        <circle cx={xFor(lastIndex)} cy={yFor(current)} r="8" fill="none" stroke={color} strokeWidth="1.5">
          <animate attributeName="r" values="6;16;6" dur="2.4s" repeatCount="indefinite" />
          <animate attributeName="opacity" values=".7;0;.7" dur="2.4s" repeatCount="indefinite" />
        </circle>

        {/* Floating Value Tag */}
        <rect x={width - 69} y={yFor(current) - 15} width="62" height="24" rx="6" fill={color} />
        <text x={width - 38} y={yFor(current) + 1} textAnchor="middle" fill="white" fontSize="11" fontWeight="700">
          {current.toFixed(1)}
        </text>
      </svg>
      <div className="absolute bottom-4 right-6 flex items-center gap-2 text-[10px] text-dashboard-muted">
        <span className="inline-block h-2 w-4 rounded-sm" style={{ background: color, opacity: 0.35 }} />
        互动柱状
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <span className="flex min-w-0 flex-col items-center justify-center border-r border-dashboard-line px-1 text-center last:border-r-0">
      <span className="block text-dashboard-muted">{label}</span>
      <strong className="mt-1 block font-semibold tabular-nums text-dashboard-ink">{value}</strong>
    </span>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-dashboard-line pb-2.5 text-xs last:border-0 last:pb-0">
      <span className="text-dashboard-muted">{label}</span>
      <strong className="font-medium text-dashboard-ink">{value}</strong>
    </div>
  );
}

function formatLocalTime() {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date());
}
