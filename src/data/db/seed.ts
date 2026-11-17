import { db } from './database.ts'
import type { Category, Crop, Land } from './schema.ts'
import { ALL_DEFAULT_CATEGORIES } from '../../domain/category.ts'

const now = new Date().toISOString()

export const DEFAULT_CATEGORIES: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>[] =
  ALL_DEFAULT_CATEGORIES.map((c, idx) => ({
    name: c.name,
    type: c.type,
    description: c.description,
    keywords: c.keywords,
    isActive: true,
    sortOrder: idx + 1,
  }))

export const DEFAULT_CROPS: Omit<Crop, 'id' | 'createdAt' | 'updatedAt'>[] = [
  { name: 'Ginger', description: 'High-value rhizome cash crop', isActive: true },
  { name: 'Coconut', description: 'Perennial plantation crop', isActive: true },
  { name: 'Tea', description: 'Commercial tea plantation', isActive: true },
  { name: 'Black Pepper', description: 'Spice vine cultivation', isActive: true },
]

export async function seedDatabaseIfEmpty(): Promise<void> {
  const categoryCount = await db.categories.count()
  if (categoryCount === 0) {
    const categoriesToInsert: Category[] = DEFAULT_CATEGORIES.map((cat) => ({
      ...cat,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    }))
    await db.categories.bulkAdd(categoriesToInsert)
  }

  const cropCount = await db.crops.count()
  if (cropCount === 0) {
    const cropsToInsert: Crop[] = DEFAULT_CROPS.map((crop) => ({
      ...crop,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    }))
    await db.crops.bulkAdd(cropsToInsert)
  }

  const landCount = await db.lands.count()
  if (landCount === 0) {
    // Optionally create a default starter land
    const defaultLand: Land = {
      id: crypto.randomUUID(),
      name: 'Main Estate',
      location: 'Central Province',
      areaValue: 2,
      areaUnit: 'acre',
      areaInAcres: 2,
      notes: 'Initial default cultivation land',
      isActive: true,
      createdAt: now,
      updatedAt: now,
    }
    await db.lands.add(defaultLand)

    // Associate first crop to default land
    const firstCrop = await db.crops.toCollection().first()
    if (firstCrop) {
      await db.landCrops.add({
        id: crypto.randomUUID(),
        landId: defaultLand.id,
        cropId: firstCrop.id,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      })
    }
  }
}
