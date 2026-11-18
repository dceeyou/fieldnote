import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  reconcileRecords,
  toSnakeCase,
  toCamelCase,
  DELETE_SYNC_ORDER,
} from '../src/services/syncService.ts'
import { diffLandCropAssociations } from '../src/services/landService.ts'
import type { LandCrop } from '../src/data/db/schema.ts'

describe('Unified Dexie ↔ Supabase Sync Reconciliation (STB-01)', () => {
  it('merges local-only and remote-only records without dropping unsynced local rows', () => {
    const local = [
      { id: 'tx-local', updatedAt: '2026-11-18T10:00:00Z', amount: 5000 },
    ]
    const remote = [
      { id: 'tx-remote', updatedAt: '2026-11-17T10:00:00Z', amount: 12000 },
    ]

    const result = reconcileRecords(local, remote)
    assert.equal(result.merged.length, 2)
    assert.deepEqual(result.toUpload.map((r) => r.id), ['tx-local'])
    assert.deepEqual(result.toPutLocal.map((r) => r.id), ['tx-remote'])
  })

  it('resolves edit conflicts deterministically using updatedAt (newest wins)', () => {
    const local = [
      { id: 'tx-1', updatedAt: '2026-11-18T12:00:00Z', amount: 9900 }, // newer locally
      { id: 'tx-2', updatedAt: '2026-11-18T08:00:00Z', amount: 1000 }, // older locally
      { id: 'tx-3', updatedAt: '2026-11-18T09:00:00Z', amount: 3000 }, // identical
    ]
    const remote = [
      { id: 'tx-1', updatedAt: '2026-11-18T09:00:00Z', amount: 8000 },
      { id: 'tx-2', updatedAt: '2026-11-18T11:30:00Z', amount: 2500 }, // newer remotely
      { id: 'tx-3', updatedAt: '2026-11-18T09:00:00Z', amount: 3000 },
    ]

    const result = reconcileRecords(local, remote)
    const mergedMap = new Map(result.merged.map((r) => [r.id, r]))

    assert.equal(mergedMap.get('tx-1')?.amount, 9900)
    assert.equal(mergedMap.get('tx-2')?.amount, 2500)
    assert.equal(mergedMap.get('tx-3')?.amount, 3000)

    assert.deepEqual(result.toUpload.map((r) => r.id), ['tx-1'])
    assert.deepEqual(result.toPutLocal.map((r) => r.id), ['tx-2'])
  })

  it('prevents zombie record resurrection when an ID has a pending local deletion tombstone', () => {
    const local = [
      { id: 'tx-keep', updatedAt: '2026-11-18T10:00:00Z', amount: 5000 },
    ]
    const remote = [
      { id: 'tx-keep', updatedAt: '2026-11-18T10:00:00Z', amount: 5000 },
      { id: 'tx-deleted-offline', updatedAt: '2026-11-18T11:00:00Z', amount: 7500 },
    ]
    const pendingDeletedIds = new Set(['tx-deleted-offline'])

    const result = reconcileRecords(local, remote, pendingDeletedIds)
    assert.deepEqual(result.merged.map((r) => r.id), ['tx-keep'])
    assert.equal(result.toPutLocal.length, 0)
  })

  it('converts objects cleanly between camelCase and snake_case', () => {
    const camel = { id: '1', landId: 'l-1', nextDueDate: '2026-12-01', notes: undefined }
    const snake = toSnakeCase(camel)
    assert.equal(snake.land_id, 'l-1')
    assert.equal(snake.next_due_date, '2026-12-01')
    assert.equal(snake.notes, null)

    const back = toCamelCase(snake)
    assert.equal(back.landId, 'l-1')
    assert.equal(back.nextDueDate, '2026-12-01')
    assert.equal('notes' in back, false)
  })

  it('deletes child tables before parent tables to respect PostgreSQL FK constraints', () => {
    const idxApp = DELETE_SYNC_ORDER.indexOf('fertilizer_applications')
    const idxTx = DELETE_SYNC_ORDER.indexOf('transactions')
    const idxLandCrops = DELETE_SYNC_ORDER.indexOf('land_crops')
    const idxLands = DELETE_SYNC_ORDER.indexOf('lands')
    const idxCrops = DELETE_SYNC_ORDER.indexOf('crops')
    const idxCats = DELETE_SYNC_ORDER.indexOf('categories')
    const idxFerts = DELETE_SYNC_ORDER.indexOf('fertilizers')

    assert.ok(idxApp < idxLands && idxApp < idxCrops && idxApp < idxFerts)
    assert.ok(idxTx < idxLands && idxTx < idxCrops && idxTx < idxCats)
    assert.ok(idxLandCrops < idxLands && idxLandCrops < idxCrops)
  })
})

describe('Land-Crop Association Diffing (Zero Orphan Duplicates)', () => {
  it('preserves existing row IDs for unchanged crops and only deletes removed or duplicate rows', () => {
    const existing: LandCrop[] = [
      { id: 'lc-1', landId: 'land-1', cropId: 'crop-a', isActive: true, createdAt: '2026-01-01', updatedAt: '2026-01-01' },
      { id: 'lc-2', landId: 'land-1', cropId: 'crop-b', isActive: true, createdAt: '2026-01-01', updatedAt: '2026-01-01' },
      { id: 'lc-dup', landId: 'land-1', cropId: 'crop-a', isActive: true, createdAt: '2026-01-02', updatedAt: '2026-01-02' },
    ]

    const diff = diffLandCropAssociations(existing, ['crop-a', 'crop-c', 'crop-c'])
    assert.deepEqual(diff.toKeep.map((r) => r.id), ['lc-1'])
    assert.deepEqual(diff.toRemoveIds.sort(), ['lc-2', 'lc-dup'])
    assert.deepEqual(diff.cropIdsToAdd, ['crop-c'])
  })
})
