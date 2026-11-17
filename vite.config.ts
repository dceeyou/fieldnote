import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

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
