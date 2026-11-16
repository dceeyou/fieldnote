import { describe, it } from 'node:test'
import assert from 'node:assert'
import * as XLSX from 'xlsx'
import {
  computeExportDateBounds,
  getExportFilename,
  buildExcelWorkbook,
  type ExportPayload,
  type ExportOptions,
  type ExportMetadata,
} from '../src/services/exportService.ts'
import type { Transaction, FertilizerApplication } from '../src/data/db/schema.ts'

describe('Export Configuration & Date Presets', () => {
  it('handles "all_records" preset by omitting date boundaries', () => {
    const bounds = computeExportDateBounds('all_records')
    assert.strictEqual(bounds.startDate, '')
    assert.strictEqual(bounds.endDate, '')
    assert.strictEqual(bounds.label, 'All Records')
    assert.strictEqual(bounds.span, 'All available records in database')
  })

  it('computes "this_month" preset starting on 1st of current month', () => {
    const bounds = computeExportDateBounds('this_month')
    assert.match(bounds.startDate, /^\d{4}-\d{2}-01$/)
    assert.match(bounds.endDate, /^\d{4}-\d{2}-\d{2}$/)
    assert.strictEqual(bounds.label, 'This Month')
  })

  it('computes "this_year" preset starting on Jan 1st of current year', () => {
    const bounds = computeExportDateBounds('this_year')
    assert.match(bounds.startDate, /^\d{4}-01-01$/)
    assert.strictEqual(bounds.label, 'This Year')
  })

  it('computes "last_year" preset covering full previous calendar year', () => {
    const bounds = computeExportDateBounds('last_year')
    const currentYear = new Date().getFullYear()
    const lastYear = currentYear - 1
    assert.strictEqual(bounds.startDate, `${lastYear}-01-01`)
    assert.strictEqual(bounds.endDate, `${lastYear}-12-31`)
    assert.strictEqual(bounds.label, 'Last Year')
  })

  it('accepts custom date range boundaries', () => {
    const bounds = computeExportDateBounds('custom', '2026-03-01', '2026-03-31')
    assert.strictEqual(bounds.startDate, '2026-03-01')
    assert.strictEqual(bounds.endDate, '2026-03-31')
    assert.strictEqual(bounds.label, 'Custom Date Range')
    assert.strictEqual(bounds.span, '01/03/2026 – 31/03/2026')
  })

  it('generates filename in format AgriFlow_Complete_Data_Export_YYYY-MM-DD.xlsx', () => {
    const filename = getExportFilename('2026-11-17')
    assert.strictEqual(filename, 'AgriFlow_Complete_Data_Export_2026-11-17.xlsx')
  })
})

describe('Excel Workbook Generation (Three Worksheets)', () => {
  const metadata: ExportMetadata = {
    landMap: new Map([
      ['land-1', 'Main Estate'],
      ['land-2', 'Highland Plot'],
    ]),
    cropMap: new Map([
      ['crop-1', 'Ginger'],
      ['crop-2', 'Tea'],
    ]),
    categoryMap: new Map([
      ['cat-1', 'Harvest Sales'],
      ['cat-2', 'Fertilizer & Nutrients'],
    ]),
    fertilizerMap: new Map([
      ['fert-1', 'Urea 46%'],
      ['fert-2', 'MOP Potassium'],
    ]),
  }

  const sampleTransactions: Transaction[] = [
    {
      id: 'tx-1',
      date: '2026-11-10',
      type: 'income',
      landId: 'land-1',
      cropId: 'crop-1',
      categoryId: 'cat-1',
      description: 'Ginger early harvest batch 1',
      amount: 150000,
      paymentMethod: 'Bank Transfer',
      referenceNumber: 'INV-2026-001',
      notes: 'Direct buyer contract',
      source: 'manual',
      createdAt: '2026-11-10T10:00:00Z',
      updatedAt: '2026-11-10T10:00:00Z',
    },
    {
      id: 'tx-2',
      date: '2026-11-12',
      type: 'expense',
      landId: 'land-2',
      categoryId: 'cat-2',
      description: 'Urea and MOP purchase',
      amount: 45000,
      paymentMethod: 'Cash',
      source: 'manual',
      createdAt: '2026-11-12T14:00:00Z',
      updatedAt: '2026-11-12T14:00:00Z',
    },
  ]

  const sampleApplications: FertilizerApplication[] = [
    {
      id: 'app-1',
      landId: 'land-1',
      cropId: 'crop-1',
      fertilizerId: 'fert-1',
      applicationDate: '2026-11-01',
      reminderInterval: '1_month',
      nextDueDate: '2026-12-01',
      quantity: 50,
      unit: 'kg',
      cost: 18000,
      status: 'scheduled',
      notes: 'Split application phase 1',
      createdAt: '2026-11-01T08:00:00Z',
      updatedAt: '2026-11-01T08:00:00Z',
    },
    {
      id: 'app-2',
      landId: 'land-2',
      cropId: 'crop-2',
      fertilizerId: 'fert-2',
      applicationDate: '2026-10-15',
      reminderInterval: '3_months',
      nextDueDate: '2027-01-15',
      quantity: 25,
      unit: 'kg',
      cost: 12500,
      status: 'completed',
      actualCompletedDate: '2026-10-15',
      createdAt: '2026-10-15T09:00:00Z',
      updatedAt: '2026-10-15T09:00:00Z',
    },
  ]

  const sampleOptions: ExportOptions = {
    dataType: 'all',
    datePreset: 'all_records',
  }

  const payload: ExportPayload = {
    transactions: sampleTransactions,
    fertilizerApplications: sampleApplications,
    metadata,
    options: sampleOptions,
    generatedAt: '17/11/2026, 00:30:00 (Asia/Colombo)',
    dateRangeLabel: 'All Records',
    dateRangeSpan: 'All available records in database',
  }

  it('builds an Excel workbook containing three distinct worksheets', () => {
    const wb = buildExcelWorkbook(payload)
    assert.deepStrictEqual(wb.SheetNames, [
      'Transactions',
      'Fertilizer Applications',
      'Export Summary',
    ])
  })

  it('correctly constructs Sheet 1 (Transactions) with required 13 columns and numeric amounts', () => {
    const wb = buildExcelWorkbook(payload)
    const ws = wb.Sheets['Transactions']
    assert.ok(ws, 'Transactions worksheet should exist')

    // Verify Headers (Row 1)
    assert.strictEqual(ws['A1'].v, 'Transaction ID')
    assert.strictEqual(ws['B1'].v, 'Transaction Date')
    assert.strictEqual(ws['C1'].v, 'Transaction Type')
    assert.strictEqual(ws['D1'].v, 'Cultivation Land / Area')
    assert.strictEqual(ws['E1'].v, 'Associated Crop')
    assert.strictEqual(ws['F1'].v, 'Category')
    assert.strictEqual(ws['G1'].v, 'Description')
    assert.strictEqual(ws['H1'].v, 'Amount (LKR)')
    assert.strictEqual(ws['I1'].v, 'Payment Method')
    assert.strictEqual(ws['J1'].v, 'Invoice / Reference Number')
    assert.strictEqual(ws['K1'].v, 'Notes')
    assert.strictEqual(ws['L1'].v, 'Created At')
    assert.strictEqual(ws['M1'].v, 'Updated At')

    // Verify Row 2 Data resolution
    assert.strictEqual(ws['A2'].v, 'tx-1')
    assert.strictEqual(ws['B2'].v, '2026-11-10')
    assert.strictEqual(ws['C2'].v, 'Income')
    assert.strictEqual(ws['D2'].v, 'Main Estate')
    assert.strictEqual(ws['E2'].v, 'Ginger')
    assert.strictEqual(ws['F2'].v, 'Harvest Sales')
    assert.strictEqual(ws['H2'].v, 150000)
    assert.strictEqual(ws['H2'].t, 'n') // Numeric cell type
    assert.strictEqual(ws['H2'].z, '#,##0.00') // Currency format

    // Verify Row 3 with optional fields left blank
    assert.strictEqual(ws['A3'].v, 'tx-2')
    assert.strictEqual(ws['C3'].v, 'Expense')
    assert.strictEqual(ws['D3'].v, 'Highland Plot')
    assert.strictEqual(ws['E3'].v, '') // Crop not assigned
    assert.strictEqual(ws['H3'].v, 45000)
    assert.strictEqual(ws['H3'].t, 'n')

    // Verify Freeze Panes & Autofilter
    assert.ok(ws['!views'], 'Freeze panes should be configured')
    assert.ok(ws['!autofilter'], 'Autofilter should be configured')
  })

  it('correctly constructs Sheet 2 (Fertilizer Applications) with required 15 columns and status', () => {
    const wb = buildExcelWorkbook(payload)
    const ws = wb.Sheets['Fertilizer Applications']
    assert.ok(ws, 'Fertilizer Applications worksheet should exist')

    // Verify Headers
    assert.strictEqual(ws['A1'].v, 'Application ID')
    assert.strictEqual(ws['D1'].v, 'Fertilizer Product')
    assert.strictEqual(ws['F1'].v, 'Reminder Interval')
    assert.strictEqual(ws['H1'].v, 'Quantity')
    assert.strictEqual(ws['J1'].v, 'Cost (LKR)')
    assert.strictEqual(ws['K1'].v, 'Application Status')
    assert.strictEqual(ws['L1'].v, 'Reminder Status')

    // Verify Row 2 Data
    assert.strictEqual(ws['A2'].v, 'app-1')
    assert.strictEqual(ws['B2'].v, 'Main Estate')
    assert.strictEqual(ws['C2'].v, 'Ginger')
    assert.strictEqual(ws['D2'].v, 'Urea 46%')
    assert.strictEqual(ws['E2'].v, '2026-11-01')
    assert.strictEqual(ws['F2'].v, '1 Month')
    assert.strictEqual(ws['G2'].v, '2026-12-01')
    assert.strictEqual(ws['H2'].v, 50)
    assert.strictEqual(ws['H2'].t, 'n')
    assert.strictEqual(ws['J2'].v, 18000)
    assert.strictEqual(ws['J2'].t, 'n')
    assert.strictEqual(ws['K2'].v, 'Scheduled')

    // Verify Row 3 Completed status
    assert.strictEqual(ws['A3'].v, 'app-2')
    assert.strictEqual(ws['K3'].v, 'Completed')
    assert.strictEqual(ws['L3'].v, 'Completed')
  })

  it('correctly calculates financial totals in Sheet 3 (Export Summary)', () => {
    const wb = buildExcelWorkbook(payload)
    const ws = wb.Sheets['Export Summary']
    assert.ok(ws, 'Export Summary worksheet should exist')

    // Convert sheet to json array of arrays
    const rows = XLSX.utils.sheet_to_json<(string | number)[]>(ws, { header: 1 })

    // Find summary property rows
    const appNameRow = rows.find((r) => r[0] === 'Application Name')
    const reportTitleRow = rows.find((r) => r[0] === 'Report Title')
    const txCountRow = rows.find((r) => r[0] === 'Transaction Records Exported')
    const fertCountRow = rows.find((r) => r[0] === 'Fertilizer Application Records Exported')
    const totalCountRow = rows.find((r) => r[0] === 'Total Records Exported')
    const incomeRow = rows.find((r) => r[0] === 'Total Income (LKR)')
    const expenseRow = rows.find((r) => r[0] === 'Total Expenses (LKR)')
    const netBalanceRow = rows.find((r) => r[0] === 'Net Balance (LKR)')

    assert.strictEqual(appNameRow?.[1], 'AgriFlow')
    assert.strictEqual(reportTitleRow?.[1], 'Complete Agriculture Data Export')
    assert.strictEqual(txCountRow?.[1], 2)
    assert.strictEqual(fertCountRow?.[1], 2)
    assert.strictEqual(totalCountRow?.[1], 4)
    assert.strictEqual(incomeRow?.[1], 150000)
    assert.strictEqual(expenseRow?.[1], 45000)
    assert.strictEqual(netBalanceRow?.[1], 105000) // 150000 - 45000
  })

  it('exports successfully when only transactions exist', () => {
    const txOnlyPayload: ExportPayload = {
      ...payload,
      options: { dataType: 'transactions', datePreset: 'all_records' },
      fertilizerApplications: [],
    }
    const wb = buildExcelWorkbook(txOnlyPayload)
    assert.ok(wb.SheetNames.includes('Transactions'))
    assert.ok(wb.SheetNames.includes('Export Summary'))
    assert.ok(!wb.SheetNames.includes('Fertilizer Applications'))

    const wsSummary = wb.Sheets['Export Summary']
    const rows = XLSX.utils.sheet_to_json<(string | number)[]>(wsSummary, { header: 1 })
    const txCountRow = rows.find((r) => r[0] === 'Transaction Records Exported')
    const fertCountRow = rows.find((r) => r[0] === 'Fertilizer Application Records Exported')
    assert.strictEqual(txCountRow?.[1], 2)
    assert.strictEqual(fertCountRow?.[1], 0)
  })

  it('exports successfully when only fertilizer applications exist', () => {
    const fertOnlyPayload: ExportPayload = {
      ...payload,
      options: { dataType: 'fertilizer', datePreset: 'all_records' },
      transactions: [],
    }
    const wb = buildExcelWorkbook(fertOnlyPayload)
    assert.ok(wb.SheetNames.includes('Fertilizer Applications'))
    assert.ok(wb.SheetNames.includes('Export Summary'))
    assert.ok(!wb.SheetNames.includes('Transactions'))

    const wsSummary = wb.Sheets['Export Summary']
    const rows = XLSX.utils.sheet_to_json<(string | number)[]>(wsSummary, { header: 1 })
    const txCountRow = rows.find((r) => r[0] === 'Transaction Records Exported')
    const fertCountRow = rows.find((r) => r[0] === 'Fertilizer Application Records Exported')
    assert.strictEqual(txCountRow?.[1], 0)
    assert.strictEqual(fertCountRow?.[1], 2)
  })

  it('serializes workbook to valid .xlsx binary without corruption', () => {
    const wb = buildExcelWorkbook(payload)
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
    assert.ok(buf instanceof Buffer)
    assert.ok(buf.length > 5000, 'Excel workbook binary should exceed 5KB')

    // Read back workbook to verify integrity
    const readWb = XLSX.read(buf, { type: 'buffer' })
    assert.deepStrictEqual(readWb.SheetNames, [
      'Transactions',
      'Fertilizer Applications',
      'Export Summary',
    ])
  })
})
