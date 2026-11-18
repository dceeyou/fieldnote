import { Sparkles, Check, X } from 'lucide-react'
import type { CategorySuggestion } from '../../domain/category.ts'

interface CategorySuggestionBadgeProps {
  suggestion: CategorySuggestion | null
  currentCategoryId: string
  onAccept: (categoryId: string) => void
  onDismiss: () => void
}

export function CategorySuggestionBadge({
  suggestion,
  currentCategoryId,
  onAccept,
  onDismiss,
}: CategorySuggestionBadgeProps) {
  if (!suggestion) return null

  // If already selected, show a subtle confirmed state or hide
  const isAlreadySelected = currentCategoryId === suggestion.categoryId
  if (isAlreadySelected) return null

  const isHighConfidence = suggestion.confidence === 'high'

  return (
    <div
      role="region"
      aria-label="Category recommendation"
      className="flex items-center justify-between rounded-lg border border-forest-200 bg-forest-50/70 p-2 text-xs dark:border-forest-800/60 dark:bg-forest-950/30 transition-all animate-in fade-in slide-in-from-top-1"
    >
      <div className="flex items-center gap-2 min-w-0 pr-2">
        <Sparkles
          size={14}
          className={`shrink-0 ${
            isHighConfidence
              ? 'text-amber-500'
              : 'text-forest-600 dark:text-forest-400'
          }`}
        />
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-muted">Suggested:</span>
            <span className="font-semibold text-text truncate">
              {suggestion.categoryName}
            </span>
            <span
              className={`rounded-full px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-wider ${
                isHighConfidence
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200'
                  : 'bg-forest-100 text-forest-800 dark:bg-forest-900/50 dark:text-forest-200'
              }`}
            >
              {suggestion.confidence} match
            </span>
          </div>
          <p className="text-[10px] text-muted truncate">{suggestion.reason}</p>
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={() => onAccept(suggestion.categoryId)}
          className="flex items-center gap-1 rounded-md bg-forest-600 px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm hover:bg-forest-700 transition-colors"
        >
          <Check size={12} />
          <span>Accept</span>
        </button>

        <button
          type="button"
          onClick={onDismiss}
          className="rounded-md p-1 text-muted hover:bg-forest-100 dark:hover:bg-forest-900/40 hover:text-text transition-colors"
          title="Dismiss suggestion"
          aria-label="Dismiss suggestion"
        >
          <X size={13} />
        </button>
      </div>
    </div>
  )
}
