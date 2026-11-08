alter table public.agents add column if not exists telegram_link_token text unique;
alter table public.agents add column if not exists opt_out_token text unique;
create table if not exists public.opt_outs (
 id uuid primary key default gen_random_uuid(),
 agent_id uuid not null references public.agents(id) on delete cascade,
 channel text not null check(channel in ('sms','telegram')),
 reason text,
 created_at timestamptz not null default now(),
 unique(agent_id,channel)
);
create index if not exists idx_opt_outs_agent_channel on public.opt_outs(agent_id,channel);
