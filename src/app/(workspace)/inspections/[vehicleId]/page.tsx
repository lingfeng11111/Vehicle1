"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  Ban,
  Camera,
  CarFront,
  Check,
  CheckCircle2,
  Clock,
  FileCheck2,
  FileText,
  Images,
  ImagePlus,
  Loader2,
  Save,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  User,
  Wrench,
  X,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { formatImageFileSize, IMAGE_UPLOAD_ACCEPT, IMAGE_UPLOAD_MAX_BYTES, uploadImageFile } from "@/lib/image-upload";
import {
  INSPECTION_STATUS_ICONS,
  INSPECTION_STATUS_ICON_TONES,
  INSPECTION_STATUS_LABELS,
  INSPECTION_STATUS_TONES,
  INSPECTION_STATUS_WRAPPER_TONES,
  isInspectionStatus,
  type InspectionStatus,
} from "@/config/inspection-status";
import { REPORT_INSPECTOR_NAME, REPORT_REVIEWER_NAME } from "@/config/report-people";
import { formatDateTime, formatMoney } from "@/lib/format";
import { getInspectionResultLabel } from "@/services/inspection-result";

const FILTER_STATUSES: InspectionStatus[] = ["UNCHECKED", "NORMAL", "ABNORMAL", "BLOCKED", "NOT_APPLICABLE"];
const STATUS_LABELS = INSPECTION_STATUS_LABELS;
const STATUS_SHORT_LABELS = INSPECTION_STATUS_LABELS;
const STATUS_TONE = INSPECTION_STATUS_TONES;
const STATUS_ICONS = INSPECTION_STATUS_ICONS;
const STATUS_ICON_TONE = INSPECTION_STATUS_ICON_TONES;
const STATUS_ICON_WRAPPER_TONE = INSPECTION_STATUS_WRAPPER_TONES;

const FINDING_STATUS_LABELS: Record<string, string> = {
  UNCHECKED: "待判断",
  REACHED: "达到",
  NOT_REACHED: "未达到",
  NOT_APPLICABLE: "不适用",
  BLOCKED: "无法检查",
};

const NORMAL_NOTE_PRESETS = ["原厂装配平整", "螺栓无拆装拧动痕迹", "漆膜实测正常(80-120μm)", "表面光洁无锈蚀", "无渗油漏液", "原厂密封胶条规整"];
const BLOCKED_REASON_PRESETS = ["需双柱举升机检视底盘", "发动机下护板完全遮挡", "需拆卸内饰饰板/隔音棉", "电气系统未通电/无法启动", "需专用内窥镜深入探查", "机械钥匙锁闭无法开启"];
const NA_REASON_PRESETS = ["出厂低配未装配该功能", "纯电新能源车型(无燃油系统)", "前驱车型(无后驱动桥/差速器)", "机械减震(无空气悬挂气囊)", "手动挡(无自动挡电控单元)", "自吸发动机(无涡轮增压系统)"];

const ANALYSIS_FIELDS = [
  {
    key: "professionalDescription",
    label: "专业技术事实描述",
    placeholder: "记录可复核的现场事实：位置、尺寸、测量值、痕迹和排除项…",
  },
  {
    key: "consumerExplanation",
    label: "消费者通俗解读",
    placeholder: "用消费者容易理解的话说明：这代表什么、是否影响日常使用…",
  },
  {
    key: "futureRisk",
    label: "潜在后续风险评估",
    placeholder: "说明继续使用或未处理时可能出现的影响，以及需要复核的边界…",
  },
  {
    key: "repairSuggestion",
    label: "建议整备处置方案",
    placeholder: "填写建议的维修、复检、披露或交付前处置动作…",
  },
] as const;
type AnalysisField = (typeof ANALYSIS_FIELDS)[number]["key"];

type ExecutionStatus = InspectionStatus;
type FindingStatus = "UNCHECKED" | "REACHED" | "NOT_REACHED" | "NOT_APPLICABLE" | "BLOCKED";

type TemplateCriterion = {
  id: string;
  code: string;
  label: string;
  axis: string;
  criterionType: string;
  description?: string | null;
  ruleKey?: string | null;
  countsAsDistinctFloodFinding?: boolean;
  hardStopCriterion?: boolean;
  sortOrder: number;
  active?: boolean;
  sourceSheet?: string | null;
  sourceRow?: number | null;
  sourceColumn?: string | null;
  sourceText?: string | null;
  sourceNote?: string | null;
};

type TemplateItem = {
  id: string;
  code: string;
  name: string;
  category: string;
  componentClass: string;
  accidentDecisionParticipant: boolean;
  sortOrder: number;
  active: boolean;
  description?: string | null;
  sourceSheet?: string | null;
  sourceRow?: number | null;
  sourceSection?: string | null;
  sourceText?: string | null;
  position: {
    id: string;
    code: string;
    name: string;
    side?: string | null;
    sortOrder: number;
    floodAggregationKey?: string | null;
  };
  criteria: TemplateCriterion[];
};

type TemplatePosition = TemplateItem["position"] & { checkItems: TemplateItem[] };
type TemplateSection = {
  id: string;
  code: string;
  name: string;
  axis: string;
  sortOrder: number;
  description?: string | null;
  positions: TemplatePosition[];
};
type Template = {
  id: string;
  code: string;
  name: string;
  energyTypeScope: string;
  versionId: string;
  version: number;
  status: string;
  effectiveFrom?: string | null;
  sections: TemplateSection[];
};

type ApiFinding = {
  id: string;
  criterionId: string;
  status: FindingStatus | string;
  valueText?: string | null;
  note?: string | null;
  selectedBy?: string | null;
  updatedAt?: string;
  criterion?: { label?: string | null; sortOrder?: number | null; hardStopCriterion?: boolean | null } | null;
};
type ApiEvidence = {
  id: string;
  uri: string;
  mediaType: string;
  caption?: string | null;
  capturedBy?: string | null;
  capturedAt?: string;
};
type ApiInspectionItem = {
  id: string;
  checkItemId: string | null;
  positionId: string | null;
  zone: string;
  category: string;
  itemName: string;
  result: string;
  resultStatus: string;
  findingMode?: string | null;
  isAbnormal: boolean;
  severity: number;
  professionalDescription: string;
  consumerExplanation: string;
  futureRisk: string;
  repairSuggestion: string;
  estimatedRepairCost: number | null;
  notes?: string | null;
  operatorName?: string | null;
  checkedAt?: string | null;
  updatedAt?: string;
  findings?: ApiFinding[];
  evidence?: ApiEvidence[];
};

type MissingItem = {
  id: string;
  code: string;
  name: string;
  positionCode: string;
  positionName: string;
  sectionName: string;
};
type InspectionData = {
  vehicle: {
    id: string;
    code: string;
    model: string;
    brand?: string;
    series?: string;
    energyType?: string;
    plateNo?: string;
    vin?: string;
    listingPrice?: number;
  };
  inspection: {
    id: string;
    version: number;
    inspectionDate: string;
    inspectorName: string;
    status: string;
    completedAt?: string | null;
    lastSavedAt?: string | null;
    items: ApiInspectionItem[];
  };
  template: Template;
  progress: {
    total: number;
    checked: number;
    recorded?: number;
    implicitNormal?: number;
    complete: boolean;
    missing: MissingItem[];
  };
  evaluation?: unknown;
  evaluationHistory?: unknown[];
  consistency?: {
    valid: boolean;
    issues: Array<{ code: string; message: string; itemId: string; itemName: string }>;
  };
};
type DraftPatch = {
  notes?: string;
  estimatedRepairCost?: string;
  evidenceCaption?: string;
  professionalDescription?: string;
  consumerExplanation?: string;
  futureRisk?: string;
  repairSuggestion?: string;
};
type WorkCriterion = TemplateCriterion & { finding: ApiFinding | null; status: FindingStatus };
type WorkItem = {
  template: TemplateItem;
  section: TemplateSection;
  execution: ApiInspectionItem | null;
  recorded: boolean;
  implicitNormal: boolean;
  status: ExecutionStatus;
  result: string;
  isAbnormal: boolean;
  severity: number;
  findingMode: string;
  professionalDescription: string;
  consumerExplanation: string;
  futureRisk: string;
  repairSuggestion: string;
  notes: string;
  estimatedRepairCost: number | null;
  criteria: WorkCriterion[];
  evidence: ApiEvidence[];
};
type SaveState = "idle" | "saving" | "saved" | "error";

const EMPTY_ITEMS: WorkItem[] = [];

function isExecutionStatus(value: string | undefined): value is ExecutionStatus {
  return isInspectionStatus(value);
}

function statusFromExecution(item: ApiInspectionItem | undefined): ExecutionStatus {
  if (item && isExecutionStatus(item.resultStatus)) return item.resultStatus;
  if (!item) return "UNCHECKED";
  if (item.result === "正常") return "NORMAL";
  if (item.result === "不适用") return "NOT_APPLICABLE";
  if (item.result === "阻断" || item.result === "无法检查") return "BLOCKED";
  if (item.result === "未检" || item.result === "未检验") return "UNCHECKED";
  return item.isAbnormal ? "ABNORMAL" : "UNCHECKED";
}

function findingStatus(value: string | undefined): FindingStatus {
  if (value === "REACHED" || value === "NOT_REACHED" || value === "NOT_APPLICABLE" || value === "BLOCKED") return value;
  return "UNCHECKED";
}

function matchesFire(value: string | null | undefined) {
  return Boolean(value && (value.toUpperCase().includes("FIRE") || value.includes("火烧")));
}

function statusIcon(status: ExecutionStatus, className = "size-3.5") {
  const Icon = STATUS_ICONS[status];
  return <Icon aria-hidden="true" className={`${STATUS_ICON_TONE[status]} ${className}`} />;
}

function isInspectionConfirmed(status: string) {
  return status === "COMPLETED" || status === "BLOCKED";
}

function itemStatusLabel(item: Pick<WorkItem, "status" | "recorded" | "implicitNormal">) {
  if (!item.recorded) return item.implicitNormal ? "正常 · 默认通过" : "待检查";
  return STATUS_SHORT_LABELS[item.status];
}

function canPreviewEvidence(evidence: Pick<ApiEvidence, "uri" | "mediaType">) {
  return evidence.mediaType.startsWith("image/") && !evidence.uri.startsWith("seed://");
}

function buildWorkItems(data: InspectionData, drafts: Record<string, DraftPatch>): WorkItem[] {
  const executionByTemplateId = new Map(
    data.inspection.items.filter((item) => item.checkItemId).map((item) => [item.checkItemId as string, item])
  );
  const confirmed = isInspectionConfirmed(data.inspection.status);
  return data.template.sections.flatMap((section) => {
    if (matchesFire(section.code) || matchesFire(section.name) || matchesFire(section.axis)) return [];
    return section.positions.flatMap((position) =>
      position.checkItems.map((templateItem) => {
        const template = {
          ...templateItem,
          position: {
            id: position.id,
            code: position.code,
            name: position.name,
            side: position.side,
            sortOrder: position.sortOrder,
            floodAggregationKey: position.floodAggregationKey,
          },
        };
        const execution = executionByTemplateId.get(templateItem.id) ?? null;
        const recorded = Boolean(execution);
        const implicitNormal = !recorded && confirmed;
        const status = execution ? statusFromExecution(execution) : confirmed ? "NORMAL" : "UNCHECKED";
        const findingsByCriterion = new Map((execution?.findings ?? []).map((finding) => [finding.criterionId, finding]));
        const criteria = template.criteria.map((criterion) => {
          const finding = findingsByCriterion.get(criterion.id) ?? null;
          return {
            ...criterion,
            finding,
            status: status === "NORMAL" ? "NOT_REACHED" : findingStatus(finding?.status),
          };
        });
        const draft = drafts[template.id];
        return {
          template,
          section,
          execution,
          recorded,
          implicitNormal,
          status,
          result: getInspectionResultLabel({
            result: execution?.result,
            resultStatus: execution?.resultStatus ?? status,
            isAbnormal: execution?.isAbnormal ?? (status === "ABNORMAL" || status === "BLOCKED"),
            findings: execution?.findings,
          }) ?? (implicitNormal ? "正常 · 默认通过" : "待检查"),
          isAbnormal: execution?.isAbnormal ?? (status === "ABNORMAL" || status === "BLOCKED"),
          severity: execution?.severity ?? 0,
          findingMode: execution?.findingMode ?? "CRITERION",
          professionalDescription:
            draft?.professionalDescription ?? execution?.professionalDescription ?? template.description ?? "",
          consumerExplanation:
            draft?.consumerExplanation ?? execution?.consumerExplanation ?? "",
          futureRisk: draft?.futureRisk ?? execution?.futureRisk ?? "",
          repairSuggestion: draft?.repairSuggestion ?? execution?.repairSuggestion ?? "",
          notes: draft?.notes ?? execution?.notes ?? "",
          estimatedRepairCost:
            draft?.estimatedRepairCost !== undefined
              ? draft.estimatedRepairCost === ""
                ? null
                : Number(draft.estimatedRepairCost)
              : execution?.estimatedRepairCost ?? null,
          criteria,
          evidence: execution?.evidence ?? [],
        };
      })
    );
  });
}

export default function InspectionDetailPage({ params }: { params: Promise<{ vehicleId: string }> }) {
  const [data, setData] = useState<InspectionData | null>(null);
  const [loadError, setLoadError] = useState("");
  const [selectedSectionCode, setSelectedSectionCode] = useState("");
  const [selectedItemId, setSelectedItemId] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | ExecutionStatus>("ALL");
  const [drafts, setDrafts] = useState<Record<string, DraftPatch>>({});
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const evidencePreview = useMemo(() => (evidenceFile ? URL.createObjectURL(evidenceFile) : ""), [evidenceFile]);
  const [evidenceUploading, setEvidenceUploading] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveMessage, setSaveMessage] = useState("");
  const [completing, setCompleting] = useState(false);
  const [evaluating, setEvaluating] = useState(false);

  useEffect(() => {
    return () => {
      if (evidencePreview) URL.revokeObjectURL(evidencePreview);
    };
  }, [evidencePreview]);

  const load = useCallback(async () => {
    try {
      setLoadError("");
      const { vehicleId } = await params;
      const response = await fetch(`/api/inspections/${vehicleId}`, { cache: "no-store" });
      const next = (await response.json()) as InspectionData & { error?: string };
      if (!response.ok) throw new Error(next.error ?? "鉴定记录加载失败");
      setData(next);
      const firstSection = next.template.sections.find(
        (section) => !matchesFire(section.code) && !matchesFire(section.name) && !matchesFire(section.axis)
      );
      setSelectedSectionCode((current) => current || firstSection?.code || "");
      setSelectedItemId(
        (current) => current || next.progress.missing[0]?.id || firstSection?.positions[0]?.checkItems[0]?.id || ""
      );
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "鉴定记录加载失败");
    }
  }, [params]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const allItems = useMemo(() => (data ? buildWorkItems(data, drafts) : EMPTY_ITEMS), [data, drafts]);
  const selectedItemFromId = useMemo(
    () => allItems.find((item) => item.template.id === selectedItemId) ?? allItems[0],
    [allItems, selectedItemId]
  );
  const activeSectionCode = selectedSectionCode || selectedItemFromId?.section.code || "";

  const sectionStats = useMemo(() => {
    const bySection = new Map<string, { total: number; checked: number; abnormal: number }>();
    allItems.forEach((item) => {
      const current = bySection.get(item.section.code) ?? { total: 0, checked: 0, abnormal: 0 };
      current.total += 1;
      if (item.status !== "UNCHECKED") current.checked += 1;
      if (item.status === "ABNORMAL" || item.status === "BLOCKED") current.abnormal += 1;
      bySection.set(item.section.code, current);
    });
    return bySection;
  }, [allItems]);

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return allItems.filter((item) => {
      // Section cards scope the default list. Search and status filters are
      // intentionally global because their counters represent the whole
      // inspection; otherwise “发现问题 (4)” could show an empty list when
      // the currently selected section contains no abnormal item.
      const inCurrentScope = normalizedQuery || statusFilter !== "ALL" ? true : item.section.code === activeSectionCode;
      if (!inCurrentScope || (statusFilter !== "ALL" && item.status !== statusFilter)) return false;
      if (!normalizedQuery) return true;
      const haystack = [
        item.template.code,
        item.template.name,
        item.template.category,
        item.template.position.name,
        item.section.name,
        ...item.criteria.map((criterion) => criterion.label),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [activeSectionCode, allItems, query, statusFilter]);

  const selectedItem = useMemo(() => {
    if (selectedItemFromId && filteredItems.some((item) => item.template.id === selectedItemFromId.template.id)) {
      return selectedItemFromId;
    }
    return filteredItems[0] ?? selectedItemFromId ?? allItems[0];
  }, [allItems, filteredItems, selectedItemFromId]);

  const checkedCount = allItems.filter((item) => item.status !== "UNCHECKED").length;
  const implicitNormalCount = allItems.filter((item) => item.implicitNormal).length;
  const abnormalCount = allItems.filter((item) => item.status === "ABNORMAL" || item.status === "BLOCKED").length;
  const inspectionConfirmed = data ? isInspectionConfirmed(data.inspection.status) : false;

  const currentItemIndex = useMemo(() => {
    if (!selectedItem) return -1;
    return filteredItems.findIndex((item) => item.template.id === selectedItem.template.id);
  }, [filteredItems, selectedItem]);

  const hasPrevItem = currentItemIndex > 0;
  const hasNextItem = currentItemIndex >= 0 && currentItemIndex < filteredItems.length - 1;

  function goToPrevItem() {
    if (hasPrevItem) {
      selectItem(filteredItems[currentItemIndex - 1]);
    }
  }

  function goToNextItem() {
    if (hasNextItem) {
      selectItem(filteredItems[currentItemIndex + 1]);
    }
  }

  function goToNextUnchecked() {
    const nextUnchecked = allItems.find(
      (item) => item.status === "UNCHECKED" && item.template.id !== selectedItem?.template.id
    );
    if (nextUnchecked) {
      selectItem(nextUnchecked);
      if (statusFilter !== "ALL" && statusFilter !== "UNCHECKED") {
        setStatusFilter("ALL");
      }
    }
  }

  async function markNormalAndNext() {
    if (!selectedItem) return;
    const nextItemToSelect = hasNextItem ? filteredItems[currentItemIndex + 1] : null;
    await updateStatus("NORMAL");
    if (nextItemToSelect) {
      selectItem(nextItemToSelect);
    }
  }

  function selectItem(item: WorkItem) {
    if (item.template.id !== selectedItemId) setEvidenceFile(null);
    setSelectedItemId(item.template.id);
    setSelectedSectionCode(item.section.code);
  }

  function setDraft(itemId: string, patch: DraftPatch) {
    setDrafts((current) => ({ ...current, [itemId]: { ...current[itemId], ...patch } }));
  }

  async function patchItem(item: WorkItem, patch: Record<string, unknown>) {
    if (!data) return false;
    setSaveState("saving");
    setSaveMessage("");
    try {
      const { vehicleId } = await params;
      const response = await fetch(`/api/inspections/${vehicleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: item.execution?.id ?? item.template.id,
          checkItemId: item.template.id,
          ...patch,
        }),
      });
      const next = (await response.json()) as InspectionData & { error?: string };
      if (!response.ok) throw new Error(next.error ?? "保存失败");
      setData(next);
      setDrafts((current) => {
        const nextDrafts = { ...current };
        delete nextDrafts[item.template.id];
        return nextDrafts;
      });
      setSaveState("saved");
      setSaveMessage("已自动保存");
      window.setTimeout(() => setSaveState((current) => (current === "saved" ? "idle" : current)), 2200);
      return true;
    } catch (error) {
      setSaveState("error");
      setSaveMessage(error instanceof Error ? error.message : "保存失败");
      return false;
    }
  }

  async function updateStatus(status: ExecutionStatus) {
    if (!selectedItem) return;
    const severity =
      status === "BLOCKED" ? Math.max(selectedItem.severity, 3) : status === "ABNORMAL" ? Math.max(selectedItem.severity, 1) : 0;
    await patchItem(selectedItem, {
      resultStatus: status,
      result: STATUS_SHORT_LABELS[status],
      isAbnormal: status === "ABNORMAL" || status === "BLOCKED",
      severity,
      findingMode: status === "ABNORMAL" ? selectedItem.findingMode : "CRITERION",
      ...(status === "NORMAL" || status === "UNCHECKED"
        ? { findingUpdates: selectedItem.criteria.map((criterion) => ({ criterionId: criterion.id, status: "NOT_REACHED" })) }
        : {}),
      ...(status === "NOT_APPLICABLE" || status === "BLOCKED"
        ? { findingUpdates: selectedItem.criteria.map((criterion) => ({ criterionId: criterion.id, status })) }
        : {}),
    });
  }

  async function updateCriterion(criterion: WorkCriterion, nextStatus: "REACHED" | "NOT_REACHED") {
    if (!selectedItem) return;
    const otherReached = selectedItem.criteria.some((item) => item.id !== criterion.id && item.status === "REACHED");
    const nextReached = nextStatus === "REACHED" || otherReached;
    const nextStatusForItem: ExecutionStatus = nextReached ? "ABNORMAL" : "NORMAL";
    const findingUpdates = nextReached
      ? [
          {
            criterionId: criterion.id,
            status: nextStatus,
            valueText: criterion.finding?.valueText ?? null,
            note: criterion.finding?.note ?? null,
          },
        ]
      : selectedItem.criteria.map((item) => ({ criterionId: item.id, status: "NOT_REACHED" }));
    await patchItem(selectedItem, {
      resultStatus: nextStatusForItem,
      result: STATUS_SHORT_LABELS[nextStatusForItem],
      isAbnormal: nextStatusForItem === "ABNORMAL",
      severity: nextStatusForItem === "ABNORMAL" ? Math.max(selectedItem.severity, 1) : 0,
      findingMode: "CRITERION",
      findingUpdates,
    });
  }

  async function appendNoteTag(tag: string) {
    if (!selectedItem) return;
    const currentNotes = (drafts[selectedItem.template.id]?.notes ?? selectedItem.notes ?? "").trim();
    const newNotes = currentNotes ? (currentNotes.includes(tag) ? currentNotes : `${currentNotes} ${tag}`) : tag;
    setDraft(selectedItem.template.id, { notes: newNotes });
    await patchItem(selectedItem, { notes: newNotes });
  }

  async function saveNotes() {
    if (!selectedItem) return false;
    const value = drafts[selectedItem.template.id]?.notes ?? selectedItem.notes ?? "";
    return patchItem(selectedItem, { notes: value || null });
  }

  async function saveAnalysisField(field: AnalysisField) {
    if (!selectedItem) return false;
    const value = drafts[selectedItem.template.id]?.[field] ?? selectedItem[field] ?? "";
    return patchItem(selectedItem, { [field]: value.trim() || null });
  }

  async function saveCost() {
    if (!selectedItem) return false;
    const value = selectedItem.estimatedRepairCost;
    return patchItem(selectedItem, {
      estimatedRepairCost: value === null || Number.isNaN(value) ? null : Math.max(0, Math.round(value)),
    });
  }

  function handleEvidenceFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setSaveState("error");
      setSaveMessage("现场存证只能选择图片文件");
      return;
    }
    if (file.size > IMAGE_UPLOAD_MAX_BYTES) {
      setSaveState("error");
      setSaveMessage(`图片不能超过 8 MB（当前 ${formatImageFileSize(file.size)}）`);
      return;
    }
    setSaveState("idle");
    setSaveMessage("");
    setEvidenceFile(file);
  }

  async function saveEvidence() {
    if (!selectedItem) return;
    if (!evidenceFile) {
      setSaveState("error");
      setSaveMessage("请先拍照或从相册选择现场照片");
      return;
    }
    setEvidenceUploading(true);
    setSaveState("saving");
    setSaveMessage("");
    try {
      const uploaded = await uploadImageFile(evidenceFile, "inspection-evidence");
      const saved = await patchItem(selectedItem, {
        evidence: {
          uri: uploaded.uri,
          mediaType: uploaded.mediaType,
          caption: drafts[selectedItem.template.id]?.evidenceCaption?.trim() || null,
        },
      });
      if (saved) setEvidenceFile(null);
    } catch (error) {
      setSaveState("error");
      setSaveMessage(error instanceof Error ? error.message : "图片上传失败，请重试");
    } finally {
      setEvidenceUploading(false);
    }
  }

  async function completeInspection() {
    if (!data || inspectionConfirmed || completing) return;
    setCompleting(true);
    setSaveState("saving");
    setSaveMessage("");
    try {
      const { vehicleId } = await params;
      const response = await fetch(`/api/inspections/${vehicleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "COMPLETED", operatorName: REPORT_INSPECTOR_NAME }),
      });
      const next = (await response.json()) as InspectionData & { error?: string; missing?: MissingItem[] };
      if (!response.ok) throw new Error(next.error ?? "完成确认失败");
      setData(next);
      setSaveState("saved");
      setSaveMessage("已确认全量未单独记录项目正常");
    } catch (error) {
      setSaveState("error");
      setSaveMessage(error instanceof Error ? error.message : "完成鉴定失败");
    } finally {
      setCompleting(false);
    }
  }

  async function evaluate() {
    if (!data) return;
    if (!inspectionConfirmed) {
      setSaveState("error");
      setSaveMessage("请先确认其他未单独记录的项目正常，再生成鉴定结果");
      return;
    }
    setEvaluating(true);
    setSaveState("saving");
    setSaveMessage("");
    try {
      const { vehicleId } = await params;
      const response = await fetch(`/api/inspections/${vehicleId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "EVALUATE", evaluatorName: REPORT_REVIEWER_NAME }),
      });
      const next = (await response.json()) as InspectionData & { error?: string; missing?: MissingItem[] };
      if (response.status === 409) {
        setSaveState("error");
        setSaveMessage(next.error ?? "仍有未完成的鉴定项目");
        const firstMissing = next.missing?.[0] ?? next.progress?.missing?.[0];
        const target = firstMissing ? allItems.find((item) => item.template.id === firstMissing.id) : undefined;
        if (target) {
          selectItem(target);
          setQuery("");
          setStatusFilter("ALL");
        }
        return;
      }
      if (!response.ok) throw new Error(next.error ?? "鉴定结果生成失败");
      setData(next);
      setSaveState("saved");
      setSaveMessage("已生成官方十字格鉴定结论！");
    } catch (error) {
      setSaveState("error");
      setSaveMessage(error instanceof Error ? error.message : "鉴定结果生成失败");
    } finally {
      setEvaluating(false);
    }
  }

  if (loadError) return <div className="workspace-page w-full max-w-[1720px] 2xl:max-w-[1880px] mx-auto py-20 text-center text-sm font-bold text-red-600">{loadError}</div>;
  if (!data || !selectedItem) {
    return (
      <div className="workspace-page w-full max-w-[1720px] 2xl:max-w-[1880px] mx-auto py-24 text-center text-xs font-semibold text-stone-500">
        正在载入实车质检作业工作台与全量检验表…
      </div>
    );
  }

  const latestEvidence = selectedItem.evidence[0];
  const reachedCriterionCount = selectedItem.criteria.filter((criterion) => criterion.status === "REACHED").length;
  const criteriaSummary = selectedItem.findingMode === "DIRECT"
    ? "项目级异常 · 未匹配细分准则"
    : selectedItem.criteria.length === 0
      ? "该项目无细分准则"
      : reachedCriterionCount > 0
        ? `已命中 ${reachedCriterionCount} 条准则`
        : "待选择具体异常准则";
  const navigationSections = data.template.sections.filter(
    (section) => !matchesFire(section.code) && !matchesFire(section.name) && !matchesFire(section.axis)
  );

  const uncheckedCount = allItems.filter((item) => item.status === "UNCHECKED").length;

  function applyCostPreset(amount: number) {
    if (!selectedItem) return;
    setDraft(selectedItem.template.id, { estimatedRepairCost: String(amount) });
    void patchItem(selectedItem, { estimatedRepairCost: amount });
  }

  return (
    <div className="w-full max-w-[1720px] 2xl:max-w-[1880px] mx-auto flex flex-col space-y-3 pb-2 sm:pb-3">
      {/* 1. 顶部极简状态与控制栏 (Top Executive Control Bar) */}
      <header className="rounded-2xl border border-slate-200/90 bg-white px-4 py-2.5 shadow-xs flex flex-wrap items-center justify-between gap-3 shrink-0">
        {/* 左侧：返回、车辆档案标识与车牌 */}
        <div className="flex items-center gap-3 flex-wrap min-w-0">
          <Link
            href={`/vehicles/${data.vehicle.id}`}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors shadow-2xs whitespace-nowrap shrink-0"
          >
            <ArrowLeft className="size-3.5 text-slate-500 shrink-0" />
            <span>返回车辆 ({data.vehicle.code})</span>
          </Link>

          <span className="text-slate-300 hidden sm:inline">|</span>

          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-base sm:text-lg font-black text-slate-900 tracking-tight whitespace-nowrap truncate">
              {data.vehicle.brand ? `${data.vehicle.brand} ` : ""}
              {data.vehicle.model}
            </span>

            {data.vehicle.plateNo && (
              <span className="rounded-md bg-blue-600 px-2.5 py-0.5 font-mono text-xs font-bold text-white shadow-2xs tracking-wider whitespace-nowrap shrink-0">
                {data.vehicle.plateNo}
              </span>
            )}

            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700 border border-slate-200 whitespace-nowrap shrink-0">
              第 {data.inspection.version} 版现场实检
            </span>
          </div>
        </div>

        {/* 中间：全项宏观指标胶囊 (平板横屏/桌面独占) */}
        <div className="hidden 2xl:flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-slate-50 border border-slate-200/80 text-xs font-mono text-slate-600 whitespace-nowrap shrink-0">
          <span className="font-bold text-slate-800">{data.progress.total} 项标准点位</span>
          <span>·</span>
          <span className="text-emerald-700 font-bold">{checkedCount} 项已核验</span>
          {inspectionConfirmed && implicitNormalCount > 0 && (
            <>
              <span>·</span>
              <span className="text-slate-500">含 {implicitNormalCount} 项默认通过</span>
            </>
          )}
          <span>·</span>
          <span className={abnormalCount > 0 ? "text-red-600 font-bold" : "text-slate-500"}>
            {abnormalCount} 项异常
          </span>
          <span>·</span>
          <span>主检: {REPORT_INSPECTOR_NAME}</span>
          <span>·</span>
          <span className={inspectionConfirmed ? "text-emerald-700 font-bold" : "text-amber-700 font-bold"}>
            {inspectionConfirmed ? "全项已核验完成" : "现场核验作业中"}
          </span>
        </div>

        {/* 右侧：自动保存状态与主次流转操作 */}
        <div className="flex w-full items-center gap-2 flex-wrap shrink-0 sm:w-auto">
          {saveState !== "idle" && (
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-xl border whitespace-nowrap shrink-0 ${
                saveState === "saved"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : saveState === "saving"
                  ? "bg-amber-50 text-amber-800 border-amber-200 animate-pulse"
                  : "bg-red-50 text-red-700 border-red-200"
              }`}
            >
              {saveState === "saving" ? <Loader2 className="size-3 animate-spin shrink-0" /> : <Save className="size-3 shrink-0" />}
              <span>{saveMessage || (saveState === "saved" ? "已自动保存" : "正在保存…")}</span>
            </span>
          )}

          {!inspectionConfirmed && (
            <button
              type="button"
              onClick={completeInspection}
              disabled={completing || evaluating}
              className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-all shadow-2xs whitespace-nowrap sm:flex-none"
            >
              {completing ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5 text-emerald-600" />}
              <span>{completing ? "正在确认…" : "确认其余全项正常"}</span>
            </button>
          )}

          <button
            type="button"
            onClick={evaluate}
            disabled={evaluating || completing}
            className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-red-600 to-red-500 px-4 text-xs font-bold !text-white shadow-xs hover:from-red-700 hover:to-red-600 disabled:opacity-50 transition-all active:scale-[0.98] whitespace-nowrap sm:flex-none"
          >
            {evaluating ? <Loader2 className="size-3.5 animate-spin !text-white" /> : <FileCheck2 className="size-3.5 !text-white" />}
            <span>{evaluating ? "正在计算判定…" : inspectionConfirmed ? "重新生成鉴定结论" : "核验并生成结论"}</span>
          </button>
        </div>
      </header>

      {/* 2. 宽域 2 栏母子座舱 (截定基准高度，保持左右两栏严格等高 items-stretch，消灭大片空白) */}
      <div className="grid grid-cols-1 gap-3.5 items-stretch min-h-0 overflow-visible lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[340px_minmax(0,1fr)] 2xl:grid-cols-[380px_minmax(0,1fr)] lg:h-[760px] xl:h-[790px] lg:max-h-[800px] lg:overflow-hidden">
        {/* 左侧母栏：部位分段选择与检测项索引清册 */}
        <section className="rounded-2xl border border-slate-200/90 bg-white shadow-xs flex h-[60vh] min-h-[320px] max-h-[560px] flex-col overflow-hidden lg:h-full lg:min-h-0 lg:max-h-none">
          {/* 6 大部位导航网格：采用 2 列布局，杜绝 6-7 字名称折行掉字 */}
          <div className="p-2.5 border-b border-slate-100 bg-slate-50/70 space-y-2 shrink-0">
            <div className="grid grid-cols-2 gap-1.5">
              {navigationSections.map((sec) => {
                const stats = sectionStats.get(sec.code) ?? { total: 0, checked: 0, abnormal: 0 };
                const isActive = sec.code === activeSectionCode;

                return (
                  <button
                    key={sec.code}
                    type="button"
                    onClick={() => {
                      setSelectedSectionCode(sec.code);
                      const firstInSec = allItems.find((item) => item.section.code === sec.code);
                      if (firstInSec) setSelectedItemId(firstInSec.template.id);
                    }}
                    className={`py-1.5 px-2.5 rounded-xl border text-left transition-all active:scale-[0.97] ${
                      isActive
                        ? "bg-slate-900 text-white border-slate-900 shadow-xs ring-1 ring-slate-900/20"
                        : "bg-white text-slate-700 border-slate-200/80 hover:bg-slate-100/70"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold whitespace-nowrap truncate">{sec.name}</span>
                      {stats.abnormal > 0 ? (
                        <span className="size-4 rounded-full bg-red-600 text-[10px] font-bold text-white flex items-center justify-center shrink-0">
                          {stats.abnormal}
                        </span>
                      ) : stats.checked === stats.total && stats.total > 0 ? (
                        <Check className="size-3 text-emerald-500 shrink-0" />
                      ) : null}
                    </div>
                    <div className="text-[10px] opacity-70 font-mono mt-0.5 whitespace-nowrap">
                      {stats.checked}/{stats.total} 项已核验
                    </div>
                  </button>
                );
              })}
            </div>

            {/* 搜索框与状态过滤胶囊 */}
            <div className="space-y-1.5 pt-1 border-t border-slate-200/60">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="搜索检查项、点位或缺陷…"
                  className="h-8.5 w-full rounded-xl border border-slate-200 bg-white pl-8 pr-7 text-xs text-slate-900 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/20"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                  >
                    ×
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-1">
                <button
                  type="button"
                  onClick={() => setStatusFilter("ALL")}
                  className={`rounded-lg px-2 py-0.5 text-[11px] font-bold tracking-wide transition-all whitespace-nowrap shrink-0 ${
                    statusFilter === "ALL"
                      ? "bg-slate-900 text-white"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  全部
                </button>
                {FILTER_STATUSES.map((st) => {
                  const count = allItems.filter((i) => i.status === st).length;
                  return (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setStatusFilter(st)}
                      className={`rounded-lg px-2 py-0.5 text-[11px] font-bold tracking-wide transition-all whitespace-nowrap shrink-0 ${
                        statusFilter === st
                          ? "bg-red-600 text-white"
                          : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {STATUS_LABELS[st]}
                      {count > 0 && <span className="ml-1 opacity-70 font-mono">({count})</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 点位纵向清册 (舒适高度 56px，手指触控零误触) */}
          <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-slate-100">
            {filteredItems.map((item) => {
              const isSelected = item.template.id === selectedItem.template.id;
              return (
                <button
                  key={item.template.id}
                  type="button"
                  onClick={() => selectItem(item)}
                  className={`w-full px-3.5 py-3 text-left transition-colors flex items-center justify-between gap-2.5 min-h-[56px] ${
                    isSelected ? "bg-red-50/80 text-red-950 ring-1 ring-inset ring-red-200/80" : "hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`flex size-6 shrink-0 items-center justify-center rounded-full ${STATUS_ICON_WRAPPER_TONE[item.status]}`}>
                      {statusIcon(item.status)}
                    </span>
                    <div className="min-w-0">
                      <p className={`text-sm truncate ${isSelected ? "font-black text-red-950" : "font-bold text-slate-900"}`}>
                        {item.template.name}
                      </p>
                      <p className="text-xs text-slate-400 truncate font-mono mt-0.5">
                        {item.section.name} · {item.template.position.name}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`shrink-0 whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-bold border ${STATUS_TONE[item.status]}`}
                  >
                    {itemStatusLabel(item)}
                  </span>
                </button>
              );
            })}

            {filteredItems.length === 0 && (
              <div className="p-10 text-center text-sm text-slate-400">未检索到匹配的检查项目</div>
            )}
          </div>

          {/* 底部统计栏 */}
          <div className="px-3.5 py-2 border-t border-slate-100 bg-slate-50 text-xs text-slate-500 font-mono flex items-center justify-between shrink-0">
            <span className="whitespace-nowrap">当前筛选: {filteredItems.length} 项</span>
            <span className="whitespace-nowrap">待检 {uncheckedCount} / 全车 {allItems.length}</span>
          </div>
        </section>

        {/* 右侧子台：当前点位独立大工作台 (全宽~700px宽域，大字号、渐进式交互与底栏动作条) */}
        <section className="rounded-2xl border border-slate-200/90 bg-white shadow-xs flex min-h-[520px] flex-col overflow-hidden lg:h-full lg:min-h-0">
          {/* 1. 当前点位题头：位置、标题、大事故关键项标识 */}
          <div className="px-4 sm:px-5 py-2.5 sm:py-3 bg-slate-50/80 border-b border-slate-200/80 flex items-center justify-between gap-3 shrink-0">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap text-xs text-slate-500 font-mono">
                <span>
                  {selectedItem.section.name} / {selectedItem.template.position.name}
                </span>
                {currentItemIndex >= 0 && (
                  <span className="rounded bg-slate-200/80 px-2 py-0.5 text-xs font-mono font-bold text-slate-700">
                    {query.trim() || statusFilter !== "ALL" ? "当前筛选" : "本区"}第 {currentItemIndex + 1} / {filteredItems.length} 项
                  </span>
                )}
                {selectedItem.template.accidentDecisionParticipant && (
                  <span className="rounded bg-red-100 text-red-700 border border-red-200 px-2 py-0.5 text-xs font-bold">
                    国标大事故关键判定项
                  </span>
                )}
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 truncate mt-1 tracking-tight">
                {selectedItem.template.name}
              </h2>
            </div>

            <div className="shrink-0">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold border ${STATUS_TONE[selectedItem.status]}`}>
                {statusIcon(selectedItem.status)}
                {itemStatusLabel(selectedItem)}
              </span>
            </div>
          </div>

          {/* 2. 四大判定状态触控大卡片 (The 4 Master Diagnostic Tiles，字大键大) */}
          <div className="px-5 py-3.5 border-b border-slate-100 bg-white shrink-0">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              质检结论判定（点击即刻自动保存）：
            </div>

            <div className="grid grid-cols-2 min-[1440px]:grid-cols-4 gap-2.5 sm:gap-3">
              <button
                type="button"
                onClick={() => updateStatus("NORMAL")}
                disabled={saveState === "saving"}
                className={`h-14 sm:h-15 px-3 rounded-2xl border flex items-center gap-2.5 transition-all active:scale-[0.98] min-w-0 ${
                  selectedItem.status === "NORMAL"
                    ? "bg-emerald-600 !text-white border-emerald-600 shadow-md ring-2 ring-emerald-400/40"
                    : "bg-slate-50/70 text-slate-700 border-slate-200 hover:border-emerald-300 hover:text-emerald-700 hover:bg-emerald-50/30"
                }`}
              >
                <div className={`size-7 min-[1440px]:size-8 rounded-xl flex items-center justify-center shrink-0 ${
                  selectedItem.status === "NORMAL" ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-700"
                }`}>
                  {statusIcon("NORMAL", `size-5 shrink-0 ${selectedItem.status === "NORMAL" ? "!text-white" : ""}`)}
                </div>
                <div className="text-left min-w-0">
                  <div className="text-sm min-[1440px]:text-base font-bold leading-tight whitespace-nowrap">正常通过</div>
                  <div className={`text-xs mt-0.5 truncate hidden md:block whitespace-nowrap ${
                    selectedItem.status === "NORMAL" ? "text-emerald-100" : "text-slate-400"
                  }`}>
                    指标合格达标
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => updateStatus("ABNORMAL")}
                disabled={saveState === "saving"}
                className={`h-14 sm:h-15 px-3 rounded-2xl border flex items-center gap-2.5 transition-all active:scale-[0.98] min-w-0 ${
                  selectedItem.status === "ABNORMAL"
                    ? "bg-red-600 !text-white border-red-600 shadow-md ring-2 ring-red-400/40"
                    : "bg-slate-50/70 text-slate-700 border-slate-200 hover:border-red-300 hover:text-red-700 hover:bg-red-50/30"
                }`}
              >
                <div className={`size-7 min-[1440px]:size-8 rounded-xl flex items-center justify-center shrink-0 ${
                  selectedItem.status === "ABNORMAL" ? "bg-white/20 text-white" : "bg-red-100 text-red-700"
                }`}>
                  {statusIcon("ABNORMAL", `size-5 shrink-0 ${selectedItem.status === "ABNORMAL" ? "!text-white" : ""}`)}
                </div>
                <div className="text-left min-w-0">
                  <div className="text-sm min-[1440px]:text-base font-bold leading-tight whitespace-nowrap">发现问题</div>
                  <div className={`text-xs mt-0.5 truncate hidden md:block whitespace-nowrap ${
                    selectedItem.status === "ABNORMAL" ? "text-red-100" : "text-slate-400"
                  }`}>
                    记录缺陷损伤
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => updateStatus("BLOCKED")}
                disabled={saveState === "saving"}
                className={`h-14 sm:h-15 px-3 rounded-2xl border flex items-center gap-2.5 transition-all active:scale-[0.98] min-w-0 ${
                  selectedItem.status === "BLOCKED"
                    ? "bg-amber-600 !text-white border-amber-600 shadow-md ring-2 ring-amber-300/50"
                    : "bg-slate-50/70 text-slate-700 border-slate-200 hover:border-amber-300 hover:text-amber-700 hover:bg-amber-50/30"
                }`}
              >
                <div className={`size-7 min-[1440px]:size-8 rounded-xl flex items-center justify-center shrink-0 ${
                  selectedItem.status === "BLOCKED" ? "bg-white/20 text-white" : "bg-amber-100 text-amber-700"
                }`}>
                  {statusIcon("BLOCKED", `size-5 shrink-0 ${selectedItem.status === "BLOCKED" ? "!text-white" : ""}`)}
                </div>
                <div className="text-left min-w-0">
                  <div className="text-sm min-[1440px]:text-base font-bold leading-tight whitespace-nowrap">无法检查</div>
                  <div className={`text-xs mt-0.5 truncate hidden md:block whitespace-nowrap ${
                    selectedItem.status === "BLOCKED" ? "text-amber-100" : "text-slate-400"
                  }`}>
                    受阻待举升
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => updateStatus("NOT_APPLICABLE")}
                disabled={saveState === "saving"}
                className={`h-14 sm:h-15 px-3 rounded-2xl border flex items-center gap-2.5 transition-all active:scale-[0.98] min-w-0 ${
                  selectedItem.status === "NOT_APPLICABLE"
                    ? "bg-slate-800 !text-white border-slate-800 shadow-md ring-2 ring-slate-400/40"
                    : "bg-slate-50/70 text-slate-700 border-slate-200 hover:border-slate-300 hover:text-slate-900 hover:bg-slate-100/50"
                }`}
              >
                <div className={`size-7 min-[1440px]:size-8 rounded-xl flex items-center justify-center shrink-0 ${
                  selectedItem.status === "NOT_APPLICABLE" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                }`}>
                  {statusIcon("NOT_APPLICABLE", `size-5 shrink-0 ${selectedItem.status === "NOT_APPLICABLE" ? "!text-white" : ""}`)}
                </div>
                <div className="text-left min-w-0">
                  <div className="text-sm min-[1440px]:text-base font-bold leading-tight whitespace-nowrap">不适用</div>
                  <div className={`text-xs mt-0.5 truncate hidden md:block whitespace-nowrap ${
                    selectedItem.status === "NOT_APPLICABLE" ? "text-slate-300" : "text-slate-400"
                  }`}>
                    该车型免检
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* 3. 动态呈现工作区：正常/无法检查/不适用在平板与各端显示自适应完整大图标英雄卡（防滚动）；仅发现问题时展开可滚动缺陷判定与详细文本 */}
          <div
            className={`flex flex-col lg:flex-1 lg:min-h-0 ${
              selectedItem.status === "ABNORMAL"
                ? "overflow-visible lg:overflow-y-auto p-4 sm:p-5"
                : "min-h-[360px] overflow-visible lg:overflow-hidden p-3 sm:p-4 lg:p-6 justify-center items-center"
            }`}
          >
            {selectedItem.status === "ABNORMAL" ? (
              /* 状态：发现问题 (ABNORMAL) —— 完整展开缺陷判定、实录整备预算、拍照存证与 4 维影响结论 */
              <div className="space-y-4">
                {/* 现象准则判定清单 */}
                <div className="rounded-2xl border-2 border-red-300 bg-red-50/30 p-4 space-y-3">
                  <div className="flex items-center justify-between text-sm font-bold text-red-950">
                    <span className="flex items-center gap-2">
                      <AlertTriangle className="size-4.5 text-red-600" />
                      现场发现的具体现象特征判定
                    </span>
                    <span className="text-xs font-mono text-red-800 font-normal">
                      {criteriaSummary}
                    </span>
                  </div>

                  {selectedItem.findingMode === "DIRECT" && (
                    <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900">
                      当前为项目级异常记录：模板没有匹配的细分准则，因此不会伪造准则命中；请在现场笔记中写明异常事实与后续处理。
                    </p>
                  )}
                  {selectedItem.findingMode !== "DIRECT" && selectedItem.criteria.length > 0 && reachedCriterionCount === 0 && (
                    <p className="rounded-xl border border-red-200 bg-white px-3 py-2 text-xs leading-relaxed text-red-800">
                      请选择至少一条“达到（异常）”的具体现象，系统才会把项目异常同步到车辆明细、鉴定报告和规则评估。
                    </p>
                  )}

                  <div className="space-y-2.5">
                    {selectedItem.criteria.map((criterion) => {
                      const isReached = criterion.status === "REACHED";
                      return (
                        <div
                          key={criterion.id}
                          className="p-3.5 rounded-xl border border-red-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-bold text-slate-900">{criterion.label}</span>
                              {criterion.hardStopCriterion && (
                                <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">
                                  硬停止红线
                                </span>
                              )}
                            </div>
                            {criterion.description && (
                              <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                                {criterion.description}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => updateCriterion(criterion, "REACHED")}
                              className={`w-28 h-9 text-xs sm:text-sm font-bold rounded-xl transition-all active:scale-95 text-center whitespace-nowrap shrink-0 ${
                                isReached
                                  ? "bg-red-600 !text-white shadow-xs"
                                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                              }`}
                            >
                              达到 (异常)
                            </button>
                            <button
                              type="button"
                              onClick={() => updateCriterion(criterion, "NOT_REACHED")}
                              className={`w-20 h-9 text-xs sm:text-sm font-bold rounded-xl transition-all active:scale-95 text-center whitespace-nowrap shrink-0 ${
                                !isReached
                                  ? "bg-emerald-600 !text-white shadow-xs"
                                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                              }`}
                            >
                              未达到
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    {selectedItem.criteria.length === 0 && (
                      <p className="text-sm text-slate-500 p-2">该项目无需细分子现象判定，已直接记为异常。</p>
                    )}
                  </div>
                </div>

                {/* 现场记录与维修整备预算输入卡 */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <span className="text-sm font-bold text-slate-900 flex items-center gap-2 whitespace-nowrap">
                      <FileText className="size-4 text-red-600 shrink-0" />
                      现场实检勘验笔记与整备预算预估
                    </span>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-600 whitespace-nowrap">快速填额:</span>
                      {[0, 200, 500, 1000, 2000].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => applyCostPreset(amt)}
                          className="h-7 px-2 rounded-lg bg-white border border-slate-200 hover:border-red-400 text-xs font-mono font-bold text-slate-700 shadow-2xs whitespace-nowrap shrink-0"
                        >
                          ¥{amt}
                        </button>
                      ))}
                      <div className="relative w-32 ml-1 shrink-0">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">¥</span>
                        <input
                          type="number"
                          value={drafts[selectedItem.template.id]?.estimatedRepairCost ?? (selectedItem.estimatedRepairCost ?? "")}
                          onChange={(e) => setDraft(selectedItem.template.id, { estimatedRepairCost: e.target.value })}
                          onBlur={saveCost}
                          placeholder="0"
                          className="h-8 w-full rounded-xl border border-slate-300 bg-white pl-6 pr-6 text-xs font-bold text-slate-900 outline-none focus:border-red-500"
                        />
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">元</span>
                      </div>
                    </div>
                  </div>

                  <textarea
                    rows={3}
                    value={drafts[selectedItem.template.id]?.notes ?? selectedItem.notes}
                    onChange={(e) => {
                      const val = e.target.value;
                      setDraft(selectedItem.template.id, { notes: val });
                    }}
                    onBlur={saveNotes}
                    placeholder="记录现场检测实际测量数据、焊点平整度、胶条与螺丝拆装痕迹等…"
                    className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-800 outline-none focus:border-red-500 resize-none leading-relaxed"
                  />
                </div>

                {/* 现场照片与影像存证卡 */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-bold text-slate-900 flex items-center gap-2">
                      <ImagePlus className="size-4 text-amber-600" />
                      现场缺陷拍照与影像存证
                    </span>
                    <span className="text-xs text-slate-500 font-mono">已有 {selectedItem.evidence.length} 张存证</span>
                  </div>

                  {latestEvidence && (
                    <div className="flex items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50/50 p-2.5 text-xs">
                      {canPreviewEvidence(latestEvidence) ? (
                        <img
                          src={latestEvidence.uri}
                          alt={latestEvidence.caption || "已存证现场照片"}
                          className="size-14 shrink-0 rounded-lg border border-white object-cover shadow-2xs"
                          onError={(event) => {
                            event.currentTarget.style.display = "none";
                          }}
                        />
                      ) : (
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white text-emerald-600">
                          <ImagePlus className="size-4" aria-hidden="true" />
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="size-2 rounded-full bg-emerald-500 shrink-0" />
                          <span className="font-semibold text-emerald-800">已存证现场照片</span>
                        </div>
                        <p className="mt-1 truncate font-mono text-[10px] text-slate-500" title={latestEvidence.uri}>{latestEvidence.uri}</p>
                        {latestEvidence.caption && <p className="mt-0.5 truncate text-slate-500">说明：{latestEvidence.caption}</p>}
                      </div>
                      <span className="shrink-0 text-xs font-bold text-emerald-700">{selectedItem.evidence.length} 张</span>
                    </div>
                  )}

                  <div className="grid gap-2 sm:grid-cols-2">
                    <input
                      id={`evidence-camera-${selectedItem.template.id}`}
                      type="file"
                      accept={IMAGE_UPLOAD_ACCEPT}
                      capture="environment"
                      className="sr-only"
                      onChange={handleEvidenceFile}
                    />
                    <input
                      id={`evidence-library-${selectedItem.template.id}`}
                      type="file"
                      accept={IMAGE_UPLOAD_ACCEPT}
                      className="sr-only"
                      onChange={handleEvidenceFile}
                    />
                    <button
                      type="button"
                      onClick={() => document.getElementById(`evidence-camera-${selectedItem.template.id}`)?.click()}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 transition-colors hover:border-red-300 hover:bg-red-50"
                      aria-label="拍摄现场缺陷照片"
                    >
                      <Camera className="size-4 text-red-600" aria-hidden="true" />
                      拍照
                    </button>
                    <button
                      type="button"
                      onClick={() => document.getElementById(`evidence-library-${selectedItem.template.id}`)?.click()}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 transition-colors hover:border-red-300 hover:bg-red-50"
                      aria-label="从相册选择现场缺陷照片"
                    >
                      <Images className="size-4 text-amber-600" aria-hidden="true" />
                      从相册选择
                    </button>
                  </div>

                  {evidenceFile && (
                    <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50/50 p-2.5">
                      {evidencePreview ? <img src={evidencePreview} alt="待存证照片预览" className="size-16 shrink-0 rounded-lg object-cover" /> : <ImagePlus className="size-6 text-amber-600" aria-hidden="true" />}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-bold text-slate-800" title={evidenceFile.name}>{evidenceFile.name}</p>
                        <p className="mt-0.5 text-[10px] text-slate-500">{formatImageFileSize(evidenceFile.size)} · 保存后写入当前鉴定项</p>
                      </div>
                      <button type="button" onClick={() => setEvidenceFile(null)} className="rounded-lg p-1.5 text-slate-500 hover:bg-white hover:text-red-600" aria-label="移除待上传照片">
                        <X className="size-4" />
                      </button>
                    </div>
                  )}

                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input
                      type="text"
                      placeholder="照片说明备注（选填）"
                      value={drafts[selectedItem.template.id]?.evidenceCaption ?? ""}
                      onChange={(e) => setDraft(selectedItem.template.id, { evidenceCaption: e.target.value })}
                      className="h-10 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-xs outline-none focus:border-red-500"
                    />
                    <button
                      type="button"
                      onClick={saveEvidence}
                      disabled={saveState === "saving" || evidenceUploading}
                      className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-xs font-bold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {evidenceUploading ? "上传中…" : "保存现场照片"}
                    </button>
                  </div>
                  <p className="text-[10px] leading-relaxed text-slate-500">支持现场调用摄像头，也可从相册选择；照片上传后会生成鉴定存证记录，旧的 URL 存证仍可查看。</p>
                </div>

                {/* 4 维评估结论说明卡 (仅在发现问题时需要详细呈现) */}
                <div className="grid gap-3 sm:grid-cols-2">
                  {ANALYSIS_FIELDS.map(({ key, label, placeholder }) => (
                    <label key={key} htmlFor={`analysis-${key}-${selectedItem.template.id}`} className="rounded-2xl border border-red-100 bg-red-50/40 p-4 flex min-h-36 flex-col gap-2">
                      <span className="flex items-center justify-between gap-2 text-xs font-bold text-red-600 tracking-wider">
                        <span>{label}</span>
                        <span className="shrink-0 text-[10px] font-medium tracking-normal text-red-400">人工确认 · 自动保存</span>
                      </span>
                      <textarea
                        id={`analysis-${key}-${selectedItem.template.id}`}
                        rows={4}
                        maxLength={1200}
                        value={drafts[selectedItem.template.id]?.[key] ?? selectedItem[key]}
                        onChange={(event) => setDraft(selectedItem.template.id, { [key]: event.target.value })}
                        onBlur={() => void saveAnalysisField(key)}
                        placeholder={placeholder}
                        className="min-h-24 w-full flex-1 resize-y rounded-xl border border-red-200 bg-white/90 p-3 text-sm leading-relaxed text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-red-400 focus:ring-2 focus:ring-red-100"
                      />
                      <span className="text-right text-[10px] text-red-300">{(drafts[selectedItem.template.id]?.[key] ?? selectedItem[key]).length}/1200</span>
                    </label>
                  ))}
                </div>
              </div>
            ) : (
              /* 状态：正常通过 / 无法检查 / 不适用 / 待检查 —— 紧凑精炼大图标英雄卡，自适应屏幕尺寸，禁止产生滚动 */
              <div className="w-full flex flex-col items-center justify-center text-center">
                {selectedItem.status === "NORMAL" && (
                  <div className="flex flex-col items-center max-w-sm sm:max-w-md w-full animate-in fade-in zoom-in-95 duration-200">
                    <div className="size-16 sm:size-20 lg:size-24 rounded-full bg-emerald-50 border-2 sm:border-4 border-emerald-100 flex items-center justify-center text-emerald-600 shadow-md shadow-emerald-500/10 mb-2 sm:mb-2.5 ring-4 sm:ring-6 ring-emerald-50/50 shrink-0">
                      <CheckCircle2 className="size-9 sm:size-11 lg:size-13 stroke-[2.5]" />
                    </div>
                    <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100/80 text-emerald-800 text-[11px] sm:text-xs font-bold mb-1">
                      <ShieldCheck className="size-3" />
                      <span>国标全项达标放行</span>
                    </div>
                    <h3 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">正常通过</h3>
                    <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-xs sm:max-w-sm leading-snug">
                      经现场勘验，该点位未见变形、烧焊、割接、扭曲、漏油或异响，各项技术指标均符合标准放行要求。
                    </p>

                    {/* 轻量便捷单行现场备注（选填） */}
                    <div className="mt-3 w-full max-w-xs sm:max-w-sm">
                      <input
                        type="text"
                        value={drafts[selectedItem.template.id]?.notes ?? selectedItem.notes}
                        onChange={(e) => {
                          const val = e.target.value;
                          setDraft(selectedItem.template.id, { notes: val });
                        }}
                        onBlur={saveNotes}
                        placeholder="现场备注（选填，如漆膜测值/轻微划痕）…"
                        className="h-7 sm:h-8 w-full rounded-lg border border-slate-200/90 bg-slate-50/80 px-2.5 text-xs outline-none text-center focus:bg-white focus:border-emerald-500 placeholder:text-slate-400 transition-colors"
                      />
                    </div>
                  </div>
                )}

                {selectedItem.status === "BLOCKED" && (
                  <div className="flex flex-col items-center max-w-sm sm:max-w-md w-full animate-in fade-in zoom-in-95 duration-200">
                    <div className="size-16 sm:size-20 lg:size-24 rounded-full bg-amber-50 border-2 sm:border-4 border-amber-100 flex items-center justify-center text-amber-600 shadow-md shadow-amber-500/10 mb-2 sm:mb-2.5 ring-4 sm:ring-6 ring-amber-50/50 shrink-0">
                      <AlertTriangle className="size-9 sm:size-11 lg:size-13 stroke-[2.5]" />
                    </div>
                    <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100/80 text-amber-900 text-xs font-bold mb-1">
                      <AlertTriangle className="size-3" />
                      <span>现场受阻 · 待二次复检</span>
                    </div>
                    <h3 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">无法检查</h3>
                    <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-xs sm:max-w-sm leading-snug">
                      受底盘未举升、下护板遮挡或现场专用工具限制，暂无法直接观测该点位，已标记为复检阻断项。
                    </p>

                    {/* 轻量单行受阻原因标注 */}
                    <div className="mt-3 w-full max-w-xs sm:max-w-sm">
                      <input
                        type="text"
                        value={drafts[selectedItem.template.id]?.notes ?? selectedItem.notes}
                        onChange={(e) => {
                          const val = e.target.value;
                          setDraft(selectedItem.template.id, { notes: val });
                        }}
                        onBlur={saveNotes}
                        placeholder="受阻原因（选填，如需举升机/下护板遮挡）…"
                        className="h-7 sm:h-8 w-full rounded-lg border border-amber-200/90 bg-amber-50/50 px-2.5 text-xs outline-none text-center focus:bg-white focus:border-amber-500 placeholder:text-amber-500 transition-colors"
                      />
                    </div>
                  </div>
                )}

                {selectedItem.status === "NOT_APPLICABLE" && (
                  <div className="flex flex-col items-center max-w-sm sm:max-w-md w-full animate-in fade-in zoom-in-95 duration-200">
                    <div className="size-16 sm:size-20 lg:size-24 rounded-full bg-slate-100 border-2 sm:border-4 border-slate-200 flex items-center justify-center text-slate-600 shadow-md shadow-slate-500/5 mb-2 sm:mb-2.5 ring-4 sm:ring-6 ring-slate-100/50 shrink-0">
                      <Ban className="size-9 sm:size-11 lg:size-13 stroke-[2.5]" />
                    </div>
                    <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-200/80 text-slate-800 text-[11px] sm:text-xs font-bold mb-1">
                      <span>车型出厂配置豁免</span>
                    </div>
                    <h3 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">不适用</h3>
                    <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-xs sm:max-w-sm leading-snug">
                      经比对车辆出厂配置清单及实际物理架构，本车型未装配此项功能组件，按规范合规免检放行。
                    </p>

                    {/* 轻量单行免检依据标注 */}
                    <div className="mt-3 w-full max-w-xs sm:max-w-sm">
                      <input
                        type="text"
                        value={drafts[selectedItem.template.id]?.notes ?? selectedItem.notes}
                        onChange={(e) => {
                          const val = e.target.value;
                          setDraft(selectedItem.template.id, { notes: val });
                        }}
                        onBlur={saveNotes}
                        placeholder="免检依据（选填，如出厂未装配/纯电免检）…"
                        className="h-7 sm:h-8 w-full rounded-lg border border-slate-200/90 bg-slate-50/80 px-2.5 text-xs outline-none text-center focus:bg-white focus:border-slate-500 placeholder:text-slate-400 transition-colors"
                      />
                    </div>
                  </div>
                )}

                {selectedItem.status === "UNCHECKED" && (
                  <div className="flex flex-col items-center max-w-sm sm:max-w-md w-full animate-in fade-in zoom-in-95 duration-200">
                    <div className="size-16 sm:size-20 lg:size-24 rounded-full bg-blue-50 border-2 sm:border-4 border-blue-100 flex items-center justify-center text-blue-600 shadow-md shadow-blue-500/10 mb-2 sm:mb-2.5 ring-4 sm:ring-6 ring-blue-50/50 shrink-0">
                      <Clock className="size-9 sm:size-11 lg:size-13 stroke-[2.5]" />
                    </div>
                    <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-100/80 text-blue-800 text-[11px] sm:text-xs font-bold mb-1">
                      <span>待现场勘验核准</span>
                    </div>
                    <h3 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">待检查</h3>
                    <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-xs sm:max-w-sm leading-snug">
                      请对【{selectedItem.template.name}】实施现场外观与工况核验，并在上方点击判定或直接在底栏快速放行。
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 4. 大拇指触达快捷动作底栏 (Thumb-Friendly Bottom Dock，双手握持极度顺手) */}
          <div className="flex items-center justify-between gap-2 border-t border-slate-200/80 bg-slate-50/95 px-3 sm:px-4 py-2.5 sm:py-3 shrink-0">
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={goToPrevItem}
                disabled={!hasPrevItem}
                className="h-10 px-2.5 sm:px-3 rounded-xl bg-white border border-slate-200 text-xs sm:text-sm font-bold text-slate-700 shadow-2xs hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1 transition-all whitespace-nowrap"
                title="切换到上一项"
              >
                <ArrowLeft className="size-3.5 shrink-0" />
                <span>上一项</span>
              </button>
              <button
                type="button"
                onClick={goToNextItem}
                disabled={!hasNextItem}
                className="h-10 px-2.5 sm:px-3 rounded-xl bg-white border border-slate-200 text-xs sm:text-sm font-bold text-slate-700 shadow-2xs hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1 transition-all whitespace-nowrap"
                title="切换到下一项"
              >
                <span>下一项</span>
                <span className="text-slate-400">➔</span>
              </button>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <button
                type="button"
                onClick={goToNextUnchecked}
                className="h-10 px-2.5 sm:px-3 rounded-xl bg-amber-50 text-amber-900 border border-amber-200/80 text-xs sm:text-sm font-bold hover:bg-amber-100 transition-all shadow-2xs flex items-center gap-1 whitespace-nowrap shrink-0"
                title="快速定位到下一个待检查的项目"
              >
                <Zap className="size-3.5 text-amber-600 shrink-0" />
                <span>找未检</span>
              </button>

              <button
                type="button"
                onClick={markNormalAndNext}
                disabled={saveState === "saving"}
                className="h-10 px-3 sm:px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-black shadow-xs hover:shadow-md flex items-center gap-1.5 transition-all active:scale-[0.98] whitespace-nowrap shrink-0"
              >
                <Check className="size-4 shrink-0" />
                <span>正常并通过下一项 ➔</span>
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function itemMatchesQuery(item: WorkItem, q: string) {
  const haystack = [
    item.template.code,
    item.template.name,
    item.template.category,
    item.template.position.name,
    item.section.name,
    ...item.criteria.map((criterion) => criterion.label),
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(q.toLowerCase());
}
