import { db } from '../data/db/database.ts'
import type { Crop } from '../data/db/schema.ts'
import { cropInputSchema, type CropInput } from '../domain/validation.ts'
import { syncUpsertRecord } from './syncService.ts'

export async function getAllCrops(includeInactive = false): Promise<Crop[]> {
  if (includeInactive) {
    return db.crops.toArray()
  }
  return db.crops.filter((c) => c.isActive).toArray()
}

export async function saveCrop(input: CropInput, id?: string): Promise<Crop> {
  const validated = cropInputSchema.parse(input)
  const now = new Date().toISOString()

  const cropRecord: Crop = {
    id: id || crypto.randomUUID(),
    name: validated.name,
    description: validated.description || undefined,
    isActive: validated.isActive ?? true,
    createdAt: now,
    updatedAt: now,
  }

  if (id) {
    const existing = await db.crops.get(id)
    if (existing) {
      cropRecord.createdAt = existing.createdAt
    }
    await db.crops.put(cropRecord)
  } else {
    await db.crops.add(cropRecord)
  }

  await syncUpsertRecord('crops', cropRecord as unknown as Record<string, unknown>)

  return cropRecord
}

export async function deactivateCrop(id: string): Promise<void> {
  const now = new Date().toISOString()
  await db.crops.update(id, {
    isActive: false,
    updatedAt: now,
  })
  const updated = await db.crops.get(id)
  if (updated) {
    await syncUpsertRecord('crops', updated as unknown as Record<string, unknown>)
  }
}
