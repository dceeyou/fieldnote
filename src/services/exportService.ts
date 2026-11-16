import * as XLSX from 'xlsx'
import { supabase, isSupabaseConfigured, checkSupabaseConnection } from '../lib/supabase.ts'
import { db } from '../data/db/database.ts'
import type { Transaction, FertilizerApplication } from '../data/db/schema.ts'
import {
  getTodayColombo,
  getCurrentMonthColombo,
  getReminderIntervalLabel,
  formatDateDDMMYYYY,
} from '../utils/date.ts'
import { getFertilizerDueStatus } from '../utils/reminders.ts'

export type ExportDataType = 'all' | 'transactions' | 'fertilizer'

export type ExportDatePreset =
  | 'all_records'
  | 'this_month'
  | 'last_3_months'
  | 'last_6_months'
  | 'this_year'
  | 'last_year'
  | 'custom'

export interface ExportOptions {
  dataType: ExportDataType
  datePreset: ExportDatePreset
  startDate?: string
  endDate?: string
}

export interface ExportCounts {
  transactionCount: number
  fertilizerCount: number
  totalCount: number
  totalIncome: number
  totalExpenses: number
  netBalance: number
}

export interface ExportMetadata {
  landMap: Map<string, string>
  cropMap: Map<string, string>
  categoryMap: Map<string, string>
  fertilizerMap: Map<string, string>
}

export interface ExportPayload {
  transactions: Transaction[]
  fertilizerApplications: FertilizerApplication[]
  metadata: ExportMetadata
  options: ExportOptions
  generatedAt: string
  dateRangeLabel: string
  dateRangeSpan: string
}

// Convert snake_case object from Supabase to camelCase
function toCamelCase(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, val] of Object.entries(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
    if (val !== null) {
      result[camelKey] = val
    }
  }
  return result
}

/**
 * Computes calendar date boundaries for export presets in Asia/Colombo.
 */
export function computeExportDateBounds(
  preset: ExportDatePreset,
  customStart?: string,
  customEnd?: string
): { startDate: string; endDate: string; label: string; span: string } {
  const today = getTodayColombo()
  const [yearStr, monthStr, dayStr] = today.split('-')
  const year = Number(yearStr)
  const month = Number(monthStr)

  switch (preset) {
    case 'all_records':
      return {
        startDate: '',
        endDate: '',
        label: 'All Records',
        span: 'All available records in database',
      }
    case 'this_month': {
      const start = `${getCurrentMonthColombo()}-01`
      return {
        startDate: start,
        endDate: today,
        label: 'This Month',
        span: `${formatDateDDMMYYYY(start)} – ${formatDateDDMMYYYY(today)}`,
      }
    }
    case 'last_3_months': {
      const d = new Date(Date.UTC(year, month - 1 - 3, Number(dayStr)))
      const start = d.toISOString().slice(0, 10)
      return {
        startDate: start,
        endDate: today,
        label: 'Last 3 Months',
        span: `${formatDateDDMMYYYY(start)} – ${formatDateDDMMYYYY(today)}`,
      }
    }
    case 'last_6_months': {
      const d = new Date(Date.UTC(year, month - 1 - 6, Number(dayStr)))
      const start = d.toISOString().slice(0, 10)
      return {
        startDate: start,
        endDate: today,
        label: 'Last 6 Months',
        span: `${formatDateDDMMYYYY(start)} – ${formatDateDDMMYYYY(today)}`,
      }
    }
    case 'this_year': {
      const start = `${year}-01-01`
      return {
        startDate: start,
        endDate: today,
        label: 'This Year',
        span: `${formatDateDDMMYYYY(start)} – ${formatDateDDMMYYYY(today)}`,
      }
    }
    case 'last_year': {
      const start = `${year - 1}-01-01`
      const end = `${year - 1}-12-31`
      return {
        startDate: start,
        endDate: end,
        label: 'Last Year',
        span: `${formatDateDDMMYYYY(start)} – ${formatDateDDMMYYYY(end)}`,
      }
    }
    case 'custom':
    default: {
      const start = customStart || ''
      const end = customEnd || ''
      const span = start && end
        ? `${formatDateDDMMYYYY(start)} – ${formatDateDDMMYYYY(end)}`
        : start
        ? `From ${formatDateDDMMYYYY(start)}`
        : end
        ? `Up to ${formatDateDDMMYYYY(end)}`
        : 'All available records'
      return {
        startDate: start,
        endDate: end,
        label: 'Custom Date Range',
        span,
      }
    }
  }
}

/**
 * Returns formatted filename using Asia/Colombo date.
 * Suggested: AgriFlow_Complete_Data_Export_YYYY-MM-DD.xlsx
 */
export function getExportFilename(dateStr?: string): string {
  const d = dateStr || getTodayColombo()
  return `AgriFlow_Complete_Data_Export_${d}.xlsx`
}

/**
 * Returns formatted timestamp in Asia/Colombo.
 */
export function getColomboFormattedTimestamp(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Colombo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date)
}

/**
 * Resolves metadata maps (lands, crops, categories, fertilizers).
 */
export async function fetchExportMetadata(): Promise<ExportMetadata> {
  // Query metadata from local database and Supabase if connected
  const [localLands, localCrops, localCats, localFerts] = await Promise.all([
    db.lands.toArray(),
    db.crops.toArray(),
    db.categories.toArray(),
    db.fertilizers.toArray(),
  ])

  const landMap = new Map<string, string>(localLands.map((l) => [l.id, l.name]))
  const cropMap = new Map<string, string>(localCrops.map((c) => [c.id, c.name]))
  const categoryMap = new Map<string, string>(localCats.map((c) => [c.id, c.name]))
  const fertilizerMap = new Map<string, string>(localFerts.map((f) => [f.id, f.name]))

  // If Supabase is configured, supplement any additional cloud records
  if (isSupabaseConfigured && supabase) {
    try {
      const [sbLands, sbCrops, sbCats, sbFerts] = await Promise.all([
        supabase.from('lands').select('id, name'),
        supabase.from('crops').select('id, name'),
        supabase.from('categories').select('id, name'),
        supabase.from('fertilizers').select('id, name'),
      ])

      if (sbLands.data) sbLands.data.forEach((l) => landMap.set(l.id, l.name))
      if (sbCrops.data) sbCrops.data.forEach((c) => cropMap.set(c.id, c.name))
      if (sbCats.data) sbCats.data.forEach((c) => categoryMap.set(c.id, c.name))
      if (sbFerts.data) sbFerts.data.forEach((f) => fertilizerMap.set(f.id, f.name))
    } catch {
      // Continue with local maps
    }
  }

  return { landMap, cropMap, categoryMap, fertilizerMap }
}

/**
 * Fetches all transactions from Supabase with batching / pagination.
 * If Supabase is empty but local Dexie has records, retrieves local Dexie records.
 */
async function fetchTransactionsBatch(startDate?: string, endDate?: string): Promise<Transaction[]> {
  const batchSize = 1000
  let allRows: Record<string, unknown>[] = []

  if (isSupabaseConfigured && supabase) {
    let from = 0
    let hasMore = true

    while (hasMore) {
      let query = supabase
        .from('transactions')
        .select('*')
        .order('date', { ascending: false })
        .range(from, from + batchSize - 1)

      if (startDate) query = query.gte('date', startDate)
      if (endDate) query = query.lte('date', endDate)

      const { data, error } = await query
      if (error) {
        throw new Error(`Failed to query transaction records from Supabase: ${error.message}`)
      }

      if (data && data.length > 0) {
        allRows = allRows.concat(data)
        if (data.length < batchSize) {
          hasMore = false
        } else {
          from += batchSize
        }
      } else {
        hasMore = false
      }
    }
  }

  // If Supabase returned records, map to camelCase
  if (allRows.length > 0) {
    const map = new Map<string, Record<string, unknown>>()
    for (const row of allRows) {
      map.set(row.id as string, row)
    }
    return Array.from(map.values()).map(toCamelCase) as unknown as Transaction[]
  }

  // Fallback / local-first records from Dexie
  let localTx = await db.transactions.toArray()
  if (startDate) localTx = localTx.filter((t) => t.date >= startDate)
  if (endDate) localTx = localTx.filter((t) => t.date <= endDate)
  return localTx.sort((a, b) => b.date.localeCompare(a.date))
}

/**
 * Fetches all fertilizer applications from Supabase with batching / pagination.
 * If Supabase is empty but local Dexie has records, retrieves local Dexie records.
 */
async function fetchFertilizerApplicationsBatch(
  startDate?: string,
  endDate?: string
): Promise<FertilizerApplication[]> {
  const batchSize = 1000
  let allRows: Record<string, unknown>[] = []

  if (isSupabaseConfigured && supabase) {
    let from = 0
    let hasMore = true

    while (hasMore) {
      let query = supabase
        .from('fertilizer_applications')
        .select('*')
        .order('application_date', { ascending: false })
        .range(from, from + batchSize - 1)

      if (startDate) query = query.gte('application_date', startDate)
      if (endDate) query = query.lte('application_date', endDate)

      const { data, error } = await query
      if (error) {
        throw new Error(`Failed to query fertilizer application records from Supabase: ${error.message}`)
      }

      if (data && data.length > 0) {
        allRows = allRows.concat(data)
        if (data.length < batchSize) {
          hasMore = false
        } else {
          from += batchSize
        }
      } else {
        hasMore = false
      }
    }
  }

  // If Supabase returned records, map to camelCase
  if (allRows.length > 0) {
    const map = new Map<string, Record<string, unknown>>()
    for (const row of allRows) {
      map.set(row.id as string, row)
    }
    return Array.from(map.values()).map(toCamelCase) as unknown as FertilizerApplication[]
  }

  // Fallback / local-first records from Dexie
  let localApps = await db.fertilizerApplications.toArray()
  if (startDate) localApps = localApps.filter((a) => a.applicationDate >= startDate)
  if (endDate) localApps = localApps.filter((a) => a.applicationDate <= endDate)
  return localApps.sort((a, b) => b.applicationDate.localeCompare(a.applicationDate))
}

/**
 * Previews record counts and financial totals for the selected export configuration.
 */
export async function getExportSummaryCounts(options: ExportOptions): Promise<ExportCounts> {
  const { startDate, endDate } = computeExportDateBounds(
    options.datePreset,
    options.startDate,
    options.endDate
  )

  let transactions: Transaction[] = []
  let fertilizerApps: FertilizerApplication[] = []

  if (options.dataType === 'all' || options.dataType === 'transactions') {
    transactions = await fetchTransactionsBatch(startDate, endDate)
  }

  if (options.dataType === 'all' || options.dataType === 'fertilizer') {
    fertilizerApps = await fetchFertilizerApplicationsBatch(startDate, endDate)
  }

  let totalIncome = 0
  let totalExpenses = 0
  for (const tx of transactions) {
    const amt = Number(tx.amount) || 0
    if (tx.type === 'income') {
      totalIncome += amt
    } else if (tx.type === 'expense') {
      totalExpenses += amt
    }
  }

  totalIncome = Math.round(totalIncome * 100) / 100
  totalExpenses = Math.round(totalExpenses * 100) / 100
  const netBalance = Math.round((totalIncome - totalExpenses) * 100) / 100

  return {
    transactionCount: transactions.length,
    fertilizerCount: fertilizerApps.length,
    totalCount: transactions.length + fertilizerApps.length,
    totalIncome,
    totalExpenses,
    netBalance,
  }
}

/**
 * Validates prerequisites and queries matching datasets.
 */
export async function loadExportPayload(options: ExportOptions): Promise<ExportPayload> {
  // 1. Connection Validation if Supabase is configured
  if (isSupabaseConfigured && supabase) {
    const conn = await checkSupabaseConnection()
    if (!conn.ok) {
      throw new Error(`Supabase connection unavailable: ${conn.message}`)
    }
  }

  const { startDate, endDate, label, span } = computeExportDateBounds(
    options.datePreset,
    options.startDate,
    options.endDate
  )

  // 2. Fetch metadata and datasets concurrently
  let transactions: Transaction[] = []
  let fertilizerApplications: FertilizerApplication[] = []
  let metadata: ExportMetadata

  try {
    metadata = await fetchExportMetadata()
  } catch (err) {
    throw new Error(`Failed to load cultivation metadata: ${err instanceof Error ? err.message : String(err)}`)
  }

  if (options.dataType === 'all' || options.dataType === 'transactions') {
    try {
      transactions = await fetchTransactionsBatch(startDate, endDate)
    } catch (err) {
      throw new Error(`Failed to load financial transactions: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  if (options.dataType === 'all' || options.dataType === 'fertilizer') {
    try {
      fertilizerApplications = await fetchFertilizerApplicationsBatch(startDate, endDate)
    } catch (err) {
      throw new Error(`Failed to load fertilizer applications: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  // 3. Validation: Check if both datasets are empty
  if (transactions.length === 0 && fertilizerApplications.length === 0) {
    throw new Error('No records available to export.')
  }

  return {
    transactions,
    fertilizerApplications,
    metadata,
    options,
    generatedAt: `${getColomboFormattedTimestamp()} (Asia/Colombo)`,
    dateRangeLabel: label,
    dateRangeSpan: span,
  }
}

/**
 * Constructs a fully formatted Excel workbook with SheetJS containing the 3 worksheets.
 */
export function buildExcelWorkbook(payload: ExportPayload): XLSX.WorkBook {
  const wb = XLSX.utils.book_new()
  const today = getTodayColombo()
  const { transactions, fertilizerApplications, metadata, dateRangeLabel, dateRangeSpan, generatedAt } = payload

  // --------------------------------------------------------------------------
  // SHEET 1: Transactions
  // --------------------------------------------------------------------------
  if (payload.options.dataType === 'all' || payload.options.dataType === 'transactions') {
    const txHeaders = [
      'Transaction ID',
      'Transaction Date',
      'Transaction Type',
      'Cultivation Land / Area',
      'Associated Crop',
      'Category',
      'Description',
      'Amount (LKR)',
      'Payment Method',
      'Invoice / Reference Number',
      'Notes',
      'Created At',
      'Updated At',
    ]

    const txRows = transactions.map((t) => [
      t.id,
      t.date,
      t.type === 'income' ? 'Income' : 'Expense',
      metadata.landMap.get(t.landId) || 'Unassigned',
      (t.cropId && metadata.cropMap.get(t.cropId)) || '',
      metadata.categoryMap.get(t.categoryId) || 'Uncategorized',
      t.description || '',
      typeof t.amount === 'number' ? t.amount : Number(t.amount) || 0,
      t.paymentMethod || '',
      t.referenceNumber || '',
      t.notes || '',
      t.createdAt || '',
      t.updatedAt || '',
    ])

    const wsTx = XLSX.utils.aoa_to_sheet([txHeaders, ...txRows])

    // Format Amount (LKR) column cells as numeric currency
    for (let r = 1; r <= txRows.length; r++) {
      const cellRef = `H${r + 1}`
      if (wsTx[cellRef]) {
        wsTx[cellRef].t = 'n'
        wsTx[cellRef].z = '#,##0.00'
      }
    }

    // Set column widths
    wsTx['!cols'] = [
      { wch: 38 }, // Transaction ID
      { wch: 16 }, // Transaction Date
      { wch: 16 }, // Transaction Type
      { wch: 24 }, // Cultivation Land / Area
      { wch: 20 }, // Associated Crop
      { wch: 24 }, // Category
      { wch: 35 }, // Description
      { wch: 18 }, // Amount (LKR)
      { wch: 18 }, // Payment Method
      { wch: 24 }, // Reference Number
      { wch: 35 }, // Notes
      { wch: 24 }, // Created At
      { wch: 24 }, // Updated At
    ]

    // Freeze header row
    wsTx['!views'] = [{ state: 'frozen', ySplit: 1 }]

    // Autofilter range
    const maxRow = Math.max(1, txRows.length + 1)
    wsTx['!autofilter'] = {
      ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: maxRow - 1, c: txHeaders.length - 1 } }),
    }

    XLSX.utils.book_append_sheet(wb, wsTx, 'Transactions')
  }

  // --------------------------------------------------------------------------
  // SHEET 2: Fertilizer Applications
  // --------------------------------------------------------------------------
  if (payload.options.dataType === 'all' || payload.options.dataType === 'fertilizer') {
    const fertHeaders = [
      'Application ID',
      'Cultivation Land / Area',
      'Target Crop',
      'Fertilizer Product',
      'Application Date',
      'Reminder Interval',
      'Next Due Date',
      'Quantity',
      'Unit',
      'Cost (LKR)',
      'Application Status',
      'Reminder Status',
      'Notes',
      'Created At',
      'Updated At',
    ]

    const fertRows = fertilizerApplications.map((app) => {
      // Calculate human reminder status
      let reminderStatus = 'Scheduled'
      if (app.status === 'completed') {
        reminderStatus = 'Completed'
      } else if (app.status === 'cancelled') {
        reminderStatus = 'Cancelled'
      } else if (app.nextDueDate) {
        const { status, daysRemaining } = getFertilizerDueStatus(app.nextDueDate, today)
        if (status === 'overdue') {
          reminderStatus = `Overdue by ${Math.abs(daysRemaining)} ${Math.abs(daysRemaining) === 1 ? 'day' : 'days'}`
        } else if (status === 'due_today') {
          reminderStatus = 'Due Today'
        } else if (status === 'due_soon') {
          reminderStatus = `Due Soon (in ${daysRemaining} days)`
        } else {
          reminderStatus = `Due in ${daysRemaining} days`
        }
      }

      return [
        app.id,
        metadata.landMap.get(app.landId) || 'Unassigned',
        metadata.cropMap.get(app.cropId) || 'Unassigned',
        metadata.fertilizerMap.get(app.fertilizerId) || 'Unknown Fertilizer',
        app.applicationDate,
        app.reminderInterval ? getReminderIntervalLabel(app.reminderInterval) : '',
        app.nextDueDate || '',
        app.quantity !== undefined && app.quantity !== null ? Number(app.quantity) : '',
        app.unit || '',
        app.cost !== undefined && app.cost !== null ? Number(app.cost) : '',
        app.status === 'completed'
          ? 'Completed'
          : app.status === 'cancelled'
          ? 'Cancelled'
          : 'Scheduled',
        reminderStatus,
        app.notes || '',
        app.createdAt || '',
        app.updatedAt || '',
      ]
    })

    const wsFert = XLSX.utils.aoa_to_sheet([fertHeaders, ...fertRows])

    // Format Quantity (col H = index 7) and Cost (col J = index 9)
    for (let r = 1; r <= fertRows.length; r++) {
      const qtyCell = `H${r + 1}`
      const costCell = `J${r + 1}`
      if (wsFert[qtyCell] && typeof wsFert[qtyCell].v === 'number') {
        wsFert[qtyCell].t = 'n'
      }
      if (wsFert[costCell] && typeof wsFert[costCell].v === 'number') {
        wsFert[costCell].t = 'n'
        wsFert[costCell].z = '#,##0.00'
      }
    }

    // Set column widths
    wsFert['!cols'] = [
      { wch: 38 }, // Application ID
      { wch: 24 }, // Cultivation Land / Area
      { wch: 20 }, // Target Crop
      { wch: 26 }, // Fertilizer Product
      { wch: 16 }, // Application Date
      { wch: 18 }, // Reminder Interval
      { wch: 16 }, // Next Due Date
      { wch: 12 }, // Quantity
      { wch: 10 }, // Unit
      { wch: 16 }, // Cost (LKR)
      { wch: 18 }, // Application Status
      { wch: 26 }, // Reminder Status
      { wch: 35 }, // Notes
      { wch: 24 }, // Created At
      { wch: 24 }, // Updated At
    ]

    // Freeze header row
    wsFert['!views'] = [{ state: 'frozen', ySplit: 1 }]

    // Autofilter range
    const maxRow = Math.max(1, fertRows.length + 1)
    wsFert['!autofilter'] = {
      ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: maxRow - 1, c: fertHeaders.length - 1 } }),
    }

    XLSX.utils.book_append_sheet(wb, wsFert, 'Fertilizer Applications')
  }

  // --------------------------------------------------------------------------
  // SHEET 3: Export Summary
  // --------------------------------------------------------------------------
  let totalIncome = 0
  let totalExpenses = 0
  for (const t of transactions) {
    const amt = Number(t.amount) || 0
    if (t.type === 'income') {
      totalIncome += amt
    } else if (t.type === 'expense') {
      totalExpenses += amt
    }
  }

  totalIncome = Math.round(totalIncome * 100) / 100
  totalExpenses = Math.round(totalExpenses * 100) / 100
  const netBalance = Math.round((totalIncome - totalExpenses) * 100) / 100

  const summaryData: (string | number)[][] = [
    ['AgriFlow – Agriculture Management System', ''],
    ['Complete Agriculture Data Export', ''],
    ['', ''],
    ['Export Metadata', 'Details'],
    ['Application Name', 'AgriFlow'],
    ['Report Title', 'Complete Agriculture Data Export'],
    ['Export Generated At', generatedAt],
    ['Reporting Timezone', 'Asia/Colombo'],
    ['Date Filter Preset', dateRangeLabel],
    ['Date Filter Span', dateRangeSpan],
    ['Export Format', 'Excel (.xlsx)'],
    ['', ''],
    ['Dataset Metric', 'Value / Amount (LKR)'],
    ['Transaction Records Exported', transactions.length],
    ['Fertilizer Application Records Exported', fertilizerApplications.length],
    ['Total Records Exported', transactions.length + fertilizerApplications.length],
    ['Total Income (LKR)', totalIncome],
    ['Total Expenses (LKR)', totalExpenses],
    ['Net Balance (LKR)', netBalance],
  ]

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData)

  // Format currency cells in Summary (rows 17, 18, 19 -> cells B17, B18, B19)
  ;['B17', 'B18', 'B19'].forEach((cellRef) => {
    if (wsSummary[cellRef]) {
      wsSummary[cellRef].t = 'n'
      wsSummary[cellRef].z = '#,##0.00'
    }
  })

  wsSummary['!cols'] = [{ wch: 36 }, { wch: 42 }]

  XLSX.utils.book_append_sheet(wb, wsSummary, 'Export Summary')

  return wb
}

/**
 * Triggers native browser download of generated Excel workbook.
 * Frees temporary object URL to prevent memory leaks.
 */
export function triggerExcelDownload(wb: XLSX.WorkBook, filename?: string): void {
  const finalFilename = filename || getExportFilename()
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })

  const blob = new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8',
  })

  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = finalFilename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)

  // Release memory
  setTimeout(() => {
    URL.revokeObjectURL(url)
  }, 1000)
}
