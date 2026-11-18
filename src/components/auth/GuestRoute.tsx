import { type ReactNode } from 'react'
import { Navigate, useLocation, Outlet } from 'react-router-dom'
import { Tractor, Loader2 } from 'lucide-react'
import { useAuth } from '../../context/AuthContext.tsx'

export function GuestRoute({ children }: { children?: ReactNode }) {
  const { isAuthenticated, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-canvas text-text p-4">
        <div className="relative mb-6">
          <div className="grid size-16 place-items-center rounded-2xl bg-forest-600 text-white shadow-lg shadow-forest-600/20">
            <Tractor size={32} />
          </div>
          <div className="absolute -bottom-1 -right-1 grid size-6 place-items-center rounded-full bg-surface border border-border shadow-sm text-forest-600">
            <Loader2 size={14} className="animate-spin" />
          </div>
        </div>
        <h2 className="text-base font-semibold tracking-tight">Loading AgriFlow...</h2>
      </div>
    )
  }

  if (isAuthenticated) {
    const from = (location.state as { from?: { pathname?: string } })?.from?.pathname || '/'
    return <Navigate to={from} replace />
  }

  return children ? <>{children}</> : <Outlet />
}
