import { Pool } from "pg";

const globalForPg = globalThis as unknown as { rainyPool?: Pool; rainyReady?: Promise<void> };
export const pool = globalForPg.rainyPool ?? new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.DATABASE_URL?.includes("railway.internal") ? false : { rejectUnauthorized: false }, max: 5 });
if (process.env.NODE_ENV !== "production") globalForPg.rainyPool = pool;

export async function ensureSchema() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not configured");
  if (!globalForPg.rainyReady) globalForPg.rainyReady = pool.query(`
    create table if not exists agents (id uuid primary key default gen_random_uuid(), full_name text not null, office_name text, phone_e164 text, email text, profile_url text unique, source_url text not null, source_checked_at timestamptz default now(), telegram_chat_id text unique, created_at timestamptz default now());
    create table if not exists consents (id uuid primary key default gen_random_uuid(), agent_id uuid not null references agents(id) on delete cascade, channel text not null check(channel in ('sms','telegram')), purpose text not null, source text not null, evidence_ref text not null, granted_at timestamptz default now(), revoked_at timestamptz);
    create table if not exists campaigns (id uuid primary key default gen_random_uuid(), name text not null, channel text not null check(channel in ('sms','telegram')), message text not null, status text not null default 'draft', created_at timestamptz default now());
    create table if not exists message_logs (id uuid primary key default gen_random_uuid(), campaign_id uuid references campaigns(id) on delete cascade, agent_id uuid references agents(id) on delete cascade, channel text not null, status text not null default 'queued', provider_message_id text, error_text text, created_at timestamptz default now());
    create index if not exists agents_phone_idx on agents(phone_e164);
    create index if not exists consents_agent_channel_idx on consents(agent_id, channel);
  `).then(()=>undefined);
  return globalForPg.rainyReady;
}
