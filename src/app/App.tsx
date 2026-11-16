import { useState, useEffect } from 'react'
import { NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { ArrowDownLeft, BarChart3, ChevronDown, CircleHelp, Command, LayoutDashboard, Leaf, Menu, Moon, Search, Settings as SettingsIcon, Sprout, Sun, Tractor, X } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { useTheme } from './ThemeProvider'
import { CultivationAreas } from '../pages/CultivationAreas.tsx'
import { Settings } from '../pages/Settings.tsx'
import { Transactions } from '../pages/Transactions.tsx'
import { FertilizerTracker } from '../pages/FertilizerTracker.tsx'
import { Dashboard } from '../pages/Dashboard.tsx'
import { Reports } from '../pages/Reports.tsx'
import { seedDatabaseIfEmpty } from '../data/db/seed.ts'

const navigation = [
  { label: 'Dashboard', to: '/', icon: LayoutDashboard },
  { label: 'Transactions', to: '/transactions', icon: ArrowDownLeft },
  { label: 'Fertilizer tracker', to: '/fertilizer', icon: Leaf },
  { label: 'Cultivation areas', to: '/cultivation', icon: Sprout },
  { label: 'Reports', to: '/reports', icon: BarChart3 },
]

function Sidebar({ close }: { close?: () => void }) {
  return <aside className="flex h-full w-64 flex-col border-r border-border bg-surface px-4 py-5">
    <div className="mb-9 flex items-center gap-3 px-2"><div className="grid size-9 place-items-center rounded-xl bg-forest-600 text-white"><Tractor size={19} /></div><div><p className="font-semibold tracking-tight">Fieldnote</p><p className="text-xs text-muted">Agriculture management</p></div></div>
    <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[.12em] text-muted">Workspace</p>
    <nav className="space-y-1" aria-label="Main navigation">{navigation.map(({ label, to, icon: Icon }) => <NavLink key={to} to={to} end={to === '/'} onClick={close} className={({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${isActive ? 'bg-forest-50 font-medium text-forest-700 dark:bg-forest-700/20 dark:text-forest-100' : 'text-muted hover:bg-subtle hover:text-text'}`}><Icon size={18} strokeWidth={1.8} />{label}</NavLink>)}</nav>
    <div className="mt-auto space-y-1"><NavLink to="/settings" onClick={close} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted hover:bg-subtle hover:text-text"><SettingsIcon size={18} />Settings</NavLink><button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted hover:bg-subtle hover:text-text"><CircleHelp size={18} />Help & feedback</button><div className="mt-4 flex items-center gap-3 border-t border-border px-2 pt-4"><div className="grid size-9 place-items-center rounded-full bg-[#e9eee6] text-xs font-semibold text-forest-700 dark:bg-[#344537] dark:text-[#d7e6d3]">DK</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">Farm workspace</p><p className="text-xs text-muted">Local data</p></div><ChevronDown size={16} className="text-muted" /></div></div>
  </aside>
}

function PlaceholderPage({ title }: { title: string }) { return <div className="mx-auto max-w-3xl py-10"><p className="text-sm text-muted">Workspace / {title}</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">{title}</h1><Card className="mt-8 p-8"><div className="mx-auto grid max-w-md justify-items-center text-center"><div className="grid size-12 place-items-center rounded-xl bg-forest-50 text-forest-700 dark:bg-forest-700/20 dark:text-forest-100"><Sprout size={23} /></div><h2 className="mt-4 text-lg font-semibold">Your {title.toLowerCase()} workspace is ready</h2><p className="mt-2 text-sm leading-6 text-muted">This area is prepared for a later development stage. Your data foundation, navigation, and theme are in place.</p></div></Card></div> }

export default function App() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const location = useLocation()
  const { theme, setTheme } = useTheme()

  useEffect(() => {
    seedDatabaseIfEmpty().catch(console.error)
  }, [])

  const title = navigation.find((item) => item.to === location.pathname)?.label ?? (location.pathname === '/settings' ? 'Settings' : 'Workspace')
  return <div className="min-h-screen bg-canvas text-text">
    <div className="hidden md:fixed md:inset-y-0 md:flex"><Sidebar /></div>
    {drawerOpen && <div className="fixed inset-0 z-40 md:hidden"><button aria-label="Close menu" onClick={() => setDrawerOpen(false)} className="absolute inset-0 bg-black/30" /><div className="relative h-full w-72"><button onClick={() => setDrawerOpen(false)} className="absolute right-3 top-3 z-10 rounded-md p-2 text-muted hover:bg-subtle"><X size={18} /></button><Sidebar close={() => setDrawerOpen(false)} /></div></div>}
    <div className="md:pl-64"><header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-canvas/90 px-4 backdrop-blur sm:px-7"><button onClick={() => setDrawerOpen(true)} className="rounded-lg p-2 text-muted hover:bg-subtle md:hidden" aria-label="Open navigation"><Menu size={20} /></button><div className="hidden items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-muted sm:flex"><Search size={16} /><span>Search your workspace</span><kbd className="ml-8 rounded border border-border px-1.5 py-0.5 text-[10px]">⌘ K</kbd></div><div className="flex-1 sm:hidden"><span className="font-semibold">Fieldnote</span></div><span className="hidden text-sm text-muted sm:block">{title}</span><div className="ml-auto flex items-center gap-2"><Button variant="ghost" size="icon" aria-label="Change theme" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}</Button><Button variant="secondary" className="hidden sm:inline-flex"><Command size={15} />Quick actions</Button><div className="ml-1 grid size-8 place-items-center rounded-full bg-[#e9eee6] text-[11px] font-semibold text-forest-700 dark:bg-[#344537] dark:text-[#d7e6d3]">DK</div></div></header>
      <main className="min-h-[calc(100vh-4rem)] px-4 sm:px-7"><Routes><Route path="/" element={<Dashboard />} /><Route path="/transactions" element={<Transactions />} /><Route path="/fertilizer" element={<FertilizerTracker />} /><Route path="/cultivation" element={<CultivationAreas />} /><Route path="/reports" element={<Reports />} /><Route path="/settings" element={<Settings />} /><Route path="*" element={<PlaceholderPage title="Workspace" />} /></Routes><footer className="mx-auto flex max-w-6xl items-center justify-between border-t border-border py-5 text-xs text-muted"><span>Local-first workspace · LKR · Asia/Colombo</span><span>Stage 01 foundation</span></footer></main></div>
  </div>
}
