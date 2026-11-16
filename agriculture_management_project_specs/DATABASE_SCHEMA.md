# Database Schema

The MVP uses Dexie.js over IndexedDB. Use UUID strings for primary keys and ISO date-only strings (`YYYY-MM-DD`) for calendar dates.

## 1. Tables

### lands
- `id` (string, primary key)
- `name` (string, required)
- `location` (string, optional)
- `areaValue` (number, optional)
- `areaUnit` (`acre` | `perch`, optional)
- `areaInAcres` (number, optional; normalized derived value)
- `notes` (string, optional)
- `isActive` (boolean)
- `createdAt`, `updatedAt` (ISO timestamps)

### crops
- `id`
- `name` (string, required, unique among active crops)
- `description` (string, optional)
- `isActive` (boolean)
- `createdAt`, `updatedAt`

### landCrops
Join table allowing multiple crops on one land and one crop across multiple lands.
- `id`
- `landId` (required, FK lands)
- `cropId` (required, FK crops)
- `notes` (optional)
- `isActive`
- `createdAt`, `updatedAt`
- Unique compound index on `landId + cropId` where practical.

### categories
- `id`
- `name` (required)
- `type` (`income` | `expense`)
- `description` (optional)
- `isActive`
- `sortOrder`
- `createdAt`, `updatedAt`

### transactions
- `id`
- `date` (date-only string, required)
- `type` (`income` | `expense`, required)
- `landId` (required, FK lands)
- `cropId` (optional, FK crops)
- `categoryId` (required, FK categories)
- `description` (required)
- `amount` (number, positive, required; currency LKR)
- `paymentMethod` (optional)
- `referenceNumber` (optional)
- `notes` (optional)
- `source` (`manual` | `import`)
- `importBatchId` (optional)
- `createdAt`, `updatedAt`

### fertilizers
- `id`
- `name` (required)
- `type` (optional)
- `defaultUnit` (optional)
- `notes` (optional)
- `isActive`
- `createdAt`, `updatedAt`

### fertilizerApplications
- `id`
- `landId` (required, FK lands)
- `cropId` (required, FK crops)
- `fertilizerId` (required, FK fertilizers)
- `applicationDate` (date-only, required)
- `quantity` (number, optional)
- `unit` (optional)
- `cost` (number, optional)
- `nextDueDate` (date-only, optional)
- `status` (`scheduled` | `completed` | `cancelled`)
- `actualCompletedDate` (date-only, optional)
- `notes` (optional)
- `createdAt`, `updatedAt`

For a simple MVP, a schedule can be represented by an application record with a `nextDueDate`. If the user needs multiple future schedules per application, introduce a separate fertilizerSchedules table later.

### importBatches
- `id`
- `fileName`
- `fileType`
- `importedAt`
- `totalRows`
- `importedRows`
- `skippedRows`
- `status`
- `notes` (optional)

### settings
- `key` (primary key)
- `value` (JSON-compatible value)

## 2. Relationships
- One land has many transactions.
- One crop can be referenced by many transactions.
- One land can have many crop associations through `landCrops`.
- One category has many transactions.
- One land and crop can have many fertilizer application records.
- One fertilizer product can be used in many applications.
- One import batch can create many transactions.

## 3. Business rules
- `transactions.landId` is mandatory.
- `transactions.cropId` is optional.
- Transaction amount must be greater than zero.
- Transaction type must be income or expense.
- Category type should match transaction type.
- Fertilizer application must reference an existing land, crop and fertilizer.
- Due status is derived at runtime; do not persist a potentially stale status.
- Inactive lands/crops/categories should remain available for historical records but not appear as default choices for new records.
- Do not hard-delete referenced lands, crops or categories; deactivate them instead.

## 4. Calculations
- Total income = sum of amounts where type = income.
- Total expenses = sum of amounts where type = expense.
- Net balance = total income - total expenses.
- Area in acres: acres value as entered; perches value / 160.
- Fertilizer status:
  - overdue: nextDueDate < today
  - due today: nextDueDate = today
  - due soon: today < nextDueDate <= today + 7 days
  - upcoming: nextDueDate > today + 7 days
- Exclude completed/cancelled applications from active reminder lists.

## 5. Dexie indexes (suggested)
- `lands`: `id, name, isActive`
- `crops`: `id, name, isActive`
- `landCrops`: `id, landId, cropId, [landId+cropId]`
- `categories`: `id, type, isActive, sortOrder`
- `transactions`: `id, date, type, landId, cropId, categoryId, importBatchId, [landId+date], [type+date]`
- `fertilizers`: `id, name, isActive`
- `fertilizerApplications`: `id, landId, cropId, fertilizerId, applicationDate, nextDueDate, status`
- `importBatches`: `id, importedAt, status`
- `settings`: `key`

## 6. Future schema considerations
- Add a separate `fertilizerSchedules` table only if recurring/multiple schedule management becomes necessary.
- Add `payments` only if partial payments/outstanding balances become a real requirement.
- Add suppliers/buyers, harvests, labour and inventory only when the workflow requires them.
