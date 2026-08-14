-- Stable, revocable public QR profiles. Private tables remain protected by RLS;
-- anonymous visitors can only call this function and receive this explicit list.
alter table public.pets
  add column if not exists public_id uuid not null default gen_random_uuid();
create unique index if not exists pets_public_id_idx on public.pets(public_id);

alter table public.profiles
  add column if not exists emergency_phone text;
alter table public.user_settings
  add column if not exists preferences jsonb not null default '{}'::jsonb;

create or replace function public.get_public_pet(lookup_id uuid)
returns table (
  public_id uuid, name text, status text, photo_url text, animal text,
  breed text, age text, birthday date, sex text, microchip text,
  allergies text, medications text, vet_name text, vet_phone text,
  emergency_notes text, owner_name text, owner_phone text
)
language sql
stable
security definer
set search_path = public
as $$
  select p.public_id, p.name, p.status, p.photo_url, p.animal, p.breed,
    p.age, p.birthday, p.sex, p.microchip, p.allergies, p.medications,
    p.vet_name, p.vet_phone, p.medical_notes, pr.name,
    coalesce(pr.emergency_phone, ed.contact_phone)
  from public.pets p
  join public.profiles pr on pr.id = p.user_id
  left join public.emergency_data ed on ed.pet_id = p.id
  where p.public_id = lookup_id
  limit 1
$$;

revoke all on function public.get_public_pet(uuid) from public;
grant execute on function public.get_public_pet(uuid) to anon, authenticated;
