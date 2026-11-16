# Technical Specification

## 1. Recommended stack

### Frontend
- React
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui components
- React Router
- React Hook Form
- Zod validation
- Zustand only if shared client state becomes necessary

### Local data
- IndexedDB through Dexie.js
- Dexie migrations for schema changes
- Repository/data-access layer so UI components do not directly depend on database implementation

### Charts and imports
- Recharts for dashboard/report charts
- SheetJS (`xlsx`) for Excel import
- Papa Parse for CSV import
- PDF.js for text-based PDF extraction
- OCR for scanned PDFs is out of MVP scope

### Quality
- Vitest for unit tests
- React Testing Library for component tests
- Playwright for essential end-to-end flows
- ESLint and Prettier
- Git for version control

## 2. Architecture
Use a modular, local-first single-page application.

UI -> feature components/pages -> application services/use cases -> repositories -> Dexie/IndexedDB.

Keep business logic (totals, validation, reminder status, import normalization) outside presentation components.

Suggested feature modules:
- dashboard
- transactions
- transaction-import
- fertilizer
- cultivation
- reports
- settings
- backup

## 3. Local-first and offline behaviour
- IndexedDB is the source of truth for MVP data.
- Do not require a network request to create, edit or view records.
- Cache application shell/assets using a PWA service worker.
- Do not cache sensitive user data in a service worker cache.
- Display a simple local-data indicator in Settings.
- Provide explicit export/restore tools.

## 4. Reminder implementation
No notification API or background scheduler is required.

When dashboard or fertilizer tracker loads:
1. Read scheduled fertilizer records from IndexedDB.
2. Compare `nextDueDate` with today's date in `Asia/Colombo`.
3. Derive `overdue`, `due_today`, `due_soon` or `upcoming`.
4. Display the relevant records in the UI.

Use date-only values (`YYYY-MM-DD`) for due dates to avoid timezone drift. Treat them as calendar dates in Asia/Colombo. “Due soon” can mean due within the next 7 calendar days, configurable later.

## 5. Transaction import pipeline
1. File selection and file-type validation.
2. Parse file in browser.
3. Normalize source rows into a staging representation.
4. Offer column mapping if needed.
5. Normalize dates, amount, type, description, reference and payment method.
6. Require user to assign a valid land to each row.
7. Validate staged rows with Zod.
8. Run duplicate-candidate checks.
9. Present editable review table.
10. Save only confirmed valid rows in a Dexie transaction.
11. Store import batch metadata and row-level errors.

Never trust extracted PDF text as definitive. Do not silently infer income/expense type or land. Mark uncertain fields for user review.

## 6. Backup design
- JSON backup includes schema version, export timestamp, and all application tables.
- Restore validates file format and schema version.
- Before restore, offer to create/download a safety backup.
- Initial implementation may replace local data after explicit confirmation.
- Automatic cloud backup is future scope and must not be simulated as if available.

## 7. Future cloud architecture
When needed, introduce Supabase PostgreSQL and authentication.
- Keep repository interfaces stable to minimize migration effort.
- Add stable UUID identifiers to all records.
- Add `updatedAt` and `deletedAt`/archive semantics where appropriate.
- Define conflict handling before enabling multi-device sync.
- Cloud backup/sync must be opt-in and must not compromise local offline operation.

## 8. Security and privacy
- Do not send financial records to third-party AI services for routine import.
- Validate uploaded file size and type.
- Parse files locally in browser where supported.
- Avoid rendering raw uploaded HTML or formulas.
- Treat spreadsheet cell content as untrusted input.
- Do not execute spreadsheet formulas.
- Do not include secrets or Supabase keys with elevated privileges in client code.

## 9. Performance
- Use pagination or virtualized lists if transaction history grows.
- Add indexes for date, type, landId, cropId, categoryId and fertilizer due date.
- Avoid loading all records into charts when date filters can narrow queries.
