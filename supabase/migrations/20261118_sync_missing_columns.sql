-- AgriFlow - Schema Drift Sync Migration
-- Safely adds missing columns discovered during pre-flight inspection without affecting existing rows.

BEGIN;

ALTER TABLE IF EXISTS public.categories
  ADD COLUMN IF NOT EXISTS keywords text[] DEFAULT '{}';

ALTER TABLE IF EXISTS public.fertilizer_applications
  ADD COLUMN IF NOT EXISTS reminder_interval text;

COMMIT;
