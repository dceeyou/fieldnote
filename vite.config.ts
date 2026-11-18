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
        assets.add(match[1])
      }

      if (assets.size === 0) return
      const buildHash = Array.from(assets)
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
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
})
