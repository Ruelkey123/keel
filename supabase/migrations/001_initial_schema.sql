-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- Organizations
create table public.organizations (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text not null unique,
  logo_url text,
  timezone text not null default 'America/New_York',
  created_at timestamptz not null default now()
);

-- Users (extends auth.users)
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  full_name text not null,
  email text not null,
  role text not null check (role in ('owner', 'manager', 'dock_staff')),
  avatar_url text,
  created_at timestamptz not null default now()
);

-- Boats
create table public.boats (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  make text,
  model text,
  year integer,
  length_ft numeric,
  status text not null default 'available' check (status in ('available', 'rented', 'maintenance', 'inactive')),
  hourly_rate integer,
  half_day_rate integer,
  full_day_rate integer,
  fuel_capacity numeric,
  fuel_type text,
  capacity_persons integer,
  cover_image_url text,
  created_at timestamptz not null default now()
);

-- Boat photos
create table public.boat_photos (
  id uuid primary key default uuid_generate_v4(),
  boat_id uuid not null references public.boats(id) on delete cascade,
  url text not null,
  caption text,
  created_at timestamptz not null default now()
);

-- Incidents
create table public.incidents (
  id uuid primary key default uuid_generate_v4(),
  boat_id uuid not null references public.boats(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  reported_by uuid not null references public.users(id),
  title text not null,
  description text,
  status text not null default 'open' check (status in ('open', 'resolved')),
  photos text[] not null default '{}',
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

-- Maintenance logs
create table public.maintenance_logs (
  id uuid primary key default uuid_generate_v4(),
  boat_id uuid not null references public.boats(id) on delete cascade,
  logged_by uuid not null references public.users(id),
  type text not null check (type in ('routine', 'repair', 'inspection')),
  description text not null,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

-- Customers
create table public.customers (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  full_name text not null,
  email text not null,
  phone text,
  stripe_customer_id text,
  notes text,
  created_at timestamptz not null default now()
);

-- Waivers (templates)
create table public.waivers (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  content_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Bookings
create table public.bookings (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  boat_id uuid not null references public.boats(id),
  customer_id uuid not null references public.customers(id),
  created_by uuid not null references public.users(id),
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'checked_out', 'completed', 'canceled')),
  start_time timestamptz not null,
  end_time timestamptz not null,
  base_price integer not null default 0,
  deposit_amount integer not null default 0,
  total_price integer not null default 0,
  waiver_id uuid references public.waivers(id),
  waiver_signed boolean not null default false,
  waiver_signed_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  check (end_time > start_time)
);

-- Availability blocks
create table public.availability_blocks (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  boat_id uuid not null references public.boats(id) on delete cascade,
  reason text,
  start_time timestamptz not null,
  end_time timestamptz not null,
  created_by uuid not null references public.users(id),
  created_at timestamptz not null default now(),
  check (end_time > start_time)
);

-- Payments
create table public.payments (
  id uuid primary key default uuid_generate_v4(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  stripe_payment_intent_id text,
  type text not null check (type in ('deposit', 'rental', 'refund')),
  amount integer not null,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

-- Check-ins / Check-outs
create table public.checkins (
  id uuid primary key default uuid_generate_v4(),
  booking_id uuid not null unique references public.bookings(id) on delete cascade,
  checked_in_by uuid references public.users(id),
  checked_out_by uuid references public.users(id),
  fuel_level_in integer,
  fuel_level_out integer,
  checkin_notes text,
  checkout_notes text,
  checklist_data jsonb,
  damage_noted boolean not null default false,
  damage_description text,
  checked_in_at timestamptz,
  checked_out_at timestamptz
);

-- Check-in photos
create table public.checkin_photos (
  id uuid primary key default uuid_generate_v4(),
  checkin_id uuid not null references public.checkins(id) on delete cascade,
  phase text not null check (phase in ('in', 'out')),
  url text not null,
  created_at timestamptz not null default now()
);

-- Signed waivers
create table public.signed_waivers (
  id uuid primary key default uuid_generate_v4(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  customer_id uuid not null references public.customers(id),
  waiver_id uuid not null references public.waivers(id),
  signature_data text,
  signed_pdf_url text,
  ip_address text,
  signed_at timestamptz not null default now()
);

-- Notifications
create table public.notifications (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  booking_id uuid references public.bookings(id) on delete set null,
  type text not null check (type in ('confirmation', 'reminder', 'cancellation')),
  channel text not null check (channel in ('email', 'sms')),
  status text not null default 'queued' check (status in ('queued', 'sent', 'failed')),
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

-- AI outputs
create table public.ai_outputs (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  source_type text not null check (source_type in ('booking', 'checkin', 'incident', 'maintenance')),
  source_id uuid not null,
  output_type text not null check (output_type in ('damage_report', 'maintenance_reminder', 'booking_summary', 'support_summary')),
  content text not null,
  model_used text not null default 'stub',
  created_at timestamptz not null default now()
);

-- Indexes for common queries
create index idx_bookings_org_id on public.bookings(org_id);
create index idx_bookings_boat_id on public.bookings(boat_id);
create index idx_bookings_customer_id on public.bookings(customer_id);
create index idx_bookings_status on public.bookings(status);
create index idx_bookings_start_time on public.bookings(start_time);
create index idx_boats_org_id on public.boats(org_id);
create index idx_boats_status on public.boats(status);
create index idx_customers_org_id on public.customers(org_id);
create index idx_customers_email on public.customers(org_id, email);
create index idx_checkins_booking_id on public.checkins(booking_id);
create index idx_payments_booking_id on public.payments(booking_id);
create index idx_availability_blocks_boat_id on public.availability_blocks(boat_id);
