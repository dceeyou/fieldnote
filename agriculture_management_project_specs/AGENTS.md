# Codex Project Instructions

## Product context
Build a lightweight, local-first Agriculture Management System. The MVP is for an individual managing small cultivation areas across multiple lands. Focus on income/expense tracking, fertilizer applications and dashboard reminders. Do not turn this into a complex agriculture ERP.

Read these project documents before implementing:
- `PRD.md`
- `TECHNICAL_SPEC.md`
- `DATABASE_SCHEMA.md`
- `UI_UX_GUIDELINES.md`

## Confirmed product decisions
- Application name: undecided; use a neutral temporary project label and make the name easy to change.
- Language: English.
- Theme: light and dark.
- Devices: desktop, tablet and mobile.
- Database: local-first using Dexie.js and IndexedDB.
- Backup: manual backup/restore in MVP; automatic cloud backup is a future Supabase feature.
- Fertilizer reminders: in-app dashboard reminders only, evaluated when the application is opened.
- No browser push notifications, email, SMS or background notification service.
- Currency: LKR.
- Timezone: Asia/Colombo.
- Every transaction must have a land/area.
- Crop selection on transactions is optional.
- Manual transaction entry is the primary workflow.
- Optional transaction import: Excel, CSV and text-based PDF with review before saving.

## Engineering rules
1. Use React, TypeScript and Vite.
2. Use Tailwind CSS and shadcn/ui-style reusable components.
3. Use Dexie.js for local persistence.
4. Keep UI, domain logic and data access separate.
5. Use TypeScript strict mode.
6. Validate forms and imported rows with Zod.
7. Use stable UUID identifiers.
8. Store calendar dates as `YYYY-MM-DD` date-only strings.
9. Do not hardcode crop names, categories, dashboard values or fixed record limits.
10. Derive dashboard totals and fertilizer due statuses from database records.
11. Keep calculations in tested utility/service functions.
12. Never silently import uncertain transaction values.
13. Require land assignment for every imported transaction before confirmation.
14. Detect possible duplicates and let the user review them.
15. Do not send user financial data to an external AI service for routine file parsing.
16. Avoid unnecessary dependencies and premature abstractions.
17. Do not add features outside the MVP without asking first.

## Reminder rules
- Calculate reminders when Dashboard/Fertilizer Tracker loads.
- `overdue`: due date before today's date in Asia/Colombo.
- `due_today`: due date equals today.
- `due_soon`: due within the next 7 calendar days.
- `upcoming`: due later than 7 days.
- Exclude completed and cancelled applications.
- Do not request notification permissions or implement push/browser notifications.

## Data safety
- Provide JSON export and validated restore.
- Before destructive restore, explain the effect and request confirmation.
- Deactivate referenced lands/crops/categories rather than hard deleting them.
- Never silently overwrite user data.
- Keep a clear import batch record.

## Workflow
- Implement in small phases.
- Before coding a phase, summarize the planned files and changes.
- Run lint, type-check and tests after meaningful changes.
- Fix errors rather than suppressing TypeScript or lint checks.
- Add tests for calculations, date handling, import validation and mandatory land selection.
- Keep README setup instructions current.
- Do not claim a feature is complete unless it is implemented and verified.
