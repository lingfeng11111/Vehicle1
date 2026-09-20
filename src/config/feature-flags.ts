export const FEATURE_FLAGS = {
  ENABLE_PERSONALIZED_REPORT: true,
  ENABLE_MARKET_PRICE: true,
  ENABLE_MEDIA_ANALYTICS: true,
  ENABLE_SURVEY_INSIGHTS: false,
  ENABLE_CUSTOMER_PORTAL: false,
} as const;

export type FeatureFlagKey = keyof typeof FEATURE_FLAGS;

export const FEATURE_FLAG_LABELS: Record<FeatureFlagKey, string> = {
  ENABLE_PERSONALIZED_REPORT: "个性化购车报告",
  ENABLE_MARKET_PRICE: "价格参考",
  ENABLE_MEDIA_ANALYTICS: "新媒体复盘",
  ENABLE_SURVEY_INSIGHTS: "市场调研",
  ENABLE_CUSTOMER_PORTAL: "客户查看报告",
};
