-- Normalize legacy execution rows after the foundation table rebuild.
-- Legacy rows have no template or position pointer; new template-backed rows
-- are left untouched so their explicit resultStatus remains authoritative.
UPDATE "InspectionItem"
SET "resultStatus" = CASE
    WHEN "result" IN ('未检', '未检验') THEN 'UNCHECKED'
    WHEN "result" = '不适用' THEN 'NOT_APPLICABLE'
    WHEN "result" = '阻断' THEN 'BLOCKED'
    WHEN "isAbnormal" = 1 THEN 'ABNORMAL'
    ELSE 'NORMAL'
END
WHERE "checkItemId" IS NULL AND "positionId" IS NULL;
