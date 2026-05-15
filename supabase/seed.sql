-- Keel seed data — Sunset Marina demo
-- Run after migrations. Boats/org can seed standalone;
-- bookings/customers require a real user_id from auth.

insert into public.organizations (id, name, slug, timezone)
values ('00000000-0000-0000-0000-000000000001', 'Sunset Marina', 'sunset-marina', 'America/New_York')
on conflict (id) do nothing;

insert into public.boats (id, org_id, name, make, model, year, length_ft, status, hourly_rate, half_day_rate, full_day_rate, capacity_persons, fuel_type)
values
  ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001',
   'Sea Breeze', 'Bayliner', 'Element E18', 2022, 18, 'available', 7500, 22000, 38000, 8, 'unleaded'),
  ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001',
   'Wave Runner', 'Chaparral', '21 SSi', 2021, 21, 'available', 9500, 28000, 49000, 10, 'unleaded'),
  ('00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000001',
   'Blue Horizon', 'Boston Whaler', 'Montauk 170', 2020, 17, 'maintenance', 6500, 19000, 33000, 7, 'unleaded')
on conflict (id) do nothing;
