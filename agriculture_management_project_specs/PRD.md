# Agriculture Management System — Product Requirements Document

## 1. Product overview
A lightweight, local-first agriculture management web application for managing small-scale and expanding cultivation activities across multiple lands. The MVP focuses on financial records, fertilizer application tracking and simple dashboard reminders. The system must remain easy to use; it is not an agriculture ERP.

**Application name:** To be decided  
**Initial language:** English  
**Currency:** Sri Lankan Rupees (LKR)  
**Timezone:** Asia/Colombo  
**Primary user:** Individual owner/operator  
**Devices:** Desktop, tablet and mobile  
**Themes:** Light and dark

## 2. Product goals
- Record farm-related income and expenses consistently.
- Require every financial transaction to be assigned to a land/cultivation area.
- Track fertilizer applications and their next due dates.
- Show upcoming and overdue fertilizer reminders when the user opens the application.
- Support small areas on family-owned land as well as multiple lands and future expansion.
- Allow optional import of transactions from Excel, CSV and PDF files.
- Keep the application functional offline after it has been loaded and installed/cached.

## 3. Out of scope for the MVP
- Multi-user accounts, staff permissions and approval workflows.
- Complex farm/plantation ERP functionality.
- Email, SMS, browser push or background notifications.
- Automated agronomic recommendations or fertilizer dosage advice.
- Automatic bank integrations.
- Cloud synchronization as a prerequisite for normal use.
- Advanced inventory, payroll or accounting ledger functionality.

## 4. MVP modules

### 4.1 Dashboard
Display:
- Total income for selected period.
- Total expenses for selected period.
- Net balance (income minus expenses).
- Upcoming fertilizer applications.
- Overdue fertilizer applications.
- Recent transactions.

Provide a clear date filter, with a sensible default of the current month. Dashboard figures must be calculated from transaction records, not hardcoded.

### 4.2 Transactions
Support income and expense records.

Fields:
- Transaction date (required).
- Type: income or expense (required).
- Land/area (required).
- Crop (optional).
- Category (required; categories are managed in settings).
- Description (required).
- Amount in LKR (required, positive number).
- Payment method (optional; e.g. cash, bank transfer, other).
- Reference/invoice number (optional).
- Notes (optional).
- Source: manual or imported (system-managed).
- Created/updated timestamps.

Functions:
- Create, view, edit and delete transactions.
- Search and filter by date range, type, land, crop and category.
- Sort transaction history by date and amount.
- Show income, expense and net totals for filtered records.
- Confirm before deleting a record.
- Preserve source/import metadata for imported rows.

**Business rule:** A transaction cannot be saved without a land/area. Crop selection is optional because one land may contain multiple crops or an expense may relate to the land generally.

### 4.3 Transaction import (optional workflow)
Supported formats:
- Excel: `.xlsx`, `.xls`
- CSV: `.csv`
- PDF: `.pdf`

Workflow:
1. User chooses a file.
2. Application extracts candidate transaction rows.
3. User maps source columns to application fields when automatic mapping is uncertain.
4. Show editable preview and validation errors.
5. User assigns a land to every row that does not already have a valid land mapping.
6. User confirms import.
7. Valid rows are saved as transactions; invalid rows remain excluded with clear reasons.

Requirements:
- Manual entry remains the primary workflow.
- Never silently import uncertain values.
- Detect likely duplicates using date, amount, type, description and optional reference.
- Allow user to review possible duplicates rather than automatically discarding them.
- Keep an import batch/history record.
- Text-based PDF extraction may be supported. Scanned PDFs/OCR can be a later enhancement.
- PDF extraction must be treated as potentially less reliable than structured Excel/CSV data.

### 4.4 Fertilizer tracker
Maintain a simple fertilizer catalogue and application history.

Fertilizer product fields:
- Name (required).
- Type (optional).
- Unit (optional).
- Notes (optional).
- Active/inactive status.

Application fields:
- Land/area (required).
- Crop (required).
- Fertilizer (required).
- Application date (required).
- Quantity (optional).
- Unit (optional).
- Cost (optional).
- Next application date (required if a reminder is wanted).
- Notes (optional).
- Status: scheduled, completed or cancelled.

Reminder behaviour:
- No browser notifications, push notifications, email, SMS or background service.
- On application open/login, calculate due status from the current local date in Asia/Colombo.
- Show upcoming and overdue items on the dashboard and fertilizer tracker.
- Suggested status rules: overdue if due date is before today; due today if due date is today; upcoming if due date is in the future. Optionally label items due within the next 7 days as “Due soon”.
- Keep overdue items visible until updated, completed or cancelled.
- When an application is completed, record the actual application date and allow the user to set the next due date or create the next schedule.
- Do not automatically prescribe intervals or fertilizer quantities.

### 4.5 Cultivation areas
Keep this module intentionally basic.

Land/area fields:
- Name (required).
- Location/description (optional).
- Area value (optional).
- Area unit: acres or perches (optional).
- Notes (optional).
- Active/inactive status.

Crop catalogue:
- Crop name.
- Optional description.
- Active/inactive status.

Initial crop examples:
- Ginger
- Coconut
- Tea
- Black Pepper

The crop list must be configurable; do not hardcode the application to only these crops.

A land can be associated with multiple crops. A crop can be cultivated across multiple lands. Avoid requiring complex plot/block management in the MVP.

Area conversion:
- 1 acre = 160 perches.
- Preserve entered value and unit; calculate normalized acres for comparisons/reporting where needed.

### 4.6 Reports
MVP reports:
- Monthly income and expenses.
- Net balance by month.
- Income and expenses by category.
- Income and expenses by land.
- Optional crop-wise summaries where a crop has been assigned.

Clearly label the reporting basis as recorded transaction totals; do not imply formal accounting or tax reporting.

### 4.7 Backup and restore
- Manual export of all application data to a versioned JSON backup.
- Manual restore from a valid backup file.
- Validate backup structure and version before restore.
- Explain whether restore will replace or merge existing data; default to a safe confirmation and backup-before-restore flow.
- Future automatic cloud backup through Supabase is planned, but is not required for MVP.
- Local-first data must remain usable without an internet connection.

## 5. Navigation
Recommended primary navigation:
- Dashboard
- Transactions
  - Transaction history
  - Add transaction
  - Import transactions
- Fertilizer tracker
- Cultivation areas
- Reports
- Settings

## 6. UX principles
- Optimize for fast, low-friction data entry.
- Keep forms short and use optional fields where possible.
- Make required land selection obvious.
- Use clear empty states and helpful validation messages.
- Ensure mobile layouts work for quick field-side use.
- Support light and dark themes.
- Use accessible contrast, keyboard navigation and clear focus states.

## 7. Acceptance criteria
- User can create, edit, filter and delete income/expense transactions.
- Saving a transaction without a land is blocked.
- Crop association is optional.
- Dashboard totals reflect saved transactions and selected date range.
- User can create fertilizer applications and set next due dates.
- On opening the app, upcoming and overdue fertilizer records are visible.
- No external notification permission is requested.
- User can manage multiple lands and crops.
- Acres and perches are supported.
- User can preview and confirm transaction imports before saving.
- Duplicate candidates and invalid rows are clearly identified.
- User can export and restore a JSON backup.
- App remains usable offline after initial app assets are available.

## 8. Future enhancements
- Supabase authentication and cloud backup/sync.
- Multi-user roles.
- OCR for scanned PDFs.
- More detailed crop cycles, harvests and sales.
- Inventory and supplier management.
- More advanced analytics.
