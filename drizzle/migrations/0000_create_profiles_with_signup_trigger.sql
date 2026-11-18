create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'seller' check (role in ('seller', 'pap_admin', 'pap_staff')),
  owner_name text not null default '',
  phone text not null default '',
  business_name text,
  business_type text,
  location text,
  profile_picture_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.profiles to authenticated;
grant all on public.profiles to service_role;

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select to authenticated
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert to authenticated
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, owner_name, phone, business_name, business_type, location)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'owner_name', ''),
    coalesce(new.raw_user_meta_data->>'phone', ''),
    new.raw_user_meta_data->>'business_name',
    new.raw_user_meta_data->>'business_type',
    new.raw_user_meta_data->>'location'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();