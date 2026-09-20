"use client";

import { ShieldCheck } from "lucide-react";

export function CertifiedStamp({ className = "", itemCount }: { className?: string; itemCount?: number | null }) {
  return (
    <div
      className={`relative select-none pointer-events-none flex size-28 shrink-0 flex-col items-center justify-center rounded-full border-2 border-dashed border-red-700/85 p-1 text-red-700 rotate-[-8deg] shadow-xs ${className}`}
      style={{
        background: "radial-gradient(circle, rgba(215, 58, 69, 0.05) 0%, rgba(215, 58, 69, 0) 75%)",
      }}
    >
      {/* Inner double border ring */}
      <div className="flex size-full flex-col items-center justify-center rounded-full border border-red-700/80 p-1.5 text-center">
        <span className="text-[9px] font-extrabold tracking-[0.2em] uppercase text-red-800">
          九宫立序 · 认证
        </span>
        <div className="my-0.5 flex items-center justify-center gap-1">
          <span className="h-px w-3 bg-red-700/60" />
          <ShieldCheck className="size-3.5 text-red-700 fill-red-50" />
          <span className="h-px w-3 bg-red-700/60" />
        </div>
        <span className="text-[10px] font-black tracking-wider text-red-700 leading-tight">
          {itemCount ? `${itemCount}项全检通过` : "全项检验通过"}
        </span>
        <span className="mt-0.5 text-[8px] font-bold tracking-[0.15em] text-red-600/90 font-mono">
          OFFICIAL PASS
        </span>
      </div>
    </div>
  );
}
