import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_INCOME_CATEGORIES,
  ALL_DEFAULT_CATEGORIES,
  normalizeCategoryName,
  stringSimilarity,
  auditCategoryDuplicates,
  suggestCategory,
  generateCategoryCsvTemplate,
  parseCategoryCsv,
  validateCategoryRows,
  summarizeCategoryImport,
} from '../src/domain/category.ts'
import { categoryInputSchema } from '../src/domain/validation.ts'
import type { Category, Transaction } from '../src/data/db/schema.ts'

describe('Category Validation Schema', () => {
  it('validates a correct category input', () => {
    const input = {
      name: 'Fertilizer & Nutrients',
      type: 'expense' as const,
      description: 'Soil fertilizers and amendments',
      keywords: ['urea', 'compost', 'npk'],
      isActive: true,
      sortOrder: 1,
    }
    const validated = categoryInputSchema.parse(input)
    assert.equal(validated.name, 'Fertilizer & Nutrients')
    assert.equal(validated.type, 'expense')
    assert.equal(validated.keywords?.length, 3)
  })

  it('rejects an empty category name', () => {
    assert.throws(
      () =>
        categoryInputSchema.parse({
          name: '   ',
          type: 'expense',
        }),
      /Category name is required/
    )
  })

  it('rejects invalid transaction type', () => {
    assert.throws(
      () =>
        categoryInputSchema.parse({
          name: 'Testing',
          type: 'invalid_type',
        }),
      /Invalid/
    )
  })
})

describe('Recommended Default Category Library', () => {
  it('contains the exact 17 recommended expense categories', () => {
    assert.equal(DEFAULT_EXPENSE_CATEGORIES.length, 17)
    const names = DEFAULT_EXPENSE_CATEGORIES.map((c) => c.name)

    const expectedExpenses = [
      'Fertilizer & Nutrients',
      'Seeds & Planting Materials',
      'Labour & Wages',
      'Land Preparation & Maintenance',
      'Irrigation & Water Management',
      'Tools & Equipment',
      'Machinery & Tractor Expenses',
      'Transport & Delivery',
      'Infrastructure & Construction',
      'Repairs & Maintenance',
      'Pest & Disease Control',
      'Worker Meals & Welfare',
      'Utilities & Fuel',
      'Harvesting & Packaging',
      'Soil Testing & Consultancy',
      'Land Rental & Lease',
      'Administrative & Miscellaneous',
    ]

    for (const exp of expectedExpenses) {
      assert.ok(names.includes(exp), `Missing expense category: ${exp}`)
    }
  })

  it('contains the exact 8 recommended income categories', () => {
    assert.equal(DEFAULT_INCOME_CATEGORIES.length, 8)
    const names = DEFAULT_INCOME_CATEGORIES.map((c) => c.name)

    const expectedIncomes = [
      'Tea Sales',
      'Coconut Sales',
      'Ginger Sales',
      'Black Pepper Sales',
      'Other Crop Sales',
      'Seedling & Plant Sales',
      'Agricultural By-product Sales',
      'Other Farm Income',
    ]

    for (const inc of expectedIncomes) {
      assert.ok(names.includes(inc), `Missing income category: ${inc}`)
    }
  })

  it('provides keyword triggers for every default category', () => {
    for (const cat of ALL_DEFAULT_CATEGORIES) {
      assert.ok(cat.keywords.length > 0, `Category "${cat.name}" has no keywords`)
      assert.ok(cat.description.length > 0, `Category "${cat.name}" has no description`)
    }
  })
})

describe('Duplicate Category Detection & Audit Engine', () => {
  it('normalizes category names and handles common spelling variations', () => {
    assert.equal(normalizeCategoryName('Labour & Wages'), normalizeCategoryName('Labor & Wages'))
    assert.equal(normalizeCategoryName('Fertiliser & Nutrients'), normalizeCategoryName('Fertilizer & Nutrients'))
    assert.equal(normalizeCategoryName('  seeds  &  seedlings  '), 'seeds and seedlings')
  })

  it('computes high similarity for slight spelling differences', () => {
    const sim = stringSimilarity('Labour & Wages', 'Labor and Wages')
    assert.ok(sim >= 0.9, `Expected similarity >= 0.9, got ${sim}`)
  })

  it('detects duplicate clusters and calculates linked transaction impact', () => {
    const mockCategories: Category[] = [
      {
        id: 'cat-1',
        name: 'Labor & Wages',
        type: 'expense',
        isActive: true,
        sortOrder: 1,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
      {
        id: 'cat-2',
        name: 'Labour & Wages',
        type: 'expense',
        isActive: true,
        sortOrder: 2,
        createdAt: '2026-01-02T00:00:00Z',
        updatedAt: '2026-01-02T00:00:00Z',
      },
      {
        id: 'cat-3',
        name: 'Tea Sales',
        type: 'income',
        isActive: true,
        sortOrder: 3,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
    ]

    const mockTransactions: Transaction[] = [
      {
        id: 'tx-1',
        date: '2026-11-01',
        type: 'expense',
        landId: 'land-1',
        categoryId: 'cat-1',
        description: 'Payment 1',
        amount: 5000,
        source: 'manual',
        createdAt: '2026-11-01T00:00:00Z',
        updatedAt: '2026-11-01T00:00:00Z',
      },
      {
        id: 'tx-2',
        date: '2026-11-02',
        type: 'expense',
        landId: 'land-1',
        categoryId: 'cat-2',
        description: 'Payment 2',
        amount: 3000,
        source: 'manual',
        createdAt: '2026-11-02T00:00:00Z',
        updatedAt: '2026-11-02T00:00:00Z',
      },
    ]

    const audit = auditCategoryDuplicates(mockCategories, mockTransactions)
    assert.equal(audit.duplicateGroupCount, 1)
    assert.equal(audit.affectedTransactionsCount, 2)

    const group = audit.groups[0]
    assert.equal(group.candidates.length, 2)
    assert.ok(['spelling_variation', 'similar', 'exact'].includes(group.matchType))
  })
})

describe('Intelligent Transaction Category Suggestions', () => {
  const categories: Category[] = [
    {
      id: 'cat-fert',
      name: 'Fertilizer & Nutrients',
      type: 'expense',
      keywords: ['urea', 'compost', 'fertilizer', 'fertiliser', 'dolomite'],
      isActive: true,
      sortOrder: 1,
      createdAt: '',
      updatedAt: '',
    },
    {
      id: 'cat-labour',
      name: 'Labour & Wages',
      type: 'expense',
      keywords: ['labour', 'labor', 'wages', 'worker payment', 'daily wage'],
      isActive: true,
      sortOrder: 2,
      createdAt: '',
      updatedAt: '',
    },
    {
      id: 'cat-ginger',
      name: 'Ginger Sales',
      type: 'income',
      keywords: ['ginger harvest', 'ginger sales', 'fresh ginger'],
      isActive: true,
      sortOrder: 3,
      createdAt: '',
      updatedAt: '',
    },
    {
      id: 'cat-archived',
      name: 'Old Inactive Category',
      type: 'expense',
      keywords: ['obsolete'],
      isActive: false,
      sortOrder: 4,
      createdAt: '',
      updatedAt: '',
    },
  ]

  const crops = [{ id: 'crop-ginger', name: 'Ginger' }]

  it('suggests "Fertilizer & Nutrients" with high confidence when urea keyword is mentioned', () => {
    const res = suggestCategory({
      description: 'Purchased 2 bags of urea for field',
      type: 'expense',
      categories,
    })
    assert.ok(res)
    assert.equal(res?.categoryId, 'cat-fert')
    assert.equal(res?.confidence, 'high')
  })

  it('suggests "Labour & Wages" when daily wage is mentioned', () => {
    const res = suggestCategory({
      description: 'Worker payment for weeding and daily wage',
      type: 'expense',
      categories,
    })
    assert.ok(res)
    assert.equal(res?.categoryId, 'cat-labour')
    assert.equal(res?.confidence, 'high')
  })

  it('suggests "Ginger Sales" using crop context for income transaction', () => {
    const res = suggestCategory({
      description: 'Harvest collection wholesale payment',
      type: 'income',
      cropId: 'crop-ginger',
      categories,
      crops,
    })
    assert.ok(res)
    assert.equal(res?.categoryId, 'cat-ginger')
  })

  it('never recommends an archived or inactive category', () => {
    const res = suggestCategory({
      description: 'Bought obsolete item',
      type: 'expense',
      categories,
    })
    assert.equal(res, null)
  })

  it('strictly respects transaction type (does not recommend income category for expense)', () => {
    const res = suggestCategory({
      description: 'Sold fresh ginger',
      type: 'expense', // wrong type
      categories,
    })
    assert.equal(res, null)
  })
})

describe('CSV Category Import, Validation & Templates', () => {
  it('generates a valid CSV template containing standard column headers', () => {
    const template = generateCategoryCsvTemplate()
    assert.ok(template.includes('Category Name,Type,Description,Keywords'))
    assert.ok(template.includes('Fertilizer & Nutrients,Expense'))
    assert.ok(template.includes('Ginger Sales,Income'))
  })

  it('parses valid CSV text into structured rows', () => {
    const csv = [
      'Category Name,Type,Description,Keywords',
      'Tools & Equipment,Expense,Hand tools,"shovel;spade;knife"',
      'Tea Sales,Income,Factory leaf sales,"green leaf;tea harvest"',
    ].join('\n')

    const rows = parseCategoryCsv(csv)
    assert.equal(rows.length, 2)
    assert.equal(rows[0].name, 'Tools & Equipment')
    assert.equal(rows[0].type, 'Expense')
    assert.equal(rows[1].name, 'Tea Sales')
  })

  it('validates rows, detects duplicates in-file, and identifies existing database categories', () => {
    const existing: Category[] = [
      {
        id: 'cat-1',
        name: 'Tools & Equipment',
        type: 'expense',
        isActive: true,
        sortOrder: 1,
        createdAt: '',
        updatedAt: '',
      },
    ]

    const rawRows = [
      { name: 'Tools & Equipment', type: 'Expense' }, // exists in DB
      { name: 'Labour & Wages', type: 'Expense' }, // valid
      { name: 'labour & wages', type: 'Expense' }, // in-file duplicate
      { name: 'Invalid Category', type: 'unknown_type' }, // invalid type
      { name: '', type: 'Income' }, // missing name
    ]

    const validated = validateCategoryRows(rawRows, existing)
    assert.equal(validated.length, 5)

    assert.equal(validated[0].isExistingInDb, true)
    assert.equal(validated[0].isValid, false)

    assert.equal(validated[1].isValid, true)

    assert.equal(validated[2].isDuplicateInFile, true)
    assert.equal(validated[2].isValid, false)

    assert.equal(validated[3].isValid, false)
    assert.equal(validated[4].isValid, false)

    const summary = summarizeCategoryImport(validated)
    assert.equal(summary.totalRows, 5)
    assert.equal(summary.validCount, 1)
    assert.equal(summary.duplicateInFileCount, 1)
    assert.equal(summary.existingInDbCount, 1)
  })
})
