import { useState, useEffect } from 'react'
import { Plus, Edit2, Archive, Sprout, MapPin, Ruler, CheckCircle2 } from 'lucide-react'
import { Button } from '../components/ui/Button.tsx'
import { Card } from '../components/ui/Card.tsx'
import { Modal } from '../components/ui/Modal.tsx'
import { Input } from '../components/ui/Input.tsx'
import { Select } from '../components/ui/Select.tsx'
import {
  getAllLandsWithCrops,
  saveLand,
  deactivateLand,
  type LandWithCrops,
} from '../services/landService.ts'
import { getAllCrops } from '../services/cropService.ts'
import type { Crop } from '../data/db/schema.ts'
import { convertAreaToAcres } from '../utils/calculations.ts'

export function CultivationAreas() {
  const [lands, setLands] = useState<LandWithCrops[]>([])
  const [crops, setCrops] = useState<Crop[]>([])
  const [loading, setLoading] = useState(true)

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingLand, setEditingLand] = useState<LandWithCrops | null>(null)

  // Form State
  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [areaValue, setAreaValue] = useState<string>('')
  const [areaUnit, setAreaUnit] = useState<'acre' | 'perch'>('acre')
  const [notes, setNotes] = useState('')
  const [selectedCropIds, setSelectedCropIds] = useState<string[]>([])
  const [formError, setFormError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  async function loadData() {
    setLoading(true)
    try {
      const [allLands, allCrops] = await Promise.all([
        getAllLandsWithCrops(false),
        getAllCrops(false),
      ])
      setLands(allLands)
      setCrops(allCrops)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  function openAddModal() {
    setEditingLand(null)
    setName('')
    setLocation('')
    setAreaValue('')
    setAreaUnit('acre')
    setNotes('')
    setSelectedCropIds([])
    setFormError(null)
    setIsModalOpen(true)
  }

  function openEditModal(land: LandWithCrops) {
    setEditingLand(land)
    setName(land.name)
    setLocation(land.location || '')
    setAreaValue(land.areaValue !== undefined ? String(land.areaValue) : '')
    setAreaUnit(land.areaUnit || 'acre')
    setNotes(land.notes || '')
    setSelectedCropIds(land.cropIds)
    setFormError(null)
    setIsModalOpen(true)
  }

  function toggleCropSelection(cropId: string) {
    setSelectedCropIds((prev) =>
      prev.includes(cropId) ? prev.filter((id) => id !== cropId) : [...prev, cropId]
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setFormError('Land name is required')
      return
    }

    const parsedArea = areaValue.trim() ? parseFloat(areaValue) : undefined
    if (parsedArea !== undefined && (isNaN(parsedArea) || parsedArea <= 0)) {
      setFormError('Area value must be a valid positive number')
      return
    }

    setIsSaving(true)
    setFormError(null)

    try {
      await saveLand(
        {
          name: name.trim(),
          location: location.trim() || undefined,
          areaValue: parsedArea,
          areaUnit,
          notes: notes.trim() || undefined,
          isActive: true,
        },
        selectedCropIds,
        editingLand?.id
      )
      setIsModalOpen(false)
      await loadData()
    } catch (err: unknown) {
      if (err instanceof Error) {
        setFormError(err.message)
      } else {
        setFormError('Failed to save land. Please check your inputs.')
      }
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDeactivate(id: string, landName: string) {
    if (
      window.confirm(
        `Are you sure you want to deactivate "${landName}"? It will be archived and hidden from new entry forms, but historical transaction records will be preserved.`
      )
    ) {
      await deactivateLand(id)
      await loadData()
    }
  }

  const cropMap = new Map(crops.map((c) => [c.id, c.name]))

  return (
    <div className="mx-auto max-w-6xl py-8 sm:py-10">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted">Workspace / Cultivation areas</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Cultivation Areas</h1>
          <p className="mt-2 text-sm text-muted">
            Manage your lands, farm plots, and assigned crops across all locations.
          </p>
        </div>
        <Button onClick={openAddModal}>
          <Plus size={17} /> Add cultivation land
        </Button>
      </div>

      {/* Main Content */}
      {loading ? (
        <div className="mt-8 flex justify-center py-12 text-sm text-muted">
          Loading cultivation areas...
        </div>
      ) : lands.length === 0 ? (
        <Card className="mt-8 p-10 text-center">
          <div className="mx-auto grid size-12 place-items-center rounded-xl bg-forest-50 text-forest-700 dark:bg-forest-700/20 dark:text-forest-100">
            <Sprout size={24} />
          </div>
          <h2 className="mt-4 text-lg font-semibold">No cultivation areas added yet</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
            Add your first land or farm plot to start recording cultivation expenses, income, and fertilizer applications.
          </p>
          <div className="mt-6">
            <Button onClick={openAddModal}>
              <Plus size={16} /> Add your first land
            </Button>
          </div>
        </Card>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {lands.map((land) => {
            const normalizedAcres = convertAreaToAcres(land.areaValue, land.areaUnit)
            return (
              <Card key={land.id} className="flex flex-col justify-between p-5 transition-shadow hover:shadow-sm">
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="grid size-9 place-items-center rounded-lg bg-forest-50 text-forest-700 dark:bg-forest-700/20 dark:text-forest-200">
                        <Sprout size={18} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-text">{land.name}</h3>
                        {land.location && (
                          <p className="flex items-center gap-1 text-xs text-muted mt-0.5">
                            <MapPin size={12} /> {land.location}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Area Details */}
                  <div className="mt-4 rounded-lg bg-subtle p-3 text-xs">
                    <div className="flex items-center justify-between text-muted">
                      <span className="flex items-center gap-1.5 font-medium">
                        <Ruler size={14} /> Total Area
                      </span>
                      <span className="font-semibold text-text">
                        {land.areaValue !== undefined ? (
                          <>
                            {land.areaValue} {land.areaUnit === 'perch' ? 'perches' : 'acres'}
                            {land.areaUnit === 'perch' && normalizedAcres !== undefined && (
                              <span className="text-muted font-normal ml-1">
                                (~{normalizedAcres.toFixed(2)} acres)
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-muted italic">Not specified</span>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Cultivated Crops */}
                  <div className="mt-4">
                    <p className="text-xs font-medium text-muted uppercase tracking-wider">
                      Cultivated Crops
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {land.cropIds.length > 0 ? (
                        land.cropIds.map((cropId) => (
                          <span
                            key={cropId}
                            className="inline-flex items-center gap-1 rounded-md bg-forest-50 px-2 py-0.5 text-xs font-medium text-forest-700 dark:bg-forest-900/30 dark:text-forest-200"
                          >
                            <CheckCircle2 size={11} />
                            {cropMap.get(cropId) || 'Unknown crop'}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-muted italic">No crops associated yet</span>
                      )}
                    </div>
                  </div>

                  {land.notes && (
                    <p className="mt-4 text-xs text-muted line-clamp-2 border-t border-border pt-3">
                      {land.notes}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="mt-6 flex items-center justify-end gap-2 border-t border-border pt-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Edit ${land.name}`}
                    onClick={() => openEditModal(land)}
                  >
                    <Edit2 size={15} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="hover:text-red-500"
                    aria-label={`Deactivate ${land.name}`}
                    onClick={() => handleDeactivate(land.id, land.name)}
                  >
                    <Archive size={15} />
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Add / Edit Land Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingLand ? 'Edit Cultivation Land' : 'Add Cultivation Land'}
        description="Provide details about the cultivation area and select the crops grown here."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="rounded-lg bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300">
              {formError}
            </div>
          )}

          <Input
            label="Land / Area Name"
            placeholder="e.g. Upper Estate, Plot B, Riverside Acre"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
          />

          <Input
            label="Location / Village"
            placeholder="e.g. Matale, Kandy District"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Area Size"
              type="number"
              step="any"
              placeholder="e.g. 2.5 or 80"
              value={areaValue}
              onChange={(e) => setAreaValue(e.target.value)}
            />
            <Select
              label="Area Unit"
              value={areaUnit}
              onChange={(e) => setAreaUnit(e.target.value as 'acre' | 'perch')}
            >
              <option value="acre">Acres</option>
              <option value="perch">Perches (160 perches = 1 acre)</option>
            </Select>
          </div>

          {areaUnit === 'perch' && areaValue && !isNaN(parseFloat(areaValue)) && (
            <p className="text-xs text-forest-700 dark:text-forest-300">
              Normalized: ~{(parseFloat(areaValue) / 160).toFixed(3)} acres
            </p>
          )}

          {/* Crops Association Checkbox List */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-text">
              Associated Crops
            </label>
            <div className="max-h-36 overflow-y-auto rounded-lg border border-border p-2 space-y-1">
              {crops.length === 0 ? (
                <p className="text-xs text-muted italic p-1">
                  No crops found. Add crops in Settings.
                </p>
              ) : (
                crops.map((crop) => (
                  <label
                    key={crop.id}
                    className="flex items-center gap-2 rounded px-2 py-1 text-xs hover:bg-subtle cursor-pointer select-none"
                  >
                    <input
                      type="checkbox"
                      checked={selectedCropIds.includes(crop.id)}
                      onChange={() => toggleCropSelection(crop.id)}
                      className="rounded border-border text-forest-600 focus:ring-forest-500"
                    />
                    <span className="font-medium text-text">{crop.name}</span>
                    {crop.description && (
                      <span className="text-muted text-[11px] truncate">
                        — {crop.description}
                      </span>
                    )}
                  </label>
                ))
              )}
            </div>
            <p className="text-[11px] text-muted">
              Select one or more crops cultivated on this land. You can adjust this anytime.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-text">Notes</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Soil type, water source, access notes..."
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
              {isSaving ? 'Saving...' : editingLand ? 'Update Land' : 'Save Land'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
