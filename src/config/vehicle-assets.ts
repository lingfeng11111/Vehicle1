/**
 * High-resolution curated automotive photography and inspection visual assets
 */
export type VehicleVisualAsset = {
  coverUrl: string;
  gallery: string[];
  galleryLabels?: string[];
  typeTag: string;
  colorTone: string;
};

export type VehicleVisualSource = {
  coverImage?: string | null;
  displayTags?: string | string[] | null;
};

const mediaAssetUrl = (assetKey: string) => `/api/media/${assetKey}`;
const kiaK3Cover001 = "/api/media/cmu0zmttg0008uc2k092rtsdd";
const kiaK3Cover926 = "/api/media/cmu95qyix0009uc3s1owl6jjr";
const kiaK3InteriorGallery = [
  { url: mediaAssetUrl("vehicle-926-engine-bay"), label: "发动机舱" },
  { url: mediaAssetUrl("vehicle-926-dashboard"), label: "仪表台" },
  { url: mediaAssetUrl("vehicle-926-interior"), label: "内饰" },
];

export const VEHICLE_IMAGE_MAP: Record<string, VehicleVisualAsset> = {
  V001: {
    // 丰田 凯美瑞 2.5G (Premium Sedan)
    coverUrl: "/v001-photos/cover.jpg",
    gallery: [
      "/v001-photos/cover.jpg",
      "/v001-photos/engine.jpg",
      "/v001-photos/cockpit.jpg",
      "/v001-photos/trunk.jpg",
    ],
    galleryLabels: ["实车姿态", "机舱", "座舱", "后备箱"],
    typeTag: "B级家用标杆",
    colorTone: "#e6eaec",
  },
  V002: {
    // 大众 途观L 330TSI (Midsize SUV)
    coverUrl: "/v002-photos/cover.jpg",
    gallery: [
      "/v002-photos/cover.jpg",
      "/v002-photos/cockpit.jpg",
      "/v002-photos/rear-seat.jpg",
      "/v002-photos/rear.jpg",
    ],
    galleryLabels: ["实车姿态", "仪表台", "后排座椅", "车尾"],
    typeTag: "德系大五座SUV",
    colorTone: "#ede9e4",
  },
  V003: {
    // 本田 雅阁 260TURBO (Sporty Midsize Sedan)
    coverUrl: "/v003-photos/cover.jpg",
    gallery: [
      "/v003-photos/cover.jpg",
      "/v003-photos/cockpit.jpg",
      "/v003-photos/dashboard.jpg",
      "/v003-photos/rear-interior.jpg",
    ],
    galleryLabels: ["实车姿态", "驾驶舱", "仪表台", "后排内饰"],
    typeTag: "运动商务座驾",
    colorTone: "#eee7e8",
  },
  V004: {
    // 丰田 卡罗拉 1.2T (Compact Sedan)
    coverUrl: "/v004-photos/cover.jpg",
    gallery: [
      "/v004-photos/cover.jpg",
      "/v004-photos/dashboard.jpg",
      "/v004-photos/rear-interior.jpg",
      "/v004-photos/cockpit.jpg",
    ],
    galleryLabels: ["实车姿态", "仪表台", "后排内饰", "驾驶舱"],
    typeTag: "高保值省油代步",
    colorTone: "#e9ece7",
  },
  V005: {
    // 比亚迪 秦PLUS DM-i (PHEV New Energy Sedan)
    coverUrl: mediaAssetUrl("vehicle-v005-cover"),
    gallery: [
      mediaAssetUrl("vehicle-v005-cover"),
      mediaAssetUrl("shared-ev-battery"),
      mediaAssetUrl("shared-cockpit"),
    ],
    typeTag: "插电超低油耗",
    colorTone: "#e3eaec",
  },
  V006: {
    // 长安 CS75 PLUS (Urban SUV)
    coverUrl: "/v005-photos/cover.jpg",
    gallery: [
      "/v005-photos/cover.jpg",
      "/v005-photos/engine.jpg",
      "/v005-photos/dashboard.jpg",
      "/v005-photos/trunk.jpg",
    ],
    galleryLabels: ["实车姿态", "前机舱", "仪表台", "后备箱"],
    typeTag: "蓝鲸黄金动力SUV",
    colorTone: "#edeae4",
  },
  V007: {
    // 特斯拉 Model 3
    coverUrl: mediaAssetUrl("vehicle-v005-cover"),
    gallery: [mediaAssetUrl("vehicle-v005-cover"), mediaAssetUrl("shared-ev-battery")],
    typeTag: "纯电长续航",
    colorTone: "#e6eaec",
  },
  V008: {
    // 理想 ONE
    coverUrl: mediaAssetUrl("vehicle-v002-cover"),
    gallery: [mediaAssetUrl("vehicle-v002-cover"), mediaAssetUrl("shared-cockpit")],
    typeTag: "家庭大六座SUV",
    colorTone: "#ede9e4",
  },
  V009: {
    // 宝马 3系
    coverUrl: mediaAssetUrl("vehicle-v003-cover"),
    gallery: [mediaAssetUrl("vehicle-v003-cover"), mediaAssetUrl("shared-cockpit")],
    typeTag: "德系豪华运动",
    colorTone: "#eee7e8",
  },
  V010: {
    // 奔驰 C级
    coverUrl: mediaAssetUrl("vehicle-v001-cover"),
    gallery: [mediaAssetUrl("vehicle-v001-cover"), mediaAssetUrl("shared-cockpit")],
    typeTag: "德系豪华品质",
    colorTone: "#f0ece9",
  },
  V011: {
    // 比亚迪 宋PLUS
    coverUrl: mediaAssetUrl("vehicle-v006-cover"),
    gallery: [mediaAssetUrl("vehicle-v006-cover"), mediaAssetUrl("shared-ev-battery")],
    typeTag: "插电超低油耗",
    colorTone: "#e3eaec",
  },
  V012: {
    // 本田 CR-V
    coverUrl: mediaAssetUrl("vehicle-v002-cover"),
    gallery: [mediaAssetUrl("vehicle-v002-cover"), mediaAssetUrl("shared-undercarriage")],
    typeTag: "城市多功能SUV",
    colorTone: "#e9ece7",
  },
  V013: {
    // 蔚来 ES6
    coverUrl: mediaAssetUrl("vehicle-v002-cover"),
    gallery: [mediaAssetUrl("vehicle-v002-cover"), mediaAssetUrl("shared-ev-battery")],
    typeTag: "智能纯电SUV",
    colorTone: "#e4ebf0",
  },
  V014: {
    // 别克 GL8
    coverUrl: mediaAssetUrl("vehicle-v001-cover"),
    gallery: [mediaAssetUrl("vehicle-v001-cover"), mediaAssetUrl("shared-cockpit")],
    typeTag: "商务头等舱MPV",
    colorTone: "#ebe8e3",
  },
  V015: {
    // 吉利 星越L
    coverUrl: mediaAssetUrl("vehicle-v006-cover"),
    gallery: [mediaAssetUrl("vehicle-v006-cover"), mediaAssetUrl("shared-cockpit")],
    typeTag: "国产高品质SUV",
    colorTone: "#eaebe6",
  },
  V016: {
    // 极氪 001
    coverUrl: mediaAssetUrl("vehicle-v005-cover"),
    gallery: [mediaAssetUrl("vehicle-v005-cover"), mediaAssetUrl("shared-cockpit")],
    typeTag: "猎装轿跑跨界车",
    colorTone: "#e5eaee",
  },
  V017: {
    // 丰田 汉兰达
    coverUrl: mediaAssetUrl("vehicle-v002-cover"),
    gallery: [mediaAssetUrl("vehicle-v002-cover"), mediaAssetUrl("shared-undercarriage")],
    typeTag: "大7座家用SUV",
    colorTone: "#ede9e4",
  },
  V018: {
    // 广汽传祺 M8
    coverUrl: mediaAssetUrl("vehicle-v001-cover"),
    gallery: [mediaAssetUrl("vehicle-v001-cover"), mediaAssetUrl("shared-cockpit")],
    typeTag: "豪华商务MPV",
    colorTone: "#ebe8e3",
  },
  V019: {
    // 小鹏 P7
    coverUrl: mediaAssetUrl("vehicle-v005-cover"),
    gallery: [mediaAssetUrl("vehicle-v005-cover"), mediaAssetUrl("shared-ev-battery")],
    typeTag: "智能纯电轿跑",
    colorTone: "#e6eaec",
  },
  V020: {
    // 沃尔沃 XC60
    coverUrl: mediaAssetUrl("vehicle-v002-cover"),
    gallery: [mediaAssetUrl("vehicle-v002-cover"), mediaAssetUrl("shared-undercarriage")],
    typeTag: "安全健康中型SUV",
    colorTone: "#e9ece7",
  },
  V021: {
    // 大众 迈腾
    coverUrl: mediaAssetUrl("vehicle-v001-cover"),
    gallery: [mediaAssetUrl("vehicle-v001-cover"), mediaAssetUrl("shared-engine-bay")],
    typeTag: "德系品质B级车",
    colorTone: "#f0ece9",
  },
  V022: {
    // 坦克 300
    coverUrl: mediaAssetUrl("vehicle-v006-cover"),
    gallery: [mediaAssetUrl("vehicle-v006-cover"), mediaAssetUrl("shared-undercarriage")],
    typeTag: "硬派越野SUV",
    colorTone: "#edeae4",
  },
  V023: {
    // 腾势 D9
    coverUrl: mediaAssetUrl("vehicle-v001-cover"),
    gallery: [mediaAssetUrl("vehicle-v001-cover"), mediaAssetUrl("shared-cockpit"), mediaAssetUrl("shared-ev-battery")],
    typeTag: "高端新能源MPV",
    colorTone: "#ebe8e3",
  },
  V024: {
    // 宝马 5系
    coverUrl: mediaAssetUrl("vehicle-v003-cover"),
    gallery: [mediaAssetUrl("vehicle-v003-cover"), mediaAssetUrl("shared-cockpit")],
    typeTag: "豪华行政座驾",
    colorTone: "#eee7e8",
  },
  V025: {
    // 比亚迪 海豚
    coverUrl: mediaAssetUrl("vehicle-v004-cover"),
    gallery: [mediaAssetUrl("vehicle-v004-cover"), mediaAssetUrl("shared-ev-battery")],
    typeTag: "纯电代步小车",
    colorTone: "#e3eaec",
  },
  V026: {
    // 奥迪 A4L
    coverUrl: mediaAssetUrl("vehicle-v003-cover"),
    gallery: [mediaAssetUrl("vehicle-v003-cover"), mediaAssetUrl("shared-engine-bay")],
    typeTag: "豪华动感轿车",
    colorTone: "#eee7e8",
  },
  "001": {
    // 起亚 K3：保留本车外观封面，并与 926 档案共用内饰/机舱照片
    coverUrl: kiaK3Cover001,
    gallery: [kiaK3Cover001, ...kiaK3InteriorGallery.map((image) => image.url)],
    galleryLabels: ["外观", ...kiaK3InteriorGallery.map((image) => image.label)],
    typeTag: "韩系通勤车",
    colorTone: "#e6eaec",
  },
  "926": {
    // 起亚 K3：档案封面保留目标车辆原外观图，后续展示该车的机舱、仪表台与内饰
    coverUrl: kiaK3Cover926,
    gallery: [kiaK3Cover926, ...kiaK3InteriorGallery.map((image) => image.url)],
    galleryLabels: ["外观", ...kiaK3InteriorGallery.map((image) => image.label)],
    typeTag: "韩系通勤车",
    colorTone: "#e6eaec",
  },
};

export const DEFAULT_VEHICLE_ASSET: VehicleVisualAsset = {
  coverUrl: mediaAssetUrl("vehicle-v002-cover"),
  gallery: [
    mediaAssetUrl("vehicle-v002-cover"),
  ],
  typeTag: "认证二手车",
  colorTone: "#e6eaec",
};

export function getDynamicVehicleAsset(code: string): VehicleVisualAsset {
  const num = parseInt(code.replace(/\D/g, ""), 10) || 1;
  const seedA = 1000 + num * 7;
  const seedB = 2000 + num * 13;
  const seedC = 3000 + num * 29;
  const cover = `https://loremflickr.com/640/400/usedcar,sedan?lock=${seedA}`;
  const engine = `https://loremflickr.com/640/400/car,engine?lock=${seedB}`;
  const cockpit = `https://loremflickr.com/640/400/car,cockpit?lock=${seedC}`;
  const tags = ["品质轿车", "品质SUV", "运动座驾", "经济代步", "新能源领航", "多功能SUV"];
  const tones = ["#e6eaec", "#ede9e4", "#eee7e8", "#e9ece7", "#e3eaec", "#edeae4"];
  const choice = num % 6;
  return {
    coverUrl: cover,
    gallery: [cover, engine, cockpit],
    typeTag: tags[choice],
    colorTone: tones[choice],
  };
}

export function parseVehicleDisplayTags(value: VehicleVisualSource["displayTags"]): string[] {
  if (Array.isArray(value)) {
    return value.filter((tag): tag is string => typeof tag === "string").map((tag) => tag.trim()).filter(Boolean).slice(0, 6);
  }
  if (typeof value !== "string" || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((tag): tag is string => typeof tag === "string").map((tag) => tag.trim()).filter(Boolean).slice(0, 6)
      : [];
  } catch {
    return value.split(/[、,，]/).map((tag) => tag.trim()).filter(Boolean).slice(0, 6);
  }
}

export function getVehicleDisplayTags(code: string, source?: VehicleVisualSource): string[] {
  const visual = VEHICLE_IMAGE_MAP[code] || getDynamicVehicleAsset(code);
  const parsedTags = parseVehicleDisplayTags(source?.displayTags);
  return parsedTags.length > 0 ? parsedTags : [visual.typeTag];
}

export function getVehicleVisual(code: string, source?: VehicleVisualSource): VehicleVisualAsset {
  const visual = VEHICLE_IMAGE_MAP[code] || getDynamicVehicleAsset(code);
  const coverImage = source?.coverImage?.trim();
  const displayTags = getVehicleDisplayTags(code, source);
  if (!coverImage) {
    return { ...visual, typeTag: displayTags[0] ?? visual.typeTag };
  }
  return {
    ...visual,
    coverUrl: coverImage,
    gallery: [coverImage, ...visual.gallery.filter((url) => url !== coverImage && url !== visual.coverUrl)],
    typeTag: displayTags[0] ?? visual.typeTag,
  };
}

export const CAR_FALLBACK_SVG =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='80' viewBox='0 0 120 80' fill='none'><rect width='120' height='80' fill='%23f5f3ef'/><path d='M25 52C28 44 34 38 42 36L48 30C52 26 58 24 64 24H82C88 24 93 28 95 34L98 42C101 44 104 47 104 51V58H16V52C16 52 20 52 25 52Z' stroke='%23d97706' stroke-width='2' fill='%23fef3c7' fill-opacity='0.5'/><circle cx='36' cy='58' r='7' fill='%2344403c'/><circle cx='36' cy='58' r='3' fill='%23fafaf9'/><circle cx='84' cy='58' r='7' fill='%2344403c'/><circle cx='84' cy='58' r='3' fill='%23fafaf9'/></svg>";

export const SHOWROOM_ASSETS = {
  banner: mediaAssetUrl("showroom-banner"),
  workshop: mediaAssetUrl("shared-undercarriage"),
  inspectorPortrait: mediaAssetUrl("inspector-portrait"),
  advisorPortrait: mediaAssetUrl("advisor-avatar"),
};
