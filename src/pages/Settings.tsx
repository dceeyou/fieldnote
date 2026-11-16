import { useState, useEffect } from 'react'
import {
  Tag,
  Sprout,
  Leaf,
  Moon,
  Sun,
  Laptop,
  Plus,
  Archive,
  Database,
  CheckCircle2,
  Download,
  Upload,
  AlertTriangle,
  ShieldCheck,
} from 'lucide-react'
import { Button } from '../components/ui/Button.tsx'
import { Card } from '../components/ui/Card.tsx'
import { Modal } from '../components/ui/Modal.tsx'
import { Input } from '../components/ui/Input.tsx'
import { Select } from '../components/ui/Select.tsx'
import { useTheme, type Theme } from '../app/ThemeProvider.tsx'
import {
  getAllCategories,
  saveCategory,
  deactivateCategory,
} from '../services/categoryService.ts'
import {
  getAllCrops,
  saveCrop,
  deactivateCrop,
} from '../services/cropService.ts'
import {
  getAllFertilizers,
  saveFertilizer,
  deactivateFertilizer,
} from '../services/fertilizerService.ts'
import {
  downloadBackup,
  validateBackup,
  restoreFromBackup,
  type BackupPayload,
} from '../services/backupService.ts'
import type { Category, Crop, Fertilizer } from '../data/db/schema.ts'

export function Settings() {
  const { theme, setTheme } = useTheme()
  const [activeTab, setActiveTab] = useState<'categories' | 'crops' | 'fertilizers' | 'general' | 'backup'>('categories')

  // Categories
  const [categories, setCategories] = useState<Category[]>([])
  const [categoryTypeFilter, setCategoryTypeFilter] = useState<'expense' | 'income'>('expense')
  const [isCatModalOpen, setIsCatModalOpen] = useState(false)
  const [catName, setCatName] = useState('')
  const [catType, setCatType] = useState<'income' | 'expense'>('expense')
  const [catDesc, setCatDesc] = useState('')

  // Crops
  const [crops, setCrops] = useState<Crop[]>([])
  const [isCropModalOpen, setIsCropModalOpen] = useState(false)
  const [cropName, setCropName] = useState('')
  const [cropDesc, setCropDesc] = useState('')

  // Fertilizers
  const [fertilizers, setFertilizers] = useState<Fertilizer[]>([])
  const [isFertModalOpen, setIsFertModalOpen] = useState(false)
  const [fertName, setFertName] = useState('')
  const [fertType, setFertType] = useState('')
  const [fertUnit, setFertUnit] = useState('kg')
  const [fertNotes, setFertNotes] = useState('')

  // Backup & Restore
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false)
  const [restorePayload, setRestorePayload] = useState<BackupPayload | null>(null)
  const [restoreError, setRestoreError] = useState<string | null>(null)
  const [restoreSuccess, setRestoreSuccess] = useState<string | null>(null)
  const [isRestoring, setIsRestoring] = useState(false)

  const [loading, setLoading] = useState(true)

  async function loadAll() {
    setLoading(true)
    try {
      const [allCats, allCrops, allFerts] = await Promise.all([
        getAllCategories(false),
        getAllCrops(false),
        getAllFertilizers(false),
      ])
      setCategories(allCats)
      setCrops(allCrops)
      setFertilizers(allFerts)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
  }, [])

  // Category handlers
  async function handleAddCategory(e: React.FormEvent) {
    e.preventDefault()
    if (!catName.trim()) return
    await saveCategory({
      name: catName.trim(),
      type: catType,
      description: catDesc.trim() || undefined,
      sortOrder: categories.length + 1,
      isActive: true,
    })
    setCatName('')
    setCatDesc('')
    setIsCatModalOpen(false)
    await loadAll()
  }

  async function handleDeactivateCategory(id: string, name: string) {
    if (window.confirm(`Deactivate category "${name}"? Historical transactions will retain this category.`)) {
      await deactivateCategory(id)
      await loadAll()
    }
  }

  // Crop handlers
  async function handleAddCrop(e: React.FormEvent) {
    e.preventDefault()
    if (!cropName.trim()) return
    await saveCrop({
      name: cropName.trim(),
      description: cropDesc.trim() || undefined,
      isActive: true,
    })
    setCropName('')
    setCropDesc('')
    setIsCropModalOpen(false)
    await loadAll()
  }

  async function handleDeactivateCrop(id: string, name: string) {
    if (window.confirm(`Deactivate crop "${name}"? Existing associations will remain intact.`)) {
      await deactivateCrop(id)
      await loadAll()
    }
  }

  // Fertilizer handlers
  async function handleAddFertilizer(e: React.FormEvent) {
    e.preventDefault()
    if (!fertName.trim()) return
    await saveFertilizer({
      name: fertName.trim(),
      type: fertType.trim() || undefined,
      defaultUnit: fertUnit.trim() || undefined,
      notes: fertNotes.trim() || undefined,
      isActive: true,
    })
    setFertName('')
    setFertType('')
    setFertUnit('kg')
    setFertNotes('')
    setIsFertModalOpen(false)
    await loadAll()
  }

  async function handleDeactivateFertilizer(id: string, name: string) {
    if (window.confirm(`Deactivate fertilizer "${name}"? Historical applications will remain recorded.`)) {
      await deactivateFertilizer(id)
      await loadAll()
    }
  }

  async function handleExportBackup() {
    try {
      const fileName = await downloadBackup()
      setRestoreSuccess(`Backup successfully downloaded as ${fileName}`)
    } catch {
      alert('Failed to generate workspace backup.')
    }
  }

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setRestoreError(null)
    setRestorePayload(null)

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string)
        const check = validateBackup(parsed)
        if (!check.valid || !check.payload) {
          setRestoreError(check.error || 'Invalid backup structure.')
          return
        }
        setRestorePayload(check.payload)
      } catch {
        setRestoreError('Failed to parse file: Content is not valid JSON.')
      }
    }
    reader.readAsText(file)
  }

  async function handleConfirmRestore() {
    if (!restorePayload) return

    setIsRestoring(true)
    setRestoreError(null)
    try {
      await restoreFromBackup(restorePayload)
      setIsRestoreModalOpen(false)
      setRestorePayload(null)
      await loadAll()
      setRestoreSuccess('Workspace data successfully restored from backup!')
    } catch (err) {
      if (err instanceof Error) {
        setRestoreError(err.message)
      } else {
        setRestoreError('Failed to restore data.')
      }
    } finally {
      setIsRestoring(false)
    }
  }

  const filteredCategories = categories.filter((c) => c.type === categoryTypeFilter)

  return (
    <div className="mx-auto max-w-5xl py-8 sm:py-10">
      <div>
        <p className="text-sm text-muted">Workspace / Settings</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Settings & Master Data</h1>
        <p className="mt-2 text-sm text-muted">
          Configure categories, crops, fertilizers catalog, and preferences for your farm workspace.
        </p>
      </div>

      {/* Tabs */}
      <div className="mt-8 flex flex-wrap gap-2 border-b border-border pb-3">
        <button
          onClick={() => setActiveTab('categories')}
          className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
            activeTab === 'categories'
              ? 'bg-forest-50 text-forest-700 dark:bg-forest-700/20 dark:text-forest-100'
              : 'text-muted hover:bg-subtle hover:text-text'
          }`}
        >
          <Tag size={16} /> Transaction Categories
        </button>
        <button
          onClick={() => setActiveTab('crops')}
          className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
            activeTab === 'crops'
              ? 'bg-forest-50 text-forest-700 dark:bg-forest-700/20 dark:text-forest-100'
              : 'text-muted hover:bg-subtle hover:text-text'
          }`}
        >
          <Sprout size={16} /> Crops Catalogue
        </button>
        <button
          onClick={() => setActiveTab('fertilizers')}
          className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
            activeTab === 'fertilizers'
              ? 'bg-forest-50 text-forest-700 dark:bg-forest-700/20 dark:text-forest-100'
              : 'text-muted hover:bg-subtle hover:text-text'
          }`}
        >
          <Leaf size={16} /> Fertilizers Catalogue
        </button>
        <button
          onClick={() => setActiveTab('general')}
          className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
            activeTab === 'general'
              ? 'bg-forest-50 text-forest-700 dark:bg-forest-700/20 dark:text-forest-100'
              : 'text-muted hover:bg-subtle hover:text-text'
          }`}
        >
          <Database size={16} /> General & Preferences
        </button>
        <button
          onClick={() => setActiveTab('backup')}
          className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
            activeTab === 'backup'
              ? 'bg-forest-50 text-forest-700 dark:bg-forest-700/20 dark:text-forest-100'
              : 'text-muted hover:bg-subtle hover:text-text'
          }`}
        >
          <ShieldCheck size={16} /> Backup & Data Safety
        </button>
      </div>

      {/* Tab 1: Categories */}
      {activeTab === 'categories' && (
        <div className="mt-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2 rounded-lg border border-border p-1 bg-surface">
              <button
                onClick={() => setCategoryTypeFilter('expense')}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  categoryTypeFilter === 'expense'
                    ? 'bg-forest-600 text-white'
                    : 'text-muted hover:text-text'
                }`}
              >
                Expense Categories ({categories.filter((c) => c.type === 'expense').length})
              </button>
              <button
                onClick={() => setCategoryTypeFilter('income')}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  categoryTypeFilter === 'income'
                    ? 'bg-forest-600 text-white'
                    : 'text-muted hover:text-text'
                }`}
              >
                Income Categories ({categories.filter((c) => c.type === 'income').length})
              </button>
            </div>
            <Button
              onClick={() => {
                setCatType(categoryTypeFilter)
                setIsCatModalOpen(true)
              }}
            >
              <Plus size={16} /> Add {categoryTypeFilter} category
            </Button>
          </div>

          <Card className="divide-y divide-border overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-sm text-muted">Loading categories...</div>
            ) : filteredCategories.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted">No categories created yet.</div>
            ) : (
              filteredCategories.map((cat) => (
                <div key={cat.id} className="flex items-center justify-between p-4 hover:bg-subtle/50">
                  <div>
                    <span className="font-medium text-text text-sm">{cat.name}</span>
                    {cat.description && (
                      <p className="text-xs text-muted mt-0.5">{cat.description}</p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="hover:text-red-500"
                    aria-label={`Deactivate ${cat.name}`}
                    onClick={() => handleDeactivateCategory(cat.id, cat.name)}
                  >
                    <Archive size={15} />
                  </Button>
                </div>
              ))
            )}
          </Card>
        </div>
      )}

      {/* Tab 2: Crops */}
      {activeTab === 'crops' && (
        <div className="mt-6 space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted">
              Crops catalogue available for assignment to cultivation areas and fertilizer applications.
            </p>
            <Button onClick={() => setIsCropModalOpen(true)}>
              <Plus size={16} /> Add crop
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {crops.map((crop) => (
              <Card key={crop.id} className="flex items-start justify-between p-4">
                <div className="flex items-start gap-3">
                  <div className="grid size-8 place-items-center rounded-lg bg-forest-50 text-forest-700 dark:bg-forest-700/20 dark:text-forest-200">
                    <Sprout size={16} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-text">{crop.name}</h4>
                    {crop.description && (
                      <p className="text-xs text-muted mt-0.5">{crop.description}</p>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="hover:text-red-500"
                  aria-label={`Deactivate ${crop.name}`}
                  onClick={() => handleDeactivateCrop(crop.id, crop.name)}
                >
                  <Archive size={15} />
                </Button>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Fertilizers */}
      {activeTab === 'fertilizers' && (
        <div className="mt-6 space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted">
              Fertilizers and soil nutrients used across your cultivation areas.
            </p>
            <Button onClick={() => setIsFertModalOpen(true)}>
              <Plus size={16} /> Add fertilizer product
            </Button>
          </div>

          {fertilizers.length === 0 ? (
            <Card className="p-8 text-center text-sm text-muted">
              No fertilizer products added yet. Add your commonly used fertilizers to track schedules and applications.
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {fertilizers.map((fert) => (
                <Card key={fert.id} className="flex items-start justify-between p-4">
                  <div className="flex items-start gap-3">
                    <div className="grid size-8 place-items-center rounded-lg bg-forest-50 text-forest-700 dark:bg-forest-700/20 dark:text-forest-200">
                      <Leaf size={16} />
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm text-text">{fert.name}</h4>
                      <p className="text-xs text-muted mt-0.5">
                        {fert.type ? `${fert.type} · ` : ''}Default unit: {fert.defaultUnit || 'kg'}
                      </p>
                      {fert.notes && <p className="text-xs text-muted mt-1 italic">{fert.notes}</p>}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="hover:text-red-500"
                    aria-label={`Deactivate ${fert.name}`}
                    onClick={() => handleDeactivateFertilizer(fert.id, fert.name)}
                  >
                    <Archive size={15} />
                  </Button>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: General */}
      {activeTab === 'general' && (
        <div className="mt-6 space-y-6">
          <Card className="p-6">
            <h3 className="font-semibold text-text">Theme Preference</h3>
            <p className="text-xs text-muted mt-1">
              Select how Fieldnote looks on your device.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              {[
                { key: 'light' as Theme, label: 'Light', icon: Sun },
                { key: 'dark' as Theme, label: 'Dark', icon: Moon },
                { key: 'system' as Theme, label: 'System', icon: Laptop },
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setTheme(key)}
                  className={`flex items-center gap-2.5 rounded-lg border px-4 py-2.5 text-sm font-medium transition-all ${
                    theme === key
                      ? 'border-forest-600 bg-forest-50/50 text-forest-700 dark:border-forest-400 dark:bg-forest-900/30 dark:text-forest-100 ring-2 ring-forest-500/30'
                      : 'border-border bg-surface text-text hover:bg-subtle'
                  }`}
                >
                  <Icon size={16} />
                  {label}
                </button>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold text-text">System & Localization</h3>
            <div className="mt-4 space-y-3 text-xs divide-y divide-border">
              <div className="flex justify-between pt-2">
                <span className="text-muted">Storage Engine</span>
                <span className="font-medium text-text flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-forest-600" /> Local-first IndexedDB (Dexie)
                </span>
              </div>
              <div className="flex justify-between pt-3">
                <span className="text-muted">Currency</span>
                <span className="font-medium text-text">Sri Lankan Rupee (LKR)</span>
              </div>
              <div className="flex justify-between pt-3">
                <span className="text-muted">Timezone</span>
                <span className="font-medium text-text">Asia/Colombo</span>
              </div>
              <div className="flex justify-between pt-3">
                <span className="text-muted">Area Units</span>
                <span className="font-medium text-text">Acres & Perches (1 acre = 160 perches)</span>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Tab 5: Backup & Data Safety */}
      {activeTab === 'backup' && (
        <div className="mt-6 space-y-6">
          {restoreSuccess && (
            <div className="rounded-lg border border-forest-200 bg-forest-50 p-4 text-xs font-medium text-forest-800 dark:border-forest-800/40 dark:bg-forest-950/40 dark:text-forest-200 flex items-center justify-between">
              <span>{restoreSuccess}</span>
              <button onClick={() => setRestoreSuccess(null)} className="text-muted hover:text-text">
                &times;
              </button>
            </div>
          )}

          {/* Export Card */}
          <Card className="p-6">
            <div className="flex items-start gap-3">
              <div className="grid size-10 place-items-center rounded-xl bg-forest-50 text-forest-700 dark:bg-forest-700/20 dark:text-forest-100">
                <Download size={20} />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-text">Export Workspace Backup</h3>
                <p className="mt-1 text-xs text-muted max-w-xl">
                  Download a complete, versioned snapshot of your entire farm workspace—including all cultivation lands,
                  crops, income and expense transactions, and fertilizer schedules—into a portable JSON file.
                </p>
                <div className="mt-4">
                  <Button onClick={handleExportBackup}>
                    <Download size={16} /> Download JSON Backup
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          {/* Restore Card */}
          <Card className="p-6">
            <div className="flex items-start gap-3">
              <div className="grid size-10 place-items-center rounded-xl bg-amber-50 text-amber-700 dark:bg-amber-700/20 dark:text-amber-100">
                <Upload size={20} />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-text">Restore from JSON Backup</h3>
                <p className="mt-1 text-xs text-muted max-w-xl">
                  Restore previously exported farm data. The application will validate the file format and schema
                  compatibility before allowing confirmation.
                </p>

                <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300">
                  <AlertTriangle size={15} className="mt-0.5 shrink-0" />
                  <span>
                    <strong>Caution:</strong> Restoring will overwrite existing records in this workspace. You can
                    download a safety backup of your current data before proceeding.
                  </span>
                </div>

                <div className="mt-4">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setRestoreError(null)
                      setRestorePayload(null)
                      setIsRestoreModalOpen(true)
                    }}
                  >
                    <Upload size={16} /> Select Backup File to Restore
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          {/* Cloud Sync Status Card */}
          <Card className="p-6">
            <div className="flex items-start gap-3">
              <div className="grid size-10 place-items-center rounded-xl bg-subtle text-muted">
                <Database size={20} />
              </div>
              <div>
                <h3 className="font-semibold text-text">Cloud Synchronization (Roadmap)</h3>
                <p className="mt-1 text-xs text-muted max-w-xl leading-relaxed">
                  Automatic cloud synchronization and encrypted remote backup via Supabase are planned for a subsequent stage.
                  The current MVP operates entirely local-first inside your browser's IndexedDB storage.
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Category Modal */}
      <Modal
        isOpen={isCatModalOpen}
        onClose={() => setIsCatModalOpen(false)}
        title={`Add ${catType === 'income' ? 'Income' : 'Expense'} Category`}
      >
        <form onSubmit={handleAddCategory} className="space-y-4">
          <Input
            label="Category Name"
            placeholder="e.g. Organic Manure, Machinery Rent"
            value={catName}
            onChange={(e) => setCatName(e.target.value)}
            required
            autoFocus
          />
          <Select
            label="Type"
            value={catType}
            onChange={(e) => setCatType(e.target.value as 'income' | 'expense')}
          >
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </Select>
          <Input
            label="Description (optional)"
            placeholder="Short description for reference"
            value={catDesc}
            onChange={(e) => setCatDesc(e.target.value)}
          />
          <div className="flex justify-end gap-3 pt-3">
            <Button type="button" variant="secondary" onClick={() => setIsCatModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Save Category</Button>
          </div>
        </form>
      </Modal>

      {/* Crop Modal */}
      <Modal
        isOpen={isCropModalOpen}
        onClose={() => setIsCropModalOpen(false)}
        title="Add Crop to Catalogue"
      >
        <form onSubmit={handleAddCrop} className="space-y-4">
          <Input
            label="Crop Name"
            placeholder="e.g. Cardamom, Cinnamon, Vanilla"
            value={cropName}
            onChange={(e) => setCropName(e.target.value)}
            required
            autoFocus
          />
          <Input
            label="Description (optional)"
            placeholder="Varieties, notes or cycle information"
            value={cropDesc}
            onChange={(e) => setCropDesc(e.target.value)}
          />
          <div className="flex justify-end gap-3 pt-3">
            <Button type="button" variant="secondary" onClick={() => setIsCropModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Save Crop</Button>
          </div>
        </form>
      </Modal>

      {/* Fertilizer Modal */}
      <Modal
        isOpen={isFertModalOpen}
        onClose={() => setIsFertModalOpen(false)}
        title="Add Fertilizer Product"
      >
        <form onSubmit={handleAddFertilizer} className="space-y-4">
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
            placeholder="Application precautions, dosage notes..."
            value={fertNotes}
            onChange={(e) => setFertNotes(e.target.value)}
          />
          <div className="flex justify-end gap-3 pt-3">
            <Button type="button" variant="secondary" onClick={() => setIsFertModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Save Fertilizer</Button>
          </div>
        </form>
      </Modal>

      {/* Restore Confirmation Modal */}
      <Modal
        isOpen={isRestoreModalOpen}
        onClose={() => setIsRestoreModalOpen(false)}
        title="Restore Workspace Data"
        description="Select a JSON backup file to validate and restore."
      >
        <div className="space-y-4">
          {restoreError && (
            <div className="rounded-lg bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300">
              {restoreError}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-text">Choose Backup File (.json)</label>
            <input
              type="file"
              accept=".json,application/json"
              onChange={handleFileSelected}
              className="w-full text-xs text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-subtle file:px-3 file:py-2 file:text-xs file:font-semibold file:text-text hover:file:bg-border"
            />
          </div>

          {restorePayload && (
            <div className="rounded-lg border border-border bg-subtle/50 p-4 space-y-2 text-xs">
              <div className="flex items-center gap-1.5 font-semibold text-text">
                <CheckCircle2 size={14} className="text-forest-600" />
                Valid Backup File Detected
              </div>
              <p className="text-muted">Exported on: {new Date(restorePayload.exportedAt).toLocaleString()}</p>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border text-[11px]">
                <span>Lands: <strong>{restorePayload.data.lands.length}</strong></span>
                <span>Crops: <strong>{restorePayload.data.crops.length}</strong></span>
                <span>Categories: <strong>{restorePayload.data.categories.length}</strong></span>
                <span>Transactions: <strong>{restorePayload.data.transactions.length}</strong></span>
                <span>Fertilizers: <strong>{restorePayload.data.fertilizers.length}</strong></span>
                <span>Applications: <strong>{restorePayload.data.fertilizerApplications.length}</strong></span>
              </div>
            </div>
          )}

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-300">
            <strong>Warning:</strong> Restoring will erase the existing database in this browser and replace it with the records above.
            <div className="mt-2">
              <Button
                variant="secondary"
                size="default"
                className="h-8 text-xs bg-white dark:bg-surface"
                onClick={handleExportBackup}
              >
                <Download size={13} /> Download safety backup of current data first
              </Button>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsRestoreModalOpen(false)}
              disabled={isRestoring}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirmRestore}
              disabled={!restorePayload || isRestoring}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isRestoring ? 'Restoring Data...' : 'Confirm & Overwrite Data'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
