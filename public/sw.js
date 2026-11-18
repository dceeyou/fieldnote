/**
 * AgriFlow PWA Service Worker
 * Version: 1.1.0
 * Provides reliable offline app-shell caching, hashed asset caching, and safe network routing.
 * Financial/Supabase API requests are NEVER cached in SW to prevent stale or inconsistent data.
 */

const CACHE_NAME = 'agriflow-cache-v1.1.0'
const OFFLINE_URL = '/offline.html'

// Build-time Vite plugin injects hashed /assets/* entry bundles into __PRECACHE_ASSETS__
const STATIC_PRECACHE = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-512.png',
  '/icons/apple-touch-icon.png',
  '/icons/icon.svg',
  /* __PRECACHE_ASSETS__ */
]

function makeOfflineAssetResponse() {
  return new Response('Offline: requested asset is not cached.', {
    status: 503,
    statusText: 'Service Unavailable',
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}

// Install: Precache core app shell & build assets without crashing on individual failures
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await Promise.allSettled(
        STATIC_PRECACHE.map((url) =>
          cache.add(new Request(url, { cache: 'reload' })).catch(() => undefined)
        )
      )
      // Activate immediately only on initial install; updates wait for user reload prompt
      if (!self.registration.active) {
        return self.skipWaiting()
      }
    })
  )
})

// Activate: Clean up older cache versions and take control of clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              return caches.delete(key)
            }
            return Promise.resolve(false)
          })
        )
      )
      .then(() => self.clients.claim())
  )
})

// Fetch: Strategic routing (strictly NO caching of Supabase/financial APIs)
self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') {
    return
  }

  let url
  try {
    url = new URL(req.url)
  } catch {
    return
  }

  // Only intercept HTTP(S)
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return
  }

  // 1. NEVER cache external or API calls (Supabase PostgREST/Auth, Open-Meteo, etc.)
  //    Let the browser/Dexie/localStorage handle offline state natively with zero stale data risk.
  if (url.origin !== self.location.origin) {
    return
  }

  // 2. Navigation requests (HTML SPA routes): Network-First with cached app shell -> /offline.html fallback
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.ok) {
            const clone = networkResponse.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', clone))
          }
          return networkResponse
        })
        .catch(async () => {
          const cachedIndex = await caches.match('/index.html')
          if (cachedIndex) return cachedIndex
          const cachedRoot = await caches.match('/')
          if (cachedRoot) return cachedRoot
          const offlineFallback = await caches.match(OFFLINE_URL)
          return offlineFallback || makeOfflineAssetResponse()
        })
    )
    return
  }

  // 3. Same-Origin Static Assets (JS, CSS, Icons, Fonts, Manifest):
  //    Cache-First for immutable hashed /assets/*, Stale-While-Revalidate for unhashed assets.
  const isHashedAsset = url.pathname.startsWith('/assets/')
  const isStaticAsset =
    isHashedAsset ||
    url.pathname.startsWith('/icons/') ||
    url.pathname === '/manifest.json' ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.woff2')

  if (isStaticAsset && url.pathname !== '/sw.js') {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (isHashedAsset && cached) {
          return cached
        }

        const networkFetch = fetch(req)
          .then((networkRes) => {
            if (networkRes && networkRes.ok) {
              const clone = networkRes.clone()
              caches.open(CACHE_NAME).then((cache) => cache.put(req, clone))
            }
            return networkRes
          })
          .catch(() => cached || makeOfflineAssetResponse())

        return cached || networkFetch
      })
    )
    return
  }
})

// Message: Support user-triggered update activation
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})
