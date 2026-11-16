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
} from '../data/db/schema.ts'

export interface SyncResult {
  success: boolean
  message: string
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

// Convert camelCase object to snake_case for Supabase
function toSnakeCase(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, val] of Object.entries(obj)) {
    const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase()
    result[snakeKey] = val !== undefined ? val : null
  }
  return result
}

// Convert snake_case object to camelCase for Dexie
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

export async function uploadLocalToSupabase(): Promise<SyncResult> {
  if (!isSupabaseConfigured || !supabase) {
    return { success: false, message: 'Supabase is not configured. Check your .env.local file.' }
  }

  try {
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

    // Upsert lands
    if (lands.length > 0) {
      const payload = lands.map((l) => toSnakeCase(l as unknown as Record<string, unknown>))
      const { error } = await supabase.from('lands').upsert(payload, { onConflict: 'id' })
      if (error) throw new Error(`Failed to upload lands: ${error.message}`)
    }

    // Upsert crops
    if (crops.length > 0) {
      const payload = crops.map((c) => toSnakeCase(c as unknown as Record<string, unknown>))
      const { error } = await supabase.from('crops').upsert(payload, { onConflict: 'id' })
      if (error) throw new Error(`Failed to upload crops: ${error.message}`)
    }

    // Upsert land_crops
    if (landCrops.length > 0) {
      const payload = landCrops.map((lc) => toSnakeCase(lc as unknown as Record<string, unknown>))
      const { error } = await supabase.from('land_crops').upsert(payload, { onConflict: 'id' })
      if (error) throw new Error(`Failed to upload land crops: ${error.message}`)
    }

    // Upsert categories
    if (categories.length > 0) {
      const payload = categories.map((cat) => toSnakeCase(cat as unknown as Record<string, unknown>))
      const { error } = await supabase.from('categories').upsert(payload, { onConflict: 'id' })
      if (error) throw new Error(`Failed to upload categories: ${error.message}`)
    }

    // Upsert fertilizers
    if (fertilizers.length > 0) {
      const payload = fertilizers.map((f) => toSnakeCase(f as unknown as Record<string, unknown>))
      const { error } = await supabase.from('fertilizers').upsert(payload, { onConflict: 'id' })
      if (error) throw new Error(`Failed to upload fertilizers: ${error.message}`)
    }

    // Upsert transactions
    if (transactions.length > 0) {
      const payload = transactions.map((t) => toSnakeCase(t as unknown as Record<string, unknown>))
      const { error } = await supabase.from('transactions').upsert(payload, { onConflict: 'id' })
      if (error) throw new Error(`Failed to upload transactions: ${error.message}`)
    }

    // Upsert fertilizer applications
    if (applications.length > 0) {
      const payload = applications.map((a) => toSnakeCase(a as unknown as Record<string, unknown>))
      const { error } = await supabase
        .from('fertilizer_applications')
        .upsert(payload, { onConflict: 'id' })
      if (error) throw new Error(`Failed to upload fertilizer schedules: ${error.message}`)
    }

    return {
      success: true,
      message: 'Workspace data successfully uploaded to Supabase!',
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
    return { success: false, message: 'Supabase is not configured. Check your .env.local file.' }
  }

  try {
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
        if (lands && lands.length > 0) {
          const mapped = lands.map((l) => toCamelCase(l) as unknown as Land)
          await db.lands.bulkPut(mapped)
        }
        if (crops && crops.length > 0) {
          const mapped = crops.map((c) => toCamelCase(c) as unknown as Crop)
          await db.crops.bulkPut(mapped)
        }
        if (landCrops && landCrops.length > 0) {
          const mapped = landCrops.map((lc) => toCamelCase(lc) as unknown as LandCrop)
          await db.landCrops.bulkPut(mapped)
        }
        if (categories && categories.length > 0) {
          const mapped = categories.map((cat) => toCamelCase(cat) as unknown as Category)
          await db.categories.bulkPut(mapped)
        }
        if (fertilizers && fertilizers.length > 0) {
          const mapped = fertilizers.map((f) => toCamelCase(f) as unknown as Fertilizer)
          await db.fertilizers.bulkPut(mapped)
        }
        if (transactions && transactions.length > 0) {
          const mapped = transactions.map((t) => toCamelCase(t) as unknown as Transaction)
          await db.transactions.bulkPut(mapped)
        }
        if (applications && applications.length > 0) {
          const mapped = applications.map((a) => toCamelCase(a) as unknown as FertilizerApplication)
          await db.fertilizerApplications.bulkPut(mapped)
        }
      }
    )

    return {
      success: true,
      message: 'Workspace data successfully synchronized from Supabase!',
      downloadedCounts: {
        lands: lands?.length || 0,
        crops: crops?.length || 0,
        categories: categories?.length || 0,
        fertilizers: fertilizers?.length || 0,
        transactions: transactions?.length || 0,
        fertilizerApplications: applications?.length || 0,
      },
    }
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : 'Download from Supabase failed.',
    }
  }
}
