-- CreateTable
CREATE TABLE "InspectionTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "templateType" TEXT NOT NULL DEFAULT 'VEHICLE_APPRAISAL',
    "energyTypeScope" TEXT NOT NULL DEFAULT 'ALL',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "InspectionTemplateVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "templateId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "effectiveFrom" DATETIME,
    "definitionSnapshot" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "InspectionTemplateVersion_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "InspectionTemplate" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InspectionTemplateSection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "templateVersionId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "axis" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT,
    CONSTRAINT "InspectionTemplateSection_templateVersionId_fkey" FOREIGN KEY ("templateVersionId") REFERENCES "InspectionTemplateVersion" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InspectionTemplatePosition" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sectionId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "side" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "floodAggregationKey" TEXT,
    CONSTRAINT "InspectionTemplatePosition_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "InspectionTemplateSection" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InspectionCheckItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "positionId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "componentClass" TEXT NOT NULL DEFAULT 'OTHER',
    "accidentDecisionParticipant" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sourceSheet" TEXT,
    "sourceRow" INTEGER,
    "sourceSection" TEXT,
    "sourceText" TEXT,
    CONSTRAINT "InspectionCheckItem_componentClass_check" CHECK ("componentClass" IN ('STRUCTURAL', 'REINFORCEMENT', 'COVERAGE', 'OTHER')),
    CONSTRAINT "InspectionCheckItem_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "InspectionTemplatePosition" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InspectionCriterion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "checkItemId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "axis" TEXT NOT NULL,
    "criterionType" TEXT NOT NULL,
    "description" TEXT,
    "ruleKey" TEXT,
    "countsAsDistinctFloodFinding" BOOLEAN NOT NULL DEFAULT false,
    "hardStopCriterion" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sourceSheet" TEXT,
    "sourceRow" INTEGER,
    "sourceColumn" TEXT,
    "sourcePartIndex" INTEGER NOT NULL DEFAULT 1,
    "sourceText" TEXT,
    "sourceNote" TEXT,
    CONSTRAINT "InspectionCriterion_checkItemId_fkey" FOREIGN KEY ("checkItemId") REFERENCES "InspectionCheckItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InspectionFinding" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "inspectionItemId" TEXT NOT NULL,
    "criterionId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'REACHED',
    "valueText" TEXT,
    "note" TEXT,
    "selectedBy" TEXT,
    "selectedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "InspectionFinding_status_check" CHECK ("status" IN ('UNCHECKED', 'REACHED', 'NOT_REACHED', 'NOT_APPLICABLE', 'BLOCKED')),
    CONSTRAINT "InspectionFinding_inspectionItemId_fkey" FOREIGN KEY ("inspectionItemId") REFERENCES "InspectionItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "InspectionFinding_criterionId_fkey" FOREIGN KEY ("criterionId") REFERENCES "InspectionCriterion" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InspectionEvidence" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "inspectionId" TEXT NOT NULL,
    "inspectionItemId" TEXT,
    "findingId" TEXT,
    "uri" TEXT NOT NULL,
    "mediaType" TEXT NOT NULL,
    "caption" TEXT,
    "capturedBy" TEXT,
    "capturedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InspectionEvidence_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "Inspection" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "InspectionEvidence_inspectionItemId_fkey" FOREIGN KEY ("inspectionItemId") REFERENCES "InspectionItem" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "InspectionEvidence_findingId_fkey" FOREIGN KEY ("findingId") REFERENCES "InspectionFinding" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InspectionDamageGroup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "inspectionId" TEXT NOT NULL,
    "groupCode" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "notes" TEXT,
    "confirmedBy" TEXT,
    "confirmedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InspectionDamageGroup_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "Inspection" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InspectionAccidentAssessment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "inspectionId" TEXT NOT NULL,
    "findingId" TEXT NOT NULL,
    "damageGroupId" TEXT,
    "classification" TEXT NOT NULL DEFAULT 'NONE',
    "decisionParticipant" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "confirmedBy" TEXT,
    "confirmedAt" DATETIME,
    CONSTRAINT "InspectionAccidentAssessment_classification_check" CHECK ("classification" IN ('NONE', 'ORDINARY', 'MAJOR')),
    CONSTRAINT "InspectionAccidentAssessment_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "Inspection" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "InspectionAccidentAssessment_findingId_fkey" FOREIGN KEY ("findingId") REFERENCES "InspectionFinding" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "InspectionAccidentAssessment_damageGroupId_fkey" FOREIGN KEY ("damageGroupId") REFERENCES "InspectionDamageGroup" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AppraisalRuleSet" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AppraisalRuleSetVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ruleSetId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "configJson" TEXT NOT NULL,
    "effectiveFrom" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AppraisalRuleSetVersion_ruleSetId_fkey" FOREIGN KEY ("ruleSetId") REFERENCES "AppraisalRuleSet" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InspectionEvaluation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "inspectionId" TEXT NOT NULL,
    "ruleSetVersionId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "legalTradeabilityStatus" TEXT NOT NULL DEFAULT 'UNASSESSED',
    "hardStop" BOOLEAN NOT NULL DEFAULT false,
    "hardStopCode" TEXT,
    "accidentClassification" TEXT NOT NULL DEFAULT 'NONE',
    "floodStatus" TEXT NOT NULL DEFAULT 'UNASSESSED',
    "floodFindingCount" INTEGER NOT NULL DEFAULT 0,
    "currentSafetyConclusion" TEXT NOT NULL DEFAULT 'UNASSESSED',
    "functionConclusion" TEXT NOT NULL DEFAULT 'UNASSESSED',
    "circulationRecommendation" TEXT NOT NULL DEFAULT 'UNASSESSED',
    "recommendationReason" TEXT,
    "outcomeJson" TEXT NOT NULL DEFAULT '{}',
    "evaluatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "evaluatorName" TEXT,
    CONSTRAINT "InspectionEvaluation_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "Inspection" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "InspectionEvaluation_ruleSetVersionId_fkey" FOREIGN KEY ("ruleSetVersionId") REFERENCES "AppraisalRuleSetVersion" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InspectionRuleOutcome" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "evaluationId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "axis" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "isBlocking" BOOLEAN NOT NULL DEFAULT false,
    "valueText" TEXT,
    "reason" TEXT,
    "detailsJson" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InspectionRuleOutcome_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "InspectionEvaluation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StandardReportSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "inspectionId" TEXT NOT NULL,
    "evaluationId" TEXT NOT NULL,
    "templateVersionId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "snapshotVersion" TEXT NOT NULL DEFAULT '1.0.0',
    "snapshotJson" TEXT NOT NULL,
    "generatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "generatedBy" TEXT,
    CONSTRAINT "StandardReportSnapshot_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "Inspection" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StandardReportSnapshot_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "InspectionEvaluation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "StandardReportSnapshot_templateVersionId_fkey" FOREIGN KEY ("templateVersionId") REFERENCES "InspectionTemplateVersion" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PersonalizedReportSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "salesCaseId" TEXT NOT NULL,
    "standardReportSnapshotId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "snapshotVersion" TEXT NOT NULL DEFAULT '1.0.0',
    "focusTagsJson" TEXT NOT NULL DEFAULT '[]',
    "generationMethod" TEXT NOT NULL DEFAULT 'RULE_ENGINE',
    "snapshotJson" TEXT NOT NULL,
    "generatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "generatedBy" TEXT,
    CONSTRAINT "PersonalizedReportSnapshot_salesCaseId_fkey" FOREIGN KEY ("salesCaseId") REFERENCES "SalesCase" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PersonalizedReportSnapshot_standardReportSnapshotId_fkey" FOREIGN KEY ("standardReportSnapshotId") REFERENCES "StandardReportSnapshot" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Inspection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "vehicleId" TEXT NOT NULL,
    "templateVersionId" TEXT,
    "version" INTEGER NOT NULL,
    "inspectionDate" DATETIME NOT NULL,
    "inspectorName" TEXT NOT NULL,
    "reviewerName" TEXT,
    "reviewedAt" DATETIME,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "lastSavedAt" DATETIME,
    "overallRiskLevel" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Inspection_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Inspection_status_check" CHECK ("status" IN ('DRAFT', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED', 'STOPPED')),
    CONSTRAINT "Inspection_templateVersionId_fkey" FOREIGN KEY ("templateVersionId") REFERENCES "InspectionTemplateVersion" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Inspection" ("createdAt", "id", "inspectionDate", "inspectorName", "overallRiskLevel", "status", "summary", "updatedAt", "vehicleId", "version") SELECT "createdAt", "id", "inspectionDate", "inspectorName", "overallRiskLevel", "status", "summary", "updatedAt", "vehicleId", "version" FROM "Inspection";
DROP TABLE "Inspection";
ALTER TABLE "new_Inspection" RENAME TO "Inspection";
CREATE INDEX "Inspection_templateVersionId_idx" ON "Inspection"("templateVersionId");
CREATE INDEX "Inspection_vehicleId_status_idx" ON "Inspection"("vehicleId", "status");
CREATE UNIQUE INDEX "Inspection_vehicleId_version_key" ON "Inspection"("vehicleId", "version");
CREATE TABLE "new_InspectionItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "inspectionId" TEXT NOT NULL,
    "checkItemId" TEXT,
    "positionId" TEXT,
    "zone" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "resultStatus" TEXT NOT NULL DEFAULT 'UNCHECKED',
    "isAbnormal" BOOLEAN NOT NULL DEFAULT false,
    "severity" INTEGER NOT NULL DEFAULT 0,
    "basePriority" INTEGER NOT NULL DEFAULT 1,
    "professionalDescription" TEXT NOT NULL,
    "consumerExplanation" TEXT NOT NULL,
    "futureRisk" TEXT NOT NULL,
    "repairSuggestion" TEXT NOT NULL,
    "estimatedRepairCost" INTEGER,
    "notes" TEXT,
    "operatorName" TEXT,
    "reviewerName" TEXT,
    "checkedAt" DATETIME,
    "reviewedAt" DATETIME,
    "mediaUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "InspectionItem_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "Inspection" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "InspectionItem_checkItemId_fkey" FOREIGN KEY ("checkItemId") REFERENCES "InspectionCheckItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "InspectionItem_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "InspectionTemplatePosition" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_InspectionItem" ("basePriority", "category", "consumerExplanation", "createdAt", "estimatedRepairCost", "futureRisk", "id", "inspectionId", "isAbnormal", "itemName", "mediaUrl", "professionalDescription", "repairSuggestion", "result", "resultStatus", "severity", "updatedAt", "zone") SELECT "basePriority", "category", "consumerExplanation", "createdAt", "estimatedRepairCost", "futureRisk", "id", "inspectionId", "isAbnormal", "itemName", "mediaUrl", "professionalDescription", "repairSuggestion", "result", CASE WHEN "isAbnormal" = 1 THEN 'ABNORMAL' ELSE 'NORMAL' END, "severity", "updatedAt", "zone" FROM "InspectionItem";
DROP TABLE "InspectionItem";
ALTER TABLE "new_InspectionItem" RENAME TO "InspectionItem";
CREATE INDEX "InspectionItem_inspectionId_zone_idx" ON "InspectionItem"("inspectionId", "zone");
CREATE INDEX "InspectionItem_inspectionId_resultStatus_idx" ON "InspectionItem"("inspectionId", "resultStatus");
CREATE INDEX "InspectionItem_checkItemId_idx" ON "InspectionItem"("checkItemId");
CREATE INDEX "InspectionItem_positionId_idx" ON "InspectionItem"("positionId");
CREATE UNIQUE INDEX "InspectionItem_inspectionId_checkItemId_key" ON "InspectionItem"("inspectionId", "checkItemId");
CREATE TABLE "new_Report" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "salesCaseId" TEXT NOT NULL,
    "inspectionId" TEXT NOT NULL,
    "standardReportSnapshotId" TEXT,
    "personalizedReportSnapshotId" TEXT,
    "version" INTEGER NOT NULL,
    "reportMode" TEXT NOT NULL DEFAULT 'PERSONALIZED',
    "highlightTags" TEXT NOT NULL DEFAULT '[]',
    "generatedSnapshot" TEXT NOT NULL,
    "generatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Report_salesCaseId_fkey" FOREIGN KEY ("salesCaseId") REFERENCES "SalesCase" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Report_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "Inspection" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Report_reportMode_check" CHECK ("reportMode" IN ('STANDARD', 'PERSONALIZED')),
    CONSTRAINT "Report_standardReportSnapshotId_fkey" FOREIGN KEY ("standardReportSnapshotId") REFERENCES "StandardReportSnapshot" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Report_personalizedReportSnapshotId_fkey" FOREIGN KEY ("personalizedReportSnapshotId") REFERENCES "PersonalizedReportSnapshot" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Report" ("generatedAt", "generatedSnapshot", "highlightTags", "id", "inspectionId", "reportMode", "salesCaseId", "version") SELECT "generatedAt", "generatedSnapshot", "highlightTags", "id", "inspectionId", "reportMode", "salesCaseId", "version" FROM "Report";
DROP TABLE "Report";
ALTER TABLE "new_Report" RENAME TO "Report";
CREATE INDEX "Report_standardReportSnapshotId_idx" ON "Report"("standardReportSnapshotId");
CREATE INDEX "Report_personalizedReportSnapshotId_idx" ON "Report"("personalizedReportSnapshotId");
CREATE UNIQUE INDEX "Report_salesCaseId_version_key" ON "Report"("salesCaseId", "version");
CREATE TABLE "new_RiskTag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "defaultSeverity" INTEGER NOT NULL,
    "defaultPriority" INTEGER NOT NULL,
    "consumerTemplate" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true
);
INSERT INTO "new_RiskTag" ("category", "code", "consumerTemplate", "defaultPriority", "defaultSeverity", "id", "name") SELECT "category", "code", "consumerTemplate", "defaultPriority", "defaultSeverity", "id", "name" FROM "RiskTag";
DROP TABLE "RiskTag";
ALTER TABLE "new_RiskTag" RENAME TO "RiskTag";
CREATE UNIQUE INDEX "RiskTag_code_key" ON "RiskTag"("code");
CREATE TABLE "new_Vehicle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "vin" TEXT NOT NULL,
    "plateNo" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "series" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "modelYear" INTEGER NOT NULL,
    "registrationDate" DATETIME NOT NULL,
    "mileage" INTEGER NOT NULL,
    "listingPrice" INTEGER NOT NULL,
    "coverImage" TEXT,
    "energyType" TEXT NOT NULL DEFAULT 'ICE',
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Vehicle" ("brand", "code", "coverImage", "createdAt", "id", "listingPrice", "mileage", "model", "modelYear", "plateNo", "registrationDate", "series", "status", "updatedAt", "vin") SELECT "brand", "code", "coverImage", "createdAt", "id", "listingPrice", "mileage", "model", "modelYear", "plateNo", "registrationDate", "series", "status", "updatedAt", "vin" FROM "Vehicle";
DROP TABLE "Vehicle";
ALTER TABLE "new_Vehicle" RENAME TO "Vehicle";
CREATE UNIQUE INDEX "Vehicle_code_key" ON "Vehicle"("code");
CREATE UNIQUE INDEX "Vehicle_vin_key" ON "Vehicle"("vin");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "InspectionTemplate_code_key" ON "InspectionTemplate"("code");

-- CreateIndex
CREATE INDEX "InspectionTemplateVersion_templateId_status_idx" ON "InspectionTemplateVersion"("templateId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "InspectionTemplateVersion_templateId_version_key" ON "InspectionTemplateVersion"("templateId", "version");

-- CreateIndex
CREATE INDEX "InspectionTemplateSection_templateVersionId_axis_sortOrder_idx" ON "InspectionTemplateSection"("templateVersionId", "axis", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "InspectionTemplateSection_templateVersionId_code_key" ON "InspectionTemplateSection"("templateVersionId", "code");

-- CreateIndex
CREATE INDEX "InspectionTemplatePosition_sectionId_sortOrder_idx" ON "InspectionTemplatePosition"("sectionId", "sortOrder");

-- CreateIndex
CREATE INDEX "InspectionTemplatePosition_floodAggregationKey_idx" ON "InspectionTemplatePosition"("floodAggregationKey");

-- CreateIndex
CREATE UNIQUE INDEX "InspectionTemplatePosition_sectionId_code_key" ON "InspectionTemplatePosition"("sectionId", "code");

-- CreateIndex
CREATE INDEX "InspectionCheckItem_positionId_sortOrder_idx" ON "InspectionCheckItem"("positionId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "InspectionCheckItem_positionId_code_key" ON "InspectionCheckItem"("positionId", "code");

-- CreateIndex
CREATE INDEX "InspectionCriterion_criterionType_idx" ON "InspectionCriterion"("criterionType");

-- CreateIndex
CREATE UNIQUE INDEX "InspectionCriterion_checkItemId_code_key" ON "InspectionCriterion"("checkItemId", "code");

-- CreateIndex
CREATE INDEX "InspectionFinding_criterionId_status_idx" ON "InspectionFinding"("criterionId", "status");

-- CreateIndex
CREATE INDEX "InspectionFinding_inspectionItemId_status_idx" ON "InspectionFinding"("inspectionItemId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "InspectionFinding_inspectionItemId_criterionId_key" ON "InspectionFinding"("inspectionItemId", "criterionId");

-- CreateIndex
CREATE INDEX "InspectionEvidence_inspectionId_capturedAt_idx" ON "InspectionEvidence"("inspectionId", "capturedAt");

-- CreateIndex
CREATE INDEX "InspectionEvidence_inspectionItemId_idx" ON "InspectionEvidence"("inspectionItemId");

-- CreateIndex
CREATE INDEX "InspectionEvidence_findingId_idx" ON "InspectionEvidence"("findingId");

-- CreateIndex
CREATE INDEX "InspectionDamageGroup_inspectionId_confirmedAt_idx" ON "InspectionDamageGroup"("inspectionId", "confirmedAt");

-- CreateIndex
CREATE UNIQUE INDEX "InspectionDamageGroup_inspectionId_groupCode_key" ON "InspectionDamageGroup"("inspectionId", "groupCode");

-- CreateIndex
CREATE UNIQUE INDEX "InspectionAccidentAssessment_findingId_key" ON "InspectionAccidentAssessment"("findingId");

-- CreateIndex
CREATE INDEX "InspectionAccidentAssessment_inspectionId_classification_decisionParticipant_idx" ON "InspectionAccidentAssessment"("inspectionId", "classification", "decisionParticipant");

-- CreateIndex
CREATE INDEX "InspectionAccidentAssessment_damageGroupId_idx" ON "InspectionAccidentAssessment"("damageGroupId");

-- CreateIndex
CREATE UNIQUE INDEX "AppraisalRuleSet_code_key" ON "AppraisalRuleSet"("code");

-- CreateIndex
CREATE INDEX "AppraisalRuleSetVersion_ruleSetId_status_idx" ON "AppraisalRuleSetVersion"("ruleSetId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "AppraisalRuleSetVersion_ruleSetId_version_key" ON "AppraisalRuleSetVersion"("ruleSetId", "version");

-- CreateIndex
CREATE INDEX "InspectionEvaluation_inspectionId_evaluatedAt_idx" ON "InspectionEvaluation"("inspectionId", "evaluatedAt");

-- CreateIndex
CREATE INDEX "InspectionEvaluation_ruleSetVersionId_status_idx" ON "InspectionEvaluation"("ruleSetVersionId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "InspectionEvaluation_inspectionId_version_key" ON "InspectionEvaluation"("inspectionId", "version");

-- CreateIndex
CREATE INDEX "InspectionRuleOutcome_evaluationId_axis_isBlocking_idx" ON "InspectionRuleOutcome"("evaluationId", "axis", "isBlocking");

-- CreateIndex
CREATE UNIQUE INDEX "InspectionRuleOutcome_evaluationId_code_key" ON "InspectionRuleOutcome"("evaluationId", "code");

-- CreateIndex
CREATE INDEX "StandardReportSnapshot_inspectionId_generatedAt_idx" ON "StandardReportSnapshot"("inspectionId", "generatedAt");

-- CreateIndex
CREATE INDEX "StandardReportSnapshot_evaluationId_idx" ON "StandardReportSnapshot"("evaluationId");

-- CreateIndex
CREATE UNIQUE INDEX "StandardReportSnapshot_inspectionId_version_key" ON "StandardReportSnapshot"("inspectionId", "version");

-- CreateIndex
CREATE INDEX "PersonalizedReportSnapshot_standardReportSnapshotId_generatedAt_idx" ON "PersonalizedReportSnapshot"("standardReportSnapshotId", "generatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PersonalizedReportSnapshot_salesCaseId_version_key" ON "PersonalizedReportSnapshot"("salesCaseId", "version");
