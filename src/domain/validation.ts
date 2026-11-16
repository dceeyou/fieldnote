import { z } from 'zod'

const dateRegex = /^\d{4}-\d{2}-\d{2}$/

export const dateStringSchema = z
  .string()
  .regex(dateRegex, { message: 'Date must be in YYYY-MM-DD format' })

export const landInputSchema = z.object({
  name: z.string().trim().min(1, 'Land name is required'),
  location: z.string().trim().optional(),
  areaValue: z.number().positive('Area value must be greater than 0').optional().nullable(),
  areaUnit: z.enum(['acre', 'perch']).optional(),
  notes: z.string().trim().optional(),
  isActive: z.boolean().default(true),
})

export type LandInput = z.infer<typeof landInputSchema>

export const cropInputSchema = z.object({
  name: z.string().trim().min(1, 'Crop name is required'),
  description: z.string().trim().optional(),
  isActive: z.boolean().default(true),
})

export type CropInput = z.infer<typeof cropInputSchema>

export const categoryInputSchema = z.object({
  name: z.string().trim().min(1, 'Category name is required'),
  type: z.enum(['income', 'expense']),
  description: z.string().trim().optional(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
})

export type CategoryInput = z.infer<typeof categoryInputSchema>

export const transactionInputSchema = z.object({
  date: dateStringSchema,
  type: z.enum(['income', 'expense']),
  landId: z.string().trim().min(1, 'Land/Area selection is mandatory'),
  cropId: z.string().trim().optional(),
  categoryId: z.string().trim().min(1, 'Category selection is required'),
  description: z.string().trim().min(1, 'Description is required'),
  amount: z.number().positive('Amount must be greater than 0'),
  paymentMethod: z.string().trim().optional(),
  referenceNumber: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  source: z.enum(['manual', 'import']).default('manual'),
  importBatchId: z.string().optional(),
})

export type TransactionInput = z.infer<typeof transactionInputSchema>

export const fertilizerInputSchema = z.object({
  name: z.string().trim().min(1, 'Fertilizer name is required'),
  type: z.string().trim().optional(),
  defaultUnit: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  isActive: z.boolean().default(true),
})

export type FertilizerInput = z.infer<typeof fertilizerInputSchema>

export const fertilizerApplicationInputSchema = z.object({
  landId: z.string().trim().min(1, 'Land is required'),
  cropId: z.string().trim().min(1, 'Crop is required'),
  fertilizerId: z.string().trim().min(1, 'Fertilizer is required'),
  applicationDate: dateStringSchema,
  quantity: z.number().positive().optional().nullable(),
  unit: z.string().trim().optional(),
  cost: z.number().nonnegative().optional().nullable(),
  reminderInterval: z.string().optional(),
  nextDueDate: dateStringSchema.optional().nullable(),
  status: z.enum(['scheduled', 'completed', 'cancelled']).default('scheduled'),
  actualCompletedDate: dateStringSchema.optional().nullable(),
  notes: z.string().trim().optional(),
})

export type FertilizerApplicationInput = z.infer<typeof fertilizerApplicationInputSchema>
