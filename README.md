# Fieldnote — Agriculture Management

A lightweight, local-first agriculture management web application designed for individual farm owner/operators managing small and expanding cultivation areas across multiple lands.

## Requirements

- Node.js 20 or newer
- npm

## Start locally

```sh
# Install dependencies
npm install

# Start development server
npm run dev

# Run unit tests
npm test

# Run ESLint
npm run lint

# Build for production
npm run build
```

## Technology Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, React Router
- **Persistence**: Local-first IndexedDB through Dexie.js (no cloud network requirement for normal operation)
- **Validation**: Zod schema validation
- **Timezone**: Asia/Colombo (date-only calendar handling `YYYY-MM-DD` to prevent timezone drift)
- **Currency**: Sri Lankan Rupee (LKR)
- **Area Units**: Acres and Perches (1 acre = 160 perches)
- **Testing**: Built-in test runner (`npm test`) with 24 unit tests covering calculations, reminders, date math, validation, backup, and imports

## Features & Modules

### 1. Dashboard
- Live financial performance summary (Total Income, Total Expenses, Net Balance) derived from records for the selected month.
- Runtime evaluated fertilizer reminder alerts (`overdue`, `due_today`, `due_soon` within 7 days) in Asia/Colombo timezone.
- Quick action shortcuts and recent recorded transactions.

### 2. Financial Transactions
- Log income and expenses in LKR with date, description, amount, payment method, and reference #.
- **Mandatory Land Rule**: Every financial record must be assigned to a cultivation area.
- Crop association is optional.
- Multi-criteria filtering by period (This Month, All Time, Custom Range), type, land, crop, and category.
- Summary metrics bar updating in real time with filtered totals.

### 3. Cultivation Areas
- Manage lands and farm plots with location, area size (acres or perches with normalized acres calculation), notes, and associated crops.
- Soft deactivation preserves historical transaction records without orphaned references.

### 4. Fertilizer Tracker
- Schedule fertilizer applications with target land, crop, fertilizer product, quantity, and next due date.
- Visual status badges for overdue, due today, due soon, upcoming, and completed applications.
- Mark completed workflow with actual completion date and option to auto-schedule the next round.

### 5. Reports & Analytics
- Monthly income vs expense summary and net balance trends.
- Category spending and revenue breakdown with distribution bars.
- Land-wise and crop-wise profitability summaries.
- Print-friendly layout (`window.print()`).
- Clearly labeled operational reporting basis (does not imply formal statutory accounting).

### 6. Settings & Master Data
- Light, Dark, and System theme preferences persisted in local storage.
- Manage transaction categories (income vs expense).
- Manage crops and fertilizers catalogs.

### 7. Data Safety & CSV Import
- **JSON Backup**: One-click full workspace export to a portable, versioned JSON snapshot.
- **Validated Restore**: Schema version check and preview of tables before overwriting, with a prompt to take a safety backup.
- **CSV Transaction Import**: Browser-side parsing, column auto-detection, duplicate candidate flagging, and mandatory land assignment per row.
