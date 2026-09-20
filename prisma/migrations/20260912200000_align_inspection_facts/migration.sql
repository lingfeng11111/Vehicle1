-- Keep the item-level status and criterion-level observations explicit.
-- CRITERION is the normal mode; DIRECT is only for a documented item-level
-- exception that the current template cannot express as a specific criterion.
ALTER TABLE "InspectionItem" ADD COLUMN "findingMode" TEXT NOT NULL DEFAULT 'CRITERION';

-- Repair the old demo alias that pointed “手续核验” at GENERAL_R05. The
-- canonical item is GENERAL_R04 (“证件与手续”); use the same template
-- version as the inspection so the two template versions never cross-link.
UPDATE "InspectionItem"
SET
  "checkItemId" = (
    SELECT new_ci."id"
    FROM "InspectionCheckItem" new_ci
    INNER JOIN "InspectionTemplatePosition" new_position ON new_position."id" = new_ci."positionId"
    INNER JOIN "InspectionTemplateSection" new_section ON new_section."id" = new_position."sectionId"
    INNER JOIN "InspectionTemplateVersion" new_version ON new_version."id" = new_section."templateVersionId"
    WHERE new_ci."code" = 'GENERAL_R04'
      AND new_version."id" = (SELECT current_inspection."templateVersionId" FROM "Inspection" current_inspection WHERE current_inspection."id" = "InspectionItem"."inspectionId")
    LIMIT 1
  ),
  "positionId" = (
    SELECT new_ci."positionId"
    FROM "InspectionCheckItem" new_ci
    INNER JOIN "InspectionTemplatePosition" new_position ON new_position."id" = new_ci."positionId"
    INNER JOIN "InspectionTemplateSection" new_section ON new_section."id" = new_position."sectionId"
    INNER JOIN "InspectionTemplateVersion" new_version ON new_version."id" = new_section."templateVersionId"
    WHERE new_ci."code" = 'GENERAL_R04'
      AND new_version."id" = (SELECT current_inspection."templateVersionId" FROM "Inspection" current_inspection WHERE current_inspection."id" = "InspectionItem"."inspectionId")
    LIMIT 1
  )
WHERE "resultStatus" = 'ABNORMAL'
  AND "itemName" = '手续核验'
  AND "checkItemId" IN (SELECT ci."id" FROM "InspectionCheckItem" ci WHERE ci."code" = 'GENERAL_R05');

-- A template check item is the source of truth for display names, categories,
-- and position codes. This removes the old seed aliases from every existing
-- linked execution row without changing the stored inspection fact itself.
UPDATE "InspectionItem"
SET
  "itemName" = (SELECT ci."name" FROM "InspectionCheckItem" ci WHERE ci."id" = "InspectionItem"."checkItemId"),
  "category" = (SELECT ci."category" FROM "InspectionCheckItem" ci WHERE ci."id" = "InspectionItem"."checkItemId"),
  "zone" = (SELECT position."code" FROM "InspectionCheckItem" ci INNER JOIN "InspectionTemplatePosition" position ON position."id" = ci."positionId" WHERE ci."id" = "InspectionItem"."checkItemId"),
  "positionId" = (SELECT ci."positionId" FROM "InspectionCheckItem" ci WHERE ci."id" = "InspectionItem"."checkItemId")
WHERE "checkItemId" IS NOT NULL;

-- Backfill exterior findings from the legacy item result. The criterion is
-- resolved through the same check item, so identical codes in the other
-- template version cannot be selected accidentally.
INSERT INTO "InspectionFinding" (
  "id", "inspectionItemId", "criterionId", "status", "valueText", "note", "selectedBy", "selectedAt", "updatedAt"
)
SELECT
  'backfill-' || i."id" || '-' || c."code",
  i."id",
  c."id",
  'REACHED',
  CASE
    WHEN instr(i."result", '补漆') > 0 OR instr(i."result", '色差') > 0 THEN '色差1-3级'
    WHEN instr(i."result", '划痕') > 0 THEN '划痕'
    WHEN instr(i."result", '变形') > 0 THEN '变形'
    WHEN instr(i."result", '钣金') > 0 THEN '钣金'
    ELSE i."result"
  END,
  '由历史项目结果补齐对应的现场异常准则。',
  COALESCE(i."operatorName", '数据修复'),
  COALESCE(i."checkedAt", CURRENT_TIMESTAMP),
  CURRENT_TIMESTAMP
FROM "InspectionItem" i
INNER JOIN "InspectionCheckItem" ci ON ci."id" = i."checkItemId"
INNER JOIN "InspectionCriterion" c
  ON c."checkItemId" = ci."id"
 AND c."code" = CASE
    WHEN instr(i."result", '补漆') > 0 OR instr(i."result", '色差') > 0 THEN 'EXTE_04'
    WHEN instr(i."result", '划痕') > 0 THEN 'EXTE_01'
    WHEN instr(i."result", '变形') > 0 THEN 'EXTE_02'
    WHEN instr(i."result", '钣金') > 0 THEN 'EXTE_03'
    ELSE NULL
  END
WHERE i."resultStatus" = 'ABNORMAL'
  AND ci."code" IN ('RR_R37', 'RF_R40')
  AND NOT EXISTS (
    SELECT 1
    FROM "InspectionFinding" f
    WHERE f."inspectionItemId" = i."id"
      AND f."criterionId" = c."id"
  );

-- Backfill chassis wear into the most specific available safety observation.
-- The source catalog has no standalone “老化/耗损” criterion; SAFE_01 is the
-- crack observation and is the closest documented check for the seeded facts.
INSERT INTO "InspectionFinding" (
  "id", "inspectionItemId", "criterionId", "status", "valueText", "note", "selectedBy", "selectedAt", "updatedAt"
)
SELECT
  'backfill-' || i."id" || '-' || c."code",
  i."id",
  c."id",
  'REACHED',
  '胶套开裂',
  '由历史项目结果补齐下摆臂胶套现场异常准则。',
  COALESCE(i."operatorName", '数据修复'),
  COALESCE(i."checkedAt", CURRENT_TIMESTAMP),
  CURRENT_TIMESTAMP
FROM "InspectionItem" i
INNER JOIN "InspectionCheckItem" ci ON ci."id" = i."checkItemId" AND ci."code" = 'POWER_R21'
INNER JOIN "InspectionCriterion" c ON c."checkItemId" = ci."id" AND c."code" = 'SAFE_01'
WHERE i."resultStatus" = 'ABNORMAL'
  AND (instr(i."result", '耗损') > 0 OR instr(i."result", '老化') > 0 OR instr(i."result", '胶套') > 0)
  AND NOT EXISTS (
    SELECT 1
    FROM "InspectionFinding" f
    WHERE f."inspectionItemId" = i."id"
      AND f."criterionId" = c."id"
  );

-- A missing historical document is a documented item-level exception, not a
-- positive VIN/pass criterion. Preserve it without fabricating a rule hit.
UPDATE "InspectionItem"
SET
  "findingMode" = 'DIRECT',
  "result" = '资料待补充',
  "severity" = 1,
  "notes" = COALESCE("notes", '部分历史资料待补充，未使用细分准则记录。')
WHERE "resultStatus" = 'ABNORMAL'
  AND "itemName" IN ('手续核验', '证件与手续')
  AND "result" IN ('待补充', '资料待补充')
  AND "checkItemId" IN (
    SELECT ci."id"
    FROM "InspectionCheckItem" ci
    WHERE ci."code" = 'GENERAL_R04'
  );

-- Keep user-facing item summaries aligned with the newly reached criteria.
UPDATE "InspectionItem"
SET "result" = '色差1-3级'
WHERE "resultStatus" = 'ABNORMAL'
  AND "checkItemId" IN (
    SELECT ci."id"
    FROM "InspectionCheckItem" ci
    WHERE ci."code" IN ('RR_R37', 'RF_R40')
  )
  AND EXISTS (
    SELECT 1
    FROM "InspectionFinding" f
    INNER JOIN "InspectionCriterion" c ON c."id" = f."criterionId"
    WHERE f."inspectionItemId" = "InspectionItem"."id"
      AND f."status" = 'REACHED'
      AND c."code" = 'EXTE_04'
  );

UPDATE "InspectionItem"
SET "result" = '胶套开裂'
WHERE "resultStatus" = 'ABNORMAL'
  AND "checkItemId" IN (
    SELECT ci."id"
    FROM "InspectionCheckItem" ci
    WHERE ci."code" = 'POWER_R21'
  )
  AND EXISTS (
    SELECT 1
    FROM "InspectionFinding" f
    INNER JOIN "InspectionCriterion" c ON c."id" = f."criterionId"
    WHERE f."inspectionItemId" = "InspectionItem"."id"
      AND f."status" = 'REACHED'
      AND c."code" = 'SAFE_01'
  );
