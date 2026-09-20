-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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
    "professionalDescription" TEXT,
    "consumerExplanation" TEXT,
    "futureRisk" TEXT,
    "repairSuggestion" TEXT,
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
INSERT INTO "new_InspectionItem" ("basePriority", "category", "checkItemId", "checkedAt", "consumerExplanation", "createdAt", "estimatedRepairCost", "futureRisk", "id", "inspectionId", "isAbnormal", "itemName", "mediaUrl", "notes", "operatorName", "positionId", "professionalDescription", "repairSuggestion", "result", "resultStatus", "reviewedAt", "reviewerName", "severity", "updatedAt", "zone") SELECT "basePriority", "category", "checkItemId", "checkedAt", "consumerExplanation", "createdAt", "estimatedRepairCost", "futureRisk", "id", "inspectionId", "isAbnormal", "itemName", "mediaUrl", "notes", "operatorName", "positionId", "professionalDescription", "repairSuggestion", "result", "resultStatus", "reviewedAt", "reviewerName", "severity", "updatedAt", "zone" FROM "InspectionItem";
DROP TABLE "InspectionItem";
ALTER TABLE "new_InspectionItem" RENAME TO "InspectionItem";
CREATE INDEX "InspectionItem_inspectionId_zone_idx" ON "InspectionItem"("inspectionId", "zone");
CREATE INDEX "InspectionItem_inspectionId_resultStatus_idx" ON "InspectionItem"("inspectionId", "resultStatus");
CREATE INDEX "InspectionItem_checkItemId_idx" ON "InspectionItem"("checkItemId");
CREATE INDEX "InspectionItem_positionId_idx" ON "InspectionItem"("positionId");
CREATE UNIQUE INDEX "InspectionItem_inspectionId_checkItemId_key" ON "InspectionItem"("inspectionId", "checkItemId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
