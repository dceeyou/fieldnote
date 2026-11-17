import { db } from '../data/db/database.ts'
import type { Category } from '../data/db/schema.ts'
import { categoryInputSchema, type CategoryInput } from '../domain/validation.ts'
import {
  ALL_DEFAULT_CATEGORIES,
  auditCategoryDuplicates,
  type CategoryAuditReport,
  type ValidatedCategoryImportRow,
} from '../domain/category.ts'
import { supabase, isSupabaseConfigured } from '../lib/supabase.ts'

export async function getAllCategories(includeInactive = false): Promise<Category[]> {
  const collection = includeInactive
    ? db.categories.toCollection()
    : db.categories.filter((c) => c.isActive)
  const items = await collection.toArray()
  return items.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
}

export async function getCategoriesByType(
  type: 'income' | 'expense',
  includeInactive = false
): Promise<Category[]> {
  const all = await getAllCategories(includeInactive)
  return all.filter((c) => c.type === type)
}

/**
 * Checks if a category with the same name and type already exists (excluding the current ID if editing).
 */
export async function checkDuplicateCategoryName(
  name: string,
  type: 'income' | 'expense',
  excludeId?: string
): Promise<boolean> {
  const normalized = name.trim().toLowerCase()
  const existing = await db.categories
    .filter((c) => c.type === type && c.name.trim().toLowerCase() === normalized)
    .first()

  if (!existing) return false
  if (excludeId && existing.id === excludeId) return false
  return true
}

/**
 * Saves a category (create or update).
 */
export async function saveCategory(input: CategoryInput, id?: string): Promise<Category> {
  const validated = categoryInputSchema.parse(input)
  const now = new Date().toISOString()

  // Prevent duplicate names within the same type
  const isDuplicate = await checkDuplicateCategoryName(validated.name, validated.type, id)
  if (isDuplicate) {
    throw new Error(`A category named "${validated.name}" already exists for ${validated.type}s.`)
  }

  const categoryRecord: Category = {
    id: id || crypto.randomUUID(),
    name: validated.name.trim(),
    type: validated.type,
    description: validated.description?.trim() || undefined,
    keywords: (validated.keywords || []).map((k) => k.trim()).filter(Boolean),
    isActive: validated.isActive ?? true,
    sortOrder: validated.sortOrder ?? 0,
    createdAt: now,
    updatedAt: now,
  }

  if (id) {
    const existing = await db.categories.get(id)
    if (existing) {
      categoryRecord.createdAt = existing.createdAt
    }
    await db.categories.put(categoryRecord)
  } else {
    await db.categories.add(categoryRecord)
  }

  // Sync to Supabase if configured
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('categories').upsert({
        id: categoryRecord.id,
        name: categoryRecord.name,
        type: categoryRecord.type,
        description: categoryRecord.description || null,
        keywords: categoryRecord.keywords || [],
        is_active: categoryRecord.isActive,
        sort_order: categoryRecord.sortOrder,
        created_at: categoryRecord.createdAt,
        updated_at: categoryRecord.updatedAt,
      })
    } catch {
      // Offline fallback: Dexie holds source of truth locally
    }
  }

  return categoryRecord
}

/**
 * Archives a category (sets isActive to false).
 */
export async function archiveCategory(id: string): Promise<void> {
  const now = new Date().toISOString()
  await db.categories.update(id, {
    isActive: false,
    updatedAt: now,
  })

  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('categories').update({ is_active: false, updated_at: now }).eq('id', id)
    } catch {
      // offline fallback
    }
  }
}

/**
 * Restores an archived category (sets isActive to true).
 */
export async function restoreCategory(id: string): Promise<void> {
  const now = new Date().toISOString()
  await db.categories.update(id, {
    isActive: true,
    updatedAt: now,
  })

  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('categories').update({ is_active: true, updated_at: now }).eq('id', id)
    } catch {
      // offline fallback
    }
  }
}

/**
 * Checks usage of a category across transactions.
 */
export async function checkCategoryUsage(
  id: string
): Promise<{ count: number; totalAmount: number }> {
  const transactions = await db.transactions.where('categoryId').equals(id).toArray()
  const totalAmount = transactions.reduce((acc, t) => acc + t.amount, 0)
  return {
    count: transactions.length,
    totalAmount,
  }
}

/**
 * Deletes a category permanently ONLY if it is not referenced by any transactions.
 * If referenced, blocks deletion and mandates archiving.
 */
export async function deleteCategory(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const usage = await checkCategoryUsage(id)

  if (usage.count > 0) {
    return {
      success: false,
      error: `Cannot permanently delete this category because ${usage.count} historical transaction(s) depend on it. Please archive it instead to preserve financial history.`,
    }
  }

  await db.categories.delete(id)

  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('categories').delete().eq('id', id)
    } catch {
      // offline fallback
    }
  }

  return { success: true }
}

/**
 * Audits all categories against transactions to identify duplicates, spelling variations, and conflicts.
 */
export async function auditCategoryDuplicatesService(): Promise<CategoryAuditReport> {
  const [categories, transactions] = await Promise.all([
    db.categories.toArray(),
    db.transactions.toArray(),
  ])

  return auditCategoryDuplicates(categories, transactions)
}

export interface MergeResult {
  success: boolean
  migratedTransactionsCount: number
  archivedOrDeletedDuplicatesCount: number
  error?: string
}

/**
 * Safely merges duplicate categories into a canonical category:
 * 1. Updates historical transactions to reference canonicalId.
 * 2. Deletes or archives the redundant categories.
 * 3. Verifies financial integrity.
 */
export async function mergeDuplicateCategories(
  canonicalId: string,
  duplicateIds: string[],
  actionOnDuplicate: 'delete' | 'archive' = 'delete'
): Promise<MergeResult> {
  const canonical = await db.categories.get(canonicalId)
  if (!canonical) {
    return { success: false, migratedTransactionsCount: 0, archivedOrDeletedDuplicatesCount: 0, error: 'Canonical category not found' }
  }

  const validDuplicateIds = duplicateIds.filter((id) => id !== canonicalId)
  if (validDuplicateIds.length === 0) {
    return { success: true, migratedTransactionsCount: 0, archivedOrDeletedDuplicatesCount: 0 }
  }

  // Measure initial totals for financial verification
  const initialTransactions = await db.transactions.toArray()
  const initialTotal = initialTransactions.reduce((acc, t) => acc + t.amount, 0)

  let migratedCount = 0

  await db.transaction('rw', [db.categories, db.transactions], async () => {
    for (const dupId of validDuplicateIds) {
      const affected = await db.transactions.where('categoryId').equals(dupId).toArray()
      for (const tx of affected) {
        await db.transactions.update(tx.id, {
          categoryId: canonicalId,
          updatedAt: new Date().toISOString(),
        })
        migratedCount++
      }

      if (actionOnDuplicate === 'delete') {
        await db.categories.delete(dupId)
      } else {
        await db.categories.update(dupId, {
          isActive: false,
          updatedAt: new Date().toISOString(),
        })
      }
    }
  })

  // Verify financial totals have not changed
  const afterTransactions = await db.transactions.toArray()
  const afterTotal = afterTransactions.reduce((acc, t) => acc + t.amount, 0)

  if (Math.abs(afterTotal - initialTotal) > 0.001) {
    throw new Error('Critical: Financial total discrepancy detected after category merge!')
  }

  // Sync to Supabase if configured
  if (isSupabaseConfigured && supabase) {
    try {
      // 1. Reassign transactions in Supabase
      await supabase
        .from('transactions')
        .update({ category_id: canonicalId })
        .in('category_id', validDuplicateIds)

      // 2. Remove or archive duplicates in Supabase
      if (actionOnDuplicate === 'delete') {
        await supabase.from('categories').delete().in('id', validDuplicateIds)
      } else {
        await supabase
          .from('categories')
          .update({ is_active: false })
          .in('id', validDuplicateIds)
      }
    } catch {
      // offline fallback
    }
  }

  return {
    success: true,
    migratedTransactionsCount: migratedCount,
    archivedOrDeletedDuplicatesCount: validDuplicateIds.length,
  }
}

/**
 * Installs default categories from the recommended library, skipping any that already exist.
 */
export async function installDefaultCategories(): Promise<{
  insertedCount: number
  skippedCount: number
}> {
  const existing = await db.categories.toArray()
  const existingMap = new Set(
    existing.map((c) => `${c.type}:${c.name.trim().toLowerCase()}`)
  )

  const toInsert: Category[] = []
  let skippedCount = 0

  const now = new Date().toISOString()

  for (let i = 0; i < ALL_DEFAULT_CATEGORIES.length; i++) {
    const item = ALL_DEFAULT_CATEGORIES[i]
    const key = `${item.type}:${item.name.trim().toLowerCase()}`

    if (existingMap.has(key)) {
      skippedCount++
      continue
    }

    toInsert.push({
      id: crypto.randomUUID(),
      name: item.name,
      type: item.type,
      description: item.description,
      keywords: item.keywords,
      isActive: true,
      sortOrder: i + 1,
      createdAt: now,
      updatedAt: now,
    })
  }

  if (toInsert.length > 0) {
    await db.categories.bulkAdd(toInsert)

    if (isSupabaseConfigured && supabase) {
      try {
        const payload = toInsert.map((c) => ({
          id: c.id,
          name: c.name,
          type: c.type,
          description: c.description || null,
          keywords: c.keywords || [],
          is_active: c.isActive,
          sort_order: c.sortOrder,
          created_at: c.createdAt,
          updated_at: c.updatedAt,
        }))
        await supabase.from('categories').upsert(payload, { onConflict: 'id' })
      } catch {
        // offline fallback
      }
    }
  }

  return {
    insertedCount: toInsert.length,
    skippedCount,
  }
}

/**
 * Batch imports validated category rows from CSV.
 */
export async function importCategoriesFromCsv(
  rows: ValidatedCategoryImportRow[]
): Promise<{ importedCount: number; skippedCount: number }> {
  const readyRows = rows.filter((r) => r.isValid && !r.excluded)
  if (readyRows.length === 0) {
    return { importedCount: 0, skippedCount: rows.length }
  }

  const existing = await db.categories.toArray()
  const maxSort = existing.reduce((max, c) => Math.max(max, c.sortOrder), 0)

  const now = new Date().toISOString()
  const toInsert: Category[] = readyRows.map((r, idx) => ({
    id: crypto.randomUUID(),
    name: r.name,
    type: r.type,
    description: r.description,
    keywords: r.keywords,
    isActive: true,
    sortOrder: maxSort + idx + 1,
    createdAt: now,
    updatedAt: now,
  }))

  await db.categories.bulkAdd(toInsert)

  if (isSupabaseConfigured && supabase) {
    try {
      const payload = toInsert.map((c) => ({
        id: c.id,
        name: c.name,
        type: c.type,
        description: c.description || null,
        keywords: c.keywords || [],
        is_active: c.isActive,
        sort_order: c.sortOrder,
        created_at: c.createdAt,
        updated_at: c.updatedAt,
      }))
      await supabase.from('categories').upsert(payload, { onConflict: 'id' })
    } catch {
      // offline fallback
    }
  }

  return {
    importedCount: toInsert.length,
    skippedCount: rows.length - toInsert.length,
  }
}
