create extension if not exists pgcrypto;
create table if not exists public.agents (id uuid primary key default gen_random_uuid(), full_name text not null, office_name text, profile_url text unique, source_url text not null, source_checked_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.contacts (id uuid primary key default gen_random_uuid(), agent_id uuid not null references public.agents(id) on delete cascade, phone_e164 text, email text, telegram_chat_id text unique, created_at timestamptz not null default now(), unique(agent_id, phone_e164));
create table if not exists public.consents (id uuid primary key default gen_random_uuid(), contact_id uuid not null references public.contacts(id) on delete cascade, channel text not null check (channel in ('sms','telegram')), purpose text not null, granted boolean not null default false, source text not null, evidence_ref text, captured_at timestamptz not null default now(), revoked_at timestamptz);
create table if not exists public.campaigns (id uuid primary key default gen_random_uuid(), name text not null, channel text not null check (channel in ('sms','telegram')), message text not null, status text not null default 'draft' check (status in ('draft','scheduled','sending','paused','completed','cancelled')), created_at timestamptz not null default now());
create table if not exists public.message_logs (id uuid primary key default gen_random_uuid(), campaign_id uuid not null references public.campaigns(id) on delete cascade, contact_id uuid not null references public.contacts(id) on delete cascade, channel text not null check (channel in ('sms','telegram')), provider_message_id text, status text not null default 'queued', error_code text, sent_at timestamptz, created_at timestamptz not null default now(), unique(campaign_id, contact_id, channel));
create table if not exists public.opt_outs (id uuid primary key default gen_random_uuid(), contact_id uuid not null references public.contacts(id) on delete cascade, channel text not null check (channel in ('sms','telegram')), reason text, created_at timestamptz not null default now(), unique(contact_id, channel));
create index if not exists idx_contacts_phone on public.contacts(phone_e164);
create index if not exists idx_consents_contact_channel on public.consents(contact_id, channel);
create index if not exists idx_message_logs_campaign_status on public.message_logs(campaign_id, status);
alter table public.agents enable row level security;
alter table public.contacts enable row level security;
alter table public.consents enable row level security;
alter table public.campaigns enable row level security;
alter table public.message_logs enable row level security;
alter table public.opt_outs enable row level security;
-- No public policies: add authenticated admin policies only after defining Supabase Auth roles.
