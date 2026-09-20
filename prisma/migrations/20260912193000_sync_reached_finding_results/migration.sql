-- Keep the persisted item summary aligned with the observable criterion that
-- the inspector marked as reached. The original criterion rows remain the
-- source of truth; this backfills legacy item summaries for old inspections.
UPDATE "InspectionItem"
SET "result" = (
  SELECT group_concat("InspectionCriterion"."label", '、')
  FROM "InspectionFinding"
  INNER JOIN "InspectionCriterion"
    ON "InspectionCriterion"."id" = "InspectionFinding"."criterionId"
  WHERE "InspectionFinding"."inspectionItemId" = "InspectionItem"."id"
    AND "InspectionFinding"."status" = 'REACHED'
)
WHERE "InspectionItem"."resultStatus" = 'ABNORMAL'
  AND EXISTS (
    SELECT 1
    FROM "InspectionFinding"
    WHERE "InspectionFinding"."inspectionItemId" = "InspectionItem"."id"
      AND "InspectionFinding"."status" = 'REACHED'
  );
