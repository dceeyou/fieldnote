import { mkdtempSync, symlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)))
const viteCli = join(projectRoot, 'node_modules', 'vite', 'bin', 'vite.js')
const aliasDirectory = mkdtempSync(join(tmpdir(), 'agriculture-management-'))
const safeRoot = join(aliasDirectory, 'project')

// Vite treats # in filesystem paths as a URL fragment. Use a temporary link
// so this project remains runnable from its existing folder name.
symlinkSync(projectRoot, safeRoot, 'dir')

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
