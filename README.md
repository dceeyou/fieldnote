# AgriFlow — Agriculture Management System

A local-first, offline-capable Progressive Web App (PWA) for managing cultivation lands, crop associations, farm income & expenses (LKR), fertilizer schedules & reminders, financial analytics, and cloud synchronization.

---

## Technology Stack

- **Frontend**: React 18, TypeScript 5.7, Vite 6, Tailwind CSS 3, React Router 6
- **Local Persistence**: IndexedDB via Dexie.js (v2 schema with `syncDeletions` tombstones)
- **Cloud Auth & Sync**: Supabase Auth + PostgreSQL with strict Row Level Security (RLS)
- **Analytics & Charts**: Recharts (code-split & lazy-loaded per chart)
- **Exports & Imports**: ExcelJS (dynamically imported `.xlsx` workbooks), PapaParse (CSV)
- **Validation**: Zod v4
- **Timezone & Units**: `Asia/Colombo` (`YYYY-MM-DD` calendar arithmetic), Sri Lankan Rupee (`LKR`), Acres & Perches (`1 acre = 160 perches`)
- **Testing & CI**: Node native test runner (`npm test`), Playwright Chromium E2E (`npm run test:e2e`), GitHub Actions (`.github/workflows/ci.yml`)

---

## Requirements

- **Node.js 22+** (required for `--experimental-strip-types` unit/integration tests)
- **npm 10+**

---

## Quick Start

### 1. Configure Environment Variables

Copy `.env.example` to `.env.local` and fill in your Supabase project URL and anon/publishable key:

```sh
cp .env.example .env.local
```

Required variables:
- `VITE_SUPABASE_URL` — Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — Your Supabase public anon/publishable key

Never commit `.env`, `.env.local`, or any service role keys.

### 2. Install & Run Locally

```sh
# Install dependencies
npm install

# Start local development server (http://localhost:5173)
npm run dev

# Build for production (runs TypeScript check + Vite build + SW precache injection)
npm run build

# Preview production build locally (http://127.0.0.1:4173)
npm run preview
```

---

## Automated Testing & Quality Gates

```sh
# Strict TypeScript compilation check
npx tsc -b

# ESLint code quality check
npm run lint

# Unit & integration test suite (calculations, sync, reminders, pagination, ExcelJS, PWA)
npm test

# Browser-based E2E & offline PWA tests (Chromium via Playwright)
# First time only: npx playwright install chromium
npm run build && npm run test:e2e
```

### Continuous Integration

Every push and pull request to `main` triggers `.github/workflows/ci.yml`, which enforces:
1. `npx tsc -b` (TypeScript strict build)
2. `npm run lint` (ESLint)
3. `npm test` (unit + integration + sync regression tests)
4. `npm run build` + Service Worker precache verification
5. `npm run test:e2e` (Playwright Chromium responsive, routing, and offline PWA tests)

---

## Core Modules

1. **Farm Overview Dashboard (`/`)**: Live financial KPIs, interactive Recharts analytics (lazy-loaded), Open-Meteo agricultural weather, overdue/upcoming fertilizer reminders, and recent transactions.
2. **Transactions Ledger (`/transactions`)**: Income & expense tracking in LKR with mandatory cultivation land assignment, indexed Dexie filtering, pagination (`25 / 50 / 100` rows), bulk delete confirmation, CSV import with duplicate flagging, and `.xlsx` export.
3. **Fertilizer Tracker (`/fertilizer`)**: Product catalog and application scheduling with automatic reminder interval calculations (`7 days` to `1 year` or custom), overdue/due-soon evaluation, and quick completion.
4. **Cultivation Areas (`/cultivation`)**: Land/plot registry with Acres/Perches normalization, crop associations, and soft deactivation preserving historical records.
5. **Reports (`/reports`)**: Yearly and all-time operational financial breakdowns by month, category, land, and crop with print and ExcelJS export support.
6. **Settings (`/settings`)**: Light/Dark/System theme preferences, category management (including CSV bulk import & duplicate audit), cloud sync controls, and versioned JSON backup/restore (compatible with both `AgriFlow` and legacy `Fieldnote` backups).

---

## Deployment (Vercel + Supabase)

1. **Database**: Apply `supabase/schema.sql` and hardening migrations in `supabase/migrations/` to your Supabase project. Ensure RLS is enabled on all 7 public tables (`lands`, `crops`, `land_crops`, `categories`, `fertilizers`, `transactions`, `fertilizer_applications`) with authenticated single-admin policies.
2. **Admin Account**: Provision the administrator account using `npm run auth:setup-admin` (or via the Supabase Auth dashboard) and disable public signups.
3. **Hosting**: Connect the repository to Vercel. `vercel.json` configures SPA rewrites, security headers (CSP, HSTS, `X-Frame-Options`, `X-Content-Type-Options`), and proper `Cache-Control` rules for `sw.js` and `manifest.json`.
4. **Environment Variables**: Configure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Vercel Project Settings for Production and Preview environments.
