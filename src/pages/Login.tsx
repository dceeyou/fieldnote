import { useState, type FormEvent } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Tractor,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  Sun,
  Moon,
  ShieldCheck,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext.tsx'
import { useTheme } from '../app/ThemeProvider.tsx'
import { Button } from '../components/ui/Button.tsx'

export function Login() {
  const { login, resetPassword, isConfigured } = useAuth()
  const { theme, setTheme } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()

  const [mode, setMode] = useState<'login' | 'forgot-password'>('login')

  // Form state
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // Feedback & Loading
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Field validation errors
  const [emailError, setEmailError] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)

  function validateLoginForm(): boolean {
    let valid = true
    setEmailError(null)
    setPasswordError(null)
    setErrorMessage(null)

    if (!email.trim()) {
      setEmailError('Email is required')
      valid = false
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setEmailError('Please enter a valid email address')
      valid = false
    }

    if (mode === 'login' && !password) {
      setPasswordError('Password is required')
      valid = false
    }

    return valid
  }

  async function handleLogin(e: FormEvent) {
    e.preventDefault()
    if (!validateLoginForm()) return

    setLoading(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      const res = await login(email.trim(), password)
      if (res.success) {
        const from = (location.state as { from?: { pathname?: string } })?.from?.pathname || '/'
        navigate(from, { replace: true })
      } else {
        setErrorMessage(res.error || 'Invalid administrator credentials.')
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Authentication failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleForgotPassword(e: FormEvent) {
    e.preventDefault()
    if (!validateLoginForm()) return

    setLoading(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      const res = await resetPassword(email.trim())
      if (res.success) {
        setSuccessMessage(
          `Password recovery instructions have been sent to ${email.trim()}. Please check your email inbox.`
        )
      } else {
        setErrorMessage(res.error || 'Failed to send password recovery email.')
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to request password reset.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-canvas px-4 py-12 text-text transition-colors sm:px-6 lg:px-8">
      {/* Top Bar: Theme Switcher */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Change theme"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="rounded-full bg-surface border border-border shadow-xs"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </Button>
      </div>

      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-forest-600 text-white shadow-lg shadow-forest-600/25">
            <Tractor size={30} strokeWidth={2.2} />
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-text sm:text-3xl">
            AgriFlow
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted">
            Agriculture Management · Administrator Portal
          </p>
        </div>

        {/* Unconfigured Warning Banner (if credentials missing) */}
        {!isConfigured && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-700 dark:text-amber-300"
          >
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <div className="space-y-1">
              <p className="font-semibold">Supabase is not configured</p>
              <p className="leading-relaxed opacity-90">
                Please configure <code className="rounded bg-black/10 dark:bg-white/10 px-1 py-0.5">VITE_SUPABASE_URL</code> and <code className="rounded bg-black/10 dark:bg-white/10 px-1 py-0.5">VITE_SUPABASE_ANON_KEY</code> in your <code className="rounded bg-black/10 dark:bg-white/10 px-1 py-0.5">.env.local</code> file.
              </p>
            </div>
          </div>
        )}

        {/* Card Container */}
        <div className="overflow-hidden rounded-2xl border border-border bg-surface p-6 shadow-xl sm:p-8">
          {mode === 'login' ? (
            /* ================= SIGN IN MODE ================= */
            <form onSubmit={handleLogin} className="space-y-4" noValidate>
              <div className="space-y-1">
                <h2 className="text-lg font-semibold tracking-tight text-text">
                  Sign In
                </h2>
                <p className="text-xs text-muted">
                  Enter your administrator credentials to access the farm workspace.
                </p>
              </div>

              {/* Error Banner */}
              {errorMessage && (
                <div
                  role="alert"
                  className="flex items-start gap-2.5 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-600 dark:text-red-400"
                >
                  <AlertCircle size={16} className="mt-0.5 shrink-0 text-red-500" />
                  <span className="leading-relaxed">{errorMessage}</span>
                </div>
              )}

              {/* Success Banner */}
              {successMessage && (
                <div
                  role="status"
                  className="flex items-start gap-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-700 dark:text-emerald-300"
                >
                  <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-500" />
                  <span className="leading-relaxed">{successMessage}</span>
                </div>
              )}

              {/* Email Field */}
              <div className="space-y-1.5">
                <label
                  htmlFor="login-email"
                  className="block text-xs font-medium text-text"
                >
                  Administrator Email <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted">
                    <Mail size={16} />
                  </div>
                  <input
                    id="login-email"
                    type="email"
                    name="email"
                    autoComplete="username"
                    required
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      if (emailError) setEmailError(null)
                    }}
                    placeholder="admin@agriflow.app"
                    className={`w-full rounded-lg border bg-surface py-2.5 pr-3 pl-9 text-sm text-text placeholder:text-muted transition-colors focus:outline-none focus:ring-2 focus:ring-forest-500 ${
                      emailError ? 'border-red-500 focus:ring-red-500' : 'border-border'
                    }`}
                  />
                </div>
                {emailError && <p className="text-xs text-red-500">{emailError}</p>}
              </div>

              {/* Password Field */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="login-password"
                    className="block text-xs font-medium text-text"
                  >
                    Password <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot-password')
                      setErrorMessage(null)
                      setSuccessMessage(null)
                    }}
                    className="text-xs font-medium text-forest-600 hover:text-forest-700 dark:text-forest-400 dark:hover:text-forest-300 transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted">
                    <Lock size={16} />
                  </div>
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      if (passwordError) setPasswordError(null)
                    }}
                    placeholder="••••••••••••"
                    className={`w-full rounded-lg border bg-surface py-2.5 pr-10 pl-9 text-sm text-text placeholder:text-muted transition-colors focus:outline-none focus:ring-2 focus:ring-forest-500 ${
                      passwordError ? 'border-red-500 focus:ring-red-500' : 'border-border'
                    }`}
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted hover:text-text transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {passwordError && <p className="text-xs text-red-500">{passwordError}</p>}
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                variant="primary"
                disabled={loading}
                className="mt-2 w-full h-11 text-sm font-semibold shadow-sm shadow-forest-600/30"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <span>Sign In</span>
                )}
              </Button>
            </form>
          ) : (
            /* ================= FORGOT PASSWORD MODE ================= */
            <form onSubmit={handleForgotPassword} className="space-y-4" noValidate>
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login')
                    setErrorMessage(null)
                    setSuccessMessage(null)
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-muted hover:text-text mb-2 transition-colors"
                >
                  <ArrowLeft size={14} />
                  <span>Back to Sign In</span>
                </button>
                <h2 className="text-lg font-semibold tracking-tight text-text">
                  Reset Password
                </h2>
                <p className="text-xs text-muted leading-relaxed">
                  Enter your administrator email address. We'll send a secure password recovery link to your inbox.
                </p>
              </div>

              {/* Error Banner */}
              {errorMessage && (
                <div
                  role="alert"
                  className="flex items-start gap-2.5 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-600 dark:text-red-400"
                >
                  <AlertCircle size={16} className="mt-0.5 shrink-0 text-red-500" />
                  <span className="leading-relaxed">{errorMessage}</span>
                </div>
              )}

              {/* Success Banner */}
              {successMessage && (
                <div
                  role="status"
                  className="flex items-start gap-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-700 dark:text-emerald-300"
                >
                  <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-500" />
                  <span className="leading-relaxed">{successMessage}</span>
                </div>
              )}

              {/* Email Field */}
              <div className="space-y-1.5">
                <label
                  htmlFor="forgot-email"
                  className="block text-xs font-medium text-text"
                >
                  Administrator Email <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted">
                    <Mail size={16} />
                  </div>
                  <input
                    id="forgot-email"
                    type="email"
                    name="email"
                    autoComplete="username"
                    required
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      if (emailError) setEmailError(null)
                    }}
                    placeholder="admin@agriflow.app"
                    className={`w-full rounded-lg border bg-surface py-2.5 pr-3 pl-9 text-sm text-text placeholder:text-muted transition-colors focus:outline-none focus:ring-2 focus:ring-forest-500 ${
                      emailError ? 'border-red-500 focus:ring-red-500' : 'border-border'
                    }`}
                  />
                </div>
                {emailError && <p className="text-xs text-red-500">{emailError}</p>}
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                variant="primary"
                disabled={loading}
                className="mt-2 w-full h-11 text-sm font-semibold shadow-sm shadow-forest-600/30"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Sending Recovery Link...</span>
                  </>
                ) : (
                  <span>Send Recovery Link</span>
                )}
              </Button>
            </form>
          )}

          {/* Footer Security Note */}
          <div className="mt-6 border-t border-border pt-4 text-center">
            <div className="inline-flex items-center gap-1.5 text-[11px] text-muted font-medium">
              <ShieldCheck size={14} className="text-forest-600" />
              <span>Single-user dedicated workspace · Supabase Auth</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
