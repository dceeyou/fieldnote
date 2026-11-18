import { db } from '../data/db/database.ts'
import type { Transaction } from '../data/db/schema.ts'
import { transactionInputSchema, type TransactionInput } from '../domain/validation.ts'
import { syncUpsertRecord, syncDeleteRecord, syncDeleteRecords } from './syncService.ts'

export interface TransactionFilters {
  startDate?: string
  endDate?: string
  type?: 'income' | 'expense' | 'all'
  landId?: string
  cropId?: string
  categoryId?: string
  search?: string
}

export type TransactionIndexStrategy =
  | 'compound_land_date'
  | 'compound_type_date'
  | 'index_date'
  | 'index_land'
  | 'index_type'
  | 'index_category'
  | 'full_scan'

const MIN_DATE = '0000-01-01'
const MAX_DATE = '9999-12-31'

/**
 * Selects the most selective Dexie index declared in `AgricultureDatabase`
 * so date-bounded, land-filtered, and type-filtered queries avoid full table scans.
 */
export function selectTransactionIndexStrategy(
  filters: TransactionFilters = {}
): TransactionIndexStrategy {
  const hasDateBound = Boolean(filters.startDate || filters.endDate)
  const hasLand = Boolean(filters.landId && filters.landId !== 'all')
  const hasType = Boolean(filters.type && filters.type !== 'all')
  const hasCategory = Boolean(filters.categoryId && filters.categoryId !== 'all')

  if (hasLand && hasDateBound) return 'compound_land_date'
  if (hasType && hasDateBound) return 'compound_type_date'
  if (hasDateBound) return 'index_date'
  if (hasLand) return 'index_land'
  if (hasCategory) return 'index_category'
  if (hasType) return 'index_type'
  return 'full_scan'
}

export async function getTransactions(filters: TransactionFilters = {}): Promise<Transaction[]> {
  const strategy = selectTransactionIndexStrategy(filters)
  const lowerDate = filters.startDate || MIN_DATE
  const upperDate = filters.endDate || MAX_DATE

  let items: Transaction[]
  switch (strategy) {
    case 'compound_land_date':
      items = await db.transactions
        .where('[landId+date]')
        .between([filters.landId!, lowerDate], [filters.landId!, upperDate], true, true)
        .toArray()
      break
    case 'compound_type_date':
      items = await db.transactions
        .where('[type+date]')
        .between([filters.type!, lowerDate], [filters.type!, upperDate], true, true)
        .toArray()
      break
    case 'index_date':
      items = await db.transactions
        .where('date')
        .between(lowerDate, upperDate, true, true)
        .toArray()
      break
    case 'index_land':
      items = await db.transactions.where('landId').equals(filters.landId!).toArray()
      break
    case 'index_category':
      items = await db.transactions.where('categoryId').equals(filters.categoryId!).toArray()
      break
    case 'index_type':
      items = await db.transactions.where('type').equals(filters.type!).toArray()
      break
    case 'full_scan':
    default:
      items = await db.transactions.toCollection().toArray()
      break
  }

  // Apply remaining secondary predicates in memory over the narrowed indexed subset
  const queryText = filters.search?.trim().toLowerCase()
  items = items.filter((tx) => {
    if (filters.startDate && tx.date < filters.startDate) return false
    if (filters.endDate && tx.date > filters.endDate) return false
    if (filters.type && filters.type !== 'all' && tx.type !== filters.type) return false
    if (filters.landId && filters.landId !== 'all' && tx.landId !== filters.landId) return false
    if (filters.cropId && filters.cropId !== 'all' && tx.cropId !== filters.cropId) return false
    if (filters.categoryId && filters.categoryId !== 'all' && tx.categoryId !== filters.categoryId) return false

    if (queryText) {
      const matchDesc = tx.description.toLowerCase().includes(queryText)
      const matchRef = tx.referenceNumber?.toLowerCase().includes(queryText)
      const matchNotes = tx.notes?.toLowerCase().includes(queryText)
      if (!matchDesc && !matchRef && !matchNotes) return false
    }

    return true
  })

  // Sort by date descending, then createdAt descending
  return items.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
}

export async function getTransactionById(id: string): Promise<Transaction | undefined> {
  return db.transactions.get(id)
}

export async function saveTransaction(input: TransactionInput, id?: string): Promise<Transaction> {
  const validated = transactionInputSchema.parse(input)
  const now = new Date().toISOString()

  const txRecord: Transaction = {
    id: id || crypto.randomUUID(),
    date: validated.date,
    type: validated.type,
    landId: validated.landId,
    cropId: validated.cropId || undefined,
    categoryId: validated.categoryId,
    description: validated.description,
    amount: Math.round(validated.amount * 100) / 100,
    paymentMethod: validated.paymentMethod || undefined,
    referenceNumber: validated.referenceNumber || undefined,
    notes: validated.notes || undefined,
    source: validated.source || 'manual',
    importBatchId: validated.importBatchId || undefined,
    createdAt: now,
    updatedAt: now,
  }

  if (id) {
    const existing = await db.transactions.get(id)
    if (existing) {
      txRecord.createdAt = existing.createdAt
    }
    await db.transactions.put(txRecord)
  } else {
    await db.transactions.add(txRecord)
  }

  await syncUpsertRecord('transactions', txRecord as unknown as Record<string, unknown>)

  return txRecord
}

export async function deleteTransaction(id: string): Promise<void> {
  await db.transactions.delete(id)
  await syncDeleteRecord('transactions', id)
}

export async function bulkDeleteTransactions(ids: string[]): Promise<number> {
  if (ids.length === 0) return 0
  await db.transactions.bulkDelete(ids)
  await syncDeleteRecords('transactions', ids)
  return ids.length
}
