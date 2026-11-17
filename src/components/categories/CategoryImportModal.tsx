import { useState, useRef } from 'react'
import {
  Upload,
  Download,
  FileText,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Edit2,
  Check,
} from 'lucide-react'
import { Modal } from '../ui/Modal.tsx'
import { Button } from '../ui/Button.tsx'
import {
  generateCategoryCsvTemplate,
  parseCategoryCsv,
  validateCategoryRows,
  summarizeCategoryImport,
  type ValidatedCategoryImportRow,
} from '../../domain/category.ts'
import { importCategoriesFromCsv } from '../../services/categoryService.ts'
import type { Category } from '../../data/db/schema.ts'

interface CategoryImportModalProps {
  isOpen: boolean
  onClose: () => void
  existingCategories: Category[]
  onImportComplete: () => Promise<void>
}

export function CategoryImportModal({
  isOpen,
  onClose,
  existingCategories,
  onImportComplete,
}: CategoryImportModalProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1)
  const [file, setFile] = useState<File | null>(null)
  const [stagedRows, setStagedRows] = useState<ValidatedCategoryImportRow[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [importResult, setImportResult] = useState<{
    importedCount: number
    skippedCount: number
  } | null>(null)
  const [editingRowIndex, setEditingRowIndex] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const [editType, setEditType] = useState<'income' | 'expense'>('expense')

  const fileInputRef = useRef<HTMLInputElement>(null)

  function resetState() {
    setStep(1)
    setFile(null)
    setStagedRows([])
    setIsProcessing(false)
    setErrorMsg(null)
    setImportResult(null)
    setEditingRowIndex(null)
  }

  function handleDownloadTemplate() {
    const csvContent = generateCategoryCsvTemplate()
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', 'AgriFlow_Categories_Template.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  async function handleFileSelected(selectedFile: File) {
    if (!selectedFile.name.endsWith('.csv') && selectedFile.type !== 'text/csv') {
      setErrorMsg('Please select a valid .csv file.')
      return
    }

    setFile(selectedFile)
    setErrorMsg(null)
    setIsProcessing(true)

    try {
      const text = await selectedFile.text()
      const rawRows = parseCategoryCsv(text)

      if (rawRows.length === 0) {
        setErrorMsg('The selected CSV file contains no data rows.')
        setIsProcessing(false)
        return
      }

      const validated = validateCategoryRows(rawRows, existingCategories)
      setStagedRows(validated)
      setStep(4) // Move to review summary
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to parse CSV file')
    } finally {
      setIsProcessing(false)
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0])
    }
  }

  function toggleRowExclusion(index: number) {
    setStagedRows((prev) =>
      prev.map((r) => (r.index === index ? { ...r, excluded: !r.excluded } : r))
    )
  }

  function startInlineEdit(row: ValidatedCategoryImportRow) {
    setEditingRowIndex(row.index)
    setEditName(row.name)
    setEditType(row.type)
  }

  function saveInlineEdit(index: number) {
    const trimmed = editName.trim()
    if (!trimmed) return

    setStagedRows((prev) => {
      const updated = prev.map((r) => {
        if (r.index === index) {
          const rawRow = {
            name: trimmed,
            type: editType,
            description: r.description,
            keywords: r.keywords.join(';'),
          }
          const [revalidated] = validateCategoryRows([rawRow], existingCategories)
          return {
            ...revalidated,
            index,
            excluded: false,
          }
        }
        return r
      })
      return updated
    })

    setEditingRowIndex(null)
  }

  async function handleConfirmImport() {
    setIsProcessing(true)
    setErrorMsg(null)

    try {
      const res = await importCategoriesFromCsv(stagedRows)
      setImportResult(res)
      await onImportComplete()
      setStep(5)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error importing categories')
    } finally {
      setIsProcessing(false)
    }
  }

  const summary = summarizeCategoryImport(stagedRows)

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        resetState()
        onClose()
      }}
      title="Import Categories from CSV"
      description="Batch upload income and expense categories using a CSV template with automatic duplicate detection."
      className="max-w-3xl"
    >
      <div className="space-y-4 pt-1">
        {errorMsg && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300 flex items-center gap-2">
            <AlertTriangle size={15} className="shrink-0 text-red-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* STEP 1: Upload */}
        {step === 1 && (
          <div className="space-y-4">
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-border rounded-xl bg-canvas hover:bg-subtle/50 cursor-pointer transition-colors text-center"
            >
              <div className="grid size-12 place-items-center rounded-full bg-forest-50 text-forest-600 dark:bg-forest-900/40 dark:text-forest-300">
                <Upload size={22} />
              </div>
              <p className="mt-3 text-sm font-semibold text-text">
                Click to browse or drag and drop your category CSV file
              </p>
              <p className="mt-1 text-xs text-muted">
                Accepts .csv files formatted with Category Name, Type, Description, Keywords
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileSelected(e.target.files[0])
                  }
                }}
                className="hidden"
              />
            </div>

            {/* Template Download Card */}
            <div className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-subtle/50">
              <div className="flex items-center gap-3">
                <FileText size={18} className="text-forest-600" />
                <div>
                  <p className="text-xs font-semibold text-text">Need the standard CSV format?</p>
                  <p className="text-[11px] text-muted">
                    Download our ready-to-use template with sample Expense and Income rows.
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={handleDownloadTemplate}
                className="text-xs gap-1.5 h-8"
              >
                <Download size={13} /> Download Template
              </Button>
            </div>
          </div>
        )}

        {/* STEP 4: Review and Validation Summary */}
        {step === 4 && (
          <div className="space-y-4">
            {file && (
              <div className="flex items-center justify-between text-xs text-muted border-b border-border pb-2">
                <span>Selected file: <strong className="text-text">{file.name}</strong></span>
                <span>{(file.size / 1024).toFixed(1)} KB</span>
              </div>
            )}

            {/* Summary statistics bar */}
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              <div className="rounded-lg border border-border bg-subtle/50 p-2.5">
                <p className="text-muted text-[11px]">Total Rows</p>
                <p className="text-base font-bold text-text">{summary.totalRows}</p>
              </div>
              <div className="rounded-lg border border-border bg-emerald-50/50 p-2.5 dark:bg-emerald-950/20">
                <p className="text-muted text-[11px]">Ready to Import</p>
                <p className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                  {summary.readyToImportCount}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-amber-50/50 p-2.5 dark:bg-amber-950/20">
                <p className="text-muted text-[11px]">Warnings / Similar</p>
                <p className="text-base font-bold text-amber-600 dark:text-amber-400">
                  {summary.similarWarningCount}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-red-50/50 p-2.5 dark:bg-red-950/20">
                <p className="text-muted text-[11px]">Rejected / Existing</p>
                <p className="text-base font-bold text-red-600 dark:text-red-400">
                  {summary.invalidCount + summary.existingInDbCount}
                </p>
              </div>
            </div>

            {/* Staged Rows Table */}
            <div className="rounded-xl border border-border overflow-hidden">
              <div className="max-h-[320px] overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 bg-subtle text-muted text-[11px] uppercase tracking-wider border-b border-border">
                    <tr>
                      <th className="py-2.5 px-3 w-8">Include</th>
                      <th className="py-2.5 px-3">Category Name</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3">Keywords</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-surface">
                    {stagedRows.map((row) => {
                      const isEditing = editingRowIndex === row.index

                      return (
                        <tr
                          key={row.index}
                          className={`hover:bg-subtle/40 transition-colors ${
                            row.excluded ? 'opacity-40 bg-subtle/20' : ''
                          }`}
                        >
                          <td className="py-2.5 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={!row.excluded}
                              onChange={() => toggleRowExclusion(row.index)}
                              className="size-3.5 rounded border-border text-forest-600 focus:ring-forest-500"
                            />
                          </td>
                          <td className="py-2.5 px-3 font-medium text-text">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="w-full rounded border border-forest-500 bg-canvas px-2 py-0.5 text-xs text-text"
                                autoFocus
                              />
                            ) : (
                              <div>
                                <span>{row.name}</span>
                                {row.description && (
                                  <p className="text-[10px] text-muted truncate max-w-xs">
                                    {row.description}
                                  </p>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            {isEditing ? (
                              <select
                                value={editType}
                                onChange={(e) =>
                                  setEditType(e.target.value as 'income' | 'expense')
                                }
                                className="rounded border border-forest-500 bg-canvas px-1.5 py-0.5 text-xs text-text"
                              >
                                <option value="expense">Expense</option>
                                <option value="income">Income</option>
                              </select>
                            ) : (
                              <span
                                className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                                  row.type === 'income'
                                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                                    : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                                }`}
                              >
                                {row.type}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-[11px] text-muted">
                            {row.keywords.length > 0 ? (
                              <span title={row.keywords.join(', ')}>
                                {row.keywords.slice(0, 2).join(', ')}
                                {row.keywords.length > 2 && ` +${row.keywords.length - 2}`}
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            {row.errors.length > 0 ? (
                              <span
                                className="inline-flex items-center gap-1 text-[11px] text-red-600 dark:text-red-400 font-medium"
                                title={row.errors.join('; ')}
                              >
                                <XCircle size={13} className="shrink-0" />
                                <span className="truncate max-w-[140px]">{row.errors[0]}</span>
                              </span>
                            ) : row.warnings.length > 0 ? (
                              <span
                                className="inline-flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 font-medium"
                                title={row.warnings.join('; ')}
                              >
                                <AlertTriangle size={13} className="shrink-0" />
                                <span className="truncate max-w-[140px]">{row.warnings[0]}</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                                <CheckCircle2 size={13} className="shrink-0" />
                                Valid
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            {isEditing ? (
                              <button
                                type="button"
                                onClick={() => saveInlineEdit(row.index)}
                                className="text-forest-600 hover:text-forest-700 p-1"
                                title="Save edit"
                              >
                                <Check size={14} />
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => startInlineEdit(row)}
                                className="text-muted hover:text-text p-1"
                                title="Edit category name"
                              >
                                <Edit2 size={13} />
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setStep(1)}
                disabled={isProcessing}
              >
                Choose Different File
              </Button>
              <Button
                type="button"
                onClick={handleConfirmImport}
                disabled={isProcessing || summary.readyToImportCount === 0}
                className="gap-1.5"
              >
                {isProcessing ? 'Importing Categories...' : `Confirm Import (${summary.readyToImportCount})`}
              </Button>
            </div>
          </div>
        )}

        {/* STEP 5: Success Summary */}
        {step === 5 && importResult && (
          <div className="py-6 text-center space-y-4">
            <div className="grid size-14 place-items-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300 mx-auto">
              <CheckCircle2 size={32} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-text">CSV Import Complete</h3>
              <p className="mt-1 text-xs text-muted">
                Your categories were processed and inserted into the system.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto text-xs">
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">
                <p className="text-[11px] font-medium">Successfully Added</p>
                <p className="mt-0.5 text-xl font-bold">{importResult.importedCount}</p>
              </div>
              <div className="rounded-lg border border-border bg-subtle p-3 text-muted">
                <p className="text-[11px] font-medium">Skipped / Excluded</p>
                <p className="mt-0.5 text-xl font-bold text-text">{importResult.skippedCount}</p>
              </div>
            </div>

            <div className="pt-2">
              <Button
                type="button"
                onClick={() => {
                  resetState()
                  onClose()
                }}
              >
                Done
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
