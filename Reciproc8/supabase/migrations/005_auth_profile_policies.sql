-- Allow the browser to create and maintain only its own profile.
alter table public.profiles enable row level security;

drop policy if exists "authenticated users can read own profile" on public.profiles;
create policy "authenticated users can read own profile"
  on public.profiles
  for select
  to authenticated
  using (auth_id = auth.uid());

drop policy if exists "authenticated users can create own profile" on public.profiles;
create policy "authenticated users can create own profile"
  on public.profiles
  for insert
  to authenticated
  with check (auth_id = auth.uid());

drop policy if exists "authenticated users can update own profile" on public.profiles;
create policy "authenticated users can update own profile"
  on public.profiles
  for update
  to authenticated
  using (auth_id = auth.uid())
  with check (auth_id = auth.uid());
