import fs from 'node:fs'
import path from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

function injectPwaPrecacheAssets(): Plugin {
  return {
    name: 'agriflow-sw-precache',
    apply: 'build',
    closeBundle() {
      const distDir = path.resolve(safeRoot, 'dist')
      const indexPath = path.join(distDir, 'index.html')
      const swPath = path.join(distDir, 'sw.js')
      if (!fs.existsSync(indexPath) || !fs.existsSync(swPath)) return

      const html = fs.readFileSync(indexPath, 'utf8')
      const assets = new Set<string>()
      const attrRegex = /(?:src|href)="(\/assets\/[^"]+)"/g
      let match: RegExpExecArray | null
      while ((match = attrRegex.exec(html)) !== null) {
        if (!match[1].includes('exceljs')) {
          assets.add(match[1])
        }
      }

      // Also precache lightweight split route chunks for offline navigation while
      // keeping heavy on-demand ExcelJS (~940 KB) out of eager SW installation.
      const assetsDir = path.join(distDir, 'assets')
      if (fs.existsSync(assetsDir)) {
        for (const fileName of fs.readdirSync(assetsDir)) {
          if (
            (fileName.endsWith('.js') || fileName.endsWith('.css')) &&
            !fileName.includes('exceljs')
          ) {
            assets.add(`/assets/${fileName}`)
          }
        }
      }

      if (assets.size === 0) return
      const buildHash = Array.from(assets)
        .sort()
        .map((a) => path.basename(a))
        .join('-')
        .replace(/[^a-zA-Z0-9_-]/g, '')
        .slice(0, 24)

      let swCode = fs.readFileSync(swPath, 'utf8')
      const injectedList = Array.from(assets)
        .map((a) => `  '${a}',`)
        .join('\n')
      swCode = swCode.replace('  /* __PRECACHE_ASSETS__ */', injectedList)
      if (buildHash) {
        swCode = swCode.replace(
          /const CACHE_NAME = 'agriflow-cache-[^']+'/,
          `const CACHE_NAME = 'agriflow-cache-${buildHash}'`
        )
      }
      fs.writeFileSync(swPath, swCode, 'utf8')
    },
  }
}

const safeRoot = process.env.PWD ?? process.cwd()
const safeClient = path.posix.join(
  '/@fs',
  path.resolve(safeRoot, 'node_modules/vite/dist/client/client.mjs'),
)
const safeEnv = path.posix.join(
  '/@fs',
  path.resolve(safeRoot, 'node_modules/vite/dist/client/env.mjs'),
)

export default defineConfig({
  root: safeRoot,
  envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
  plugins: [
    react(),
    injectPwaPrecacheAssets(),
    {
      name: 'client-inject-substitute',
      transform(code, id) {
        if (id.includes('env.mjs')) {
          return code.replace('__DEFINES__', '{}')
        }
        if (id.includes('client.mjs')) {
          return code
            .replace(/__MODE__/g, JSON.stringify('development'))
            .replace(/__BASE__/g, JSON.stringify('/'))
            .replace(/__SERVER_HOST__/g, JSON.stringify('localhost:5173/'))
            .replace(/__HMR_PROTOCOL__/g, JSON.stringify(null))
            .replace(/__HMR_HOSTNAME__/g, JSON.stringify(null))
            .replace(/__HMR_PORT__/g, JSON.stringify(null))
            .replace(/__HMR_DIRECT_TARGET__/g, JSON.stringify('localhost:5173'))
            .replace(/__HMR_BASE__/g, JSON.stringify('/'))
            .replace(/__HMR_TIMEOUT__/g, JSON.stringify(30000))
            .replace(/__HMR_ENABLE_OVERLAY__/g, JSON.stringify(true))
            .replace(/__HMR_CONFIG_NAME__/g, JSON.stringify('vite.config.ts'))
            .replace(/__WS_TOKEN__/g, JSON.stringify(undefined))
        }
      },
    },
  ],
  resolve: {
    preserveSymlinks: true,
    alias: [
      { find: /^\/?@vite\/client/, replacement: safeClient },
      { find: /^\/?@vite\/env/, replacement: safeEnv },
    ],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          // Keep ExcelJS in its own dynamic chunk (loaded only when user exports .xlsx)
          if (id.includes('exceljs')) return undefined
          if (
            id.includes('/react/') ||
            id.includes('/react-dom/') ||
            id.includes('/scheduler/') ||
            id.includes('/react-router') ||
            id.includes('/clsx/') ||
            id.includes('/tailwind-merge/') ||
            id.includes('/class-variance-authority/')
          ) {
            return 'vendor-react'
          }
          if (
            id.includes('/recharts/') ||
            id.includes('/d3-') ||
            id.includes('/victory-vendor/') ||
            id.includes('/es-toolkit/') ||
            id.includes('/decimal.js-light/') ||
            id.includes('/recharts-scale/')
          ) {
            return 'vendor-charts'
          }
          if (id.includes('/@supabase/')) {
            return 'vendor-supabase'
          }
          if (id.includes('/dexie/')) {
            return 'vendor-dexie'
          }
          if (id.includes('/zod/')) {
            return 'vendor-zod'
          }
          if (id.includes('/lucide-react/')) {
            return 'vendor-icons'
          }
          if (id.includes('/papaparse/')) {
            return 'vendor-csv'
          }
          return undefined
        },
      },
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
})
