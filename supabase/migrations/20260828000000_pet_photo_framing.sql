-- Display-only framing metadata for PawPass Plus pet photos.
-- The original uploaded image and photo_url remain unchanged.
alter table public.pets
  add column if not exists photo_position_x numeric not null default 50 check (photo_position_x between 0 and 100),
  add column if not exists photo_position_y numeric not null default 50 check (photo_position_y between 0 and 100),
  add column if not exists photo_zoom numeric not null default 1 check (photo_zoom between 1 and 3);

drop function if exists public.get_public_pet(uuid);

create function public.get_public_pet(lookup_id uuid)
returns table (
  public_id uuid, name text, status text, photo_url text, animal text,
  breed text, age text, birthday date, sex text, microchip text,
  allergies text, medications text, vet_name text, vet_phone text,
  emergency_notes text, owner_name text, owner_phone text,
  photo_position_x numeric, photo_position_y numeric, photo_zoom numeric
)
language sql
stable
security definer
set search_path = public
as $$
  select p.public_id, p.name, p.status, p.photo_url, p.animal, p.breed,
    p.age, p.birthday, p.sex, p.microchip, p.allergies, p.medications,
    p.vet_name, p.vet_phone, p.medical_notes, pr.name,
    coalesce(pr.emergency_phone, ed.contact_phone),
    p.photo_position_x, p.photo_position_y, p.photo_zoom
  from public.pets p
  join public.profiles pr on pr.id = p.user_id
  left join public.emergency_data ed on ed.pet_id = p.id
  where p.public_id = lookup_id
  limit 1
$$;

revoke all on function public.get_public_pet(uuid) from public;
grant execute on function public.get_public_pet(uuid) to anon, authenticated;
