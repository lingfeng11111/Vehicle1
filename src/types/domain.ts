export type FocusCode =
  | "SAFETY"
  | "STRUCTURE"
  | "MAINTENANCE"
  | "RELIABILITY"
  | "PRICE"
  | "ENERGY"
  | "APPEARANCE"
  | "SPACE"
  | "VALUE";

export type ReportGenerationMethod = "RULE_ENGINE" | "AI";

export type ReportDecisionContext = {
  accidentClassification?: string | null;
  floodStatus?: string | null;
  currentSafetyConclusion?: string | null;
  functionConclusion?: string | null;
  legalTradeabilityStatus?: string | null;
  circulationRecommendation?: string | null;
  recommendationReason?: string | null;
  outcomes?: Array<{
    code: string;
    axis: string;
    status: string;
    reason: string | null;
  }>;
};

export type InspectionFindingData = {
  id?: string;
  criterionId?: string;
  status?: string;
  valueText?: string | null;
  note?: string | null;
  label?: string | null;
  criterion?: {
    code?: string;
    label?: string;
    axis?: string;
    sortOrder?: number;
  } | null;
};

export type InspectionItemData = {
  id?: string;
  resultStatus?: string;
  findingMode?: string | null;
  zone: string;
  category: string;
  itemName: string;
  result: string;
  isAbnormal: boolean;
  severity: number;
  basePriority: number;
  professionalDescription: string | null;
  consumerExplanation: string | null;
  futureRisk: string | null;
  repairSuggestion: string | null;
  estimatedRepairCost: number | null;
  findings?: InspectionFindingData[];
};

export type ReportSnapshot = {
  snapshotVersion: "0.1.0";
  generatedAt: string;
  reportMode: "PERSONALIZED" | "STANDARD";
  generationMethod?: ReportGenerationMethod;
  customer: { id: string; name: string; focusTags: string[]; usageScene: string };
  demand: { id: string; focusTags: string[]; riskConcerns: string[]; budgetMin: number | null; budgetMax: number | null; remark: string | null };
  vehicle: {
    id: string;
    code: string;
    vin: string;
    plateNo: string;
    brand: string;
    series: string;
    model: string;
    modelYear: number;
    mileage: number;
    listingPrice: number;
    energyType?: string;
    coverImage?: string | null;
    displayTags?: string | string[] | null;
  };
  inspection: { id: string; version: number; inspectionDate: string; inspectorName: string; overallRiskLevel: string; summary: string };
  market: {
    newCarReferencePrice: number;
    marketLow: number;
    marketMedian: number;
    marketHigh: number;
    conditionAdjustedLow: number;
    conditionAdjustedHigh: number;
    source: string;
    capturedAt: string;
  } | null;
  highlights: InspectionItemData[];
  facts: InspectionItemData[];
  explanation: string;
  fit?: string;
  recommendation?: string;
  disclaimer: string;
};
