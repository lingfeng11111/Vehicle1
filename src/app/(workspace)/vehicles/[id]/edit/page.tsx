"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Camera,
  CarFront,
  Check,
  Fuel,
  ImagePlus,
  Loader2,
  Save,
  Sparkles,
  Tag,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/app/status-badge";
import { formatMoney } from "@/lib/format";
import { getVehicleDisplayTags, getVehicleVisual, parseVehicleDisplayTags } from "@/config/vehicle-assets";
import {
  IMAGE_UPLOAD_ACCEPT,
  IMAGE_UPLOAD_MAX_BYTES,
  formatImageFileSize,
  uploadImageFile,
} from "@/lib/image-upload";

const DISPLAY_TAG_PRESETS = [
  "B级家用标杆",
  "德系大五座SUV",
  "运动商务座驾",
  "高保值省油代步",
  "新能源通勤",
  "城市多功能SUV",
  "准新一手车",
  "原版原漆",
];

const VEHICLE_STATUS_OPTIONS = [
  { value: "AVAILABLE", label: "在售 (AVAILABLE)", desc: "可正常预约看车、试驾与交易" },
  { value: "RESERVED", label: "已预定 (RESERVED)", desc: "客户已下定金锁定车源" },
  { value: "SOLD", label: "已售出 (SOLD)", desc: "车辆已交车过户成交" },
  { value: "REVIEW_REQUIRED", label: "待复检 (REVIEW_REQUIRED)", desc: "需复检或整备后再上架" },
];

type VehicleData = {
  id: string;
  code: string;
  vin: string;
  plateNo: string;
  brand: string;
  series: string;
  model: string;
  modelYear: number;
  registrationDate: string;
  mileage: number;
  listingPrice: number;
  energyType: string;
  coverImage?: string | null;
  displayTags?: string | string[] | null;
  status: string;
};

export default function VehicleEditPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const fileInputId = useId();
  const [vehicleId, setVehicleId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Form states
  const [code, setCode] = useState("");
  const [vin, setVin] = useState("");
  const [plateNo, setPlateNo] = useState("");
  const [brand, setBrand] = useState("");
  const [series, setSeries] = useState("");
  const [model, setModel] = useState("");
  const [modelYear, setModelYear] = useState<number | string>("");
  const [mileage, setMileage] = useState<number | string>("");
  const [listingPrice, setListingPrice] = useState<number | string>("");
  const [registrationDate, setRegistrationDate] = useState("");
  const [energyType, setEnergyType] = useState("ICE");
  const [status, setStatus] = useState("AVAILABLE");
  const [displayTags, setDisplayTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");

  // Cover image states
  const [currentCoverImage, setCurrentCoverImage] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverRemoved, setCoverRemoved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const localFilePreview = useMemo(() => {
    if (coverFile) {
      return URL.createObjectURL(coverFile);
    }
    return "";
  }, [coverFile]);

  useEffect(() => {
    return () => {
      if (localFilePreview) URL.revokeObjectURL(localFilePreview);
    };
  }, [localFilePreview]);

  // Load initial vehicle data
  useEffect(() => {
    let active = true;
    void params.then(async ({ id }) => {
      setVehicleId(id);
      try {
        const res = await fetch(`/api/vehicles/${id}`);
        if (!res.ok) {
          throw new Error("未能加载车辆信息，车辆可能不存在");
        }
        const data: VehicleData = await res.json();
        if (!active) return;

        setCode(data.code || "");
        setVin(data.vin || "");
        setPlateNo(data.plateNo || "");
        setBrand(data.brand || "");
        setSeries(data.series || "");
        setModel(data.model || "");
        setModelYear(data.modelYear ?? "");
        setMileage(data.mileage ?? "");
        setListingPrice(data.listingPrice ?? "");
        setRegistrationDate(data.registrationDate ? data.registrationDate.slice(0, 10) : "");
        setEnergyType(data.energyType || "ICE");
        setStatus(data.status || "AVAILABLE");
        setDisplayTags(parseVehicleDisplayTags(data.displayTags));
        setCurrentCoverImage(data.coverImage || null);
        setLoading(false);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "加载车辆失败");
        setLoading(false);
      }
    });

    return () => {
      active = false;
    };
  }, [params]);

  // Display cover preview logic
  const effectiveCoverPreview = useMemo(() => {
    if (localFilePreview) return localFilePreview;
    if (coverRemoved) return null;
    if (currentCoverImage) return currentCoverImage;
    const visual = getVehicleVisual(code || "V001");
    return visual.coverUrl;
  }, [localFilePreview, coverRemoved, currentCoverImage, code]);

  function handleCoverChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("封面只能选择图片文件");
      return;
    }
    if (file.size > IMAGE_UPLOAD_MAX_BYTES) {
      setError(`封面不能超过 8 MB（当前 ${formatImageFileSize(file.size)}）`);
      return;
    }
    setError("");
    setCoverFile(file);
    setCoverRemoved(false);
  }

  function handleRemoveCover() {
    setCoverFile(null);
    setCoverRemoved(true);
    setCurrentCoverImage(null);
  }

  function addTag(rawValue = tagInput) {
    const value = rawValue.trim();
    if (!value || displayTags.includes(value) || displayTags.length >= 6) return;
    setDisplayTags((current) => [...current, value]);
    setTagInput("");
  }

  function removeTag(tagToRemove: string) {
    setDisplayTags((current) => current.filter((item) => item !== tagToRemove));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      let finalCoverImage: string | null = currentCoverImage;
      if (coverFile) {
        const uploaded = await uploadImageFile(coverFile, "vehicle-cover");
        finalCoverImage = uploaded.uri;
      } else if (coverRemoved) {
        finalCoverImage = null;
      }

      const finalTags = tagInput.trim() && !displayTags.includes(tagInput.trim())
        ? [...displayTags, tagInput.trim()].slice(0, 6)
        : displayTags;

      const payload = {
        code: code.trim(),
        vin: vin.trim(),
        plateNo: plateNo.trim(),
        brand: brand.trim(),
        series: series.trim(),
        model: model.trim(),
        modelYear: Number(modelYear),
        mileage: Number(mileage),
        listingPrice: Number(listingPrice),
        registrationDate: registrationDate.trim() || undefined,
        energyType,
        status,
        displayTags: finalTags,
        coverImage: finalCoverImage,
      };

      const res = await fetch(`/api/vehicles/${vehicleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const resData = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(resData?.error || "保存失败，请检查输入内容");
      }

      setSuccess("车辆档案更新成功！正在返回车辆详情…");
      const targetIdentifier = resData.id || vehicleId;
      setTimeout(() => {
        router.replace(`/vehicles/${targetIdentifier}`);
      }, 600);
    } catch (err) {
      setSaving(false);
      setError(err instanceof Error ? err.message : "保存车辆档案失败，请稍后重试");
    }
  }

  if (loading) {
    return (
      <div className="workspace-page w-full max-w-[1720px] 2xl:max-w-[1880px] mx-auto py-16 flex flex-col items-center justify-center gap-3 text-stone-500">
        <Loader2 className="size-6 animate-spin text-amber-600" />
        <p className="text-xs">正在加载车辆档案资料…</p>
      </div>
    );
  }

  return (
    <div className="workspace-page w-full max-w-[1720px] 2xl:max-w-[1880px] mx-auto space-y-6">
      {/* 顶部面包屑与标题栏 */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Link
            href={`/vehicles/${vehicleId}`}
            className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 shadow-2xs hover:bg-[#faf8f5] hover:text-red-700 transition-colors"
          >
            <ArrowLeft className="size-4" />
            返回车辆详情
          </Link>
          <span className="text-xs text-stone-400">/</span>
          <span className="text-xs font-medium text-stone-600">编辑档案</span>
          <span className="rounded-full bg-red-100 text-red-700 px-2 py-0.5 text-[11px] font-mono font-bold">
            {code}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.replace(`/vehicles/${vehicleId}`)}
            disabled={saving}
            className="h-9 px-4 text-xs font-semibold"
          >
            取消
          </Button>
          <Button
            form="vehicle-edit-form"
            type="submit"
            disabled={saving}
            className="h-9 gap-1.5 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white text-xs font-bold shadow-sm"
          >
            {saving ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                正在保存…
              </>
            ) : (
              <>
                <Save className="size-3.5" />
                保存车辆档案
              </>
            )}
          </Button>
        </div>
      </div>

      {/* 提示信息横条 */}
      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-800 shadow-xs">
          <AlertCircle className="size-4 shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-medium text-emerald-800 shadow-xs">
          <Check className="size-4 shrink-0 text-emerald-600" />
          <span>{success}</span>
        </div>
      )}

      {/* 编辑表单 */}
      <form id="vehicle-edit-form" onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* 左侧主体字段区 (8 列) */}
          <div className="lg:col-span-8 space-y-6">
            {/* 卡片 1: 基础身份标识 */}
            <section className="rounded-3xl border border-stone-200/80 bg-white p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                    <span className="flex size-5 items-center justify-center rounded-md bg-stone-100 text-stone-700 text-[11px]">
                      1
                    </span>
                    基础身份信息
                  </h3>
                  <p className="mt-0.5 text-xs text-stone-500">
                    车辆唯一编号、VIN 与车牌号码，关联全站鉴定数据与销售商机。
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="v-code" className="text-xs font-bold text-stone-700">
                    车辆编号 <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="v-code"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="例：V001、A09"
                    className="font-mono font-semibold"
                  />
                  <span className="text-[10px] text-stone-400">大写字母、数字或短横线</span>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="v-vin" className="text-xs font-bold text-stone-700">
                    车架号（VIN） <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="v-vin"
                    required
                    value={vin}
                    onChange={(e) => setVin(e.target.value.toUpperCase())}
                    placeholder="17 位车架号"
                    className="font-mono font-semibold"
                  />
                  <span className="text-[10px] text-stone-400">系统内唯一校验</span>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="v-plateNo" className="text-xs font-bold text-stone-700">
                    车牌/挂牌信息 <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="v-plateNo"
                    required
                    value={plateNo}
                    onChange={(e) => setPlateNo(e.target.value)}
                    placeholder="湘A·00001 / 未上牌"
                  />
                  <span className="text-[10px] text-stone-400">用于展厅标示与行驶证登记</span>
                </div>
              </div>
            </section>

            {/* 卡片 2: 车型款型与动力能源 */}
            <section className="rounded-3xl border border-stone-200/80 bg-white p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                    <span className="flex size-5 items-center justify-center rounded-md bg-stone-100 text-stone-700 text-[11px]">
                      2
                    </span>
                    款型规格与能源动力
                  </h3>
                  <p className="mt-0.5 text-xs text-stone-500">
                    车型品牌车系及动力架构，对应出具匹配的鉴定标准核验项。
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1.5">
                  <Label htmlFor="v-brand" className="text-xs font-bold text-stone-700">
                    品牌 <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="v-brand"
                    required
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    placeholder="丰田 / 大众 / 比亚迪"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="v-series" className="text-xs font-bold text-stone-700">
                    车系 <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="v-series"
                    required
                    value={series}
                    onChange={(e) => setSeries(e.target.value)}
                    placeholder="凯美瑞 / 途观L"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="v-model" className="text-xs font-bold text-stone-700">
                    车型全称 <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="v-model"
                    required
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder="2021款 2.5G 豪华版"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="v-modelYear" className="text-xs font-bold text-stone-700">
                    年款 (年份) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="v-modelYear"
                    type="number"
                    min={1990}
                    max={2030}
                    required
                    value={modelYear}
                    onChange={(e) => setModelYear(e.target.value)}
                    placeholder="2021"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="v-energyType" className="text-xs font-bold text-stone-700">
                    能源类型
                  </Label>
                  <Select value={energyType} onValueChange={(v) => v && setEnergyType(v)}>
                    <SelectTrigger id="v-energyType" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ICE">
                        <span className="flex items-center gap-2">
                          <Fuel className="size-3.5 text-stone-600" />
                          传统燃油车 (ICE)
                        </span>
                      </SelectItem>
                      <SelectItem value="NEW_ENERGY">
                        <span className="flex items-center gap-2">
                          <Zap className="size-3.5 text-emerald-600" />
                          新能源/混动/纯电 (NEW_ENERGY)
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </section>

            {/* 卡片 3: 工况行驶与展厅销售状态 */}
            <section className="rounded-3xl border border-stone-200/80 bg-white p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                    <span className="flex size-5 items-center justify-center rounded-md bg-stone-100 text-stone-700 text-[11px]">
                      3
                    </span>
                    工况数据与展厅状态
                  </h3>
                  <p className="mt-0.5 text-xs text-stone-500">
                    挂牌日期、表显里程、展厅指导价及车辆在库销售状态。
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="v-registrationDate" className="text-xs font-bold text-stone-700">
                    首次挂牌日期
                  </Label>
                  <Input
                    id="v-registrationDate"
                    type="date"
                    value={registrationDate}
                    onChange={(e) => setRegistrationDate(e.target.value)}
                  />
                  <span className="text-[10px] text-stone-400">格式：YYYY-MM-DD</span>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="v-mileage" className="text-xs font-bold text-stone-700">
                    表显里程 (公里) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="v-mileage"
                    type="number"
                    min={0}
                    required
                    value={mileage}
                    onChange={(e) => setMileage(e.target.value)}
                    placeholder="50000"
                  />
                  <span className="text-[10px] text-stone-400">当前实测表显公里数</span>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="v-listingPrice" className="text-xs font-bold text-stone-700">
                    展厅指导价 (元) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="v-listingPrice"
                    type="number"
                    min={1}
                    required
                    value={listingPrice}
                    onChange={(e) => setListingPrice(e.target.value)}
                    placeholder="158000"
                  />
                  <span className="text-[10px] text-stone-400">
                    展厅大屏与报告挂牌标价：
                    <strong className="text-red-600 font-mono">
                      {listingPrice ? formatMoney(Number(listingPrice)) : "—"}
                    </strong>
                  </span>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="v-status" className="text-xs font-bold text-stone-700">
                    车辆状态
                  </Label>
                  <Select value={status} onValueChange={(v) => v && setStatus(v)}>
                    <SelectTrigger id="v-status" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {VEHICLE_STATUS_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          <div className="flex items-center gap-2">
                            <StatusBadge value={opt.value} />
                            <span className="text-xs text-stone-600">{opt.desc}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </section>
          </div>

          {/* 右侧边栏区 (4 列)：摄影封面与展示标签 */}
          <div className="lg:col-span-4 space-y-6">
            {/* 卡片 4: 展厅摄影与封面图 */}
            <section className="rounded-3xl border border-stone-200/80 bg-white p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                  <Camera className="size-4 text-amber-600" />
                  展厅实车封面
                </h3>
                {effectiveCoverPreview && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleRemoveCover}
                    className="h-7 px-2 text-[11px] text-stone-500 hover:text-red-600"
                  >
                    <Trash2 className="size-3 text-red-500 mr-1" />
                    清除自定义
                  </Button>
                )}
              </div>

              {/* 实时摄影封面预览卡 */}
              <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl bg-stone-900 border border-stone-200 shadow-inner group">
                {effectiveCoverPreview ? (
                  <img
                    src={effectiveCoverPreview}
                    alt="实车封面"
                    className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="size-full flex flex-col items-center justify-center text-stone-400 gap-2">
                    <CarFront className="size-10 stroke-1" />
                    <span className="text-xs">暂无封面</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-transparent to-transparent pointer-events-none" />
                <div className="absolute bottom-2.5 left-3 right-3 text-white">
                  <div className="text-[10px] font-mono text-white/70">{plateNo || "车牌号"}</div>
                  <div className="text-xs font-bold truncate">{model || "车型名称"}</div>
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                id={fileInputId}
                accept={IMAGE_UPLOAD_ACCEPT}
                onChange={handleCoverChange}
                className="sr-only"
              />

              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-9 gap-1.5 text-xs font-semibold"
                >
                  <ImagePlus className="size-3.5 text-stone-600" />
                  本地图库
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-9 gap-1.5 text-xs font-semibold"
                >
                  <Camera className="size-3.5 text-stone-600" />
                  现场拍照
                </Button>
              </div>
              <p className="text-[11px] text-stone-400 leading-relaxed">
                支持 JPG、PNG、WebP，不超过 8MB。更换后将自动上传至服务并在展厅摄影封套同步生效。
              </p>
            </section>

            {/* 卡片 5: 展示卖点标签 */}
            <section className="rounded-3xl border border-stone-200/80 bg-white p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                  <Tag className="size-4 text-amber-600" />
                  展厅卖点标签 ({displayTags.length}/6)
                </h3>
              </div>

              {/* 当前已有标签 */}
              <div className="flex flex-wrap gap-2 min-h-[32px]">
                {displayTags.length === 0 ? (
                  <span className="text-xs text-stone-400 italic">暂无展示标签，可从下方快捷添加</span>
                ) : (
                  displayTags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 rounded-full bg-stone-900 text-white px-2.5 py-1 text-xs font-medium shadow-2xs"
                    >
                      <span>{tag}</span>
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="rounded-full p-0.5 text-white/70 hover:bg-white/20 hover:text-white"
                      >
                        <X className="size-3" />
                      </button>
                    </span>
                  ))
                )}
              </div>

              {/* 自定义添加输入框 */}
              <div className="flex items-center gap-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                  disabled={displayTags.length >= 6}
                  placeholder={displayTags.length >= 6 ? "标签数量已达上限" : "输入自定义标签并回车"}
                  className="h-8 text-xs"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={displayTags.length >= 6 || !tagInput.trim()}
                  onClick={() => addTag()}
                  className="h-8 px-3 text-xs"
                >
                  添加
                </Button>
              </div>

              {/* 推荐预设标签 */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] font-medium text-stone-500 flex items-center gap-1">
                  <Sparkles className="size-3 text-amber-500" />
                  快捷标签推荐：
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {DISPLAY_TAG_PRESETS.map((preset) => {
                    const isSelected = displayTags.includes(preset);
                    return (
                      <button
                        key={preset}
                        type="button"
                        disabled={isSelected || displayTags.length >= 6}
                        onClick={() => addTag(preset)}
                        className={`rounded-lg border px-2 py-0.5 text-[11px] font-medium transition-all ${
                          isSelected
                            ? "border-stone-200 bg-stone-100 text-stone-400 cursor-not-allowed"
                            : "border-stone-200 bg-white text-stone-600 hover:border-amber-400 hover:bg-amber-50 hover:text-amber-800"
                        }`}
                      >
                        + {preset}
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* 卡片 6: 保存与操作说明 */}
            <section className="rounded-3xl border border-stone-200/80 bg-[#faf8f5] p-5 shadow-xs space-y-3">
              <h4 className="text-xs font-bold text-stone-800">关于车辆档案更新</h4>
              <ul className="text-[11px] text-stone-500 space-y-1.5 list-disc list-inside leading-relaxed">
                <li>更新车辆档案不会影响已录入的实车鉴定记录。</li>
                <li>若修改编号，历史生成的客户报告与鉴定卡将同步采用新编号。</li>
                <li>车源状态修改为「已售出」后，在售列表中将标示成交状态。</li>
              </ul>

              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={saving}
                  className="w-full h-10 gap-2 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white text-xs font-bold shadow-md"
                >
                  {saving ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      正在保存车辆档案…
                    </>
                  ) : (
                    <>
                      <Save className="size-4" />
                      立即保存修改
                    </>
                  )}
                </Button>
              </div>
            </section>
          </div>
        </div>
      </form>
    </div>
  );
}
