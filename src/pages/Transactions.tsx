import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Plus,
  Search,
  Filter,
  ArrowDownLeft,
  ArrowUpRight,
  Edit2,
  Trash2,
  Calendar,
  X,
  Receipt,
  Upload,
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  Download,
} from 'lucide-react'
import { Button } from '../components/ui/Button.tsx'
import { Card } from '../components/ui/Card.tsx'
import { Modal } from '../components/ui/Modal.tsx'
import { Input } from '../components/ui/Input.tsx'
import { Select } from '../components/ui/Select.tsx'
import { DatePicker } from '../components/ui/date-picker.tsx'
import { ExportModal } from '../components/export/ExportModal.tsx'
import {
  getTransactions,
  saveTransaction,
  deleteTransaction,
  bulkDeleteTransactions,
  type TransactionFilters,
} from '../services/transactionService.ts'
import { getAllLandsWithCrops, type LandWithCrops } from '../services/landService.ts'
import { getAllCrops } from '../services/cropService.ts'
import { getAllCategories } from '../services/categoryService.ts'
import { suggestCategory } from '../domain/category.ts'
import { CategorySuggestionBadge } from '../components/categories/CategorySuggestionBadge.tsx'
import {
  parseCsvText,
  detectColumnMapping,
  checkDuplicate,
  saveImportedTransactions,
  type StagedTransactionRow,
} from '../services/importService.ts'
import type { Transaction, Crop, Category } from '../data/db/schema.ts'
import {
  calculateFinancialSummary,
  formatLKR,
} from '../utils/calculations.ts'
import {
  getTodayColombo,
  getCurrentMonthColombo,
  formatDateDisplay,
} from '../utils/date.ts'

export function Transactions() {
  const [searchParams] = useSearchParams()
  const initialType = (searchParams.get('type') as 'income' | 'expense') || 'all'
  const initialLand = searchParams.get('landId') || 'all'
  const initialCrop = searchParams.get('cropId') || 'all'
  const initialCat = searchParams.get('categoryId') || 'all'
  const initialMonth = searchParams.get('month') // e.g. "2026-11"

  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [lands, setLands] = useState<LandWithCrops[]>([])
  const [crops, setCrops] = useState<Crop[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  // Filters State
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>(initialType)
  const [landFilter, setLandFilter] = useState(initialLand)
  const [cropFilter, setCropFilter] = useState(initialCrop)
  const [categoryFilter, setCategoryFilter] = useState(initialCat)
  const [datePreset, setDatePreset] = useState<'all' | 'this_month' | 'custom'>(
    initialMonth ? 'custom' : 'this_month'
  )
  const [startDate, setStartDate] = useState(() => {
    if (initialMonth) return `${initialMonth}-01`
    return `${getCurrentMonthColombo()}-01`
  })
  const [endDate, setEndDate] = useState(() => {
    if (initialMonth) {
      const [y, m] = initialMonth.split('-').map(Number)
      const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate()
      return `${initialMonth}-${String(lastDay).padStart(2, '0')}`
    }
    return getTodayColombo()
  })

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTx, setEditingTx] = useState<Transaction | null>(null)

  // Form Fields
  const [txDate, setTxDate] = useState(getTodayColombo())
  const [txType, setTxType] = useState<'income' | 'expense'>('expense')
  const [txLandId, setTxLandId] = useState('')
  const [txCropId, setTxCropId] = useState('')
  const [txCategoryId, setTxCategoryId] = useState('')
  const [txDescription, setTxDescription] = useState('')
  const [txAmount, setTxAmount] = useState('')
  const [txPaymentMethod, setTxPaymentMethod] = useState('')
  const [txReference, setTxReference] = useState('')
  const [txNotes, setTxNotes] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Import State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [importFileName, setImportFileName] = useState('')
  const [stagedRows, setStagedRows] = useState<StagedTransactionRow[]>([])
  const [importError, setImportError] = useState<string | null>(null)
  const [importSuccess, setImportSuccess] = useState<string | null>(null)
  const [defaultImportLandId, setDefaultImportLandId] = useState('')
  const [isImporting, setIsImporting] = useState(false)

  // Bulk Selection State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkDeleteSuccess, setBulkDeleteSuccess] = useState<string | null>(null)
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)

  // Export State
  const [isExportModalOpen, setIsExportModalOpen] = useState(false)

  // Quick lookup maps
  const landMap = useMemo(() => new Map(lands.map((l) => [l.id, l.name])), [lands])
  const cropMap = useMemo(() => new Map(crops.map((c) => [c.id, c.name])), [crops])
  const categoryMap = useMemo(() => new Map(categories.map((c) => [c.id, c.name])), [categories])

  async function loadMetadata() {
    const [allLands, allCrops, allCats] = await Promise.all([
      getAllLandsWithCrops(true),
      getAllCrops(true),
      getAllCategories(true),
    ])
    setLands(allLands)
    setCrops(allCrops)
    setCategories(allCats)
  }

  async function loadTransactions() {
    setLoading(true)
    try {
      const filters: TransactionFilters = {
        type: typeFilter,
        landId: landFilter,
        cropId: cropFilter,
        categoryId: categoryFilter,
        search: search.trim() || undefined,
      }

      if (datePreset === 'this_month') {
        const currentMonth = getCurrentMonthColombo()
        filters.startDate = `${currentMonth}-01`
        filters.endDate = getTodayColombo()
      } else if (datePreset === 'custom') {
        filters.startDate = startDate || undefined
        filters.endDate = endDate || undefined
      }

      const data = await getTransactions(filters)
      setTransactions(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMetadata()
  }, [])

  useEffect(() => {
    loadTransactions()
  }, [search, typeFilter, landFilter, cropFilter, categoryFilter, datePreset, startDate, endDate])

  const summary = useMemo(() => calculateFinancialSummary(transactions), [transactions])

  // Available categories for current form type
  const activeCategoriesForType = useMemo(
    () => categories.filter((c) => c.isActive && c.type === txType),
    [categories, txType]
  )

  // Suggestion State
  const [dismissedSuggestionForDesc, setDismissedSuggestionForDesc] = useState<string | null>(null)

  const categorySuggestion = useMemo(() => {
    if (!txDescription.trim() && !txCropId) return null
    if (dismissedSuggestionForDesc === txDescription.trim()) return null
    return suggestCategory({
      description: txDescription,
      type: txType,
      cropId: txCropId || undefined,
      categories,
      crops,
    })
  }, [txDescription, txType, txCropId, categories, crops, dismissedSuggestionForDesc])

  // Associated crops for currently selected land in modal
  const cropsForSelectedLand = useMemo(() => {
    if (!txLandId) return crops.filter((c) => c.isActive)
    const selectedLand = lands.find((l) => l.id === txLandId)
    if (!selectedLand || selectedLand.cropIds.length === 0) {
      return crops.filter((c) => c.isActive)
    }
    return crops.filter((c) => c.isActive && selectedLand.cropIds.includes(c.id))
  }, [txLandId, lands, crops])

  function openAddModal() {
    setEditingTx(null)
    setTxDate(getTodayColombo())
    setTxType('expense')
    setTxLandId(lands.find((l) => l.isActive)?.id || '')
    setTxCropId('')
    const defaultCat = categories.find((c) => c.isActive && c.type === 'expense')
    setTxCategoryId(defaultCat?.id || '')
    setTxDescription('')
    setTxAmount('')
    setTxPaymentMethod('Cash')
    setTxReference('')
    setTxNotes('')
    setFormError(null)
    setDismissedSuggestionForDesc(null)
    setIsModalOpen(true)
  }

  function openEditModal(tx: Transaction) {
    setEditingTx(tx)
    setTxDate(tx.date)
    setTxType(tx.type)
    setTxLandId(tx.landId)
    setTxCropId(tx.cropId || '')
    setTxCategoryId(tx.categoryId)
    setTxDescription(tx.description)
    setTxAmount(String(tx.amount))
    setTxPaymentMethod(tx.paymentMethod || '')
    setTxReference(tx.referenceNumber || '')
    setTxNotes(tx.notes || '')
    setFormError(null)
    setDismissedSuggestionForDesc(null)
    setIsModalOpen(true)
  }

  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault()

    // Business Rule Check: Land is strictly mandatory
    if (!txLandId) {
      setFormError('Cultivation land selection is mandatory for every financial transaction.')
      return
    }

    if (!txCategoryId) {
      setFormError('Category selection is required.')
      return
    }

    if (!txDescription.trim()) {
      setFormError('Description is required.')
      return
    }

    const parsedAmount = parseFloat(txAmount)
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setFormError('Amount must be a positive number greater than 0.')
      return
    }

    setIsSaving(true)
    setFormError(null)

    try {
      await saveTransaction(
        {
          date: txDate,
          type: txType,
          landId: txLandId,
          cropId: txCropId || undefined,
          categoryId: txCategoryId,
          description: txDescription.trim(),
          amount: parsedAmount,
          paymentMethod: txPaymentMethod.trim() || undefined,
          referenceNumber: txReference.trim() || undefined,
          notes: txNotes.trim() || undefined,
          source: 'manual',
        },
        editingTx?.id
      )
      setIsModalOpen(false)
      await loadTransactions()
    } catch (err: unknown) {
      if (err instanceof Error) {
        setFormError(err.message)
      } else {
        setFormError('Failed to save transaction.')
      }
    } finally {
      setIsSaving(false)
    }
  }

  const visibleTxIds = useMemo(() => transactions.map((t) => t.id), [transactions])

  const isAllVisibleSelected = useMemo(() => {
    return visibleTxIds.length > 0 && visibleTxIds.every((id) => selectedIds.has(id))
  }, [visibleTxIds, selectedIds])

  const isSomeVisibleSelected = useMemo(() => {
    return visibleTxIds.some((id) => selectedIds.has(id))
  }, [visibleTxIds, selectedIds])

  function toggleSelectAllVisible() {
    if (isAllVisibleSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(visibleTxIds))
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  function clearSelection() {
    setSelectedIds(new Set())
  }

  async function handleBulkDelete() {
    const count = selectedIds.size
    if (count === 0) return

    if (
      !window.confirm(
        `Are you sure you want to delete ${count} selected transaction${
          count > 1 ? 's' : ''
        }? This action cannot be undone.`
      )
    ) {
      return
    }

    setIsBulkDeleting(true)
    setBulkDeleteSuccess(null)
    try {
      await bulkDeleteTransactions(Array.from(selectedIds))
      setSelectedIds(new Set())
      setBulkDeleteSuccess(`Successfully deleted ${count} transaction${count > 1 ? 's' : ''}.`)
      await loadTransactions()
    } finally {
      setIsBulkDeleting(false)
    }
  }

  async function handleDelete(id: string, desc: string) {
    if (window.confirm(`Delete transaction "${desc}"? This action cannot be undone.`)) {
      await deleteTransaction(id)
      setSelectedIds((prev) => {
        if (prev.has(id)) {
          const next = new Set(prev)
          next.delete(id)
          return next
        }
        return prev
      })
      await loadTransactions()
    }
  }

  function handleCsvFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setImportFileName(file.name)
    setImportError(null)

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string
        const parsedRows = parseCsvText(text)
        if (parsedRows.length < 2) {
          setImportError('CSV file must contain a header row and at least one data row.')
          return
        }

        const headers = parsedRows[0]
        const mapping = detectColumnMapping(headers)
        const defaultExpCat = categories.find((c) => c.isActive && c.type === 'expense')
        const defaultIncCat = categories.find((c) => c.isActive && c.type === 'income')
        const firstLand = lands.find((l) => l.isActive)

        const staged: StagedTransactionRow[] = []

        for (let i = 1; i < parsedRows.length; i++) {
          const row = parsedRows[i]
          if (row.length === 0 || row.every((c) => !c.trim())) continue

          const rawDate = mapping.dateCol !== -1 ? row[mapping.dateCol] : ''
          const rawType = mapping.typeCol !== -1 ? row[mapping.typeCol]?.toLowerCase() : 'expense'
          const rawAmount = mapping.amountCol !== -1 ? row[mapping.amountCol] : '0'
          const rawDesc = mapping.descCol !== -1 ? row[mapping.descCol] : 'Imported transaction'
          const rawLand = mapping.landCol !== -1 ? row[mapping.landCol] : ''
          const rawRef = mapping.refCol !== -1 ? row[mapping.refCol] : ''

          let date = getTodayColombo()
          if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
            date = rawDate
          }

          const isIncome =
            rawType.includes('in') ||
            rawType.includes('credit') ||
            rawType.includes('rev') ||
            rawType.includes('sale')
          const type: 'income' | 'expense' = isIncome ? 'income' : 'expense'

          const cleanAmt = parseFloat(rawAmount.replace(/[^0-9.-]+/g, '')) || 0
          const amount = Math.abs(cleanAmt)

          const matchedLand = lands.find((l) => l.name.toLowerCase() === rawLand?.toLowerCase())
          const landId = matchedLand ? matchedLand.id : firstLand?.id || ''

          const defaultCatId =
            (type === 'income' ? defaultIncCat?.id : defaultExpCat?.id) ||
            categories[0]?.id ||
            ''

          const errors: string[] = []
          if (!landId) errors.push('Land selection is required')
          if (amount <= 0) errors.push('Amount must be positive')
          if (!rawDesc.trim()) errors.push('Description is required')

          const isDuplicate = checkDuplicate(date, amount, type, rawDesc, transactions)

          staged.push({
            index: i,
            date,
            type,
            landId,
            categoryId: defaultCatId,
            description: rawDesc || `Imported ${type}`,
            amount,
            referenceNumber: rawRef || undefined,
            isValid: errors.length === 0,
            validationErrors: errors,
            isDuplicateCandidate: isDuplicate,
          })
        }

        setStagedRows(staged)
      } catch {
        setImportError('Failed to read or parse CSV file.')
      }
    }
    reader.readAsText(file)
  }

  function handleUpdateStagedLand(index: number, newLandId: string) {
    setStagedRows((prev) =>
      prev.map((row) => {
        if (row.index !== index) return row
        const errors = row.validationErrors.filter((err) => err !== 'Land selection is required')
        if (!newLandId) errors.push('Land selection is required')
        return {
          ...row,
          landId: newLandId,
          isValid: errors.length === 0,
          validationErrors: errors,
        }
      })
    )
  }

  function handleApplyDefaultLand(newLandId: string) {
    setDefaultImportLandId(newLandId)
    if (!newLandId) return
    setStagedRows((prev) =>
      prev.map((row) => {
        const errors = row.validationErrors.filter((err) => err !== 'Land selection is required')
        return {
          ...row,
          landId: newLandId,
          isValid: errors.length === 0,
          validationErrors: errors,
        }
      })
    )
  }

  async function handleConfirmImport() {
    const validRows = stagedRows.filter((r) => r.isValid && r.landId)
    if (validRows.length === 0) return

    setIsImporting(true)
    setImportError(null)

    try {
      const count = await saveImportedTransactions(importFileName || 'transactions.csv', validRows)
      setIsImportModalOpen(false)
      setStagedRows([])
      setImportSuccess(`Successfully imported ${count} transactions!`)
      await loadTransactions()
    } catch (err) {
      if (err instanceof Error) {
        setImportError(err.message)
      } else {
        setImportError('Failed to import transactions.')
      }
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl py-8 sm:py-10">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted">Workspace / Transactions</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Transactions</h1>
          <p className="mt-2 text-sm text-muted">
            Track farm income and expenses assigned to each cultivation land.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={() => {
              setImportError(null)
              setStagedRows([])
              setIsImportModalOpen(true)
            }}
          >
            <Upload size={16} /> Import CSV
          </Button>
          <Button
            variant="secondary"
            onClick={() => setIsExportModalOpen(true)}
          >
            <Download size={16} /> Export
          </Button>
          <Button onClick={openAddModal}>
            <Plus size={17} /> Add transaction
          </Button>
        </div>
      </div>

      {importSuccess && (
        <div className="mt-4 rounded-lg border border-forest-200 bg-forest-50 p-4 text-xs font-medium text-forest-800 dark:border-forest-800/40 dark:bg-forest-950/40 dark:text-forest-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-forest-600" />
            <span>{importSuccess}</span>
          </div>
          <button onClick={() => setImportSuccess(null)} className="text-muted hover:text-text">
            &times;
          </button>
        </div>
      )}

      {bulkDeleteSuccess && (
        <div className="mt-4 rounded-lg border border-forest-200 bg-forest-50 p-4 text-xs font-medium text-forest-800 dark:border-forest-800/40 dark:bg-forest-950/40 dark:text-forest-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-forest-600" />
            <span>{bulkDeleteSuccess}</span>
          </div>
          <button onClick={() => setBulkDeleteSuccess(null)} className="text-muted hover:text-text">
            &times;
          </button>
        </div>
      )}

      {/* Summary Stat Bar */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Card className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted uppercase tracking-wider">Filtered Income</p>
            <p className="mt-1 text-xl font-semibold text-forest-600">
              {formatLKR(summary.totalIncome)}
            </p>
          </div>
          <div className="grid size-10 place-items-center rounded-xl bg-forest-50 text-forest-700 dark:bg-forest-700/20 dark:text-forest-100">
            <ArrowDownLeft size={20} />
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted uppercase tracking-wider">Filtered Expenses</p>
            <p className="mt-1 text-xl font-semibold text-amber-600">
              {formatLKR(summary.totalExpenses)}
            </p>
          </div>
          <div className="grid size-10 place-items-center rounded-xl bg-amber-50 text-amber-700 dark:bg-amber-700/20 dark:text-amber-100">
            <ArrowUpRight size={20} />
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted uppercase tracking-wider">Net Balance</p>
            <p
              className={`mt-1 text-xl font-semibold ${
                summary.netBalance >= 0 ? 'text-forest-600' : 'text-red-600'
              }`}
            >
              {formatLKR(summary.netBalance)}
            </p>
          </div>
          <div className="grid size-10 place-items-center rounded-xl bg-subtle text-text">
            <Receipt size={18} />
          </div>
        </Card>
      </div>

      {/* Filter Bar */}
      <Card className="mt-6 p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          {/* Search */}
          <div className="relative sm:col-span-2">
            <Search size={15} className="absolute left-3 top-3 text-muted" />
            <input
              type="text"
              placeholder="Search description, reference, notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface pl-9 pr-8 py-2 text-xs text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-forest-500"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-2.5 text-muted hover:text-text"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Type Filter */}
          <Select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as 'all' | 'income' | 'expense')}
          >
            <option value="all">All Types</option>
            <option value="income">Income Only</option>
            <option value="expense">Expense Only</option>
          </Select>

          {/* Land Filter */}
          <Select value={landFilter} onChange={(e) => setLandFilter(e.target.value)}>
            <option value="all">All Lands</option>
            {lands.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </Select>

          {/* Crop Filter */}
          <Select value={cropFilter} onChange={(e) => setCropFilter(e.target.value)}>
            <option value="all">All Crops</option>
            {crops.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>

          {/* Category Filter */}
          <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="all">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name} ({cat.type})
              </option>
            ))}
          </Select>
        </div>

        {/* Date Filter Row */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-muted font-medium flex items-center gap-1">
              <Calendar size={13} /> Period:
            </span>
            <div className="inline-flex rounded-lg border border-border p-0.5 bg-subtle">
              {(
                [
                  { id: 'this_month', label: 'This Month' },
                  { id: 'all', label: 'All Time' },
                  { id: 'custom', label: 'Custom Range' },
                ] as const
              ).map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setDatePreset(preset.id)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                    datePreset === preset.id
                      ? 'bg-surface text-text shadow-xs font-semibold'
                      : 'text-muted hover:text-text'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {datePreset === 'custom' && (
            <div className="flex flex-wrap items-center gap-2">
              <div className="w-36">
                <DatePicker
                  value={startDate}
                  onChange={(val) => setStartDate(val)}
                  placeholder="From date"
                />
              </div>
              <span className="text-muted text-xs">to</span>
              <div className="w-36">
                <DatePicker
                  value={endDate}
                  onChange={(val) => setEndDate(val)}
                  placeholder="To date"
                  minDate={startDate}
                />
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-forest-300 bg-forest-50/90 p-3.5 text-xs text-forest-900 shadow-xs dark:border-forest-700/60 dark:bg-forest-950/80 dark:text-forest-100">
          <div className="flex flex-wrap items-center gap-2">
            <span className="grid size-6 place-items-center rounded-md bg-forest-600 text-white font-bold text-xs">
              {selectedIds.size}
            </span>
            <span className="font-medium">
              {selectedIds.size === 1
                ? '1 transaction selected'
                : `${selectedIds.size} transactions selected`}
            </span>
            <span className="text-muted">·</span>
            <button
              type="button"
              onClick={toggleSelectAllVisible}
              className="text-forest-700 dark:text-forest-300 underline font-medium hover:text-forest-900 dark:hover:text-forest-100 cursor-pointer"
            >
              {isAllVisibleSelected
                ? 'Deselect visible'
                : `Select all visible (${transactions.length})`}
            </button>
            <button
              type="button"
              onClick={clearSelection}
              className="text-muted hover:text-text font-medium ml-1 cursor-pointer"
            >
              Clear selection
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="danger"
              size="sm"
              onClick={handleBulkDelete}
              disabled={isBulkDeleting}
              className="gap-1.5"
            >
              <Trash2 size={14} />
              {isBulkDeleting
                ? 'Deleting...'
                : `Delete selected (${selectedIds.size})`}
            </Button>
          </div>
        </div>
      )}

      {/* Transactions Table / List */}
      <div className="mt-6">
        {loading ? (
          <div className="py-12 text-center text-sm text-muted">Loading transactions...</div>
        ) : transactions.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="mx-auto grid size-12 place-items-center rounded-xl bg-subtle text-muted">
              <Filter size={22} />
            </div>
            <h3 className="mt-4 font-semibold text-text">No transactions found</h3>
            <p className="mt-1 text-sm text-muted max-w-sm mx-auto">
              No records match your selected filter criteria, or you haven't added any transactions yet.
            </p>
            <div className="mt-5">
              <Button onClick={openAddModal}>
                <Plus size={16} /> Add transaction
              </Button>
            </div>
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border bg-subtle/50 text-xs font-semibold text-muted uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={isAllVisibleSelected}
                        ref={(el) => {
                          if (el) el.indeterminate = isSomeVisibleSelected && !isAllVisibleSelected
                        }}
                        onChange={toggleSelectAllVisible}
                        aria-label="Select all visible transactions"
                        className="size-4 rounded border-border text-forest-600 focus:ring-forest-500 cursor-pointer"
                      />
                    </th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4">Cultivation Land</th>
                    <th className="py-3 px-4">Crop</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4 text-right">Amount (LKR)</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {transactions.map((tx) => {
                    const isIncome = tx.type === 'income'
                    const isSelected = selectedIds.has(tx.id)
                    return (
                      <tr
                        key={tx.id}
                        className={`transition-colors ${
                          isSelected
                            ? 'bg-forest-50/70 dark:bg-forest-950/40 hover:bg-forest-100/70 dark:hover:bg-forest-900/50'
                            : 'hover:bg-subtle/40'
                        }`}
                      >
                        <td className="py-3.5 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(tx.id)}
                            aria-label={`Select transaction ${tx.description}`}
                            className="size-4 rounded border-border text-forest-600 focus:ring-forest-500 cursor-pointer"
                          />
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap text-xs text-muted">
                          {formatDateDisplay(tx.date)}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-medium text-text">{tx.description}</div>
                          {tx.referenceNumber && (
                            <div className="text-[11px] text-muted">
                              Ref: {tx.referenceNumber}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-xs font-medium text-text">
                          {landMap.get(tx.landId) || 'Unknown land'}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-muted">
                          {tx.cropId ? cropMap.get(tx.cropId) || '—' : '—'}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-muted">
                          {categoryMap.get(tx.categoryId) || '—'}
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 font-semibold ${
                              isIncome ? 'text-forest-600' : 'text-amber-700 dark:text-amber-400'
                            }`}
                          >
                            {isIncome ? '+' : '-'} {formatLKR(tx.amount)}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8"
                              aria-label="Edit transaction"
                              onClick={() => openEditModal(tx)}
                            >
                              <Edit2 size={14} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 hover:text-red-500"
                              aria-label="Delete transaction"
                              onClick={() => handleDelete(tx.id, tx.description)}
                            >
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      {/* Add / Edit Transaction Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingTx ? 'Edit Transaction' : 'Record Transaction'}
        description="Enter financial income or expense details. Every transaction must be linked to a land."
      >
        <form onSubmit={handleFormSubmit} className="space-y-4">
          {formError && (
            <div className="rounded-lg bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300">
              {formError}
            </div>
          )}

          {/* Type Toggle */}
          <div className="flex rounded-lg border border-border p-1 bg-subtle">
            <button
              type="button"
              onClick={() => {
                setTxType('expense')
                const firstExpCat = categories.find((c) => c.isActive && c.type === 'expense')
                if (firstExpCat) setTxCategoryId(firstExpCat.id)
              }}
              className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition-all ${
                txType === 'expense'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-muted hover:text-text'
              }`}
            >
              Expense (-)
            </button>
            <button
              type="button"
              onClick={() => {
                setTxType('income')
                const firstIncCat = categories.find((c) => c.isActive && c.type === 'income')
                if (firstIncCat) setTxCategoryId(firstIncCat.id)
              }}
              className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition-all ${
                txType === 'income'
                  ? 'bg-forest-600 text-white shadow-xs'
                  : 'text-muted hover:text-text'
              }`}
            >
              Income (+)
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <DatePicker
              label="Transaction Date"
              value={txDate}
              onChange={(val) => setTxDate(val)}
              required
            />
            <Input
              label="Amount in LKR"
              type="number"
              step="any"
              placeholder="0.00"
              value={txAmount}
              onChange={(e) => setTxAmount(e.target.value)}
              required
            />
          </div>

          {/* Mandatory Cultivation Land Selection */}
          <div className="space-y-1.5">
            <Select
              label="Cultivation Land / Area (Mandatory)"
              value={txLandId}
              onChange={(e) => {
                setTxLandId(e.target.value)
                setTxCropId('') // Reset crop when land changes
              }}
              required
            >
              <option value="">— Select cultivation area —</option>
              {lands
                .filter((l) => l.isActive || l.id === txLandId)
                .map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} {l.location ? `(${l.location})` : ''}
                  </option>
                ))}
            </Select>
            <p className="text-[11px] text-muted">
              Every financial record must be assigned to a cultivation area.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Optional Crop Selection */}
            <Select
              label="Associated Crop (Optional)"
              value={txCropId}
              onChange={(e) => setTxCropId(e.target.value)}
            >
              <option value="">— General / Not crop specific —</option>
              {cropsForSelectedLand.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>

            {/* Category Selection */}
            <Select
              label="Category"
              value={txCategoryId}
              onChange={(e) => setTxCategoryId(e.target.value)}
              required
            >
              <option value="">— Select category —</option>
              {activeCategoriesForType.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </Select>
          </div>

          <Input
            label="Description"
            placeholder="e.g. Purchased 2 sacks of fertilizer, Labor daily wage payment"
            value={txDescription}
            onChange={(e) => setTxDescription(e.target.value)}
            required
          />

          {/* Intelligent Category Recommendation Banner */}
          {categorySuggestion && (
            <CategorySuggestionBadge
              suggestion={categorySuggestion}
              currentCategoryId={txCategoryId}
              onAccept={(catId) => {
                setTxCategoryId(catId)
              }}
              onDismiss={() => {
                setDismissedSuggestionForDesc(txDescription.trim())
              }}
            />
          )}

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Payment Method (Optional)"
              value={txPaymentMethod}
              onChange={(e) => setTxPaymentMethod(e.target.value)}
            >
              <option value="Cash">Cash</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Cheque">Cheque</option>
              <option value="Card">Card</option>
              <option value="Other">Other</option>
            </Select>

            <Input
              label="Invoice / Ref # (Optional)"
              placeholder="e.g. INV-2026-081"
              value={txReference}
              onChange={(e) => setTxReference(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-text">Notes (Optional)</label>
            <textarea
              rows={2}
              value={txNotes}
              onChange={(e) => setTxNotes(e.target.value)}
              placeholder="Additional details..."
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-forest-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsModalOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Saving...' : editingTx ? 'Update Transaction' : 'Save Transaction'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Import Modal */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="Import Transactions from CSV"
        description="Preview, review duplicate warnings, and assign mandatory cultivation lands before importing."
      >
        <div className="space-y-4 max-h-[75vh] flex flex-col">
          {importError && (
            <div className="rounded-lg bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300">
              {importError}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-text">Choose CSV File (.csv)</label>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={handleCsvFileSelected}
              className="w-full text-xs text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-subtle file:px-3 file:py-2 file:text-xs file:font-semibold file:text-text hover:file:bg-border"
            />
          </div>

          {stagedRows.length > 0 && (
            <div className="space-y-3 flex-1 overflow-hidden flex flex-col">
              {/* Global Land Quick Assign */}
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-subtle/50 p-2.5 text-xs">
                <span className="font-medium text-text flex items-center gap-1.5">
                  <FileSpreadsheet size={15} /> Set Land for All Rows:
                </span>
                <div className="w-56">
                  <Select
                    value={defaultImportLandId}
                    onChange={(e) => handleApplyDefaultLand(e.target.value)}
                    className="h-8 text-xs"
                  >
                    <option value="">— Select default land —</option>
                    {lands.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              {/* Status summary */}
              <div className="flex items-center gap-4 text-xs">
                <span className="text-forest-700 dark:text-forest-300 flex items-center gap-1">
                  <CheckCircle2 size={13} /> {stagedRows.filter((r) => r.isValid).length} Valid
                </span>
                {stagedRows.some((r) => !r.landId) && (
                  <span className="text-red-600 font-medium flex items-center gap-1">
                    <AlertTriangle size={13} />{' '}
                    {stagedRows.filter((r) => !r.landId).length} Missing Land
                  </span>
                )}
                {stagedRows.some((r) => r.isDuplicateCandidate) && (
                  <span className="text-amber-600 flex items-center gap-1">
                    <AlertTriangle size={13} />{' '}
                    {stagedRows.filter((r) => r.isDuplicateCandidate).length} Possible Duplicates
                  </span>
                )}
              </div>

              {/* Staged Rows Table */}
              <div className="overflow-x-auto overflow-y-auto max-h-60 border border-border rounded-lg">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-border bg-subtle text-muted sticky top-0">
                    <tr>
                      <th className="py-2 px-3">#</th>
                      <th className="py-2 px-3">Date</th>
                      <th className="py-2 px-3">Type</th>
                      <th className="py-2 px-3">Description</th>
                      <th className="py-2 px-3 text-right">Amount</th>
                      <th className="py-2 px-3">Assigned Land *</th>
                      <th className="py-2 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {stagedRows.map((row) => (
                      <tr key={row.index} className="hover:bg-subtle/30">
                        <td className="py-2 px-3 text-muted">{row.index}</td>
                        <td className="py-2 px-3 whitespace-nowrap">{row.date}</td>
                        <td className="py-2 px-3">
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                              row.type === 'income'
                                ? 'bg-forest-100 text-forest-800 dark:bg-forest-900/40 dark:text-forest-300'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                            }`}
                          >
                            {row.type}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-medium text-text max-w-xs truncate">
                          {row.description}
                        </td>
                        <td className="py-2 px-3 text-right whitespace-nowrap font-medium">
                          {formatLKR(row.amount)}
                        </td>
                        <td className="py-2 px-3">
                          <select
                            value={row.landId}
                            onChange={(e) => handleUpdateStagedLand(row.index, e.target.value)}
                            className={`rounded border px-2 py-1 text-xs bg-surface ${
                              !row.landId ? 'border-red-500 text-red-500 font-semibold' : 'border-border'
                            }`}
                          >
                            <option value="">— Missing Land —</option>
                            {lands.map((l) => (
                              <option key={l.id} value={l.id}>
                                {l.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap">
                          {row.isDuplicateCandidate && (
                            <span className="text-amber-600 font-medium inline-flex items-center gap-0.5 text-[10px]">
                              <AlertTriangle size={11} /> Duplicate?
                            </span>
                          )}
                          {!row.landId && (
                            <span className="text-red-500 font-medium text-[10px]">
                              Land required
                            </span>
                          )}
                          {row.isValid && !row.isDuplicateCandidate && (
                            <span className="text-forest-600 inline-flex items-center gap-0.5 text-[10px]">
                              <CheckCircle2 size={11} /> Ready
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-3 border-t border-border">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsImportModalOpen(false)}
              disabled={isImporting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirmImport}
              disabled={
                stagedRows.length === 0 ||
                stagedRows.some((r) => !r.landId) ||
                isImporting
              }
            >
              {isImporting
                ? 'Importing...'
                : `Confirm & Import ${stagedRows.filter((r) => r.isValid && r.landId).length} Rows`}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Export to Excel Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        initialDataType="transactions"
      />
    </div>
  )
}
