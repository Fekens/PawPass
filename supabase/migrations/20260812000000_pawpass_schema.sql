-- PawPass production schema. Every user-owned table is protected by RLS.
create extension if not exists pgcrypto;

create table public.profiles (id uuid primary key references auth.users(id) on delete cascade, name text not null check(length(name) between 1 and 100), created_at timestamptz not null default now());
create table public.pets (id bigint primary key, user_id uuid not null references auth.users(id) on delete cascade, name text not null, species text not null, animal text, breed text not null, age text, weight text not null, birthday date, sex text not null, photo_url text, microchip text, allergies text, medications text, vet_name text, vet_phone text, medical_notes text, status text not null default 'Profile ready', created_at timestamptz not null default now());
create index pets_user_id_idx on public.pets(user_id);
create table public.user_settings (user_id uuid primary key references auth.users(id) on delete cascade, selected_pet_id bigint references public.pets(id) on delete set null, last_view text not null default 'dashboard', updated_at timestamptz not null default now());
create table public.health_records (id bigint primary key, user_id uuid not null references auth.users(id) on delete cascade, pet_id bigint not null references public.pets(id) on delete cascade, record_type text not null, title text not null, record_date text not null, notes text, created_at timestamptz not null default now());
create index health_records_user_pet_idx on public.health_records(user_id,pet_id);
create table public.schedules (id bigint primary key, user_id uuid not null references auth.users(id) on delete cascade, pet_id bigint not null references public.pets(id) on delete cascade, schedule_type text not null, title text not null, display_date text not null, display_time text, scheduled_at timestamptz, notes text, done boolean not null default false, created_at timestamptz not null default now());
create index schedules_user_pet_idx on public.schedules(user_id,pet_id);
create table public.emergency_data (pet_id bigint primary key references public.pets(id) on delete cascade, user_id uuid not null references auth.users(id) on delete cascade, contact_name text, contact_phone text, notes text, updated_at timestamptz not null default now());

alter table public.profiles enable row level security;
alter table public.pets enable row level security;
alter table public.user_settings enable row level security;
alter table public.health_records enable row level security;
alter table public.schedules enable row level security;
alter table public.emergency_data enable row level security;

create policy "owners manage profile" on public.profiles for all using (auth.uid()=id) with check (auth.uid()=id);
create policy "owners manage pets" on public.pets for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy "owners manage settings" on public.user_settings for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy "owners manage health records" on public.health_records for all using (auth.uid()=user_id) with check (auth.uid()=user_id and exists(select 1 from public.pets p where p.id=pet_id and p.user_id=auth.uid()));
create policy "owners manage schedules" on public.schedules for all using (auth.uid()=user_id) with check (auth.uid()=user_id and exists(select 1 from public.pets p where p.id=pet_id and p.user_id=auth.uid()));
create policy "owners manage emergency data" on public.emergency_data for all using (auth.uid()=user_id) with check (auth.uid()=user_id and exists(select 1 from public.pets p where p.id=pet_id and p.user_id=auth.uid()));

create function public.create_profile_for_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin insert into public.profiles(id,name) values(new.id,coalesce(nullif(new.raw_user_meta_data->>'name',''),'Pet parent')); return new; end; $$;
create trigger auth_user_created after insert on auth.users for each row execute procedure public.create_profile_for_new_user();
