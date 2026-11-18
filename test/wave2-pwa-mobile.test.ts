import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const rootDir = process.cwd()

function walkTsFiles(dir: string): string[] {
  const results: string[] = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      results.push(...walkTsFiles(full))
    } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
      results.push(full)
    }
  }
  return results
}

describe('Wave 2: PWA Manifest, Service Worker & Update Contracts (STB-05)', () => {
  it('manifest.json defines required installable PWA properties including id, icons, and shortcuts', () => {
    const manifest = JSON.parse(
      fs.readFileSync(path.join(rootDir, 'public/manifest.json'), 'utf8')
    )
    assert.equal(manifest.id, '/')
    assert.equal(manifest.start_url, '/')
    assert.equal(manifest.display, 'standalone')
    assert.equal(manifest.short_name, 'AgriFlow')
    assert.ok(Array.isArray(manifest.icons) && manifest.icons.length >= 3)
    assert.ok(manifest.icons.some((i: { sizes: string }) => i.sizes === '192x192'))
    assert.ok(manifest.icons.some((i: { sizes: string }) => i.sizes === '512x512'))
    assert.ok(manifest.icons.some((i: { purpose?: string }) => i.purpose === 'maskable'))
    assert.ok(Array.isArray(manifest.shortcuts) && manifest.shortcuts.length >= 3)
  })

  it('service worker never returns null responses and never caches cross-origin financial APIs', () => {
    const sw = fs.readFileSync(path.join(rootDir, 'public/sw.js'), 'utf8')
    assert.ok(
      sw.includes('url.origin !== self.location.origin'),
      'SW must bypass cross-origin APIs (Supabase/Open-Meteo) to avoid stale financial data'
    )
    assert.equal(
      sw.includes('catch(() => null)'),
      false,
      'SW must never catch fetch errors into null inside event.respondWith'
    )
    assert.ok(
      sw.includes('makeOfflineAssetResponse'),
      'SW must provide a valid HTTP 503 Response fallback for uncached offline assets'
    )
    assert.ok(
      sw.includes('SKIP_WAITING'),
      'SW must support user-initiated SKIP_WAITING updates'
    )
    assert.ok(
      sw.includes('__PRECACHE_ASSETS__'),
      'SW must expose precache injection placeholder for Vite build plugin'
    )
  })

  it('App.tsx mounts PwaInstallModal and PwaUpdateBanner with unified AgriFlow branding', () => {
    const appSrc = fs.readFileSync(path.join(rootDir, 'src/app/App.tsx'), 'utf8')
    assert.ok(appSrc.includes('<PwaInstallModal'), 'PwaInstallModal must be mounted in App.tsx')
    assert.ok(appSrc.includes('<PwaUpdateBanner'), 'PwaUpdateBanner must be mounted in App.tsx')
    assert.equal(appSrc.includes('Search your workspace'), false, 'Dead header search box must be removed')
    assert.equal(appSrc.includes('Help & feedback'), false, 'Dead sidebar Help button must be removed')
    assert.equal(appSrc.includes('>Fieldnote<'), false, 'Workspace branding must be unified to AgriFlow')
  })
})

describe('Wave 2: Mobile FAB, Responsive Layouts, Touch Targets & Modal A11y (STB-04 & STB-06)', () => {
  it('Transactions.tsx handles ?action=add, renders mobile cards, uses inputMode decimal, and avoids window.confirm', () => {
    const txSrc = fs.readFileSync(path.join(rootDir, 'src/pages/Transactions.tsx'), 'utf8')
    assert.ok(txSrc.includes("searchParams.get('action') === 'add'"), 'Must handle ?action=add')
    assert.ok(txSrc.includes('sm:hidden'), 'Must render responsive mobile cards')
    assert.ok(txSrc.includes('hidden sm:block'), 'Must preserve desktop table layout')
    assert.ok(txSrc.includes('inputMode="decimal"'), 'Amount input must set inputMode="decimal"')
    assert.equal(txSrc.includes('window.confirm('), false, 'Must use accessible Modal instead of window.confirm')
  })

  it('FertilizerTracker.tsx handles ?action=add, renders mobile cards, and uses inputMode decimal', () => {
    const fertSrc = fs.readFileSync(path.join(rootDir, 'src/pages/FertilizerTracker.tsx'), 'utf8')
    assert.ok(fertSrc.includes("searchParams.get('action') === 'add'"), 'Must handle ?action=add')
    assert.ok(fertSrc.includes('sm:hidden'), 'Must render responsive mobile application cards')
    assert.ok(fertSrc.includes('grid-cols-2'), 'Must use 2-column compact reminder grid on mobile')
    assert.ok(fertSrc.includes('inputMode="decimal"'), 'Numeric inputs must set inputMode="decimal"')
  })

  it('Input and Select enforce 44px minimum touch target height', () => {
    const inputSrc = fs.readFileSync(path.join(rootDir, 'src/components/ui/Input.tsx'), 'utf8')
    const selectSrc = fs.readFileSync(path.join(rootDir, 'src/components/ui/Select.tsx'), 'utf8')
    assert.ok(inputSrc.includes('min-h-[44px]'), 'Input must enforce min-h-[44px]')
    assert.ok(selectSrc.includes('min-h-[44px]'), 'Select must enforce min-h-[44px]')
  })

  it('Modal.tsx implements unique useId labeling, keyboard focus trapping, and focus restoration', () => {
    const modalSrc = fs.readFileSync(path.join(rootDir, 'src/components/ui/Modal.tsx'), 'utf8')
    assert.ok(modalSrc.includes('useId()'), 'Modal must generate unique aria-labelledby IDs')
    assert.ok(modalSrc.includes("e.key === 'Tab'"), 'Modal must trap Tab keyboard focus')
    assert.ok(modalSrc.includes('previousFocusRef'), 'Modal must restore focus on close')
    assert.ok(modalSrc.includes('min-h-[44px] min-w-[44px]'), 'Close button must meet 44x44 touch target')
  })

  it('contains zero invalid Tailwind v4 -xs shadow or backdrop-blur utilities across src/', () => {
    const files = walkTsFiles(path.join(rootDir, 'src'))
    const offenders: string[] = []
    for (const f of files) {
      const content = fs.readFileSync(f, 'utf8')
      if (/\b(?:shadow-xs|backdrop-blur-xs|drop-shadow-xs)\b/.test(content)) {
        offenders.push(path.relative(rootDir, f))
      }
    }
    assert.deepEqual(offenders, [], `Found invalid Tailwind v4 -xs classes in: ${offenders.join(', ')}`)
  })
})
