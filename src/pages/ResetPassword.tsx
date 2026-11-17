import { useState, type FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  Tractor,
  KeyRound,
  Eye,
  EyeOff,
  Lock,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Sun,
  Moon,
  ArrowRight,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext.tsx'
import { useTheme } from '../app/ThemeProvider.tsx'
import { Button } from '../components/ui/Button.tsx'

export function ResetPassword() {
  const { updatePassword, isAuthenticated, loading: authLoading } = useAuth()
  const { theme, setTheme } = useTheme()
  const navigate = useNavigate()

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [confirmError, setConfirmError] = useState<string | null>(null)

  function validate(): boolean {
    let valid = true
    setPasswordError(null)
    setConfirmError(null)
    setErrorMessage(null)

    if (!password) {
      setPasswordError('Password is required')
      valid = false
    } else if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters long')
      valid = false
    }

    if (!confirmPassword) {
      setConfirmError('Please confirm your new password')
      valid = false
    } else if (password !== confirmPassword) {
      setConfirmError('Passwords do not match')
      valid = false
    }

    return valid
  }

  async function handleResetPassword(e: FormEvent) {
    e.preventDefault()
    if (!validate()) return

    setLoading(true)
    setErrorMessage(null)

    try {
      const res = await updatePassword(password)
      if (res.success) {
        setSuccess(true)
        setTimeout(() => {
          navigate('/', { replace: true })
        }, 1800)
      } else {
        setErrorMessage(res.error || 'Failed to update password. Please try again.')
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'An unexpected error occurred.')
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
            Administrator Security · Password Recovery
          </p>
        </div>

        {/* Card Container */}
        <div className="overflow-hidden rounded-2xl border border-border bg-surface p-6 shadow-xl sm:p-8">
          {success ? (
            <div className="space-y-4 text-center py-4">
              <div className="mx-auto grid size-12 place-items-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                <CheckCircle2 size={28} />
              </div>
              <h2 className="text-lg font-semibold tracking-tight text-text">
                Password Updated Successfully
              </h2>
              <p className="text-xs text-muted leading-relaxed">
                Your new administrator password is now active. Redirecting you to your farm workspace...
              </p>
              <div className="pt-2">
                <Link to="/" replace>
                  <Button variant="primary" className="w-full">
                    <span>Go to Dashboard</span>
                    <ArrowRight size={16} />
                  </Button>
                </Link>
              </div>
            </div>
          ) : !authLoading && !isAuthenticated ? (
            <div className="space-y-4 text-center py-2">
              <div className="mx-auto grid size-12 place-items-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
                <KeyRound size={24} />
              </div>
              <h2 className="text-lg font-semibold tracking-tight text-text">
                Reset Link Required
              </h2>
              <p className="text-xs text-muted leading-relaxed">
                To update your administrator password, please request a password recovery link from the sign in page and click the link in your email.
              </p>
              <div className="pt-2">
                <Link to="/login">
                  <Button variant="secondary" className="w-full">
                    <span>Back to Sign In</span>
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4" noValidate>
              <div className="space-y-1">
                <h2 className="text-lg font-semibold tracking-tight text-text">
                  Set New Password
                </h2>
                <p className="text-xs text-muted leading-relaxed">
                  Enter your new password below. It must be at least 6 characters long.
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

              {/* New Password Field */}
              <div className="space-y-1.5">
                <label
                  htmlFor="new-password"
                  className="block text-xs font-medium text-text"
                >
                  New Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted">
                    <Lock size={16} />
                  </div>
                  <input
                    id="new-password"
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    autoComplete="new-password"
                    required
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      if (passwordError) setPasswordError(null)
                    }}
                    placeholder="At least 6 characters"
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

              {/* Confirm Password Field */}
              <div className="space-y-1.5">
                <label
                  htmlFor="confirm-password"
                  className="block text-xs font-medium text-text"
                >
                  Confirm Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted">
                    <Lock size={16} />
                  </div>
                  <input
                    id="confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    autoComplete="new-password"
                    required
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value)
                      if (confirmError) setConfirmError(null)
                    }}
                    placeholder="Repeat new password"
                    className={`w-full rounded-lg border bg-surface py-2.5 pr-10 pl-9 text-sm text-text placeholder:text-muted transition-colors focus:outline-none focus:ring-2 focus:ring-forest-500 ${
                      confirmError ? 'border-red-500 focus:ring-red-500' : 'border-border'
                    }`}
                  />
                  <button
                    type="button"
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted hover:text-text transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {confirmError && <p className="text-xs text-red-500">{confirmError}</p>}
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
                    <span>Updating Password...</span>
                  </>
                ) : (
                  <span>Update Password</span>
                )}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
