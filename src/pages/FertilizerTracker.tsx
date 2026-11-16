import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Plus,
  Leaf,
  CheckCircle2,
  Calendar,
  AlertTriangle,
  Clock,
  XCircle,
  Trash2,
  Edit2,
  MapPin,
  Sprout,
  Download,
} from 'lucide-react'
import { Button } from '../components/ui/Button.tsx'
import { Card } from '../components/ui/Card.tsx'
import { Modal } from '../components/ui/Modal.tsx'
import { Input } from '../components/ui/Input.tsx'
import { Select } from '../components/ui/Select.tsx'
import { ExportModal } from '../components/export/ExportModal.tsx'
import { FertilizerProductCatalog } from '../components/fertilizer/FertilizerProductCatalog.tsx'
import {
  getFertilizerApplications,
  saveFertilizerApplication,
  markApplicationCompleted,
  cancelFertilizerApplication,
  deleteFertilizerApplication,
} from '../services/fertilizerApplicationService.ts'
import { getAllLandsWithCrops, type LandWithCrops } from '../services/landService.ts'
import { getAllCrops } from '../services/cropService.ts'
import { getAllFertilizers } from '../services/fertilizerService.ts'
import type { FertilizerApplication, Crop, Fertilizer } from '../data/db/schema.ts'
import {
  getTodayColombo,
  addDays,
  formatDateDisplay,
  formatDateDDMMYYYY,
  calculateDueDateFromInterval,
  inferReminderInterval,
  getReminderIntervalLabel,
  REMINDER_INTERVAL_OPTIONS,
  type ReminderInterval,
} from '../utils/date.ts'
import { getFertilizerDueStatus } from '../utils/reminders.ts'
import { formatLKR } from '../utils/calculations.ts'

export function FertilizerTracker() {
  const [searchParams] = useSearchParams()
  const tabParam = searchParams.get('tab')
  const [activeTab, setActiveTab] = useState<'applications' | 'products'>(
    tabParam === 'products' ? 'products' : 'applications'
  )

  const [applications, setApplications] = useState<FertilizerApplication[]>([])
  const [lands, setLands] = useState<LandWithCrops[]>([])
  const [crops, setCrops] = useState<Crop[]>([])
  const [fertilizers, setFertilizers] = useState<Fertilizer[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [landFilter, setLandFilter] = useState('all')
  const [cropFilter, setCropFilter] = useState('all')

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false)
  const [isExportModalOpen, setIsExportModalOpen] = useState(false)
  const [editingApp, setEditingApp] = useState<FertilizerApplication | null>(null)
  const [completingApp, setCompletingApp] = useState<FertilizerApplication | null>(null)

  // Add/Edit Form Fields
  const [landId, setLandId] = useState('')
  const [cropId, setCropId] = useState('')
  const [fertilizerId, setFertilizerId] = useState('')
  const [applicationDate, setApplicationDate] = useState(getTodayColombo())
  const [reminderInterval, setReminderInterval] = useState<ReminderInterval>('1_month')
  const [quantity, setQuantity] = useState('')
  const [unit, setUnit] = useState('kg')
  const [cost, setCost] = useState('')
  const [nextDueDate, setNextDueDate] = useState('')
  const [notes, setNotes] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Mark Completed Form Fields
  const [completedDate, setCompletedDate] = useState(getTodayColombo())
  const [nextScheduleDate, setNextScheduleDate] = useState('')

  const today = getTodayColombo()

  // Quick lookup maps
  const landMap = useMemo(() => new Map(lands.map((l) => [l.id, l.name])), [lands])
  const cropMap = useMemo(() => new Map(crops.map((c) => [c.id, c.name])), [crops])
  const fertMap = useMemo(() => new Map(fertilizers.map((f) => [f.id, f.name])), [fertilizers])

  async function loadMetadata() {
    const [allLands, allCrops, allFerts] = await Promise.all([
      getAllLandsWithCrops(true),
      getAllCrops(true),
      getAllFertilizers(true),
    ])
    setLands(allLands)
    setCrops(allCrops)
    setFertilizers(allFerts)
  }

  async function loadApplications() {
    setLoading(true)
    try {
      const data = await getFertilizerApplications({
        landId: landFilter,
        cropId: cropFilter,
      })
      setApplications(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMetadata()
  }, [])

  useEffect(() => {
    loadApplications()
  }, [landFilter, cropFilter])

  // Count reminder metrics for active scheduled applications
  const counts = useMemo(() => {
    let overdue = 0
    let dueToday = 0
    let dueSoon = 0
    let upcoming = 0
    let completed = 0

    for (const app of applications) {
      if (app.status === 'completed') {
        completed++
        continue
      }
      if (app.status === 'cancelled') continue

      if (app.nextDueDate) {
        const { status } = getFertilizerDueStatus(app.nextDueDate, today)
        if (status === 'overdue') overdue++
        else if (status === 'due_today') dueToday++
        else if (status === 'due_soon') dueSoon++
        else upcoming++
      } else {
        upcoming++
      }
    }
    return { overdue, dueToday, dueSoon, upcoming, completed, total: applications.length }
  }, [applications, today])

  // Filtered view by status filter
  const displayedApplications = useMemo(() => {
    return applications.filter((app) => {
      if (statusFilter === 'all') return true
      if (statusFilter === 'completed') return app.status === 'completed'
      if (statusFilter === 'cancelled') return app.status === 'cancelled'

      // Reminder-based status filtering for scheduled items
      if (app.status !== 'scheduled') return false
      if (!app.nextDueDate) return statusFilter === 'upcoming'

      const { status } = getFertilizerDueStatus(app.nextDueDate, today)
      return status === statusFilter
    })
  }, [applications, statusFilter, today])

  // Associated crops for currently selected land in modal
  const cropsForSelectedLand = useMemo(() => {
    if (!landId) return crops.filter((c) => c.isActive)
    const selectedLand = lands.find((l) => l.id === landId)
    if (!selectedLand || selectedLand.cropIds.length === 0) {
      return crops.filter((c) => c.isActive)
    }
    return crops.filter((c) => c.isActive && selectedLand.cropIds.includes(c.id))
  }, [landId, lands, crops])

  function handleApplicationDateChange(newDate: string) {
    setApplicationDate(newDate)
    if (reminderInterval !== 'custom' && newDate) {
      const calculated = calculateDueDateFromInterval(newDate, reminderInterval)
      if (calculated) {
        setNextDueDate(calculated)
      }
    }
  }

  function handleIntervalChange(newInterval: ReminderInterval) {
    setReminderInterval(newInterval)
    if (newInterval !== 'custom') {
      const calculated = calculateDueDateFromInterval(applicationDate, newInterval)
      if (calculated) {
        setNextDueDate(calculated)
      }
    }
  }

  function openAddModal() {
    setEditingApp(null)
    const firstLand = lands.find((l) => l.isActive)
    const firstCrop = crops.find((c) => c.isActive)
    const firstFert = fertilizers.find((f) => f.isActive)

    const todayStr = getTodayColombo()
    setLandId(firstLand?.id || '')
    setCropId(firstCrop?.id || '')
    setFertilizerId(firstFert?.id || '')
    setApplicationDate(todayStr)
    setReminderInterval('1_month')
    setQuantity('')
    setUnit(firstFert?.defaultUnit || 'kg')
    setCost('')
    setNextDueDate(calculateDueDateFromInterval(todayStr, '1_month') || '')
    setNotes('')
    setFormError(null)
    setIsAddModalOpen(true)
  }

  function openEditModal(app: FertilizerApplication) {
    setEditingApp(app)
    setLandId(app.landId)
    setCropId(app.cropId)
    setFertilizerId(app.fertilizerId)
    setApplicationDate(app.applicationDate)
    setQuantity(app.quantity !== undefined ? String(app.quantity) : '')
    setUnit(app.unit || 'kg')
    setCost(app.cost !== undefined ? String(app.cost) : '')

    const resolvedInterval = inferReminderInterval(
      app.applicationDate,
      app.nextDueDate,
      app.reminderInterval
    )
    setReminderInterval(resolvedInterval)
    setNextDueDate(app.nextDueDate || '')
    setNotes(app.notes || '')
    setFormError(null)
    setIsAddModalOpen(true)
  }

  function openCompleteModal(app: FertilizerApplication) {
    setCompletingApp(app)
    setCompletedDate(getTodayColombo())
    const interval = (app.reminderInterval as ReminderInterval) || '1_month'
    const nextDate =
      interval !== 'custom'
        ? calculateDueDateFromInterval(getTodayColombo(), interval)
        : addDays(getTodayColombo(), 30)
    setNextScheduleDate(nextDate || addDays(getTodayColombo(), 30))
    setIsCompleteModalOpen(true)
  }

  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!landId) {
      setFormError('Land selection is required.')
      return
    }
    if (!cropId) {
      setFormError('Crop selection is required.')
      return
    }
    if (!fertilizerId) {
      setFormError('Fertilizer product selection is required.')
      return
    }

    if (reminderInterval === 'custom' && !nextDueDate) {
      setFormError('Please select a valid Next Due Date.')
      return
    }

    if (nextDueDate && applicationDate && nextDueDate < applicationDate) {
      setFormError('Next due date cannot be earlier than application date.')
      return
    }

    const parsedQty = quantity ? parseFloat(quantity) : undefined
    if (parsedQty !== undefined && (isNaN(parsedQty) || parsedQty <= 0)) {
      setFormError('Quantity must be a positive number.')
      return
    }

    const parsedCost = cost ? parseFloat(cost) : undefined
    if (parsedCost !== undefined && (isNaN(parsedCost) || parsedCost < 0)) {
      setFormError('Cost must be a valid positive amount.')
      return
    }

    setIsSaving(true)
    setFormError(null)

    try {
      await saveFertilizerApplication(
        {
          landId,
          cropId,
          fertilizerId,
          applicationDate,
          quantity: parsedQty,
          unit: unit.trim() || undefined,
          cost: parsedCost,
          reminderInterval,
          nextDueDate: nextDueDate || undefined,
          status: editingApp ? editingApp.status : 'scheduled',
          notes: notes.trim() || undefined,
        },
        editingApp?.id
      )
      setIsAddModalOpen(false)
      await loadApplications()
    } catch (err: unknown) {
      if (err instanceof Error) {
        setFormError(err.message)
      } else {
        setFormError('Failed to save fertilizer application.')
      }
    } finally {
      setIsSaving(false)
    }
  }

  async function handleConfirmComplete(e: React.FormEvent) {
    e.preventDefault()
    if (!completingApp) return

    await markApplicationCompleted(
      completingApp.id,
      completedDate,
      nextScheduleDate || undefined,
      completingApp.reminderInterval
    )
    setIsCompleteModalOpen(false)
    await loadApplications()
  }

  async function handleCancel(id: string) {
    if (window.confirm('Cancel this scheduled fertilizer application?')) {
      await cancelFertilizerApplication(id)
      await loadApplications()
    }
  }

  async function handleDelete(id: string) {
    if (window.confirm('Delete this fertilizer application record?')) {
      await deleteFertilizerApplication(id)
      await loadApplications()
    }
  }

  function renderStatusBadge(app: FertilizerApplication) {
    if (app.status === 'completed') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-forest-50 px-2.5 py-1 text-xs font-medium text-forest-700 dark:bg-forest-900/40 dark:text-forest-200">
          <CheckCircle2 size={13} /> Completed
        </span>
      )
    }
    if (app.status === 'cancelled') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-subtle px-2.5 py-1 text-xs font-medium text-muted">
          <XCircle size={13} /> Cancelled
        </span>
      )
    }

    if (!app.nextDueDate) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-200">
          <Clock size={13} /> Scheduled
        </span>
      )
    }

    const { status, daysRemaining } = getFertilizerDueStatus(app.nextDueDate, today)

    if (status === 'overdue') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-800 dark:bg-red-950/60 dark:text-red-300">
          <AlertTriangle size={13} /> Overdue by {Math.abs(daysRemaining)} {Math.abs(daysRemaining) === 1 ? 'day' : 'days'}
        </span>
      )
    }
    if (status === 'due_today') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
          <Clock size={13} /> Due Today
        </span>
      )
    }
    if (status === 'due_soon') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-200">
          <Clock size={13} /> Due in {daysRemaining} days
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-forest-50 px-2.5 py-1 text-xs font-medium text-forest-700 dark:bg-forest-900/30 dark:text-forest-200">
        <Calendar size={13} /> Due in {daysRemaining} days
      </span>
    )
  }

  return (
    <div className="mx-auto max-w-6xl py-8 sm:py-10">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted">Workspace / Fertilizer tracker</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Fertilizer Tracker</h1>
          <p className="mt-2 text-sm text-muted">
            Log fertilizer applications, set next due dates, and monitor in-app reminders.
          </p>
        </div>
        {activeTab === 'applications' && (
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => setIsExportModalOpen(true)}>
              <Download size={16} /> Export Data
            </Button>
            <Button onClick={openAddModal}>
              <Plus size={17} /> Schedule application
            </Button>
          </div>
        )}
      </div>

      {/* View Switcher Tabs */}
      <div className="mt-6 flex flex-wrap gap-2 border-b border-border pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('applications')}
          className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
            activeTab === 'applications'
              ? 'bg-forest-50 text-forest-700 dark:bg-forest-700/20 dark:text-forest-100 font-semibold'
              : 'text-muted hover:bg-subtle hover:text-text'
          }`}
        >
          <Clock size={16} /> Applications & Schedules
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('products')}
          className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
            activeTab === 'products'
              ? 'bg-forest-50 text-forest-700 dark:bg-forest-700/20 dark:text-forest-100 font-semibold'
              : 'text-muted hover:bg-subtle hover:text-text'
          }`}
        >
          <Leaf size={16} /> Fertilizer Products ({fertilizers.length})
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'products' ? (
        <div className="mt-6">
          <FertilizerProductCatalog onProductChanged={loadMetadata} />
        </div>
      ) : (
        <>
          {/* Reminder Metric Cards */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card
          onClick={() => setStatusFilter('overdue')}
          className={`p-4 cursor-pointer transition-all hover:border-red-400 ${
            statusFilter === 'overdue' ? 'ring-2 ring-red-500' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted uppercase tracking-wider">Overdue</span>
            <AlertTriangle size={18} className="text-red-500" />
          </div>
          <p className="mt-3 text-2xl font-bold text-red-600">{counts.overdue}</p>
          <p className="text-xs text-muted mt-1">Requires immediate attention</p>
        </Card>

        <Card
          onClick={() => setStatusFilter('due_today')}
          className={`p-4 cursor-pointer transition-all hover:border-amber-400 ${
            statusFilter === 'due_today' ? 'ring-2 ring-amber-500' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted uppercase tracking-wider">Due Today</span>
            <Clock size={18} className="text-amber-500" />
          </div>
          <p className="mt-3 text-2xl font-bold text-amber-600">{counts.dueToday}</p>
          <p className="text-xs text-muted mt-1">Scheduled for today</p>
        </Card>

        <Card
          onClick={() => setStatusFilter('due_soon')}
          className={`p-4 cursor-pointer transition-all hover:border-amber-300 ${
            statusFilter === 'due_soon' ? 'ring-2 ring-amber-400' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted uppercase tracking-wider">Due Soon</span>
            <Calendar size={18} className="text-forest-600" />
          </div>
          <p className="mt-3 text-2xl font-bold text-forest-700 dark:text-forest-300">{counts.dueSoon}</p>
          <p className="text-xs text-muted mt-1">Within next 7 calendar days</p>
        </Card>

        <Card
          onClick={() => setStatusFilter('completed')}
          className={`p-4 cursor-pointer transition-all hover:border-forest-400 ${
            statusFilter === 'completed' ? 'ring-2 ring-forest-500' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted uppercase tracking-wider">Completed</span>
            <CheckCircle2 size={18} className="text-forest-600" />
          </div>
          <p className="mt-3 text-2xl font-bold text-text">{counts.completed}</p>
          <p className="text-xs text-muted mt-1">Logged past applications</p>
        </Card>
      </div>

      {/* Filter Bar */}
      <Card className="mt-6 p-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All Applications ({counts.total})</option>
            <option value="overdue">Overdue Only ({counts.overdue})</option>
            <option value="due_today">Due Today ({counts.dueToday})</option>
            <option value="due_soon">Due Soon (&le; 7 days) ({counts.dueSoon})</option>
            <option value="upcoming">Upcoming (&gt; 7 days)</option>
            <option value="completed">Completed History ({counts.completed})</option>
            <option value="cancelled">Cancelled</option>
          </Select>

          <Select value={landFilter} onChange={(e) => setLandFilter(e.target.value)}>
            <option value="all">All Cultivation Lands</option>
            {lands.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </Select>

          <Select value={cropFilter} onChange={(e) => setCropFilter(e.target.value)}>
            <option value="all">All Crops</option>
            {crops.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
      </Card>

      {/* Applications List */}
      <div className="mt-6">
        {loading ? (
          <div className="py-12 text-center text-sm text-muted">Loading fertilizer applications...</div>
        ) : displayedApplications.length === 0 ? (
          <Card className="p-10 text-center">
            <div className="mx-auto grid size-12 place-items-center rounded-xl bg-forest-50 text-forest-700 dark:bg-forest-700/20 dark:text-forest-100">
              <Leaf size={24} />
            </div>
            <h3 className="mt-4 font-semibold text-text">No fertilizer records match</h3>
            <p className="mt-1 text-sm text-muted max-w-sm mx-auto">
              There are no fertilizer applications for this status or filter. Schedule an application to track due dates and reminders.
            </p>
            <div className="mt-5">
              <Button onClick={openAddModal}>
                <Plus size={16} /> Schedule application
              </Button>
            </div>
          </Card>
        ) : (
          <Card className="divide-y divide-border overflow-hidden">
            {displayedApplications.map((app) => {
              const isScheduled = app.status === 'scheduled'
              return (
                <div
                  key={app.id}
                  className="p-5 flex flex-wrap items-center justify-between gap-4 hover:bg-subtle/40 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h4 className="font-semibold text-text">
                        {fertMap.get(app.fertilizerId) || 'Unknown Fertilizer'}
                      </h4>
                      {renderStatusBadge(app)}
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-muted pt-1">
                      <span className="flex items-center gap-1 font-medium text-text">
                        <MapPin size={13} className="text-muted" />
                        {landMap.get(app.landId) || 'Unknown Land'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Sprout size={13} />
                        {cropMap.get(app.cropId) || 'Unknown Crop'}
                      </span>
                      <span>
                        Applied: <strong>{formatDateDisplay(app.applicationDate)}</strong>
                      </span>
                      {app.nextDueDate && (
                        <span>
                          Next Due: <strong>{formatDateDisplay(app.nextDueDate)}</strong>
                          {app.reminderInterval && (
                            <span className="ml-1 text-muted">
                              ({getReminderIntervalLabel(app.reminderInterval)})
                            </span>
                          )}
                        </span>
                      )}
                      {app.quantity && (
                        <span>
                          Qty: <strong>{app.quantity} {app.unit || 'kg'}</strong>
                        </span>
                      )}
                      {app.cost !== undefined && app.cost > 0 && (
                        <span>
                          Cost: <strong>{formatLKR(app.cost)}</strong>
                        </span>
                      )}
                    </div>

                    {app.notes && (
                      <p className="text-xs text-muted italic pt-0.5">{app.notes}</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {isScheduled && (
                      <Button
                        size="default"
                        className="h-9 px-3 text-xs bg-forest-600 hover:bg-forest-700"
                        onClick={() => openCompleteModal(app)}
                      >
                        <CheckCircle2 size={15} /> Mark Completed
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      aria-label="Edit application"
                      onClick={() => openEditModal(app)}
                    >
                      <Edit2 size={14} />
                    </Button>
                    {isScheduled && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 hover:text-amber-600"
                        aria-label="Cancel application"
                        onClick={() => handleCancel(app.id)}
                      >
                        <XCircle size={14} />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 hover:text-red-500"
                      aria-label="Delete application"
                      onClick={() => handleDelete(app.id)}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              )
            })}
          </Card>
        )}
      </div>
      </>
      )}

      {/* Add / Edit Application Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={editingApp ? 'Edit Fertilizer Application' : 'Schedule Fertilizer Application'}
        description="Select the cultivation land, crop, and fertilizer product with dates."
      >
        <form onSubmit={handleFormSubmit} className="space-y-4">
          {formError && (
            <div className="rounded-lg bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Cultivation Land"
              value={landId}
              onChange={(e) => {
                setLandId(e.target.value)
                setCropId('')
              }}
              required
            >
              <option value="">— Select land —</option>
              {lands
                .filter((l) => l.isActive || l.id === landId)
                .map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
            </Select>

            <Select
              label="Target Crop"
              value={cropId}
              onChange={(e) => setCropId(e.target.value)}
              required
            >
              <option value="">— Select crop —</option>
              {cropsForSelectedLand.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>

          <Select
            label="Fertilizer Product"
            value={fertilizerId}
            onChange={(e) => {
              const selectedId = e.target.value
              setFertilizerId(selectedId)
              const fert = fertilizers.find((f) => f.id === selectedId)
              if (fert?.defaultUnit) {
                setUnit(fert.defaultUnit)
              }
            }}
            required
          >
            <option value="">— Select fertilizer product —</option>
            {fertilizers
              .filter((f) => f.isActive || f.id === fertilizerId)
              .map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} {f.type ? `(${f.type})` : ''}
                </option>
              ))}
          </Select>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Application Date"
              type="date"
              value={applicationDate}
              onChange={(e) => handleApplicationDateChange(e.target.value)}
              required
            />
            <Select
              label="Reminder Interval"
              value={reminderInterval}
              onChange={(e) => handleIntervalChange(e.target.value as ReminderInterval)}
              required
            >
              {REMINDER_INTERVAL_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </div>

          {reminderInterval === 'custom' ? (
            <div className="space-y-1">
              <Input
                label="Next Due Date"
                type="date"
                min={applicationDate}
                value={nextDueDate}
                onChange={(e) => setNextDueDate(e.target.value)}
                helperText={
                  nextDueDate
                    ? `Formatted: ${formatDateDDMMYYYY(nextDueDate)}`
                    : 'Select custom due date'
                }
                required
              />
            </div>
          ) : (
            <div className="rounded-lg border border-border bg-subtle/50 p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted">Calculated Next Due Date</p>
                  <p className="mt-0.5 text-base font-semibold text-text">
                    {nextDueDate ? formatDateDDMMYYYY(nextDueDate) : '—'}
                  </p>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-forest-50 px-2.5 py-1 text-xs font-medium text-forest-700 dark:bg-forest-900/30 dark:text-forest-200">
                  <Calendar size={13} />
                  {getReminderIntervalLabel(reminderInterval)}
                </span>
              </div>
              <p className="mt-1.5 text-xs text-muted">
                Next application date is calculated automatically.
              </p>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <Input
              label="Quantity"
              type="number"
              step="any"
              placeholder="e.g. 50"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
            <Input
              label="Unit"
              placeholder="kg, L, bags"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
            />
            <Input
              label="Cost (LKR)"
              type="number"
              step="any"
              placeholder="0.00"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-text">Notes (optional)</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Dosage, application technique, weather conditions..."
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-forest-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsAddModalOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Saving...' : editingApp ? 'Update Application' : 'Save Application'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Mark Completed Modal */}
      <Modal
        isOpen={isCompleteModalOpen}
        onClose={() => setIsCompleteModalOpen(false)}
        title="Mark Application Completed"
        description="Record the completion of this application and optionally schedule the next cycle."
      >
        <form onSubmit={handleConfirmComplete} className="space-y-4">
          <Input
            label="Actual Date Completed"
            type="date"
            value={completedDate}
            onChange={(e) => setCompletedDate(e.target.value)}
            required
            autoFocus
          />

          <div className="space-y-2">
            <Input
              label="Schedule Next Application (Optional)"
              type="date"
              value={nextScheduleDate}
              onChange={(e) => setNextScheduleDate(e.target.value)}
              helperText="Automatically creates the next scheduled application record"
            />

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={() => setNextScheduleDate(addDays(completedDate, 14))}
                className="rounded-md border border-border px-2 py-1 text-xs text-muted hover:bg-subtle hover:text-text"
              >
                +2 Weeks
              </button>
              <button
                type="button"
                onClick={() => setNextScheduleDate(addDays(completedDate, 30))}
                className="rounded-md border border-border px-2 py-1 text-xs text-muted hover:bg-subtle hover:text-text"
              >
                +1 Month
              </button>
              <button
                type="button"
                onClick={() => setNextScheduleDate(addDays(completedDate, 60))}
                className="rounded-md border border-border px-2 py-1 text-xs text-muted hover:bg-subtle hover:text-text"
              >
                +2 Months
              </button>
              <button
                type="button"
                onClick={() => setNextScheduleDate('')}
                className="rounded-md border border-border px-2 py-1 text-xs text-muted hover:bg-subtle hover:text-text"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsCompleteModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit">
              <CheckCircle2 size={16} /> Confirm Completion
            </Button>
          </div>
        </form>
      </Modal>

      {/* Export to Excel Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        initialDataType="fertilizer"
      />
    </div>
  )
}
