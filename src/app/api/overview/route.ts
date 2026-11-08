import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { ensureSchema,pool } from "@/lib/server-db";
export const runtime="nodejs";
export async function GET() { if(!await isAuthenticated()) return NextResponse.json({error:"Нэвтэрнэ үү."},{status:401}); try { await ensureSchema(); const [a,c,s,t]=await Promise.all([pool.query("select count(*)::int n from agents"),pool.query("select count(distinct agent_id)::int n from consents where revoked_at is null"),pool.query("select count(*)::int n from campaigns"),pool.query("select count(*)::int n from agents where telegram_chat_id is not null")]); return NextResponse.json({agents:a.rows[0].n,consented:c.rows[0].n,campaigns:s.rows[0].n,telegram:t.rows[0].n}); } catch(e) { return NextResponse.json({error:e instanceof Error?e.message:"DB алдаа"},{status:500}); } }
