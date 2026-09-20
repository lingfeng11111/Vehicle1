# 九宫立序，车诚万家

面向汽车营销技能比赛的 B/S 演示系统：把客户需求、车辆鉴定、消费者报告、销售结果和营销复盘串成一条可操作主链。项目强调展示真实、支撑够用、工程克制，不是生产级 SaaS、商城、支付平台或复杂 AI 推荐系统。

## 比赛演示环境

仓库包含比赛演示用 SQLite 数据库 `prisma/dev.db`，其中有演示数据和 `MediaAsset` 媒体资源；数据库 schema、迁移和种子脚本位于 `prisma/`。这个数据库有意纳入 Git，便于团队回档和复现演示。运行时媒体通过本地 `/api/media/...` 读取，不依赖 `public/uploads` 或外部图片网络。

所有本机环境文件（`.env`、`.env.local` 等）都不进入 Git；仓库只提供不含密钥的 `.env.example`。需要 DeepSeek 报告功能时，请把自己的 `DEEPSEEK_API_KEY` 配置在本地 `.env.local`，不要提交密钥。

## 启动

首次克隆后，在项目根目录执行：

    cp .env.example .env
    npm ci
    npm run db:generate
    npm run dev

打开 http://localhost:3000。仓库里的演示数据库已经包含迁移状态和比赛数据，首次启动无需执行 migrate、seed 或 reset。需要把本地数据库恢复为仓库版本时，先停止应用，再执行 `git restore prisma/dev.db`；此操作会丢弃本地数据库修改。

Windows PowerShell 可使用 `Copy-Item .env.example .env` 代替 `cp`，也可直接运行 [Windows 启动与数据库指南](docs/windows-setup.md) 中的安装脚本。

## 主文档

- [系统架构](docs/architecture.md)
- [鉴定数据库](docs/database.md)
- [比赛演示路径](docs/demo.md)
- [Windows 启动与数据库指南](docs/windows-setup.md)

业务代码位于 `src/`，Prisma schema、迁移与 seed 位于 `prisma/`。常用命令：

    npm run dev
    npm run typecheck
    npm run test
    npm run lint
    npm run build
    npm run demo:reset
