# UI/UX Guidelines

## 1. Product experience
Design a calm, practical farm-management interface for an individual user. Prioritize quick transaction entry and clear fertilizer due information over decorative dashboards or complex ERP patterns.

## 2. Visual direction
- Clean, modern, minimal interface.
- Light and dark themes.
- Suggested palette: forest/leaf green as primary accent, warm neutral backgrounds, clear semantic status colors.
- Use Inter as the primary UI font.
- Use consistent spacing based on a 4px/8px system.
- Moderate corner radius (8–12px).
- Avoid excessive gradients, shadows and decorative illustrations.

## 3. Responsive behaviour
### Desktop
- Sidebar navigation.
- Main content area with clear page title and primary action.
- Dashboard cards in a responsive grid.
- Data tables with filters and search.

### Tablet
- Collapsible sidebar or compact navigation.
- Maintain comfortable table controls and form fields.

### Mobile
- Compact navigation (drawer or bottom navigation).
- Forms should use a single-column layout.
- Transaction creation should be easy to reach.
- Tables may become stacked cards or horizontally scrollable with clear affordances.
- Keep dashboard reminder cards readable.

## 4. Core screens

### Dashboard
- Period selector.
- Income, expenses and net balance summary cards.
- Upcoming fertilizer applications section.
- Overdue fertilizer section.
- Recent transactions list.
- Empty states for new users.

### Transactions
- Transaction list with search, date filter, type, land, crop and category filters.
- Clear Add Transaction action.
- Import Transactions action as secondary action.
- Income and expense visually distinguishable without relying on color alone.

### Add/Edit Transaction
Required: date, type, land, category, description, amount.
Optional: crop, payment method, reference and notes.
Show land as a required field with inline validation.
Filter crop options to crops associated with the selected land where possible, but allow the user to choose from the crop catalogue if appropriate.

### Transaction Import
- File dropzone and browse action.
- Explain supported formats.
- Column mapping step.
- Editable preview table.
- Validation/error indicators.
- Land assignment required for every row.
- Possible duplicate warning.
- Explicit final confirmation.

### Fertilizer Tracker
- List and calendar/list views are optional; start with a simple list.
- Filters for land, crop, fertilizer and status.
- Prominent overdue and due-soon states.
- Add Application action.
- Mark completed action with actual date and next due date fields.

### Cultivation Areas
- Simple land cards/list.
- Add/edit land form.
- Manage associated crops.
- Do not require detailed plot/block setup.

### Reports
- Date range selection.
- Income vs expense chart.
- Monthly net balance.
- Category and land summaries.
- Crop summary only where crop data exists.

### Settings
- Theme selection.
- Manage categories, crops and fertilizers.
- Data backup and restore.
- Basic application preferences.

## 5. Interaction principles
- Use inline validation and plain language.
- Confirm destructive actions.
- Provide success/error feedback.
- Keep primary actions visually clear.
- Avoid modal overload; use drawers or dedicated forms where appropriate.
- Provide loading, empty and error states.
- Preserve filters when navigating back from a detail/edit flow where feasible.

## 6. Accessibility
- Meet WCAG AA contrast where possible.
- Do not communicate status by color alone; include labels/icons.
- Keyboard accessible controls and visible focus states.
- Proper labels for all form fields.
- Touch targets suitable for mobile use.

## 7. Theme behaviour
- Support Light, Dark and System preference if straightforward.
- Persist selected theme in local settings.
- Ensure charts, tables, dialogs and status labels work in both themes.
