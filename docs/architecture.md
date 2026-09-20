# 系统架构

## 运行形态

浏览器、平板和移动端报告页进入 Next.js App Router；页面由 TypeScript、Tailwind 和 shadcn/ui 组成，写入通过 Route Handler 进入 Prisma，再落到本地 SQLite。应用壳统一处理桌面侧栏、平板导航、报告移动只读布局和打印样式。比赛阶段保持单体结构，不为未展示的生产基础设施增加服务层。

    Browser / tablet / mobile report
                 ↓
    Next.js App Router + UI components
                 ↓
    Route Handlers + domain services/config
                 ↓
    Prisma ORM → SQLite

## 页面与 API

| 页面 | 作用 | 主要 API |
| --- | --- | --- |
| /dashboard | 工作台漏斗、来源、关注点、近期案例 | /api/overview |
| /customers、/customers/:id | 客户线索、需求卡、意向车辆、历史案例 | /api/customers、/api/customers/:id、/api/sales-cases |
| /vehicles、/vehicles/:id | 车辆固定资料、封面/展示标签、鉴定状态、行情 | /api/vehicles、/api/vehicles/:id、/api/uploads |
| /inspections/:vehicleId | 从车辆档案进入区域→部件/项目→编辑器的鉴定作业 | /api/inspections/:vehicleId |
| /reports、/reports/:id | 报告阅读、打印与 PDF 入口 | /api/reports、/api/reports/:id |
| /analytics | 来源转化、关注分布、结果回流 | /api/overview、/api/sales-cases |
| /settings | 当前 Feature Flags 与比赛边界说明 | — |

写入接口使用 Zod 校验；SalesCase 创建会校验客户与需求归属并阻止同一需求重复绑定同一车辆的案例。鉴定保存、规则评估、标准/个性化报告创建和销售结果更新使用 Prisma 事务，避免只更新页面而没有持久化。

## 领域服务与配置

- src/services/inspection-engine.ts：完整状态判断、finding 聚合和鉴定规则评估。
- src/services/standard-report.ts：从模板、评估、现场事实和证据生成不可变标准报告文档。
- src/services/report-generator.ts：在 Feature Flag 开启且报告为 PERSONALIZED 时，按客户关注点调整重点和解释排序。
- src/services/analytics.ts：漏斗和转化率计算，保持展示层只负责呈现。
- src/services/market-price-provider.ts：MarketPriceProvider 接口；当前为 Mock/Manual 数据，不依赖外部网络。
- src/services/upload-storage.ts：校验并保存车辆封面、现场证据图片；数据库只保存安全的相对 URI 与媒体类型。
- src/config/：Feature Flags、鉴定区域、风险标签和报告优先级规则。
- scripts/：模板导入/校验及数据库基础、升级校验；不是运行时的第二套业务逻辑。

## 关系与不变量

    Customer → CustomerDemand → SalesCase → Vehicle
                                      ↓
                         Inspection → InspectionItem → Finding → Evidence
                                      ↓
                             Evaluation → RuleOutcome
                                      ↓
                           StandardReportSnapshot
                                      ↓
                       PersonalizedReportSnapshot → Report
                                      ↓
                                 SalesEvent

Vehicle、Inspection、InspectionItem、Finding 和 Evidence 提供固定事实；CustomerDemand 只描述当前销售需求。StandardReportSnapshot 保存事实和规则结论，PersonalizedReportSnapshot 只能引用标准快照并调整解释顺序。旧 Report.generatedSnapshot 是兼容桥，不是新报告的事实来源。完整模板目录与稀疏现场 override 的数据库含义见 docs/database.md。

车辆状态、鉴定状态和评估状态是三个维度：例如车辆可以标记为 REVIEW_REQUIRED，同时保留一份已完成的 Inspection；页面必须分别展示，不能用一个标签覆盖另一个业务含义。客户结果使用 IN_PROGRESS、PENDING、REJECTED、CONVERTED，报告版本递增且不覆盖历史版本。

## 迁移边界

当前迁移顺序为 20260904091112_init → 20260905071612_appraisal_foundation → 20260906124000_legacy_status_compatibility → 20260912093632_make_inspection_texts_nullable → 20260912193000_sync_reached_finding_results → 20260912200000_align_inspection_facts → 20260912211500_add_vehicle_display_tags。升级非 disposable 数据库前先备份，只使用 migrate deploy，再执行数据库校验；不要用 reset 或强制删除表替代迁移。比赛演示仍以本地 SQLite 为边界，未来是否迁移 PostgreSQL 不属于当前实现。
