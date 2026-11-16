import Dexie, { type EntityTable } from 'dexie'
import type { Category, Crop, Fertilizer, FertilizerApplication, ImportBatch, Land, LandCrop, Setting, Transaction } from './schema'

export class AgricultureDatabase extends Dexie {
  lands!: EntityTable<Land, 'id'>
  crops!: EntityTable<Crop, 'id'>
  landCrops!: EntityTable<LandCrop, 'id'>
  categories!: EntityTable<Category, 'id'>
  transactions!: EntityTable<Transaction, 'id'>
  fertilizers!: EntityTable<Fertilizer, 'id'>
  fertilizerApplications!: EntityTable<FertilizerApplication, 'id'>
  importBatches!: EntityTable<ImportBatch, 'id'>
  settings!: EntityTable<Setting, 'key'>

  constructor() {
    super('AgricultureManagement')
    this.version(1).stores({
      lands: 'id, name, isActive',
      crops: 'id, name, isActive',
      landCrops: 'id, landId, cropId, [landId+cropId]',
      categories: 'id, type, isActive, sortOrder',
      transactions: 'id, date, type, landId, cropId, categoryId, importBatchId, [landId+date], [type+date]',
      fertilizers: 'id, name, isActive',
      fertilizerApplications: 'id, landId, cropId, fertilizerId, applicationDate, nextDueDate, status',
      importBatches: 'id, importedAt, status',
      settings: 'key',
    })
  }
}

export const db = new AgricultureDatabase()
