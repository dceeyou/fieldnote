import { db } from '../data/db/database.ts'
import type { Transaction } from '../data/db/schema.ts'
import { syncUpsertRecords } from './syncService.ts'

export interface ParsedCsvRow {
  index: number
  rawDate?: string
  rawType?: string
  rawAmount?: string
  rawDescription?: string
  rawLand?: string
  rawCategory?: string
  rawReference?: string
}

export interface StagedTransactionRow {
  index: number
  date: string
  type: 'income' | 'expense'
  landId: string // Mandatory before confirmation
  cropId?: string
  categoryId: string
  description: string
  amount: number
  referenceNumber?: string
  isValid: boolean
  validationErrors: string[]
  isDuplicateCandidate: boolean
}

/**
 * Parses CSV text into array of rows handling quotes and line breaks.
 */
export function parseCsvText(csvText: string): string[][] {
  const lines: string[][] = []
  let currentRow: string[] = []
  let currentField = ''
  let insideQuotes = false

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i]
    const nextChar = csvText[i + 1]

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentField += '"'
        i++ // Skip escaped quote
      } else {
        insideQuotes = !insideQuotes
      }
    } else if (char === ',' && !insideQuotes) {
      currentRow.push(currentField.trim())
      currentField = ''
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++ // Skip CRLF
      }
      currentRow.push(currentField.trim())
      if (currentRow.some((field) => field.length > 0)) {
        lines.push(currentRow)
      }
      currentRow = []
      currentField = ''
    } else {
      currentField += char
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim())
    if (currentRow.some((field) => field.length > 0)) {
      lines.push(currentRow)
    }
  }

  return lines
}

/**
 * Detect column indexes from CSV header row.
 */
export function detectColumnMapping(headers: string[]): {
  dateCol: number
  typeCol: number
  amountCol: number
  descCol: number
  landCol: number
  catCol: number
  refCol: number
} {
  const lower = headers.map((h) => h.toLowerCase().trim())

  const findIndex = (patterns: string[]) =>
    lower.findIndex((h) => patterns.some((p) => h.includes(p)))

  return {
    dateCol: findIndex(['date', 'time', 'day']),
    typeCol: findIndex(['type', 'direction', 'flow', 'credit/debit']),
    amountCol: findIndex(['amount', 'lkr', 'total', 'cost', 'price', 'value']),
    descCol: findIndex(['desc', 'description', 'detail', 'particular', 'narrative', 'item']),
    landCol: findIndex(['land', 'area', 'plot', 'estate', 'field']),
    catCol: findIndex(['category', 'cat', 'account']),
    refCol: findIndex(['ref', 'invoice', 'voucher', 'cheque', 'receipt']),
  }
}

/**
 * Checks existing transactions to flag potential duplicate candidates.
 */
export function checkDuplicate(
  date: string,
  amount: number,
  type: string,
  desc: string,
  existingTx: Transaction[]
): boolean {
  const cleanDesc = desc.trim().toLowerCase()
  return existingTx.some(
    (tx) =>
      tx.date === date &&
      tx.amount === amount &&
      tx.type === type &&
      (tx.description.trim().toLowerCase() === cleanDesc ||
        tx.description.toLowerCase().includes(cleanDesc) ||
        cleanDesc.includes(tx.description.toLowerCase()))
  )
}

/**
 * Saves a confirmed batch of imported rows into the database and logs an importBatch record.
 */
export async function saveImportedTransactions(
  fileName: string,
  validRows: StagedTransactionRow[]
): Promise<number> {
  const batchId = crypto.randomUUID()
  const now = new Date().toISOString()

  const recordsToInsert: Transaction[] = validRows.map((row) => ({
    id: crypto.randomUUID(),
    date: row.date,
    type: row.type,
    landId: row.landId,
    cropId: row.cropId || undefined,
    categoryId: row.categoryId,
    description: row.description,
    amount: row.amount,
    referenceNumber: row.referenceNumber || undefined,
    source: 'import',
    importBatchId: batchId,
    createdAt: now,
    updatedAt: now,
  }))

  await db.transaction('rw', [db.transactions, db.importBatches], async () => {
    await db.transactions.bulkAdd(recordsToInsert)

    await db.importBatches.add({
      id: batchId,
      fileName,
      fileType: 'csv',
      importedAt: now,
      totalRows: validRows.length,
      importedRows: recordsToInsert.length,
      skippedRows: 0,
      status: 'completed',
    })
  })

  await syncUpsertRecords(
    'transactions',
    recordsToInsert as unknown as Record<string, unknown>[]
  )

  return recordsToInsert.length
}
