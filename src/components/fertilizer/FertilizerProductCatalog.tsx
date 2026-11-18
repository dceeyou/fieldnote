import { useState, useEffect, useCallback } from 'react'
import {
  Leaf,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  X,
} from 'lucide-react'
import { Button } from '../ui/Button.tsx'
import { Card } from '../ui/Card.tsx'
import { Modal } from '../ui/Modal.tsx'
import { Input } from '../ui/Input.tsx'
import { Select } from '../ui/Select.tsx'
import {
  getAllFertilizers,
  saveFertilizer,
  deleteFertilizer,
  deactivateFertilizer,
  getFertilizerReferenceCount,
} from '../../services/fertilizerService.ts'
import type { Fertilizer } from '../../data/db/schema.ts'
import { fertilizerInputSchema } from '../../domain/validation.ts'

interface FertilizerProductCatalogProps {
  onProductChanged?: () => void
  showTitle?: boolean
}

export function FertilizerProductCatalog({
  onProductChanged,
  showTitle = true,
}: FertilizerProductCatalogProps) {
  const [fertilizers, setFertilizers] = useState<Fertilizer[]>([])
  const [loading, setLoading] = useState(true)

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingFertilizer, setEditingFertilizer] = useState<Fertilizer | null>(null)

  // Form Fields
  const [fertName, setFertName] = useState('')
  const [fertType, setFertType] = useState('')
  const [fertUnit, setFertUnit] = useState('kg')
  const [fertNotes, setFertNotes] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Feedback State
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)

  const loadProducts = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getAllFertilizers(false)
      setFertilizers(data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadProducts()
  }, [loadProducts])

  function openAddModal() {
    setEditingFertilizer(null)
    setFertName('')
    setFertType('')
    setFertUnit('kg')
    setFertNotes('')
    setFormError(null)
    setIsModalOpen(true)
  }

  function openEditModal(fert: Fertilizer) {
    setEditingFertilizer(fert)
    setFertName(fert.name)
    setFertType(fert.type || '')
    setFertUnit(fert.defaultUnit || 'kg')
    setFertNotes(fert.notes || '')
    setFormError(null)
    setIsModalOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    setIsSaving(true)

    try {
      // Validate with Zod
      const validated = fertilizerInputSchema.parse({
        name: fertName.trim(),
        type: fertType.trim() || undefined,
        defaultUnit: fertUnit.trim() || undefined,
        notes: fertNotes.trim() || undefined,
        isActive: true,
      })

      if (editingFertilizer) {
        // Update existing record
        await saveFertilizer(validated, editingFertilizer.id)
        setFeedback({
          type: 'success',
          message: `Fertilizer product "${validated.name}" updated successfully.`,
        })
      } else {
        // Create new record
        await saveFertilizer(validated)
        setFeedback({
          type: 'success',
          message: `Fertilizer product "${validated.name}" added successfully.`,
        })
      }

      setIsModalOpen(false)
      await loadProducts()
      onProductChanged?.()
    } catch (err) {
      if (err instanceof Error) {
        setFormError(err.message)
      } else {
        setFormError('Failed to save fertilizer product. Please verify fields.')
      }
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete(fert: Fertilizer) {
    try {
      const refCount = await getFertilizerReferenceCount(fert.id)

      if (refCount > 0) {
        const confirmArchive = window.confirm(
          `"${fert.name}" is referenced by ${refCount} historical fertilizer application record(s).\n\nTo preserve historical application logs and schedules, this product cannot be permanently deleted.\n\nDo you want to archive/deactivate it instead? It will no longer appear in new application dropdowns.`
        )
        if (!confirmArchive) return

        await deactivateFertilizer(fert.id)
        setFeedback({
          type: 'success',
          message: `Fertilizer product "${fert.name}" was safely archived because it is referenced by ${refCount} application record(s).`,
        })
        await loadProducts()
        onProductChanged?.()
        return
      }

      const confirmDelete = window.confirm(
        `Are you sure you want to delete fertilizer product "${fert.name}"?\n\nThis action cannot be undone.`
      )
      if (!confirmDelete) return

      const result = await deleteFertilizer(fert.id)
      setFeedback({
        type: 'success',
        message: result.message,
      })
      await loadProducts()
      onProductChanged?.()
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to delete fertilizer product.',
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {showTitle && (
          <div>
            <h3 className="font-semibold text-text">Fertilizers & Nutrients Catalogue</h3>
            <p className="text-xs text-muted">
              Fertilizers, agrochemicals and soil nutrients used across your cultivation areas.
            </p>
          </div>
        )}
        <Button onClick={openAddModal} className="gap-1.5 ml-auto">
          <Plus size={16} /> Add Fertilizer Product
        </Button>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`flex items-center justify-between rounded-lg p-3 text-xs border ${
            feedback.type === 'success'
              ? 'border-forest-200 bg-forest-50 text-forest-800 dark:border-forest-800/40 dark:bg-forest-950/40 dark:text-forest-200'
              : 'border-red-200 bg-red-50 text-red-800 dark:border-red-800/40 dark:bg-red-950/40 dark:text-red-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 size={15} className="shrink-0 text-forest-600 dark:text-forest-400" />
            ) : (
              <AlertTriangle size={15} className="shrink-0 text-red-600 dark:text-red-400" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-muted hover:text-text p-1"
            aria-label="Dismiss feedback"
          >
            <X size={13} />
          </button>
        </div>
      )}

      {/* Product Cards Grid */}
      {loading ? (
        <Card className="p-8 text-center text-xs text-muted">
          Loading fertilizer products catalogue...
        </Card>
      ) : fertilizers.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted">
          <div className="mx-auto grid size-12 place-items-center rounded-xl bg-forest-50 text-forest-700 dark:bg-forest-700/20 dark:text-forest-100 mb-3">
            <Leaf size={22} />
          </div>
          <p className="font-medium text-text">No fertilizer products added yet</p>
          <p className="text-xs text-muted mt-1 max-w-sm mx-auto">
            Add your commonly used fertilizers, composts, and nutrients to track schedules and dosages.
          </p>
          <div className="mt-4">
            <Button onClick={openAddModal} className="h-8 text-xs gap-1">
              <Plus size={14} /> Add Fertilizer Product
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {fertilizers.map((fert) => (
            <Card
              key={fert.id}
              className="flex items-start justify-between p-4 transition-all hover:border-forest-600/40 hover:shadow-sm"
            >
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-forest-50 text-forest-700 dark:bg-forest-700/20 dark:text-forest-200">
                  <Leaf size={17} />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-semibold text-sm text-text truncate">{fert.name}</h4>
                  <p className="text-xs text-muted mt-0.5">
                    {fert.type ? `${fert.type} · ` : ''}Default unit:{' '}
                    <span className="font-medium text-text">{fert.defaultUnit || 'kg'}</span>
                  </p>
                  {fert.notes && (
                    <p className="text-xs text-muted mt-1 italic line-clamp-2">{fert.notes}</p>
                  )}
                </div>
              </div>

              {/* Actions on the right side: Edit and Delete */}
              <div className="flex items-center gap-1 shrink-0 ml-3">
                {/* 1. Edit Action with Pencil icon */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-muted hover:text-text hover:bg-subtle"
                  aria-label={`Edit ${fert.name}`}
                  title="Edit fertilizer product"
                  onClick={() => openEditModal(fert)}
                >
                  <Pencil size={14} />
                </Button>

                {/* 2. Delete Action with Red icon and subtle red hover */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/40 dark:hover:text-red-300"
                  aria-label={`Delete ${fert.name}`}
                  title="Delete fertilizer product"
                  onClick={() => handleDelete(fert)}
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add / Edit Fertilizer Product Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingFertilizer ? 'Edit Fertilizer Product' : 'Add Fertilizer Product'}
        description={
          editingFertilizer
            ? 'Update the product specifications, unit, and application notes.'
            : 'Register a new fertilizer or soil nutrient to the farm catalogue.'
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="rounded-lg bg-red-50 p-2.5 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300 flex items-center gap-2">
              <AlertTriangle size={14} className="shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <Input
            label="Fertilizer Name"
            placeholder="e.g. Urea 46%, NPK 15:15:15, Dolomite, Compost"
            value={fertName}
            onChange={(e) => setFertName(e.target.value)}
            required
            autoFocus
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Type (optional)"
              placeholder="e.g. Inorganic, Organic, Foliar"
              value={fertType}
              onChange={(e) => setFertType(e.target.value)}
            />
            <Select
              label="Default Unit"
              value={fertUnit}
              onChange={(e) => setFertUnit(e.target.value)}
            >
              <option value="kg">kg (Kilograms)</option>
              <option value="g">g (Grams)</option>
              <option value="L">L (Liters)</option>
              <option value="ml">ml (Milliliters)</option>
              <option value="bag">Bags (50kg)</option>
              <option value="pack">Packs</option>
            </Select>
          </div>

          <Input
            label="Notes (optional)"
            placeholder="Application precautions, dosage notes, manufacturer..."
            value={fertNotes}
            onChange={(e) => setFertNotes(e.target.value)}
          />

          <div className="flex justify-end gap-3 pt-3 border-t border-border">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsModalOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving
                ? 'Saving...'
                : editingFertilizer
                ? 'Save Changes'
                : 'Save Fertilizer'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
