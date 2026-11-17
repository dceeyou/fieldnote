#!/usr/bin/env node
/**
 * AgriFlow / Fieldnote - Administrator Account Provisioning CLI
 * Securely provisions the single administrator account in Supabase Auth.
 * Usage:
 *   node scripts/setup-admin.mjs --email admin@example.com --password YourSecurePassword123!
 *   or interactively:
 *   npm run auth:setup-admin
 */

import fs from 'node:fs'
import path from 'node:path'
import readline from 'node:readline'
import { createClient } from '@supabase/supabase-js'

// Parse .env.local or .env for Supabase credentials
function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env.local')
  const envFallbackPath = path.resolve(process.cwd(), '.env')
  const targetPath = fs.existsSync(envPath) ? envPath : fs.existsSync(envFallbackPath) ? envFallbackPath : null

  const env = { ...process.env }
  if (targetPath) {
    const lines = fs.readFileSync(targetPath, 'utf8').split('\n')
    for (const line of lines) {
      const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)?\s*$/)
      if (match) {
        let val = (match[2] || '').trim()
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1)
        }
        env[match[1]] = val
      }
    }
  }
  return env
}

const env = loadEnv()
const supabaseUrl = env.VITE_SUPABASE_URL
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey || supabaseUrl === 'https://your-project.supabase.co') {
  console.error('\x1b[31mError: Supabase is not configured in .env.local.\x1b[0m')
  console.error('Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY before running this script.')
  process.exit(1)
}

function parseArgs() {
  const args = process.argv.slice(2)
  let email = ''
  let password = ''

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--email' && args[i + 1]) {
      email = args[++i].trim()
    } else if (args[i] === '--password' && args[i + 1]) {
      password = args[++i].trim()
    }
  }

  return { email, password }
}

async function promptInput(question, isPassword = false) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise((resolve) => {
    if (isPassword) {
      process.stdout.write(question)
      let input = ''
      process.stdin.setRawMode?.(true)
      process.stdin.resume()
      process.stdin.on('data', function onData(char) {
        const s = char.toString('utf8')
        if (s === '\n' || s === '\r' || s === '\u0004') {
          process.stdin.setRawMode?.(false)
          process.stdin.removeListener('data', onData)
          process.stdout.write('\n')
          rl.close()
          resolve(input)
        } else if (s === '\u0003') {
          process.exit(1)
        } else if (s === '\b' || s === '\x7f') {
          if (input.length > 0) {
            input = input.slice(0, -1)
            process.stdout.write('\b \b')
          }
        } else {
          input += s
          process.stdout.write('*')
        }
      })
    } else {
      rl.question(question, (answer) => {
        rl.close()
        resolve(answer.trim())
      })
    }
  })
}

async function main() {
  console.log('\x1b[32m\x1b[1m=== AgriFlow Single-Administrator Account Setup ===\x1b[0m\n')
  console.log(`Connecting to Supabase: \x1b[36m${supabaseUrl}\x1b[0m\n`)

  const parsed = parseArgs()
  let email = parsed.email
  let password = parsed.password

  if (!email) {
    email = await promptInput('Enter administrator email (e.g. admin@farm.local): ')
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    console.error('\x1b[31mError: A valid email address is required.\x1b[0m')
    process.exit(1)
  }

  if (!password) {
    password = await promptInput('Enter administrator password (min 6 characters): ', true)
  }

  if (!password || password.length < 6) {
    console.error('\x1b[31mError: Password must be at least 6 characters long.\x1b[0m')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey)

  console.log('\nRegistering administrator account in Supabase Auth...')
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  })

  if (error) {
    if (error.message.toLowerCase().includes('already registered')) {
      console.log(`\n\x1b[33mNotice: An account with email "${email}" is already registered.\x1b[0m`)
      console.log('To reset your password, visit the /login page in the app and click "Forgot password?".')
      console.log('Or update it directly in the Supabase Dashboard SQL Editor:')
      console.log(`  UPDATE auth.users SET email_confirmed_at = now() WHERE email = '${email}';\n`)
      process.exit(0)
    }

    console.error(`\x1b[31mRegistration failed: ${error.message}\x1b[0m`)
    process.exit(1)
  }

  console.log('\n\x1b[32m✔ Administrator account provisioned successfully!\x1b[0m')
  console.log(`  User ID: \x1b[36m${data.user?.id || 'Created'}\x1b[0m`)
  console.log(`  Email:   \x1b[36${email}\x1b[0m`)

  if (!data.session) {
    console.log('\n\x1b[33m[Email Confirmation Check]\x1b[0m')
    console.log('If your Supabase project requires email confirmation, you can either:')
    console.log('1. Click the confirmation link in the email sent to your inbox, OR')
    console.log('2. Run this one-line SQL command in Supabase SQL Editor to instantly confirm:')
    console.log(`   \x1b[32mUPDATE auth.users SET email_confirmed_at = now() WHERE email = '${email}';\x1b[0m\n`)
  }

  console.log('\x1b[32mYou can now sign in at http://localhost:5173/login\x1b[0m\n')
}

main().catch((err) => {
  console.error('\x1b[31mUnexpected error:\x1b[0m', err)
  process.exit(1)
})
