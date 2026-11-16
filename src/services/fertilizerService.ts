import { db } from '../data/db/database.ts'
import type { Fertilizer } from '../data/db/schema.ts'
import { fertilizerInputSchema, type FertilizerInput } from '../domain/validation.ts'
import { supabase } from '../lib/supabase.ts'

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

  // Direct Supabase synchronization if configured
  if (supabase) {
    try {
      const row = {
        id: fertilizerRecord.id,
        name: fertilizerRecord.name,
        type: fertilizerRecord.type ?? null,
        default_unit: fertilizerRecord.defaultUnit ?? null,
        notes: fertilizerRecord.notes ?? null,
        is_active: fertilizerRecord.isActive,
        created_at: fertilizerRecord.createdAt,
        updated_at: fertilizerRecord.updatedAt,
      }
      await supabase.from('fertilizers').upsert(row)
    } catch (err) {
      console.warn('Direct Supabase sync warning:', err)
    }
  }

  return fertilizerRecord
}

export async function deactivateFertilizer(id: string): Promise<void> {
  const now = new Date().toISOString()
  await db.fertilizers.update(id, {
    isActive: false,
    updatedAt: now,
  })

  if (supabase) {
    try {
      await supabase.from('fertilizers').update({ is_active: false, updated_at: now }).eq('id', id)
    } catch (err) {
      console.warn('Direct Supabase deactivate warning:', err)
    }
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

  if (supabase) {
    try {
      await supabase.from('fertilizers').delete().eq('id', id)
    } catch (err) {
      console.warn('Direct Supabase delete warning:', err)
    }
  }

  return {
    deleted: true,
    archived: false,
    message: 'Fertilizer product deleted successfully.',
  }
}
