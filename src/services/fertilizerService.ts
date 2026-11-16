import { db } from '../data/db/database.ts'
import type { Fertilizer } from '../data/db/schema.ts'
import { fertilizerInputSchema, type FertilizerInput } from '../domain/validation.ts'

export async function getAllFertilizers(includeInactive = false): Promise<Fertilizer[]> {
  if (includeInactive) {
    return db.fertilizers.toArray()
  }
  return db.fertilizers.filter((f) => f.isActive).toArray()
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

  return fertilizerRecord
}

export async function deactivateFertilizer(id: string): Promise<void> {
  await db.fertilizers.update(id, {
    isActive: false,
    updatedAt: new Date().toISOString(),
  })
}
