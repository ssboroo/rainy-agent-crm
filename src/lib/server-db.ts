import { Pool } from "pg";
const globalForPg = globalThis as unknown as { rainyPool?: Pool; rainyReady?: Promise<void> };
export const pool = globalForPg.rainyPool ?? new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.DATABASE_URL?.includes("railway.internal") ? false : { rejectUnauthorized: false }, max: 5 });
if (process.env.NODE_ENV !== "production") globalForPg.rainyPool = pool;
export async function ensureSchema() {
 if(!process.env.DATABASE_URL)throw new Error("DATABASE_URL is not configured");
 if(!globalForPg.rainyReady)globalForPg.rainyReady=pool.query(`
 create extension if not exists pgcrypto;
 create table if not exists agents(id uuid primary key default gen_random_uuid(),full_name text not null,office_name text,phone_e164 text,email text,profile_url text unique,source_url text not null,source_checked_at timestamptz default now(),telegram_chat_id text unique,telegram_link_token text, opt_out_token text,created_at timestamptz default now());
 alter table agents add column if not exists telegram_link_token text;
 alter table agents add column if not exists opt_out_token text;
 create unique index if not exists agents_telegram_link_token_uidx on agents(telegram_link_token) where telegram_link_token is not null;
 create unique index if not exists agents_opt_out_token_uidx on agents(opt_out_token) where opt_out_token is not null;
 create table if not exists consents(id uuid primary key default gen_random_uuid(),agent_id uuid not null references agents(id) on delete cascade,channel text not null check(channel in ('sms','telegram')),purpose text not null,source text not null,evidence_ref text not null,granted_at timestamptz default now(),revoked_at timestamptz);
 create table if not exists campaigns(id uuid primary key default gen_random_uuid(),name text not null,channel text not null check(channel in ('sms','telegram')),message text not null,status text not null default 'draft',created_at timestamptz default now());
 create table if not exists message_logs(id uuid primary key default gen_random_uuid(),campaign_id uuid references campaigns(id) on delete cascade,agent_id uuid references agents(id) on delete cascade,channel text not null,status text not null default 'queued',provider_message_id text,error_text text,created_at timestamptz default now());
 create table if not exists opt_outs(id uuid primary key default gen_random_uuid(),agent_id uuid not null references agents(id) on delete cascade,channel text not null check(channel in ('sms','telegram')),reason text,created_at timestamptz default now(),unique(agent_id,channel));
 create index if not exists agents_phone_idx on agents(phone_e164);
 create index if not exists consents_agent_channel_idx on consents(agent_id,channel);
 create index if not exists message_logs_campaign_idx on message_logs(campaign_id,created_at desc);
 `).then(()=>undefined);
 return globalForPg.rainyReady;
}
