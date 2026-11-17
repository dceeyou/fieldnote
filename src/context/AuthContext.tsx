import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured, secureSessionStorage } from '../lib/supabase.ts'
import {
  loginSchema,
  resetPasswordRequestSchema,
  updatePasswordSchema,
  formatAuthError,
} from '../domain/validation.ts'

export interface AuthContextValue {
  user: User | null
  session: Session | null
  loading: boolean
  isAuthenticated: boolean
  isConfigured: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>
  updatePassword: (password: string) => Promise<{ success: boolean; error?: string }>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false)
      return
    }

    // 1. Initial session restoration
    let mounted = true
    supabase.auth
      .getSession()
      .then(({ data: { session: initialSession }, error }) => {
        if (!mounted) return
        if (error) {
          console.warn('Failed to restore initial Supabase auth session:', error.message)
          setUser(null)
          setSession(null)
        } else if (initialSession) {
          setSession(initialSession)
          setUser(initialSession.user)
        }
      })
      .catch((err) => {
        console.warn('Supabase auth session initialization error:', err)
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    // 2. Real-time auth state listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!mounted) return

      if (event === 'SIGNED_OUT') {
        setUser(null)
        setSession(null)
        // Ensure tokens are cleanly wiped from storage
        secureSessionStorage.removeItem('sb-' + (supabase as unknown as { supabaseKey?: string })?.supabaseKey + '-auth-token')
      } else if (newSession) {
        setSession(newSession)
        setUser(newSession.user)
      } else {
        setUser(null)
        setSession(null)
      }
      setLoading(false)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  async function login(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    try {
      const validated = loginSchema.parse({ email, password })

      if (!isSupabaseConfigured || !supabase) {
        return {
          success: false,
          error: 'Supabase credentials are not configured. Check your .env.local file.',
        }
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: validated.email,
        password: validated.password,
      })

      if (error) {
        return { success: false, error: formatAuthError(error) }
      }

      if (data.session) {
        setSession(data.session)
        setUser(data.user)
      }

      return { success: true }
    } catch (err) {
      return { success: false, error: formatAuthError(err) }
    }
  }

  async function logout(): Promise<void> {
    try {
      if (supabase) {
        await supabase.auth.signOut()
      }
    } catch (err) {
      console.warn('Error during sign out:', err)
    } finally {
      setUser(null)
      setSession(null)
    }
  }

  async function resetPassword(email: string): Promise<{ success: boolean; error?: string }> {
    try {
      const validated = resetPasswordRequestSchema.parse({ email })

      if (!isSupabaseConfigured || !supabase) {
        return {
          success: false,
          error: 'Supabase is not configured. Check your .env.local file.',
        }
      }

      const redirectTo = typeof window !== 'undefined'
        ? `${window.location.origin}/reset-password`
        : undefined

      const { error } = await supabase.auth.resetPasswordForEmail(validated.email, {
        redirectTo,
      })

      if (error) {
        return { success: false, error: formatAuthError(error) }
      }

      return { success: true }
    } catch (err) {
      return { success: false, error: formatAuthError(err) }
    }
  }

  async function updatePassword(password: string): Promise<{ success: boolean; error?: string }> {
    try {
      const validated = updatePasswordSchema.parse({ password, confirmPassword: password })

      if (!isSupabaseConfigured || !supabase) {
        return {
          success: false,
          error: 'Supabase is not configured. Check your .env.local file.',
        }
      }

      const { error } = await supabase.auth.updateUser({
        password: validated.password,
      })

      if (error) {
        return { success: false, error: formatAuthError(error) }
      }

      return { success: true }
    } catch (err) {
      return { success: false, error: formatAuthError(err) }
    }
  }

  const value: AuthContextValue = {
    user,
    session,
    loading,
    isAuthenticated: Boolean(user && session),
    isConfigured: isSupabaseConfigured,
    login,
    logout,
    resetPassword,
    updatePassword,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
