import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

describe('Vercel Deployment Integration & Configuration', () => {
  const rootDir = process.cwd()

  it('vercel.json is valid JSON with SPA catch-all rewrite and SW caching headers', () => {
    const vercelConfigPath = path.join(rootDir, 'vercel.json')
    assert.ok(fs.existsSync(vercelConfigPath), 'vercel.json must exist in project root')

    const raw = fs.readFileSync(vercelConfigPath, 'utf8')
    const config = JSON.parse(raw)

    // Verify SPA rewrite
    assert.ok(Array.isArray(config.rewrites), 'rewrites array must exist')
    const hasSpaCatchAll = config.rewrites.some(
      (r: { source: string; destination: string }) =>
        (r.source === '/(.*)' || r.source.includes('(.*)')) && r.destination === '/index.html'
    )
    assert.ok(hasSpaCatchAll, 'Must contain a rewrite rule directing routes to /index.html')

    // Verify Service Worker header
    assert.ok(Array.isArray(config.headers), 'headers array must exist')
    const swHeader = config.headers.find((h: { source: string }) => h.source === '/sw.js')
    assert.ok(swHeader, 'Header configuration for /sw.js must be specified')
    const cacheControl = swHeader.headers.find(
      (header: { key: string }) => header.key.toLowerCase() === 'cache-control'
    )
    assert.ok(cacheControl, 'Cache-Control header for /sw.js must be present')

    // Verify HTTP Security Headers on global route
    const globalHeaders = config.headers.find((h: { source: string }) => h.source === '/(.*)')
    assert.ok(globalHeaders, 'Global security headers rule must exist in vercel.json')
    const headerKeys = globalHeaders.headers.map((h: { key: string }) => h.key.toLowerCase())
    assert.ok(headerKeys.includes('x-content-type-options'), 'Must set X-Content-Type-Options')
    assert.ok(headerKeys.includes('x-frame-options'), 'Must set X-Frame-Options')
    assert.ok(headerKeys.includes('referrer-policy'), 'Must set Referrer-Policy')
    assert.ok(headerKeys.includes('content-security-policy'), 'Must set Content-Security-Policy')
  })

  it('.gitignore excludes .vercel, sensitive env files, and build outputs', () => {
    const gitignorePath = path.join(rootDir, '.gitignore')
    assert.ok(fs.existsSync(gitignorePath), '.gitignore must exist')

    const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8')
    assert.match(gitignoreContent, /\.vercel/i, '.gitignore must exclude .vercel')
    assert.match(gitignoreContent, /\.env/i, '.gitignore must exclude .env files')
    assert.match(gitignoreContent, /node_modules/i, '.gitignore must exclude node_modules')
    assert.match(gitignoreContent, /dist/i, '.gitignore must exclude dist build output')
  })

  it('.env.example contains placeholder values without leaking credentials', () => {
    const envExamplePath = path.join(rootDir, '.env.example')
    assert.ok(fs.existsSync(envExamplePath), '.env.example must exist')

    const envContent = fs.readFileSync(envExamplePath, 'utf8')
    assert.match(envContent, /VITE_SUPABASE_URL=/, 'Must define VITE_SUPABASE_URL placeholder')
    assert.match(envContent, /VITE_SUPABASE_ANON_KEY=/, 'Must define VITE_SUPABASE_ANON_KEY placeholder')
    assert.match(envContent, /NEXT_PUBLIC_SUPABASE_URL=/, 'Must define NEXT_PUBLIC_SUPABASE_URL alias')
    assert.match(envContent, /NEXT_PUBLIC_SUPABASE_ANON_KEY=/, 'Must define NEXT_PUBLIC_SUPABASE_ANON_KEY alias')

    // Ensure no real secrets or live service role keys are present in example
    assert.doesNotMatch(envContent, /service_role/i)
    assert.doesNotMatch(envContent, /eyJhbGciOi/i)
  })

  it('vite.config.ts exposes both VITE_ and NEXT_PUBLIC_ environment variables', () => {
    const viteConfigPath = path.join(rootDir, 'vite.config.ts')
    const viteConfig = fs.readFileSync(viteConfigPath, 'utf8')
    assert.match(viteConfig, /envPrefix:\s*\[.*'VITE_'.*'NEXT_PUBLIC_'.*\]/s)
  })

  it('package.json specifies valid build, lint, and test scripts', () => {
    const pkgPath = path.join(rootDir, 'package.json')
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))

    assert.ok(pkg.scripts.build, 'build script must exist')
    assert.ok(pkg.scripts.lint, 'lint script must exist')
    assert.ok(pkg.scripts.test, 'test script must exist')
    assert.strictEqual(pkg.name, 'agriculture-management-system')
  })
})
