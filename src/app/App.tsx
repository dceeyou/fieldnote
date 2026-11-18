import { useState, useEffect, useRef } from 'react'
import { NavLink, Route, Routes, useLocation, useNavigate, Outlet } from 'react-router-dom'
import {
  ArrowDownLeft,
  BarChart3,
  Download,
  LayoutDashboard,
  Leaf,
  Menu,
  Moon,
  Plus,
  Settings as SettingsIcon,
  Sprout,
  Sun,
  Tractor,
  X,
  LogOut,
  ChevronDown,
} from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { useTheme } from './ThemeProvider'
import { AuthProvider, useAuth } from '../context/AuthContext.tsx'
import { ProtectedRoute } from '../components/auth/ProtectedRoute.tsx'
import { GuestRoute } from '../components/auth/GuestRoute.tsx'
import { Login } from '../pages/Login.tsx'
import { ResetPassword } from '../pages/ResetPassword.tsx'
import { CultivationAreas } from '../pages/CultivationAreas.tsx'
import { Settings } from '../pages/Settings.tsx'
import { Transactions } from '../pages/Transactions.tsx'
import { FertilizerTracker } from '../pages/FertilizerTracker.tsx'
import { Dashboard } from '../pages/Dashboard.tsx'
import { Reports } from '../pages/Reports.tsx'
import { seedDatabaseIfEmpty } from '../data/db/seed.ts'
import { syncWorkspace } from '../services/syncService.ts'
import { MobileBottomNav } from '../components/navigation/MobileBottomNav.tsx'
import { OfflineIndicator } from '../components/pwa/OfflineIndicator.tsx'
import { PwaInstallModal } from '../components/pwa/PwaInstallModal.tsx'
import { PwaUpdateBanner } from '../components/pwa/PwaUpdateBanner.tsx'

const navigation = [
  { label: 'Dashboard', to: '/', icon: LayoutDashboard },
  { label: 'Transactions', to: '/transactions', icon: ArrowDownLeft },
  { label: 'Fertilizer tracker', to: '/fertilizer', icon: Leaf },
  { label: 'Cultivation areas', to: '/cultivation', icon: Sprout },
  { label: 'Reports', to: '/reports', icon: BarChart3 },
]

function getInitials(email?: string | null): string {
  if (!email) return 'AD'
  const namePart = email.split('@')[0]
  if (namePart.length <= 2) return namePart.toUpperCase()
  return (namePart[0] + namePart[1]).toUpperCase()
}

function Sidebar({ close, onOpenInstall }: { close?: () => void; onOpenInstall: () => void }) {
  const { user, logout } = useAuth()
  const [loggingOut, setLoggingOut] = useState(false)

  async function handleLogout() {
    setLoggingOut(true)
    try {
      await logout()
    } finally {
      setLoggingOut(false)
    }
  }

  const initials = getInitials(user?.email)
  const userDisplay = user?.email || 'Administrator'

  return (
    <aside className="flex h-full w-64 flex-col border-r border-border bg-surface px-4 py-5">
      <div className="mb-9 flex items-center gap-3 px-2">
        <div className="grid size-9 place-items-center rounded-xl bg-forest-600 text-white">
          <Tractor size={19} />
        </div>
        <div>
          <p className="font-semibold tracking-tight">AgriFlow</p>
          <p className="text-xs text-muted">Agriculture management</p>
        </div>
      </div>

      <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[.12em] text-muted">
        Workspace
      </p>

      <nav className="space-y-1" aria-label="Main navigation">
        {navigation.map(({ label, to, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={close}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                isActive
                  ? 'bg-forest-50 font-medium text-forest-700 dark:bg-forest-700/20 dark:text-forest-100'
                  : 'text-muted hover:bg-subtle hover:text-text'
              }`
            }
          >
            <Icon size={18} strokeWidth={1.8} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto space-y-1">
        <NavLink
          to="/settings"
          onClick={close}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
              isActive
                ? 'bg-forest-50 font-medium text-forest-700 dark:bg-forest-700/20 dark:text-forest-100'
                : 'text-muted hover:bg-subtle hover:text-text'
            }`
          }
        >
          <SettingsIcon size={18} />
          Settings
        </NavLink>
        <button
          type="button"
          onClick={() => {
            close?.()
            onOpenInstall()
          }}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted hover:bg-subtle hover:text-text transition-colors"
        >
          <Download size={18} />
          Install App
        </button>

        {/* User Card & Sign Out */}
        <div className="mt-4 border-t border-border px-2 pt-4">
          <div className="flex items-center gap-3">
            <div className="grid size-9 shrink-0 place-items-center rounded-full bg-[#e9eee6] text-xs font-semibold text-forest-700 dark:bg-[#344537] dark:text-[#d7e6d3]">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-text" title={userDisplay}>
                {userDisplay}
              </p>
              <div className="flex items-center gap-1.5 text-[11px] text-muted">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                <span>Admin</span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              title="Sign out"
              aria-label="Sign out of farm workspace"
              className="grid size-9 place-items-center rounded-lg text-muted hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400 transition-colors"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </div>
    </aside>
  )
}

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="mx-auto max-w-3xl py-10">
      <p className="text-sm text-muted">Workspace / {title}</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">{title}</h1>
      <Card className="mt-8 p-8">
        <div className="mx-auto grid max-w-md justify-items-center text-center">
          <div className="grid size-12 place-items-center rounded-xl bg-forest-50 text-forest-700 dark:bg-forest-700/20 dark:text-forest-100">
            <Sprout size={23} />
          </div>
          <h2 className="mt-4 text-lg font-semibold">Page not found</h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            The requested AgriFlow view does not exist. Use the navigation bar to return to your farm workspace.
          </p>
        </div>
      </Card>
    </div>
  )
}

function WorkspaceLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [installModalOpen, setInstallModalOpen] = useState(false)
  const [quickMenuOpen, setQuickMenuOpen] = useState(false)
  const quickMenuRef = useRef<HTMLDivElement>(null)
  const location = useLocation()
  const navigate = useNavigate()
  const { theme, setTheme } = useTheme()
  const { user, logout } = useAuth()

  useEffect(() => {
    seedDatabaseIfEmpty()
      .then(() => {
        if (navigator.onLine) {
          syncWorkspace().catch(console.warn)
        }
      })
      .catch(console.error)

    const handleOnline = () => {
      syncWorkspace().catch(console.warn)
    }
    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [])

  // Close Quick Actions dropdown on outside click or Escape
  useEffect(() => {
    if (!quickMenuOpen) return
    function handleOutside(e: MouseEvent) {
      if (quickMenuRef.current && !quickMenuRef.current.contains(e.target as Node)) {
        setQuickMenuOpen(false)
      }
    }
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') setQuickMenuOpen(false)
    }
    document.addEventListener('mousedown', handleOutside)
    window.addEventListener('keydown', handleEsc)
    return () => {
      document.removeEventListener('mousedown', handleOutside)
      window.removeEventListener('keydown', handleEsc)
    }
  }, [quickMenuOpen])

  const title =
    navigation.find((item) => item.to === location.pathname)?.label ??
    (location.pathname === '/settings' ? 'Settings' : 'Workspace')

  const initials = getInitials(user?.email)

  return (
    <div className="min-h-screen bg-canvas text-text overflow-x-clip">
      <OfflineIndicator />

      {/* Desktop Sidebar */}
      <div className="hidden md:fixed md:inset-y-0 md:flex">
        <Sidebar onOpenInstall={() => setInstallModalOpen(true)} />
      </div>

      {/* Mobile Drawer (z-50 sits cleanly above z-40 mobile FAB) */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Navigation menu">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setDrawerOpen(false)}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />
          <div className="relative h-full w-72 max-w-[85vw]">
            <button
              type="button"
              aria-label="Close navigation drawer"
              onClick={() => setDrawerOpen(false)}
              className="absolute right-3 top-3 z-10 grid size-10 place-items-center rounded-md text-muted hover:bg-subtle"
            >
              <X size={18} />
            </button>
            <Sidebar
              close={() => setDrawerOpen(false)}
              onOpenInstall={() => setInstallModalOpen(true)}
            />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="md:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-canvas/90 px-4 backdrop-blur sm:px-7">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="grid size-10 place-items-center rounded-lg text-muted hover:bg-subtle md:hidden"
            aria-label="Open navigation"
          >
            <Menu size={20} />
          </button>

          <div className="flex items-center gap-2 min-w-0">
            <span className="font-semibold tracking-tight md:hidden">AgriFlow</span>
            <span className="text-border md:hidden" aria-hidden="true">/</span>
            <span className="truncate text-sm font-medium text-muted md:text-text">{title}</span>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Change theme"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="size-10"
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </Button>

            {/* Functional Quick Actions Dropdown */}
            <div className="relative hidden sm:block" ref={quickMenuRef}>
              <Button
                variant="secondary"
                aria-haspopup="menu"
                aria-expanded={quickMenuOpen}
                onClick={() => setQuickMenuOpen((prev) => !prev)}
                className="gap-1.5"
              >
                <Plus size={15} />
                <span>Quick actions</span>
                <ChevronDown size={14} className={`transition-transform ${quickMenuOpen ? 'rotate-180' : ''}`} />
              </Button>

              {quickMenuOpen && (
                <div
                  role="menu"
                  aria-label="Quick workspace actions"
                  className="absolute right-0 mt-2 w-56 rounded-xl border border-border bg-surface p-1.5 shadow-lg z-40"
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setQuickMenuOpen(false)
                      navigate('/transactions?action=add')
                    }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-text hover:bg-subtle transition-colors"
                  >
                    <ArrowDownLeft size={16} className="text-forest-600" />
                    <span>Record transaction</span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setQuickMenuOpen(false)
                      navigate('/fertilizer?action=add')
                    }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-text hover:bg-subtle transition-colors"
                  >
                    <Leaf size={16} className="text-forest-600" />
                    <span>Schedule fertilizer</span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setQuickMenuOpen(false)
                      navigate('/cultivation')
                    }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-text hover:bg-subtle transition-colors"
                  >
                    <Sprout size={16} className="text-forest-600" />
                    <span>Cultivation areas</span>
                  </button>
                  <div className="my-1 border-t border-border" />
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setQuickMenuOpen(false)
                      setInstallModalOpen(true)
                    }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-text hover:bg-subtle transition-colors"
                  >
                    <Download size={16} className="text-muted" />
                    <span>Install AgriFlow App</span>
                  </button>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => logout()}
              title={`Logged in as ${user?.email || 'Admin'} · Click to Sign Out`}
              aria-label={`Sign out (${user?.email || 'Admin'})`}
              className="ml-1 grid size-9 place-items-center rounded-full bg-[#e9eee6] text-[11px] font-semibold text-forest-700 dark:bg-[#344537] dark:text-[#d7e6d3] hover:ring-2 hover:ring-forest-500 transition-all cursor-pointer"
            >
              {initials}
            </button>
          </div>
        </header>

        <main className="min-h-[calc(100vh-4rem)] px-4 sm:px-7 pb-28 md:pb-8">
          <Outlet />
          <footer className="mx-auto flex flex-wrap max-w-6xl items-center justify-between gap-2 border-t border-border py-5 text-xs text-muted">
            <span>AgriFlow · Local-first workspace · LKR · Asia/Colombo</span>
            <span>Single-Admin Workspace · PWA Ready</span>
          </footer>
        </main>

        {/* Mobile Bottom Navigation Bar */}
        <MobileBottomNav />
      </div>

      {/* Mounted PWA Install & Update UI */}
      <PwaInstallModal
        isOpen={installModalOpen}
        onClose={() => setInstallModalOpen(false)}
      />
      <PwaUpdateBanner />
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public / Unauthenticated Routes */}
        <Route
          path="/login"
          element={
            <GuestRoute>
              <Login />
            </GuestRoute>
          }
        />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Protected Workspace Routes */}
        <Route
          element={
            <ProtectedRoute>
              <WorkspaceLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<Dashboard />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/fertilizer" element={<FertilizerTracker />} />
          <Route path="/cultivation" element={<CultivationAreas />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<PlaceholderPage title="Workspace" />} />
        </Route>
      </Routes>
    </AuthProvider>
  )
}
