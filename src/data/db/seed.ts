import { db } from './database.ts'
import type { Category, Crop, Land } from './schema.ts'

const now = new Date().toISOString()

export const DEFAULT_CATEGORIES: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>[] = [
  // Income
  { name: 'Crop Sales', type: 'income', description: 'Proceeds from harvested crops', isActive: true, sortOrder: 1 },
  { name: 'Harvest Sales', type: 'income', description: 'Bulk harvest sales', isActive: true, sortOrder: 2 },
  { name: 'Subsidies & Grants', type: 'income', description: 'Government or institutional support', isActive: true, sortOrder: 3 },
  { name: 'Other Income', type: 'income', description: 'Miscellaneous farm income', isActive: true, sortOrder: 4 },

  // Expense
  { name: 'Fertilizer & Nutrients', type: 'expense', description: 'Organic & chemical fertilizers', isActive: true, sortOrder: 10 },
  { name: 'Seeds & Seedlings', type: 'expense', description: 'Planting material and nursery plants', isActive: true, sortOrder: 11 },
  { name: 'Labor & Wages', type: 'expense', description: 'Daily worker and contracted wages', isActive: true, sortOrder: 12 },
  { name: 'Pest & Weed Control', type: 'expense', description: 'Agrochemicals and weed management', isActive: true, sortOrder: 13 },
  { name: 'Machinery & Fuel', type: 'expense', description: 'Tractor hire, fuel, and equipment', isActive: true, sortOrder: 14 },
  { name: 'Land Prep & Irrigation', type: 'expense', description: 'Tilling, digging, and watering setup', isActive: true, sortOrder: 15 },
  { name: 'Tools & Maintenance', type: 'expense', description: 'Farm tools, servicing and repairs', isActive: true, sortOrder: 16 },
  { name: 'Transport & Storage', type: 'expense', description: 'Haulage and storage costs', isActive: true, sortOrder: 17 },
  { name: 'Other Expense', type: 'expense', description: 'General and unexpected expenses', isActive: true, sortOrder: 18 },
]

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
