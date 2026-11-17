import { useState, useEffect } from 'react'
import { AlertTriangle, Archive, Trash2, Info } from 'lucide-react'
import { Modal } from '../ui/Modal.tsx'
import { Button } from '../ui/Button.tsx'
import type { Category } from '../../data/db/schema.ts'
import { checkCategoryUsage } from '../../services/categoryService.ts'

interface CategoryDeleteModalProps {
  isOpen: boolean
  onClose: () => void
  category: Category | null
  onConfirmDelete: (id: string) => Promise<void>
  onArchiveInstead: (id: string) => Promise<void>
}

export function CategoryDeleteModal({
  isOpen,
  onClose,
  category,
  onConfirmDelete,
  onArchiveInstead,
}: CategoryDeleteModalProps) {
  const [loadingUsage, setLoadingUsage] = useState(true)
  const [txCount, setTxCount] = useState(0)
  const [totalAmount, setTotalAmount] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => {
    if (category && isOpen) {
      setLoadingUsage(true)
      setActionError(null)
      checkCategoryUsage(category.id)
        .then((res) => {
          setTxCount(res.count)
          setTotalAmount(res.totalAmount)
        })
        .finally(() => {
          setLoadingUsage(false)
        })
    }
  }, [category, isOpen])

  if (!category) return null

  const isReferenced = txCount > 0

  async function handleDelete() {
    if (!category) return
    setIsProcessing(true)
    setActionError(null)
    try {
      await onConfirmDelete(category.id)
      onClose()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to delete category')
    } finally {
      setIsProcessing(false)
    }
  }

  async function handleArchive() {
    if (!category) return
    setIsProcessing(true)
    setActionError(null)
    try {
      await onArchiveInstead(category.id)
      onClose()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to archive category')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isReferenced ? 'Cannot Delete Referenced Category' : 'Delete Category'}
    >
      <div className="space-y-4 pt-1">
        {actionError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
            {actionError}
          </div>
        )}

        {loadingUsage ? (
          <div className="py-6 text-center text-xs text-muted">Checking category usage in transactions...</div>
        ) : isReferenced ? (
          <div className="space-y-3">
            <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3.5 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
              <AlertTriangle className="size-5 shrink-0 text-amber-600 mt-0.5" />
              <div className="text-xs space-y-1">
                <p className="font-semibold text-sm">
                  Historical Financial Records Depend on This Category
                </p>
                <p className="leading-relaxed">
                  <strong>&ldquo;{category.name}&rdquo;</strong> is referenced by{' '}
                  <strong>{txCount}</strong> financial transaction(s) totaling{' '}
                  <strong>LKR {totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>.
                </p>
                <p className="text-amber-800 dark:text-amber-300">
                  Deleting it permanently is blocked to protect historical farm books and reporting integrity.
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-subtle/50 p-3 text-xs text-muted flex items-start gap-2">
              <Info size={15} className="text-forest-600 shrink-0 mt-0.5" />
              <span>
                <strong>Recommended action:</strong> Archive this category instead. Archived categories are hidden from new transaction forms while keeping all past records intact.
              </span>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
              <Button type="button" variant="secondary" onClick={onClose} disabled={isProcessing}>
                Close
              </Button>
              <Button
                type="button"
                onClick={handleArchive}
                disabled={isProcessing}
                className="gap-1.5"
              >
                <Archive size={15} />
                {isProcessing ? 'Archiving...' : 'Archive Category'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3.5 text-red-900 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
              <Trash2 className="size-5 shrink-0 text-red-600 mt-0.5" />
              <div className="text-xs space-y-1">
                <p className="font-semibold text-sm">Permanently Delete Category?</p>
                <p className="leading-relaxed">
                  Are you sure you want to permanently delete <strong>&ldquo;{category.name}&rdquo;</strong>?
                  No financial transactions currently reference this category.
                </p>
                <p className="text-red-700 dark:text-red-300">This action cannot be undone.</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
              <Button type="button" variant="secondary" onClick={onClose} disabled={isProcessing}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={handleDelete}
                disabled={isProcessing}
                className="gap-1.5"
              >
                <Trash2 size={15} />
                {isProcessing ? 'Deleting...' : 'Delete Permanently'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
