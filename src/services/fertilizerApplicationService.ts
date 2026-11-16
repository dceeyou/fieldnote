import { db } from '../data/db/database.ts'
import type { FertilizerApplication } from '../data/db/schema.ts'
import {
  fertilizerApplicationInputSchema,
  type FertilizerApplicationInput,
} from '../domain/validation.ts'

export interface FertilizerAppFilters {
  landId?: string
  cropId?: string
  fertilizerId?: string
  status?: 'all' | 'scheduled' | 'completed' | 'cancelled'
}

export async function getFertilizerApplications(
  filters: FertilizerAppFilters = {}
): Promise<FertilizerApplication[]> {
  let items = await db.fertilizerApplications.toArray()

  items = items.filter((app) => {
    if (filters.landId && filters.landId !== 'all' && app.landId !== filters.landId) return false
    if (filters.cropId && filters.cropId !== 'all' && app.cropId !== filters.cropId) return false
    if (filters.fertilizerId && filters.fertilizerId !== 'all' && app.fertilizerId !== filters.fertilizerId)
      return false
    if (filters.status && filters.status !== 'all' && app.status !== filters.status) return false
    return true
  })

  // Sort by nextDueDate ascending (urgent first), then applicationDate descending
  return items.sort((a, b) => {
    if (a.nextDueDate && b.nextDueDate) {
      return a.nextDueDate.localeCompare(b.nextDueDate)
    }
    if (a.nextDueDate) return -1
    if (b.nextDueDate) return 1
    return b.applicationDate.localeCompare(a.applicationDate)
  })
}

export async function getActiveScheduledApplications(): Promise<FertilizerApplication[]> {
  return db.fertilizerApplications
    .where('status')
    .equals('scheduled')
    .toArray()
}

export async function saveFertilizerApplication(
  input: FertilizerApplicationInput,
  id?: string
): Promise<FertilizerApplication> {
  const validated = fertilizerApplicationInputSchema.parse(input)
  const now = new Date().toISOString()

  const appRecord: FertilizerApplication = {
    id: id || crypto.randomUUID(),
    landId: validated.landId,
    cropId: validated.cropId,
    fertilizerId: validated.fertilizerId,
    applicationDate: validated.applicationDate,
    quantity: validated.quantity ?? undefined,
    unit: validated.unit || undefined,
    cost: validated.cost ?? undefined,
    reminderInterval: validated.reminderInterval || undefined,
    nextDueDate: validated.nextDueDate || undefined,
    status: validated.status || 'scheduled',
    actualCompletedDate: validated.actualCompletedDate || undefined,
    notes: validated.notes || undefined,
    createdAt: now,
    updatedAt: now,
  }

  if (id) {
    const existing = await db.fertilizerApplications.get(id)
    if (existing) {
      appRecord.createdAt = existing.createdAt
    }
    await db.fertilizerApplications.put(appRecord)
  } else {
    await db.fertilizerApplications.add(appRecord)
  }

  return appRecord
}

export async function markApplicationCompleted(
  id: string,
  actualCompletedDate: string,
  nextDueDate?: string,
  reminderInterval?: string
): Promise<void> {
  const existing = await db.fertilizerApplications.get(id)
  if (!existing) return

  const now = new Date().toISOString()

  await db.transaction('rw', db.fertilizerApplications, async () => {
    // Update current application to completed
    await db.fertilizerApplications.update(id, {
      status: 'completed',
      actualCompletedDate,
      updatedAt: now,
    })

    // If nextDueDate is supplied, automatically create the next scheduled application record
    if (nextDueDate) {
      const nextApp: FertilizerApplication = {
        id: crypto.randomUUID(),
        landId: existing.landId,
        cropId: existing.cropId,
        fertilizerId: existing.fertilizerId,
        applicationDate: actualCompletedDate,
        quantity: existing.quantity,
        unit: existing.unit,
        cost: existing.cost,
        reminderInterval: reminderInterval ?? existing.reminderInterval,
        nextDueDate,
        status: 'scheduled',
        notes: existing.notes ? `Follow-up from previous application: ${existing.notes}` : undefined,
        createdAt: now,
        updatedAt: now,
      }
      await db.fertilizerApplications.add(nextApp)
    }
  })
}

export async function cancelFertilizerApplication(id: string): Promise<void> {
  await db.fertilizerApplications.update(id, {
    status: 'cancelled',
    updatedAt: new Date().toISOString(),
  })
}

export async function deleteFertilizerApplication(id: string): Promise<void> {
  await db.fertilizerApplications.delete(id)
}
