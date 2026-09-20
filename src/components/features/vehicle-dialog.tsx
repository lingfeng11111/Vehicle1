"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, ImagePlus, Images, Plus, Tag, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { IMAGE_UPLOAD_ACCEPT, IMAGE_UPLOAD_MAX_BYTES, formatImageFileSize, uploadImageFile } from "@/lib/image-upload";

const DISPLAY_TAG_PRESETS = [
  "B级家用标杆",
  "德系大五座SUV",
  "运动商务座驾",
  "高保值省油代步",
  "新能源通勤",
  "城市多功能SUV",
];

const TEXT_FIELDS = [
  ["code", "车辆编号", "例：V007", "text"],
  ["vin", "车架号（VIN）", "17 位车架号", "text"],
  ["plateNo", "车牌 / 挂牌信息", "湘A·00001", "text"],
  ["brand", "品牌", "丰田", "text"],
  ["series", "车系", "凯美瑞", "text"],
  ["model", "车型", "2021款 凯美瑞 2.5G", "text"],
] as const;

const NUMBER_FIELDS = [
  ["modelYear", "年款", "2021"],
  ["mileage", "表显里程（公里）", "50000"],
  ["listingPrice", "展厅指导价（元）", "150000"],
] as const;

export function VehicleDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [energyType, setEnergyType] = useState("ICE");
  const [displayTags, setDisplayTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const coverPreview = useMemo(() => (coverFile ? URL.createObjectURL(coverFile) : ""), [coverFile]);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const libraryInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (coverPreview) URL.revokeObjectURL(coverPreview);
    };
  }, [coverPreview]);

  function resetForm() {
    setEnergyType("ICE");
    setDisplayTags([]);
    setTagInput("");
    setCoverFile(null);
    setError("");
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) resetForm();
    else setError("");
  }

  function addTag(rawValue = tagInput) {
    const value = rawValue.trim();
    if (!value || displayTags.includes(value) || displayTags.length >= 6) return;
    setDisplayTags((current) => [...current, value]);
    setTagInput("");
  }

  function removeTag(tag: string) {
    setDisplayTags((current) => current.filter((item) => item !== tag));
  }

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
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      const form = new FormData(event.currentTarget);
      const finalTags = tagInput.trim() && !displayTags.includes(tagInput.trim())
        ? [...displayTags, tagInput.trim()].slice(0, 6)
        : displayTags;
      let coverImage: string | null = null;
      if (coverFile) {
        const uploaded = await uploadImageFile(coverFile, "vehicle-cover");
        coverImage = uploaded.uri;
      }

      const payload = {
        code: String(form.get("code") ?? "").trim(),
        vin: String(form.get("vin") ?? "").trim(),
        plateNo: String(form.get("plateNo") ?? "").trim(),
        brand: String(form.get("brand") ?? "").trim(),
        series: String(form.get("series") ?? "").trim(),
        model: String(form.get("model") ?? "").trim(),
        modelYear: String(form.get("modelYear") ?? "").trim(),
        registrationDate: String(form.get("registrationDate") ?? "").trim(),
        mileage: String(form.get("mileage") ?? "").trim(),
        listingPrice: String(form.get("listingPrice") ?? "").trim(),
        energyType,
        displayTags: finalTags,
        coverImage,
      };
      const response = await fetch("/api/vehicles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: string;
          issues?: { fieldErrors?: Record<string, string[]> };
        } | null;
        throw new Error(body?.error ?? "车辆档案保存失败，请检查填写内容");
      }
      setSaving(false);
      setOpen(false);
      resetForm();
      onCreated();
    } catch (submitError) {
      setSaving(false);
      setError(submitError instanceof Error ? submitError.message : "车辆档案保存失败，请重试");
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button />}>
        <Plus data-icon="inline-start" />
        新建车辆
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[min(94vh,860px)] overflow-y-auto sm:max-w-3xl">
        <DialogHeader className="border-b border-stone-100 pb-4 pr-8">
          <DialogTitle className="text-lg font-bold text-stone-900">新建车辆档案</DialogTitle>
          <DialogDescription>录入完成后，车辆编号、挂牌信息、展示标签和封面会同步到车辆档案、鉴定台与消费者报告。</DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-6">
          <section className="space-y-3" aria-labelledby="vehicle-basic-heading">
            <div>
              <h3 id="vehicle-basic-heading" className="text-sm font-bold text-stone-900">基础身份</h3>
              <p className="mt-1 text-xs text-stone-500">车辆编号和 VIN 用于后续鉴定、报告及客户关联。</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {TEXT_FIELDS.map(([name, label, placeholder, type]) => (
                <div key={name} className="flex min-w-0 flex-col gap-2">
                  <Label htmlFor={`vehicle-${name}`}>{label}</Label>
                  <Input id={`vehicle-${name}`} name={name} required placeholder={placeholder} type={type} />
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-3 border-t border-stone-100 pt-5" aria-labelledby="vehicle-market-heading">
            <div>
              <h3 id="vehicle-market-heading" className="text-sm font-bold text-stone-900">挂牌与使用信息</h3>
              <p className="mt-1 text-xs text-stone-500">这些字段会原样显示在车辆档案、客户选车和报告的车辆信息中。</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {NUMBER_FIELDS.map(([name, label, placeholder]) => (
                <div key={name} className="flex min-w-0 flex-col gap-2">
                  <Label htmlFor={`vehicle-${name}`}>{label}</Label>
                  <Input id={`vehicle-${name}`} name={name} required placeholder={placeholder} type="number" min={name === "modelYear" ? 1990 : 0} />
                </div>
              ))}
              <div className="flex min-w-0 flex-col gap-2">
                <Label htmlFor="vehicle-registrationDate">首次挂牌日期</Label>
                <Input id="vehicle-registrationDate" name="registrationDate" required type="date" />
              </div>
              <div className="flex min-w-0 flex-col gap-2 sm:col-span-2 lg:col-span-4">
                <Label htmlFor="vehicle-energy">能源类型</Label>
                <Select value={energyType} onValueChange={(value) => setEnergyType(String(value))}>
                  <SelectTrigger id="vehicle-energy" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="ICE">燃油 / 混合动力通用模板</SelectItem>
                      <SelectItem value="NEW_ENERGY">新能源模板（含三电专项）</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          <section className="space-y-3 border-t border-stone-100 pt-5" aria-labelledby="vehicle-presentation-heading">
            <div>
              <h3 id="vehicle-presentation-heading" className="flex items-center gap-2 text-sm font-bold text-stone-900">
                <Tag className="size-4 text-amber-600" />
                展示标签与封面
              </h3>
              <p className="mt-1 text-xs text-stone-500">标签用于车辆档案和消费者报告的车辆卡片；不填写时才使用演示素材的默认标签。</p>
            </div>

            <div className="flex flex-wrap gap-2" aria-label="常用车辆展示标签">
              {DISPLAY_TAG_PRESETS.map((tag) => {
                const selected = displayTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => selected ? removeTag(tag) : addTag(tag)}
                    aria-pressed={selected}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${selected ? "border-amber-500 bg-amber-50 text-amber-900" : "border-stone-200 bg-white text-stone-600 hover:border-amber-300 hover:bg-amber-50/60"}`}
                  >
                    {selected ? "✓ " : "+ "}{tag}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id="vehicle-display-tag"
                value={tagInput}
                onChange={(event) => setTagInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addTag();
                  }
                }}
                placeholder="输入自定义标签，例如：一手车源 / 全程4S店保养"
                maxLength={30}
              />
              <Button type="button" variant="outline" onClick={() => addTag()} disabled={!tagInput.trim() || displayTags.length >= 6}>
                添加标签
              </Button>
            </div>
            {displayTags.length > 0 && (
              <div className="flex flex-wrap gap-2" aria-label="已选择的车辆展示标签">
                {displayTags.map((tag) => (
                  <span key={tag} className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-900">
                    {tag}
                    <button type="button" onClick={() => removeTag(tag)} aria-label={`移除标签 ${tag}`} className="rounded-full p-0.5 hover:bg-amber-200">
                      <X className="size-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
              <div className="relative flex min-h-36 items-center justify-center overflow-hidden rounded-2xl border border-dashed border-stone-300 bg-stone-50">
                {coverPreview ? (
                  <>
                    <img src={coverPreview} alt="车辆封面预览" className="size-full min-h-36 object-cover" />
                    <button type="button" onClick={() => setCoverFile(null)} aria-label="移除车辆封面" className="absolute right-2 top-2 rounded-full bg-stone-950/75 p-1.5 text-white hover:bg-stone-950">
                      <X className="size-4" />
                    </button>
                  </>
                ) : (
                  <div className="px-4 text-center text-xs text-stone-500">
                    <ImagePlus className="mx-auto mb-2 size-7 text-stone-300" />
                    <p className="font-semibold text-stone-700">还没有车辆封面</p>
                    <p className="mt-1">可现场拍摄或从相册选择</p>
                  </div>
                )}
              </div>
              <div className="flex flex-col justify-center gap-3 rounded-2xl border border-stone-200 bg-[#faf8f5] p-4">
                <div>
                  <p className="text-sm font-bold text-stone-900">车辆封面照片</p>
                  <p className="mt-1 text-xs leading-relaxed text-stone-500">建议上传车辆正侧 45° 照片，JPG / PNG / WEBP / HEIC，最大 8 MB。</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <input ref={coverInputRef} type="file" accept={IMAGE_UPLOAD_ACCEPT} capture="environment" className="sr-only" onChange={handleCoverChange} />
                  <input ref={libraryInputRef} type="file" accept={IMAGE_UPLOAD_ACCEPT} className="sr-only" onChange={handleCoverChange} />
                  <Button type="button" variant="outline" onClick={() => coverInputRef.current?.click()}>
                    <Camera data-icon="inline-start" />
                    拍摄封面
                  </Button>
                  <Button type="button" variant="outline" onClick={() => libraryInputRef.current?.click()}>
                    <Images data-icon="inline-start" />
                    从相册选择
                  </Button>
                </div>
                {coverFile && <p className="truncate text-xs text-stone-500" title={coverFile.name}>已选择：{coverFile.name} · {formatImageFileSize(coverFile.size)}</p>}
              </div>
            </div>
          </section>

          {error && <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700" role="alert">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>取消</Button>
            <Button type="submit" disabled={saving}>
              {saving ? "上传并保存中…" : "保存车辆档案"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
