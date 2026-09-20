export const MEDIA_PLATFORMS = ["抖音", "快手", "小红书", "视频号"] as const;
export type MediaPlatform = (typeof MEDIA_PLATFORMS)[number];

export type MediaPost = {
  id: string;
  title: string;
  platform: MediaPlatform;
  type: string;
  topic: string;
  publishedAt: string;
  views: number;
  completion: number;
  engagement: number;
  consultations: number;
  leads: number;
  mediaUrl?: string;
  coverUrl?: string;
};

export const MEDIA_POSTS: MediaPost[] = [
  { id: "m01", title: "纵梁有修复，还能不能买？", platform: "抖音", type: "风险解释", topic: "结构安全", publishedAt: "08-28", views: 4260, completion: 68, engagement: 7.9, consultations: 16, leads: 5, mediaUrl: "/media-library/douyin-1.mp4" },
  { id: "m02", title: "十万元家用二手车怎么选", platform: "小红书", type: "选车攻略", topic: "购车预算", publishedAt: "08-25", views: 3180, completion: 73, engagement: 9.2, consultations: 14, leads: 4 },
  { id: "m03", title: "补漆和事故车是一回事吗？", platform: "视频号", type: "知识科普", topic: "车况判断", publishedAt: "08-22", views: 1890, completion: 81, engagement: 6.8, consultations: 9, leads: 3 },
  { id: "m04", title: "底盘维修最容易漏掉的三笔钱", platform: "抖音", type: "成本拆解", topic: "维修成本", publishedAt: "08-18", views: 5570, completion: 64, engagement: 8.7, consultations: 21, leads: 6, mediaUrl: "/media-library/douyin-2.mp4" },
  { id: "m05", title: "新能源二手车先看电池还是车况", platform: "小红书", type: "选车攻略", topic: "新能源", publishedAt: "08-15", views: 2940, completion: 76, engagement: 10.1, consultations: 12, leads: 4 },
  { id: "m06", title: "一台车的完整鉴定要看什么", platform: "视频号", type: "作业纪实", topic: "专业鉴定", publishedAt: "08-11", views: 1630, completion: 84, engagement: 5.9, consultations: 8, leads: 2 },
  { id: "m07", title: "五分钟读懂车辆鉴定报告", platform: "抖音", type: "知识科普", topic: "报告解读", publishedAt: "08-07", views: 3820, completion: 71, engagement: 7.5, consultations: 15, leads: 5, mediaUrl: "/media-library/douyin-3.mp4" },
  { id: "m08", title: "低价车为什么更要算后期成本", platform: "小红书", type: "成本拆解", topic: "维修成本", publishedAt: "08-03", views: 2460, completion: 78, engagement: 9.6, consultations: 27, leads: 11 },
  { id: "m09", title: "A柱修复到底影响什么", platform: "视频号", type: "风险解释", topic: "结构安全", publishedAt: "07-29", views: 2140, completion: 79, engagement: 6.4, consultations: 25, leads: 9 },
  { id: "m10", title: "第一次买二手车，别只看公里数", platform: "抖音", type: "避坑指南", topic: "新手购车", publishedAt: "07-24", views: 4730, completion: 66, engagement: 8.1, consultations: 39, leads: 16, mediaUrl: "/media-library/douyin-4.mp4" },
  { id: "m11", title: "八万预算如何判断整备成本", platform: "快手", type: "成本拆解", topic: "维修成本", publishedAt: "07-20", views: 2480, completion: 69, engagement: 8.4, consultations: 12, leads: 4 },
  { id: "m12", title: "老铁们，这台底盘托底你能看出来吗", platform: "快手", type: "避坑指南", topic: "底盘工况", publishedAt: "07-15", views: 3260, completion: 72, engagement: 8.9, consultations: 15, leads: 5 },
  { id: "m13", title: "实测热门家用车发动机积碳情况", platform: "快手", type: "作业纪实", topic: "发动机工况", publishedAt: "07-09", views: 1950, completion: 65, engagement: 7.8, consultations: 9, leads: 3 },
  { id: "m14", title: "新手买二手车避坑清单（图文版）", platform: "小红书", type: "图文笔记", topic: "新手购车", publishedAt: "08-29", views: 5600, completion: 88, engagement: 12.3, consultations: 32, leads: 14 },
  { id: "m15", title: "8千预算练手车怎么选？实拍对比", platform: "小红书", type: "图文笔记", topic: "购车预算", publishedAt: "08-26", views: 4300, completion: 91, engagement: 11.7, consultations: 28, leads: 12 },
  { id: "m16", title: "二手车鉴定实拍图解：这10个地方必看", platform: "小红书", type: "图文笔记", topic: "专业鉴定", publishedAt: "08-20", views: 3800, completion: 85, engagement: 10.9, consultations: 21, leads: 9 },
  { id: "m17", title: "女生第一台车怎么选？省油好开好停", platform: "小红书", type: "图文笔记", topic: "选车攻略", publishedAt: "08-14", views: 6200, completion: 89, engagement: 13.1, consultations: 35, leads: 15 },
];

export type MediaPlatformSummary = {
  platform: MediaPlatform;
  posts: number;
  views: number;
  completedViews: number;
  completion: number;
  engagement: number;
  consultations: number;
  leads: number;
  mediaUrl?: string;
  coverUrl?: string;
};

function round(value: number, digits = 0) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

/** Aggregate every media screen from the same content fixture. */
export function getMediaPlatformSummary(): MediaPlatformSummary[] {
  return MEDIA_PLATFORMS.map((platform) => {
    const posts = MEDIA_POSTS.filter((post) => post.platform === platform);
    const views = posts.reduce((sum, post) => sum + post.views, 0);
    const completedViews = posts.reduce((sum, post) => sum + post.views * (post.completion / 100), 0);
    const weightedEngagement = posts.reduce((sum, post) => sum + post.views * post.engagement, 0);
    return {
      platform,
      posts: posts.length,
      views,
      completedViews: Math.round(completedViews),
      completion: views ? round((completedViews / views) * 100, 1) : 0,
      engagement: views ? round(weightedEngagement / views, 1) : 0,
      consultations: posts.reduce((sum, post) => sum + post.consultations, 0),
      leads: posts.reduce((sum, post) => sum + post.leads, 0),
    };
  });
}

export function getMediaContentSummary() {
  const platforms = getMediaPlatformSummary();
  const views = platforms.reduce((sum, item) => sum + item.views, 0);
  const completedViews = platforms.reduce((sum, item) => sum + item.completedViews, 0);
  const consultations = platforms.reduce((sum, item) => sum + item.consultations, 0);
  const leads = platforms.reduce((sum, item) => sum + item.leads, 0);
  const weightedEngagement = platforms.reduce((sum, item) => sum + item.views * item.engagement, 0);
  return {
    posts: MEDIA_POSTS.length,
    views,
    completedViews,
    completion: views ? round((completedViews / views) * 100, 1) : 0,
    engagement: views ? round(weightedEngagement / views, 1) : 0,
    consultations,
    leads,
    platforms,
  };
}

export const BASE_TREND = [42, 47, 45, 53, 58, 56, 64, 69, 66, 75, 81, 88];

export const OPPORTUNITIES = [
  { id: "o1", title: "纵梁变形是不是一定意味着重大事故？", topic: "结构安全", type: "风险解释", base: [92, 88, 84, 90] },
  { id: "o2", title: "买二手车最容易忽略的底盘维修成本", topic: "维修成本", type: "成本拆解", base: [87, 91, 82, 86] },
  { id: "o3", title: "补漆是不是一定代表事故车？", topic: "车况判断", type: "知识科普", base: [83, 79, 91, 81] },
  { id: "o4", title: "新能源二手车电池怎么看？", topic: "新能源", type: "选车攻略", base: [78, 84, 86, 88] },
  { id: "o5", title: "十万元家用二手车怎么选？", topic: "购车预算", type: "选车攻略", base: [82, 86, 79, 93] },
];
