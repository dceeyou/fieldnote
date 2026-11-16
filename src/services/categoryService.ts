import { db } from '../data/db/database.ts'
import type { Category } from '../data/db/schema.ts'
import { categoryInputSchema, type CategoryInput } from '../domain/validation.ts'

export async function getAllCategories(includeInactive = false): Promise<Category[]> {
  const collection = includeInactive
    ? db.categories.toCollection()
    : db.categories.filter((c) => c.isActive)
  const items = await collection.toArray()
  return items.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
}

export async function getCategoriesByType(
  type: 'income' | 'expense',
  includeInactive = false
): Promise<Category[]> {
  const all = await getAllCategories(includeInactive)
  return all.filter((c) => c.type === type)
}

export async function saveCategory(input: CategoryInput, id?: string): Promise<Category> {
  const validated = categoryInputSchema.parse(input)
  const now = new Date().toISOString()

  const categoryRecord: Category = {
    id: id || crypto.randomUUID(),
    name: validated.name,
    type: validated.type,
    description: validated.description || undefined,
    isActive: validated.isActive ?? true,
    sortOrder: validated.sortOrder ?? 0,
    createdAt: now,
    updatedAt: now,
  }

  if (id) {
    const existing = await db.categories.get(id)
    if (existing) {
      categoryRecord.createdAt = existing.createdAt
    }
    await db.categories.put(categoryRecord)
  } else {
    await db.categories.add(categoryRecord)
  }

  return categoryRecord
}

export async function deactivateCategory(id: string): Promise<void> {
  await db.categories.update(id, {
    isActive: false,
    updatedAt: new Date().toISOString(),
  })
}
