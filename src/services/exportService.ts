import type ExcelJS from 'exceljs'
import { supabase, isSupabaseConfigured } from '../lib/supabase.ts'
import { db } from '../data/db/database.ts'
import type { Transaction, FertilizerApplication } from '../data/db/schema.ts'
import {
  getTodayColombo,
  getCurrentMonthColombo,
  getReminderIntervalLabel,
  formatDateDDMMYYYY,
} from '../utils/date.ts'
import { getFertilizerDueStatus } from '../utils/reminders.ts'
import { toCamelCase, reconcileRecords, getPendingDeletionIds } from './syncService.ts'

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
      const span =
        start && end
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
 * Format: AgriFlow_Complete_Data_Export_YYYY-MM-DD.xlsx
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
 * Resolves metadata maps (lands, crops, categories, fertilizers) from both Dexie and Supabase.
 */
export async function fetchExportMetadata(): Promise<ExportMetadata> {
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

  if (isSupabaseConfigured && supabase) {
    try {
      const [sbLands, sbCrops, sbCats, sbFerts] = await Promise.all([
        supabase.from('lands').select('id, name'),
        supabase.from('crops').select('id, name'),
        supabase.from('categories').select('id, name'),
        supabase.from('fertilizers').select('id, name'),
      ])

      if (sbLands.data) sbLands.data.forEach((l) => { if (!landMap.has(l.id)) landMap.set(l.id, l.name) })
      if (sbCrops.data) sbCrops.data.forEach((c) => { if (!cropMap.has(c.id)) cropMap.set(c.id, c.name) })
      if (sbCats.data) sbCats.data.forEach((c) => { if (!categoryMap.has(c.id)) categoryMap.set(c.id, c.name) })
      if (sbFerts.data) sbFerts.data.forEach((f) => { if (!fertilizerMap.has(f.id)) fertilizerMap.set(f.id, f.name) })
    } catch {
      // Offline / unreachable: local Dexie maps remain authoritative
    }
  }

  return { landMap, cropMap, categoryMap, fertilizerMap }
}

/**
 * Fetches and merges transactions from both local Dexie and remote Supabase
 * so unsynced local records are never omitted and pending deletions are honored.
 */
async function fetchTransactionsBatch(startDate?: string, endDate?: string): Promise<Transaction[]> {
  const [localAll, pendingDeleted] = await Promise.all([
    db.transactions.toArray(),
    getPendingDeletionIds('transactions'),
  ])

  let localTx = localAll
  if (startDate) localTx = localTx.filter((t) => t.date >= startDate)
  if (endDate) localTx = localTx.filter((t) => t.date <= endDate)

  let remoteTx: Transaction[] = []
  if (isSupabaseConfigured && supabase) {
    try {
      const batchSize = 1000
      let from = 0
      let hasMore = true
      const rawRows: Record<string, unknown>[] = []

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
          console.warn('Export Supabase transaction fetch skipped (using local):', error.message)
          break
        }

        if (data && data.length > 0) {
          rawRows.push(...data)
          if (data.length < batchSize) {
            hasMore = false
          } else {
            from += batchSize
          }
        } else {
          hasMore = false
        }
      }

      remoteTx = rawRows.map((row) => toCamelCase(row) as unknown as Transaction)
    } catch (err) {
      console.warn('Export offline fallback for transactions:', err)
    }
  }

  const { merged } = reconcileRecords(localTx, remoteTx, pendingDeleted)
  return merged.sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt || '').localeCompare(a.createdAt || ''))
}

/**
 * Fetches and merges fertilizer applications from both local Dexie and remote Supabase.
 */
async function fetchFertilizerApplicationsBatch(
  startDate?: string,
  endDate?: string
): Promise<FertilizerApplication[]> {
  const [localAll, pendingDeleted] = await Promise.all([
    db.fertilizerApplications.toArray(),
    getPendingDeletionIds('fertilizer_applications'),
  ])

  let localApps = localAll
  if (startDate) localApps = localApps.filter((a) => a.applicationDate >= startDate)
  if (endDate) localApps = localApps.filter((a) => a.applicationDate <= endDate)

  let remoteApps: FertilizerApplication[] = []
  if (isSupabaseConfigured && supabase) {
    try {
      const batchSize = 1000
      let from = 0
      let hasMore = true
      const rawRows: Record<string, unknown>[] = []

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
          console.warn('Export Supabase fertilizer fetch skipped (using local):', error.message)
          break
        }

        if (data && data.length > 0) {
          rawRows.push(...data)
          if (data.length < batchSize) {
            hasMore = false
          } else {
            from += batchSize
          }
        } else {
          hasMore = false
        }
      }

      remoteApps = rawRows.map((row) => toCamelCase(row) as unknown as FertilizerApplication)
    } catch (err) {
      console.warn('Export offline fallback for fertilizer applications:', err)
    }
  }

  const { merged } = reconcileRecords(localApps, remoteApps, pendingDeleted)
  return merged.sort((a, b) => b.applicationDate.localeCompare(a.applicationDate))
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
 * Validates prerequisites and queries merged local + cloud datasets.
 */
export async function loadExportPayload(options: ExportOptions): Promise<ExportPayload> {
  const { startDate, endDate, label, span } = computeExportDateBounds(
    options.datePreset,
    options.startDate,
    options.endDate
  )

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
 * Lazily loads ExcelJS and constructs a formatted .xlsx workbook with up to 3 worksheets.
 */
export async function buildExcelWorkbook(payload: ExportPayload): Promise<ExcelJS.Workbook> {
  const excelModule = await import('exceljs')
  const Excel = (excelModule.default ?? excelModule) as typeof ExcelJS
  const wb = new Excel.Workbook()
  wb.creator = 'AgriFlow — Agriculture Management System'
  wb.created = new Date()

  const today = getTodayColombo()
  const { transactions, fertilizerApplications, metadata, dateRangeLabel, dateRangeSpan, generatedAt } = payload

  const headerStyle: Partial<ExcelJS.Style> = {
    font: { bold: true, color: { argb: 'FFFFFFFF' } },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF386642' } },
    alignment: { vertical: 'middle' },
  }

  // --------------------------------------------------------------------------
  // SHEET 1: Transactions
  // --------------------------------------------------------------------------
  if (payload.options.dataType === 'all' || payload.options.dataType === 'transactions') {
    const wsTx = wb.addWorksheet('Transactions', {
      views: [{ state: 'frozen', ySplit: 1 }],
    })

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

    const txWidths = [38, 16, 16, 24, 20, 24, 35, 18, 18, 24, 35, 24, 24]
    wsTx.columns = txHeaders.map((header, idx) => ({
      header,
      key: `col_${idx}`,
      width: txWidths[idx],
    }))

    wsTx.getRow(1).eachCell((cell) => {
      cell.style = headerStyle
    })

    for (const t of transactions) {
      const numericAmount = typeof t.amount === 'number' ? t.amount : Number(t.amount) || 0
      const row = wsTx.addRow([
        t.id,
        t.date,
        t.type === 'income' ? 'Income' : 'Expense',
        metadata.landMap.get(t.landId) || 'Unassigned',
        (t.cropId && metadata.cropMap.get(t.cropId)) || '',
        metadata.categoryMap.get(t.categoryId) || 'Uncategorized',
        t.description || '',
        numericAmount,
        t.paymentMethod || '',
        t.referenceNumber || '',
        t.notes || '',
        t.createdAt || '',
        t.updatedAt || '',
      ])
      row.getCell(8).numFmt = '#,##0.00'
    }

    const maxRow = Math.max(1, transactions.length + 1)
    wsTx.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: maxRow, column: txHeaders.length },
    }
  }

  // --------------------------------------------------------------------------
  // SHEET 2: Fertilizer Applications
  // --------------------------------------------------------------------------
  if (payload.options.dataType === 'all' || payload.options.dataType === 'fertilizer') {
    const wsFert = wb.addWorksheet('Fertilizer Applications', {
      views: [{ state: 'frozen', ySplit: 1 }],
    })

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

    const fertWidths = [38, 24, 20, 26, 16, 18, 16, 12, 10, 16, 18, 26, 35, 24, 24]
    wsFert.columns = fertHeaders.map((header, idx) => ({
      header,
      key: `col_${idx}`,
      width: fertWidths[idx],
    }))

    wsFert.getRow(1).eachCell((cell) => {
      cell.style = headerStyle
    })

    for (const app of fertilizerApplications) {
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

      const qtyVal = app.quantity !== undefined && app.quantity !== null ? Number(app.quantity) : ''
      const costVal = app.cost !== undefined && app.cost !== null ? Number(app.cost) : ''

      const row = wsFert.addRow([
        app.id,
        metadata.landMap.get(app.landId) || 'Unassigned',
        metadata.cropMap.get(app.cropId) || 'Unassigned',
        metadata.fertilizerMap.get(app.fertilizerId) || 'Unknown Fertilizer',
        app.applicationDate,
        app.reminderInterval ? getReminderIntervalLabel(app.reminderInterval) : '',
        app.nextDueDate || '',
        qtyVal,
        app.unit || '',
        costVal,
        app.status === 'completed'
          ? 'Completed'
          : app.status === 'cancelled'
          ? 'Cancelled'
          : 'Scheduled',
        reminderStatus,
        app.notes || '',
        app.createdAt || '',
        app.updatedAt || '',
      ])

      if (typeof costVal === 'number') {
        row.getCell(10).numFmt = '#,##0.00'
      }
    }

    const maxRow = Math.max(1, fertilizerApplications.length + 1)
    wsFert.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: maxRow, column: fertHeaders.length },
    }
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

  const wsSummary = wb.addWorksheet('Export Summary')
  wsSummary.columns = [{ width: 36 }, { width: 42 }]

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

  for (const rowValues of summaryData) {
    wsSummary.addRow(rowValues)
  }

  wsSummary.getRow(1).font = { bold: true, size: 13 }
  wsSummary.getRow(4).font = { bold: true }
  wsSummary.getRow(13).font = { bold: true }
  ;['B17', 'B18', 'B19'].forEach((cellRef) => {
    wsSummary.getCell(cellRef).numFmt = '#,##0.00'
  })

  return wb
}

/**
 * Triggers native browser download of generated ExcelJS workbook.
 * Frees temporary object URL to prevent memory leaks.
 */
export async function triggerExcelDownload(wb: ExcelJS.Workbook, filename?: string): Promise<void> {
  const finalFilename = filename || getExportFilename()
  const excelBuffer = await wb.xlsx.writeBuffer()

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

  setTimeout(() => {
    URL.revokeObjectURL(url)
  }, 1000)
}
