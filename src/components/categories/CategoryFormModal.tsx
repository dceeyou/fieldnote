import { useState, useEffect } from 'react'
import { Plus, X, Tag } from 'lucide-react'
import { Modal } from '../ui/Modal.tsx'
import { Input } from '../ui/Input.tsx'
import { Button } from '../ui/Button.tsx'
import type { Category } from '../../data/db/schema.ts'
import type { CategoryInput } from '../../domain/validation.ts'

interface CategoryFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: CategoryInput, id?: string) => Promise<void>
  categoryToEdit?: Category | null
  defaultType?: 'income' | 'expense'
  existingCategories: Category[]
}

export function CategoryFormModal({
  isOpen,
  onClose,
  onSave,
  categoryToEdit,
  defaultType = 'expense',
  existingCategories,
}: CategoryFormModalProps) {
  const [name, setName] = useState('')
  const [type, setType] = useState<'income' | 'expense'>(defaultType)
  const [description, setDescription] = useState('')
  const [keywordInput, setKeywordInput] = useState('')
  const [keywords, setKeywords] = useState<string[]>([])
  const [isActive, setIsActive] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (categoryToEdit) {
      setName(categoryToEdit.name)
      setType(categoryToEdit.type)
      setDescription(categoryToEdit.description || '')
      setKeywords(categoryToEdit.keywords || [])
      setIsActive(categoryToEdit.isActive)
    } else {
      setName('')
      setType(defaultType)
      setDescription('')
      setKeywords([])
      setIsActive(true)
    }
    setKeywordInput('')
    setError(null)
  }, [categoryToEdit, defaultType, isOpen])

  function handleAddKeyword() {
    const trimmed = keywordInput.trim()
    if (!trimmed) return
    const normalized = trimmed.toLowerCase()
    if (!keywords.map((k) => k.toLowerCase()).includes(normalized)) {
      setKeywords([...keywords, trimmed])
    }
    setKeywordInput('')
  }

  function handleRemoveKeyword(index: number) {
    setKeywords(keywords.filter((_, i) => i !== index))
  }

  function handleKeywordKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      handleAddKeyword()
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const trimmedName = name.trim()
    if (!trimmedName) {
      setError('Category name is required')
      return
    }

    // Check duplicate name within the same type
    const duplicate = existingCategories.find(
      (c) =>
        c.type === type &&
        c.name.trim().toLowerCase() === trimmedName.toLowerCase() &&
        c.id !== categoryToEdit?.id
    )

    if (duplicate) {
      setError(`A category named "${trimmedName}" already exists in ${type}s.`)
      return
    }

    setIsSubmitting(true)
    try {
      await onSave(
        {
          name: trimmedName,
          type,
          description: description.trim() || undefined,
          keywords,
          isActive,
          sortOrder: categoryToEdit?.sortOrder ?? existingCategories.length + 1,
        },
        categoryToEdit?.id
      )
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save category')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={categoryToEdit ? 'Edit Category' : 'Add New Category'}
      description="Define category properties, transaction type, and matching keywords for intelligent suggestions."
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </div>
        )}

        {/* Transaction Type Selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted">
            Transaction Type *
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setType('expense')}
              className={`rounded-lg py-2 text-xs font-medium border transition-colors ${
                type === 'expense'
                  ? 'border-forest-600 bg-forest-50 text-forest-700 font-semibold dark:bg-forest-900/30 dark:text-forest-300'
                  : 'border-border bg-canvas text-text hover:bg-subtle'
              }`}
            >
              Expense Category
            </button>
            <button
              type="button"
              onClick={() => setType('income')}
              className={`rounded-lg py-2 text-xs font-medium border transition-colors ${
                type === 'income'
                  ? 'border-forest-600 bg-forest-50 text-forest-700 font-semibold dark:bg-forest-900/30 dark:text-forest-300'
                  : 'border-border bg-canvas text-text hover:bg-subtle'
              }`}
            >
              Income Category
            </button>
          </div>
        </div>

        {/* Category Name */}
        <Input
          label="Category Name *"
          placeholder="e.g. Fertilizer & Nutrients, Labour & Wages"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoFocus
        />

        {/* Description */}
        <div className="space-y-1">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted">
            Description (Optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="Short description of what expenses/income belong to this category"
            className="w-full rounded-lg border border-border bg-canvas px-3 py-2 text-xs text-text placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-forest-500"
          />
        </div>

        {/* Keywords */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted flex items-center gap-1.5">
              <Tag size={13} className="text-forest-600" />
              <span>Matching Keywords (Optional)</span>
            </label>
            <span className="text-[11px] text-muted">Press Enter or comma</span>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. urea, compost, dolomite"
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              onKeyDown={handleKeywordKeyDown}
              className="flex-1 rounded-lg border border-border bg-canvas px-3 py-1.5 text-xs text-text placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-forest-500"
            />
            <Button
              type="button"
              variant="secondary"
              onClick={handleAddKeyword}
              disabled={!keywordInput.trim()}
              className="h-8 text-xs gap-1"
            >
              <Plus size={14} /> Add
            </Button>
          </div>

          {keywords.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1.5 max-h-28 overflow-y-auto">
              {keywords.map((kw, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 rounded-md bg-forest-50 px-2 py-0.5 text-xs font-medium text-forest-700 dark:bg-forest-900/40 dark:text-forest-300 border border-forest-200/50 dark:border-forest-700/50"
                >
                  {kw}
                  <button
                    type="button"
                    onClick={() => handleRemoveKeyword(idx)}
                    className="hover:text-red-500"
                    aria-label={`Remove keyword ${kw}`}
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Status */}
        <div className="flex items-center gap-2 pt-1">
          <input
            id="cat-active-checkbox"
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="size-4 rounded border-border text-forest-600 focus:ring-forest-500"
          />
          <label htmlFor="cat-active-checkbox" className="text-xs text-text select-none cursor-pointer">
            Active category (visible in new transaction selectors)
          </label>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : categoryToEdit ? 'Save Changes' : 'Create Category'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
