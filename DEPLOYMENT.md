# AgriFlow – Vercel Production Deployment & Supabase Auth Guide

## 1. Production URLs

- **Primary Production URL**: `https://agriflow-workspace.vercel.app`
- **Alternate Production Alias**: `https://agriflow-farm.vercel.app`
- **Project Default Alias**: `https://fieldnote-orcin.vercel.app`
- **Vercel Project**: `fieldnote` (Vite + React SPA, Hobby Plan)
- **Production Branch**: `main` (`https://github.com/dceeyou/fieldnote`)

> Note: `agriflow.vercel.app` and `agriflow-app.vercel.app` were already claimed on Vercel by other accounts during subdomain availability verification, so `agriflow-workspace.vercel.app` and `agriflow-farm.vercel.app` were registered and verified.

---

## 2. Vercel Project Settings

| Setting | Value |
|---|---|
| Framework Preset | `Vite` |
| Root Directory | `./` |
| Install Command | `npm install` (auto-detected from `package-lock.json`) |
| Build Command | `npm run build` (`tsc -b && node scripts/run-vite.mjs build`) |
| Output Directory | `dist` |
| Production Branch | `main` |
| SPA Routing & SW Headers | Configured via [`vercel.json`](./vercel.json) |
| Deployment Protection (SSO) | Disabled (application uses its own Supabase single-admin authentication) |

---

## 3. Environment Variables Checklist (Vercel)

Configured across **Production**, **Preview**, and **Development** environments:

| Variable Name | Type | Visibility | Purpose |
|---|---|---|---|
| `VITE_SUPABASE_URL` | Plain | Public (browser-safe) | Supabase project REST/Auth endpoint |
| `VITE_SUPABASE_ANON_KEY` | Plain | Public (browser-safe) | Supabase publishable/anon key (protected by RLS) |
| `NEXT_PUBLIC_SUPABASE_URL` | Plain | Public (alias) | Compatibility alias supported by `vite.config.ts` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Plain | Public (alias) | Compatibility alias supported by `vite.config.ts` |

**Security Rules:**
- **Never** add `SUPABASE_SERVICE_ROLE_KEY` to Vercel environment variables or client code.
- **Never** commit `.env` or `.env.local` (excluded in `.gitignore`).
- Keep `.env.example` populated with placeholder values only.

---

## 4. Supabase Authentication Configuration

Configure in **Supabase Dashboard → Authentication → URL Configuration**:

1. **Site URL**:
   ```text
   https://agriflow-workspace.vercel.app
   ```

2. **Redirect URLs** (add all of the following):
   ```text
   https://agriflow-workspace.vercel.app/**
   https://agriflow-farm.vercel.app/**
   https://fieldnote-orcin.vercel.app/**
   https://*.vercel.app/**
   http://localhost:5173/**
   http://127.0.0.1:5173/**
   ```

3. **HTTPS Session & Cookie Behaviour**:
   - `src/lib/supabase.ts` uses `secureSessionStorage` which detects `window.location.protocol === 'https:'` and automatically applies `; Secure; SameSite=Lax` to session cookies on Vercel.
   - Password recovery dynamically redirects to `${window.location.origin}/reset-password`, handled seamlessly by `vercel.json` SPA rewrites.
