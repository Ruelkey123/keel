alter table public.maintenance_logs
  add column if not exists status text not null default 'scheduled'
    check (status in ('scheduled', 'in_progress', 'completed')),
  add column if not exists estimated_cost integer,   -- cents
  add column if not exists actual_cost integer,      -- cents
  add column if not exists estimated_hours numeric,
  add column if not exists actual_hours numeric,
  add column if not exists vendor text;
