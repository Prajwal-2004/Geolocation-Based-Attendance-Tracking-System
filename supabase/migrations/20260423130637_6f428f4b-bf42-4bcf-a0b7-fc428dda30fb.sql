create table if not exists public.phone_otps (
  id uuid primary key default gen_random_uuid(),
  phone_number text not null,
  otp_hash text not null,
  expires_at timestamptz not null,
  attempts int not null default 0,
  verified boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_phone_otps_phone on public.phone_otps(phone_number, created_at desc);

alter table public.phone_otps enable row level security;

create policy "no direct access to phone_otps"
on public.phone_otps for all
using (false)
with check (false);