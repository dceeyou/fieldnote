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

export async function getTransactions(filters: TransactionFilters = {}): Promise<Transaction[]> {
  const collection = db.transactions.toCollection()

  let items = await collection.toArray()

  // In-memory filter pipeline for combined multi-field queries
  items = items.filter((tx) => {
    if (filters.startDate && tx.date < filters.startDate) return false
    if (filters.endDate && tx.date > filters.endDate) return false
    if (filters.type && filters.type !== 'all' && tx.type !== filters.type) return false
    if (filters.landId && filters.landId !== 'all' && tx.landId !== filters.landId) return false
    if (filters.cropId && filters.cropId !== 'all' && tx.cropId !== filters.cropId) return false
    if (filters.categoryId && filters.categoryId !== 'all' && tx.categoryId !== filters.categoryId) return false

    if (filters.search) {
      const q = filters.search.toLowerCase()
      const matchDesc = tx.description.toLowerCase().includes(q)
      const matchRef = tx.referenceNumber?.toLowerCase().includes(q)
      const matchNotes = tx.notes?.toLowerCase().includes(q)
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
