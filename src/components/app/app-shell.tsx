"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CarFront,
  ChartNoAxesColumn,
  FileText,
  House,
  Menu,
  RadioTower,
  Settings,
  UsersRound,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";
import { useEffect, useState } from "react";
import { FloatingTodo } from "@/components/app/floating-todo";
import { SHOWROOM_ASSETS } from "@/config/vehicle-assets";

export const NAV_ITEMS = [
  { href: "/dashboard", label: "经营工作台", icon: House },
  { href: "/analytics", label: "用户画像", icon: ChartNoAxesColumn },
  { href: "/customers", label: "客户线索", icon: UsersRound },
  { href: "/vehicles", label: "车辆档案", icon: CarFront },
  { href: "/reports", label: "消费者报告", icon: FileText },
  { href: "/media-intelligence", label: "新媒体运营", icon: RadioTower },
  { href: "/settings", label: "设置", icon: Settings },
] as const;

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function getRouteTrail(pathname: string) {
  const current = NAV_ITEMS.find((item) => isActive(pathname, item.href)) ?? NAV_ITEMS[0];
  const section = pathname.startsWith("/inspections/") ? "车辆档案" : current.label;
  let detail = "";

  if (pathname.startsWith("/customers/") && pathname !== "/customers") detail = "客户档案";
  if (pathname.endsWith("/edit")) detail = "编辑档案";
  else if (pathname.startsWith("/vehicles/") && pathname !== "/vehicles") detail = "车辆详情";
  if (pathname.startsWith("/inspections/") && pathname !== "/inspections") detail = "车辆质检工作台";
  if (pathname.startsWith("/reports/") && pathname !== "/reports") detail = "报告详情";
  if (pathname === "/media-intelligence/content") detail = "内容库";
  if (pathname === "/media-intelligence/analysis") detail = "数据分析";
  if (pathname === "/media-intelligence/opportunities") detail = "内容机会";

  return { section, detail };
}

export function AppShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const routeTrail = getRouteTrail(pathname);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!mobileOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileOpen]);

  return (
    <div className="min-h-screen bg-[#f8f6f2] text-stone-900 antialiased selection:bg-red-200">
      {/* 桌面端高定商业侧栏 */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-[#e8e2d8] bg-[#ffffff] shadow-[4px_0_24px_rgba(0,0,0,0.02)] min-[900px]:flex min-[1200px]:w-64">
        {/* 品牌标识 */}
        <div className="flex h-20 items-center gap-3.5 px-6 border-b border-[#f2ede4]">
          <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-red-600 to-amber-600 text-white shadow-md shadow-red-500/20">
            <div className="grid grid-cols-3 gap-0.5 p-1.5 size-full">
              {[...Array(9)].map((_, i) => (
                <div
                  key={i}
                  className={`rounded-[2px] ${
                    i === 4 ? "bg-white" : i % 2 === 0 ? "bg-white/80" : "bg-white/40"
                  }`}
                />
              ))}
            </div>
          </div>
          <div>
            <div className="text-[15px] font-extrabold tracking-tight text-stone-900 leading-none">
              九宫立序 · 车诚万家
            </div>
            <div className="text-[11px] font-medium text-stone-400 mt-1">
              二手车销售与鉴定平台
            </div>
          </div>
        </div>

        {/* 主功能导航 */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-1">
          <div className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-stone-400">
            业务导航
          </div>
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center justify-between rounded-xl px-3.5 py-3 text-xs font-semibold transition-all duration-200 ${
                  active
                    ? "bg-red-600 text-white shadow-md shadow-red-600/25"
                    : "text-stone-600 hover:bg-[#faf7f2] hover:text-stone-900"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`size-[18px] transition-colors ${
                      active ? "text-white" : "text-stone-400 group-hover:text-red-600"
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {active && <ChevronRight className="size-3.5 text-white/80" />}
              </Link>
            );
          })}
        </div>

        {/* 底部账户卡 */}
        <div className="p-4 border-t border-[#f2ede4] bg-[#faf8f5]/80">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative size-10 shrink-0">
                <div className="size-full overflow-hidden rounded-full ring-2 ring-amber-500/40 shadow-xs">
                  <img
                    src={SHOWROOM_ASSETS.advisorPortrait}
                    alt="小俊"
                    className="size-full object-cover"
                  />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 z-10 size-3 rounded-full bg-emerald-500 ring-2 ring-white shadow-xs" />
              </div>
              <div className="leading-tight">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-stone-900">小俊</span>
                  <span className="rounded bg-amber-100 px-1.5 py-0.2 text-[9px] font-extrabold text-amber-900 border border-amber-300/60">
                    首席
                  </span>
                </div>
              </div>
            </div>
            <span className="text-[10px] font-mono text-stone-400 font-medium">在线</span>
          </div>
        </div>
      </aside>

      {/* 主工作区 */}
      <div className="min-[900px]:pl-60 min-[1200px]:pl-64">
        {/* 顶栏 Header */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-[#e8e2d8] bg-white/90 backdrop-blur-md px-6 md:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label={mobileOpen ? "关闭导航菜单" : "打开导航菜单"}
              aria-expanded={mobileOpen}
              aria-controls="mobile-navigation"
              className="min-[900px]:hidden flex size-9 items-center justify-center rounded-lg border border-stone-200 bg-stone-50 text-stone-700"
            >
              <Menu className="size-4" />
            </button>
            <div className="flex items-center gap-2 text-xs text-stone-400 font-medium">
              <span>工作台</span>
              <span>/</span>
              <span className="font-bold text-stone-900 text-sm">{routeTrail.section}</span>
              {routeTrail.detail && (
                <>
                  <span>/</span>
                  <span className="font-medium text-stone-600">{routeTrail.detail}</span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 rounded-xl border border-[#e8e2d8] bg-[#faf8f5] px-3 py-1.5 text-xs text-stone-500">
              <ShieldCheck className="size-3.5 text-emerald-600" />
              <span>鉴定服务已就绪</span>
            </div>
          </div>
        </header>

        {/* 移动端与平板折叠侧滑抽屉 (带半透明毛玻璃与评估师工牌) */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 min-[900px]:hidden animate-in fade-in duration-200">
            {/* 遮罩背景 */}
            <div
              onClick={() => setMobileOpen(false)}
              className="absolute inset-0 bg-stone-950/60 backdrop-blur-xs"
              aria-hidden="true"
            />

            {/* 侧滑抽屉 */}
            <div
              id="mobile-navigation"
              className="relative flex h-full w-72 max-w-[85vw] flex-col overscroll-contain border-r border-[#e8e2d8] bg-white shadow-2xl animate-in slide-in-from-left duration-200"
            >
              {/* 品牌题头 */}
              <div className="flex h-16 items-center justify-between border-b border-[#f2ede4] px-5">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-red-600 to-amber-600 text-white shadow-md">
                    <div className="grid grid-cols-3 gap-0.5 p-1 size-full">
                      {[...Array(9)].map((_, i) => (
                        <div
                          key={i}
                          className={`rounded-[1px] ${
                            i === 4 ? "bg-white" : i % 2 === 0 ? "bg-white/80" : "bg-white/40"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-extrabold tracking-tight text-stone-900 leading-none">
                      九宫立序 · 车诚万家
                    </div>
                    <div className="text-[10px] font-medium text-stone-400 mt-0.5">
                      二手车销售与鉴定平台
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  aria-label="关闭导航抽屉"
                  className="flex size-8 items-center justify-center rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-700"
                >
                  <span className="text-xl leading-none font-light">×</span>
                </button>
              </div>

              {/* 业务功能导航 */}
              <div className="flex-1 overflow-y-auto p-4 space-y-1">
                <div className="px-2.5 pb-2 text-[10px] font-bold uppercase tracking-wider text-stone-400">
                  业务导航
                </div>
                {NAV_ITEMS.map((item) => {
                  const active = isActive(pathname, item.href);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-all ${
                        active
                          ? "bg-red-600 text-white shadow-md shadow-red-600/25"
                          : "text-stone-600 hover:bg-stone-50 hover:text-stone-900"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`size-4 ${active ? "text-white" : "text-stone-400"}`} />
                        <span>{item.label}</span>
                      </div>
                      {active && <ChevronRight className="size-3.5 text-white/80" />}
                    </Link>
                  );
                })}
              </div>

              {/* 底部账户卡 */}
              <div className="p-4 border-t border-[#f2ede4] bg-[#faf8f5]/80">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative size-9 shrink-0">
                      <img
                        src={SHOWROOM_ASSETS.advisorPortrait}
                        alt="小俊"
                        className="size-full rounded-full object-cover ring-2 ring-amber-500/40"
                      />
                      <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
                    </div>
                    <div className="leading-tight">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-stone-900">小俊</span>
                        <span className="rounded bg-amber-100 px-1 py-0.2 text-[9px] font-extrabold text-amber-900">
                          首席
                        </span>
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-600 font-bold">在线</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <main className="min-h-0 px-3 py-4 sm:px-5 sm:py-5 md:px-6 md:py-6 lg:px-7 xl:px-8">{children}</main>
      </div>

      {/* Global Real-Time Floating To-Do Widget */}
      <FloatingTodo />
    </div>
  );
}
