import { test, expect } from '@playwright/test'

test.describe('AgriFlow Production E2E Regression Suite', () => {
  test('redirects unauthenticated routes to /login with zero runtime errors', async ({ page }) => {
    const pageErrors: string[] = []
    page.on('pageerror', (err) => pageErrors.push(err.message))

    await page.goto('/')
    await expect(page).toHaveURL(/\/login$/)
    await expect(page.getByRole('heading', { name: /AgriFlow|Sign in|Welcome/i }).first()).toBeVisible()

    for (const protectedPath of ['/transactions', '/fertilizer', '/cultivation', '/reports', '/settings']) {
      await page.goto(protectedPath)
      await expect(page).toHaveURL(/\/login$/)
    }

    // Reset password lazy route loads cleanly
    await page.goto('/reset-password')
    await expect(page).toHaveURL(/\/reset-password$/)

    expect(pageErrors).toEqual([])
  })

  test('login form validates inputs, toggles password visibility, and switches to reset view', async ({
    page,
  }) => {
    await page.goto('/login')

    // Password show/hide toggle
    const passwordInput = page.locator('input[type="password"]').first()
    await expect(passwordInput).toBeVisible()
    await passwordInput.fill('ExamplePass123!')

    const toggleBtn = page.getByRole('button', { name: /show password|hide password/i })
    await toggleBtn.click()
    await expect(page.locator('input[type="text"][value="ExamplePass123!"], input[value="ExamplePass123!"]').first()).toHaveAttribute(
      'type',
      'text'
    )

    // Switch to forgot password view and back
    const forgotBtn = page.getByRole('button', { name: /forgot password/i })
    await forgotBtn.click()
    await expect(page.getByRole('button', { name: /send reset link|back to sign in/i }).first()).toBeVisible()

    const backBtn = page.getByRole('button', { name: /back to sign in|sign in/i }).first()
    await backBtn.click()
    await expect(page.getByRole('button', { name: /sign in/i }).first()).toBeVisible()
  })

  test('maintains zero horizontal overflow across all 6 target viewports (360px to 1440px)', async ({
    page,
  }) => {
    const viewports = [
      { width: 360, height: 740 },
      { width: 375, height: 812 },
      { width: 390, height: 844 },
      { width: 768, height: 1024 },
      { width: 1280, height: 800 },
      { width: 1440, height: 900 },
    ]

    await page.goto('/login')
    await expect(page.locator('form').first()).toBeVisible()

    for (const vp of viewports) {
      await page.setViewportSize(vp)
      const overflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth - window.innerWidth
      })
      expect(overflow, `Horizontal overflow detected at ${vp.width}px`).toBeLessThanOrEqual(0)
    }
  })

  test('serves valid PWA manifest, build-injected service worker, offline fallback, and boots offline', async ({
    page,
    context,
    request,
  }) => {
    // 1. Validate /manifest.json
    const manifestRes = await request.get('/manifest.json')
    expect(manifestRes.status()).toBe(200)
    const manifest = await manifestRes.json()
    expect(manifest.id).toBe('/')
    expect(manifest.display).toBe('standalone')
    expect(Array.isArray(manifest.icons)).toBe(true)
    expect(manifest.icons.length).toBeGreaterThanOrEqual(2)

    // 2. Validate build-injected /sw.js
    const swRes = await request.get('/sw.js')
    expect(swRes.status()).toBe(200)
    const swText = await swRes.text()
    expect(swText).toContain('/assets/index-')
    expect(swText).not.toContain('exceljs')
    expect(swText).not.toContain('/* __PRECACHE_ASSETS__ */')

    // 3. Validate /offline.html
    const offlineRes = await request.get('/offline.html')
    expect(offlineRes.status()).toBe(200)
    expect(await offlineRes.text()).toContain('AgriFlow')

    // 4. Register & activate Service Worker on live page
    await page.goto('/login')
    await expect(page.locator('form').first()).toBeVisible()

    const swReady = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return false
      const reg = await navigator.serviceWorker.ready
      return Boolean(reg.active)
    })
    expect(swReady).toBe(true)

    // 5. Real offline reload from Service Worker cache
    const offlineErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') offlineErrors.push(`console: ${msg.text()}`)
    })
    page.on('pageerror', (err) => offlineErrors.push(`pageerror: ${err.message}`))
    page.on('requestfailed', (req) =>
      offlineErrors.push(`failed: ${req.url()} (${req.failure()?.errorText})`)
    )

    await context.setOffline(true)
    try {
      await page.reload({ waitUntil: 'domcontentloaded' })
      await expect(page.locator('#root'), `Offline errors: ${offlineErrors.join(' | ')}`).not.toBeEmpty()
      await expect(page.locator('form').first()).toBeVisible({ timeout: 10_000 })
    } finally {
      await context.setOffline(false)
    }
  })
})
