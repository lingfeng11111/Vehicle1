# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [0.1.0] - 2026-09-04

### Added

- Built the first runnable milestone of 「九宫立序，车诚万家」 with a responsive Next.js application shell.
- Added Prisma + SQLite models for customers, demands, vehicles, inspections, inspection facts, SalesCases, reports, events, market snapshots, risk tags, and media sources.
- Added seeded demo data for two customers, three vehicles, a complete V001 inspection, and two reports for the same vehicle with different focus tags.
- Added configurable report-priority rules, feature flags, inspection zones, and mock/manual market-provider contracts.
- Added dashboard, customer leads, vehicle archives, inspection workbench, SalesCases, consumer reports, marketing analytics, and settings routes.

### Changed

- Established the fixed-facts / dynamic-explanation report boundary and immutable generated snapshots.
- Established the feature ledger and release documentation workflow for every future business change.

### Fixed

- Replaced the blank scaffold with a persistent business demo that can run without external APIs.
- Fixed Base UI link-button semantics on the dashboard so the browser console stays warning-free.
- Fixed the inspection workbench's initial selection so the default region and current fact stay aligned.
- Fixed print pagination for the facts and maintenance panels and made the printed footer report browser-managed pagination.

## [Unreleased]

### Added

- Added sparse appraisal completion semantics: the full 179/710 standard or 193/751 new-energy template remains visible, while only abnormal or meaningful special-normal overrides persist; explicit completion promotes the remaining catalog items to implicit normal for evaluation and reporting.
- Added full-catalog standard report materialization with abnormal-first ordering, template-order normal facts, and business-language explanations for implicit normal items.
- Added API and UI completion confirmation, meaningful NORMAL note/evidence persistence, plain-NORMAL override cleanup, completed-state no-op handling, and targeted regression coverage.
- Added the normalized Prisma/SQLite appraisal foundation: complete workbook-backed template catalog, criterion findings, evidence, damage groups, axis-separated evaluations, rule outcomes, and strict standard/personalized report snapshots.
- Added exact catalog provenance validation and database-foundation validation scripts, including the SQLite nullable composite-unique compatibility check.
- Added `scripts/validate-db-upgrade.ts` and the additive `20260906124000_legacy_status_compatibility` migration for safe upgrades of unbound legacy inspection items.
- Added the complete appraisal workbench and structured report consumer UI with canonical standard facts plus an optional personalized interpretation panel.
- Added database foundation documentation covering the 193 source rows / 751 criteria import, 372 dual-template items / 1461 criteria, and fire-rule scope boundary.
- Added a customer-detail intent-vehicle picker that shows vehicle facts and latest inspection status/completion, creates a SalesCase from the current demand, prevents same-demand duplicates, and routes to the new case detail.
- Added explicit vehicle-status / inspection-status labels across vehicle cards, inspection rows, and the intent-vehicle picker so a vehicle-level reinspection hold is not confused with a completed inspection.
- Added the protected npm run demo:reset command to restore only prisma/dev.db through the existing migrations and seed, with fixed business signature and count checks.

### Changed

- New report generation now requires a template version and completed evaluation, creates/reuses a strict standard snapshot, and keeps the existing `Report.generatedSnapshot` API bridge for current screens.
- Legacy inspection rows receive a derived `resultStatus`; the compatibility migration preserves `未检` as `UNCHECKED` instead of treating it as `NORMAL`; legacy report lineage pointers remain nullable, while all newly generated reports populate standard lineage.
- Seed data now demonstrates sparse abnormal/special-normal execution rows, complete-catalog standard snapshots, criterion-level findings, reviewer-confirmed accident groups, evidence, three evaluations, and two personalized children; no active FIRE tag is seeded.
- The inspection detail keeps the region → position/item → current editor workflow, with status/notes persistence and the existing rule evaluation entrypoint available without the former undefined-state crash.
- SalesCase creation now validates demand ownership and returns a descriptive 409 with the existing case id when the same customer demand and vehicle are submitted again.
- Marketing analytics now exposes a live current-sales-case result summary sourced from `/api/sales-cases`, separate from the existing Mock/manual media-source aggregation.
- Upgraded the local `prisma/dev.db` through all three migrations after validating fresh and legacy disposable copies; disposable recovery copies stay outside the repository.
- Polished the competition presentation: removed the shell's static date and fake notification count, replaced the customer phone placeholder, softened visible mock-provider wording, and reordered the report so decision-facing sections lead while technical facts stay in a collapsed, print-expanded trace section.
- Removed unused Create Next App public SVGs, the empty local database-backup placeholder, and ignored local build/Playwright outputs after confirming there were no references to the removed assets.
- Consolidated project documentation into background, current state, TODO, architecture, database, and demo entry points; removed superseded requirement/roadmap/ledger/baseline documents and unreferenced legacy design concepts.

### Fixed

- Preserved the workbook's ④ boundary rule while excluding only ③ fire-damage rule row from active evaluation.
- Fixed the inspection detail page's missing alert imports, derived counters, and stale position-selection references that blocked compilation and page entry.

### Validation

- Passed fresh/legacy/real database validation, catalog exact-count validation, report and inspection API smoke checks, Prisma validation, typecheck, the full test suite, lint, and production build.
- Passed Playwright browser interaction smoke for new customer → demand → intent vehicle → SalesCase → personalized report → report detail → converted result → marketing analytics reflow on desktop, plus the inspection region/position/status/note/refresh/evaluation loop and a 1024px tablet DOM check; the verification SQLite database was restored exactly afterward.
- Passed local Playwright fallback QA (Browser plugin unavailable) for customer detail/picker, inspection detail, SalesCase detail, report detail, and analytics at 1440/1024/820; captured visual evidence, confirmed zero console errors, and verified the closed technical `<details>` becomes visible under Chromium print emulation while preserving lineage/evidence text. The generated print PDF and `/tmp` screenshots are disposable local evidence, not release artifacts.
- Production deployment and production migration/recovery rehearsal remain outstanding.
