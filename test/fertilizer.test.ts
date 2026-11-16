import { describe, it } from 'node:test'
import assert from 'node:assert'
import { fertilizerInputSchema } from '../src/domain/validation.ts'
import type { Fertilizer, FertilizerApplication } from '../src/data/db/schema.ts'

describe('Fertilizer Product Input Validation', () => {
  it('validates a valid fertilizer product input', () => {
    const input = {
      name: 'Urea 46%',
      type: 'Inorganic',
      defaultUnit: 'kg',
      notes: 'High nitrogen source',
      isActive: true,
    }
    const result = fertilizerInputSchema.parse(input)
    assert.strictEqual(result.name, 'Urea 46%')
    assert.strictEqual(result.type, 'Inorganic')
    assert.strictEqual(result.defaultUnit, 'kg')
    assert.strictEqual(result.notes, 'High nitrogen source')
    assert.strictEqual(result.isActive, true)
  })

  it('rejects an empty fertilizer name', () => {
    assert.throws(() => {
      fertilizerInputSchema.parse({
        name: '   ',
        type: 'Inorganic',
        defaultUnit: 'kg',
      })
    })
  })

  it('allows optional type, notes, and defaultUnit', () => {
    const minimal = {
      name: 'Dolomite',
    }
    const result = fertilizerInputSchema.parse(minimal)
    assert.strictEqual(result.name, 'Dolomite')
    assert.strictEqual(result.type, undefined)
    assert.strictEqual(result.notes, undefined)
    assert.strictEqual(result.isActive, true)
  })
})

describe('Fertilizer Product Reference & Archival Rules', () => {
  function checkProductDeletionPolicy(
    product: Fertilizer,
    applications: FertilizerApplication[]
  ): { canDelete: boolean; shouldArchive: boolean; referenceCount: number } {
    const refCount = applications.filter((app) => app.fertilizerId === product.id).length
    if (refCount > 0) {
      return { canDelete: false, shouldArchive: true, referenceCount: refCount }
    }
    return { canDelete: true, shouldArchive: false, referenceCount: 0 }
  }

  it('identifies unreferenced fertilizer products as safe to permanently delete', () => {
    const product: Fertilizer = {
      id: 'fert-unused',
      name: 'Unused Fertilizer Brand',
      isActive: true,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    }
    const applications: FertilizerApplication[] = []

    const policy = checkProductDeletionPolicy(product, applications)
    assert.strictEqual(policy.canDelete, true)
    assert.strictEqual(policy.shouldArchive, false)
    assert.strictEqual(policy.referenceCount, 0)
  })

  it('protects referenced products from permanent deletion and mandates archival', () => {
    const product: Fertilizer = {
      id: 'fert-1',
      name: 'Urea 46%',
      isActive: true,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    }
    const applications: FertilizerApplication[] = [
      {
        id: 'app-1',
        landId: 'land-1',
        cropId: 'crop-1',
        fertilizerId: 'fert-1',
        applicationDate: '2026-11-01',
        status: 'scheduled',
        createdAt: '2026-11-01T00:00:00Z',
        updatedAt: '2026-11-01T00:00:00Z',
      },
    ]

    const policy = checkProductDeletionPolicy(product, applications)
    assert.strictEqual(policy.canDelete, false)
    assert.strictEqual(policy.shouldArchive, true)
    assert.strictEqual(policy.referenceCount, 1)
  })
})
