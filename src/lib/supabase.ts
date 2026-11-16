import { createClient } from '@supabase/supabase-js'

function getEnvVar(key: string): string {
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
    return import.meta.env[key]
  }
  const proc = (globalThis as unknown as { process?: { env?: Record<string, string | undefined> } }).process
  return proc?.env?.[key] || ''
}

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL')
const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY')

export const isSupabaseConfigured = Boolean(
  supabaseUrl && supabaseAnonKey && supabaseUrl !== 'https://your-project.supabase.co'
)

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
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
