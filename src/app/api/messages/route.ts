import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { ensureSchema,pool } from "@/lib/server-db";
export const runtime="nodejs";
export async function GET(){if(!await isAuthenticated())return NextResponse.json({error:"Нэвтэрнэ үү."},{status:401});try{await ensureSchema();const r=await pool.query("select m.*,a.full_name,c.name campaign_name from message_logs m left join agents a on a.id=m.agent_id left join campaigns c on c.id=m.campaign_id order by m.created_at desc limit 500");return NextResponse.json({messages:r.rows});}catch(e){return NextResponse.json({error:e instanceof Error?e.message:"DB алдаа"},{status:500});}}
