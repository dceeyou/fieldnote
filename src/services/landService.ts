import { db } from '../data/db/database.ts'
import type { Land, LandCrop } from '../data/db/schema.ts'
import { landInputSchema, type LandInput } from '../domain/validation.ts'
import { convertAreaToAcres } from '../utils/calculations.ts'

export interface LandWithCrops extends Land {
  cropIds: string[]
}

export async function getAllLands(includeInactive = false): Promise<Land[]> {
  if (includeInactive) {
    return db.lands.toArray()
  }
  return db.lands.filter((l) => l.isActive).toArray()
}

export async function getLandById(id: string): Promise<Land | undefined> {
  return db.lands.get(id)
}

export async function getLandCrops(landId: string): Promise<string[]> {
  const associations = await db.landCrops.where('landId').equals(landId).and((lc) => lc.isActive).toArray()
  return associations.map((lc) => lc.cropId)
}

export async function getAllLandsWithCrops(includeInactive = false): Promise<LandWithCrops[]> {
  const lands = await getAllLands(includeInactive)
  const allLandCrops = await db.landCrops.filter((lc) => lc.isActive).toArray()

  const map = new Map<string, string[]>()
  for (const lc of allLandCrops) {
    const list = map.get(lc.landId) || []
    list.push(lc.cropId)
    map.set(lc.landId, list)
  }

  return lands.map((land) => ({
    ...land,
    cropIds: map.get(land.id) || [],
  }))
}

export async function saveLand(
  input: LandInput,
  cropIds?: string[],
  id?: string
): Promise<Land> {
  const validated = landInputSchema.parse(input)
  const now = new Date().toISOString()
  const areaInAcres = convertAreaToAcres(validated.areaValue ?? undefined, validated.areaUnit)

  const landId = id || crypto.randomUUID()
  const landRecord: Land = {
    id: landId,
    name: validated.name,
    location: validated.location || undefined,
    areaValue: validated.areaValue ?? undefined,
    areaUnit: validated.areaUnit || undefined,
    areaInAcres,
    notes: validated.notes || undefined,
    isActive: validated.isActive ?? true,
    createdAt: now,
    updatedAt: now,
  }

  await db.transaction('rw', [db.lands, db.landCrops], async () => {
    if (id) {
      const existing = await db.lands.get(id)
      if (existing) {
        landRecord.createdAt = existing.createdAt
      }
      await db.lands.put(landRecord)
    } else {
      await db.lands.add(landRecord)
    }

    if (cropIds !== undefined) {
      // Remove old associations
      await db.landCrops.where('landId').equals(landId).delete()

      // Add new associations
      const newAssociations: LandCrop[] = cropIds.map((cropId) => ({
        id: crypto.randomUUID(),
        landId,
        cropId,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      }))
      if (newAssociations.length > 0) {
        await db.landCrops.bulkAdd(newAssociations)
      }
    }
  })

  return landRecord
}

/**
 * Deactivates a land instead of hard-deleting it to preserve transaction history integrity.
 */
export async function deactivateLand(id: string): Promise<void> {
  await db.lands.update(id, {
    isActive: false,
    updatedAt: new Date().toISOString(),
  })
}
