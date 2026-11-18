import { useState, useEffect } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  GitMerge,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react'
import { Modal } from '../ui/Modal.tsx'
import { Button } from '../ui/Button.tsx'
import {
  auditCategoryDuplicatesService,
  mergeDuplicateCategories,
} from '../../services/categoryService.ts'
import type { CategoryAuditReport, DuplicateAuditGroup } from '../../domain/category.ts'

interface CategoryAuditModalProps {
  isOpen: boolean
  onClose: () => void
  onComplete: () => Promise<void>
}

export function CategoryAuditModal({
  isOpen,
  onClose,
  onComplete,
}: CategoryAuditModalProps) {
  const [report, setReport] = useState<CategoryAuditReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [selectedCanonicals, setSelectedCanonicals] = useState<Record<string, string>>({})
  const [mergingGroupId, setMergingGroupId] = useState<string | null>(null)
  const [mergeSuccessMsg, setMergeSuccessMsg] = useState<string | null>(null)
  const [mergeError, setMergeError] = useState<string | null>(null)

  async function runAudit() {
    setLoading(true)
    setMergeSuccessMsg(null)
    setMergeError(null)
    try {
      const res = await auditCategoryDuplicatesService()
      setReport(res)

      // Initialize selected canonicals from recommendation
      const initialCanonicals: Record<string, string> = {}
      for (const g of res.groups) {
        initialCanonicals[g.groupId] = g.recommendedCanonicalId
      }
      setSelectedCanonicals(initialCanonicals)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      runAudit()
    }
  }, [isOpen])

  async function handleMergeGroup(group: DuplicateAuditGroup) {
    const canonicalId = selectedCanonicals[group.groupId] || group.recommendedCanonicalId
    const duplicateIds = group.candidates
      .map((c) => c.category.id)
      .filter((id) => id !== canonicalId)

    if (duplicateIds.length === 0) return

    const canonicalName =
      group.candidates.find((c) => c.category.id === canonicalId)?.category.name || 'Canonical'

    const confirmed = window.confirm(
      `Merge ${duplicateIds.length} duplicate category record(s) into "${canonicalName}"?\n\nAll historical transactions will be safely reassigned to the canonical category without altering financial amounts.`
    )
    if (!confirmed) return

    setMergingGroupId(group.groupId)
    setMergeError(null)
    setMergeSuccessMsg(null)

    try {
      const res = await mergeDuplicateCategories(canonicalId, duplicateIds, 'delete')
      if (res.success) {
        setMergeSuccessMsg(
          `Successfully merged ${res.archivedOrDeletedDuplicatesCount} duplicate(s) into "${canonicalName}". ${res.migratedTransactionsCount} transaction(s) migrated.`
        )
        await onComplete()
        await runAudit()
      } else {
        setMergeError(res.error || 'Failed to merge categories')
      }
    } catch (err) {
      setMergeError(err instanceof Error ? err.message : 'Error merging categories')
    } finally {
      setMergingGroupId(null)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Category Duplicate Audit & Deduplication"
      description="Inspect categories across local database and Supabase to detect exact duplicates, spelling variations, and safely merge historical transactions."
      className="max-w-3xl"
    >
      <div className="space-y-4 pt-1">
        {/* Messages */}
        {mergeSuccessMsg && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300 flex items-center gap-2">
            <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
            <span>{mergeSuccessMsg}</span>
          </div>
        )}

        {mergeError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300 flex items-center gap-2">
            <AlertTriangle size={16} className="shrink-0 text-red-600" />
            <span>{mergeError}</span>
          </div>
        )}

        {/* Audit Stats Banner */}
        {report && (
          <div className="grid grid-cols-3 gap-3 rounded-xl border border-border bg-subtle/50 p-3.5 text-center text-xs">
            <div>
              <p className="text-muted">Total Categories</p>
              <p className="mt-0.5 text-lg font-bold text-text">{report.totalCategories}</p>
            </div>
            <div>
              <p className="text-muted">Duplicate Clusters</p>
              <p className="mt-0.5 text-lg font-bold text-amber-600 dark:text-amber-400">
                {report.duplicateGroupCount}
              </p>
            </div>
            <div>
              <p className="text-muted">Affected Transactions</p>
              <p className="mt-0.5 text-lg font-bold text-forest-600">
                {report.affectedTransactionsCount}
              </p>
            </div>
          </div>
        )}

        {/* Loading state */}
        {loading ? (
          <div className="py-12 text-center text-xs text-muted flex items-center justify-center gap-2">
            <RefreshCw size={15} className="animate-spin text-forest-600" />
            <span>Scanning categories and verifying transaction integrity...</span>
          </div>
        ) : report && report.groups.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <CheckCircle2 size={36} className="mx-auto text-emerald-500" />
            <p className="text-sm font-semibold text-text">No Duplicate Categories Detected</p>
            <p className="text-xs text-muted max-w-md mx-auto">
              All categories in your database have unique names and types. Historical transaction references are clean.
            </p>
          </div>
        ) : (
          <div className="space-y-4 max-h-[460px] overflow-y-auto pr-1">
            {report?.groups.map((group, idx) => {
              const selectedCanonicalId =
                selectedCanonicals[group.groupId] || group.recommendedCanonicalId

              return (
                <div
                  key={group.groupId}
                  className="rounded-xl border border-border bg-surface p-4 space-y-3 shadow-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-text">
                        Cluster #{idx + 1}: &ldquo;{group.candidates[0].category.name}&rdquo;
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          group.matchType === 'exact'
                            ? 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300'
                            : group.matchType === 'spelling_variation'
                            ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                            : 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                        }`}
                      >
                        {group.matchType.replace('_', ' ')}
                      </span>
                      <span className="text-xs text-muted">({group.type})</span>
                    </div>

                    <Button
                      size="default"
                      onClick={() => handleMergeGroup(group)}
                      disabled={mergingGroupId === group.groupId}
                      className="h-7 text-xs gap-1.5"
                    >
                      <GitMerge size={13} />
                      {mergingGroupId === group.groupId ? 'Merging...' : 'Merge Cluster'}
                    </Button>
                  </div>

                  {group.type === 'mixed' && (
                    <div className="rounded-md border border-amber-200 bg-amber-50 p-2 text-[11px] text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200 flex items-center gap-1.5">
                      <ShieldAlert size={14} className="shrink-0 text-amber-600" />
                      <span>
                        Notice: Conflicting category types detected in this cluster. Verify before merging.
                      </span>
                    </div>
                  )}

                  <div className="space-y-2">
                    <p className="text-[11px] font-medium text-muted">
                      Select which record should be preserved as the canonical category:
                    </p>

                    <div className="space-y-1.5">
                      {group.candidates.map((cand) => {
                        const isCanonical = cand.category.id === selectedCanonicalId

                        return (
                          <label
                            key={cand.category.id}
                            className={`flex items-center justify-between p-3 rounded-lg border text-xs cursor-pointer transition-colors ${
                              isCanonical
                                ? 'border-forest-600 bg-forest-50/70 dark:bg-forest-900/30'
                                : 'border-border bg-canvas hover:bg-subtle'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <input
                                type="radio"
                                name={`canonical-${group.groupId}`}
                                checked={isCanonical}
                                onChange={() =>
                                  setSelectedCanonicals({
                                    ...selectedCanonicals,
                                    [group.groupId]: cand.category.id,
                                  })
                                }
                                className="size-4 text-forest-600 focus:ring-forest-500"
                              />
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-text">
                                    {cand.category.name}
                                  </span>
                                  {cand.isRecommendedCanonical && (
                                    <span className="rounded bg-forest-100 px-1.5 py-0.2 text-[9px] font-bold text-forest-800 dark:bg-forest-900 dark:text-forest-200">
                                      Recommended
                                    </span>
                                  )}
                                  <span className="text-[10px] text-muted font-mono">
                                    ID: {cand.category.id.slice(0, 8)}...
                                  </span>
                                </div>
                                {cand.category.description && (
                                  <p className="text-[11px] text-muted mt-0.5">
                                    {cand.category.description}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="text-right">
                              <span className="font-semibold text-text">
                                {cand.transactionCount} txs
                              </span>
                              <p className="text-[10px] text-muted">
                                LKR {cand.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                              </p>
                            </div>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Modal footer */}
        <div className="flex items-center justify-between pt-3 border-t border-border">
          <Button
            type="button"
            variant="ghost"
            onClick={runAudit}
            disabled={loading}
            className="text-xs gap-1.5"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Re-run Audit
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </Modal>
  )
}
