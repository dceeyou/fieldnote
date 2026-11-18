import { db } from '../data/db/database.ts'
import type { Fertilizer } from '../data/db/schema.ts'
import { fertilizerInputSchema, type FertilizerInput } from '../domain/validation.ts'
import { syncUpsertRecord, syncDeleteRecord } from './syncService.ts'

export async function getAllFertilizers(includeInactive = false): Promise<Fertilizer[]> {
  if (includeInactive) {
    return db.fertilizers.toArray()
  }
  return db.fertilizers.filter((f) => f.isActive).toArray()
}

export async function getFertilizerById(id: string): Promise<Fertilizer | undefined> {
  return db.fertilizers.get(id)
}

export async function getFertilizerReferenceCount(id: string): Promise<number> {
  return db.fertilizerApplications.where('fertilizerId').equals(id).count()
}

export async function saveFertilizer(input: FertilizerInput, id?: string): Promise<Fertilizer> {
  const validated = fertilizerInputSchema.parse(input)
  const now = new Date().toISOString()

  const fertilizerRecord: Fertilizer = {
    id: id || crypto.randomUUID(),
    name: validated.name,
    type: validated.type || undefined,
    defaultUnit: validated.defaultUnit || undefined,
    notes: validated.notes || undefined,
    isActive: validated.isActive ?? true,
    createdAt: now,
    updatedAt: now,
  }

  if (id) {
    const existing = await db.fertilizers.get(id)
    if (existing) {
      fertilizerRecord.createdAt = existing.createdAt
    }
    await db.fertilizers.put(fertilizerRecord)
  } else {
    await db.fertilizers.add(fertilizerRecord)
  }

  await syncUpsertRecord('fertilizers', fertilizerRecord as unknown as Record<string, unknown>)

  return fertilizerRecord
}

export async function deactivateFertilizer(id: string): Promise<void> {
  const now = new Date().toISOString()
  await db.fertilizers.update(id, {
    isActive: false,
    updatedAt: now,
  })
  const updated = await db.fertilizers.get(id)
  if (updated) {
    await syncUpsertRecord('fertilizers', updated as unknown as Record<string, unknown>)
  }
}

export async function deleteFertilizer(
  id: string
): Promise<{ deleted: boolean; archived: boolean; message: string }> {
  const refCount = await getFertilizerReferenceCount(id)

  if (refCount > 0) {
    await deactivateFertilizer(id)
    return {
      deleted: false,
      archived: true,
      message: `Product is referenced by ${refCount} historical application schedule(s) and has been safely archived instead of deleted.`,
    }
  }

  await db.fertilizers.delete(id)
  await syncDeleteRecord('fertilizers', id)

  return {
    deleted: true,
    archived: false,
    message: 'Fertilizer product deleted successfully.',
  }
}
