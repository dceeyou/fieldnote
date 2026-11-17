import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  ArrowDownLeft,
  Leaf,
  BarChart3,
  Settings,
  Plus,
  type LucideIcon,
} from 'lucide-react'

export interface MobileNavItem {
  label: string
  to: string
  icon: LucideIcon
}

const navItems: MobileNavItem[] = [
  { label: 'Overview', to: '/', icon: LayoutDashboard },
  { label: 'Transactions', to: '/transactions', icon: ArrowDownLeft },
  { label: 'Fertilizer', to: '/fertilizer', icon: Leaf },
  { label: 'Reports', to: '/reports', icon: BarChart3 },
  { label: 'Settings', to: '/settings', icon: Settings },
]

export function MobileBottomNav() {
  const location = useLocation()

  return (
    <>
      {/* Prominent Floating Add Transaction Action (Above Bottom Bar) */}
      <Link
        to="/transactions?action=add"
        aria-label="Add new transaction"
        className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] right-4 z-40 md:hidden flex items-center gap-2 rounded-full bg-forest-600 hover:bg-forest-700 active:scale-95 text-white px-4 py-3 shadow-xl shadow-forest-600/35 text-xs font-semibold transition-all cursor-pointer"
      >
        <div className="grid size-5 place-items-center rounded-full bg-white/20">
          <Plus size={14} strokeWidth={2.5} />
        </div>
        <span>Record Tx</span>
      </Link>

      {/* 5-Item Mobile Bottom Navigation Bar */}
      <nav
        aria-label="Mobile Bottom Navigation"
        className="fixed bottom-0 inset-x-0 z-30 md:hidden bg-surface/95 backdrop-blur-md border-t border-border pb-[env(safe-area-inset-bottom,0px)] shadow-lg transition-colors"
      >
        <div className="grid grid-cols-5 h-14 items-center">
          {navItems.map(({ label, to, icon: Icon }) => {
            const isActive =
              to === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(to)

            return (
              <Link
                key={to}
                to={to}
                className={`flex flex-col items-center justify-center h-full px-1 py-1 text-center transition-colors relative ${
                  isActive
                    ? 'text-forest-600 dark:text-forest-400 font-semibold'
                    : 'text-muted hover:text-text'
                }`}
              >
                {/* Active Indicator Top Highlight */}
                {isActive && (
                  <span
                    className="absolute top-0 inset-x-3 h-0.5 rounded-full bg-forest-600 dark:bg-forest-400"
                    aria-hidden="true"
                  />
                )}
                <div
                  className={`grid size-7 place-items-center rounded-md transition-transform ${
                    isActive ? 'scale-105 bg-forest-50/80 dark:bg-forest-900/30' : ''
                  }`}
                >
                  <Icon size={18} />
                </div>
                <span className="text-[10px] tracking-tight leading-none mt-0.5">
                  {label}
                </span>
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
