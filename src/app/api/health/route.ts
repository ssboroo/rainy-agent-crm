import { NextResponse } from "next/server";
import { ensureSchema,pool } from "@/lib/server-db";
export const runtime="nodejs";
export async function GET() { try { await ensureSchema(); await pool.query("select 1"); return NextResponse.json({status:"ok",database:"connected"}); } catch { return NextResponse.json({status:"degraded",database:"unavailable"},{status:503}); } }
