-- Keep vehicle-facing showroom labels in the database instead of deriving them
-- from the demo vehicle code. The JSON array remains compatible with the
-- existing lightweight SQLite model and can be migrated to a tag relation later.
ALTER TABLE "Vehicle" ADD COLUMN "displayTags" TEXT NOT NULL DEFAULT '[]';
