# 鉴定数据库

## 目标与边界

数据库把鉴定模板、现场执行、证据、规则评估和报告快照拆成可追溯的 Prisma/SQLite 关系。车辆先完成结构化鉴定，SalesCase 只能引用已经固定的车辆事实；CustomerDemand 只影响解释顺序和适配说明，不得改变鉴定事实或规则结论。

当前实现使用可解释规则，不引入复杂 AI/深度学习。AI 可以协助录入、整理或生成解释，但不能改写模板事实、事故/水泡判定、硬停止门槛或标准报告快照。

## 关系边界

    Vehicle → Inspection → InspectionItem → Finding → Evidence
        │          │             │
        │          │             └→ Position / CheckItem / Criterion
        │          ├→ DamageGroup / AccidentAssessment
        │          ├→ Evaluation → RuleOutcome
        │          └→ StandardReportSnapshot → PersonalizedReportSnapshot
        ├→ MarketPriceSnapshot
        └→ SalesCase → Report / SalesEvent

    InspectionTemplate → TemplateVersion → Section → Position → CheckItem → Criterion
    AppraisalRuleSet → RuleSetVersion → Evaluation

## 模型职责与不变量

| 层 | 模型 | 规则 |
| --- | --- | --- |
| 模板目录 | InspectionTemplate、InspectionTemplateVersion、Section、Position、CheckItem、Criterion | 使用中的版本按约定不可变；来源 sheet、row、column、partIndex 和 sourceText 保留 provenance。 |
| 车辆展示资料 | Vehicle.coverImage、Vehicle.displayTags | 封面保存为 `/uploads/vehicles/...` 相对路径或受信任 HTTPS 地址；展示标签以 JSON 数组保存，车辆档案、客户选车和消费者报告统一从车辆行读取。 |
| 现场执行 | Inspection、InspectionItem | Inspection 绑定模板版本；执行项记录 operator/reviewer、结果、严重度、时间和兼容旧字段；同一次执行的模板项最多一条 override。 |
| 事实与证据 | InspectionFinding、InspectionEvidence | 一个 finding 表示一个执行项目对一个 criterion 的选中结果；一个 item 可以有多个 finding，尤其用于水泡 distinct criterion 计数；证据可挂 item 或 finding。 |
| 事故归组 | InspectionDamageGroup、InspectionAccidentAssessment | 由检查/复核人员按同一受力或损伤区域归组并确认 NONE/ORDINARY/MAJOR，不使用未经确认的事故总分。 |
| 规则执行 | AppraisalRuleSet、AppraisalRuleSetVersion、InspectionEvaluation、InspectionRuleOutcome | 法律可交易性、事故、水泡、当前安全、核心功能、披露、维修经济性和流通建议分轴保存；硬停止独立保存。 |
| 报告 | StandardReportSnapshot、PersonalizedReportSnapshot、Report | 标准快照必须关联 inspection、evaluation、template version；个性化快照必须指向标准快照；旧 Report 的 generatedSnapshot 与 nullable lineage pointer 仅用于兼容历史行。 |

## 模板目录与规则范围

完整工作簿导入保留七张适用检查表：

- 标准燃油/通用模板：179 items / 710 criteria；
- 新能源模板：复用上述 179/710，再追加新能源专项 14/41，即 193 items / 751 criteria；
- 双模板实际入库：372 items / 1461 criteria；
- 每个 item 和 criterion 保留来源 sheet、row、section/text、column、partIndex、sourceText/sourceNote；
- active rule 为 ①事故车、②泡水车、④其他三条；
- ③火烧车整行只保留在 excluded source rows，不创建 active fire tag、criterion 或 evaluation 结论。

开发期由 scripts/generate-template-catalog.py 读取工作簿生成静态 JSON，scripts/validate-template-catalog.py 做 exact provenance 校验。运行时只读取提交的 prisma/template-catalog.generated.json，不依赖临时文件或外部网络。

## 已确认业务口径

- 普通事故与重大事故必须区分；同一结构件同一位置的持续或重复撞击、损伤、变形、褶皱，可以在人工归组确认后升级为重大事故。
- 同一部件或同一水泡聚合位置出现 3 个及以上不同水泡现象时触发水泡规则；同一现象重复记录不能重复计数。
- 现场项目按达到、未达到记录，并保留必要的不适用、阻断等兼容状态；Excel 中的星号表示事故判定参与项。
- 火烧判定整项不进入本版 active 规则；新能源专项对纯电、插混、增程统一适用。
- 当前直接重大事故关注部位为前部两根纵梁、后部两根纵梁、A 柱内侧、B 柱整体和 C 柱内侧。最终判断以是否影响安全、核心功能和是否充分披露为主，不机械照搬高价平台标准。
- 更换、切割、焊接不各自固定对应独立等级，结论取决于具体结构件以及命中的事故判定点。

## 稀疏现场记录

模板目录是完整的，InspectionItem 是执行结果 override，而不是模板的复制品。只有异常或带有说明、成本、证据等真实执行变化的项目才写入行；未记录项目在草稿接口和页面按正常基线展示，但仍处于未确认状态。完成鉴定时由操作员显式确认其余项目正常，规则引擎和标准报告随后把缺少执行行的模板项物化为隐含正常事实，不批量创建 NORMAL 行。完成后的评估结果 `missing` 为空，隐含正常数量单独通过进度/报告目录表达。

旧数据可能没有 checkItemId 或 positionId，兼容迁移会保留这些行，并把“未检/未检验”映射为 UNCHECKED、“不适用”映射为 NOT_APPLICABLE、“阻断”映射为 BLOCKED，其余按旧 isAbnormal 映射为 ABNORMAL/NORMAL。旧的显式 NORMAL 行仍可读取；更新为没有说明、成本、证据或自定义解释的普通 NORMAL 时，会删除该模板 override，恢复为隐含基线。

InspectionItem 使用 inspectionId + checkItemId 的复合唯一约束。SQLite 在复合唯一约束中允许多个 NULL，因此 legacy 未绑定项目可以并存；数据库基础校验会在事务中验证该行为并回滚测试数据。

## 迁移与演示数据库

迁移顺序为：

    20260904091112_init
    20260905071612_appraisal_foundation
    20260906124000_legacy_status_compatibility
    20260912093632_make_inspection_texts_nullable
    20260912193000_sync_reached_finding_results
    20260912200000_align_inspection_facts
    20260912211500_add_vehicle_display_tags

foundation migration 通过显式旧表搬运保留历史车辆、鉴定、执行项和报告快照；compatibility migration 只规范化没有模板绑定的 legacy 执行项，不覆盖新链路的显式状态；alignment migration 补齐历史异常项目与模板准则的 finding 关系，并增加 `findingMode` 区分准则驱动异常与有说明的项目级异常。

非 disposable 数据库升级时：

1. 先在数据库旁创建带时间戳、可恢复的副本，副本放在仓库外；
2. 只执行 prisma migrate deploy，不用 migrate reset、db push --force-reset 或删表重建；
3. 运行 scripts/validate-db-upgrade.ts、scripts/validate-db-foundation.ts 和 API smoke；
4. 失败时保留失败库供诊断，再从已验证备份恢复；当前没有 down migration。

本地比赛演示使用 prisma/dev.db。受保护的 npm run demo:reset 只会重建本项目的本地 SQLite、应用 migrations 并运行 seed，且会校验固定业务签名；原 npm run db:reset 仍只适用于熟悉 Prisma 的一次性演示库。Seed 会恢复六辆演示车、六份已完成鉴定、六次评估、六份标准快照、六份个性化快照和六个固定 SalesCase。

仍待确认的内容只包括精确阈值、尚未列明的扩展部位、维修经济性门槛、模板生效时间和复检触发与升级的精确细则；这些值需确认后再写入 rule-set version，AI 不自行推断。
