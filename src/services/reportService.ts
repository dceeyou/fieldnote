import { getTransactions } from './transactionService.ts'
import { getAllCategories } from './categoryService.ts'
import { getAllLands } from './landService.ts'
import { getAllCrops } from './cropService.ts'
import type { Transaction } from '../data/db/schema.ts'

export interface MonthSummary {
  month: string // YYYY-MM
  income: number
  expense: number
  net: number
  transactionCount: number
}

export interface EntityFinancialSummary {
  id: string
  name: string
  income: number
  expense: number
  net: number
  transactionCount: number
  percentageOfExpense?: number
  percentageOfIncome?: number
}

export async function getMonthlyFinancials(year?: string): Promise<MonthSummary[]> {
  const allTx = await getTransactions()
  const filtered = year ? allTx.filter((t) => t.date.startsWith(year)) : allTx

  const monthMap = new Map<string, { income: number; expense: number; count: number }>()

  for (const tx of filtered) {
    const month = tx.date.slice(0, 7) // YYYY-MM
    const current = monthMap.get(month) || { income: 0, expense: 0, count: 0 }
    if (tx.type === 'income') {
      current.income += tx.amount
    } else {
      current.expense += tx.amount
    }
    current.count += 1
    monthMap.set(month, current)
  }

  const result: MonthSummary[] = []
  for (const [month, data] of monthMap.entries()) {
    result.push({
      month,
      income: Math.round(data.income * 100) / 100,
      expense: Math.round(data.expense * 100) / 100,
      net: Math.round((data.income - data.expense) * 100) / 100,
      transactionCount: data.count,
    })
  }

  return result.sort((a, b) => b.month.localeCompare(a.month))
}

export async function getCategoryFinancials(
  transactions: Transaction[],
  type: 'income' | 'expense'
): Promise<EntityFinancialSummary[]> {
  const categories = await getAllCategories(true)
  const catMap = new Map(categories.map((c) => [c.id, c.name]))

  const filtered = transactions.filter((t) => t.type === type)
  const totalAmount = filtered.reduce((sum, t) => sum + t.amount, 0)

  const groupMap = new Map<string, { amount: number; count: number }>()
  for (const tx of filtered) {
    const current = groupMap.get(tx.categoryId) || { amount: 0, count: 0 }
    current.amount += tx.amount
    current.count += 1
    groupMap.set(tx.categoryId, current)
  }

  const list: EntityFinancialSummary[] = []
  for (const [catId, val] of groupMap.entries()) {
    const rounded = Math.round(val.amount * 100) / 100
    const pct = totalAmount > 0 ? Math.round((rounded / totalAmount) * 1000) / 10 : 0
    list.push({
      id: catId,
      name: catMap.get(catId) || 'Unknown Category',
      income: type === 'income' ? rounded : 0,
      expense: type === 'expense' ? rounded : 0,
      net: type === 'income' ? rounded : -rounded,
      transactionCount: val.count,
      percentageOfIncome: type === 'income' ? pct : undefined,
      percentageOfExpense: type === 'expense' ? pct : undefined,
    })
  }

  return list.sort((a, b) => (type === 'income' ? b.income - a.income : b.expense - a.expense))
}

export async function getLandFinancials(
  transactions: Transaction[]
): Promise<EntityFinancialSummary[]> {
  const lands = await getAllLands(true)
  const landMap = new Map(lands.map((l) => [l.id, l.name]))

  const groupMap = new Map<string, { income: number; expense: number; count: number }>()

  for (const tx of transactions) {
    const current = groupMap.get(tx.landId) || { income: 0, expense: 0, count: 0 }
    if (tx.type === 'income') {
      current.income += tx.amount
    } else {
      current.expense += tx.amount
    }
    current.count += 1
    groupMap.set(tx.landId, current)
  }

  const list: EntityFinancialSummary[] = []
  for (const [landId, val] of groupMap.entries()) {
    const inc = Math.round(val.income * 100) / 100
    const exp = Math.round(val.expense * 100) / 100
    list.push({
      id: landId,
      name: landMap.get(landId) || 'Unknown Land',
      income: inc,
      expense: exp,
      net: Math.round((inc - exp) * 100) / 100,
      transactionCount: val.count,
    })
  }

  return list.sort((a, b) => b.net - a.net)
}

export async function getCropFinancials(
  transactions: Transaction[]
): Promise<EntityFinancialSummary[]> {
  const crops = await getAllCrops(true)
  const cropMap = new Map(crops.map((c) => [c.id, c.name]))

  const cropTx = transactions.filter((t) => !!t.cropId)
  const groupMap = new Map<string, { income: number; expense: number; count: number }>()

  for (const tx of cropTx) {
    const cropId = tx.cropId!
    const current = groupMap.get(cropId) || { income: 0, expense: 0, count: 0 }
    if (tx.type === 'income') {
      current.income += tx.amount
    } else {
      current.expense += tx.amount
    }
    current.count += 1
    groupMap.set(cropId, current)
  }

  const list: EntityFinancialSummary[] = []
  for (const [cropId, val] of groupMap.entries()) {
    const inc = Math.round(val.income * 100) / 100
    const exp = Math.round(val.expense * 100) / 100
    list.push({
      id: cropId,
      name: cropMap.get(cropId) || 'Unknown Crop',
      income: inc,
      expense: exp,
      net: Math.round((inc - exp) * 100) / 100,
      transactionCount: val.count,
    })
  }

  return list.sort((a, b) => b.net - a.net)
}
