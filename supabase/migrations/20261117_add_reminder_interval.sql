-- Migration: Add reminder_interval column to fertilizer_applications
alter table if exists public.fertilizer_applications
  add column if not exists reminder_interval text;
