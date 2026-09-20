# Windows 启动与数据库指南

本项目是 Next.js 16 App Router + Prisma + SQLite 的本地比赛演示系统。Git 仓库包含比赛演示数据库 `prisma/dev.db`，其中保存演示数据和 `MediaAsset` 图片二进制；所有本机 `.env` 文件和 API key 都不进入 Git，只提交不含密钥的 `.env.example`。

## 前置条件

- Windows PowerShell 5.1 或 PowerShell 7；
- Node.js 20.9 或更新版本，建议使用 LTS；
- npm 随 Node.js 一起安装。

若系统阻止脚本执行，可仅对当前 PowerShell 进程临时放行：

      Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass

## 首次安装

克隆仓库后，在项目根目录执行：

      .\scripts\windows\setup.ps1

脚本会在 `.env` 不存在时从 `.env.example` 创建本地配置，检查 `prisma/dev.db`，使用 package-lock.json 执行 `npm ci`，然后生成 Prisma Client。它不会覆盖已有的 `.env`、`.env.local` 或数据库。

`.env.local` 是可选的。需要 DeepSeek 报告功能时，在本机创建该文件并填写自己的 API key；不要把密钥写进 `.env.example` 或提交到 Git。没有 API key 时，其他演示主流程仍可使用。

首次启动不需要执行 migrate、seed 或 reset；SQLite 数据库已随仓库提供，图片二进制也在同一个数据库中。旧工作副本如果仍然使用 `public/uploads` 或外部展示图片，可在应用停止后执行一次 `npm run media:migrate`。新的上传会直接写入数据库。

## 启动

开发模式：

      .\scripts\windows\start.ps1

自定义端口：

      .\scripts\windows\start.ps1 -Port 3100

默认只监听本机 127.0.0.1。如确实需要同一局域网内的平板或另一台电脑访问，可以明确指定：

      .\scripts\windows\start.ps1 -HostName 0.0.0.0 -Port 3000

此时还需要按 Windows 防火墙策略放行端口。打开 http://localhost:3000。

生产模式先构建，再启动：

      npm run build
      .\scripts\windows\start.ps1 -Production

## 恢复演示数据

如果本地演示数据被改乱，需要恢复仓库保存的比赛数据库，先停止应用，再执行：

      git restore prisma/dev.db

这会丢弃当前数据库中的本地修改。也可以显式重建固定 seed：

      .\scripts\windows\setup.ps1 -SeedDemo

`-SeedDemo` 会重建本地 SQLite 并恢复固定 seed，具有破坏性；不要对需要保留的数据使用。

## SQLite 备份与未来迁移

当前数据库为 SQLite，`.env` 中的 `DATABASE_URL` 使用 `file:./dev.db`，Prisma 会把它解析为项目 `prisma/dev.db`。需要手工维护前，先停止应用并备份：

      .\scripts\windows\backup-database.ps1

默认备份写入项目同级的 `Vehicle-db-backups` 目录，不进入源码包。也可以指定外部位置：

      .\scripts\windows\backup-database.ps1 -Destination D:\VehicleBackups\dev.db.backup-before-migration

未来确实需要应用新迁移时，先备份，再在同一个 PowerShell 进程中只为 Prisma 迁移临时设置 `RUST_LOG=info`：

      .\scripts\windows\backup-database.ps1
      npm run db:generate
      $previousRustLog = $env:RUST_LOG
      try {
          $env:RUST_LOG = "info"
          npx prisma migrate deploy
      } finally {
          if ($null -eq $previousRustLog) {
              Remove-Item Env:RUST_LOG -ErrorAction SilentlyContinue
          } else {
              $env:RUST_LOG = $previousRustLog
          }
      }

不要让首次 setup 依赖 `migrate deploy`；上面的流程只适用于明确的、备份后的未来升级。

## Git 包含范围

仓库跟踪 `prisma/dev.db`、schema、迁移、种子数据和项目所需静态媒体；`.env`、`.env.local`、数据库 WAL/SHM 临时文件、`node_modules`、`.next`、本机上传目录 `public/uploads` 和数据库备份均被忽略。SQLite 数据库运行时产生的 sidecar 文件不要提交。
