-- Remove obsolete display_order from services
-- Run once on Supabase SQL editor

alter table public.services
  drop column if exists display_order;
