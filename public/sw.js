/**
 * AgriFlow PWA Service Worker
 * Version: 1.0.0
 * Provides offline caching for application shell, static assets, and safe network routing.
 */

const CACHE_NAME = 'agriflow-cache-v1.0.0'
const OFFLINE_URL = '/offline.html'

const STATIC_PRECACHE = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon.svg',
]

// Install: Cache core application shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_PRECACHE)
    }).then(() => {
      return self.skipWaiting()
    })
  )
})

// Activate: Clean up older cache versions
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key)
          }
        })
      )
    }).then(() => {
      return self.clients.claim()
    })
  )
})

// Fetch: Strategic routing for assets vs APIs
self.addEventListener('fetch', (event) => {
  const req = event.request
  const url = new URL(req.url)

  // Only handle HTTP/HTTPS GET requests
  if (req.method !== 'GET') {
    return
  }

  // 1. Navigation requests (HTML pages)
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone))
          }
          return networkResponse
        })
        .catch(() => {
          return caches.match(req).then((cachedResponse) => {
            if (cachedResponse) return cachedResponse
            return caches.match(OFFLINE_URL)
          })
        })
    )
    return
  }

  // 2. Supabase API & External Data requests (Network-First, avoid caching private mutable data)
  if (url.hostname.includes('supabase.co') || url.hostname.includes('open-meteo.com')) {
    event.respondWith(
      fetch(req).catch(() => {
        return caches.match(req)
      })
    )
    return
  }

  // 3. Static Assets (JS, CSS, Images, Fonts) - Stale-While-Revalidate
  if (
    url.origin === self.location.origin &&
    (url.pathname.startsWith('/assets/') ||
     url.pathname.startsWith('/icons/') ||
     url.pathname.endsWith('.js') ||
     url.pathname.endsWith('.css') ||
     url.pathname.endsWith('.svg') ||
     url.pathname.endsWith('.png') ||
     url.pathname.endsWith('.woff2'))
  ) {
    event.respondWith(
      caches.match(req).then((cached) => {
        const fetchPromise = fetch(req).then((networkRes) => {
          if (networkRes && networkRes.status === 200) {
            const clone = networkRes.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone))
          }
          return networkRes
        }).catch(() => null)

        return cached || fetchPromise
      })
    )
    return
  }

  // Default: Network with cache fallback
  event.respondWith(
    fetch(req).catch(() => caches.match(req))
  )
})

// Message: Support manual skip waiting
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})
