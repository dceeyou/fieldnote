import { useState, useMemo } from 'react'
import {
  Plus,
  Upload,
  Pencil,
  Trash2,
  Archive,
  ArchiveRestore,
  Search,
  Sparkles,
  GitMerge,
  Tag,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import { Card } from '../ui/Card.tsx'
import { Button } from '../ui/Button.tsx'
import { CategoryFormModal } from './CategoryFormModal.tsx'
import { CategoryDeleteModal } from './CategoryDeleteModal.tsx'
import { CategoryAuditModal } from './CategoryAuditModal.tsx'
import { CategoryImportModal } from './CategoryImportModal.tsx'
import {
  saveCategory,
  archiveCategory,
  restoreCategory,
  deleteCategory,
  installDefaultCategories,
} from '../../services/categoryService.ts'
import type { Category } from '../../data/db/schema.ts'
import type { CategoryInput } from '../../domain/validation.ts'

interface CategoryManagementProps {
  categories: Category[]
  onRefresh: () => Promise<void>
  loading?: boolean
}

export function CategoryManagement({
  categories,
  onRefresh,
  loading = false,
}: CategoryManagementProps) {
  const [activeTab, setActiveTab] = useState<'expense' | 'income'>('expense')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'archived'>('active')
  const [search, setSearch] = useState('')

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false)
  const [categoryToEdit, setCategoryToEdit] = useState<Category | null>(null)

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null)

  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)

  const [installingDefaults, setInstallingDefaults] = useState(false)
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  )

  // Filtered categories
  const filteredCategories = useMemo(() => {
    return categories.filter((cat) => {
      // Type match
      if (cat.type !== activeTab) return false

      // Status match
      if (statusFilter === 'active' && !cat.isActive) return false
      if (statusFilter === 'archived' && cat.isActive) return false

      // Search match
      if (search.trim()) {
        const query = search.trim().toLowerCase()
        const nameMatch = cat.name.toLowerCase().includes(query)
        const descMatch = (cat.description || '').toLowerCase().includes(query)
        const kwMatch = (cat.keywords || []).some((k) => k.toLowerCase().includes(query))
        if (!nameMatch && !descMatch && !kwMatch) return false
      }

      return true
    })
  }, [categories, activeTab, statusFilter, search])

  // Counts
  const expenseCount = useMemo(
    () => categories.filter((c) => c.type === 'expense').length,
    [categories]
  )
  const incomeCount = useMemo(
    () => categories.filter((c) => c.type === 'income').length,
    [categories]
  )

  // Handlers
  async function handleSave(data: CategoryInput, id?: string) {
    await saveCategory(data, id)
    setFeedbackMsg({
      type: 'success',
      text: id ? `Category "${data.name}" updated successfully.` : `Category "${data.name}" created successfully.`,
    })
    await onRefresh()
  }

  async function handleArchive(id: string) {
    const cat = categories.find((c) => c.id === id)
    await archiveCategory(id)
    setFeedbackMsg({
      type: 'success',
      text: `Category "${cat?.name || 'Selected'}" archived.`,
    })
    await onRefresh()
  }

  async function handleRestore(id: string) {
    const cat = categories.find((c) => c.id === id)
    await restoreCategory(id)
    setFeedbackMsg({
      type: 'success',
      text: `Category "${cat?.name || 'Selected'}" restored to active status.`,
    })
    await onRefresh()
  }

  async function handleDelete(id: string) {
    const res = await deleteCategory(id)
    if (res.success) {
      setFeedbackMsg({
        type: 'success',
        text: 'Category permanently deleted.',
      })
      await onRefresh()
    } else {
      setFeedbackMsg({
        type: 'error',
        text: res.error || 'Failed to delete category.',
      })
    }
  }

  async function handleInstallDefaults() {
    setInstallingDefaults(true)
    setFeedbackMsg(null)
    try {
      const res = await installDefaultCategories()
      setFeedbackMsg({
        type: 'success',
        text: `Standard category library processed: ${res.insertedCount} new categories added (${res.skippedCount} existing skipped).`,
      })
      await onRefresh()
    } catch (err) {
      setFeedbackMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to install default categories',
      })
    } finally {
      setInstallingDefaults(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Feedback banner */}
      {feedbackMsg && (
        <div
          className={`flex items-center justify-between rounded-xl border p-3.5 text-xs transition-colors ${
            feedbackMsg.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300'
              : 'border-red-200 bg-red-50 text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackMsg.type === 'success' ? (
              <CheckCircle2 size={16} className="text-emerald-600" />
            ) : (
              <AlertCircle size={16} className="text-red-600" />
            )}
            <span>{feedbackMsg.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackMsg(null)}
            className="text-xs font-semibold hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Header with Title and Primary Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-text">
            Transaction Categories
          </h2>
          <p className="text-xs text-muted mt-0.5 max-w-xl">
            Configure income and expense categories, customize keyword triggers for intelligent transaction suggestions, and manage category archives.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setIsAuditModalOpen(true)}
            className="h-8.5 text-xs gap-1.5"
            title="Scan for duplicate categories and merge historical records safely"
          >
            <GitMerge size={14} className="text-forest-600" />
            <span>Audit & Deduplicate</span>
          </Button>

          <Button
            type="button"
            variant="secondary"
            onClick={() => setIsImportModalOpen(true)}
            className="h-8.5 text-xs gap-1.5"
          >
            <Upload size={14} />
            <span>Import CSV</span>
          </Button>

          <Button
            type="button"
            onClick={() => {
              setCategoryToEdit(null)
              setIsFormModalOpen(true)
            }}
            className="h-8.5 text-xs gap-1.5"
          >
            <Plus size={15} />
            <span>Add Category</span>
          </Button>
        </div>
      </div>

      {/* Recommended Library Quick Action */}
      <div className="rounded-xl border border-forest-200/60 bg-forest-50/50 p-3.5 dark:border-forest-900/40 dark:bg-forest-950/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="grid size-8 place-items-center rounded-lg bg-forest-100 text-forest-700 dark:bg-forest-900/60 dark:text-forest-300">
            <Sparkles size={16} />
          </div>
          <div>
            <p className="text-xs font-semibold text-text">
              Recommended AgriFlow Standard Library
            </p>
            <p className="text-[11px] text-muted">
              Load 17 pre-configured agricultural expense categories & 8 income categories with intelligent keyword suggestions.
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant="secondary"
          size="default"
          onClick={handleInstallDefaults}
          disabled={installingDefaults}
          className="h-7.5 text-xs gap-1.5 shrink-0"
        >
          {installingDefaults ? 'Installing...' : 'Load Standard Categories'}
        </Button>
      </div>

      {/* Tabs & Filters */}
      <div className="space-y-3">
        {/* Segmented Controls for Expense vs Income */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('expense')}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-medium transition-colors ${
                activeTab === 'expense'
                  ? 'bg-forest-600 text-white shadow-sm font-semibold'
                  : 'border border-border bg-canvas text-text hover:bg-subtle'
              }`}
            >
              Expense Categories ({expenseCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('income')}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-medium transition-colors ${
                activeTab === 'income'
                  ? 'bg-forest-600 text-white shadow-sm font-semibold'
                  : 'border border-border bg-canvas text-text hover:bg-subtle'
              }`}
            >
              Income Categories ({incomeCount})
            </button>
          </div>

          {/* Status selector */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-[11px] text-muted font-medium">Status:</span>
            {(['active', 'all', 'archived'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`rounded-md px-2.5 py-1 text-xs capitalize transition-colors ${
                  statusFilter === s
                    ? 'bg-subtle text-text font-semibold border border-border'
                    : 'text-muted hover:text-text'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Search input */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-2.5 text-muted pointer-events-none" />
          <input
            type="text"
            placeholder="Search categories by name, description or keyword..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-border bg-canvas pl-9 pr-3 py-1.5 text-xs text-text placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-forest-500"
          />
        </div>
      </div>

      {/* Category List */}
      <Card className="divide-y divide-border overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-muted">Loading categories...</div>
        ) : filteredCategories.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Tag size={32} className="mx-auto text-muted opacity-40" />
            <p className="text-sm font-semibold text-text">No categories found</p>
            <p className="text-xs text-muted max-w-sm mx-auto">
              {search.trim()
                ? `No ${activeTab} categories match "${search}". Try resetting your search filter.`
                : `No ${statusFilter !== 'all' ? statusFilter : ''} ${activeTab} categories available.`}
            </p>
            {categories.length === 0 && (
              <Button
                type="button"
                variant="secondary"
                size="default"
                onClick={handleInstallDefaults}
                className="mt-2 text-xs"
              >
                Install Standard Library
              </Button>
            )}
          </div>
        ) : (
          filteredCategories.map((cat) => {
            const hasKeywords = cat.keywords && cat.keywords.length > 0

            return (
              <div
                key={cat.id}
                className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-3 hover:bg-subtle/40 transition-colors ${
                  !cat.isActive ? 'opacity-60 bg-subtle/20' : ''
                }`}
              >
                {/* Left Info Area */}
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-sm text-text">
                      {cat.name}
                    </span>

                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        cat.type === 'income'
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                          : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                      }`}
                    >
                      {cat.type}
                    </span>

                    {!cat.isActive && (
                      <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                        Archived
                      </span>
                    )}
                  </div>

                  {cat.description && (
                    <p className="text-xs text-muted leading-relaxed max-w-2xl">
                      {cat.description}
                    </p>
                  )}

                  {/* Keywords Pills */}
                  {hasKeywords && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      <span className="text-[10px] text-muted font-medium flex items-center gap-1">
                        <Tag size={11} className="text-forest-600" />
                        Triggers:
                      </span>
                      {cat.keywords!.map((kw, kwIdx) => (
                        <span
                          key={kwIdx}
                          className="rounded-md bg-subtle px-1.5 py-0.2 text-[10px] font-mono text-muted border border-border/60"
                        >
                          {kw}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Right Action Icons Area */}
                <div className="flex items-center gap-1 self-end sm:self-center shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-border/50">
                  {/* Edit action */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted hover:text-text hover:bg-subtle"
                    title="Edit category"
                    aria-label={`Edit ${cat.name}`}
                    onClick={() => {
                      setCategoryToEdit(cat)
                      setIsFormModalOpen(true)
                    }}
                  >
                    <Pencil size={14} />
                  </Button>

                  {/* Archive / Restore action */}
                  {cat.isActive ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8 text-muted hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                      title="Archive category (hides from new transactions)"
                      aria-label={`Archive ${cat.name}`}
                      onClick={() => handleArchive(cat.id)}
                    >
                      <Archive size={14} />
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8 text-muted hover:text-forest-600 hover:bg-forest-50 dark:hover:bg-forest-900/30"
                      title="Restore category to active"
                      aria-label={`Restore ${cat.name}`}
                      onClick={() => handleRestore(cat.id)}
                    >
                      <ArchiveRestore size={14} />
                    </Button>
                  )}

                  {/* Delete action */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                    title="Delete category"
                    aria-label={`Delete ${cat.name}`}
                    onClick={() => {
                      setCategoryToDelete(cat)
                      setIsDeleteModalOpen(true)
                    }}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            )
          })
        )}
      </Card>

      {/* Modals */}
      <CategoryFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSave={handleSave}
        categoryToEdit={categoryToEdit}
        defaultType={activeTab}
        existingCategories={categories}
      />

      <CategoryDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        category={categoryToDelete}
        onConfirmDelete={handleDelete}
        onArchiveInstead={handleArchive}
      />

      <CategoryAuditModal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
        onComplete={onRefresh}
      />

      <CategoryImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        existingCategories={categories}
        onImportComplete={onRefresh}
      />
    </div>
  )
}
