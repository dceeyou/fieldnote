import { db } from '../data/db/database.ts'
import type { Land, LandCrop } from '../data/db/schema.ts'
import { landInputSchema, type LandInput } from '../domain/validation.ts'
import { convertAreaToAcres } from '../utils/calculations.ts'
import { syncUpsertRecord, syncUpsertRecords, syncDeleteRecords } from './syncService.ts'

export interface LandWithCrops extends Land {
  cropIds: string[]
}

/**
 * Pure diff helper for land-crop associations.
 * Preserves existing row IDs for unchanged crops to prevent orphaned duplicates in cloud sync.
 */
export function diffLandCropAssociations(
  existing: LandCrop[],
  nextCropIds: string[]
): { toKeep: LandCrop[]; toRemoveIds: string[]; cropIdsToAdd: string[] } {
  const uniqueNext = Array.from(new Set(nextCropIds))
  const nextSet = new Set(uniqueNext)
  const existingByCrop = new Map<string, LandCrop>()
  const toRemoveIds: string[] = []
  const toKeep: LandCrop[] = []

  for (const row of existing) {
    if (nextSet.has(row.cropId) && !existingByCrop.has(row.cropId)) {
      existingByCrop.set(row.cropId, row)
      toKeep.push(row)
    } else {
      toRemoveIds.push(row.id)
    }
  }

  const cropIdsToAdd = uniqueNext.filter((cropId) => !existingByCrop.has(cropId))
  return { toKeep, toRemoveIds, cropIdsToAdd }
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

  let removedAssociationIds: string[] = []
  let addedAssociations: LandCrop[] = []

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
      const existingAssociations = await db.landCrops.where('landId').equals(landId).toArray()
      const diff = diffLandCropAssociations(existingAssociations, cropIds)
      removedAssociationIds = diff.toRemoveIds

      if (removedAssociationIds.length > 0) {
        await db.landCrops.bulkDelete(removedAssociationIds)
      }

      addedAssociations = diff.cropIdsToAdd.map((cropId) => ({
        id: crypto.randomUUID(),
        landId,
        cropId,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      }))
      if (addedAssociations.length > 0) {
        await db.landCrops.bulkAdd(addedAssociations)
      }
    }
  })

  await syncUpsertRecord('lands', landRecord as unknown as Record<string, unknown>)
  if (removedAssociationIds.length > 0) {
    await syncDeleteRecords('land_crops', removedAssociationIds)
  }
  if (addedAssociations.length > 0) {
    await syncUpsertRecords('land_crops', addedAssociations as unknown as Record<string, unknown>[])
  }

  return landRecord
}

/**
 * Deactivates a land instead of hard-deleting it to preserve transaction history integrity.
 */
export async function deactivateLand(id: string): Promise<void> {
  const now = new Date().toISOString()
  await db.lands.update(id, {
    isActive: false,
    updatedAt: now,
  })
  const updated = await db.lands.get(id)
  if (updated) {
    await syncUpsertRecord('lands', updated as unknown as Record<string, unknown>)
  }
}
