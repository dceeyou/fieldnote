import { describe, it } from 'node:test'
import assert from 'node:assert'
import ExcelJS from 'exceljs'
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

function extractSheetRows(ws: ExcelJS.Worksheet): (string | number | undefined)[][] {
  const rows: (string | number | undefined)[][] = []
  ws.eachRow((row) => {
    const vals = row.values as (string | number | undefined)[]
    rows.push(vals.slice(1))
  })
  return rows
}

describe('Excel Workbook Generation (ExcelJS Three Worksheets)', () => {
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

  it('builds an Excel workbook containing three distinct worksheets', async () => {
    const wb = await buildExcelWorkbook(payload)
    assert.deepStrictEqual(
      wb.worksheets.map((s) => s.name),
      ['Transactions', 'Fertilizer Applications', 'Export Summary']
    )
  })

  it('correctly constructs Sheet 1 (Transactions) with required 13 columns and numeric amounts', async () => {
    const wb = await buildExcelWorkbook(payload)
    const ws = wb.getWorksheet('Transactions')
    assert.ok(ws, 'Transactions worksheet should exist')

    // Verify Headers (Row 1)
    assert.strictEqual(ws.getCell('A1').value, 'Transaction ID')
    assert.strictEqual(ws.getCell('B1').value, 'Transaction Date')
    assert.strictEqual(ws.getCell('C1').value, 'Transaction Type')
    assert.strictEqual(ws.getCell('D1').value, 'Cultivation Land / Area')
    assert.strictEqual(ws.getCell('E1').value, 'Associated Crop')
    assert.strictEqual(ws.getCell('F1').value, 'Category')
    assert.strictEqual(ws.getCell('G1').value, 'Description')
    assert.strictEqual(ws.getCell('H1').value, 'Amount (LKR)')
    assert.strictEqual(ws.getCell('I1').value, 'Payment Method')
    assert.strictEqual(ws.getCell('J1').value, 'Invoice / Reference Number')
    assert.strictEqual(ws.getCell('K1').value, 'Notes')
    assert.strictEqual(ws.getCell('L1').value, 'Created At')
    assert.strictEqual(ws.getCell('M1').value, 'Updated At')

    // Verify Row 2 Data resolution
    assert.strictEqual(ws.getCell('A2').value, 'tx-1')
    assert.strictEqual(ws.getCell('B2').value, '2026-11-10')
    assert.strictEqual(ws.getCell('C2').value, 'Income')
    assert.strictEqual(ws.getCell('D2').value, 'Main Estate')
    assert.strictEqual(ws.getCell('E2').value, 'Ginger')
    assert.strictEqual(ws.getCell('F2').value, 'Harvest Sales')
    assert.strictEqual(ws.getCell('H2').value, 150000)
    assert.strictEqual(typeof ws.getCell('H2').value, 'number')
    assert.strictEqual(ws.getCell('H2').numFmt, '#,##0.00')

    // Verify Row 3 with optional fields left blank
    assert.strictEqual(ws.getCell('A3').value, 'tx-2')
    assert.strictEqual(ws.getCell('C3').value, 'Expense')
    assert.strictEqual(ws.getCell('D3').value, 'Highland Plot')
    assert.strictEqual(ws.getCell('E3').value, '')
    assert.strictEqual(ws.getCell('H3').value, 45000)
    assert.strictEqual(typeof ws.getCell('H3').value, 'number')

    // Verify Freeze Panes & Autofilter
    assert.ok(ws.views && ws.views.length > 0 && ws.views[0].state === 'frozen', 'Freeze panes should be configured')
    assert.ok(ws.autoFilter, 'Autofilter should be configured')
  })

  it('correctly constructs Sheet 2 (Fertilizer Applications) with required 15 columns and status', async () => {
    const wb = await buildExcelWorkbook(payload)
    const ws = wb.getWorksheet('Fertilizer Applications')
    assert.ok(ws, 'Fertilizer Applications worksheet should exist')

    assert.strictEqual(ws.getCell('A1').value, 'Application ID')
    assert.strictEqual(ws.getCell('D1').value, 'Fertilizer Product')
    assert.strictEqual(ws.getCell('F1').value, 'Reminder Interval')
    assert.strictEqual(ws.getCell('H1').value, 'Quantity')
    assert.strictEqual(ws.getCell('J1').value, 'Cost (LKR)')
    assert.strictEqual(ws.getCell('K1').value, 'Application Status')
    assert.strictEqual(ws.getCell('L1').value, 'Reminder Status')

    assert.strictEqual(ws.getCell('A2').value, 'app-1')
    assert.strictEqual(ws.getCell('B2').value, 'Main Estate')
    assert.strictEqual(ws.getCell('C2').value, 'Ginger')
    assert.strictEqual(ws.getCell('D2').value, 'Urea 46%')
    assert.strictEqual(ws.getCell('E2').value, '2026-11-01')
    assert.strictEqual(ws.getCell('F2').value, '1 Month')
    assert.strictEqual(ws.getCell('G2').value, '2026-12-01')
    assert.strictEqual(ws.getCell('H2').value, 50)
    assert.strictEqual(typeof ws.getCell('H2').value, 'number')
    assert.strictEqual(ws.getCell('J2').value, 18000)
    assert.strictEqual(typeof ws.getCell('J2').value, 'number')
    assert.strictEqual(ws.getCell('J2').numFmt, '#,##0.00')
    assert.strictEqual(ws.getCell('K2').value, 'Scheduled')

    assert.strictEqual(ws.getCell('A3').value, 'app-2')
    assert.strictEqual(ws.getCell('K3').value, 'Completed')
    assert.strictEqual(ws.getCell('L3').value, 'Completed')
  })

  it('correctly calculates financial totals in Sheet 3 (Export Summary)', async () => {
    const wb = await buildExcelWorkbook(payload)
    const ws = wb.getWorksheet('Export Summary')
    assert.ok(ws, 'Export Summary worksheet should exist')

    const rows = extractSheetRows(ws)
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
    assert.strictEqual(netBalanceRow?.[1], 105000)
  })

  it('exports successfully when only transactions exist', async () => {
    const txOnlyPayload: ExportPayload = {
      ...payload,
      options: { dataType: 'transactions', datePreset: 'all_records' },
      fertilizerApplications: [],
    }
    const wb = await buildExcelWorkbook(txOnlyPayload)
    const names = wb.worksheets.map((s) => s.name)
    assert.ok(names.includes('Transactions'))
    assert.ok(names.includes('Export Summary'))
    assert.ok(!names.includes('Fertilizer Applications'))

    const wsSummary = wb.getWorksheet('Export Summary')!
    const rows = extractSheetRows(wsSummary)
    assert.strictEqual(rows.find((r) => r[0] === 'Transaction Records Exported')?.[1], 2)
    assert.strictEqual(rows.find((r) => r[0] === 'Fertilizer Application Records Exported')?.[1], 0)
  })

  it('exports successfully when only fertilizer applications exist', async () => {
    const fertOnlyPayload: ExportPayload = {
      ...payload,
      options: { dataType: 'fertilizer', datePreset: 'all_records' },
      transactions: [],
    }
    const wb = await buildExcelWorkbook(fertOnlyPayload)
    const names = wb.worksheets.map((s) => s.name)
    assert.ok(names.includes('Fertilizer Applications'))
    assert.ok(names.includes('Export Summary'))
    assert.ok(!names.includes('Transactions'))

    const wsSummary = wb.getWorksheet('Export Summary')!
    const rows = extractSheetRows(wsSummary)
    assert.strictEqual(rows.find((r) => r[0] === 'Transaction Records Exported')?.[1], 0)
    assert.strictEqual(rows.find((r) => r[0] === 'Fertilizer Application Records Exported')?.[1], 2)
  })

  it('serializes workbook to valid .xlsx binary without corruption', async () => {
    const wb = await buildExcelWorkbook(payload)
    const buf = await wb.xlsx.writeBuffer()
    assert.ok(buf.byteLength > 5000, 'Excel workbook binary should exceed 5KB')

    // Reload workbook from binary buffer to verify integrity
    const readWb = new ExcelJS.Workbook()
    await readWb.xlsx.load(buf)
    assert.deepStrictEqual(
      readWb.worksheets.map((s) => s.name),
      ['Transactions', 'Fertilizer Applications', 'Export Summary']
    )
    assert.strictEqual(readWb.getWorksheet('Transactions')?.getCell('A2').value, 'tx-1')
  })
})
