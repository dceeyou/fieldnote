import Papa from 'papaparse'
import type { Category, Transaction } from '../data/db/schema.ts'

export interface CategoryTemplateItem {
  name: string
  type: 'income' | 'expense'
  description: string
  keywords: string[]
}

/**
 * Curated 17 Expense Categories per specifications
 */
export const DEFAULT_EXPENSE_CATEGORIES: CategoryTemplateItem[] = [
  {
    name: 'Fertilizer & Nutrients',
    type: 'expense',
    description: 'Organic and chemical fertilizers, compost and soil amendments',
    keywords: ['fertilizer', 'fertiliser', 'compost', 'dolomite', 'NPK', 'manure', 'urea', 'nutrients'],
  },
  {
    name: 'Seeds & Planting Materials',
    type: 'expense',
    description: 'Seeds, seedlings and planting materials',
    keywords: ['seeds', 'seedlings', 'pepper plants', 'tea plants', 'ginger seeds', 'planting materials', 'nursery'],
  },
  {
    name: 'Labour & Wages',
    type: 'expense',
    description: 'Daily worker payments and contracted labour',
    keywords: ['labour', 'labor', 'wages', 'worker payment', 'daily wage', 'workers', 'salary'],
  },
  {
    name: 'Land Preparation & Maintenance',
    type: 'expense',
    description: 'Land clearing, digging, pruning and weeding',
    keywords: ['land clearing', 'digging', 'pruning', 'weeding', 'tilling', 'ploughing', 'maintenance'],
  },
  {
    name: 'Irrigation & Water Management',
    type: 'expense',
    description: 'Water systems, pumps and irrigation materials',
    keywords: ['well water', 'irrigation', 'water pump', 'water barrel', 'pipes', 'drip', 'sprinkler', 'watering'],
  },
  {
    name: 'Tools & Equipment',
    type: 'expense',
    description: 'Agricultural tools and equipment purchases',
    keywords: ['agricultural tools', 'spade', 'shovel', 'equipment', 'mammoty', 'sprayers', 'knife', 'secateurs'],
  },
  {
    name: 'Machinery & Tractor Expenses',
    type: 'expense',
    description: 'Tractor hire, machinery rental and repairs',
    keywords: ['tractor hire', 'machinery rental', 'harvester', 'rotavator', 'tractor', 'machinery'],
  },
  {
    name: 'Transport & Delivery',
    type: 'expense',
    description: 'Agricultural material transportation and delivery',
    keywords: ['transport', 'delivery', 'vehicle hire', 'lorry', 'freight', 'haulage'],
  },
  {
    name: 'Infrastructure & Construction',
    type: 'expense',
    description: 'Wells, fencing and agricultural structures',
    keywords: ['well rings', 'fence', 'construction', 'building', 'shed', 'greenhouse', 'barbed wire', 'gate'],
  },
  {
    name: 'Repairs & Maintenance',
    type: 'expense',
    description: 'Repairs to existing facilities and equipment',
    keywords: ['equipment repair', 'fence repair', 'maintenance', 'servicing', 'fixing', 'pump repair'],
  },
  {
    name: 'Pest & Disease Control',
    type: 'expense',
    description: 'Pesticides, fungicides and pest treatments',
    keywords: ['pesticide', 'fungicide', 'insecticide', 'pest treatments', 'chemical spray', 'weedicide'],
  },
  {
    name: 'Worker Meals & Welfare',
    type: 'expense',
    description: 'Food, refreshments and worker welfare',
    keywords: ['worker meals', 'groceries for workers', 'refreshments', 'worker welfare', 'tea', 'lunch'],
  },
  {
    name: 'Utilities & Fuel',
    type: 'expense',
    description: 'Electricity, petrol, diesel and fuel',
    keywords: ['petrol', 'diesel', 'fuel', 'electricity', 'kerosene', 'utility', 'power'],
  },
  {
    name: 'Harvesting & Packaging',
    type: 'expense',
    description: 'Harvesting supplies, bags and packaging',
    keywords: ['harvest bags', 'packaging materials', 'sacks', 'crates', 'boxes', 'twine', 'packing'],
  },
  {
    name: 'Soil Testing & Consultancy',
    type: 'expense',
    description: 'Soil testing and agricultural consultation',
    keywords: ['soil testing', 'agronomy consultation', 'soil analysis', 'consultant', 'lab test'],
  },
  {
    name: 'Land Rental & Lease',
    type: 'expense',
    description: 'Agricultural land rental payments',
    keywords: ['land rent', 'lease payment', 'land lease', 'annual rent'],
  },
  {
    name: 'Administrative & Miscellaneous',
    type: 'expense',
    description: 'General farm administration and other costs',
    keywords: ['administrative', 'miscellaneous', 'permits', 'accounting', 'legal', 'general expenses', 'other costs'],
  },
]

/**
 * Curated 8 Income Categories per specifications
 */
export const DEFAULT_INCOME_CATEGORIES: CategoryTemplateItem[] = [
  {
    name: 'Tea Sales',
    type: 'income',
    description: 'Tea leaves and tea harvest sales',
    keywords: ['tea leaves', 'tea harvest', 'tea sales', 'green leaf', 'factory tea'],
  },
  {
    name: 'Coconut Sales',
    type: 'income',
    description: 'Coconut harvest sales',
    keywords: ['coconut harvest', 'coconut sales', 'copra', 'fresh coconut', 'nuts sold'],
  },
  {
    name: 'Ginger Sales',
    type: 'income',
    description: 'Fresh ginger sales',
    keywords: ['ginger harvest', 'ginger sales', 'fresh ginger', 'raw ginger'],
  },
  {
    name: 'Black Pepper Sales',
    type: 'income',
    description: 'Black pepper harvest sales',
    keywords: ['pepper harvest', 'black pepper sales', 'pepper sales', 'peppercorns', 'dry pepper'],
  },
  {
    name: 'Other Crop Sales',
    type: 'income',
    description: 'Sales from additional crops',
    keywords: ['other crop sales', 'vegetable sales', 'fruit sales', 'banana', 'papaya', 'crop sales'],
  },
  {
    name: 'Seedling & Plant Sales',
    type: 'income',
    description: 'Sales of seedlings and plants',
    keywords: ['seedlings sold', 'plants sold', 'nursery sales', 'plant sales', 'grafts'],
  },
  {
    name: 'Agricultural By-product Sales',
    type: 'income',
    description: 'Compost and other agricultural by-products',
    keywords: ['compost sold', 'agricultural by-products', 'husk sales', 'manure sales', 'firewood', 'by-product'],
  },
  {
    name: 'Other Farm Income',
    type: 'income',
    description: 'Other agricultural income',
    keywords: ['other farm income', 'subsidies', 'grants', 'compensation', 'tours', 'rental income'],
  },
]

export const ALL_DEFAULT_CATEGORIES: CategoryTemplateItem[] = [
  ...DEFAULT_EXPENSE_CATEGORIES,
  ...DEFAULT_INCOME_CATEGORIES,
]

// ============================================================================
// String Normalization & Similarity
// ============================================================================

/**
 * Normalizes a category name for consistent deduplication and comparison.
 */
export function normalizeCategoryName(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\blabor\b/g, 'labour')
    .replace(/\bfertiliser\b/g, 'fertilizer')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Computes Levenshtein distance between two strings.
 */
export function levenshteinDistance(a: string, b: string): number {
  const m = a.length
  const n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))

  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1]
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
      }
    }
  }

  return dp[m][n]
}

/**
 * Calculates string similarity ratio between 0.0 and 1.0.
 */
export function stringSimilarity(a: string, b: string): number {
  const normA = normalizeCategoryName(a)
  const normB = normalizeCategoryName(b)
  if (normA === normB) return 1.0

  const maxLen = Math.max(normA.length, normB.length)
  if (maxLen === 0) return 1.0

  const dist = levenshteinDistance(normA, normB)
  return 1.0 - dist / maxLen
}

// ============================================================================
// Duplicate Category Audit
// ============================================================================

export interface DuplicateCandidate {
  category: Category
  transactionCount: number
  totalAmount: number
  isRecommendedCanonical: boolean
}

export interface DuplicateAuditGroup {
  groupId: string
  normalizedName: string
  type: 'income' | 'expense' | 'mixed'
  matchType: 'exact' | 'case_insensitive' | 'spelling_variation' | 'similar'
  candidates: DuplicateCandidate[]
  recommendedCanonicalId: string
}

export interface CategoryAuditReport {
  totalCategories: number
  duplicateGroupCount: number
  affectedTransactionsCount: number
  groups: DuplicateAuditGroup[]
}

/**
 * Audits a collection of categories and transactions to identify duplicate candidates.
 */
export function auditCategoryDuplicates(
  categories: Category[],
  transactions: Transaction[]
): CategoryAuditReport {
  // 1. Compute usage statistics for each category
  const txCountMap = new Map<string, number>()
  const txAmountMap = new Map<string, number>()

  for (const tx of transactions) {
    txCountMap.set(tx.categoryId, (txCountMap.get(tx.categoryId) || 0) + 1)
    txAmountMap.set(tx.categoryId, (txAmountMap.get(tx.categoryId) || 0) + tx.amount)
  }

  // 2. Group by normalized name and type
  const processed = new Set<string>()
  const groups: DuplicateAuditGroup[] = []

  for (let i = 0; i < categories.length; i++) {
    const catA = categories[i]
    if (processed.has(catA.id)) continue

    const cluster: Category[] = [catA]
    let matchType: DuplicateAuditGroup['matchType'] = 'exact'

    for (let j = i + 1; j < categories.length; j++) {
      const catB = categories[j]
      if (processed.has(catB.id)) continue

      // Must be same type or we flag cross-type conflict
      const isSameType = catA.type === catB.type
      const normA = normalizeCategoryName(catA.name)
      const normB = normalizeCategoryName(catB.name)

      if (catA.name.trim().toLowerCase() === catB.name.trim().toLowerCase()) {
        cluster.push(catB)
        processed.add(catB.id)
        if (catA.name !== catB.name && matchType === 'exact') {
          matchType = 'case_insensitive'
        }
      } else if (isSameType && normA === normB) {
        cluster.push(catB)
        processed.add(catB.id)
        matchType = 'spelling_variation'
      } else if (isSameType && stringSimilarity(catA.name, catB.name) >= 0.85) {
        cluster.push(catB)
        processed.add(catB.id)
        matchType = 'similar'
      }
    }

    if (cluster.length > 1) {
      processed.add(catA.id)

      // Determine canonical candidate
      // Priority: Active > highest tx count > oldest created > has description
      const candidates: DuplicateCandidate[] = cluster.map((c) => ({
        category: c,
        transactionCount: txCountMap.get(c.id) || 0,
        totalAmount: txAmountMap.get(c.id) || 0,
        isRecommendedCanonical: false,
      }))

      candidates.sort((a, b) => {
        // Active preferred
        if (a.category.isActive !== b.category.isActive) {
          return a.category.isActive ? -1 : 1
        }
        // More transactions preferred
        if (a.transactionCount !== b.transactionCount) {
          return b.transactionCount - a.transactionCount
        }
        // Preferred spellings: "Labour & Wages", "Fertilizer & Nutrients"
        const aNorm = normalizeCategoryName(a.category.name)
        if (aNorm.includes('labour') && a.category.name.includes('Labour')) return -1
        if (aNorm.includes('fertilizer') && a.category.name.includes('Fertilizer')) return -1
        // Oldest creation preferred
        return a.category.createdAt.localeCompare(b.category.createdAt)
      })

      candidates[0].isRecommendedCanonical = true

      const isMixed = cluster.some((c) => c.type !== cluster[0].type)
      const groupType = isMixed ? 'mixed' : cluster[0].type

      groups.push({
        groupId: `group-${i}`,
        normalizedName: normalizeCategoryName(cluster[0].name),
        type: groupType,
        matchType,
        candidates,
        recommendedCanonicalId: candidates[0].category.id,
      })
    }
  }

  const affectedTransactionsCount = groups.reduce((acc, g) => {
    return acc + g.candidates.reduce((cAcc, c) => cAcc + c.transactionCount, 0)
  }, 0)

  return {
    totalCategories: categories.length,
    duplicateGroupCount: groups.length,
    affectedTransactionsCount,
    groups,
  }
}

// ============================================================================
// Intelligent Transaction Category Suggestions
// ============================================================================

export interface SuggestionContext {
  description: string
  type: 'income' | 'expense'
  cropId?: string
  cropName?: string
  categories: Category[]
  crops?: { id: string; name: string }[]
}

export interface CategorySuggestion {
  categoryId: string
  categoryName: string
  confidence: 'high' | 'medium' | 'low'
  reason: string
  matchedKeyword?: string
}

/**
 * Intelligent local rule-based category recommendation engine.
 * Matches description tokens, category keywords, and crop context.
 */
export function suggestCategory(ctx: SuggestionContext): CategorySuggestion | null {
  const { description, type, cropId, categories, crops = [] } = ctx
  const trimmedDesc = description.trim()
  if (!trimmedDesc && !cropId) return null

  const activeCategories = categories.filter((c) => c.isActive && c.type === type)
  if (activeCategories.length === 0) return null

  const normalizedDesc = normalizeCategoryName(trimmedDesc)
  const descWords = normalizedDesc.split(' ').filter(Boolean)

  let resolvedCropName = ctx.cropName || ''
  if (!resolvedCropName && cropId) {
    resolvedCropName = crops.find((c) => c.id === cropId)?.name || ''
  }
  const normalizedCropName = normalizeCategoryName(resolvedCropName)

  // 1. High Confidence: Exact keyword match in description
  for (const cat of activeCategories) {
    const keywords = (cat.keywords || []).map((k) => k.toLowerCase().trim()).filter(Boolean)

    for (const kw of keywords) {
      const normKw = normalizeCategoryName(kw)
      // Exact substring or word match
      const regex = new RegExp(`\\b${normKw}\\b`, 'i')
      if (regex.test(normalizedDesc) || normalizedDesc.includes(normKw)) {
        return {
          categoryId: cat.id,
          categoryName: cat.name,
          confidence: 'high',
          reason: `Matched keyword "${kw}" in description`,
          matchedKeyword: kw,
        }
      }
    }

    // Exact Category Name match in description
    const normCatName = normalizeCategoryName(cat.name)
    if (normalizedDesc.includes(normCatName)) {
      return {
        categoryId: cat.id,
        categoryName: cat.name,
        confidence: 'high',
        reason: `Matched category name "${cat.name}" in description`,
      }
    }
  }

  // 2. Medium Confidence: Crop context match (especially for income sales)
  if (normalizedCropName) {
    for (const cat of activeCategories) {
      const normCatName = normalizeCategoryName(cat.name)
      if (normCatName.includes(normalizedCropName)) {
        return {
          categoryId: cat.id,
          categoryName: cat.name,
          confidence: 'medium',
          reason: `Recommended based on selected crop "${resolvedCropName}"`,
        }
      }
    }
  }

  // 3. Medium Confidence: Partial token / word match across keywords or category name
  let bestCandidate: { cat: Category; score: number; reason: string } | null = null

  for (const cat of activeCategories) {
    const normCatName = normalizeCategoryName(cat.name)
    const catWords = normCatName.split(' ').filter((w) => w.length > 2)
    const keywords = (cat.keywords || []).map((k) => normalizeCategoryName(k))

    let score = 0
    let matchReason = ''

    for (const dWord of descWords) {
      if (dWord.length < 3) continue // Ignore short words

      if (catWords.includes(dWord)) {
        score += 2
        matchReason = `Matched word "${dWord}" in category name`
      }

      for (const kw of keywords) {
        if (kw.includes(dWord)) {
          score += 1
          if (!matchReason) matchReason = `Matched word "${dWord}" in keywords`
        }
      }
    }

    if (score > 0 && (!bestCandidate || score > bestCandidate.score)) {
      bestCandidate = { cat, score, reason: matchReason }
    }
  }

  if (bestCandidate && bestCandidate.score >= 2) {
    return {
      categoryId: bestCandidate.cat.id,
      categoryName: bestCandidate.cat.name,
      confidence: 'medium',
      reason: bestCandidate.reason,
    }
  }

  if (bestCandidate && bestCandidate.score === 1) {
    return {
      categoryId: bestCandidate.cat.id,
      categoryName: bestCandidate.cat.name,
      confidence: 'low',
      reason: bestCandidate.reason,
    }
  }

  return null
}

// ============================================================================
// CSV Category Import & Parsing
// ============================================================================

export interface RawCsvCategoryRow {
  name: string
  type: string
  description?: string
  keywords?: string
}

export interface ValidatedCategoryImportRow {
  index: number
  name: string
  type: 'income' | 'expense'
  description?: string
  keywords: string[]
  isValid: boolean
  errors: string[]
  warnings: string[]
  isDuplicateInFile: boolean
  isExistingInDb: boolean
  isSimilarToExisting: boolean
  matchedDbCategoryName?: string
  excluded: boolean
}

export interface CategoryImportSummary {
  totalRows: number
  validCount: number
  duplicateInFileCount: number
  existingInDbCount: number
  similarWarningCount: number
  invalidCount: number
  readyToImportCount: number
}

/**
 * Generates downloadable CSV category template text.
 */
export function generateCategoryCsvTemplate(): string {
  return [
    'Category Name,Type,Description,Keywords',
    'Fertilizer & Nutrients,Expense,Organic and chemical fertilizers,"fertilizer;fertiliser;compost;dolomite;NPK"',
    'Labour & Wages,Expense,Daily worker payments,"labour;labor;wages;worker payment"',
    'Ginger Sales,Income,Fresh ginger sales,"ginger sales;ginger harvest"',
    'Coconut Sales,Income,Coconut harvest sales,"coconut sales;coconut harvest"',
  ].join('\n')
}

/**
 * Parses raw CSV lines handling quoted fields, commas and semicolons using PapaParse.
 */
export function parseCategoryCsv(csvText: string): RawCsvCategoryRow[] {
  const parsed = Papa.parse<string[]>(csvText, {
    skipEmptyLines: true,
  })

  const lines: string[][] = parsed.data as string[][]
  if (!lines || lines.length < 2) return []

  // Check header row
  const headers = lines[0].map((h: string) => (h || '').toLowerCase().replace(/[^a-z0-9]/g, ''))
  const nameIdx = headers.findIndex((h: string) => h.includes('name') || h.includes('category'))
  const typeIdx = headers.findIndex((h: string) => h === 'type' || h.includes('type'))
  const descIdx = headers.findIndex((h: string) => h.includes('desc'))
  const kwIdx = headers.findIndex((h: string) => h.includes('keyword'))

  if (nameIdx === -1 || typeIdx === -1) {
    throw new Error('CSV is missing required headers: "Category Name" and "Type"')
  }

  const results: RawCsvCategoryRow[] = []

  for (let i = 1; i < lines.length; i++) {
    const row = lines[i]
    if (!row || row.length === 0) continue
    const name = (row[nameIdx] || '').trim()
    const type = (row[typeIdx] || '').trim()
    const description = descIdx !== -1 ? (row[descIdx] || '').trim() : ''
    const keywords = kwIdx !== -1 ? (row[kwIdx] || '').trim() : ''

    if (name || type) {
      results.push({ name, type, description, keywords })
    }
  }

  return results
}

/**
 * Validates parsed category rows against business rules, existing database records, and in-file duplicates.
 */
export function validateCategoryRows(
  rawRows: RawCsvCategoryRow[],
  existingCategories: Category[]
): ValidatedCategoryImportRow[] {
  const seenInFile = new Set<string>()

  return rawRows.map((row, index) => {
    const errors: string[] = []
    const warnings: string[] = []

    const trimmedName = row.name.trim()
    const rawType = row.type.trim().toLowerCase()

    // 1. Name validation
    if (!trimmedName) {
      errors.push('Category name is required')
    }

    // 2. Type validation
    let validCategoryType: 'income' | 'expense' = 'expense'
    if (rawType === 'income' || rawType === 'in') {
      validCategoryType = 'income'
    } else if (rawType === 'expense' || rawType === 'exp') {
      validCategoryType = 'expense'
    } else {
      errors.push(`Invalid type "${row.type}". Must be "Expense" or "Income"`)
    }

    // 3. Keywords parsing (split by comma, semicolon or newline)
    const keywords = (row.keywords || '')
      .split(/[,;\n]/)
      .map((k) => k.trim())
      .filter(Boolean)

    // 4. In-file duplicate check (case-insensitive)
    const normalizedKey = `${validCategoryType}:${normalizeCategoryName(trimmedName)}`
    let isDuplicateInFile = false
    if (trimmedName && seenInFile.has(normalizedKey)) {
      isDuplicateInFile = true
      errors.push('Duplicate category name in CSV file')
    } else if (trimmedName) {
      seenInFile.add(normalizedKey)
    }

    // 5. Existing in DB check
    let isExistingInDb = false
    let isSimilarToExisting = false
    let matchedDbCategoryName: string | undefined

    if (trimmedName) {
      const exactDbMatch = existingCategories.find(
        (c) =>
          c.type === validCategoryType &&
          c.name.trim().toLowerCase() === trimmedName.toLowerCase()
      )

      if (exactDbMatch) {
        isExistingInDb = true
        errors.push(`Already exists in database: "${exactDbMatch.name}"`)
        matchedDbCategoryName = exactDbMatch.name
      } else {
        // Similar spelling check (e.g. Labour vs Labor)
        const similarMatch = existingCategories.find(
          (c) =>
            c.type === validCategoryType &&
            stringSimilarity(c.name, trimmedName) >= 0.82
        )
        if (similarMatch) {
          isSimilarToExisting = true
          warnings.push(`Similar to existing category: "${similarMatch.name}"`)
          matchedDbCategoryName = similarMatch.name
        }
      }
    }

    const isValid = errors.length === 0

    return {
      index,
      name: trimmedName,
      type: validCategoryType,
      description: row.description?.trim() || undefined,
      keywords,
      isValid,
      errors,
      warnings,
      isDuplicateInFile,
      isExistingInDb,
      isSimilarToExisting,
      matchedDbCategoryName,
      excluded: !isValid,
    }
  })
}

/**
 * Summarizes validated category rows.
 */
export function summarizeCategoryImport(rows: ValidatedCategoryImportRow[]): CategoryImportSummary {
  const totalRows = rows.length
  let validCount = 0
  let duplicateInFileCount = 0
  let existingInDbCount = 0
  let similarWarningCount = 0
  let invalidCount = 0
  let readyToImportCount = 0

  for (const r of rows) {
    if (r.isValid) validCount++
    else invalidCount++

    if (r.isDuplicateInFile) duplicateInFileCount++
    if (r.isExistingInDb) existingInDbCount++
    if (r.isSimilarToExisting) similarWarningCount++
    if (r.isValid && !r.excluded) readyToImportCount++
  }

  return {
    totalRows,
    validCount,
    duplicateInFileCount,
    existingInDbCount,
    similarWarningCount,
    invalidCount,
    readyToImportCount,
  }
}
