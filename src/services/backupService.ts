import { db } from '../data/db/database.ts'
import type {
  Land,
  Crop,
  LandCrop,
  Category,
  Transaction,
  Fertilizer,
  FertilizerApplication,
  Setting,
} from '../data/db/schema.ts'
import { getTodayColombo } from '../utils/date.ts'

export interface BackupPayload {
  version: number
  appName: string
  exportedAt: string
  data: {
    lands: Land[]
    crops: Crop[]
    landCrops: LandCrop[]
    categories: Category[]
    transactions: Transaction[]
    fertilizers: Fertilizer[]
    fertilizerApplications: FertilizerApplication[]
    settings: Setting[]
  }
}

export async function createBackupPayload(): Promise<BackupPayload> {
  const [
    lands,
    crops,
    landCrops,
    categories,
    transactions,
    fertilizers,
    fertilizerApplications,
    settings,
  ] = await Promise.all([
    db.lands.toArray(),
    db.crops.toArray(),
    db.landCrops.toArray(),
    db.categories.toArray(),
    db.transactions.toArray(),
    db.fertilizers.toArray(),
    db.fertilizerApplications.toArray(),
    db.settings.toArray(),
  ])

  return {
    version: 1,
    appName: 'Fieldnote - Agriculture Management',
    exportedAt: new Date().toISOString(),
    data: {
      lands,
      crops,
      landCrops,
      categories,
      transactions,
      fertilizers,
      fertilizerApplications,
      settings,
    },
  }
}

export async function downloadBackup(): Promise<string> {
  const payload = await createBackupPayload()
  const jsonStr = JSON.stringify(payload, null, 2)
  const blob = new Blob([jsonStr], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = url
  a.download = `fieldnote-backup-${getTodayColombo()}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)

  return a.download
}

export function validateBackup(payload: unknown): { valid: boolean; error?: string; payload?: BackupPayload } {
  if (!payload || typeof payload !== 'object') {
    return { valid: false, error: 'Invalid backup file format: Root is not an object.' }
  }

  const p = payload as Partial<BackupPayload>
  if (p.version !== 1) {
    return { valid: false, error: `Unsupported backup version: ${p.version ?? 'unknown'}. Expected version 1.` }
  }

  if (!p.data || typeof p.data !== 'object') {
    return { valid: false, error: 'Invalid backup payload: missing data tables object.' }
  }

  const requiredTables = [
    'lands',
    'crops',
    'landCrops',
    'categories',
    'transactions',
    'fertilizers',
    'fertilizerApplications',
  ] as const

  for (const table of requiredTables) {
    if (!Array.isArray(p.data[table])) {
      return { valid: false, error: `Invalid backup payload: table "${table}" is missing or not an array.` }
    }
  }

  return { valid: true, payload: p as BackupPayload }
}

export async function restoreFromBackup(payload: BackupPayload): Promise<void> {
  const tables = [
    db.lands,
    db.crops,
    db.landCrops,
    db.categories,
    db.transactions,
    db.fertilizers,
    db.fertilizerApplications,
    db.settings,
  ]

  await db.transaction('rw', tables, async () => {
    // Clear all existing data cleanly
    await Promise.all(tables.map((t) => t.clear()))

    // Populate data from backup
    await Promise.all([
      payload.data.lands.length ? db.lands.bulkAdd(payload.data.lands) : Promise.resolve(),
      payload.data.crops.length ? db.crops.bulkAdd(payload.data.crops) : Promise.resolve(),
      payload.data.landCrops.length ? db.landCrops.bulkAdd(payload.data.landCrops) : Promise.resolve(),
      payload.data.categories.length ? db.categories.bulkAdd(payload.data.categories) : Promise.resolve(),
      payload.data.transactions.length ? db.transactions.bulkAdd(payload.data.transactions) : Promise.resolve(),
      payload.data.fertilizers.length ? db.fertilizers.bulkAdd(payload.data.fertilizers) : Promise.resolve(),
      payload.data.fertilizerApplications.length
        ? db.fertilizerApplications.bulkAdd(payload.data.fertilizerApplications)
        : Promise.resolve(),
      payload.data.settings?.length ? db.settings.bulkAdd(payload.data.settings) : Promise.resolve(),
    ])
  })
}
