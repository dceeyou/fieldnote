import { supabase, isSupabaseConfigured } from '../lib/supabase.ts'
import { db } from '../data/db/database.ts'
import type {
  Land,
  Crop,
  LandCrop,
  Category,
  Fertilizer,
  Transaction,
  FertilizerApplication,
  SyncableTable,
  SyncDeletion,
} from '../data/db/schema.ts'

export interface SyncResult {
  success: boolean
  message: string
  deletedCount?: number
  uploadedCounts?: {
    lands: number
    crops: number
    categories: number
    fertilizers: number
    transactions: number
    fertilizerApplications: number
  }
  downloadedCounts?: {
    lands: number
    crops: number
    categories: number
    fertilizers: number
    transactions: number
    fertilizerApplications: number
  }
}

export interface ReconcileResult<T> {
  merged: T[]
  toUpload: T[]
  toPutLocal: T[]
}

// Child tables deleted before parent tables to satisfy PostgreSQL FK constraints
export const DELETE_SYNC_ORDER: SyncableTable[] = [
  'fertilizer_applications',
  'transactions',
  'land_crops',
  'fertilizers',
  'categories',
  'crops',
  'lands',
]

// Convert camelCase object to snake_case for Supabase
export function toSnakeCase(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, val] of Object.entries(obj)) {
    const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase()
    result[snakeKey] = val !== undefined ? val : null
  }
  return result
}

// Convert snake_case object to camelCase for Dexie
export function toCamelCase(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, val] of Object.entries(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
    if (val !== null && val !== undefined) {
      result[camelKey] = val
    }
  }
  return result
}

function parseTimestampMs(ts?: string): number {
  if (!ts) return 0
  const parsed = Date.parse(ts)
  return Number.isNaN(parsed) ? 0 : parsed
}

/**
 * Pure, deterministic reconciliation between local Dexie records and remote Supabase records.
 * - Excludes any ID present in pendingDeletedIds (prevents resurrecting locally deleted records).
 * - Resolves conflicts by comparing `updatedAt` timestamps (newest wins).
 */
export function reconcileRecords<T extends { id: string; updatedAt?: string }>(
  local: T[],
  remote: T[],
  pendingDeletedIds: Set<string> = new Set()
): ReconcileResult<T> {
  const localMap = new Map<string, T>()
  const remoteMap = new Map<string, T>()

  for (const item of local) {
    if (!pendingDeletedIds.has(item.id)) {
      localMap.set(item.id, item)
    }
  }

  for (const item of remote) {
    if (!pendingDeletedIds.has(item.id)) {
      remoteMap.set(item.id, item)
    }
  }

  const allIds = new Set<string>([...localMap.keys(), ...remoteMap.keys()])
  const merged: T[] = []
  const toUpload: T[] = []
  const toPutLocal: T[] = []

  for (const id of allIds) {
    const localItem = localMap.get(id)
    const remoteItem = remoteMap.get(id)

    if (localItem && !remoteItem) {
      merged.push(localItem)
      toUpload.push(localItem)
    } else if (!localItem && remoteItem) {
      merged.push(remoteItem)
      toPutLocal.push(remoteItem)
    } else if (localItem && remoteItem) {
      const localMs = parseTimestampMs(localItem.updatedAt)
      const remoteMs = parseTimestampMs(remoteItem.updatedAt)

      if (localMs > remoteMs) {
        merged.push(localItem)
        toUpload.push(localItem)
      } else if (remoteMs > localMs) {
        merged.push(remoteItem)
        toPutLocal.push(remoteItem)
      } else {
        // Equal timestamps: preserve local item without redundant writes
        merged.push(localItem)
      }
    }
  }

  return { merged, toUpload, toPutLocal }
}

function makeTombstoneKey(tableName: SyncableTable, recordId: string): string {
  return `${tableName}:${recordId}`
}

export async function getPendingDeletionIds(tableName: SyncableTable): Promise<Set<string>> {
  try {
    const rows = await db.syncDeletions.where('tableName').equals(tableName).toArray()
    return new Set(rows.map((r) => r.recordId))
  } catch {
    return new Set()
  }
}

export async function recordSyncDeletions(tableName: SyncableTable, recordIds: string[]): Promise<void> {
  if (recordIds.length === 0) return
  const now = new Date().toISOString()
  const entries: SyncDeletion[] = recordIds.map((recordId) => ({
    id: makeTombstoneKey(tableName, recordId),
    tableName,
    recordId,
    deletedAt: now,
  }))
  try {
    await db.syncDeletions.bulkPut(entries)
  } catch (err) {
    console.warn(`Failed to record local deletion tombstones for ${tableName}:`, err)
  }
}

export async function clearSyncDeletions(tableName: SyncableTable, recordIds: string[]): Promise<void> {
  if (recordIds.length === 0) return
  try {
    await db.syncDeletions.bulkDelete(recordIds.map((id) => makeTombstoneKey(tableName, id)))
  } catch {
    // Non-fatal cleanup error
  }
}

/**
 * Best-effort immediate upsert of one or more records to Supabase.
 * Safe when offline: never throws to callers so local-first Dexie UX remains uninterrupted.
 */
export async function syncUpsertRecords(
  tableName: SyncableTable,
  records: Record<string, unknown>[]
): Promise<boolean> {
  if (records.length === 0) return true

  const ids = records
    .map((r) => (typeof r.id === 'string' ? r.id : ''))
    .filter(Boolean)
  await clearSyncDeletions(tableName, ids)

  if (!isSupabaseConfigured || !supabase) return false

  try {
    const payload = records.map((r) => toSnakeCase(r))
    const { error } = await supabase.from(tableName).upsert(payload, { onConflict: 'id' })
    if (error) {
      console.warn(`Background Supabase upsert deferred for ${tableName}:`, error.message)
      return false
    }
    return true
  } catch (err) {
    console.warn(`Background Supabase upsert error for ${tableName}:`, err)
    return false
  }
}

export async function syncUpsertRecord(
  tableName: SyncableTable,
  record: Record<string, unknown>
): Promise<boolean> {
  return syncUpsertRecords(tableName, [record])
}

/**
 * Records deletion tombstones locally first, then attempts immediate deletion in Supabase.
 * Confirmed remote deletions clear their tombstones; offline deletions flush on next sync.
 */
export async function syncDeleteRecords(
  tableName: SyncableTable,
  recordIds: string[]
): Promise<boolean> {
  if (recordIds.length === 0) return true

  await recordSyncDeletions(tableName, recordIds)

  if (!isSupabaseConfigured || !supabase) return false

  try {
    const { error } = await supabase.from(tableName).delete().in('id', recordIds)
    if (error) {
      console.warn(`Background Supabase delete deferred for ${tableName}:`, error.message)
      return false
    }
    await clearSyncDeletions(tableName, recordIds)
    return true
  } catch (err) {
    console.warn(`Background Supabase delete error for ${tableName}:`, err)
    return false
  }
}

export async function syncDeleteRecord(
  tableName: SyncableTable,
  recordId: string
): Promise<boolean> {
  return syncDeleteRecords(tableName, [recordId])
}

/**
 * Flushes all queued local deletions to Supabase in FK-safe child-before-parent order.
 */
export async function flushPendingDeletions(): Promise<{ flushed: number; errors: string[] }> {
  if (!isSupabaseConfigured || !supabase) {
    return { flushed: 0, errors: [] }
  }

  let allTombstones: SyncDeletion[] = []
  try {
    allTombstones = await db.syncDeletions.toArray()
  } catch {
    return { flushed: 0, errors: [] }
  }

  if (allTombstones.length === 0) {
    return { flushed: 0, errors: [] }
  }

  const byTable = new Map<SyncableTable, string[]>()
  for (const t of allTombstones) {
    const list = byTable.get(t.tableName) || []
    list.push(t.recordId)
    byTable.set(t.tableName, list)
  }

  let flushed = 0
  const errors: string[] = []

  for (const tableName of DELETE_SYNC_ORDER) {
    const ids = byTable.get(tableName)
    if (!ids || ids.length === 0) continue

    const { error } = await supabase.from(tableName).delete().in('id', ids)
    if (error) {
      errors.push(`Failed to sync deletions for ${tableName}: ${error.message}`)
    } else {
      await clearSyncDeletions(tableName, ids)
      flushed += ids.length
    }
  }

  return { flushed, errors }
}

export async function uploadLocalToSupabase(): Promise<SyncResult> {
  if (!isSupabaseConfigured || !supabase) {
    return { success: false, message: 'Supabase is not configured. Check your environment variables.' }
  }

  try {
    // 1. Propagate any pending local deletions before upserts
    const { flushed, errors: deleteErrors } = await flushPendingDeletions()
    if (deleteErrors.length > 0) {
      throw new Error(deleteErrors.join('; '))
    }

    const [lands, crops, landCrops, categories, fertilizers, transactions, applications] =
      await Promise.all([
        db.lands.toArray(),
        db.crops.toArray(),
        db.landCrops.toArray(),
        db.categories.toArray(),
        db.fertilizers.toArray(),
        db.transactions.toArray(),
        db.fertilizerApplications.toArray(),
      ])

    // 2. Upsert in parent-before-child FK order
    if (lands.length > 0) {
      const payload = lands.map((l) => toSnakeCase(l as unknown as Record<string, unknown>))
      const { error } = await supabase.from('lands').upsert(payload, { onConflict: 'id' })
      if (error) throw new Error(`Failed to upload lands: ${error.message}`)
    }

    if (crops.length > 0) {
      const payload = crops.map((c) => toSnakeCase(c as unknown as Record<string, unknown>))
      const { error } = await supabase.from('crops').upsert(payload, { onConflict: 'id' })
      if (error) throw new Error(`Failed to upload crops: ${error.message}`)
    }

    if (landCrops.length > 0) {
      const payload = landCrops.map((lc) => toSnakeCase(lc as unknown as Record<string, unknown>))
      const { error } = await supabase.from('land_crops').upsert(payload, { onConflict: 'id' })
      if (error) throw new Error(`Failed to upload land crops: ${error.message}`)
    }

    if (categories.length > 0) {
      const payload = categories.map((cat) => toSnakeCase(cat as unknown as Record<string, unknown>))
      const { error } = await supabase.from('categories').upsert(payload, { onConflict: 'id' })
      if (error) throw new Error(`Failed to upload categories: ${error.message}`)
    }

    if (fertilizers.length > 0) {
      const payload = fertilizers.map((f) => toSnakeCase(f as unknown as Record<string, unknown>))
      const { error } = await supabase.from('fertilizers').upsert(payload, { onConflict: 'id' })
      if (error) throw new Error(`Failed to upload fertilizers: ${error.message}`)
    }

    if (transactions.length > 0) {
      const payload = transactions.map((t) => toSnakeCase(t as unknown as Record<string, unknown>))
      const { error } = await supabase.from('transactions').upsert(payload, { onConflict: 'id' })
      if (error) throw new Error(`Failed to upload transactions: ${error.message}`)
    }

    if (applications.length > 0) {
      const payload = applications.map((a) => toSnakeCase(a as unknown as Record<string, unknown>))
      const { error } = await supabase
        .from('fertilizer_applications')
        .upsert(payload, { onConflict: 'id' })
      if (error) throw new Error(`Failed to upload fertilizer schedules: ${error.message}`)
    }

    return {
      success: true,
      message:
        flushed > 0
          ? `Workspace data uploaded to Supabase (${flushed} deletion${flushed === 1 ? '' : 's'} synced)!`
          : 'Workspace data successfully uploaded to Supabase!',
      deletedCount: flushed,
      uploadedCounts: {
        lands: lands.length,
        crops: crops.length,
        categories: categories.length,
        fertilizers: fertilizers.length,
        transactions: transactions.length,
        fertilizerApplications: applications.length,
      },
    }
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : 'Upload to Supabase failed.',
    }
  }
}

export async function downloadSupabaseToLocal(): Promise<SyncResult> {
  if (!isSupabaseConfigured || !supabase) {
    return { success: false, message: 'Supabase is not configured. Check your environment variables.' }
  }

  try {
    // 1. Flush any pending local deletions first so deleted items are never resurrected
    await flushPendingDeletions()

    const [
      { data: lands, error: landsErr },
      { data: crops, error: cropsErr },
      { data: landCrops, error: lcErr },
      { data: categories, error: catsErr },
      { data: fertilizers, error: fertsErr },
      { data: transactions, error: txErr },
      { data: applications, error: appErr },
    ] = await Promise.all([
      supabase.from('lands').select('*'),
      supabase.from('crops').select('*'),
      supabase.from('land_crops').select('*'),
      supabase.from('categories').select('*'),
      supabase.from('fertilizers').select('*'),
      supabase.from('transactions').select('*'),
      supabase.from('fertilizer_applications').select('*'),
    ])

    if (landsErr) throw new Error(`Lands error: ${landsErr.message}`)
    if (cropsErr) throw new Error(`Crops error: ${cropsErr.message}`)
    if (lcErr) throw new Error(`Land crops error: ${lcErr.message}`)
    if (catsErr) throw new Error(`Categories error: ${catsErr.message}`)
    if (fertsErr) throw new Error(`Fertilizers error: ${fertsErr.message}`)
    if (txErr) throw new Error(`Transactions error: ${txErr.message}`)
    if (appErr) throw new Error(`Fertilizer schedules error: ${appErr.message}`)

    // 2. Load current local records & any remaining tombstones for timestamp-aware merge
    const [
      localLands,
      localCrops,
      localLandCrops,
      localCategories,
      localFertilizers,
      localTransactions,
      localApps,
      delLands,
      delCrops,
      delLandCrops,
      delCategories,
      delFertilizers,
      delTransactions,
      delApps,
    ] = await Promise.all([
      db.lands.toArray(),
      db.crops.toArray(),
      db.landCrops.toArray(),
      db.categories.toArray(),
      db.fertilizers.toArray(),
      db.transactions.toArray(),
      db.fertilizerApplications.toArray(),
      getPendingDeletionIds('lands'),
      getPendingDeletionIds('crops'),
      getPendingDeletionIds('land_crops'),
      getPendingDeletionIds('categories'),
      getPendingDeletionIds('fertilizers'),
      getPendingDeletionIds('transactions'),
      getPendingDeletionIds('fertilizer_applications'),
    ])

    const recLands = reconcileRecords(
      localLands,
      (lands || []).map((l) => toCamelCase(l) as unknown as Land),
      delLands
    )
    const recCrops = reconcileRecords(
      localCrops,
      (crops || []).map((c) => toCamelCase(c) as unknown as Crop),
      delCrops
    )
    const recLandCrops = reconcileRecords(
      localLandCrops,
      (landCrops || []).map((lc) => toCamelCase(lc) as unknown as LandCrop),
      delLandCrops
    )
    const recCategories = reconcileRecords(
      localCategories,
      (categories || []).map((cat) => toCamelCase(cat) as unknown as Category),
      delCategories
    )
    const recFertilizers = reconcileRecords(
      localFertilizers,
      (fertilizers || []).map((f) => toCamelCase(f) as unknown as Fertilizer),
      delFertilizers
    )
    const recTransactions = reconcileRecords(
      localTransactions,
      (transactions || []).map((t) => toCamelCase(t) as unknown as Transaction),
      delTransactions
    )
    const recApps = reconcileRecords(
      localApps,
      (applications || []).map((a) => toCamelCase(a) as unknown as FertilizerApplication),
      delApps
    )

    await db.transaction(
      'rw',
      [
        db.lands,
        db.crops,
        db.landCrops,
        db.categories,
        db.fertilizers,
        db.transactions,
        db.fertilizerApplications,
      ],
      async () => {
        if (recLands.toPutLocal.length > 0) await db.lands.bulkPut(recLands.toPutLocal)
        if (recCrops.toPutLocal.length > 0) await db.crops.bulkPut(recCrops.toPutLocal)
        if (recLandCrops.toPutLocal.length > 0) await db.landCrops.bulkPut(recLandCrops.toPutLocal)
        if (recCategories.toPutLocal.length > 0) await db.categories.bulkPut(recCategories.toPutLocal)
        if (recFertilizers.toPutLocal.length > 0) await db.fertilizers.bulkPut(recFertilizers.toPutLocal)
        if (recTransactions.toPutLocal.length > 0) await db.transactions.bulkPut(recTransactions.toPutLocal)
        if (recApps.toPutLocal.length > 0) await db.fertilizerApplications.bulkPut(recApps.toPutLocal)
      }
    )

    return {
      success: true,
      message: 'Workspace data safely merged from Supabase (newer local edits preserved)!',
      downloadedCounts: {
        lands: recLands.toPutLocal.length,
        crops: recCrops.toPutLocal.length,
        categories: recCategories.toPutLocal.length,
        fertilizers: recFertilizers.toPutLocal.length,
        transactions: recTransactions.toPutLocal.length,
        fertilizerApplications: recApps.toPutLocal.length,
      },
    }
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : 'Download from Supabase failed.',
    }
  }
}

/**
 * Full bi-directional reconciliation:
 * 1. Flushes queued local deletions to Supabase
 * 2. Pulls and merges newer remote records into Dexie without overwriting newer local edits
 * 3. Pushes local-only or newer local records to Supabase
 */
export async function syncWorkspace(): Promise<SyncResult> {
  if (!isSupabaseConfigured || !supabase) {
    return { success: false, message: 'Supabase is not configured.' }
  }

  const down = await downloadSupabaseToLocal()
  if (!down.success) return down

  const up = await uploadLocalToSupabase()
  if (!up.success) return up

  return {
    success: true,
    message: 'Workspace synchronized bi-directionally with Supabase.',
    deletedCount: up.deletedCount,
    uploadedCounts: up.uploadedCounts,
    downloadedCounts: down.downloadedCounts,
  }
}
