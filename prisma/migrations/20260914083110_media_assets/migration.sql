-- CreateTable
CREATE TABLE "MediaAsset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "assetKey" TEXT,
    "filename" TEXT NOT NULL,
    "originalName" TEXT,
    "mediaType" TEXT NOT NULL,
    "byteSize" INTEGER NOT NULL,
    "data" BLOB NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'UPLOAD',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "MediaAsset_assetKey_key" ON "MediaAsset"("assetKey");

-- CreateIndex
CREATE INDEX "MediaAsset_source_idx" ON "MediaAsset"("source");
