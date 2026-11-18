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
  keywords: z.array(z.string().trim().min(1)).optional().default([]),
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

// ============================================================================
// Single-User Authentication Validation Schemas & Error Helpers
// ============================================================================

export const loginSchema = z.object({
  email: z.string().trim().min(1, 'Email is required').email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

export type LoginInput = z.infer<typeof loginSchema>

export const resetPasswordRequestSchema = z.object({
  email: z.string().trim().min(1, 'Email is required').email('Please enter a valid email address'),
})

export type ResetPasswordRequestInput = z.infer<typeof resetPasswordRequestSchema>

export const updatePasswordSchema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters long'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>

/**
 * Formats Supabase and Auth errors into clear, actionable human-readable messages.
 */
export function formatAuthError(error: unknown): string {
  if (!error) return 'An unexpected authentication error occurred.'
  const msg = typeof error === 'string' ? error : (error as { message?: string })?.message || ''

  const lower = msg.toLowerCase()
  if (lower.includes('invalid login credentials') || lower.includes('invalid credentials')) {
    return 'Invalid email or password. Please verify your administrator credentials.'
  }
  if (lower.includes('email not confirmed')) {
    return 'Your administrator email address has not been confirmed yet in Supabase.'
  }
  if (lower.includes('rate limit')) {
    return 'Too many attempts. Please wait a few moments before trying again.'
  }
  if (lower.includes('user not found')) {
    return 'No administrator account found with that email address.'
  }
  if (lower.includes('network') || lower.includes('fetch failed')) {
    return 'Network connection error. Please check your internet connection.'
  }
  if (lower.includes('password should be at least')) {
    return 'Password must be at least 6 characters long.'
  }
  return msg || 'Authentication request failed. Please try again.'
}

