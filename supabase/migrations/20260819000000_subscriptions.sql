-- PawPass Phase 3: subscription state managed by Stripe webhooks/Edge Functions.
-- Browser clients may read only their own subscription row. Writes are server-side only.

create table if not exists public.subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  stripe_price_id text,
  status text not null default 'inactive',
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists subscriptions_status_idx on public.subscriptions(status);
create index if not exists subscriptions_stripe_customer_idx on public.subscriptions(stripe_customer_id);

alter table public.subscriptions enable row level security;

-- Authenticated users can view only their own subscription status.
create policy "users view own subscription"
on public.subscriptions
for select
to authenticated
using (auth.uid() = user_id);

-- No insert/update/delete policy is intentionally created.
-- Stripe webhook and checkout Edge Functions will use the Supabase service role,
-- which bypasses RLS, so customers cannot promote themselves to a paid plan.

create or replace function public.touch_subscription_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists subscriptions_touch_updated_at on public.subscriptions;
create trigger subscriptions_touch_updated_at
before update on public.subscriptions
for each row execute function public.touch_subscription_updated_at();
