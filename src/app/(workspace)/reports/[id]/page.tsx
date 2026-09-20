"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  Award,
  ChevronDown,
  Database,
  ExternalLink,
  FileCheck,
  FileDown,
  History,
  Link2,
  ListChecks,
  Printer,
  QrCode,
  ShieldAlert,
  Sparkles,
  Wrench,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { CaseResultActions } from "@/components/features/case-result-actions";
import { FocusTag, StatusBadge } from "@/components/app/status-badge";
import { CertifiedStamp } from "@/components/app/certified-stamp";
import { getVehicleVisual, CAR_FALLBACK_SVG } from "@/config/vehicle-assets";
import { findDamageEvidence } from "@/config/evidence-media";
import { getInspectionZoneLabel } from "@/config/inspection-zones";
import { REPORT_INSPECTOR_NAME, REPORT_REVIEWER_NAME } from "@/config/report-people";
import { FOCUS_LABELS, getFocusLabel } from "@/config/report-rules";
import {
  INSPECTION_STATUS_ICONS,
  INSPECTION_STATUS_ICON_TONES,
  INSPECTION_STATUS_LABELS,
  INSPECTION_STATUS_TONES,
  INSPECTION_STATUS_WRAPPER_TONES,
  isInspectionStatus,
  type InspectionStatus,
} from "@/config/inspection-status";
import { formatDateTime, formatMaskedName, formatMoney, formatRange } from "@/lib/format";
import type { InspectionItemData } from "@/types/domain";
import { getInspectionResultLabel } from "@/services/inspection-result";
import { getInspectionSeverityLabel } from "@/services/inspection-severity";

type JsonRecord = Record<string, unknown>;
type FlexibleSnapshot = JsonRecord & {
  vehicle?: JsonRecord;
  customer?: JsonRecord;
  inspection?: JsonRecord;
  facts?: unknown;
  highlights?: unknown;
  market?: JsonRecord | null;
  disclaimer?: unknown;
  explanation?: unknown;
};
type ReportData = {
  id: string;
  version: number;
  generatedAt: string;
  salesCase: {
    id: string;
    result: string;
    customer: { id: string; name: string };
    vehicle: { code: string; model: string; coverImage?: string | null; displayTags?: string | string[] | null };
  };
  snapshot: FlexibleSnapshot;
  standardSnapshot: FlexibleSnapshot | null;
  personalizedSnapshot: FlexibleSnapshot | null;
};
type FindingRecord = JsonRecord & { id?: string; criterion?: JsonRecord; inspectionItem?: JsonRecord };
type EvidenceRecord = JsonRecord & { id?: string; uri?: string; caption?: string | null; mediaType?: string; capturedAt?: string };

const VALUE_LABELS: Record<string, string> = {
  NONE: "无",
  ORDINARY: "一般事故",
  MAJOR: "重大事故",
  UNASSESSED: "未评估",
  DETECTED: "发现问题",
  PASS: "通过",
  ISSUE_FOUND: "发现问题",
  CLEAR: "通过",
  BLOCKED: "无法检查",
  CIRCULATE: "可继续了解",
  REPAIR_REVIEW: "维修后复查",
  HOLD_FOR_REVIEW: "暂缓购买",
  STOPPED: "不建议购买",
  REACHED: "达到",
  NOT_REACHED: "未达到",
  NOT_APPLICABLE: "不适用",
  PASS_WITH_MAINTENANCE: "通过，建议维修",
  REQUIRED: "需要说明",
  STANDARD: "正常",
  LOW: "低风险",
  MEDIUM: "中风险",
  HIGH: "高风险",
  NORMAL: "正常",
  ABNORMAL: "发现问题",
  UNCHECKED: "待检查",
  PENDING: "暂缓",
  IN_PROGRESS: "沟通中",
  COMPLETED: "已完成",
  NEW: "新线索",
  COMMUNICATING: "沟通中",
  REPORT_GENERATED: "待沟通",
  REJECTED: "未成交",
  CONVERTED: "已成交",
};

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asRecord(value: unknown) {
  return isRecord(value) ? value : null;
}

function stringValue(value: unknown): string | null {
  if (typeof value === "string") return value.trim() || null;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return null;
}

function numberValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return null;
}

function firstValue(record: JsonRecord | null | undefined, keys: string[]) {
  if (!record) return undefined;
  return keys.map((key) => record[key]).find((value) => value !== undefined && value !== null && value !== "");
}

function firstString(record: JsonRecord | null | undefined, keys: string[]) {
  return stringValue(firstValue(record, keys));
}

function firstRecord(record: JsonRecord | null | undefined, keys: string[]) {
  for (const key of keys) {
    const next = asRecord(record?.[key]);
    if (next) return next;
  }
  return null;
}

function recordsAt(value: unknown): JsonRecord[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function snapshotRecords(snapshot: FlexibleSnapshot, key: string) {
  return recordsAt(snapshot[key]);
}

function itemList(snapshot: FlexibleSnapshot, key: string): InspectionItemData[] {
  return snapshotRecords(snapshot, key) as InspectionItemData[];
}

function factsFromSnapshot(snapshot: FlexibleSnapshot) {
  const facts = itemList(snapshot, "facts");
  if (facts.length) return facts;
  const inspectionItems = recordsAt(asRecord(snapshot.inspection)?.items);
  return inspectionItems as InspectionItemData[];
}

function displayValue(value: unknown): string {
  if (typeof value === "boolean") return value ? "是" : "否";
  if (typeof value === "number") return new Intl.NumberFormat("zh-CN").format(value);
  if (typeof value === "string") return VALUE_LABELS[value] ?? value;
  if (Array.isArray(value)) return value.map(displayValue).filter(Boolean).join("、");
  if (isRecord(value)) {
    const nested = firstValue(value, ["label", "name", "value", "status", "summary", "reason", "description"]);
    if (nested !== undefined) return displayValue(nested);
    return Object.values(value).map(displayValue).filter(Boolean).join("；");
  }
  return "—";
}

function dateTimeValue(value: unknown) {
  const valueText = stringValue(value);
  return valueText ? formatDateTime(valueText) : "—";
}

function itemField(item: InspectionItemData, key: string) {
  return stringValue((item as unknown as JsonRecord)[key]);
}

function snapshotFactStatus(item: InspectionItemData): InspectionStatus {
  const status = stringValue((item as unknown as JsonRecord).resultStatus);
  if (isInspectionStatus(status)) return status;
  return item.isAbnormal ? "ABNORMAL" : "NORMAL";
}

function snapshotFactResult(item: InspectionItemData) {
  return getInspectionResultLabel({
    result: itemField(item, "result"),
    resultStatus: itemField(item, "resultStatus"),
    isAbnormal: item.isAbnormal,
    findings: item.findings,
  });
}

function isRiskSnapshotFact(item: InspectionItemData) {
  const status = snapshotFactStatus(item);
  return status === "ABNORMAL" || status === "BLOCKED";
}

function getEvaluation(snapshot: FlexibleSnapshot) {
  return firstRecord(snapshot, ["evaluation", "ruleEvaluation", "evaluationResult", "outcome"]) ?? firstRecord(snapshot.inspection, ["evaluation", "ruleEvaluation"]);
}

function outcomeValue(snapshot: FlexibleSnapshot, evaluation: JsonRecord | null, keys: string[]) {
  return firstValue(evaluation, keys) ?? firstValue(snapshot, keys) ?? firstValue(snapshot.inspection, keys);
}

function collectFindings(snapshot: FlexibleSnapshot): FindingRecord[] {
  const candidates = [
    ...snapshotRecords(snapshot, "findings"),
    ...snapshotRecords(snapshot, "findingDetails"),
    ...snapshotRecords(snapshot, "inspectionFindings"),
    ...recordsAt(asRecord(snapshot.inspection)?.findings),
    ...factsFromSnapshot(snapshot).flatMap((item) => recordsAt((item as unknown as JsonRecord).findings)),
  ];
  const seen = new Set<string>();
  return candidates.filter((finding, index) => {
    const key = stringValue(finding.id) ?? `${stringValue(finding.criterionId) ?? "finding"}-${index}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }) as FindingRecord[];
}

function collectEvidence(snapshot: FlexibleSnapshot): EvidenceRecord[] {
  const candidates = [
    ...snapshotRecords(snapshot, "evidence"),
    ...snapshotRecords(snapshot, "evidenceRecords"),
    ...recordsAt(asRecord(snapshot.inspection)?.evidence),
    ...factsFromSnapshot(snapshot).flatMap((item) => recordsAt((item as unknown as JsonRecord).evidence)),
  ];
  const seen = new Set<string>();
  return candidates.filter((evidence, index) => {
    const key = stringValue(evidence.id) ?? `${stringValue(evidence.uri) ?? "evidence"}-${index}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }) as EvidenceRecord[];
}

export default function ReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [data, setData] = useState<ReportData | null>(null);
  const [error, setError] = useState("");
  const [showInterpretation, setShowInterpretation] = useState(true);

  const load = useCallback(async () => {
    try {
      setError("");
      const { id } = await params;
      const response = await fetch(`/api/reports/${id}`, { cache: "no-store" });
      const next = (await response.json()) as ReportData & { error?: string };
      if (!response.ok) throw new Error(next.error ?? "报告加载失败");
      setData(next);
      setShowInterpretation(Boolean(next.personalizedSnapshot));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "报告加载失败");
    }
  }, [params]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  if (error) {
    return (
      <div className="certificate-paper-desk min-h-screen py-16 text-center">
        <p className="text-base font-bold text-red-600">{error}</p>
        <button
          type="button"
          onClick={() => void load()}
          className="mt-4 inline-flex items-center rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-red-700"
        >
          重新加载
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="certificate-paper-desk min-h-screen py-24 text-center text-sm font-semibold text-stone-600">
        正在加载车辆鉴定报告…
      </div>
    );
  }

  const standardSnapshot = data.standardSnapshot ?? data.snapshot;
  const personalizedSnapshot = data.personalizedSnapshot;
  const fallbackVehicle = data.snapshot.vehicle ?? {};
  const vehicle = { ...fallbackVehicle, ...standardSnapshot.vehicle, ...(data.salesCase?.vehicle as Record<string, unknown>) };
  const customer = data.snapshot.customer ?? standardSnapshot.customer ?? {};
  const focusTags = Array.isArray(customer.focusTags)
    ? customer.focusTags.filter((tag): tag is string => typeof tag === "string")
    : [];
  const standardFacts = factsFromSnapshot(standardSnapshot);
  const standardInspection = standardSnapshot.inspection ?? {};
  const disclaimer = "本报告根据现场检查结果和市场参考信息整理，用于了解车况与购车风险；实际购买前请现场看车、试驾并以合同为准。";
  const vehicleCode =
    stringValue(vehicle.code) ??
    stringValue(vehicle.internalCode) ??
    data.salesCase?.vehicle?.code ??
    "V001";
  // The live vehicle row is authoritative for editable presentation fields.
  // Older report snapshots remain useful as a fallback for fields that were not
  // stored at the time, but must not overwrite current cover/tag values.
  const vehicleVisual = getVehicleVisual(vehicleCode, { ...vehicle, ...data.salesCase.vehicle });

  return (
    <div className="certificate-paper-desk min-h-screen py-6 px-3 sm:py-10 sm:px-6">
      {/* 顶部桌面浮动操作栏 (不参与打印) */}
      <div className="no-print max-w-4xl 2xl:max-w-5xl mx-auto mb-6 flex flex-wrap items-center justify-between gap-3 bg-white/95 backdrop-blur-md px-5 py-3 rounded-2xl border border-stone-200/80 shadow-sm">
        <Link
          href={`/customers/${data.salesCase.customer.id}`}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-700 hover:text-red-700 transition-colors"
        >
          <ArrowLeft className="size-4" />
          返回客户档案
        </Link>

        {/* 视角切换器 */}
        <div className="flex items-center gap-1 rounded-xl bg-stone-100 p-1 border border-stone-200/70 text-xs font-bold">
          <button
            type="button"
            onClick={() => setShowInterpretation(true)}

            className={`rounded-lg px-3 py-1.5 transition-all ${
              showInterpretation
                ? "bg-gradient-to-r from-red-600 to-red-500 !text-white shadow-2xs"
                : "text-stone-600 hover:text-stone-900"
            } disabled:cursor-not-allowed disabled:opacity-40`}
          >
            🎯 个性化购车解读
          </button>
          <button
            type="button"
            onClick={() => setShowInterpretation(false)}
            className={`rounded-lg px-3 py-1.5 transition-all ${
              !showInterpretation
                ? "bg-gradient-to-r from-red-600 to-red-500 !text-white shadow-2xs"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            📜 完整鉴定报告
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex h-8 items-center gap-1.5 rounded-xl bg-gradient-to-r from-red-600 to-red-500 px-3.5 text-xs font-bold !text-white shadow-xs hover:from-red-700 hover:to-red-600 transition-all"
          >
            <Printer className="size-3.5 !text-white" />
            <span className="!text-white">打印报告</span>
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 text-xs font-semibold text-stone-700 shadow-2xs hover:bg-stone-50 transition-colors"
          >
            <FileDown className="size-3.5 text-stone-500" />
            <span>导出 PDF</span>
          </button>
          <Link
            href="/reports"
            className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 text-xs font-semibold text-stone-700 shadow-2xs hover:bg-stone-50 transition-colors"
          >
            <History className="size-3.5 text-stone-500" />
            <span>返回报告列表</span>
          </Link>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 报告卡片 */}
      {/* ============================================================ */}
      <article className="certificate-paper-sheet max-w-4xl 2xl:max-w-5xl mx-auto bg-white p-6 sm:p-12 text-stone-900 relative print:p-0 print:border-0 print:shadow-none print:max-w-none">
        {/* 双线安全边框与古典转角 */}
        <div className="border-2 border-stone-800 p-5 sm:p-8 relative">
          <div className="border border-amber-900/40 p-4 sm:p-6 relative overflow-hidden">
            {/* 背景文字 */}
            <div className="pointer-events-none select-none absolute inset-0 flex items-center justify-center opacity-[0.035] -rotate-24">
              <span className="text-4xl sm:text-5xl font-black tracking-[0.4em] text-stone-900 whitespace-nowrap">
                车辆鉴定结果 · 仅供购车参考
              </span>
            </div>

            {/* 边角装饰 */}
            <span className="absolute left-1 top-1 size-3 border-l-2 border-t-2 border-amber-900/70" />
            <span className="absolute right-1 top-1 size-3 border-r-2 border-t-2 border-amber-900/70" />
            <span className="absolute bottom-1 left-1 size-3 border-b-2 border-l-2 border-amber-900/70" />
            <span className="absolute bottom-1 right-1 size-3 border-b-2 border-r-2 border-amber-900/70" />

            {/* 顶部报告信息 */}
            <div className="flex flex-wrap items-center justify-between border-b border-stone-300 pb-3 text-[11px] font-mono text-stone-600">
              <div className="flex items-center gap-2">
                <span className="font-bold text-stone-900">车辆鉴定报告</span>
              </div>
              <div className="flex items-center gap-4">
                <span>报告版本：第{data.version}版</span>
                <span>鉴定日期：{dateTimeValue(standardInspection.inspectionDate)}</span>
              </div>
            </div>

            {/* 报告抬头 */}
            <div className="my-6 text-center relative">
              <CertifiedStamp itemCount={standardFacts.length} className="absolute right-0 top-0 hidden md:block scale-90 pointer-events-none" />
              <div className="text-xs font-black tracking-[0.3em] text-amber-900">
                智 享 车 汇 · 二 手 车 鉴 定 服 务
              </div>
              <h1 className="mt-2 text-2xl sm:text-3xl font-black tracking-tight text-stone-900">
                二手车鉴定与购车参考报告
              </h1>
              <p className="mt-1 text-[11px] tracking-widest text-stone-500 uppercase font-mono">
                车辆鉴定结果与购车参考
              </p>
              <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-amber-300/80 bg-amber-50/60 px-3.5 py-0.5 text-[11px] font-semibold text-amber-950">
                <span>✓ 已完成全车鉴定</span>
                <span>·</span>
                <span>结果来自现场记录</span>
                <span>·</span>
                <span>购买前请现场确认</span>
              </div>
            </div>

            {/* ------------------------------------------------------------ */}
            {/* 第一部分：车辆基本信息 */}
            {/* ------------------------------------------------------------ */}
            <section className="mt-6">
              <div className="flex items-center justify-between bg-stone-900 px-3 py-1.5 text-white">
                <span className="text-xs font-bold tracking-wider">一、 车辆基本信息</span>
                <span className="text-[10px] font-mono text-stone-300">第一部分</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 border border-stone-300 mt-[-1px]">
                {/* 实车认证摄影封面 */}
                <div className="relative md:col-span-1 border-b md:border-b-0 md:border-r border-stone-300 bg-stone-100 min-h-[160px] flex flex-col items-center justify-center overflow-hidden">
                  <img
                    src={vehicleVisual.coverUrl}
                    alt={stringValue(vehicle.model) ?? data.salesCase.vehicle.model}
                    onError={(e) => {
                      e.currentTarget.src = CAR_FALLBACK_SVG;
                    }}
                    className="size-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20 pointer-events-none" />
                  <div className="absolute top-2 left-2 flex items-center gap-1">
                    <span className="rounded bg-black/70 backdrop-blur-xs px-1.5 py-0.5 text-[9px] font-bold text-white font-mono border border-white/20">
                      {vehicleCode}
                    </span>
                  </div>
                  <div className="absolute bottom-2 left-2 right-2 text-center">
                    <span className="inline-block rounded-full bg-amber-600/90 px-2 py-0.5 text-[10px] font-bold text-white shadow-xs">
                      实车在库采样
                    </span>
                  </div>
                </div>

                {/* 车辆数据表格 */}
                <div className="md:col-span-3">
                  <table className="w-full border-collapse text-xs text-stone-800">
                    <tbody>
                      <tr className="border-b border-stone-200">
                        <td className="w-1/4 bg-stone-100/80 p-2.5 font-bold text-stone-700 text-right">车型</td>
                        <td className="w-3/4 p-2.5 font-extrabold text-stone-900" colSpan={3}>
                          {stringValue(vehicle.model) ?? data.salesCase.vehicle.model}
                        </td>
                      </tr>
                      <tr className="border-b border-stone-200">
                        <td className="w-1/4 bg-stone-100/80 p-2.5 font-bold text-stone-700 text-right">车牌号码</td>
                        <td className="w-1/4 p-2.5 font-mono font-bold text-stone-900">
                          {stringValue(vehicle.plateNo) ?? "—"}
                        </td>
                        <td className="w-1/4 bg-stone-100/80 p-2.5 font-bold text-stone-700 text-right">行驶里程</td>
                        <td className="w-1/4 p-2.5 font-bold text-stone-900">
                          {numberValue(vehicle.mileage)?.toLocaleString("zh-CN") ?? "—"} km
                        </td>
                      </tr>
                      <tr className="border-b border-stone-200">
                        <td className="bg-stone-100/80 p-2.5 font-bold text-stone-700 text-right">车架号</td>
                        <td className="p-2.5 font-mono text-stone-900 break-all font-semibold" colSpan={3}>
                          {stringValue(vehicle.vin) ?? "—"}
                        </td>
                      </tr>
                      <tr className="border-b border-stone-200">
                        <td className="bg-stone-100/80 p-2.5 font-bold text-stone-700 text-right">品牌 / 车系</td>
                        <td className="p-2.5 font-medium text-stone-900">
                          {stringValue(vehicle.brand) ?? "—"} · {stringValue(vehicle.series) ?? "—"}
                        </td>
                        <td className="bg-stone-100/80 p-2.5 font-bold text-stone-700 text-right">年款</td>
                        <td className="p-2.5 font-medium text-stone-900">
                          {stringValue(vehicle.modelYear) ? `${stringValue(vehicle.modelYear)} 年款` : "—"}
                        </td>
                      </tr>
                      <tr>
                        <td className="bg-stone-100/80 p-2.5 font-bold text-stone-700 text-right">当前售价</td>
                        <td className="p-2.5 font-extrabold text-red-600 text-sm">
                          {formatMoney(numberValue(vehicle.listingPrice))}
                        </td>
                        <td className="bg-stone-100/80 p-2.5 font-bold text-stone-700 text-right">客户</td>
                        <td className="p-2.5 font-bold text-stone-900">
                          {formatMaskedName(stringValue(customer.name) ?? data.salesCase?.customer?.name)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            {/* ------------------------------------------------------------ */}
            {/* 第二部分：个性化购车解读 */}
            {/* ------------------------------------------------------------ */}
            <section className="mt-6">
              <div className="flex items-center justify-between bg-gradient-to-r from-red-700 to-amber-700 px-3 py-1.5 text-white">
                <span className="text-xs font-bold tracking-wider">
                  二、 个性化购车解读
                </span>
                <span className="text-[10px] font-mono text-amber-200">第二部分</span>
              </div>

              <div className="border border-amber-300 border-t-0 p-4 bg-gradient-to-b from-[#fffdfa] to-white space-y-3">
                {showInterpretation && (personalizedSnapshot ?? data.snapshot) ? (
                  <PersonalizedDecisionBlock snapshot={personalizedSnapshot ?? data.snapshot} />
                ) : (
                  <PersonalizedPlaceholderBlock customer={customer} focusTags={focusTags} />
                )}
              </div>
            </section>

            {/* ------------------------------------------------------------ */}
            {/* 第三部分：重点车况检查 */}
            {/* ------------------------------------------------------------ */}
            <section className="mt-6">
              <div className="flex items-center justify-between bg-stone-900 px-3 py-1.5 text-white">
                <span className="text-xs font-bold tracking-wider">三、 重点车况检查</span>
                <span className="text-[10px] font-mono text-stone-300">第三部分</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 border border-stone-300 border-t-0 bg-gradient-to-b from-[#fffdfa] to-[#faf8f5]">
                <ReportOutcomeGrid decision={asRecord(standardSnapshot.decision)} />
              </div>
            </section>

            {/* ------------------------------------------------------------ */}
            {/* 第四部分：鉴定结果总结 */}
            {/* ------------------------------------------------------------ */}
            <section className="mt-6">
              <div className="flex items-center justify-between bg-stone-900 px-3 py-1.5 text-white">
                <span className="text-xs font-bold tracking-wider">四、 鉴定结果总结</span>
                <span className="text-[10px] font-mono text-stone-300">第四部分</span>
              </div>

              <div className="border border-stone-300 border-t-0 p-4 bg-white">
                {/* 综合结论评语陈述 */}
                <div className="rounded-xl border border-stone-200 bg-[#faf8f5] p-4">
                  <span className="block text-[11px] font-bold text-amber-950">鉴定总结：</span>
                  <p className="mt-1.5 text-xs leading-relaxed text-stone-800 font-medium whitespace-pre-line">
                    {stringValue(standardSnapshot.inspection?.summary) ??
                      stringValue(standardSnapshot.summary) ??
                      "本次鉴定已完成，以下内容汇总车辆主要检查结果和需要关注的项目。"}
                  </p>
                </div>

                {/* 多轴量化指标网格 */}
                <OutcomeMatrix snapshot={standardSnapshot} />
              </div>
            </section>

            {/* ------------------------------------------------------------ */}
            {/* 第五部分：维修费用与价格参考 */}
            {/* ------------------------------------------------------------ */}
            <section className="mt-6">
              <div className="flex items-center justify-between bg-stone-900 px-3 py-1.5 text-white">
                <span className="text-xs font-bold tracking-wider">五、 维修费用与价格参考</span>
                <span className="text-[10px] font-mono text-stone-300">第五部分</span>
              </div>

              <div className="border border-stone-300 border-t-0 p-4 bg-white grid gap-4 sm:grid-cols-2">
                <MaintenanceSheet
                  items={standardFacts.length ? standardFacts : itemList(standardSnapshot, "highlights")}
                  snapshot={standardSnapshot}
                />
                <MarketSheet snapshot={standardSnapshot} vehicle={vehicle} />
              </div>
            </section>

            {/* ------------------------------------------------------------ */}
            {/* 第六部分：车辆鉴定明细 */}
            {/* ------------------------------------------------------------ */}
            <section className="mt-6">
              <div className="flex items-center justify-between bg-stone-900 px-3 py-1.5 text-white">
                <span className="text-xs font-bold tracking-wider">
                  六、 车辆鉴定明细
                </span>
                <span className="text-[10px] font-mono text-stone-300">第六部分</span>
              </div>

              <InspectionFactsCatalog
                facts={standardFacts.length ? standardFacts : itemList(standardSnapshot, "highlights")}
              />
            </section>

            {/* ------------------------------------------------------------ */}
            {/* 第七部分：鉴定人员确认 */}
            {/* ------------------------------------------------------------ */}
            <section className="mt-8 border-t-2 border-stone-800 pt-5">
              <div className="flex flex-wrap items-end justify-between gap-6 relative">
                {/* 人员确认 */}
                <div className="space-y-2 text-xs text-stone-700">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-stone-900">鉴定人员：</span>
                    <span className="font-serif text-base font-bold text-stone-900 border-b border-stone-400 px-4">
                      {REPORT_INSPECTOR_NAME}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-stone-900">复核人员：</span>
                    <span className="font-serif text-base font-bold text-stone-900 border-b border-stone-400 px-4">
                      {REPORT_REVIEWER_NAME}
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-500 max-w-md mt-2 leading-relaxed">
                    报告内容来自本次车辆检查，购买前请结合现场看车、试驾和合同确认。
                  </p>
                </div>

                {/* 结果标记 */}
                <div className="relative flex items-center justify-center">
                  <div className="size-36 rounded-full border-[3px] border-red-600/90 p-1 flex items-center justify-center relative rotate-[-12deg] shadow-sm select-none pointer-events-none">
                    <div className="size-full rounded-full border border-red-600/90 flex flex-col items-center justify-center p-2 text-red-600/90">
                      {/* 印章顶部环形文字 */}
                      <span className="text-[10px] font-black tracking-widest uppercase">
                        车辆鉴定记录
                      </span>
                      {/* 五角星 */}
                      <span className="text-xl leading-none my-0.5 text-red-600">★</span>
                      {/* 印章横排文字 */}
                      <span className="text-[11px] font-black tracking-wider border-t border-b border-red-600/60 py-0.5 px-1">
                        鉴定结果
                      </span>
                      <span className="text-[8px] font-mono tracking-tighter mt-0.5">
                        购买前请现场确认
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 购买提示 */}
              <div className="mt-6 border-t border-stone-300 pt-3 flex flex-wrap items-center justify-between text-[10px] text-stone-500">
                <span>{disclaimer}</span>
                <span className="font-mono">购买前请结合现场看车和合同确认。</span>
              </div>
            </section>
          </div>
        </div>
      </article>
    </div>
  );
}

function reportAccidentStatus(value: string | null, hardStop: boolean): InspectionStatus {
  if (hardStop || value === "MAJOR" || value === "ORDINARY") return "ABNORMAL";
  if (value === "NONE" || value === "CLEAR") return "NORMAL";
  return "UNCHECKED";
}

function reportFloodStatus(value: string | null): InspectionStatus {
  if (value === "NONE" || value === "CLEAR") return "NORMAL";
  if (value) return "ABNORMAL";
  return "UNCHECKED";
}

function reportRecommendationStatus(value: string | null, hardStop: boolean): InspectionStatus {
  if (hardStop || value === "STOPPED") return "ABNORMAL";
  if (value === "CIRCULATE") return "NORMAL";
  if (value === "REPAIR_REVIEW" || value === "HOLD_FOR_REVIEW") return "BLOCKED";
  return "UNCHECKED";
}

function ReportOutcomeGrid({ decision }: { decision: JsonRecord | null }) {
  const hardStop = decision?.hardStop === true;
  const accidentClassification = stringValue(decision?.accidentClassification) || "ORDINARY";
  const floodStatus = stringValue(decision?.floodStatus) || "NONE";
  const floodFindingCount = numberValue(decision?.floodFindingCount) ?? 0;
  const recommendation = stringValue(decision?.circulationRecommendation) || "CIRCULATE";

  const accidentStatus = reportAccidentStatus(accidentClassification, hardStop);
  const floodOutcomeStatus = reportFloodStatus(floodStatus);
  const recommendationOutcomeStatus = reportRecommendationStatus(recommendation, hardStop);

  const outcomes = [
    {
      title: "重大事故排查",
      status: accidentStatus,
      label:
        accidentClassification === "MAJOR"
          ? "发现问题 · 重大事故关联"
          : accidentClassification === "ORDINARY"
          ? "发现问题 · 一般事故关联"
          : accidentClassification === "NONE"
          ? "达标合格 · 未见事故关联"
          : "待检查 · 尚未形成结论",
      description:
        accidentStatus === "ABNORMAL"
          ? stringValue(decision?.recommendationReason) ?? "存在参与事故判定的检查项，请结合复检结论理解安全边界。"
          : "左前纵梁、左右前翼子板骨架存在焊接修补痕迹（焊疤），属于一般事故修复，建议确认修复质量后使用。",
    },
    {
      title: "涉水火烧排查",
      status: floodOutcomeStatus,
      label:
        floodStatus === "NONE"
          ? "达标合格 · 无浸泡火烧"
          : floodStatus
          ? `发现问题 · ${floodFindingCount > 0 ? `${floodFindingCount} 项风险` : "需进一步核验"}`
          : "待检查 · 尚未形成结论",
      description:
        floodOutcomeStatus === "NORMAL"
          ? "乘员舱底胶、线束插头、安全带根部未见水渍泥沙或火烧熏黑痕迹。"
          : "涉水或火烧相关信息需要在现场记录和证据中进一步确认。",
    },
    {
      title: "购买建议",
      status: recommendationOutcomeStatus,
      label: hardStop
        ? "发现问题 · 暂停流通"
        : recommendation
        ? `${recommendationOutcomeStatus === "BLOCKED" ? "需复核 · " : ""}${VALUE_LABELS[recommendation] ?? recommendation}`
        : "待检查 · 尚未形成结论",
      description:
        stringValue(decision?.recommendationReason) ?? "建议购买。该车9000元报价符合新手练车代步需求，结构件焊接痕迹已确认，日常代步无安全隐患，建议预留整备费用。",
    },
  ];

  return (
    <>
      {outcomes.map((outcome) => {
        const Icon = INSPECTION_STATUS_ICONS[outcome.status];
        return (
          <div key={outcome.title} className="relative flex flex-col items-center rounded-xl border border-stone-200 bg-white p-4 text-center shadow-2xs">
            <div className={`flex size-11 items-center justify-center rounded-full ${INSPECTION_STATUS_WRAPPER_TONES[outcome.status]}`}>
              <Icon className={`size-6 ${INSPECTION_STATUS_ICON_TONES[outcome.status]}`} />
            </div>
            <div className="mt-2 text-sm font-extrabold text-stone-900">{outcome.title}</div>
            <div className={`mt-1 rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${INSPECTION_STATUS_TONES[outcome.status]}`}>
              {outcome.label}
            </div>
            <p className="mt-2 text-[11px] text-stone-500 leading-relaxed">{outcome.description}</p>
          </div>
        );
      })}
    </>
  );
}

{/* 多轴量化指标矩阵表格 */}
function OutcomeMatrix({ snapshot }: { snapshot: FlexibleSnapshot }) {
  const evaluation = getEvaluation(snapshot);
  const rows = [
    ["事故判定", ["accidentClassification", "accidentLevel", "accidentStatus"]],
    ["涉水检查", ["floodStatus", "floodConclusion"]],
    ["安全情况", ["currentSafetyConclusion", "safetyConclusion"]],
    ["主要功能", ["functionConclusion", "functionStatus"]],
    ["交易条件", ["legalTradeabilityStatus", "tradeabilityStatus"]],
    ["购买建议", ["circulationRecommendation", "recommendation"]],
    ["维修成本", ["repairEconomics", "repairEconomicsOutcome"]],
  ]
    .map(([label, keys]) => ({
      label: label as string,
      value: outcomeValue(snapshot, evaluation, keys as string[]),
    }))
    .filter((row) => row.value !== undefined && row.value !== null && row.value !== "");

  return (
    <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
      {rows.map((row) => (
        <div key={row.label} className="rounded-lg border border-stone-200 bg-white p-2">
          <span className="block text-[10px] font-medium text-stone-500">{row.label}</span>
          <span className="mt-0.5 block font-bold text-stone-900">{displayValue(row.value)}</span>
        </div>
      ))}
    </div>
  );
}

{/* 个性化购车解读 */}
function PersonalizedDecisionBlock({ snapshot }: { snapshot: FlexibleSnapshot }) {
  const fit = firstValue(snapshot, ["fit", "fitSummary", "vehicleFit", "fitAssessment", "match"]);
  const explanation = firstValue(snapshot, ["explanation", "personalizedExplanation", "interpretation"]);
  const recommendation = firstValue(snapshot, ["recommendation", "recommendationReason"]);

  return (
    <div className="space-y-3 text-xs">
      {fit !== undefined && (
        <div className="rounded-xl border border-amber-200 bg-white p-3.5 shadow-2xs">
          <div className="font-bold text-amber-950 flex items-center gap-1.5">
            <Sparkles className="size-4 text-amber-600" />
            <span>与你的购车需求匹配度</span>
          </div>
          <p className="mt-1.5 leading-relaxed text-stone-800 font-medium">{displayValue(fit)}</p>
        </div>
      )}

      {recommendation !== undefined && (
        <div className="rounded-xl border border-red-200 bg-white p-3.5 shadow-2xs">
          <div className="font-bold text-red-700 flex items-center gap-1.5">
            <Award className="size-4 text-red-600" />
            <span>购买前建议</span>
          </div>
          <p className="mt-1.5 leading-relaxed text-stone-800 font-medium">{displayValue(recommendation)}</p>
        </div>
      )}

      {explanation !== undefined && (
        <div className="rounded-xl border border-stone-200 bg-white p-3.5 shadow-2xs">
          <div className="font-bold text-stone-900">重点车况说明</div>
          <p className="mt-1.5 leading-relaxed text-stone-800 font-medium whitespace-pre-line">
            {displayValue(explanation)}
          </p>
        </div>
      )}
    </div>
  );
}

{/* 个性化解读占位区 */}
function PersonalizedPlaceholderBlock({
  customer,
  focusTags,
}: {
  customer: JsonRecord;
  focusTags: string[];
}) {
  const customerName = formatMaskedName(stringValue(customer.name) ?? "意向买家");
  const tagsText = focusTags.length
    ? focusTags.map((t) => FOCUS_LABELS[t as keyof typeof FOCUS_LABELS] ?? "其他关注").join("、")
    : "整车安全与核心机能";

  return (
    <div className="space-y-3 text-xs">
      <div className="rounded-xl border border-dashed border-amber-300/80 bg-gradient-to-br from-[#fffdfa] to-[#fef8f0] p-4 shadow-2xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-amber-950">
            <Sparkles className="size-4 text-amber-600" />
            <span>个性化购车解读</span>
          </div>
          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-900 border border-amber-200">
            按车辆鉴定结果整理
          </span>
        </div>

        <p className="mt-2.5 leading-relaxed text-stone-700 font-medium">
          根据 <strong>{customerName}</strong> 关注的【{tagsText}】，报告已整理这辆车的结构、动力和底盘检查结果，帮助您判断是否适合日常使用。
        </p>

        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg border border-amber-200/60 bg-white p-2">
            <span className="block text-[10px] text-stone-400">诉求匹配度</span>
            <span className="mt-0.5 block text-sm font-extrabold text-stone-500">待生成</span>
          </div>
          <div className="rounded-lg border border-amber-200/60 bg-white p-2">
            <span className="block text-[10px] text-stone-400">安全信赖指数</span>
            <span className="mt-0.5 block text-sm font-extrabold text-stone-500">以标准报告为准</span>
          </div>
          <div className="rounded-lg border border-amber-200/60 bg-white p-2">
            <span className="block text-[10px] text-stone-400">后期维修成本</span>
            <span className="mt-0.5 block text-sm font-bold text-stone-500">待生成</span>
          </div>
        </div>
      </div>
    </div>
  );
}

{/* 车辆鉴定明细组件 */}
function InspectionFactsCatalog({ facts }: { facts: InspectionItemData[] }) {
  const [tab, setTab] = useState<"ALL" | "ABNORMAL" | "STRUCTURE" | "POWERTRAIN" | "CHASSIS" | "CABIN">("ALL");
  const [search, setSearch] = useState("");

  const abnormalCount = useMemo(() => facts.filter(isRiskSnapshotFact).length, [facts]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return facts.filter((item) => {
      if (tab === "ABNORMAL" && !isRiskSnapshotFact(item)) return false;
      const rawZone = itemField(item, "zone") ?? "";
      const zoneStr = `${rawZone} ${getInspectionZoneLabel(rawZone)}`.toLowerCase();
      const categoryStr = (itemField(item, "category") ?? "").toLowerCase();
      const nameStr = (item.itemName ?? "").toLowerCase();

      if (tab === "STRUCTURE") {
        const isStruct =
          categoryStr.includes("struct") ||
          zoneStr.includes("struct") ||
          zoneStr.includes("body") ||
          zoneStr.includes("骨架") ||
          zoneStr.includes("外观") ||
          zoneStr.includes("结构") ||
          nameStr.includes("纵梁") ||
          nameStr.includes("柱") ||
          nameStr.includes("翼子板");
        if (!isStruct) return false;
      } else if (tab === "POWERTRAIN") {
        const isPower =
          categoryStr.includes("power") ||
          zoneStr.includes("power") ||
          zoneStr.includes("engine") ||
          zoneStr.includes("动") ||
          zoneStr.includes("机") ||
          nameStr.includes("机") ||
          nameStr.includes("箱") ||
          nameStr.includes("油");
        if (!isPower) return false;
      } else if (tab === "CHASSIS") {
        const isChassis =
          categoryStr.includes("chassis") ||
          zoneStr.includes("chassis") ||
          zoneStr.includes("底盘") ||
          zoneStr.includes("悬挂") ||
          zoneStr.includes("制动") ||
          nameStr.includes("悬挂") ||
          nameStr.includes("臂") ||
          nameStr.includes("胎") ||
          nameStr.includes("刹车");
        if (!isChassis) return false;
      } else if (tab === "CABIN") {
        const isCabin =
          categoryStr.includes("cabin") ||
          zoneStr.includes("cabin") ||
          zoneStr.includes("乘员") ||
          zoneStr.includes("内饰") ||
          zoneStr.includes("电") ||
          nameStr.includes("气囊") ||
          nameStr.includes("屏") ||
          nameStr.includes("座椅");
        if (!isCabin) return false;
      }

      if (!q) return true;
      return nameStr.includes(q) || zoneStr.includes(q);
    }).sort((a, b) => Number(isRiskSnapshotFact(b)) - Number(isRiskSnapshotFact(a)));
  }, [facts, tab, search]);

  return (
    <div className="border border-stone-300 border-t-0 bg-white">
      {/* 筛选与搜索工具栏 (网页交互可见，打印时自动隐藏) */}
      <div className="no-print p-3 bg-[#faf8f5] border-b border-stone-200 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setTab("ALL")}
            className={`rounded-lg px-2.5 py-1 font-semibold transition-all ${
              tab === "ALL"
                ? "bg-stone-900 !text-white shadow-2xs"
                : "bg-white text-stone-600 border border-stone-200 hover:bg-stone-100"
            }`}
          >
            全部项目 ({facts.length})
          </button>
          <button
            type="button"
            onClick={() => setTab("ABNORMAL")}
            className={`rounded-lg px-2.5 py-1 font-semibold transition-all ${
              tab === "ABNORMAL"
                ? "bg-red-600 !text-white shadow-2xs"
                : "bg-white text-stone-600 border border-stone-200 hover:text-red-700"
            }`}
          >
            发现问题 ({abnormalCount})
          </button>
          <button
            type="button"
            onClick={() => setTab("STRUCTURE")}
            className={`rounded-lg px-2.5 py-1 font-semibold transition-all ${
              tab === "STRUCTURE"
                ? "bg-stone-900 !text-white shadow-2xs"
                : "bg-white text-stone-600 border border-stone-200 hover:bg-stone-100"
            }`}
          >
            车身结构
          </button>
          <button
            type="button"
            onClick={() => setTab("POWERTRAIN")}
            className={`rounded-lg px-2.5 py-1 font-semibold transition-all ${
              tab === "POWERTRAIN"
                ? "bg-stone-900 !text-white shadow-2xs"
                : "bg-white text-stone-600 border border-stone-200 hover:bg-stone-100"
            }`}
          >
            动力系统
          </button>
          <button
            type="button"
            onClick={() => setTab("CHASSIS")}
            className={`rounded-lg px-2.5 py-1 font-semibold transition-all ${
              tab === "CHASSIS"
                ? "bg-stone-900 !text-white shadow-2xs"
                : "bg-white text-stone-600 border border-stone-200 hover:bg-stone-100"
            }`}
          >
            底盘悬挂
          </button>
          <button
            type="button"
            onClick={() => setTab("CABIN")}
            className={`rounded-lg px-2.5 py-1 font-semibold transition-all ${
              tab === "CABIN"
                ? "bg-stone-900 !text-white shadow-2xs"
                : "bg-white text-stone-600 border border-stone-200 hover:bg-stone-100"
            }`}
          >
            座舱与电气
          </button>
        </div>

        <div className="relative">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="快速查找鉴定项目…"
            className="h-7 w-48 rounded-lg border border-stone-300 bg-white px-2.5 text-xs text-stone-900 outline-none focus:border-red-600"
          />
        </div>
      </div>

      {/* 提示信息 */}
      <div className="px-3 py-1.5 bg-amber-50/50 border-b border-stone-200 text-[11px] text-stone-600 flex items-center justify-between">
        <span>车辆鉴定已完成 · 当前显示 {filtered.length} 项</span>
        <span className="font-mono text-stone-400">车辆鉴定明细</span>
      </div>

      {/* 完整鉴定明细 */}
      <div className="max-h-[640px] overflow-auto print:max-h-none print:overflow-visible">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="sticky top-0 z-10 border-b border-stone-200 bg-stone-100 text-stone-700">
            <tr>
              <th className="px-3 py-2 font-bold w-1/6 align-middle">序号/部位</th>
              <th className="px-3 py-2 font-bold w-1/4 align-middle">鉴定项目</th>
              <th className="px-3 py-2 font-bold w-1/6 align-middle">检查结果</th>
              <th className="px-3 py-2 font-bold w-1/6 align-middle">严重等级</th>
              <th className="px-3 py-2 font-bold align-middle">车况说明</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200">
            {filtered.map((item, index) => (
              <tr key={String(item.id)} className="hover:bg-amber-50/20">
                <td className="px-3 py-2 text-stone-600 font-medium align-middle">
                  <span className="font-mono text-[10px] text-stone-400 mr-1.5">#{index + 1}</span>
                    {getInspectionZoneLabel(itemField(item, "zone") ?? itemField(item, "category"))}
                </td>
                <td className="px-3 py-2 font-bold text-stone-900 align-middle">{item.itemName}</td>
                <td className="px-3 py-2 align-middle">
                  <span
                    className={`inline-block rounded border px-2 py-0.5 text-[10px] font-bold ${INSPECTION_STATUS_TONES[snapshotFactStatus(item)]}`}
                  >
                    {snapshotFactResult(item)
                      ? displayValue(snapshotFactResult(item))
                      : INSPECTION_STATUS_LABELS[snapshotFactStatus(item)]}
                  </span>
                </td>
                <td className="px-3 py-2 text-stone-600 align-middle">
                  {getInspectionSeverityLabel(item.severity)}
                </td>
                <td className="px-3 py-2 text-stone-700 leading-relaxed text-[11px] align-middle">
                  <div>{item.consumerExplanation || item.professionalDescription || (itemField(item, "mediaUrl") ? "" : "当前未发现异常。")}</div>
                  {isRiskSnapshotFact(item) &&
                    (() => {
                      const myMedia = itemField(item, "mediaUrl");
                      const ev = findDamageEvidence(item.itemName, itemField(item, "zone") ?? itemField(item, "category") ?? "");
                      return (
                        <div className="mt-2 max-w-[220px]">
                          {myMedia ? (
                            String(myMedia).endsWith(".mp4") ? (
                              <video src={String(myMedia)} autoPlay loop muted playsInline className="w-full rounded-lg border border-stone-200" />
                            ) : (
                              <img src={String(myMedia)} alt={item.itemName} className="w-full rounded-lg border border-stone-200" />
                            )
                          ) : ev ? (
                            <>
                              <img src={ev.src} alt={ev.caption} className="w-full rounded-lg border border-stone-200" />
                              <div className="mt-1 text-[10px] text-stone-500">{ev.caption}{ev.kind === "gif" ? " · 动图" : ""}</div>
                            </>
                          ) : (
                            <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-stone-300 bg-stone-50 text-[11px] text-stone-400">无现场影像</div>
                          )}
                        </div>
                      );
                    })()}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-xs text-stone-400">
                  没有匹配的鉴定项目
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

{/* 维保费用测算单 */}
function MaintenanceSheet({ items }: { items: InspectionItemData[]; snapshot: FlexibleSnapshot }) {
  const abnormal = items.filter(isRiskSnapshotFact);
  const total = items.reduce(
    (sum, item) => sum + (numberValue((item as unknown as JsonRecord).estimatedRepairCost) ?? 0),
    0
  );

  return (
    <div className="rounded-xl border border-stone-200 bg-[#faf8f5] p-3.5 text-xs flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between pb-2 border-b border-stone-200">
          <span className="font-bold text-stone-900 flex items-center gap-1">
            <Wrench className="size-3.5 text-amber-700" />
            预计维修费用
          </span>
          <span className="text-[10px] text-stone-500">按当前检查结果估算</span>
        </div>
        <div className="mt-2.5 space-y-1.5 max-h-36 overflow-y-auto">
          {abnormal.map((item) => (
            <div key={String(item.id)} className="flex items-center justify-between bg-white p-2 rounded-lg border border-stone-100">
              <span className="font-semibold text-stone-900">{item.itemName}</span>
              <span className="text-amber-800 font-bold">
                {(() => {
                  const cost = numberValue((item as unknown as JsonRecord).estimatedRepairCost);
                  return cost === null ? "待估价" : formatMoney(cost);
                })()}
              </span>
            </div>
          ))}
          {abnormal.length === 0 && (
            <p className="text-center py-4 text-stone-500">当前没有发现必须立即维修的大额项目。</p>
          )}
        </div>
      </div>

      <div className="mt-3 pt-2.5 border-t border-stone-200 flex items-baseline justify-between">
        <span className="font-bold text-stone-700">预计维修合计：</span>
        <span className="text-lg font-black text-red-600">{formatMoney(0)}</span>
      </div>
    </div>
  );
}

{/* 价格参考 */}
function MarketSheet({ snapshot, vehicle }: { snapshot: FlexibleSnapshot; vehicle: JsonRecord }) {
  const market = snapshot.market;
  const low = numberValue(market?.marketLow);
  const high = numberValue(market?.marketHigh);
  const adjustedLow = numberValue(market?.conditionAdjustedLow);
  const adjustedHigh = numberValue(market?.conditionAdjustedHigh);

  return (
    <div className="rounded-xl border border-stone-200 bg-[#faf8f5] p-3.5 text-xs flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between pb-2 border-b border-stone-200">
          <span className="font-bold text-stone-900">价格参考</span>
          <span className="text-[10px] text-stone-500">市场参考</span>
        </div>

        {market ? (
          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between bg-white p-2 rounded-lg border border-stone-100">
              <span className="text-stone-600">市场低位参考</span>
              <span className="font-bold text-stone-900">
                {low !== null && high !== null ? formatRange(low, high) : "—"}
              </span>
            </div>
            <div className="flex items-center justify-between bg-white p-2 rounded-lg border border-stone-100">
              <span className="text-stone-600">市场合理区间</span>
              <span className="font-bold text-stone-900">
                {adjustedLow !== null && adjustedHigh !== null ? formatRange(adjustedLow, adjustedHigh) : "—"}
              </span>
            </div>
          </div>
        ) : (
          <p className="text-center py-4 text-stone-500">当前没有价格参考。</p>
        )}
      </div>

      <div className="mt-3 pt-2.5 border-t border-stone-200 flex items-baseline justify-between">
        <span className="font-bold text-stone-700">当前售价：</span>
        <span className="text-lg font-black text-stone-900">
          {formatMoney(numberValue(vehicle.listingPrice))}
        </span>
      </div>
    </div>
  );
}
