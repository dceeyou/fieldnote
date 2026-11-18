export interface Timestamped { createdAt: string; updatedAt: string }
export interface Land extends Timestamped { id: string; name: string; location?: string; areaValue?: number; areaUnit?: 'acre' | 'perch'; areaInAcres?: number; notes?: string; isActive: boolean }
export interface Crop extends Timestamped { id: string; name: string; description?: string; isActive: boolean }
export interface LandCrop extends Timestamped { id: string; landId: string; cropId: string; notes?: string; isActive: boolean }
export interface Category extends Timestamped {
  id: string
  name: string
  type: 'income' | 'expense'
  description?: string
  keywords?: string[]
  isActive: boolean
  sortOrder: number
}
export interface Transaction extends Timestamped { id: string; date: string; type: 'income' | 'expense'; landId: string; cropId?: string; categoryId: string; description: string; amount: number; paymentMethod?: string; referenceNumber?: string; notes?: string; source: 'manual' | 'import'; importBatchId?: string }
export interface Fertilizer extends Timestamped { id: string; name: string; type?: string; defaultUnit?: string; notes?: string; isActive: boolean }
export interface FertilizerApplication extends Timestamped {
  id: string
  landId: string
  cropId: string
  fertilizerId: string
  applicationDate: string
  quantity?: number
  unit?: string
  cost?: number
  reminderInterval?: string
  nextDueDate?: string
  status: 'scheduled' | 'completed' | 'cancelled'
  actualCompletedDate?: string
  notes?: string
}
export interface ImportBatch { id: string; fileName: string; fileType: string; importedAt: string; totalRows: number; importedRows: number; skippedRows: number; status: string; notes?: string }
export interface Setting { key: string; value: unknown }

export type SyncableTable =
  | 'lands'
  | 'crops'
  | 'land_crops'
  | 'categories'
  | 'fertilizers'
  | 'transactions'
  | 'fertilizer_applications'

export interface SyncDeletion {
  id: string
  tableName: SyncableTable
  recordId: string
  deletedAt: string
}

export interface SyncUpsert {
  id: string
  tableName: SyncableTable
  recordId: string
  queuedAt: string
}

