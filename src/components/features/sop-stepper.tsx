import { Check, Circle } from "lucide-react";

export type SopStepKey = "lead" | "demand" | "matching" | "inspection" | "report" | "deal";

interface SopStepperProps {
  currentStep: SopStepKey;
  className?: string;
}

const STEPS: Array<{ key: SopStepKey; label: string; order: number }> = [
  { key: "lead", label: "新线索", order: 1 },
  { key: "demand", label: "购车需求", order: 2 },
  { key: "matching", label: "意向车辆", order: 3 },
  { key: "inspection", label: "鉴定作业", order: 4 },
  { key: "report", label: "消费者报告", order: 5 },
  { key: "deal", label: "已成交", order: 6 },
];

export function SopStepper({ currentStep, className = "" }: SopStepperProps) {
  const currentIndex = STEPS.findIndex((s) => s.key === currentStep);

  return (
    <div className={`rounded-2xl border border-[#e8e2d8] bg-white p-4 shadow-xs ${className}`}>
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1">
        {STEPS.map((step, idx) => {
          const isDone = idx < currentIndex;
          const isCurrent = idx === currentIndex;

          return (
            <div key={step.key} className="flex items-center gap-3 shrink-0">
              <div className="flex items-center gap-2">
                <div
                  className={`flex size-6 items-center justify-center rounded-full text-[11px] font-bold transition-all ${
                    isDone
                      ? "bg-emerald-600 text-white"
                      : isCurrent
                      ? "bg-red-600 text-white ring-4 ring-red-100"
                      : "border border-stone-200 bg-stone-50 text-stone-400"
                  }`}
                >
                  {isDone ? <Check className="size-3.5 stroke-[2.5]" /> : step.order}
                </div>
                <span
                  className={`text-xs ${
                    isCurrent
                      ? "font-bold text-stone-900"
                      : isDone
                      ? "font-medium text-stone-700"
                      : "font-normal text-stone-400"
                  }`}
                >
                  {step.label}
                </span>
              </div>

              {idx < STEPS.length - 1 && (
                <div className="w-6 sm:w-12 h-px bg-stone-200 shrink-0 mx-1" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
