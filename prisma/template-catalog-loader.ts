import catalog from "./template-catalog.generated.json";

export type TemplateCriterionSeed = {
  code: string;
  label: string;
  axis: string;
  criterionType: string;
  description: string;
  ruleKey: string | null;
  countsAsDistinctFloodFinding: boolean;
  hardStopCriterion: boolean;
  sourceSheet: string;
  sourceRow: number;
  sourceColumn: string;
  sourcePartIndex: number;
  sourceText: string;
  sourceNote: string | null;
};

export type TemplateCheckItemSeed = {
  code: string;
  name: string;
  category: string;
  componentClass: string;
  accidentDecisionParticipant: boolean;
  description: string;
  sourceSheet: string;
  sourceRow: number;
  sourceSection: string;
  sourceText: string;
  criteria: TemplateCriterionSeed[];
};

export type TemplatePositionSeed = {
  code: string;
  name: string;
  side: string | null;
  floodAggregationKey: string | null;
  checkItems: TemplateCheckItemSeed[];
};

export type TemplateSectionSeed = {
  code: string;
  name: string;
  axis: string;
  description: string;
  positions: TemplatePositionSeed[];
};

export type TemplateDefinitionSeed = {
  code: string;
  name: string;
  description: string;
  energyTypeScope: string;
  sections: TemplateSectionSeed[];
};

export type TemplateSourceManifest = {
  workbook: string;
  sheets: string[];
  sheetSummaries: Array<Record<string, unknown>>;
  rules: Array<Record<string, unknown>>;
  excludedRows: Array<Record<string, unknown>>;
  totals: { applicableSourceRows: number; checkItems: number; criteria: number; activeRules: number; excludedRows: number };
};

type GeneratedCatalog = {
  sourceManifest: TemplateSourceManifest;
  standard: TemplateDefinitionSeed;
  newEnergy: TemplateDefinitionSeed;
};

const generatedCatalog = catalog as GeneratedCatalog;

export const TEMPLATE_DEFINITIONS = { standard: generatedCatalog.standard, newEnergy: generatedCatalog.newEnergy };
export const TEMPLATE_SOURCE_MANIFEST = generatedCatalog.sourceManifest;
