import { createClient } from '@supabase/supabase-js'

function getEnvVar(key: string): string {
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
    return import.meta.env[key]
  }
  const proc = (globalThis as unknown as { process?: { env?: Record<string, string | undefined> } }).process
  return proc?.env?.[key] || ''
}

export const supabaseUrl =
  getEnvVar('VITE_SUPABASE_URL') || getEnvVar('NEXT_PUBLIC_SUPABASE_URL')
export const supabaseAnonKey =
  getEnvVar('VITE_SUPABASE_ANON_KEY') || getEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY')

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl !== 'https://your-project.supabase.co' &&
    supabaseAnonKey !== 'your-anon-or-publishable-key'
)

/**
 * Derives the exact Supabase Auth storage key (`sb-<project-ref>-auth-token`)
 * from a Supabase project URL for reliable session cleanup on sign-out.
 */
export function getSupabaseAuthStorageKey(url: string): string | null {
  if (!url) return null
  try {
    const parsed = new URL(url)
    const projectRef = parsed.hostname.split('.')[0]
    if (!projectRef) return null
    return `sb-${projectRef}-auth-token`
  } catch {
    return null
  }
}

/**
 * Dual Cookie & LocalStorage Storage Adapter.
 * Ensures session tokens persist across desktop PWA launches, browser restarts,
 * and page reloads while maintaining cookie compatibility for secure SSR/session verification.
 */
export const secureSessionStorage = {
  getItem: (key: string): string | null => {
    if (typeof document === 'undefined') return null
    try {
      // 1. Try reading from cookie
      const cookies = document.cookie ? document.cookie.split(';') : []
      for (const cookie of cookies) {
        const [cookieName, ...cookieValParts] = cookie.trim().split('=')
        if (decodeURIComponent(cookieName) === key) {
          return decodeURIComponent(cookieValParts.join('='))
        }
      }
    } catch {
      // fallback to localStorage
    }
    try {
      return localStorage.getItem(key)
    } catch {
      return null
    }
  },
  setItem: (key: string, value: string): void => {
    if (typeof document === 'undefined') return
    try {
      // Cookies with 30-day lifetime, Lax SameSite, and Secure flag on https
      const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:'
      const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toUTCString()
      const secureFlag = isHttps ? '; Secure' : ''
      document.cookie = `${encodeURIComponent(key)}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax${secureFlag}`
    } catch {
      // Ignore cookie errors
    }
    try {
      localStorage.setItem(key, value)
    } catch {
      // Ignore localStorage errors (e.g. private browsing quota)
    }
  },
  removeItem: (key: string): void => {
    if (typeof document === 'undefined') return
    try {
      document.cookie = `${encodeURIComponent(key)}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax`
    } catch {
      // Ignore cookie deletion errors
    }
    try {
      localStorage.removeItem(key)
    } catch {
      // Ignore localStorage deletion errors
    }
  },
}

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: secureSessionStorage,
      },
    })
  : null

export async function checkSupabaseConnection(): Promise<{ ok: boolean; message: string }> {
  if (!supabase) {
    return { ok: false, message: 'Supabase credentials are not configured in .env.local.' }
  }

  try {
    const { error } = await supabase.auth.getSession()
    if (error) {
      return { ok: false, message: error.message }
    }
    return { ok: true, message: 'Connected to Supabase successfully.' }
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : 'Failed to connect to Supabase.',
    }
  }
}
