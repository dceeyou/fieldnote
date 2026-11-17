import { mkdtempSync, symlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)))
const viteCli = join(projectRoot, 'node_modules', 'vite', 'bin', 'vite.js')

let safeRoot = projectRoot
// Vite treats # in filesystem paths as a URL fragment. Use a temporary link
// when running from directories containing # (e.g. local macOS folders).
if (projectRoot.includes('#')) {
  try {
    const aliasDirectory = mkdtempSync(join(tmpdir(), 'agriculture-management-'))
    safeRoot = join(aliasDirectory, 'project')
    symlinkSync(projectRoot, safeRoot, 'dir')
  } catch {
    safeRoot = projectRoot
  }
}

const child = spawn(process.execPath, [viteCli, ...process.argv.slice(2)], {
  cwd: safeRoot,
  env: { ...process.env, PWD: safeRoot },
  stdio: 'inherit',
})

child.on('error', (error) => {
  console.error(error)
  process.exitCode = 1
})
child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal)
  else process.exitCode = code ?? 1
})
