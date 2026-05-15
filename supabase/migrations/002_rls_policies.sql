-- Enable RLS on all tables
alter table public.organizations enable row level security;
alter table public.users enable row level security;
alter table public.boats enable row level security;
alter table public.boat_photos enable row level security;
alter table public.incidents enable row level security;
alter table public.maintenance_logs enable row level security;
alter table public.customers enable row level security;
alter table public.waivers enable row level security;
alter table public.bookings enable row level security;
alter table public.availability_blocks enable row level security;
alter table public.payments enable row level security;
alter table public.checkins enable row level security;
alter table public.checkin_photos enable row level security;
alter table public.signed_waivers enable row level security;
alter table public.notifications enable row level security;
alter table public.ai_outputs enable row level security;

-- Helper: current user's org_id
create or replace function public.get_user_org_id()
returns uuid language sql stable as $$
  select org_id from public.users where id = auth.uid()
$$;

-- Helper: current user's role
create or replace function public.get_user_role()
returns text language sql stable as $$
  select role from public.users where id = auth.uid()
$$;

-- Organizations
create policy "Users can read own organization"
  on public.organizations for select
  using (id = public.get_user_org_id());

create policy "Owners can update organization"
  on public.organizations for update
  using (id = public.get_user_org_id() and public.get_user_role() = 'owner');

-- Users
create policy "Users can read org members"
  on public.users for select
  using (org_id = public.get_user_org_id());

create policy "Owners and managers can insert users"
  on public.users for insert
  with check (org_id = public.get_user_org_id() and public.get_user_role() in ('owner', 'manager'));

create policy "Owners can update user roles"
  on public.users for update
  using (org_id = public.get_user_org_id() and public.get_user_role() = 'owner');

-- Boats
create policy "Org members can read boats"
  on public.boats for select
  using (org_id = public.get_user_org_id());

create policy "Owners/managers can insert boats"
  on public.boats for insert
  with check (org_id = public.get_user_org_id() and public.get_user_role() in ('owner', 'manager'));

create policy "Owners/managers can update boats"
  on public.boats for update
  using (org_id = public.get_user_org_id() and public.get_user_role() in ('owner', 'manager'));

create policy "Owners can delete boats"
  on public.boats for delete
  using (org_id = public.get_user_org_id() and public.get_user_role() = 'owner');

-- Boat photos
create policy "Org members can read boat photos"
  on public.boat_photos for select
  using (boat_id in (select id from public.boats where org_id = public.get_user_org_id()));

create policy "Owners/managers can manage boat photos"
  on public.boat_photos for all
  using (boat_id in (select id from public.boats where org_id = public.get_user_org_id())
    and public.get_user_role() in ('owner', 'manager'));

-- Incidents
create policy "Org members can read incidents"
  on public.incidents for select
  using (org_id = public.get_user_org_id());

create policy "Org members can create incidents"
  on public.incidents for insert
  with check (org_id = public.get_user_org_id());

create policy "Owners/managers can update incidents"
  on public.incidents for update
  using (org_id = public.get_user_org_id() and public.get_user_role() in ('owner', 'manager'));

-- Maintenance logs
create policy "Org members can read maintenance logs"
  on public.maintenance_logs for select
  using (boat_id in (select id from public.boats where org_id = public.get_user_org_id()));

create policy "Owners/managers can manage maintenance logs"
  on public.maintenance_logs for all
  using (boat_id in (select id from public.boats where org_id = public.get_user_org_id())
    and public.get_user_role() in ('owner', 'manager'));

-- Customers
create policy "Org members can read customers"
  on public.customers for select
  using (org_id = public.get_user_org_id());

create policy "Owners/managers can manage customers"
  on public.customers for all
  using (org_id = public.get_user_org_id() and public.get_user_role() in ('owner', 'manager'));

-- Waivers
create policy "Org members can read waivers"
  on public.waivers for select
  using (org_id = public.get_user_org_id());

create policy "Owners/managers can manage waivers"
  on public.waivers for all
  using (org_id = public.get_user_org_id() and public.get_user_role() in ('owner', 'manager'));

-- Bookings
create policy "Org members can read bookings"
  on public.bookings for select
  using (org_id = public.get_user_org_id());

create policy "Owners/managers can manage bookings"
  on public.bookings for all
  using (org_id = public.get_user_org_id() and public.get_user_role() in ('owner', 'manager'));

create policy "Dock staff can update booking status"
  on public.bookings for update
  using (org_id = public.get_user_org_id() and public.get_user_role() = 'dock_staff');

-- Availability blocks
create policy "Org members can read availability blocks"
  on public.availability_blocks for select
  using (org_id = public.get_user_org_id());

create policy "Owners/managers can manage availability blocks"
  on public.availability_blocks for all
  using (org_id = public.get_user_org_id() and public.get_user_role() in ('owner', 'manager'));

-- Payments
create policy "Owners/managers can read payments"
  on public.payments for select
  using (booking_id in (select id from public.bookings where org_id = public.get_user_org_id())
    and public.get_user_role() in ('owner', 'manager'));

create policy "Owners/managers can manage payments"
  on public.payments for all
  using (booking_id in (select id from public.bookings where org_id = public.get_user_org_id())
    and public.get_user_role() in ('owner', 'manager'));

-- Check-ins
create policy "Org members can read checkins"
  on public.checkins for select
  using (booking_id in (select id from public.bookings where org_id = public.get_user_org_id()));

create policy "Org members can create checkins"
  on public.checkins for insert
  with check (booking_id in (select id from public.bookings where org_id = public.get_user_org_id()));

create policy "Org members can update checkins"
  on public.checkins for update
  using (booking_id in (select id from public.bookings where org_id = public.get_user_org_id()));

-- Checkin photos
create policy "Org members can manage checkin photos"
  on public.checkin_photos for all
  using (checkin_id in (
    select c.id from public.checkins c
    join public.bookings b on b.id = c.booking_id
    where b.org_id = public.get_user_org_id()
  ));

-- Signed waivers
create policy "Org members can read signed waivers"
  on public.signed_waivers for select
  using (booking_id in (select id from public.bookings where org_id = public.get_user_org_id()));

create policy "Org members can create signed waivers"
  on public.signed_waivers for insert
  with check (booking_id in (select id from public.bookings where org_id = public.get_user_org_id()));

-- Notifications
create policy "Owners/managers can read notifications"
  on public.notifications for select
  using (org_id = public.get_user_org_id() and public.get_user_role() in ('owner', 'manager'));

-- AI outputs
create policy "Org members can read AI outputs"
  on public.ai_outputs for select
  using (org_id = public.get_user_org_id());
