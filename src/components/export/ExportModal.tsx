import { useState, useEffect, useCallback } from 'react'
import {
  Download,
  FileSpreadsheet,
  Calendar,
  Layers,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  Database,
} from 'lucide-react'
import { Modal } from '../ui/Modal.tsx'
import { Button } from '../ui/Button.tsx'
import { Select } from '../ui/Select.tsx'
import { DatePicker } from '../ui/date-picker.tsx'
import {
  type ExportDataType,
  type ExportDatePreset,
  type ExportOptions,
  type ExportCounts,
  getExportSummaryCounts,
  loadExportPayload,
  buildExcelWorkbook,
  triggerExcelDownload,
  computeExportDateBounds,
  getExportFilename,
} from '../../services/exportService.ts'
import { getTodayColombo } from '../../utils/date.ts'
import { formatLKR } from '../../utils/calculations.ts'

interface ExportModalProps {
  isOpen: boolean
  onClose: () => void
  initialDataType?: ExportDataType
}

export function ExportModal({ isOpen, onClose, initialDataType = 'all' }: ExportModalProps) {
  // Section A: Data Type (Default: All Data)
  const [dataType, setDataType] = useState<ExportDataType>(initialDataType)

  // Section B: Date Range (Default: All Records)
  const [datePreset, setDatePreset] = useState<ExportDatePreset>('all_records')
  const [startDate, setStartDate] = useState(getTodayColombo())
  const [endDate, setEndDate] = useState(getTodayColombo())

  // Section C: Export Format (Default: Excel .xlsx)
  const [exportFormat] = useState<'xlsx'>('xlsx')

  // Section D: Summary Counts & Live State
  const [counts, setCounts] = useState<ExportCounts | null>(null)
  const [isLoadingCounts, setIsLoadingCounts] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [exportSuccess, setExportSuccess] = useState<string | null>(null)
  const [exportError, setExportError] = useState<string | null>(null)

  // Update data type if initialDataType prop changes when opening
  useEffect(() => {
    if (isOpen) {
      setDataType(initialDataType)
      setExportSuccess(null)
      setExportError(null)
    }
  }, [isOpen, initialDataType])

  // Recalculate summary counts whenever options change
  const refreshCounts = useCallback(async () => {
    if (!isOpen) return
    setIsLoadingCounts(true)
    setExportError(null)

    try {
      const options: ExportOptions = {
        dataType,
        datePreset,
        startDate: datePreset === 'custom' ? startDate : undefined,
        endDate: datePreset === 'custom' ? endDate : undefined,
      }
      const calculated = await getExportSummaryCounts(options)
      setCounts(calculated)
    } catch (err: unknown) {
      if (err instanceof Error) {
        setExportError(err.message)
      } else {
        setExportError('Unable to calculate record summary. Please check database connection.')
      }
    } finally {
      setIsLoadingCounts(false)
    }
  }, [isOpen, dataType, datePreset, startDate, endDate])

  useEffect(() => {
    refreshCounts()
  }, [refreshCounts])

  const dateBounds = computeExportDateBounds(
    datePreset,
    datePreset === 'custom' ? startDate : undefined,
    datePreset === 'custom' ? endDate : undefined
  )

  async function handleExport() {
    setIsExporting(true)
    setExportError(null)
    setExportSuccess(null)

    try {
      const options: ExportOptions = {
        dataType,
        datePreset,
        startDate: datePreset === 'custom' ? startDate : undefined,
        endDate: datePreset === 'custom' ? endDate : undefined,
      }

      // 1. Fetch, validate and resolve records
      const payload = await loadExportPayload(options)

      // 2. Build Excel workbook (.xlsx) with 3 worksheets
      const workbook = buildExcelWorkbook(payload)

      // 3. Trigger download and free memory
      const filename = getExportFilename()
      triggerExcelDownload(workbook, filename)

      setExportSuccess(`Successfully generated and downloaded ${filename}`)
    } catch (err: unknown) {
      if (err instanceof Error) {
        setExportError(err.message)
      } else {
        setExportError('An unexpected error occurred during export.')
      }
    } finally {
      setIsExporting(false)
    }
  }

  const isTotalZero = counts !== null && counts.totalCount === 0

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!isExporting) onClose()
      }}
      title="Export Agriculture Data to Excel"
      description="Export all financial transactions and fertilizer applications into a single Excel workbook."
      className="max-w-2xl"
    >
      <div className="space-y-6">
        {/* Error Feedback */}
        {exportError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3.5 text-xs text-red-800 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300 flex items-start justify-between gap-3">
            <div className="flex items-start gap-2">
              <AlertTriangle size={16} className="mt-0.5 shrink-0 text-red-600" />
              <div>
                <p className="font-semibold">Export Validation Issue</p>
                <p className="mt-0.5 leading-relaxed">{exportError}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={refreshCounts}
              className="h-7 text-xs text-red-700 hover:bg-red-100 dark:text-red-300 dark:hover:bg-red-900/50"
            >
              <RefreshCw size={12} className={isLoadingCounts ? 'animate-spin' : ''} /> Retry
            </Button>
          </div>
        )}

        {/* Success Feedback */}
        {exportSuccess && (
          <div className="rounded-lg border border-forest-200 bg-forest-50 p-3.5 text-xs text-forest-800 dark:border-forest-800/40 dark:bg-forest-950/40 dark:text-forest-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-forest-600" />
              <span>{exportSuccess}</span>
            </div>
            <button
              type="button"
              onClick={() => setExportSuccess(null)}
              className="text-muted hover:text-text"
            >
              &times;
            </button>
          </div>
        )}

        {/* Section A: Data Type */}
        <div className="space-y-2">
          <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted">
            <Layers size={14} className="text-forest-600" />
            <span>Section A: Data Type</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <button
              type="button"
              onClick={() => setDataType('all')}
              className={`rounded-lg border p-3 text-left transition-all ${
                dataType === 'all'
                  ? 'border-forest-600 bg-forest-50/60 ring-1 ring-forest-600 dark:border-forest-500 dark:bg-forest-900/20'
                  : 'border-border bg-surface hover:bg-subtle'
              }`}
            >
              <p className="text-sm font-semibold text-text">All Data</p>
              <p className="mt-1 text-xs text-muted">Transactions + Fertilizer</p>
            </button>

            <button
              type="button"
              onClick={() => setDataType('transactions')}
              className={`rounded-lg border p-3 text-left transition-all ${
                dataType === 'transactions'
                  ? 'border-forest-600 bg-forest-50/60 ring-1 ring-forest-600 dark:border-forest-500 dark:bg-forest-900/20'
                  : 'border-border bg-surface hover:bg-subtle'
              }`}
            >
              <p className="text-sm font-semibold text-text">Transactions</p>
              <p className="mt-1 text-xs text-muted">Income & expense records</p>
            </button>

            <button
              type="button"
              onClick={() => setDataType('fertilizer')}
              className={`rounded-lg border p-3 text-left transition-all ${
                dataType === 'fertilizer'
                  ? 'border-forest-600 bg-forest-50/60 ring-1 ring-forest-600 dark:border-forest-500 dark:bg-forest-900/20'
                  : 'border-border bg-surface hover:bg-subtle'
              }`}
            >
              <p className="text-sm font-semibold text-text">Fertilizer</p>
              <p className="mt-1 text-xs text-muted">Schedules & applications</p>
            </button>
          </div>
        </div>

        {/* Section B: Date Range */}
        <div className="space-y-3">
          <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted">
            <Calendar size={14} className="text-forest-600" />
            <span>Section B: Date Range</span>
          </label>
          <Select
            value={datePreset}
            onChange={(e) => setDatePreset(e.target.value as ExportDatePreset)}
          >
            <option value="all_records">All Records (No Date Filter)</option>
            <option value="this_month">This Month</option>
            <option value="last_3_months">Last 3 Months</option>
            <option value="last_6_months">Last 6 Months</option>
            <option value="this_year">This Year</option>
            <option value="last_year">Last Year</option>
            <option value="custom">Custom Date Range</option>
          </Select>

          {datePreset === 'custom' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <DatePicker
                label="From Date"
                value={startDate}
                onChange={(val) => setStartDate(val)}
                required
              />
              <DatePicker
                label="To Date"
                value={endDate}
                onChange={(val) => setEndDate(val)}
                minDate={startDate}
                required
              />
            </div>
          ) : (
            <p className="text-xs text-muted">
              {datePreset === 'all_records'
                ? 'All available records in the database will be included without date filtering.'
                : `Active date span: ${dateBounds.span}`}
            </p>
          )}
        </div>

        {/* Section C: Export Format */}
        <div className="space-y-2">
          <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted">
            <FileSpreadsheet size={14} className="text-forest-600" />
            <span>Section C: Export Format</span>
          </label>
          <div className="flex items-center justify-between rounded-lg border border-forest-600/60 bg-forest-50/40 p-3.5 dark:border-forest-500/40 dark:bg-forest-900/20">
            <div className="flex items-center gap-3">
              <div className="grid size-9 place-items-center rounded-lg bg-forest-600 text-white dark:bg-forest-500">
                <FileSpreadsheet size={18} />
              </div>
              <div>
                <p className="text-sm font-semibold text-text">Microsoft Excel (.xlsx)</p>
                <p className="text-xs text-muted">
                  Includes 3 worksheets: Transactions, Fertilizer Applications, and Export Summary
                </p>
              </div>
            </div>
            <span className="rounded-full bg-forest-100 px-2.5 py-0.5 text-xs font-semibold text-forest-800 dark:bg-forest-800/40 dark:text-forest-200">
              Selected
            </span>
          </div>
        </div>

        {/* Section D: Export Summary Preview */}
        <div className="rounded-xl border border-border bg-subtle/50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Database size={14} className="text-muted" />
              <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                Section D: Export Summary Preview
              </span>
            </div>
            {isLoadingCounts && (
              <span className="inline-flex items-center gap-1 text-xs text-muted">
                <RefreshCw size={12} className="animate-spin" /> Calculating...
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="rounded-lg border border-border bg-surface p-2.5">
              <p className="text-muted">Transactions</p>
              <p className="mt-1 text-base font-bold text-text">
                {counts ? counts.transactionCount : '—'}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-surface p-2.5">
              <p className="text-muted">Fertilizer Apps</p>
              <p className="mt-1 text-base font-bold text-text">
                {counts ? counts.fertilizerCount : '—'}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-surface p-2.5">
              <p className="text-muted">Total Records</p>
              <p className="mt-1 text-base font-bold text-forest-600">
                {counts ? counts.totalCount : '—'}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-surface p-2.5">
              <p className="text-muted">Net Balance</p>
              <p className="mt-1 text-base font-bold text-text truncate">
                {counts ? formatLKR(counts.netBalance) : '—'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between text-xs text-muted border-t border-border/60 pt-2.5">
            <span>
              Period: <strong>{dateBounds.label}</strong> ({dateBounds.span})
            </span>
            <span>
              Format: <strong>{exportFormat.toUpperCase()}</strong>
            </span>
          </div>

          {/* Empty Database Feedback */}
          {isTotalZero && !isLoadingCounts && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-300 flex items-center gap-2">
              <AlertTriangle size={15} className="shrink-0 text-amber-600" />
              <span>
                <strong>No records available to export.</strong> Add transactions or fertilizer schedules before exporting.
              </span>
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isExporting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleExport}
            disabled={isExporting || isTotalZero || isLoadingCounts}
            className="gap-2"
          >
            {isExporting ? (
              <>
                <RefreshCw size={15} className="animate-spin" />
                Generating Workbook...
              </>
            ) : (
              <>
                <Download size={15} />
                Download Excel (.xlsx)
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
