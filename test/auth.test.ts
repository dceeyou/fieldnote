import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {
  loginSchema,
  resetPasswordRequestSchema,
  updatePasswordSchema,
  formatAuthError,
} from '../src/domain/validation.ts'
import { secureSessionStorage } from '../src/lib/supabase.ts'

describe('Single-User Authentication Validation Schemas', () => {
  it('validates correct email and password for login', () => {
    const input = {
      email: 'admin@agriflow.app',
      password: 'SecureFarmPassword2026!',
    }
    const result = loginSchema.safeParse(input)
    assert.equal(result.success, true)
    if (result.success) {
      assert.equal(result.data.email, 'admin@agriflow.app')
      assert.equal(result.data.password, 'SecureFarmPassword2026!')
    }
  })

  it('rejects an empty email or invalid email format', () => {
    const emptyEmail = loginSchema.safeParse({ email: '', password: 'password123' })
    assert.equal(emptyEmail.success, false)

    const invalidEmail = loginSchema.safeParse({ email: 'not-an-email', password: 'password123' })
    assert.equal(invalidEmail.success, false)
  })

  it('rejects an empty password', () => {
    const emptyPassword = loginSchema.safeParse({ email: 'admin@agriflow.app', password: '' })
    assert.equal(emptyPassword.success, false)
  })

  it('validates password reset request schema with valid email', () => {
    const valid = resetPasswordRequestSchema.safeParse({ email: 'admin@agriflow.app' })
    assert.equal(valid.success, true)

    const invalid = resetPasswordRequestSchema.safeParse({ email: 'invalid-email' })
    assert.equal(invalid.success, false)
  })

  it('validates password update when passwords match and exceed 6 characters', () => {
    const valid = updatePasswordSchema.safeParse({
      password: 'NewStrongPassword2026',
      confirmPassword: 'NewStrongPassword2026',
    })
    assert.equal(valid.success, true)
  })

  it('rejects password update when password is shorter than 6 characters', () => {
    const short = updatePasswordSchema.safeParse({
      password: '12345',
      confirmPassword: '12345',
    })
    assert.equal(short.success, false)
  })

  it('rejects password update when confirmation does not match', () => {
    const mismatch = updatePasswordSchema.safeParse({
      password: 'StrongPassword1',
      confirmPassword: 'StrongPassword2',
    })
    assert.equal(mismatch.success, false)
  })
})

describe('Authentication Error Message Formatter', () => {
  it('translates Supabase "Invalid login credentials" into friendly message', () => {
    const formatted = formatAuthError('Invalid login credentials')
    assert.match(formatted, /Invalid email or password/i)
  })

  it('translates "Email not confirmed" into actionable administrator feedback', () => {
    const formatted = formatAuthError('Email not confirmed')
    assert.match(formatted, /email address has not been confirmed/i)
  })

  it('translates rate limit errors accurately', () => {
    const formatted = formatAuthError('email rate limit exceeded')
    assert.match(formatted, /wait a few moments/i)
  })

  it('translates network or connection failure', () => {
    const formatted = formatAuthError(new Error('TypeError: fetch failed'))
    assert.match(formatted, /network connection/i)
  })

  it('handles null, undefined or empty errors gracefully', () => {
    const formatted = formatAuthError(null)
    assert.match(formatted, /unexpected authentication error/i)
  })
})

describe('Dual Storage Session Persistence Adapter', () => {
  it('implements getItem, setItem, and removeItem interface', () => {
    assert.equal(typeof secureSessionStorage.getItem, 'function')
    assert.equal(typeof secureSessionStorage.setItem, 'function')
    assert.equal(typeof secureSessionStorage.removeItem, 'function')
  })

  it('handles execution in server / non-browser environment safely without throwing', () => {
    // When document is undefined (as in Node.js test environment)
    assert.doesNotThrow(() => {
      secureSessionStorage.setItem('test_auth_key', 'test_token_val')
      secureSessionStorage.getItem('test_auth_key')
      secureSessionStorage.removeItem('test_auth_key')
    })
  })
})

describe('Database Security & RLS Migration Hardening', () => {
  it('includes RLS enablement and authenticated policies for all 7 application tables', () => {
    const migrationPath = path.resolve(
      process.cwd(),
      'supabase/migrations/20261117_single_user_auth_rls.sql'
    )
    assert.equal(fs.existsSync(migrationPath), true, 'RLS migration file must exist')

    const sqlContent = fs.readFileSync(migrationPath, 'utf8')

    const requiredTables = [
      'lands',
      'crops',
      'land_crops',
      'categories',
      'fertilizers',
      'transactions',
      'fertilizer_applications',
    ]

    for (const table of requiredTables) {
      assert.ok(
        sqlContent.includes(`alter table public.${table} enable row level security`),
        `Table ${table} must have RLS enabled`
      )
      assert.ok(
        sqlContent.includes(`drop policy if exists "Allow all operations on ${table}"`),
        `Table ${table} must drop permissive open policies`
      )
      assert.ok(
        sqlContent.includes(`to authenticated`) &&
        sqlContent.includes(`(auth.role() = 'authenticated')`),
        `Table ${table} must have authenticated-only restriction`
      )
    }
  })

  it('schema.sql reflects strict single-user authenticated-only policies', () => {
    const schemaPath = path.resolve(process.cwd(), 'supabase/schema.sql')
    const schemaContent = fs.readFileSync(schemaPath, 'utf8')

    // Must not contain open policies allowing unauthenticated operations
    assert.equal(
      schemaContent.includes('create policy "Allow all operations on transactions"'),
      false,
      'schema.sql must not allow unauthenticated operations on transactions'
    )
    assert.ok(
      schemaContent.includes('to authenticated using (auth.role() = \'authenticated\')'),
      'schema.sql must restrict policies to authenticated role'
    )
  })
})
