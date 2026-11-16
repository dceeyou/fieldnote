import type { Transaction } from '../data/db/schema.ts'

/**
 * 1 acre = 160 perches
 */
export const PERCHES_PER_ACRE = 160

/**
 * Normalize an area value into acres.
 */
export function convertAreaToAcres(value?: number, unit?: 'acre' | 'perch'): number | undefined {
  if (value === undefined || value === null || isNaN(value)) return undefined
  if (unit === 'perch') {
    return Number((value / PERCHES_PER_ACRE).toFixed(4))
  }
  return Number(value.toFixed(4))
}

export interface FinancialSummary {
  totalIncome: number
  totalExpenses: number
  netBalance: number
  transactionCount: number
}

/**
 * Calculate financial totals from a list of transactions.
 */
export function calculateFinancialSummary(transactions: Transaction[]): FinancialSummary {
  let totalIncome = 0
  let totalExpenses = 0

  for (const tx of transactions) {
    const amt = Number(tx.amount) || 0
    if (tx.type === 'income') {
      totalIncome += amt
    } else if (tx.type === 'expense') {
      totalExpenses += amt
    }
  }

  return {
    totalIncome: Math.round(totalIncome * 100) / 100,
    totalExpenses: Math.round(totalExpenses * 100) / 100,
    netBalance: Math.round((totalIncome - totalExpenses) * 100) / 100,
    transactionCount: transactions.length,
  }
}

/**
 * Format currency amount into LKR string.
 */
export function formatLKR(amount: number): string {
  return new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}
