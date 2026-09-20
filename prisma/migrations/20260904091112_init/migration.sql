-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "sourceChannel" TEXT NOT NULL,
    "sourceContent" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CustomerDemand" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerId" TEXT NOT NULL,
    "budgetMin" INTEGER,
    "budgetMax" INTEGER,
    "usageScene" TEXT NOT NULL,
    "purchaseTime" TEXT NOT NULL,
    "focusTags" TEXT NOT NULL DEFAULT '[]',
    "riskConcerns" TEXT NOT NULL DEFAULT '[]',
    "remark" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CustomerDemand_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Vehicle" (
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
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Inspection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "vehicleId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "inspectionDate" DATETIME NOT NULL,
    "inspectorName" TEXT NOT NULL,
    "overallRiskLevel" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Inspection_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InspectionItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "inspectionId" TEXT NOT NULL,
    "zone" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "isAbnormal" BOOLEAN NOT NULL DEFAULT false,
    "severity" INTEGER NOT NULL DEFAULT 0,
    "basePriority" INTEGER NOT NULL DEFAULT 1,
    "professionalDescription" TEXT NOT NULL,
    "consumerExplanation" TEXT NOT NULL,
    "futureRisk" TEXT NOT NULL,
    "repairSuggestion" TEXT NOT NULL,
    "estimatedRepairCost" INTEGER,
    "mediaUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "InspectionItem_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "Inspection" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RiskTag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "defaultSeverity" INTEGER NOT NULL,
    "defaultPriority" INTEGER NOT NULL,
    "consumerTemplate" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "SalesCase" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerId" TEXT NOT NULL,
    "demandId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "sourceChannel" TEXT NOT NULL,
    "stage" TEXT NOT NULL DEFAULT 'INTERESTED',
    "result" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "lostReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SalesCase_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SalesCase_demandId_fkey" FOREIGN KEY ("demandId") REFERENCES "CustomerDemand" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SalesCase_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "salesCaseId" TEXT NOT NULL,
    "inspectionId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "reportMode" TEXT NOT NULL DEFAULT 'PERSONALIZED',
    "highlightTags" TEXT NOT NULL DEFAULT '[]',
    "generatedSnapshot" TEXT NOT NULL,
    "generatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Report_salesCaseId_fkey" FOREIGN KEY ("salesCaseId") REFERENCES "SalesCase" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Report_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "Inspection" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SalesEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "salesCaseId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "eventTime" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" TEXT NOT NULL DEFAULT '{}',
    CONSTRAINT "SalesEvent_salesCaseId_fkey" FOREIGN KEY ("salesCaseId") REFERENCES "SalesCase" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MarketPriceSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "vehicleId" TEXT NOT NULL,
    "newCarReferencePrice" INTEGER NOT NULL,
    "marketLow" INTEGER NOT NULL,
    "marketMedian" INTEGER NOT NULL,
    "marketHigh" INTEGER NOT NULL,
    "conditionAdjustedLow" INTEGER NOT NULL,
    "conditionAdjustedHigh" INTEGER NOT NULL,
    "source" TEXT NOT NULL,
    "capturedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MarketPriceSnapshot_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MediaSource" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "leads" INTEGER NOT NULL DEFAULT 0,
    "consultations" INTEGER NOT NULL DEFAULT 0,
    "reports" INTEGER NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_code_key" ON "Vehicle"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_vin_key" ON "Vehicle"("vin");

-- CreateIndex
CREATE UNIQUE INDEX "Inspection_vehicleId_version_key" ON "Inspection"("vehicleId", "version");

-- CreateIndex
CREATE INDEX "InspectionItem_inspectionId_zone_idx" ON "InspectionItem"("inspectionId", "zone");

-- CreateIndex
CREATE UNIQUE INDEX "RiskTag_code_key" ON "RiskTag"("code");

-- CreateIndex
CREATE INDEX "SalesCase_customerId_vehicleId_idx" ON "SalesCase"("customerId", "vehicleId");

-- CreateIndex
CREATE UNIQUE INDEX "Report_salesCaseId_version_key" ON "Report"("salesCaseId", "version");

-- CreateIndex
CREATE INDEX "SalesEvent_salesCaseId_eventTime_idx" ON "SalesEvent"("salesCaseId", "eventTime");

-- CreateIndex
CREATE INDEX "MarketPriceSnapshot_vehicleId_capturedAt_idx" ON "MarketPriceSnapshot"("vehicleId", "capturedAt");

-- CreateIndex
CREATE UNIQUE INDEX "MediaSource_code_key" ON "MediaSource"("code");
